
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
for (const i of [90,91,92]) {
  const c = seg.steps[i];
  const cg = decodeScreen(c.screen), jg = decodeScreen(jsScr[i]||'');
  console.log(`== ${i} key=${JSON.stringify(c.key)}`);
  console.log('  C :', JSON.stringify(cg[0].map(renderCell).join('')).slice(0,90));
  console.log('  JS:', JSON.stringify(jg[0].map(renderCell).join('')).slice(0,90));
}
