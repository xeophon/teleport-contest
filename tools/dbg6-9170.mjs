const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
const rcs = {
  good108: "OPTIONS=name:wizard,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=playmode:debug\n",
  mine: "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=pettype:none,mention_walls\nOPTIONS=pushweapon,showexp,time,color\nOPTIONS=symset:DECgraphics\nOPTIONS=playmode:debug\n",
  mine_simp: "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=playmode:debug\n",
  mine_tut: "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!tutorial,!splash_screen\nOPTIONS=playmode:debug\n",
};
for (const [k, rc] of Object.entries(rcs)) {
  const g = await runSegment({ seed: 9170, datetime: "20260803100000", nethackrc: rc, moves: "  ", storage: mkStorage() });
  const js = g.getScreens?.()||[];
  const rows = decodeScreen(js[js.length-1]||'');
  const lines = rows.map(r=>r.map(c=>c.ch).join('')).filter(l=>l.trim());
  console.log('===', k, 'screens:', js.length);
  console.log(lines.slice(0,3).join(' | ').slice(0,200));
}
