/**
 * Generates a short, crisp UI click sound as a WAV file.
 * Outputs: public/assets/sounds/button-click.wav
 * Run with: node generate-click-sound.cjs
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION_S = 0.06; // 60ms — short and snappy
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_S);
const NUM_CHANNELS = 1;
const BIT_DEPTH = 16;

// Generate PCM samples: a quick attack sine-pop with exponential decay
const samples = new Int16Array(NUM_SAMPLES);
const frequency = 900; // Hz — mid-high tone, feels like a crisp click
const maxAmplitude = 20000;

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  // Exponential decay envelope
  const envelope = Math.exp(-t / 0.018);
  // Short sine burst
  const wave = Math.sin(2 * Math.PI * frequency * t);
  // Add a tiny bit of second harmonic for a bit of "click" texture
  const harmonic = 0.3 * Math.sin(2 * Math.PI * frequency * 2.5 * t);
  samples[i] = Math.round(maxAmplitude * envelope * (wave + harmonic));
}

// Build WAV file
const dataSize = NUM_SAMPLES * NUM_CHANNELS * (BIT_DEPTH / 8);
const buffer = Buffer.alloc(44 + dataSize);
let offset = 0;

// RIFF header
buffer.write('RIFF', offset); offset += 4;
buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
buffer.write('WAVE', offset); offset += 4;

// fmt chunk
buffer.write('fmt ', offset); offset += 4;
buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
buffer.writeUInt16LE(1, offset); offset += 2;  // PCM format
buffer.writeUInt16LE(NUM_CHANNELS, offset); offset += 2;
buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BIT_DEPTH / 8), offset); offset += 4; // byte rate
buffer.writeUInt16LE(NUM_CHANNELS * (BIT_DEPTH / 8), offset); offset += 2; // block align
buffer.writeUInt16LE(BIT_DEPTH, offset); offset += 2;

// data chunk
buffer.write('data', offset); offset += 4;
buffer.writeUInt32LE(dataSize, offset); offset += 4;

for (let i = 0; i < NUM_SAMPLES; i++) {
  buffer.writeInt16LE(samples[i], offset);
  offset += 2;
}

const outDir = path.join(__dirname, 'public', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'button-click.wav');
fs.writeFileSync(outPath, buffer);

console.log(`✅ Click sound generated: ${outPath}`);
console.log(`   Duration: ${DURATION_S * 1000}ms | Sample Rate: ${SAMPLE_RATE}Hz | Samples: ${NUM_SAMPLES}`);
