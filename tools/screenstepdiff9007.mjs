import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const jsScreens = g.getScreens?.() || [];
const n = seg.steps.length;
console.log('steps', n, 'jsScreens', jsScreens.length);
for (let i=0;i<n;i++){
  const c = decodeScreen ? decodeScreen(seg.steps[i].screen) : seg.steps[i].screen;
  const j = jsScreens[i];
  if (c !== j) console.log(i, JSON.stringify(seg.steps[i].key), 'MISMATCH');
}
