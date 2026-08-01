
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(new URL('../sessions/seed4500-knight-coverage.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0, 1034), storage: h });
const IN_SIGHT=64;
for (const m of (game.level?.monsters||[]).filter(m=>m.data?.name.includes('mino'))) {
  console.log('mino', {x:m.mx,y:m.my,hp:m.mhp,minvis:!!m.minvis,mundetected:!!m.mundetected});
  console.log('  viz-byte=', game.viz_array?.[m.my]?.[m.mx]);
}
console.log('hero', game.u?.ux, game.u?.uy, 'total monsters', (game.level?.monsters||[]).length);
// does the C recording even HAVE a minotaur? Let me see screen 1034+ map: hero at (42,6) per cursor
