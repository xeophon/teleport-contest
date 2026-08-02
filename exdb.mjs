import { readFileSync } from 'fs';
import { runSegment } from './js/jsmain.js';
import { normalizeSession } from './frozen/session_loader.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const sh = {getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;}};
const nh = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: sh });
const mv = globalThis.__mv || [];
const sliceLens = (nh.getRngSlices()||[]).map(s=>s.length);
// map rng idx -> step
function stepFor(rngidx){ let acc=0; for (let i=0;i<sliceLens.length;i++){ acc+=sliceLens[i]; if (acc>=rngidx) return i; } return -1; }
for (const e of mv) process.stderr.write(`mv -> moves=${e.to} at=${e.at} rng=${e.rng} ~step=${stepFor(e.rng)}`+"\n");
