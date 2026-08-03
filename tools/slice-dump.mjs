import { readFileSync } from 'fs';
const jsdir = process.argv[2]; const f = process.argv[3];
const lo = parseInt(process.argv[4]); const hi = parseInt(process.argv[5]);
const sessionData = JSON.parse(readFileSync(f,'utf8'));
const { runSegment } = await import(jsdir + '/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const seg = sessionData.segments[0];
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() });
const isRng = e => /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(String(e).replace(/^\d+\s+/,''));
const slices = g.getRngSlices?.()||[];
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
for (let i=lo;i<=hi && i<slices.length;i++){
  const r = (slices[i]||[]).filter(isRng);
  const sc = (g.getScreens?.()||[])[i];
  const r0 = sc ? decodeScreen(sc)[0].map(c=>c.ch).join('').trimEnd() : '';
  console.log('== step',i,'::',r0.slice(0,80)); console.log(r.join('\n'));
}
