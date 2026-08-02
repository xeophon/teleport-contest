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
const cursors = nh.getCursors();
const rows=(enc)=>decodeScreen(enc||'').map(r=>r.map(renderCell).join(''));
for (let i=107;i<=150;i++){
  const cr = rows(seg.steps[i]?.screen).map(x=>x.replace(/\s+$/,''));
  const jr = rows(screens[i]).map(x=>x.replace(/\s+$/,''));
  const mism = [];
  for (let r=0;r<24;r++) if ((cr[r]||'') !== (jr[r]||'')) mism.push(r);
  const cc = seg.steps[i]?.cursor, jc = cursors[i];
  const cdiff = JSON.stringify(cc)!==JSON.stringify(jc);
  if (mism.length||cdiff) {
    console.log(`=== step ${i}`);
    for (const r of mism) console.log(`  C [${r}]: ${JSON.stringify(cr[r])}\n  J [${r}]: ${JSON.stringify(jr[r])}`);
    if (cdiff) console.log(`  cursor C=${JSON.stringify(cc)} J=${JSON.stringify(jc)}`);
  }
}
