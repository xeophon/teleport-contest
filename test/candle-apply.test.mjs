import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STAIRS } from '../js/const.js';
import { initRng, enableRngLog, getRngLog, rn2 } from '../js/rng.js';
import { add_to_minv } from '../js/mklev.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { rhack, processObjectBurnTimers } from '../js/cmd.js';
import { beginBurn } from '../js/burn.js';
import { BURN_OBJECT, peekTimer } from '../js/timeout.js';
import { vision_reset, vision_recalc } from '../js/vision.js';

function setup(candles = {}, holder = null) {
    resetGame();
    initRng(19);
    game.moves = 100;
    game.context = {};
    game.flags = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 30, uhpmax: 30, uhunger: 900, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const candle = { kind: 'tallow candle', otyp: 370, cls: 'tool', letter: 'a', age: 200, quan: 1, ...candles };
    const candelabrum = holder && { kind: 'candelabrum of invocation', otyp: 10076, cls: 'tool',
        letter: 'b', age: 0, spe: 0, quan: 1, owt: 200, ...holder };
    game.inventory = candelabrum ? [candle, candelabrum] : [candle];
    vision_reset();
    vision_recalc();
    enableRngLog({ reset: true });
    return { candle, candelabrum };
}

async function apply(letter = 'a') {
    game.context.move = 0;
    game._command_mode = 'applyObject';
    await rhack(letter);
}

test('applying candles lights and snuffs their actual remaining fuel', async () => {
    const { candle } = setup({ quan: 3 });
    await apply();
    assert.equal(candle.lamplit, true);
    assert.equal(peekTimer(BURN_OBJECT, candle), 225);
    assert.match(game._pending_message, /flames burn brightly!/);
    game.moves += 4;
    await apply();
    assert.equal(candle.age, 196);
    assert.equal(candle.lamplit, false);
    assert.match(game._pending_message, /You snuff out your/);
    assert.deepEqual(getRngLog(), []);
});

for (const [condition, expected] of [['underwater', /fire and water don't mix/], ['uswallow', /elbow/]]) {
    test(`candles respect ${condition}`, async () => {
        const { candle } = setup();
        game.u[condition] = true;
        await apply();
        assert.equal(!!candle.lamplit, false);
        assert.equal(peekTimer(BURN_OBJECT, candle), 0);
        assert.match(game._pending_message, expected);
        assert.equal(game.context.move, 1);
    });
}

for (const [spe, expectedFuel] of [[1, 1], [7, 101]]) {
    test(`applying a ${spe}-candle candelabrum away from invocation rounds fuel upward`, async () => {
        const age = spe === 1 ? 1 : 201;
        const { candelabrum } = setup({}, { spe, age });
        await apply('b');
        assert.equal(candelabrum.lamplit, true);
        assert.equal(candelabrum.age + peekTimer(BURN_OBJECT, candelabrum) - game.moves, expectedFuel);
        assert.match(game._pending_message, /rapidly consumed/);
    });
}

for (const stairs of [false, true]) {
    test(`invocation coordinate ${stairs ? 'with stairs consumes' : 'preserves'} fuel`, async () => {
        const { candelabrum } = setup({}, { spe: 7, age: 200 });
        game.level.invocationPosition = { x: 10, y: 10 };
        if (stairs) game.level.at(10, 10).typ = STAIRS;
        await apply('b');
        assert.equal(candelabrum.lamplit, true);
        assert.equal(candelabrum.age + peekTimer(BURN_OBJECT, candelabrum) - game.moves, stairs ? 100 : 200);
        assert.equal(!!candelabrum.known, !stairs);
        if (!stairs) assert.match(game._pending_message, /strange light/);
    });
}

for (const flags of [{ cursed: true }, { underwater: true }, { uswallow: true }]) {
    test(`candelabrum refuses ignition with ${Object.keys(flags)[0]}`, async () => {
        const { candelabrum } = setup({}, { spe: 7, age: 200, cursed: flags.cursed });
        Object.assign(game.u, flags);
        await apply('b');
        assert.equal(!!candelabrum.lamplit, false);
        assert.equal(peekTimer(BURN_OBJECT, candelabrum), 0);
        assert.deepEqual(getRngLog(), []);
    });
}

test('empty candelabrum gives the C candle attachment hint', async () => {
    setup({}, {});
    await apply('b');
    assert.match(game._pending_message, /has no candles/);
    assert.match(game._pending_message, /To attach candles, apply them instead/);
});

test('attaching part of a lit candle stack preserves only the unconsumed split timer', async () => {
    const { candle, candelabrum } = setup({ quan: 5, age: 100 }, { spe: 5, age: 200 });
    beginBurn(candle);
    game.moves = 110;
    await apply();
    assert.equal(game._command_mode, 'attachCandles');
    await rhack('y');
    assert.equal(candle.quan, 3);
    assert.equal(candle.lamplit, true);
    assert.equal(peekTimer(BURN_OBJECT, candle), 125);
    assert.equal(candelabrum.spe, 7);
    assert.equal(candelabrum.age, 90);
    assert.equal(candelabrum.owt, 214);
    assert.equal(game.inventory.length, 2);
    assert.equal(game.timers.length, 1);
    assert.match(game._pending_message, /seven candles attached/);
});

test('declining attachment lights the candles without changing the candelabrum', async () => {
    const { candle, candelabrum } = setup({}, { spe: 2, age: 200 });
    await apply();
    await rhack('n');
    assert.equal(candle.lamplit, true);
    assert.equal(candelabrum.spe, 2);
    assert.equal(candelabrum.age, 200);
});

test('adding unlit candles to a burning candelabrum leaves its original scheduled deadline', async () => {
    const { candle, candelabrum } = setup({ age: 20 }, { spe: 6, age: 100 });
    beginBurn(candelabrum);
    await apply();
    await rhack('y');
    assert.equal(candelabrum.spe, 7);
    assert.equal(candelabrum.age, 20);
    assert.equal(peekTimer(BURN_OBJECT, candelabrum), 125);
    assert.equal(game.inventory.includes(candle), false);
    assert.match(game._pending_message, /magically ignites/);
    game.moves = 125;
    await processObjectBurnTimers();
    assert.equal(peekTimer(BURN_OBJECT, candelabrum), 130);
});

for (let seed = 1; seed <= 8; seed++) {
    test(`cursed candles use exactly the single ignition roll for seed ${seed}`, async () => {
        const { candle } = setup({ cursed: true, quan: 2 });
        initRng(seed);
        const succeeds = !!rn2(2);
        initRng(seed);
        enableRngLog({ reset: true });
        await apply();
        assert.equal(!!candle.lamplit, succeeds);
        assert.equal(getRngLog().length, 1);
        assert.match(getRngLog()[0], /rn2\(2\)/);
        assert.match(game._pending_message, succeeds ? /flames burn brightly/ : /flicker for a moment, then die/);
    });
}

test('blind heroes feel candle ignition and invocation-square warmth', async () => {
    setup({}, { spe: 7, age: 200 });
    game.u.blind = true;
    game.level.invocationPosition = { x: 10, y: 10 };
    await apply();
    assert.match(game._pending_message, /flame burns\.$/);
    await apply('b');
    assert.match(game._pending_message, /strange warmth/);
    assert.doesNotMatch(game._pending_message, /brightly|strange light/);
});

test('the lit last candle clears its worn state when consumed', async () => {
    const { candle } = setup({ age: 1, wielded: true, owornmask: 256 });
    await apply();
    game.moves++;
    await processObjectBurnTimers();
    assert.equal(game.inventory.includes(candle), false);
    assert.equal(candle.wielded, false);
    assert.equal(candle.owornmask, 0);
    assert.equal(game.timers.length, 0);
});

test('attachment prompt object references survive a save round trip', async () => {
    setup({ quan: 7 }, {});
    await apply();
    restoreSaveState(encodeSaveState());
    await rhack('y');
    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0].spe, 7);
    assert.equal(game.inventory[0].age, 200);
    assert.equal(game._command_mode, null);
});

test('merging lit candles into a monster inventory keeps the destination timer only', () => {
    const { candle } = setup({ age: 100, quan: 2 });
    const other = { ...candle, age: 101, quan: 3 };
    const mon = { mx: 11, my: 10, minvent: [candle] };
    game.inventory = [];
    game.level.monsters = [mon];
    beginBurn(candle);
    beginBurn(other);
    assert.equal(add_to_minv(mon, other), candle);
    assert.equal(candle.quan, 5);
    assert.equal(candle.age, 75);
    assert.equal(peekTimer(BURN_OBJECT, candle), 125);
    assert.equal(peekTimer(BURN_OBJECT, other), 0);
    assert.equal(other.timed, 0);
    assert.equal(game.timers.length, 1);
});

for (const lit of [false, true]) {
    test(`picking up ${lit ? 'lit' : 'unlit'} candles follows C merge fuel and timer rules`, async () => {
        const { candle } = setup({ age: 200, quan: 1 });
        const other = { ...candle, letter: undefined, age: 210, quan: 2, ox: 10, oy: 10 };
        game.level.objects = [other];
        if (lit) { beginBurn(candle); beginBurn(other); }
        await rhack(',');
        assert.equal(game.inventory.length, 1);
        assert.equal(candle.quan, 3);
        assert.equal(candle.age, lit ? 75 : 206);
        assert.equal(peekTimer(BURN_OBJECT, other), 0);
        assert.equal(game.timers?.length || 0, lit ? 1 : 0);
    });
}

test('burning potions never merge when picked up', async () => {
    const { candle: oil } = setup({ otyp: 252, kind: 'potion of oil', cls: 'potion', age: 20 });
    const other = { ...oil, letter: undefined, ox: 10, oy: 10 };
    game.level.objects = [other];
    beginBurn(oil);
    beginBurn(other);
    await rhack(',');
    assert.equal(game.inventory.length, 2);
    assert.equal(game.timers.length, 2);
});
