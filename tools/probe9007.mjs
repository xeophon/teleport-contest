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
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0,nchar), storage: storageHandle});
console.log('monster count:', (game.level?.monsters||[]).length);
console.log('hero at', game.u.ux, game.u.uy);
for (const m of (game.level?.monsters||[])) {
  if ((Math.abs(m.mx-game.u.ux)<=12 && Math.abs(m.my-game.u.uy)<=8)) {
    console.log(`m=${m.data?.name} @${m.mx},${m.my} tame=${!!m.mtame} peace=${!!m.mpeaceful} lev=${m.m_lev} hp=${m.mhp}/${m.mhpmax} datalev=${m.data?.mlevel} priest=${!!m.ispriest} attacks=${JSON.stringify(m.data?.attacks||m.data?.attack||null)}`);
  }
}
