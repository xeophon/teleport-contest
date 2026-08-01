
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
process.env.NH_DBG_TRACE = '1';
const s = JSON.parse(readFileSync(process.argv[2],'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;n++;}return null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: h });
const traces = g.getTraceSteps ? g.getTraceSteps() : [];
for (let i=37;i<=52;i++){
  console.log(`=== step ${i} key=${JSON.stringify(seg.steps[i]?.key)}`);
  for (const l of (traces[i]||[])) console.log('   ', l);
}
