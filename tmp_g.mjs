
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9003-wizard-genocide.session.json','utf8'));
const norm = normalizeSession(s);
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
for (const seg of norm.segments||[]) {
  const input = { seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH };
  const g = await runSegment(input);
}
// dump raw log with sites around 'rn2(19)' occurrences after index 2400
import { getRngLog } from './js/rng.js';
const log = getRngLog();
log.forEach((e,i)=>{ if (/rn2\(19\)/.test(e)) console.log(i, e); });
