const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
const rc = "OPTIONS=name:wizard,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=playmode:debug\n";
for (const [seed, dt] of [[108,"20000110090000"],[9170,"20000110090000"],[108,"20260803100000"],[9170,"20260803100000"],[9163,"20260720093000"]]) {
  const g = await runSegment({ seed, datetime: dt, nethackrc: rc, moves: "  ", storage: mkStorage() });
  const js = g.getScreens?.()||[];
  const rows = decodeScreen(js[js.length-1]||'');
  const lines = rows.map(r=>r.map(c=>c.ch).join('')).filter(l=>l.trim());
  console.log('seed', seed, 'dt', dt, '->', (lines[0]||'').trim().slice(0,70), '||', (lines.find(l=>l.includes('Welcome'))||'').trim().slice(0,60));
}
