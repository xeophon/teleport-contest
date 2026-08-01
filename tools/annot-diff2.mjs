
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';

const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url),'utf8'));
const norm = normalizeSession(s);
const segments = norm.segments;
const isRngCall = (e) => typeof e === 'string' && /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);

const cFlat = [];
segments.forEach((seg, si) => {
  (seg.steps||[]).forEach((st,i) => {
    for (const e of st.rng||[]) if (isRngCall(e)) cFlat.push({call:e, step:i, seg:si});
  });
});

const storage = new Map();
const storageHandle = {
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);},
  get length(){return storage.size;},
  key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;},
};
let jsFlat=[];
for (const seg of segments){
  const input = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  const r = (g.getRngLog?.() || []).map(e => typeof e==='string' ? e.replace(/^\d+\s+/,'') : String(e)).filter(isRngCall);
  globalThis.__jsFlat = jsFlat.concat(r);
  jsFlat = globalThis.__jsFlat;
}
console.log('C count', cFlat.length, 'JS count', jsFlat.length);
// first positional mismatch
let firstDiff = -1;
for (let i=0;i<Math.max(cFlat.length, jsFlat.length);i++){
  const cn = String(cFlat[i]?.call||'<none>').replace(/\s*@\s.*$/,'').trim();
  const jn = String(jsFlat[i]||'<none>').replace(/\s*@\s.*$/,'').trim();
  if (cn!==jn){ firstDiff=i; break; }
}
console.log('first diff at', firstDiff); globalThis.__cFlat=cFlat;
const allDiff=[]; for (let i=0;i<Math.max(cFlat.length, jsFlat.length);i++){ const cn = String(cFlat[i]?.call||'<none>').replace(/\s*@\s.*$/,'').trim(); const jn = String(jsFlat[i]||'<none>').replace(/\s*@\s.*$/,'').trim(); if (cn!==jn) allDiff.push([i, cFlat[i]?.step, cn, jn, cFlat[i]?.call, jsFlat[i]]); } console.log('total diffs', allDiff.length); const fs2=await import('fs'); fs2.writeFileSync('/tmp/alldiffs.json', JSON.stringify(allDiff)); for (let k=Math.max(0,firstDiff-8);k<firstDiff+12;k++){
  console.log(k, 'step', cFlat[k]?.step, '| C:', cFlat[k]?.call, '|| JS:', jsFlat[k]);
}
