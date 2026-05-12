/**
 * Generates a short, soft chirp sound for UI hover events as a WAV file.
 * Outputs: public/assets/sounds/button-hover.wav
 * Run with: node generate-hover-sound.cjs
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION_S = 0.03; // 30ms — very staccato
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_S);
const NUM_CHANNELS = 1;
const BIT_DEPTH = 16;

const samples = new Int16Array(NUM_SAMPLES);
const frequency = 180; // Hz — low, flat pitch, no sweep
const maxAmplitude = 9000;

// Seed a simple LCG pseudo-random for noise (no Math.random for reproducibility)
let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed / 0x80000000) - 1; // range [-1, 1]
};

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;

  // Hard attack, fast exponential decay — no fade-in
  const envelope = Math.exp(-t / 0.008);

  // Fixed-pitch low sine tone
  const tone = Math.sin(2 * Math.PI * frequency * t);

  // Short noise transient at the very start gives a mechanical "click" texture
  const noiseFade = Math.exp(-t / 0.002); // fades out much faster than the tone
  const noise = rand() * noiseFade * 0.5;

  samples[i] = Math.round(maxAmplitude * envelope * (tone + noise));
}

// Build WAV file
const dataSize = NUM_SAMPLES * NUM_CHANNELS * (BIT_DEPTH / 8);
const buffer = Buffer.alloc(44 + dataSize);
let offset = 0;

buffer.write('RIFF', offset); offset += 4;
buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
buffer.write('WAVE', offset); offset += 4;

buffer.write('fmt ', offset); offset += 4;
buffer.writeUInt32LE(16, offset); offset += 4;
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(NUM_CHANNELS, offset); offset += 2;
buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BIT_DEPTH / 8), offset); offset += 4;
buffer.writeUInt16LE(NUM_CHANNELS * (BIT_DEPTH / 8), offset); offset += 2;
buffer.writeUInt16LE(BIT_DEPTH, offset); offset += 2;

buffer.write('data', offset); offset += 4;
buffer.writeUInt32LE(dataSize, offset); offset += 4;

for (let i = 0; i < NUM_SAMPLES; i++) {
  buffer.writeInt16LE(samples[i], offset);
  offset += 2;
}

const outDir = path.join(__dirname, 'public', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'button-hover.wav');
fs.writeFileSync(outPath, buffer);

console.log(`✅ Hover sound generated: ${outPath}`);
