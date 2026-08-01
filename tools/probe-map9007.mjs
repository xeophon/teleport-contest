
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0,168), storage: h });
const g = (x,y)=>game.level.at(x,y);
for (let y=16;y<20;y++){
  const parts=[];
  for (let x=16;x<23;x++){ const l=g(x,y); const m=(game.level.monsters||[]).find(m=>m.mx===x&&m.my===y); parts.push(`${x},${y}:t${l.typ}${m?'/M:'+m.data.name[0]:''}`); }
  console.log(parts.join(' '));
}
