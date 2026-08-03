// usage: node tools/state-dump.mjs <jsdir> <session> <numMovesPrefix>
import { readFileSync } from 'fs';
const jsdir = process.argv[2];
const f = process.argv[3];
const sessionData = JSON.parse(readFileSync(f,'utf8'));
const seg = sessionData.segments[0];
const { runSegment } = await import(jsdir + '/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() });
const { game } = await import(jsdir + '/gstate.js');
process.on('exit', ()=>{});
const mons = (game.level?.monsters||[]).map(m=>[m.data?.name||m.name, m.mx, m.my, m.mhp, m.mundetected?1:0, m.mspec_used||0, m.mpeaceful?1:0, m.mtameness||0, m.mflee?1:0, m.msleeping?1:0, m.mmove, m.mcanmove?1:0, m._glyph, m.mwoundedlegs||0].join(','));
console.log(JSON.stringify({
  moves: game.moves, u: { ux: game.u?.ux, uy: game.u?.uy, uhp: game.u?.uhp, uinvulnerable: !!game.u?.uinvulnerable, uac: game.u?.uac, umovement: game.u?.umovement },
  flags: Object.entries(game).filter(([k])=>k.startsWith('_prayer')||k.startsWith('_resume')||k.startsWith('_monster_turns')||k.startsWith('_defer')).map(([k,v])=>[k,String(v)].join('=')).join(' '),
  mon_count: mons.length,
}, null, 1));
console.log(mons.join('\n'));
