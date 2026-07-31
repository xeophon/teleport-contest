
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
const scr = g._screens || [];
for (let i = 90; i <= 150 && i < scr.length; i++) {
  const mt = scr[i].match(/HP:\S+/); const tt = scr[i].match(/T:\d+/);
  console.log(i, s.segments[0].steps[i]?.key, mt ? mt[0] : '-', tt ? tt[0] : '-', JSON.stringify(scr[i].split('\n')[0].slice(0, 75)));
}
