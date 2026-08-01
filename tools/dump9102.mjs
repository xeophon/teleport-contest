import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const jsScreens = g.getScreens?.() || [];
const jsCursors = g.getCursors?.() || [];
const lo = parseInt(process.argv[3]), hi = parseInt(process.argv[4]);
const only = process.argv[5]; // 'c' or 'j'
for (let i=lo;i<=hi;i++){
  const st = seg.steps[i];
  if (only!=='j') {
    console.log(`=== C step ${i} key=${JSON.stringify(st.key)} cursor=${JSON.stringify(st.cursor)}`);
    decodeScreen(st.screen).forEach(r=>console.log(r.map(renderCell).join('').replace(/ +$/,'')));
  }
  if (only!=='c') {
    console.log(`=== J step ${i} cursor=${JSON.stringify(jsCursors[i])}`);
    decodeScreen(jsScreens[i]||'').forEach(r=>console.log(r.map(renderCell).join('').replace(/ +$/,'')));
  }
}
