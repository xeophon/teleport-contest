
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const norm = normalizeSession(s);
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
const seg = norm.segments[0];
const sub = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
              nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH,
              steps: seg.steps.slice(0,98) };
const g = await runSegment(sub);
// dump JS final screen
const scr = g._screens[g._screens.length-1];
if (true) {
  const grid = decodeScreen(scr);
  grid.forEach((r,y)=>{const t=r.map(renderCell).join(''); if (t.trim()) console.log(y, JSON.stringify(t));});
} else console.log('no getScreen; keys:', Object.keys(g));
