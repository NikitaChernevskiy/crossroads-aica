// Synthesizes a seamless 32 s loop to public/music.wav: ambient pad + soft plucked arpeggio
// (120 BPM eighths, octave up so it carries on phone speakers), peak-normalized to -1 dBFS.
import { writeFileSync } from "node:fs";

const rate = 44100;
const seconds = 32;
const n = rate * seconds;
const chords = [
  [220.0, 261.63, 329.63, 493.88], // Am(add9)
  [174.61, 220.0, 261.63, 392.0], // Fmaj7
  [196.0, 246.94, 293.66, 440.0], // G6
  [164.81, 246.94, 329.63, 392.0], // Em7
];
const chordLen = seconds / chords.length;

const left = new Float32Array(n);
const right = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const t = i / rate;
  let l = 0;
  let r = 0;
  for (let c = 0; c < chords.length; c++) {
    // Each chord swells in and out, overlapping its neighbours (wraps for looping).
    let phase = (t - c * chordLen) / (chordLen * 2) + 0.25;
    phase -= Math.floor(phase);
    const env = Math.sin(Math.PI * phase) ** 2;
    if (env < 1e-4) continue;
    chords[c].forEach((f, k) => {
      const v = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t);
      const pan = 0.5 + 0.3 * Math.sin(k * 1.7 + t * 0.2);
      l += v * env * (1 - pan);
      r += v * env * pan;
    });
    // Soft sub bass on the root.
    const sub = Math.sin(Math.PI * chords[c][0] * t) * env * 0.8;
    l += sub;
    r += sub;
  }
  const shimmer = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t);
  left[i] = l * 0.06 * shimmer;
  right[i] = r * 0.06 * shimmer;
}

// Plucked arpeggio: one note per eighth (0.25 s), cycling the current chord one octave up.
const STEP = 0.25;
const pattern = [0, 1, 2, 3, 2, 1, 3, 2];
for (let k = 0; k < seconds / STEP; k++) {
  const t0 = k * STEP;
  const chord = chords[Math.floor(t0 / chordLen) % chords.length];
  const f = chord[pattern[k % pattern.length]] * 2;
  const accent = k % 4 === 0 ? 1 : 0.7;
  const pan = 0.5 + 0.35 * Math.sin(k * 0.9);
  const len = Math.floor(rate * 0.9);
  for (let j = 0; j < len; j++) {
    const t = j / rate;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 5.5);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) + 0.12 * Math.sin(6 * Math.PI * f * t)) * env * accent * 0.05;
    const idx = (Math.floor(t0 * rate) + j) % n; // wrap so the loop is seamless
    left[idx] += v * (1 - pan);
    right[idx] += v * pan;
  }
}

// Normalize to -1 dBFS peak.
let peak = 0;
for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const gain = 0.89 / peak;
for (let i = 0; i < n; i++) {
  left[i] *= gain;
  right[i] *= gain;
}

const buf = Buffer.alloc(44 + n * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + n * 4, 4);
buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(rate, 24);
buf.writeUInt32LE(rate * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
}
writeFileSync("public/music.wav", buf);
console.log("✓ public/music.wav");
