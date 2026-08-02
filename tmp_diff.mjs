
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const norm = normalizeSession(s);
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
const seg = norm.segments[0];
const input = { seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH };
const g = await runSegment(input);
const jsScr = g.getScreens();
const jsCur = g.getCursors();
const cSteps = seg.steps;
let firstBad=-1, firstBadCur=-1;
for (let i=0;i<cSteps.length;i++){
  const c=cSteps[i];
  if (!c.screen) continue;
  const cg=decodeScreen(c.screen), jg=decodeScreen(jsScr[i]||'');
  let cellsEq=true;
  outer: for (let r=0;r<24;r++) for(let col=0;col<80;col++){
    const a=cg[r][col], b=jg[r][col];
    if (a.ch!==b.ch || a.fg!==b.fg || a.bold!==b.bold) { cellsEq=false; break outer; }
  }
  const curEq = !Array.isArray(c.cursor) || (Array.isArray(jsCur[i]) && c.cursor[0]===jsCur[i][0] && c.cursor[1]===jsCur[i][1] && c.cursor[2]===jsCur[i][2]);
  if (!cellsEq && firstBad<0) firstBad=i;
  if (!curEq && firstBadCur<0) firstBadCur=i;
  if (!cellsEq || !curEq){
    if (i<130) {
      const msg0=cg[0].map(renderCell).join(''), msg1=jg[0].map(renderCell).join('');
      console.log(`step ${i} key=${JSON.stringify(c.key)} cellsEq=${cellsEq} curEq=${curEq} C_cur=${JSON.stringify(c.cursor)} JS_cur=${JSON.stringify(jsCur[i])}`);
      if (!cellsEq) console.log('   C :',JSON.stringify(msg0).slice(0,100),'\n   JS:',JSON.stringify(msg1).slice(0,100));
    }
  }
}
console.log('firstBad cells', firstBad, 'firstBad cursor', firstBadCur);
for (let i=Math.max(0,firstBad-2);i<=Math.min(cSteps.length-1,firstBad+3);i++){
  const c=cSteps[i];
  const cg=decodeScreen(c.screen||''), jg=decodeScreen(jsScr[i]||'');
  console.log('== step',i,'key',JSON.stringify(c.key),'cursor C',c.cursor,'JS',jsCur[i]);
  for(let r=0;r<6;r++){
    const ct=cg[r].map(renderCell).join(''), jt=jg[r].map(renderCell).join('');
    if (ct!==jt) console.log('  row',r,'\n    C :'+JSON.stringify(ct)+'\n    JS:'+JSON.stringify(jt));
  }
}
