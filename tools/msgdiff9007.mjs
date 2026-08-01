
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell, diffCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const cSteps = s.segments[0].steps;
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves, storage: h });
const jsScreens = g.getScreens(); const jsCursors = g.getCursors?.() || [];
for (let i of [163,164,166,170,175,180,200,220,235]) {
  const ga = decodeScreen(cSteps[i].screen||''); const gb = decodeScreen(jsScreens[i]||'');
  let diffs=[];
  for (let r=0;r<24;r++) for (let c=0;c<80;c++) if (diffCell(ga[r][c], gb[r][c])) diffs.push([r,c,renderCell(ga[r][c]),renderCell(gb[r][c])]);
  const msgA = ga[0].map(renderCell).join('').trim(); const msgB = gb[0].map(renderCell).join('').trim();
  console.log(`step ${i} key=${JSON.stringify(cSteps[i].key)} ndiff=${diffs.length} Cmsg=${JSON.stringify(msgA)} JSmsg=${JSON.stringify(msgB)} ${diffs.filter(d=>d[0]>0).slice(0,6)}`);
}
