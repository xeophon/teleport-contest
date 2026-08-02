
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json', 'utf8'));
const norm = normalizeSession(s);
const storage = new Map();
const storageHandle = {
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);},
  get length(){return storage.size;},
  key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;},
};
let log=[];
for (const seg of norm.segments||[]) {
  const input = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  log = log.concat(g.getRngLog?.() || []);
}
const calls = log.filter(e=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e));
const lo = parseInt(process.env.TR_LO||'3000'), hi = parseInt(process.env.TR_HI||'3016'); for (let i=lo;i<Math.min(hi,calls.length);i++) console.log(i, calls[i]);
