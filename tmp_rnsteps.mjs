
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync(process.argv[2],'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;n++;}return null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: h });
const sl = g.getRngSlices();
const isR = e=>typeof e==='string'&&/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
for (let i=21;i<=34;i++){
  const rec=(seg.steps||[])[i];
  const crng=(rec?.rng||[]).filter(isR).map(e=>e.replace(/\s*@\s.*$/,''));
  const jrng=(sl[i]||[]).filter(isR).map(e=>String(e).replace(/^\d+\s+/,''));
  const C=crng.join(' '); const J=jrng.join(' ');
  console.log(`step ${i} key=${JSON.stringify(rec?.key)} ${C===J?'SAME':''}`);
  console.log('  C :', C);
  console.log('  JS:', J);
}
