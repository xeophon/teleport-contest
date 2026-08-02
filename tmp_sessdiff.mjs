
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';
const file = process.argv[2];
const s = JSON.parse(readFileSync(file,'utf8'));
const norm = normalizeSession(s);
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
let flatScr=[]; let flatCur=[]; let si=0;
for (const seg of norm.segments) {
  const input = { seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH };
  const g = await runSegment(input);
  for (const st of (seg.steps||[])) {
    st._seg = si;
  }
  flatScr.push(...g.getScreens());
  flatCur.push(...g.getCursors());
  si++;
}
let idx=0;
for (const seg of norm.segments) {
  for (const [i, st] of (seg.steps||[]).entries()) {
    if (!st.screen) continue;
    const cg = decodeScreen(st.screen), jg = decodeScreen(flatScr[idx]||'');
    let bad=false, firstDiff=null;
    for (let r=0;r<24 && !bad;r++) for (let c=0;c<80 && !bad;c++){
      const a=cg[r][c], b=jg[r][c];
      if (a.ch!==b.ch || a.fg!==b.fg || a.bold!==b.bold) { bad=true; firstDiff=[r,c,a,b]; }
    }
    if (bad) {
      console.log(`step ${idx} (seg ${st._seg}) key=${JSON.stringify(st.key)} first diff r${firstDiff[0]}c${firstDiff[1]} C=${JSON.stringify(renderCell(firstDiff[2])+'/'+firstDiff[2].fg)} JS=${JSON.stringify(renderCell(firstDiff[3])+'/'+firstDiff[3].fg)}`);
      const rr=cg[firstDiff[0]].map(renderCell).join(''), rj=jg[firstDiff[0]].map(renderCell).join('');
      console.log('  C :'+JSON.stringify(rr));console.log('  JS:'+JSON.stringify(rj));
      // show row-1 too for context
      const m0=cg[0].map(renderCell).join(''), m1=jg[0].map(renderCell).join('');
      console.log('  C0:'+JSON.stringify(m0));console.log('  J0:'+JSON.stringify(m1));
    }
    idx++;
  }
}
