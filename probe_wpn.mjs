
import { game, resetGame } from './js/gstate.js';
import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { mattackm, fightm, selectHwep, monWieldItem, dmgvalMonsterWeapon, hitvalMonsterWeapon, setMhitmHooks } from './js/mhitm.js';
import { MONS } from './js/permonst.js';

function installGame(seed = 42) {
  const g = resetGame();
  initRng(seed); enableRngLog();
  g.level = { monsters: [], objects: [], traps: [], engravings: [] };
  g.moves = 100;
  g.u = { ux: 10, uy: 10, ulevel: 1, inv: [], acurr: { a: [10,10,10,10,10,10] } };
  return g;
}
function mkMon(name, x, y, extra={}) {
  const pm = MONS.find(m => m.name === name === false ? null : m.name === name);
  const pm2 = MONS.find(m => m.name === name);
  const mon = { mx:x, my:y, mhp:50, mhpmax:50, movement:12, mcanmove:true,
      mcan:false, msleeping:0, mstun:0, mconf:0, data: pm2, minvent:[], ...extra };
  game.level.monsters.push(mon);
  return mon;
}
installGame(42);
const msgs = [];
setMhitmHooks({ pline: m => msgs.push(m), donameMonsterWeapon: (o) => `a ${o.kind === 'scimitar' ? 'curved sword' : o.kind}`, isConflict: () => true });
const captain = mkMon('orc-captain', 10, 10, { mw: null, weapon_check: 1 });
captain.minvent = [
  { kind: 'orcish dagger', cls: 'weapon', quan: 1 },
  { kind: 'scimitar', cls: 'weapon', quan: 1 },
];
const orc = mkMon('hill orc', 11, 10);   // pick orc (1d8, medium)
console.log('selhwep deco:', selectHwep(captain)?.kind);
const before = getRngLog().length;
const result = mattackm(captain, orc);
const log = getRngLog().slice(before).map(e => e.split(' @ ')[0]);
console.log('result', result);
console.log('rolls:', JSON.stringify(log));
console.log('msgs:', JSON.stringify(msgs));
console.log('mw:', captain.mw?.kind);
console.log('hitval sword vs orc:', hitvalMonsterWeapon(captain.mw, orc));
const before2 = getRngLog().length;
const result2 = mattackm(captain, orc);
console.log('2nd call result', result2);
console.log('rolls2:', JSON.stringify(getRngLog().slice(before2).map(e=>e.split(' @ ')[0])));
console.log('msgs2:', JSON.stringify(getRngLog() && msgs));

