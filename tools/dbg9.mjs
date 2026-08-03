const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
async function probe(label, rc){
  const g = await runSegment({ seed: 9170, datetime: "20260803100000", nethackrc: rc, moves: " ", storage: mkStorage() });
  const js = g.getScreens?.()||[];
  const rows = decodeScreen(js[js.length-1]||'');
  const txt = rows.map(r=>r.map(c=>c.ch).join('')).join('\n');
  let state = 'game?';
  if (txt.includes('Who are you?')) state='WHO';
  else if (txt.includes('Do you want a tutorial?')) state='TUTORIAL-Q';
  else if (txt.includes('Pick a role')) state='ROLEMENU';
  else if (txt.includes('welcome to NetHack')) state='INGAME';
  console.log(label, '->', state);
}
const base="OPTIONS=name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=playmode:debug\n";
await probe('minimal-mine', base);
await probe('nameO-minimal', "OPTIONS:name:Offer,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=playmode:debug\n");
await probe('plus-neg', "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=playmode:debug\n");
await probe('plus-pet', "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=pettype:none,mention_walls\nOPTIONS=playmode:debug\n");
await probe('plus-push', "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=pettype:none,mention_walls\nOPTIONS=pushweapon,showexp,time,color\nOPTIONS=playmode:debug\n");
await probe('full', "OPTIONS:name:Pray,role:Wizard,race:human,gender:male,align:neutral\nOPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\nOPTIONS=pettype:none,mention_walls\nOPTIONS=pushweapon,showexp,time,color\nOPTIONS=symset:DECgraphics\nOPTIONS=playmode:debug\n");
