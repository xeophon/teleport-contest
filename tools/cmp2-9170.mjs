import { readFileSync } from 'fs';
const sessionData = JSON.parse(readFileSync('sessions-extra/seed9170-wiz-pray-outcomes.session.json','utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() });
const isRng = e => /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
const norm = e => String(e).replace(/\s*@\s.*$/,'').replace(/^\d+\s+/,'').trim();
// flatten C with step attribution
const cFlat = []; 
(seg.steps||[]).forEach((st,si)=> (st.rng||[]).filter(isRng).forEach(e=>cFlat.push({e, si})));
const jFlat = (g.getRngLog?.()||[]).map(e=>String(e));
console.log('C flat:', cFlat.length, 'JS flat:', jFlat.length);
let first=-1;
for (let i=0;i<Math.max(cFlat.length,jFlat.length);i++){
  if (norm(cFlat[i]?.e||'') !== norm(jFlat[i]||'')) { first=i; break; }
}
console.log('first flat divergence:', first, first>=0 ? 'step '+cFlat[first].si : '');
for (let i=Math.max(0,first-6); i<first+12 && i<cFlat.length; i++)
  console.log(i, 'C:', cFlat[i]?.e, ' || JS:', jFlat[i]);
