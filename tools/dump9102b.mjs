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
for (let i=lo;i<=hi;i++){
  const st = seg.steps[i];
  const cg = decodeScreen(st.screen);
  const jg = decodeScreen(jsScreens[i]||'');
  console.log(`step ${i} key=${JSON.stringify(st.key)} curC=${JSON.stringify(st.cursor)} curJ=${JSON.stringify(jsCursors[i])}`);
  console.log('  C0: '+cg[0].map(renderCell).join('').replace(/ +$/,''));
  console.log('  J0: '+jg[0].map(renderCell).join('').replace(/ +$/,''));
}
