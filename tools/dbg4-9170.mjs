const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const base = "OPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=pettype:none,mention_walls\nOPTIONS=pushweapon,showexp,time,color\nOPTIONS=symset:DECgraphics\nOPTIONS=playmode:debug\n";
const variants = {
  full: "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\n" + base,
  noname: "OPTIONS:role:Wizard,race:human,gender:male,align:neutral\n" + base,
  justname: "OPTIONS:name:Pray\n" + base,
  name9107: "OPTIONS:name:Offer,role:Wizard,race:human,gender:male,align:neutral\n" + base,
};
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
for (const [k, rc] of Object.entries(variants)) {
  const g = await runSegment({ seed: 9170, datetime: "20260803100000", nethackrc: rc, moves: "", storage: mkStorage() });
  const js = g.getScreens?.()||[];
  const rows = decodeScreen(js[js.length-1]||'');
  const txt = rows.map(r=>r.map(c=>c.ch).join('')).join('\n');
  const first = txt.split('\n').map(l=>l.trim()).filter(Boolean)[0];
  console.log(k, '->', JSON.stringify(first));
}
