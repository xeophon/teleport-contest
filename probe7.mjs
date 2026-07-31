
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { getRngLog } from './js/rng.js';
const s = JSON.parse(readFileSync('sessions/' + process.argv[2] + '.session.json','utf8'));
const norm = normalizeSession(s);
const storage = new Map();
const storageHandle = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0; for(const k of storage.keys()){if(n++===i)return k;} return null;} };
for (const seg of norm.segments) {
  await runSegment({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
      nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
}
