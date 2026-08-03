const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const base = "OPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=pettype:none,mention_walls\nOPTIONS=pushweapon,showexp,time,color\nOPTIONS=symset:DECgraphics\nOPTIONS=playmode:debug\n";
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
const rc = "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\n" + base;
const g = await runSegment({ seed: 9170, datetime: "20260803100000", nethackrc: rc, moves: "  ", storage: mkStorage() });
const js = g.getScreens?.()||[];
console.log('num screens', js.length);
for (let i=0;i<js.length;i++){
  const rows = decodeScreen(js[i]);
  console.log('--- screen',i,'---');
  for (const r of rows){ const t=r.map(c=>c.ch).join(''); if(t.trim()) console.log(t); }
}
