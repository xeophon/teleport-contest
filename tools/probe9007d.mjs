import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0,136), storage: storageHandle});
for (let y=8;y<=14;y++){
  const parts=[];
  for (let x=70;x<=79;x++){ const l = game.level.at(x,y); parts.push(`${x},${y}:t${l.typ} f${l.flags??'-'} am${l.altarmask??'-'} r${l.roomno}`); }
  console.log(parts.join(' | '));
}
const priest = (game.level?.monsters||[]).find(m=>m.ispriest);
console.log('priest', JSON.stringify({x:priest.mx,y:priest.my,shrine:priest.shrine,peace:priest.mpeaceful}));
const lich = (game.level?.monsters||[]).find(m=>m.data?.name==='lich');
console.log('lich', lich.mx, lich.my);
