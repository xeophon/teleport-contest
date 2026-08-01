
import { readFileSync } from 'fs';
import { join } from 'path';
const PROJECT_ROOT = '/tmp/nh-cont9150';
const sessionData = JSON.parse(readFileSync(join(PROJECT_ROOT, 'sessions-extra/seed9150-wizard-harass-intervene.session.json'), 'utf8'));
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const segments = normalizeSession(sessionData).segments;
const storage = new Map();
const storageHandle = {
  getItem(k){ return storage.has(k)?storage.get(k):null; },
  setItem(k,v){ storage.set(k,String(v)); },
  removeItem(k){ storage.delete(k); },
  get length(){ return storage.size; },
  key(i){ let n=0; for (const k of storage.keys()){ if(n===i) return k; n++; } return null; },
};
let jsRng = [];
let lastGame;
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  jsRng.push(...(g.getRngLog?.() || []));
  lastGame = g;
}
console.log('TOTAL', jsRng.length);
const lo = +(process.env.LO||5560), hi = +(process.env.HI||5660);
for (let i = lo; i < hi && i < jsRng.length; i++) console.log(i, jsRng[i]);
