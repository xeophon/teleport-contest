
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
process.env.RNG_SITE='1';
const s = JSON.parse(readFileSync('sessions-extra/seed9105-wiz-archlich-spells.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;n++;}return null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: h });
const log = g.getRngLog();
for (const e of log.slice(2192, 2212)) console.log(e);
