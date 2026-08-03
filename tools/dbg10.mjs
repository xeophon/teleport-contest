const { runSegment } = await import('../js/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
for (const [label, name] of [['Pray','Pray'],['Offer','Offer'],['OfferNeg','Offer']]) {
  const negline = label==='OfferNeg' ? "OPTIONS=!autopickup,!verbose,!legacy,!tutorial,!splash_screen\n" : "";
  const rc = `OPTIONS=name:${name},role:Wizard,race:human,gender:male,align:neutral\n${negline}OPTIONS=playmode:debug\n`;
  const g = await runSegment({ seed: 9170, datetime: "20260803100000", nethackrc: rc, moves: "  ", storage: mkStorage() });
  const js = g.getScreens?.()||[];
  const rows = decodeScreen(js[js.length-1]||'');
  console.log('===', label, 'screens', js.length);
  for (const r of rows){const t=r.map(c=>c.ch).join(''); if(t.trim()) console.log(t.trimEnd());}
}
