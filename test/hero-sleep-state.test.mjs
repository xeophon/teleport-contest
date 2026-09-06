import assert from 'node:assert/strict';
import test from 'node:test';
import * as timeout from '../js/timeout.js';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, SLP_GAS_TRAP, SLEEP_RES } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { rhack } from '../js/cmd.js';
import { moveloop_core, processMonsterTurns, stopHeroOccupation } from '../js/allmain.js';
import { resetInputState } from '../js/input.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup() {
    const g = resetGame(); resetInputState(); initRng(2); enableRngLog();
    Object.assign(g, { flags: {}, context: {}, moves: 100, inventory: [], level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10, uhp: 100,
            uhpmax: 100, uhunger: 900, umovement: 12, acurr: { a: [14, 14, 14, 14, 14, 14] } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset(); return g;
}

for (const wakeupMessage of [true, false]) test(`fall_asleep stores source sleep state with wakeup=${wakeupMessage}`, () => {
    const g = setup(); g.u._deafTimeout = 7;
    g._pick_lock_occupation = { turns: 10, action: 'picking the lock' };
    timeout.fallAsleep(-3, wakeupMessage, stopHeroOccupation);
    assert.equal(g.u.usleep, 100); assert.equal(g.multi, -3);
    assert.equal(g._helpless_time, 3); assert.equal(g.multi_reason, 'sleeping');
    assert.equal(g._wake_message, wakeupMessage ? 'You wake up.' : 'You can move again.');
    assert.equal(g._pick_lock_occupation, null); assert.match(g._pending_message, /You stop picking the lock/);
    assert.equal(g.u._deafTimeout, 7, 'disabled C deafness block does not run');
    assert.deepEqual(getRngLog(), []);
});

test('fall_asleep preserves a longer existing nomul while restarting the combat-wake turn marker', () => {
    const g = setup(); g.multi = -10; g._helpless_time = 10;
    g.u.uinvulnerable = true;
    timeout.fallAsleep(-3, true, stopHeroOccupation);
    assert.equal(g.multi, -10); assert.equal(g._helpless_time, 10);
    assert.equal(g.u.usleep, 100); assert.equal(g._wake_message, 'You wake up.');
    assert.equal(g.u.uinvulnerable, true, 'nomul returns before changing invulnerability');
});

for (const speed of [6, 12, 24]) test(`natural wake at movement rate ${speed} clears usleep after two full turns`, async () => {
    const g = setup(); g.u._monsterMove = speed;
    g.multi = -2; g._helpless_time = 2; g._sleeping_time = 3;
    g.u.usleep = 100; g.multi_reason = 'sleeping'; g._wake_message = 'You wake up.';
    for (;;) try { await moveloop_core(); }
    catch (error) { if (error.message.includes('Input queue empty')) break; throw error; }
    assert.equal(g.moves, 102); assert.equal(g.u.usleep, 0);
    assert.equal(g.multi, 0); assert.equal(g.multi_reason, null);
    assert.equal(g._sleeping_time, 0); assert.match(g._pending_message, /You wake up/);
});

for (const saved of [false, true]) test(`unmul preserves its source state until a ${saved ? 'saved' : 'live'} wake message is displayed`, async () => {
    const g = setup(); g.u.umovement = 0;
    timeout.fallAsleep(-1, true, stopHeroOccupation);
    g._pending_message = 'An existing message fills the top line before you awaken from your sleep.';
    await processMonsterTurns();
    assert.equal(g.multi, 0); assert.equal(g.u.usleep, 100);
    assert.equal(g.multi_reason, 'sleeping'); assert.equal(g._unmul_after_more, 'You wake up.');
    if (saved) {
        const core = g.coreCtx; restoreSaveState(encodeSaveState()); g.coreCtx = core;
    }
    await rhack(' ');
    assert.match(g._pending_message, /You wake up/);
    assert.equal(g.u.usleep, 0); assert.equal(g.multi_reason, null);
    assert.equal(g._unmul_after_more, '');
});

test('sleep gas marks the current turn before a later monster can attempt to wake the hero', async () => {
    const g = setup(); g.level.traps.push({ tx: 11, ty: 10, ttyp: SLP_GAS_TRAP });
    await rhack('l');
    assert.equal(g.u.usleep, 100); assert.equal(g.multi, -g._helpless_time);
    assert.equal(g._wake_message, 'You wake up.');
    assert.ok(getRngLog().some(e => e.startsWith('rnd(25)=')));
});

test('cursed apple sleep uses the shared sleep marker and wake message', async () => {
    const g = setup(); g.level.objects.push({ cls: 'food', kind: 'apple', cursed: true, quan: 1,
        otyp: 319, nutrition: 50, delay: 1, age: 100, ox: 10, oy: 10 });
    await rhack('e'); await rhack('y');
    assert.match(g._pending_message, /fall asleep/);
    assert.equal(g.u.usleep, 100); assert.equal(g._wake_message, 'You wake up.');
});

for (const resistance of [false, true]) test(`self-zapped sleep uses source resistance gate=${resistance}`, async () => {
    const g = setup(); g.inventory.push({ cls: 'wand', kind: 'sleep', wandIndex: 22, spe: 3, quan: 1, letter: 'a' });
    if (resistance) g.u.uprops = { [SLEEP_RES]: { intrinsic: 1 } };
    await rhack('z'); await rhack('a'); await rhack('.');
    assert.equal(g.u.usleep || 0, resistance ? 0 : 100);
    assert.equal(getRngLog().some(e => e.startsWith('rnd(50)=')), !resistance);
    assert.match(g._pending_message, resistance ? /don't feel sleepy/ : /sleep ray hits you/);
});
