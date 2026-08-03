import { readFileSync } from 'fs';
const sessionData = JSON.parse(readFileSync('sessions-extra/seed9170-wiz-pray-outcomes.session.json','utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() };
let g;
process.on('uncaughtException', e=>{ console.log('UNCAUGHT:', e.stack); process.exit(1); });
try { g = await runSegment(input); } catch (e) { console.log('JS ERROR:', e.stack); }
if (g) {
  const { decodeScreen } = await import('../frozen/screen-decode.mjs');
  const js = g.getScreens?.()||[];
  const dump = (sc,label)=>{
    const rows = decodeScreen(sc);
    console.log('--- '+label+' ---');
    for (const r of rows) console.log(r.map(c=>c.ch).join(''));
  };
  dump(js[0],'JS step 0');
  dump(seg.steps[0].screen,'C step 0');
  dump(js[js.length-1],'JS last');
}
