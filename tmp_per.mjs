
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
              nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH };
const g = await runSegment(sub);
console.log('screens', g._screens.length);
const grid = decodeScreen(g._screens[97]||'');
grid.forEach((r,y)=>{const t=r.map(renderCell).join(''); if (t.trim()) console.log(y, JSON.stringify(t));});
console.log('--- rng slice 98 (first 10):');
console.log(g._rngSlices[98]);
