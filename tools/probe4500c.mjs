
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
import { cansee } from '../js/vision.js';
const s = JSON.parse(readFileSync(new URL('../sessions/seed4500-knight-coverage.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0, 1034), storage: h });
const mino = (game.level?.monsters||[]).find(m=>m.data?.name==='minotaur');
console.log('mino', mino.mx, mino.my, 'hero', game.u.ux, game.u.uy, 'u.blind', game.u.blind, 'IN_SIGHT', !!(game.viz_array?.[mino.my]?.[mino.mx] & 2), 'cansee', cansee(mino.mx, mino.my));
