
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0; for(const k of storage.keys()){if(n++===i)return k;} return null;} };
const g = await runSegment({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
              nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
console.log('keys', Object.keys(g).filter(k => /^_/.test(k)).slice(0, 30));
const slices = g._rngSlices || [];
let acc = 0;
for (let i = 88; i < 112 && i < slices.length; i++) {
  const sc = (g._screens || [])[i] || '';
  const firstLine = sc.split(/\r?\n|\x1b\[/).join('').slice(0, 90);
  console.log(i, 'rng', acc, '+', slices[i]?.length, '::', JSON.stringify(firstLine));
  acc += (slices[i] || []).length;
}
