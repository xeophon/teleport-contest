import { readFileSync } from 'fs';
import { runSegment } from './js/jsmain.js';
import { normalizeSession } from './frozen/session_loader.mjs';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';

const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = {
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);},
  get length(){return storage.size;},
  key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;},
};
const nh = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
const screens = nh.getScreens();
const cSteps = seg.steps;
const cTop = (i)=> decodeScreen(cSteps[i]?.screen||'').map(r=>r.map(renderCell).join(''))[0].replace(/\s+$/,'');
const jTop = (i)=> { const enc = screens[i]; if (enc == null) return '<none>'; return decodeScreen(enc).map(r=>r.map(renderCell).join(''))[0].replace(/\s+$/,''); };
const A = parseInt(process.argv[2]||'100'), B = parseInt(process.argv[3]||'145');
for (let i=A;i<B;i++){
  const ct = cTop(i), jt = jTop(i);
  if (ct !== jt) console.log(`${i} C=${JSON.stringify(ct)}\n  J=${JSON.stringify(jt)}`);
  else console.log(`${i} same: ${JSON.stringify(ct.slice(0,50))}`);
}
