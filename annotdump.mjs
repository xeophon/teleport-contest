
import { readFileSync, writeFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { getRngLog } from './js/rng.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const storage = new Map();
const storageHandle = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0; for(const k of storage.keys()){if(n++===i)return k;} return null;} };
const isRng = (e)=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
let flat = [];
for (const seg of norm.segments) {
  const g = await runSegment({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
  flat.push(...(g.getRngLog()||[]).map(String).filter(isRng));
}
writeFileSync(process.argv[3], flat.map((e,i)=>`[${i}] ${e}`).join('\n'));
