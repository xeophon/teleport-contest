
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(new URL('../sessions/seed4500-knight-coverage.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
// 1034 = '\n' step end of genesis; moves[i] covers steps[i+1]
await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0, 1033), storage: h });
const mino = (game.level?.monsters||[]).find(m=>m.data?.name==='minotaur');
console.log('mino?', mino && {x:mino.mx,y:mino.my, hp: mino.mhp});
console.log('hero at', game.u?.ux, game.u?.uy, 'dlvl?', game.level?.dnum, game.level?.dlevel);
console.log('viz', mino && game.viz_array?.[mino.my]?.[mino.mx], 'IN_SIGHT bit', mino && !!(game.viz_array?.[mino.my]?.[mino.mx] & 64));
const g2 = (game.level?.monsters||[]).length;
console.log('mons', g2);
