/**
 * synthesize-sfx.cjs
 * Procedurally generates all combat sound effect WAV files using raw PCM.
 * Run once: node synthesize-sfx.cjs
 * Outputs to: public/assets/sounds/
 */

'use strict';

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'public', 'assets', 'sounds');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

// ── WAV writer ────────────────────────────────────────────────────
function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono
  const blockAlign = 2;
  const buf = Buffer.alloc(44 + numSamples * 2);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + numSamples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);         // chunk size
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);         // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`  wrote ${filename} (${numSamples} samples, ${(buf.length / 1024).toFixed(1)} KB)`);
}

// ── Helpers ───────────────────────────────────────────────────────
const SR = SAMPLE_RATE;

function envelope(t, attackS, decayS, sustainLevel, releaseS, totalS) {
  const a = attackS, d = decayS, r = releaseS;
  const releaseStart = totalS - r;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - sustainLevel) * ((t - a) / d);
  if (t < releaseStart) return sustainLevel;
  return sustainLevel * Math.max(0, 1 - (t - releaseStart) / r);
}

function noise() { return Math.random() * 2 - 1; }

// ── Sound generators ──────────────────────────────────────────────

function genBeam() {
  // Plasma beam: rising sine + frequency sweep + fade
  const dur = 0.35;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    const freq = 380 + prog * 280; // 380→660 Hz sweep
    const env = envelope(t, 0.01, 0.1, 0.5, 0.15, dur);
    const buzz = Math.sin(2 * Math.PI * freq * t) +
                 0.3 * Math.sin(4 * Math.PI * freq * t) +
                 0.15 * noise() * (1 - prog);
    out[i] = env * buzz * 0.4;
  }
  return out;
}

function genTracer() {
  // Railgun: short sharp crack + resonant ping
  const dur = 0.28;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    // Transient crack
    const crack = noise() * Math.exp(-t * 80);
    // Metallic ping fading
    const ping = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 18);
    const env = prog < 0.05 ? prog / 0.05 : Math.exp(-(prog - 0.05) * 5);
    out[i] = (crack * 0.6 + ping * 0.4) * env * 0.55;
  }
  return out;
}

function genBroadside() {
  // Three staggered cannon booms
  const dur = 0.5;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const offsets = [0, 0.08, 0.17]; // seconds
  offsets.forEach(off => {
    for (let i = 0; i < n; i++) {
      const t = i / SR - off;
      if (t < 0) continue;
      const low = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 25);
      const crack = noise() * Math.exp(-t * 60) * 0.5;
      const env = Math.exp(-t * 12);
      out[i] += (low + crack) * env * 0.35;
    }
  });
  return out;
}

function genIon() {
  // Ion weapon: rising electric hum + crackle discharge
  const dur = 0.42;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    const freq = 200 + prog * 600; // 200→800 Hz
    const env = envelope(t, 0.05, 0.15, 0.6, 0.2, dur);
    const wave = Math.sin(2 * Math.PI * freq * t) +
                 0.5 * Math.sin(2 * Math.PI * freq * 3 * t) +
                 0.2 * noise() * prog;
    out[i] = env * wave * 0.35;
  }
  return out;
}

function genFlak() {
  // Flak burst: rapid staccato pops
  const dur = 0.42;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const popCount = 7;
  for (let p = 0; p < popCount; p++) {
    const startT = 0.05 + p * 0.047;
    for (let i = 0; i < n; i++) {
      const t = i / SR - startT;
      if (t < 0) continue;
      const pop = (noise() * 0.7 + Math.sin(2 * Math.PI * 320 * t) * 0.3) * Math.exp(-t * 80);
      out[i] += pop * 0.28;
    }
  }
  return out;
}

function genPDC() {
  // Point defense: rapid high-pitched burst fire
  const dur = 0.32;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  const burstRate = 18; // shots per second
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    const burst = Math.abs(Math.sin(2 * Math.PI * burstRate * t)) > 0.8 ? 1 : 0;
    const tone = Math.sin(2 * Math.PI * 1200 * t) * 0.4 + noise() * 0.6;
    const env = Math.pow(1 - prog, 0.8);
    out[i] = burst * tone * env * 0.35;
  }
  return out;
}

function genTorpedo() {
  // Torpedo: deep whoosh with rising pitch tail
  const dur = 0.45;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    const freq = 60 + prog * 180;
    const env = envelope(t, 0.02, 0.18, 0.55, 0.2, dur);
    const whoosh = noise() * 0.5 +
                   Math.sin(2 * Math.PI * freq * t) * 0.3 +
                   Math.sin(2 * Math.PI * freq * 2 * t) * 0.2;
    out[i] = env * whoosh * 0.45;
  }
  return out;
}

function genExplosion() {
  // Hull explosion: deep boom with debris rumble
  const dur = 0.55;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    // Deep boom
    const boom = (noise() * 0.8 + Math.sin(2 * Math.PI * 55 * t) * 0.2) *
                 Math.exp(-t * 8);
    // Mid crunch
    const crunch = noise() * Math.exp(-t * 22) * 0.4;
    // High debris
    const debris = noise() * Math.exp(-t * 35) * 0.2;
    const env = prog < 0.02 ? prog / 0.02 : 1;
    out[i] = env * (boom + crunch + debris) * 0.55;
  }
  return out;
}

function genShield() {
  // Shield absorption: high resonant hum + harmonic shimmer
  const dur = 0.38;
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const prog = t / dur;
    const freq = 520;
    const env = envelope(t, 0.005, 0.08, 0.4, 0.28, dur);
    // Resonant shield hum with harmonics
    const wave = Math.sin(2 * Math.PI * freq * t) * 0.5 +
                 Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.3 +
                 Math.sin(2 * Math.PI * freq * 2 * t) * 0.15 +
                 noise() * 0.05 * (1 - prog);
    out[i] = env * wave * 0.38;
  }
  return out;
}

// ── Write all files ───────────────────────────────────────────────
console.log(`Synthesizing sound effects → ${OUT_DIR}\n`);

writeWav('weapon-beam.wav',      genBeam());
writeWav('weapon-tracer.wav',    genTracer());
writeWav('weapon-broadside.wav', genBroadside());
writeWav('weapon-ion.wav',       genIon());
writeWav('weapon-flak.wav',      genFlak());
writeWav('weapon-pdc.wav',       genPDC());
writeWav('weapon-torpedo.wav',   genTorpedo());
writeWav('impact-explosion.wav', genExplosion());
writeWav('impact-shield.wav',    genShield());

console.log('\nDone.');
