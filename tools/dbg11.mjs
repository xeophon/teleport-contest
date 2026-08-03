import { readFileSync } from 'fs';
const sessionData = JSON.parse(readFileSync('sessions-extra/seed9170-wiz-pray-outcomes.session.json','utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() });
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
const js = g.getScreens?.()||[];
console.log('js screens:', js.length);
for (let i=0;i<js.length;i++){
  const rows = decodeScreen(js[i]);
  const lines = rows.map(r=>r.map(c=>c.ch).join('').trim()).filter(Boolean);
  console.log(i, '::', JSON.stringify((lines[0]||'').slice(0,75)));
}
