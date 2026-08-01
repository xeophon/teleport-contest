
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0,167), storage: h });
const mons = game.level?.monsters||[];
for (const nm of ['aligned cleric','minotaur','lich']) {
  for (const m of mons.filter(m=>m.data?.name===nm)) console.log(nm, JSON.stringify({x:m.mx,y:m.my,hp:m.mhp,max:m.mhpmax,lev:m.m_lev, tame:!!m.mtame,peace:!!m.mpeaceful, shrine:m.shrine,mw:!!m.mw,invent:(m.minvent||[]).map(i=>i.kind||i.otyp)}));
}
console.log('hero');
