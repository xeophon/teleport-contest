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
const keys = (seg.moves||'');
for (let i=parseInt(process.argv[3]); i<=parseInt(process.argv[4]); i++){
  const st = seg.steps[i];
  const cg = decodeScreen(st.screen);
  const jg = decodeScreen(jsScreens[i]||'');
  console.log(`--- step ${i} key=${JSON.stringify(st.key||keys[i])}`);
  for (const r of [0,21,22,23]) {
    const c = cg[r].map(renderCell).join('').replace(/\s+$/,'');
    const j = jg[r].map(renderCell).join('').replace(/\s+$/,'');
    console.log(`  C${r}: ${c}`); console.log(`  J${r}: ${j}`);
  }
}
