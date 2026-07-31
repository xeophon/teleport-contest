import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const nchar = Number(process.argv[3]);
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0,nchar), storage: storageHandle});
console.log('hero at', game.u.ux, game.u.uy);
const lvl = game.level;
for (let y=5;y<16;y++){
  let row = y.toString().padStart(2)+' ';
  for (let x=0;x<12;x++){ const l = lvl?.at?.(x,y) || {}; row += `${x}:${l.typ}/${l.flags??'-'}/${l.align??'-'}/${l.altarmask??'-'} `; }
  console.log(row);
}
