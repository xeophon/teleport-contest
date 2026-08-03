// usage: node tools/cmp-session.mjs <session.json> [--screens]
import { readFileSync } from 'fs';
const f = process.argv[2];
const sessionData = JSON.parse(readFileSync(f,'utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const isRng = e => /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
const norm = e => String(e).replace(/\s*@\s.*$/,'').replace(/^\d+\s+/,'').trim();
const segs = normalizeSession(sessionData).segments;
const cFlat = [];
segs.forEach((seg,gi)=> (seg.steps||[]).forEach((st,si)=> (st.rng||[]).filter(isRng).forEach(e=>cFlat.push({e, si, gi}))));
const storage = mkStorage();
const jFlat = [];
for (const seg of segs) {
  const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage });
  jFlat.push(...(g.getRngLog?.()||[]).map(e=>String(e)));
  if (process.argv.includes('--screens')) {
    const { decodeScreen } = await import('../frozen/screen-decode.mjs');
    const txt = sc => decodeScreen(sc).map(r=>r.map(c=>c.ch).join('').replace(/\s+$/,'')).join('\n').replace(/\n+$/,'');
    const js2 = g.getScreens?.()||[];
    (seg.steps||[]).forEach((st,i)=>{
      if (st.screen && txt(st.screen) !== txt(js2[i]||'')) {
        console.log('first screen diff at step', i);
        console.log('--- C ---'); console.log(txt(st.screen));
        console.log('--- JS ---'); console.log(txt(js2[i]||''));
        process.exit(0);
      }
    });
    console.log('screens all match');
  }
}
let first=-1;
for (let i=0;i<Math.max(cFlat.length,jFlat.length);i++){
  if (norm(cFlat[i]?.e||'') !== norm(jFlat[i]||'')) { first=i; break; }
}
console.log('C flat:', cFlat.length, 'JS flat:', jFlat.length, 'first divergence:', first, first>=0?`step ${cFlat[first].si}`:'');
if (first>=0) for (let i=Math.max(0,first-6);i<first+10 && i<cFlat.length;i++) console.log(i,'C:',cFlat[i]?.e,' || JS:',jFlat[i]);
