
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
const cSteps = segments.flatMap(sg => sg.steps || []);
const lo = +(process.env.LO ?? 149), hi = +(process.env.HI ?? 222);
function rowsOf(s){ const g = decodeScreen(s); return g.map(r => r.map(c => c.ch).join('')); }
for (let i = lo; i <= hi; i++) {
  const c = cSteps[i];
  const crows = rowsOf(c.screen);
  const jrows = rowsOf(jsScreens[i]);
  const ct = (crows[0]||'').replace(/\s+$/,'');
  const jt = (jrows[0]||'').replace(/\s+$/,'');
  const cs = crows[22].trimStart().slice(0,60), js = jrows[22].trimStart().slice(0,60);
  const mark = (ct===jt && cs===js) ? 'OK ' : 'DIF';
  console.log(`${i} ${mark} key=${JSON.stringify(c.key)}`);
  if (mark==='DIF') { console.log(`    C[${ct}] || [${cs}]`); console.log(`    J[${jt}] || [${js}]`); }
}
