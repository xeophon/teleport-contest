
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell, diffCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions/seed4500-knight-coverage.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s);
const cFlat = [];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
let jsScreens=[], jsCursors=[];
let cScreens=[], cCurs=[];
for (const seg of norm.segments) {
  for (const st of seg.steps||[]) { if (st.screen) { cScreens.push(st.screen); cCurs.push(st.cursor||null); } }
  const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: h });
  jsScreens.push(...(g.getScreens?.()||[]));
  jsCursors.push(...(g.getCursors?.()||[]));
}
for (let i=0;i<cScreens.length;i++){
  const ga=decodeScreen(cScreens[i]||''); const gb=decodeScreen(jsScreens[i]||'');
  const diffs=[];
  for(let r=0;r<24;r++) for(let c=0;c<80;c++) if(diffCell(ga[r][c],gb[r][c])) diffs.push([r,c,renderCell(ga[r][c]),renderCell(gb[r][c])]);
  if (diffs.length) { console.log('session screen-idx',i,'diffs', diffs.slice(0,12));
    const msgA=ga[0].map(renderCell).join(''); const msgB=gb[0].map(renderCell).join('');
    console.log('  Cmsg:', JSON.stringify(msgA.trim()));
    console.log('  Jmsg:', JSON.stringify(msgB.trim()));
    break; }
}
