import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, ICE, ICED_POOL, W_WEP } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROT_CORPSE, REVIVE_MON, ROT_ORGANIC, ZOMBIFY_MON, SHRINK_GLOB,
    TIMER_OBJECT, startTimer, peekTimer } from '../js/timeout.js';
import { processGameTimers } from '../js/allmain.js';
import { beginBurn } from '../js/burn.js';
import { scheduleCorpseTimeout, startGlobShrinkTimeout, objectIceEffect } from '../js/ice.js';
import { monsterByRndName } from '../js/mklev.js';
import { vision_reset, vision_recalc } from '../js/vision.js';

function setup() {
    resetGame(); initRng(1);
    game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 1 };
    game.inventory = []; game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); vision_recalc(); enableRngLog({ reset: true });
    return { id: 1, otyp: 471, kind: 'newt corpse', corpsenm: monsterByRndName('newt'),
        quan: 1, age: 100, owt: 10, ox: 12, oy: 10, cls: 'food', letter: 'c' };
}

for (const source of ['floor', 'contained', 'migrating']) {
    test(`${source} corpse rots silently through the shared queue`, async () => {
        const corpse = setup();
        const list = [corpse];
        if (source === 'floor') game.level.objects = list;
        if (source === 'contained') game.inventory = [{ kind: 'sack', contents: list }];
        if (source === 'migrating') game.migrating_objs = list;
        scheduleCorpseTimeout(corpse, ROT_CORPSE, 1);
        game.moves++;
        assert.deepEqual(await processGameTimers(), []);
        assert.equal(corpse.timed, 0);
        if (source === 'floor') assert.equal(game.level.objects.includes(corpse), false);
        if (source === 'contained') assert.equal(game.inventory[0].contents.includes(corpse), false);
        if (source === 'migrating') assert.equal(game.migrating_objs.includes(corpse), false);
    });
}

test('a wielded corpse rots with C punctuation and clears its equipment state', async () => {
    const corpse = setup();
    corpse.wielded = true; corpse.owornmask = W_WEP;
    game.u.uwep = corpse;
    game.inventory = [corpse];
    scheduleCorpseTimeout(corpse, ROT_CORPSE, 1);
    game.moves++;
    assert.deepEqual(await processGameTimers(), ['Your wielded newt corpse rots away!']);
    assert.equal(corpse.wielded, false);
    assert.equal(corpse.owornmask, 0);
    assert.equal(game.u.uwep, null);
    assert.equal(game.inventory.length, 0);
});

for (const corpseFirst of [true, false]) {
    test(`equal corpse and burn deadlines execute newest first: corpse scheduled ${corpseFirst ? 'first' : 'last'}`, async () => {
        const corpse = setup();
        const lamp = { otyp: 227, kind: 'oil lamp', age: 1, quan: 1 };
        game.inventory = [corpse, lamp];
        if (corpseFirst) scheduleCorpseTimeout(corpse, ROT_CORPSE, 1);
        beginBurn(lamp);
        if (!corpseFirst) scheduleCorpseTimeout(corpse, ROT_CORPSE, 1);
        game.moves++;
        const expected = ['Your lamp has gone out.', 'Your newt corpse rots away.'];
        assert.deepEqual(await processGameTimers(), corpseFirst ? expected : expected.reverse());
    });
}

test('organic rot frees its container and starts timers on newly buried contents', async () => {
    setup();
    const scroll = { otyp: 8, cls: 'scroll', kind: 'scroll of identify', material: 'paper' };
    const box = { kind: 'large box', contents: [scroll], ox: 12, oy: 10, buried: true };
    game.level.buriedobjlist = [box];
    startTimer(1, TIMER_OBJECT, ROT_ORGANIC, box);
    game.moves++;
    await processGameTimers();
    assert.equal(game.level.buriedobjlist.includes(box), false);
    assert.equal(game.level.buriedobjlist.includes(scroll), true);
    assert.equal(scroll.ox, 12);
    assert.equal(scroll.oy, 10);
    assert.ok(peekTimer(ROT_ORGANIC, scroll) > 351);
});

for (const source of ['migrating', 'buried']) {
    test(`${source} globs shrink and disappear through the shared queue`, async () => {
        setup();
        const glob = { globby: true, otyp: 10180, kind: 'glob of gray ooze', owt: 1, ox: 12, oy: 10 };
        if (source === 'migrating') game.migrating_objs = [glob];
        else game.level.buriedobjlist = [glob];
        startGlobShrinkTimeout(glob, 1);
        game.moves++;
        assert.deepEqual(await processGameTimers(), []);
        assert.equal(glob.owt, 0);
        assert.equal(glob.timed, 0);
        assert.equal((source === 'migrating' ? game.migrating_objs : game.level.buriedobjlist).includes(glob), false);
    });
}

test('a glob buried under ice keeps its active timer but does not shrink', async () => {
    setup();
    Object.assign(game.level.at(12, 10), { typ: ICE, flags: ICED_POOL });
    const glob = { globby: true, otyp: 10180, owt: 1, ox: 12, oy: 10 };
    game.level.buriedobjlist = [glob];
    startGlobShrinkTimeout(glob, 1);
    game.moves++;
    await processGameTimers();
    assert.equal(glob.owt, 1);
    assert.ok(peekTimer(SHRINK_GLOB, glob) > 101);
    assert.deepEqual(getRngLog().map(s => s.split('=')[0]), ['rn2(5)']);
});

test('a migrating revival fails and schedules rot instead of appearing beside the hero', async () => {
    const corpse = setup();
    corpse.corpsenm = monsterByRndName('troll');
    game.migrating_objs = [corpse];
    scheduleCorpseTimeout(corpse, REVIVE_MON, 1);
    game.moves++;
    assert.deepEqual(await processGameTimers(), ['You feel less hassled.']);
    assert.equal(game.level.monsters.length, 0);
    assert.ok(peekTimer(ROT_CORPSE, corpse) > 101);
});

test('repeated C ice checks restart and double an existing corpse timer', () => {
    const corpse = setup();
    game.level.objects = [corpse];
    Object.assign(game.level.at(12, 10), { typ: ICE, flags: ICED_POOL });
    scheduleCorpseTimeout(corpse, ROT_CORPSE, 10);
    objectIceEffect(corpse);
    assert.equal(peekTimer(ROT_CORPSE, corpse), 120);
    objectIceEffect(corpse);
    assert.equal(peekTimer(ROT_CORPSE, corpse), 140);
    assert.equal(corpse.timed, 1);
});
