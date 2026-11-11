#!/usr/bin/env node
/**
 * Touch targets (CLAUDE.md conventions, spec CG-R14): every control is at least 44 × 44 pt.
 * Reads a `maestro hierarchy` dump (iOS frames are in points) and checks the controls it knows by
 * test ID or label. Accepted exception D8: puzzle cells and keyboard keys must be 44 pt tall, but
 * their width comes from the line (about 15 cells and 10 keys across a phone).
 *
 *   node check-targets.mjs <hierarchy.json>
 */
import { readFileSync } from 'node:fs';

const MIN = 44;
const file = process.argv[2];
const tree = JSON.parse(readFileSync(file, 'utf8'));

const CONTROLS = [
  /^home-(settings|daily|level|archive|stats|library|wardrobe)$/,
  /^hint-(reveal|check)$/,
  /^puzzle-menu$/,
  /^solved-(next|share|share-result|wardrobe)$/,
  /^archive-\d{4}-\d{2}-\d{2}$/,
  /^setting-/,
  /^settings-about$/,
  /^onboarding-/,
  /^wardrobe-/,
  /^library-/,
  /^badge-/,
];
const HEIGHT_ONLY = [/^cell-\d+$/, /^key-[A-Z]$/, /^key-delete$/];
const LABELS = [/^Back$/, /^Report this quote$/];

/** "[x1,y1][x2,y2]" → { w, h } */
function size(bounds) {
  const m = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/.exec(bounds ?? '');
  return m ? { w: Number(m[3]) - Number(m[1]), h: Number(m[4]) - Number(m[2]) } : null;
}

const found = [];
const problems = [];
(function walk(node) {
  const a = node.attributes ?? {};
  const id = a['resource-id'] || a.identifier || '';
  const label = a.accessibilityText || a.text || '';
  const s = size(a.bounds);
  const heightOnly = HEIGHT_ONLY.some((r) => r.test(id));
  const isControl = heightOnly || CONTROLS.some((r) => r.test(id)) || LABELS.some((r) => r.test(label));
  // Off-screen or collapsed nodes (0 × 0) are not on screen, so not measured.
  if (isControl && s && s.w > 0 && s.h > 0) {
    found.push(id || label);
    const tooShort = s.h < MIN - 0.5;
    const tooNarrow = !heightOnly && s.w < MIN - 0.5;
    if (tooShort || tooNarrow) problems.push(`${id || label}: ${s.w}×${s.h} pt`);
  }
  for (const c of node.children ?? []) walk(c);
})(tree);

console.log(`touch targets: ${found.length} controls measured`);
if (found.length === 0) {
  console.error('no controls found: is the app on screen?');
  process.exit(1);
}
if (problems.length) {
  console.error(`controls under ${MIN} pt:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('all controls are at least 44 pt (cells and keys: height)');
