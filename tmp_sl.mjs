
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
const g = await runSegment({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH });
for (const i of [97,98,99,100]) {
  const sl = g._rngSlices[i] || [];
  console.log('JS slice', i, JSON.stringify(sl));
}
