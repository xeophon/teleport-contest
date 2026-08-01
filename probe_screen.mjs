
import { readFileSync, writeFileSync } from 'fs';
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
let jsScreens = [], jsCursors = [];
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  jsScreens.push(...(g.getScreens?.() || []));
  jsCursors.push(...(g.getCursors?.() || []));
}
const cSteps = segments.flatMap(sg => sg.steps || []);
function charsOf(s) { const g = decodeScreen(s); return g.map(r => r.map(c => c.ch ?? c.c ?? '').join('')).join('\n'); }
let firstBad = -1;
for (let i = 0; i < cSteps.length; i++) {
  const cs = cSteps[i].screen;
  if (!cs) continue;
  const js = jsScreens[i] || '';
  if (charsOf(js) !== charsOf(cs)) { firstBad = i; break; }
}
console.log('firstBadScreen', firstBad);
const lo = +(process.env.LO ?? 112), hi = +(process.env.HI ?? 126);
for (let i = lo; i <= hi && i < cSteps.length; i++) {
  const cs = cSteps[i].screen;
  if (!cs) { console.log(`step ${i} ${JSON.stringify(cSteps[i].key)}: (no screen)`); continue; }
  const js = jsScreens[i] || '';
  const jg = charsOf(js), cg = charsOf(cs);
  if (jg === cg) { console.log(`step ${i} ${JSON.stringify(cSteps[i].key)}: OK`); continue; }
  const jlines = jg.split('\n'), clines = cg.split('\n');
  console.log(`step ${i} ${JSON.stringify(cSteps[i].key)}: MISMATCH`);
  for (let r = 0; r < Math.max(jlines.length, clines.length); r++) {
    if ((jlines[r]||'') !== (clines[r]||'')) {
      console.log('  C ' + (clines[r]||''));
      console.log('  J ' + (jlines[r]||''));
    }
  }
}
