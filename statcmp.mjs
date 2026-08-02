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
const A = parseInt(process.argv[2]||'129'), B = parseInt(process.argv[3]||'151');
for (let i=A;i<B;i++){
  const cr = rows(seg.steps[i]?.screen), jr = rows(screens[i]);
  // compare all rows, print diffs
  const diffs = [];
  for (let r=0;r<24;r++) if ((cr[r]||'') !== (jr[r]||'')) diffs.push(r);
  if (diffs.length) {
    console.log(`--- step ${i} rows differ:`, diffs.join(','));
    for (const r of diffs.slice(0,4)) console.log(`  C [${r}]: ${JSON.stringify(cr[r])}\n  J [${r}]: ${JSON.stringify(jr[r])}`);
  }
}
