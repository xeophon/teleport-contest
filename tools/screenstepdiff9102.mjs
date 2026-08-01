// Diff per-step screens for a session: decoded grid text + cursor.
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell, diffCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const jsScreens = g.getScreens?.() || [];
const jsCursors = g.getCursors?.() || [];
const n = seg.steps.length;
for (let i=0;i<n;i++){
  const st = seg.steps[i];
  const cg = decodeScreen(st.screen);
  const jg = decodeScreen(jsScreens[i]||'');
  let bad = [];
  for (let r=0;r<24;r++) for (let c=0;c<80;c++) if (diffCell(cg[r][c], jg[r][c])) bad.push([r,c]);
  const cc = Array.isArray(st.cursor) ? st.cursor : null;
  const jc = jsCursors[i] ?? null;
  const curOk = !cc ? true : (jc && cc[0]===jc[0] && cc[1]===jc[1] && cc[2]===jc[2]);
  if (bad.length || !curOk) {
    console.log(`step ${i} key=${JSON.stringify(st.key)} cells=${bad.length} cursorC=${JSON.stringify(cc)} cursorJS=${JSON.stringify(jc)}`);
    if (process.argv[3] === '-v' || (process.argv[3] && parseInt(process.argv[3])===i)) {
      for (const [r] of [bad.length ? bad : [[0,0]]]) {
        // print mismatched rows
      }
      const rowsNew = new Set(bad.map(b=>b[0]));
      for (const r of rowsNew) {
        console.log(` C${r}: ` + cg[r].map(renderCell).join(''));
        console.log(` J${r}: ` + jg[r].map(renderCell).join(''));
      }
    }
  }
}
