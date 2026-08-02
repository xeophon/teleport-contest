import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9012-arrive-castle.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const sh = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: sh});
for (let y=0;y<21;y++) for (let x=0;x<80;x++){
  const t = game.level.at(x,y).typ;
  if (t>=26 && t<=29) console.log('typ',t,'at',x,y);
}
