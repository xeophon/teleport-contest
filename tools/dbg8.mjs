import { readFileSync } from 'fs';
const f = process.argv[2];
const sessionData = JSON.parse(readFileSync(f,'utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() });
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
const js = g.getScreens?.()||[];
const dump=(sc,label)=>{ const rows = decodeScreen(sc); console.log('--- '+label+' ---'); for (const r of rows){const t=r.map(c=>c.ch).join(''); if(t.trim()) console.log(t.trimEnd());} };
dump(js[0],'JS step0');
dump(seg.steps[0].screen,'C step0');
