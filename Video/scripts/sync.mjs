// Scans public/ for narration, demo recordings and music; writes src/data/media.json,
// src/data/captions.json and out/captions.srt; reports narration that overruns its scene.
// Scene lengths are fixed by src/data/timeline.json (the brief's timeline), not by the audio.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";

const LEAD_IN = 0.3; // keep in sync with VO_LEAD_IN in src/components/Voiceover.tsx
const WORDS_PER_SEC = 2.6; // estimate used until real narration exists
const MAX_WORDS = 7;

const timeline = JSON.parse(readFileSync("src/data/timeline.json", "utf8"));
const script = JSON.parse(readFileSync("scripts/script.json", "utf8"));

const duration = async (path) => {
  const input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(path) });
  const d = await input.computeDuration();
  input.dispose();
  return d;
};

// Word timings (seconds, relative to the start of the narration clip).
const wordsFromAlignment = (a) => {
  const words = [];
  let cur = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[i] };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return words;
};

const estimatedWords = (text) =>
  text.split(/\s+/).filter(Boolean).map((w, i) => ({ text: w, start: i / WORDS_PER_SEC, end: (i + 1) / WORDS_PER_SEC }));

// Group words into caption lines, breaking at sentence ends or MAX_WORDS.
const chunk = (words) => {
  const out = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= MAX_WORDS || /[.?!:]$/.test(w.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

const media = { voiceoverExpected: Object.keys(timeline).filter((id) => script[id]).length, voiceover: {}, demoFocused: false, demoTense: false, music: existsSync("public/music.wav") };
const captions = [];
let offset = 0;
let problems = 0;
let estimated = false;

for (const [id, sceneSec] of Object.entries(timeline)) {
  if (!script[id]) {
    console.log(`  ${id.padEnd(12)} silent / scene ${sceneSec} s`);
    offset += sceneSec;
    continue;
  }
  const mp3 = `public/voiceover/${id}.mp3`;
  const align = `public/voiceover/${id}.alignment.json`;
  let words;
  let voSec;
  if (existsSync(mp3) && existsSync(align)) {
    voSec = await duration(mp3);
    media.voiceover[id] = Number(voSec.toFixed(2));
    words = wordsFromAlignment(JSON.parse(readFileSync(align, "utf8")));
  } else {
    estimated = true;
    words = estimatedWords(script[id]);
    voSec = words.at(-1).end;
  }
  const fits = LEAD_IN + voSec <= sceneSec - 0.2;
  if (!fits) problems++;
  console.log(`${fits ? "  " : "⚠ "}${id.padEnd(10)} narration ${voSec.toFixed(1)} s / scene ${sceneSec} s`);

  for (const c of chunk(words)) {
    const startMs = Math.round((offset + LEAD_IN + c[0].start) * 1000);
    const endMs = Math.round((offset + LEAD_IN + c.at(-1).end + 0.25) * 1000);
    captions.push({ text: c.map((w) => w.text).join(" "), startMs, endMs: Math.min(endMs, (offset + sceneSec) * 1000) });
  }
  offset += sceneSec;
}
// Avoid overlaps: each caption ends no later than the next begins.
for (let i = 0; i < captions.length - 1; i++) captions[i].endMs = Math.min(captions[i].endMs, captions[i + 1].startMs);

media.demoFocused = existsSync("public/demo-focused.mp4");
media.demoTense = existsSync("public/demo-tense.mp4");
for (const f of ["demo-focused", "demo-tense"]) {
  if (existsSync(`public/${f}.mp4`)) console.log(`  ${f}.mp4 ${(await duration(`public/${f}.mp4`)).toFixed(1)} s`);
}

writeFileSync("src/data/media.json", JSON.stringify(media, null, 2) + "\n");
writeFileSync("src/data/captions.json", JSON.stringify(captions, null, 2) + "\n");

const ts = (ms) => {
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${s},${String(ms % 1000).padStart(3, "0")}`;
};
mkdirSync("out", { recursive: true });
writeFileSync(
  "out/captions.srt",
  captions.map((c, i) => `${i + 1}\n${ts(c.startMs)} --> ${ts(c.endMs)}\n${c.text}\n`).join("\n"),
);

const words = Object.values(script).join(" ").split(/\s+/).length;
console.log(`TOTAL ${offset} s · ${words} words · captions ${estimated ? "ESTIMATED (no narration yet)" : "from narration"}`);
if (problems) console.warn(`⚠ ${problems} scene(s) where narration overruns; shorten those lines in scripts/script.json.`);
