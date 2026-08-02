import { readFileSync } from 'fs';
import { runSegment } from './js/jsmain.js';
import { normalizeSession } from './frozen/session_loader.mjs';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';

const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const sh = {getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;}};
const nh = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: sh });
const screens = nh.getScreens();
const rows=(enc)=>decodeScreen(enc||'').map(r=>r.map(renderCell).join('').replace(/\s+$/,''));
for (let i=0;i<=151;i++){
  const c = rows(seg.steps[i]?.screen)[23]||'';
  const j = rows(screens[i])[23]||'';
  const cm = (c.match(/T:(\d+)/)||[])[1], jm = (j.match(/T:(\d+)/)||[])[1];
  console.log(i, 'C:T'+cm, 'J:T'+jm, cm===jm?'':'  <<<');
}
