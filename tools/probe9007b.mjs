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
console.log('hero at', game.u.ux, game.u.uy, 'moves', game.moves);
for (const m of (game.level?.monsters||[])) {
  if (!m.ispriest && m.data?.name !== 'minotaur') continue;
  console.log(JSON.stringify({name:m.data?.name, x:m.mx, y:m.my, lev:m.m_lev, hp:[m.mhp,m.mhpmax], peace:!!m.mpeaceful, tame:!!m.mtame, shrine:m.shrine, ispriest:!!m.ispriest, msleeping: !!m.msleeping}, null, 1));
}
// the altar location
const lvl = game.level;
for (let y=0;y<25;y++) for (let x=0;x<80;x++){
  const loc = lvl?.at?.(x,y);
  if (loc && (loc.typ===10 || (loc.flags??loc.altarmask??0) & 4 )) { // ALTAR=10?
    if (loc.typ === 10 || loc.altside!=null || (loc.altarmask)!=null && (loc.altarmask&7)) console.log('altar at', x, y, 'typ', loc.typ, 'flags', loc.flags ?? loc.altarmask, 'altside', loc.altside);
  }
}
