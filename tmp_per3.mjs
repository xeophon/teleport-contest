
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
const slices = g._rngSlices;
for (let i=97;i<=102;i++){
  console.log(`== step ${i} rng:`);
  for (const e of (slices[i+1]||[])) console.log('   ', e);
}
// grid diff at step 98
const c=seg.steps[98];
const cg = decodeScreen(c.screen), jg = decodeScreen(g.getScreens()[98]);
for (let r=0;r<24;r++) for (let col=0;col<80;col++){
  const a=cg[r][col], b=jg[r][col];
  if (a.ch!==b.ch || a.fg!==b.fg) console.log(`diff r${r}c${col} C=${JSON.stringify(renderCell(a))+':'+a.fg} JS=${JSON.stringify(renderCell(b))+':'+b.fg}`);
}
