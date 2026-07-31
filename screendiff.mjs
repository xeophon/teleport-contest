
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { decodeScreen } from './frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const storage = new Map();
const storageHandle = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0; for(const k of storage.keys()){if(n++===i)return k;} return null;} };
const lo = Number(process.argv[3]||0), hi = Number(process.argv[4]||9999);
let jsScreens = [], jsCursors = [];
for (const seg of norm.segments) {
  const g = await runSegment({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
    nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
  jsScreens.push(...(g.getScreens?.() || []));
  jsCursors.push(...(g.getCursors?.() || []));
}
const cAll = [];
norm.segments.forEach(seg => (seg.steps||[]).forEach(st => cAll.push(st)));
for (let i = lo; i <= hi && i < cAll.length; i++) {
  const st = cAll[i];
  if (!st.screen) continue;
  const rowsC = decodeScreen(st.screen).map(r => r.map(c => c.ch).join('').replace(/\s+$/,''));
  const ga = decodeScreen(jsScreens[i] || ''); if (!ga) continue;
  const rowsJ = ga.map(r => r.map(c => c.ch).join('').replace(/\s+$/,''));
  const cCur = st.cursor, jCur = jsCursors[i];
  const cellsOk = rowsC.every((rc, ri) => rc === rowsJ[ri]);
  const cursorOk = !Array.isArray(cCur) || (Array.isArray(jCur) && cCur[0]===jCur[0] && cCur[1]===jCur[1] && cCur[2]===jCur[2]);
  if (!cellsOk || !cursorOk) {
    console.log(`=== step ${i} key=${JSON.stringify(st.key)} cellsOk=${cellsOk} cursor ${JSON.stringify(cCur)} vs ${JSON.stringify(jCur)}`);
    for (let ri = 0; ri < 24; ri++) {
      if (rowsC[ri] !== rowsJ[ri]) console.log(`  C[${ri}]: ${rowsC[ri]}\n  J[${ri}]: ${rowsJ[ri]}`);
    }
  }
}
