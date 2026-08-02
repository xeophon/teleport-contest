import { readFileSync } from 'fs';
import { runSegment } from './js/jsmain.js';
import { normalizeSession } from './frozen/session_loader.mjs';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';

const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const sh = {getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;}};
const nh = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: sh });
const slices = nh.getRngSlices();
const cSteps = seg.steps;
const isRng = (e)=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
const clean = (e)=>String(e).replace(/^\d+\s+/,'');
const A = parseInt(process.argv[2]||'123'), B = parseInt(process.argv[3]||'136');
for (let i=A;i<B;i++){
  const c = (cSteps[i]?.rng||[]).filter(isRng).map(clean);
  const j = (slices[i]||[]).filter(isRng).map(clean);
  console.log(`=== step ${i}`);
  console.log('  C :', c.join(' ') || '-');
  console.log('  JS:', j.join(' ') || '-');
}
