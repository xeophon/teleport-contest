import { readFileSync } from 'fs';
const s = JSON.parse(readFileSync('sessions/seed4500-knight-coverage.session.json','utf8'));
process.env.MSGTRACE = 1;
const { runSegment } = await import('/tmp/nh-prayer/js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const seg = s.segments[0];
await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves.slice(0, 296), storage: mkStorage() });
const mt = globalThis.__mt || [];
for (const e of mt) if (/slither|shimmering|finish your prayer|pleased|satisfied/.test(e.text||'')) console.log(JSON.stringify(e));
