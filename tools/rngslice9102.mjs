import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const lo = parseInt(process.argv[3]), hi = parseInt(process.argv[4]);
// _rngSlices internal
const slices = g._rngSlices || [];
console.log('nslices', slices.length);
for (let i=lo;i<=hi;i++){
  const slice = (slices[i]||[]).map(e=>String(e).replace(/^\d+\s+/,'').replace(/\s+$/,''));
  console.log(i, JSON.stringify(seg.steps[i].key), slice.length);
  if (slice.length<25) console.log('   ', slice.join(' | '));
}
