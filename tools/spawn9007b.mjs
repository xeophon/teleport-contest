
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0,64), storage: storageHandle});
const mons = game.level?.monsters||[];
console.log('hero', game.u?.ux, game.u?.uy, 'nmonsters', mons.length);
for (const m of mons.slice(0,8)) console.log(m.data?.name, m.mx, m.my);
const e = mons.find(m=>m.data?.name==='ettin mummy');
console.log('ettin:', e && {x:e.mx,y:e.my,hp:e.mhp,max:e.mhpmax, tame:!!e.mtame, peace:!!e.mpeaceful});
