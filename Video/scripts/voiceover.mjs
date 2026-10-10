// Generates public/voiceover/<scene>.mp3 plus word timings with ElevenLabs, then runs sync.
// Usage: $env:ELEVENLABS_API_KEY="..."; npm run voiceover [-- sceneId ...]
// Optional: ELEVENLABS_VOICE_ID (default "George", a calm, clear narrator).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}
const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
const script = JSON.parse(readFileSync("scripts/script.json", "utf8"));
const only = process.argv.slice(2);

mkdirSync("public/voiceover", { recursive: true });

for (const [id, text] of Object.entries(script)) {
  if (only.length && !only.includes(id)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15 },
    }),
  });
  if (!res.ok) {
    console.error(`${id}: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const body = await res.json();
  writeFileSync(`public/voiceover/${id}.mp3`, Buffer.from(body.audio_base64, "base64"));
  writeFileSync(`public/voiceover/${id}.alignment.json`, JSON.stringify(body.alignment));
  console.log(`✓ ${id}`);
}

execFileSync(process.execPath, ["scripts/sync.mjs"], { stdio: "inherit" });
