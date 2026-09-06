import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { TIMER_LEVEL, TIMER_OBJECT, TIMER_GLOBAL, BURN_OBJECT, HATCH_EGG,
    ROT_CORPSE, MELT_ICE_AWAY, startTimer, stopTimer, peekTimer, runTimers,
    moveObjectTimers, splitObjectTimers, stopObjectTimers, stopSpotTimers,
    spotTimerExpires } from '../js/timeout.js';

test('C timer deadlines interleave callback families and run equal deadlines newest first', async () => {
    resetGame();
    game.moves = 10;
    const a = {}, b = {}, c = {}, d = {};
    startTimer(5, TIMER_OBJECT, BURN_OBJECT, a);
    startTimer(2, TIMER_OBJECT, HATCH_EGG, b);
    startTimer(5, TIMER_OBJECT, ROT_CORPSE, c);
    startTimer(6, TIMER_OBJECT, BURN_OBJECT, d);
    game.moves = 15;
    const calls = [];
    const run = (arg, timeout) => { calls.push([arg, timeout, arg.timed]); };
    await runTimers({ [BURN_OBJECT]: { run }, [HATCH_EGG]: { run }, [ROT_CORPSE]: { run } });
    assert.deepEqual(calls, [[b, 12, 0], [c, 15, 0], [a, 15, 0]]);
    assert.equal(peekTimer(BURN_OBJECT, d), 16);
    assert.equal(d.timed, 1);
});

test('C timer callback can cancel the next event and insert an event due now', async () => {
    resetGame();
    game.moves = 20;
    const a = {}, b = {}, c = {};
    startTimer(0, TIMER_OBJECT, ROT_CORPSE, b);
    startTimer(0, TIMER_OBJECT, HATCH_EGG, a);
    const calls = [];
    await runTimers({
        [HATCH_EGG]: { run(arg) {
            calls.push(arg);
            assert.equal(arg.timed, 0);
            stopTimer(ROT_CORPSE, b);
            startTimer(0, TIMER_OBJECT, BURN_OBJECT, c);
        } },
        [ROT_CORPSE]: { run() { assert.fail('Canceled timer fired'); } },
        [BURN_OBJECT]: { async run(arg) { await Promise.resolve(); calls.push(arg); } },
    });
    assert.deepEqual(calls, [a, c]);
    assert.equal(b.timed, 0);
    assert.deepEqual(game.timers, []);
});

test('C duplicate identity is kind plus callback plus argument, independent of deadline', () => {
    resetGame();
    const obj = {};
    assert.equal(startTimer(5, TIMER_OBJECT, BURN_OBJECT, obj), true);
    assert.equal(startTimer(7, TIMER_OBJECT, BURN_OBJECT, obj), false);
    assert.equal(startTimer(5, TIMER_OBJECT, HATCH_EGG, obj), true);
    assert.equal(startTimer(5, TIMER_OBJECT, BURN_OBJECT, {}), true);
    assert.equal(obj.timed, 2);
    assert.equal(game.timerId, 4);
});

for (const moves of [12, 15, 18]) {
    test(`stopping at turn ${moves} returns signed remaining time and cleans up after unlinking`, () => {
        resetGame();
        game.moves = 10;
        const obj = {};
        startTimer(5, TIMER_OBJECT, BURN_OBJECT, obj);
        game.moves = moves;
        let called = false;
        const remaining = stopTimer(BURN_OBJECT, obj, { [BURN_OBJECT]: { cleanup(arg, deadline) {
            called = true;
            assert.equal(arg, obj);
            assert.equal(arg.timed, 0);
            assert.equal(deadline, 15);
            assert.equal(peekTimer(BURN_OBJECT, obj), 0);
        } } });
        assert.equal(called, true);
        assert.equal(remaining, 15 - moves);
        assert.equal(stopTimer(BURN_OBJECT, obj), 0);
    });
}

test('natural expiry never invokes the stop cleanup callback', async () => {
    resetGame();
    startTimer(0, TIMER_OBJECT, BURN_OBJECT, {});
    await runTimers({ [BURN_OBJECT]: { run() {}, cleanup() { assert.fail('Cleanup on expiry'); } } });
});

test('moving timers transfers every reference and count without changing deadlines or order', () => {
    resetGame();
    const src = {}, dest = {};
    startTimer(3, TIMER_OBJECT, HATCH_EGG, src);
    startTimer(2, TIMER_OBJECT, BURN_OBJECT, src);
    startTimer(4, TIMER_OBJECT, ROT_CORPSE, dest);
    const ids = game.timers.map(timer => timer.tid);
    moveObjectTimers(src, dest);
    assert.equal(src.timed, 0);
    assert.equal(dest.timed, 3);
    assert.ok(game.timers.every(timer => timer.arg === dest));
    assert.deepEqual(game.timers.map(timer => timer.tid), ids);
    assert.throws(() => moveObjectTimers({ timed: 1 }, {}), /count mismatch/);
});

test('split timers retain absolute deadlines and use C insertion precedence', () => {
    resetGame();
    const src = {}, dest = {};
    startTimer(8, TIMER_OBJECT, HATCH_EGG, src);
    startTimer(8, TIMER_OBJECT, BURN_OBJECT, src);
    game.moves = 3;
    splitObjectTimers(src, dest);
    assert.equal(src.timed, 2);
    assert.equal(dest.timed, 2);
    assert.deepEqual(game.timers.map(timer => [timer.arg === dest, timer.func, timer.timeout]),
        [[true, HATCH_EGG, 8], [true, BURN_OBJECT, 8], [false, BURN_OBJECT, 8], [false, HATCH_EGG, 8]]);
});

test('stopping all object timers cleans each family and leaves other owners intact', () => {
    resetGame();
    const src = {}, other = {};
    startTimer(8, TIMER_OBJECT, HATCH_EGG, src);
    startTimer(9, TIMER_OBJECT, BURN_OBJECT, src);
    startTimer(1, TIMER_OBJECT, BURN_OBJECT, other);
    const cleanup = [];
    stopObjectTimers(src, { [BURN_OBJECT]: { cleanup: (arg, time) => cleanup.push([arg, time]) } });
    assert.deepEqual(cleanup, [[src, 9]]);
    assert.equal(src.timed, 0);
    assert.equal(other.timed, 1);
    assert.equal(game.timers.length, 1);
});

test('level spot timers use packed coordinates and remove only the requested spot', () => {
    resetGame();
    game.level = {};
    game.moves = 5;
    startTimer(10, TIMER_LEVEL, MELT_ICE_AWAY, (8 << 16) | 3);
    startTimer(2, TIMER_LEVEL, MELT_ICE_AWAY, (8 << 16) | 4);
    assert.equal(spotTimerExpires(8, 3, MELT_ICE_AWAY), 15);
    stopSpotTimers(8, 3, MELT_ICE_AWAY);
    assert.equal(spotTimerExpires(8, 3, MELT_ICE_AWAY), 0);
    assert.equal(spotTimerExpires(8, 4, MELT_ICE_AWAY), 7);
});

test('inactive local timers keep their original expiry for arrival catch-up', async () => {
    resetGame();
    const local = {}, carried = {};
    startTimer(1, TIMER_OBJECT, BURN_OBJECT, local);
    startTimer(2, TIMER_OBJECT, BURN_OBJECT, carried);
    game.moves = 20;
    const calls = [];
    const handlers = { [BURN_OBJECT]: { run: (arg, time) => calls.push([arg, time]) } };
    await runTimers(handlers, game, timer => timer.arg === carried);
    assert.deepEqual(calls, [[carried, 2]]);
    assert.equal(local.timed, 1);
    await runTimers(handlers);
    assert.deepEqual(calls, [[carried, 2], [local, 1]]);
});

test('the same ice coordinates on different levels keep independent timers', () => {
    resetGame();
    const first = {}, second = {};
    game.level = first;
    const spot = (8 << 16) | 3;
    startTimer(1, TIMER_LEVEL, MELT_ICE_AWAY, spot);
    game.level = second;
    assert.equal(startTimer(2, TIMER_LEVEL, MELT_ICE_AWAY, spot), true);
    assert.equal(spotTimerExpires(8, 3, MELT_ICE_AWAY), 2);
    stopSpotTimers(8, 3, MELT_ICE_AWAY);
    game.level = first;
    assert.equal(spotTimerExpires(8, 3, MELT_ICE_AWAY), 1);
});

test('save graph relinks timer arguments and level ownership without serializing callbacks', async () => {
    resetGame();
    game.level = {};
    game.inventory = [{}];
    startTimer(1, TIMER_OBJECT, BURN_OBJECT, game.inventory[0]);
    startTimer(2, TIMER_LEVEL, MELT_ICE_AWAY, (2 << 16) | 3);
    restoreSaveState(encodeSaveState());
    assert.equal(game.timers[0].arg, game.inventory[0]);
    assert.equal(game.timers[1].level, game.level);
    game.moves = 1;
    await runTimers({ [BURN_OBJECT]: { run(obj) { obj.expired = true; } } });
    assert.equal(game.inventory[0].expired, true);
    assert.equal(game.inventory[0].timed, 0);
});

test('global timers do not mutate an object timer count', async () => {
    resetGame();
    const arg = {};
    startTimer(0, TIMER_GLOBAL, HATCH_EGG, arg);
    await runTimers({ [HATCH_EGG]: { run() {} } });
    assert.equal(arg.timed, undefined);
});
