
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
const g = await runSegment({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH });
const jsScr = g.getScreens();
for (const i of [98, 100, 103]) {
  const cg = decodeScreen(seg.steps[i].screen), jg = decodeScreen(jsScr[i]);
  console.log('== step', i);
  for (let r=0;r<22;r++) {
    const ct=cg[r].map(renderCell).join(''), jt=jg[r].map(renderCell).join('');
    if (ct!==jt) {
      let d=''; for(let c=0;c<80;c++) d += (renderCell(cg[r][c])!==renderCell(jg[r][c]) ? '^' : ' ');
      console.log('  C :'+JSON.stringify(ct)); console.log('  JS:'+JSON.stringify(jt)); console.log('     '+d);
    }
  }
}
