#!/usr/bin/env node
/**
 * Generates the two UI sounds (spec §10) as small mono 16-bit WAV files, so no third-party audio
 * (and no licence question) ships in the app. Deterministic: same output every run.
 *   assets/sounds/tick.wav    soft typewriter key tick (~40 ms)
 *   assets/sounds/rustle.wav  paper rustle on solve (~450 ms)
 * Run: node tools/sounds/make.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'sounds');

// Small deterministic PRNG for the noise.
let s = 0x2545f491;
const rand = () => {
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  return ((s >>> 0) / 0xffffffff) * 2 - 1;
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function tick() {
  const n = Math.round(RATE * 0.04);
  const outS = [];
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 180);
    lp += 0.35 * (rand() - lp);
    outS.push((0.5 * lp + 0.25 * Math.sin(2 * Math.PI * 1800 * t)) * env * 0.6);
  }
  return outS;
}

function rustle() {
  const n = Math.round(RATE * 0.45);
  const outS = [];
  let lp = 0;
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.sin(Math.PI * Math.min(1, t / 0.45)) ** 1.5;
    const crackle = 0.6 + 0.4 * Math.abs(Math.sin(2 * Math.PI * 23 * t) * Math.sin(2 * Math.PI * 7 * t));
    const x = rand();
    hp = 0.9 * (hp + x - prev);
    prev = x;
    lp += 0.5 * (hp - lp);
    outS.push(lp * env * crackle * 0.35);
  }
  return outS;
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'tick.wav'), wav(tick()));
writeFileSync(join(out, 'rustle.wav'), wav(rustle()));
console.log('wrote assets/sounds/tick.wav and rustle.wav');
