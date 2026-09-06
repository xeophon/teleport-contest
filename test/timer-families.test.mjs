import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, ICE, POOL, ICED_POOL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DB_ICE, DB_MOAT, DB_UNDER } from '../js/const.js';
import { MONS, PM_GOBLIN } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { beginBurn } from '../js/burn.js';
import { BURN_OBJECT, MELT_ICE_AWAY, spotTimerExpires, peekTimer } from '../js/timeout.js';
import { scheduleMeltIceTimeout, stopMeltIceTimersAt, spotMeltIceTimeLeft, applyColdRayTerrain, meltIceAt } from '../js/ice.js';
import { processGameTimers } from '../js/allmain.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { __mklevTestHooks } from '../js/mklev.js';
import { vision_reset, vision_recalc } from '../js/vision.js';

function setup() {
    resetGame(); initRng(1);
    game.moves = 100;
    game.flags = {}; game.context = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 1, uexp: 0,
        uhp: 10, uhpmax: 10, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    Object.assign(game.level.at(14, 10), { typ: ICE, flags: ICED_POOL });
    const lamp = { otyp: 227, kind: 'oil lamp', age: 1, quan: 1, letter: 'a', cls: 'tool' };
    game.inventory = [lamp];
    vision_reset(); vision_recalc();
    enableRngLog({ reset: true });
    return lamp;
}

for (const iceFirst of [true, false]) {
    test(`equal burn and ice deadlines run the ${iceFirst ? 'burn' : 'ice'} callback first`, async () => {
        const lamp = setup();
        if (iceFirst) scheduleMeltIceTimeout(14, 10, 1);
        beginBurn(lamp);
        if (!iceFirst) scheduleMeltIceTimeout(14, 10, 1);
        game.moves++;
        const expected = ['Your lamp has gone out.', 'Some ice melts away.'];
        assert.deepEqual(await processGameTimers(), iceFirst ? expected : expected.reverse());
        assert.equal(game.level.at(14, 10).typ, POOL);
        assert.equal(lamp.lamplit, false);
        assert.equal(game.timers.length, 0);
        assert.deepEqual(getRngLog(), []);
    });
}

test('an earlier ice deadline precedes a later burn callback during catch-up', async () => {
    const lamp = setup(); lamp.age = 3;
    beginBurn(lamp);
    scheduleMeltIceTimeout(14, 10, 1);
    game.moves += 3;
    assert.deepEqual(await processGameTimers(), ['Some ice melts away.', 'Your lamp has gone out.']);
});

test('removing ice cancels its queued callback and its deadline metadata', async () => {
    setup();
    scheduleMeltIceTimeout(14, 10, 2);
    meltIceAt(14, 10);
    assert.equal(spotTimerExpires(14, 10, MELT_ICE_AWAY), 0);
    assert.deepEqual(game.level.meltIceTimers, []);
    assert.equal(game.level.at(14, 10).meltIceTurn, undefined);
    game.moves += 2;
    assert.deepEqual(await processGameTimers(), []);
});

for (const typ of [DRAWBRIDGE_UP, DRAWBRIDGE_DOWN]) {
    test(`ice expiry melts the frozen moat under drawbridge terrain ${typ}`, async () => {
        setup();
        const loc = game.level.at(14, 10);
        Object.assign(loc, { typ, flags: DB_ICE });
        scheduleMeltIceTimeout(14, 10, 1);
        game.moves++;
        await processGameTimers();
        assert.equal(loc.typ, typ);
        assert.equal(loc.flags & DB_UNDER, DB_MOAT);
        assert.equal(game.timers.length, 0);
    });
}

test('same-coordinate timers on saved and active levels keep separate ownership', async () => {
    setup();
    scheduleMeltIceTimeout(14, 10, 1);
    const previous = game.level;
    game._saved_levels = new Map([['old', { level: previous }]]);
    game.level = new GameMap();
    Object.assign(game.level.at(14, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(14, 10, 2);
    game.moves += 2;
    await processGameTimers();
    assert.equal(game.level.at(14, 10).typ, POOL);
    assert.equal(previous.at(14, 10).typ, ICE);
    assert.equal(game.timers.length, 1);
    game.level = previous;
    await processGameTimers();
    assert.equal(previous.at(14, 10).typ, POOL);
    assert.equal(game.timers.length, 0);
});

test('saved graphs retain timer ordering, object identity and level identity', async () => {
    const lamp = setup();
    scheduleMeltIceTimeout(14, 10, 1); beginBurn(lamp);
    restoreSaveState(encodeSaveState());
    assert.equal(game.timers[0].arg, game.inventory[0]);
    assert.equal(game.timers[1].level, game.level);
    game.moves++;
    assert.deepEqual(await processGameTimers(), ['Your lamp has gone out.', 'Some ice melts away.']);
});

test('re-freezing ice restarts its queued deadline with the C minimum roll', () => {
    setup(); scheduleMeltIceTimeout(14, 10, 51);
    applyColdRayTerrain(14, 10);
    assert.match(getRngLog()[0], /^rn2\(1998\)/);
    assert.ok(spotTimerExpires(14, 10, MELT_ICE_AWAY) > 151);
    assert.equal(game.timers.length, 1);
    assert.equal(game.level.meltIceTimers.length, 1);
});

test('spot time left preserves signed C remaining time and duplicate starts are rejected', () => {
    setup(); scheduleMeltIceTimeout(14, 10, 1);
    assert.equal(scheduleMeltIceTimeout(14, 10, 9), 0);
    assert.equal(spotTimerExpires(14, 10, MELT_ICE_AWAY), 101);
    game.moves = 103;
    assert.equal(spotMeltIceTimeLeft(14, 10), -2);
    stopMeltIceTimersAt(14, 10);
    assert.equal(spotMeltIceTimeLeft(14, 10), 0);
});

test('natural ice melting drowns its monster without awarding hero kill experience', async () => {
    setup();
    const mon = { data: MONS[PM_GOBLIN], mx: 14, my: 10, mhp: 5, mhpmax: 5, m_lev: 1, m_id: 1, minvent: [] };
    game.level.monsters = [mon];
    scheduleMeltIceTimeout(14, 10, 1);
    game.moves++;
    assert.match((await processGameTimers()).join(' '), /goblin drowns/);
    assert.equal(game.level.monsters.includes(mon), false);
    assert.equal(game.u.uexp, 0);
    assert.equal(game._monster_moving, undefined);
});

for (const seed of [1, 2, 3, 4]) {
    test(`level flips carry queued melt coordinates and deadlines for seed ${seed}`, async () => {
        setup(); scheduleMeltIceTimeout(14, 10, 1);
        initRng(seed);
        const { flipX, flipY } = __mklevTestHooks.flipSpecialLevelRnd(1, 0, 78, 20, true);
        const x = flipX ? 79 - 14 : 14;
        const y = flipY ? 20 - 10 : 10;
        assert.equal(spotTimerExpires(x, y, MELT_ICE_AWAY), 101);
        assert.equal(game.level.meltIceTimers[0].x, x);
        assert.equal(game.level.meltIceTimers[0].y, y);
        assert.equal(game.level.at(x, y).typ, ICE);
        game.moves++;
        await processGameTimers();
        assert.equal(game.level.at(x, y).typ, POOL);
        assert.equal(peekTimer(BURN_OBJECT, game.inventory[0]), 0);
    });
}
