
import { readFileSync } from 'fs';
import { join } from 'path';
const PROJECT_ROOT = '/tmp/nh-cont9150';
const sessionData = JSON.parse(readFileSync(join(PROJECT_ROOT, 'sessions-extra/seed9150-wizard-harass-intervene.session.json'), 'utf8'));
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const { decodeScreen } = await import(join(PROJECT_ROOT, 'frozen/screen-decode.mjs'));
const segments = normalizeSession(sessionData).segments;
const storage = new Map();
const storageHandle = {
  getItem(k){ return storage.has(k)?storage.get(k):null; },
  setItem(k,v){ storage.set(k,String(v)); },
  removeItem(k){ storage.delete(k); },
  get length(){ return storage.size; },
  key(i){ let n=0; for (const k of storage.keys()){ if(n===i) return k; n++; } return null; },
};
let jsScreens = [];
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  jsScreens.push(...(g.getScreens?.() || []));
}
console.log('jsScreens count:', jsScreens.length);
const lo = +(process.env.LO ?? 143), hi = +(process.env.HI ?? 153);
for (let i = lo; i <= hi && i < jsScreens.length; i++) {
  console.log(`=== jscreen ${i}`);
  const g = decodeScreen(jsScreens[i] || '');
  const rows = g.map(r => r.map(c => c.ch).join(''));
  for (const r of rows.slice(0,2).concat(rows.slice(22))) if (r.trim()) console.log('  ' + r.replace(/\s+$/,''));
}
const needle = process.env.NEEDLE;
if (needle) {
  for (let i = 0; i < jsScreens.length; i++) {
    const g = decodeScreen(jsScreens[i] || '');
    const txt = g.map(r => r.map(c => c.ch).join('')).join('\n');
    if (txt.includes(needle)) console.log('needle', needle, 'at jscreen', i);
  }
}
