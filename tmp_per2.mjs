
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
for (let i=88;i<=105;i++){
  const gl = g._screens[i] ? decodeScreen(g._screens[i])[0].map(renderCell).join('') : '';
  console.log(i, 'rng=', (g._rngSlices[i]||[]).length, JSON.stringify(gl).slice(0,110));
}
