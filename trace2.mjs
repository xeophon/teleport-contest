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
const ts = nh.getTraceSteps?.() || [];
// print trace entries for steps 116-126 (each step = list of entries)
const A = 129, B = 151;
for (let i=A;i<B;i++) {
  const e = ts[i] || [];
  const rel = e.filter(x => /iter|srch|mvup|queue-shift|cast-eff/.test(x)).map(x=>x.slice(0,120));
  console.log(`--- step ${i} (${e.length} entries)`);
  rel.slice(0,14).forEach(x => console.log('   ', x));
}
