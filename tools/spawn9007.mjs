
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
console.log('dlvl?', game.level?.dnum, game.level?.dlevel, 'moves', game.moves);
for (const m of (game.level?.monsters||[])) {
  if (m.data?.name?.includes('mummy') || m.data?.name==='ettin mummy') console.log('mummy', m.data?.name, m.mx, m.my, 'mtrack', JSON.stringify((m.mtrack||[])));
}
