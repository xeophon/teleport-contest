import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

// A separate process makes a scheduler spin fail with a bounded timeout.
const probe = `
import { resetGame } from './js/gstate.js';
import { GameMap } from './js/game.js';
import { GameDisplay } from './js/game_display.js';
import { HeadlessTerminal } from './js/terminal.js';
import { ROOM, COULD_SEE, IN_SIGHT } from './js/const.js';
import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { monsterByRndName } from './js/mklev.js';
import { vision_reset } from './js/vision.js';
import { moveloop_core } from './js/allmain.js';
import { pushKeys, resetInputState } from './js/input.js';
const [name, rescue, width] = process.argv.slice(1);
const g = resetGame(); resetInputState(); initRng(42); enableRngLog();
Object.assign(g, { flags: { debug: true }, context: {}, inventory: [], moves: 100,
    level: new GameMap(), nhDisplay: new GameDisplay(new HeadlessTerminal({ cols: +width })), _pending_time_passed: 1,
    u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 1, uhpmax: 200, uac: 10, uhunger: 800, umovement: 12,
        acurr: { a: [14, 14, 14, 14, 14, 14] } } });
g.nhDisplay.readKey = async () => { throw new Error('Input queue empty'); };
for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
vision_reset();
g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
const mon = { data: monsterByRndName(name) || { name }, m_id: 50, mx: 11, my: 10, mux: 10, muy: 10,
    m_lev: 100, mhp: 100, mhpmax: 100, mcansee: true, mcanmove: true,
    minvent: [], movement: 12, mcan: name !== 'arch-lich', mspec_used: 3 };
g.level.monsters.push(mon);
if (rescue === 'amulet') g.inventory.push({ cls: 'amulet', kind: 'amulet of life saving',
    amuletIndex: 1, worn: true, quan: 1 });
async function input(keys = '') {
    pushKeys(keys);
    for (;;) try { await moveloop_core(); }
    catch (error) { if (error.message.includes('Input queue empty')) return; throw error; }
}
const snapshots = [];
function snapshot() {
    snapshots.push({ mode: g._command_mode, pending: g._pending_time_passed || 0,
        movement: g.u.umovement, moves: g.moves, hp: g.u.uhp,
        attack: g._monster_attack_continuation?.phase || null, message: g._pending_message,
        rng: getRngLog().length, hits: getRngLog().filter(e => e.startsWith('rnd(20)=')).length });
}
await input();
for (let i = 0; i < 20 && !g._command_mode; i++) await input(' ');
snapshot();
if (rescue === 'wizard') { await input(' '); snapshot(); await input('n'); }
else await input(' ');
for (let i = 0; i < 30 && (g._monster_attack_continuation || g._message_more); i++) await input(' ');
snapshot();
console.log(JSON.stringify(snapshots));
`;

for (const name of ['wizard', 'arch-lich']) for (const rescue of ['wizard', 'amulet'])
    for (const width of [70, 800]) test(`${name} ${rescue} rescue preserves the live monster pass at width ${width}`, () => {
        const child = spawnSync(process.execPath, ['--input-type=module', '-e', probe, name, rescue, String(width)],
            { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 4000 });
        assert.equal(child.error, undefined, child.error?.message);
        assert.equal(child.status, 0, child.stderr);
        const snapshots = JSON.parse(child.stdout.trim());
        const first = snapshots[0], last = snapshots.at(-1);
        assert.equal(first.mode, rescue === 'wizard' ? 'deathDieMore' : 'lifeSavingMore');
        assert.equal(first.moves, 100, 'done suspends inside movemon before the turn clock');
        assert.equal(first.movement, 0, 'the original hero action is debited once');
        assert.ok(first.pending >= 0, 'a death prompt cannot create negative pending time');
        if (rescue === 'wizard') {
            assert.equal(snapshots[1].mode, 'wizardDieConfirm');
            assert.equal(snapshots[1].rng, first.rng, 'asking Die? does not run monsters');
            assert.equal(snapshots[1].movement, first.movement);
        }
        assert.equal(last.attack, null);
        assert.equal(last.hits, 1, 'the interrupted contact slot is not replayed');
        assert.ok(last.hp > 0);
        assert.equal(last.moves, 101, 'the suspended pass finishes before the next input');
        assert.equal(last.movement, 12, 'resuming movemon does not charge a second hero action');
        assert.match(last.message, /You survived that attempt on your life/);
    });
