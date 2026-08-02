
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const norm = normalizeSession(s);
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
// run only up to step 97 by truncating steps array of segment 0
const seg = norm.segments[0];
const sub = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
              nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH,
              steps: seg.steps.slice(0,98) };
const g = await runSegment(sub);
const { game } = await import('./js/gstate.js');
console.log('hero at', game.u.ux, game.u.uy);
for (let y=0;y<=6;y++){
  let row='';
  for (let x=55;x<=70;x++){ const l=game.level?.at(x,y); row+=String(!l?'--':l.typ).padStart(3);}
  console.log(y,row);
}
const mons = (game.level.monsters||[]).map(m=>`${m.mndx??m.type}@${m.mx},${m.my}`);
console.log(mons.join(' '));
