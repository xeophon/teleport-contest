import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, POOL, PIT, BEAR_TRAP, LAVAPOOL, DRAWBRIDGE_UP, DB_MOAT, DB_LAVA, DB_ICE,
    COULD_SEE, PLNMSG_HIDE_UNDER } from '../js/const.js';
import { MONS, PM_GARTER_SNAKE, PM_GIANT_EEL, PM_COCKATRICE, PM_CHICKATRICE, MR_STONE } from '../js/permonst.js';
import { hideUnder, maybeUnhideAt, canHideUnderObject } from '../js/monster_hiding.js';
import { beginBurn } from '../js/burn.js';
import { processObjectBurnTimers } from '../js/cmd.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function setup({ species = PM_GARTER_SNAKE, kind = 'tallow candle', terrain = ROOM,
    other = [], trapped = false, trap = null, hero = false } = {}) {
    resetGame();
    initRng(13);
    game.moves = 100;
    game.flags = {};
    game.context = {};
    game.u = { ux: hero ? 10 : 5, uy: hero ? 10 : 5, uz: { dnum: 0, dlevel: 1 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.level.at(10, 10).typ = terrain;
    const obj = { kind, age: 1, quan: 1, ox: 10, oy: 10 };
    const mon = { data: MONS[species], mx: 10, my: 10, mhp: 4, mundetected: true,
        mtrapped: trapped, mcansee: true };
    game.level.objects = [obj, ...other.map(item => ({ ...item, ox: 10, oy: 10 }))];
    if (hero) Object.assign(game.u, { umonnum: species, _polyself_form: MONS[species], uundetected: 1 });
    else game.level.monsters = [mon];
    if (trap) game.level.traps = [{ tx: 10, ty: 10, ttyp: trap }];
    vision_reset();
    vision_recalc();
    beginBurn(obj);
    enableRngLog({ reset: true });
    return { obj, mon };
}

// C timeout.c:1416,1652: consuming a floor candle rechecks what hid beneath it.
for (const late of [false, true]) {
    test(`${late ? 'late' : 'on-time'} final floor candle exhaustion reveals its snake`, async () => {
        const { mon } = setup();
        game.moves += late ? 3 : 1;
        await processObjectBurnTimers();
        assert.equal(game.level.objects.length, 0);
        assert.equal(!!mon.mundetected, false);
        assert.deepEqual(getRngLog(), []);
    });
}

test('late floor oil exhaustion also rechecks hidden monsters', async () => {
    const { mon } = setup({ kind: 'potion of oil' });
    game.moves += 3;
    await processObjectBurnTimers();
    assert.equal(!!mon.mundetected, false);
});

test('on-time oil exhaustion preserves the source omission of a hiding recheck', async () => {
    const { mon } = setup({ kind: 'potion of oil' });
    game.moves++;
    await processObjectBurnTimers();
    assert.equal(game.level.objects.length, 0);
    assert.equal(!!mon.mundetected, true);
});

test('a hero polymorphed into a hiding species is exposed when its candle disappears', async () => {
    setup({ hero: true });
    game.moves++;
    await processObjectBurnTimers();
    assert.equal(game.u.uundetected, 0);
});

test('late candle cleanup rechecks only a floor monster, as in the source catch-up branch', async () => {
    setup({ hero: true });
    game.moves += 3;
    await processObjectBurnTimers();
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uundetected, 1);
});

for (const [name, options, expected] of [
    ['another covering object', { other: [{ kind: 'rock' }] }, true],
    ['nine remaining coins', { other: [{ cls: 'coin', quan: 9 }] }, false],
    ['ten remaining coins', { other: [{ cls: 'coin', quan: 10 }] }, true],
    ['split coin stacks totalling ten', { other: [{ cls: 'coin', quan: 4 }, { cls: 'coin', quan: 6 }] }, true],
    ['few coins followed by another object', { other: [{ cls: 'coin', quan: 1 }, { kind: 'rock' }] }, true],
    ['non-pit trap beneath an object', { other: [{ kind: 'rock' }], trap: BEAR_TRAP }, false],
    ['an untrapped pit beneath an object', { other: [{ kind: 'rock' }], trap: PIT }, true],
    ['a trapped monster beneath an object', { other: [{ kind: 'rock' }], trapped: true }, false],
    ['an eel out of water', { species: PM_GIANT_EEL }, false],
    ['an eel in a pool', { species: PM_GIANT_EEL, terrain: POOL }, true],
]) {
    test(`burn cleanup respects ${name}`, async () => {
        const { mon } = setup(options);
        game.moves++;
        await processObjectBurnTimers();
        assert.equal(!!mon.mundetected, expected);
    });
}

// C mon.c:4730-4816: these directly exercise the shared state computation
// called after floor cleanup, including branches which do not emit messages.
for (const [name, configure, expected] of [
    ['an ordinary covering object', () => {}, true],
    ['a cursed pile for a pet', mon => { mon.mtame = 10; game.level.objects[0].cursed = true; }, false],
    ['a cursed pile for a wild monster', () => { game.level.objects[0].cursed = true; }, true],
    ['holding the hero', mon => { game.u.ustuck = mon; }, false],
    ['an active trap', () => { game.level.traps = [{ tx: 10, ty: 10, ttyp: BEAR_TRAP }]; }, false],
    ['an untrapped pit', () => { game.level.traps = [{ tx: 10, ty: 10, ttyp: PIT }]; }, true],
    ['water over a covering object', () => { game.level.at(10, 10).typ = POOL; }, false],
    ['lava over a covering object', () => { game.level.at(10, 10).typ = LAVAPOOL; }, false],
    ['a lone cockatrice corpse', () => { Object.assign(game.level.objects[0], { otyp: 471, corpsenm: PM_COCKATRICE }); }, false],
    ['multiple petrifying corpses', () => {
        Object.assign(game.level.objects[0], { otyp: 471, corpsenm: PM_COCKATRICE });
        game.level.objects.push({ otyp: 471, corpsenm: PM_CHICKATRICE, ox: 10, oy: 10 });
    }, false],
    ['stone resistance under a cockatrice corpse', mon => {
        mon.mintrinsics = MR_STONE;
        Object.assign(game.level.objects[0], { otyp: 471, corpsenm: PM_COCKATRICE });
    }, true],
    ['a safe object in a petrifying pile', () => {
        game.level.objects.push({ otyp: 471, corpsenm: PM_COCKATRICE, ox: 10, oy: 10 });
    }, true],
]) {
    test(`hideunder respects ${name}`, () => {
        const { mon } = setup();
        configure(mon);
        assert.equal(hideUnder(mon), expected);
        assert.equal(!!mon.mundetected, expected);
        assert.deepEqual(getRngLog(), []);
    });
}

for (const [name, configure, expected] of [
    ['an ordinary pool', () => {}, true],
    ['the Plane of Water', () => { game.water_level = { ...game.u.uz }; }, false],
    ['a submerged hero with clear vision', () => { game.u.uinwater = true; }, false],
    ['the runtime underwater state', () => { game.u.uunderwater = true; }, false],
    ['a submerged hero behind an obstacle', () => {
        game.u.uinwater = true;
        game.viz_array[10][10] &= ~COULD_SEE;
    }, true],
    ['a raised drawbridge over water', () => { Object.assign(game.level.at(10, 10), { typ: DRAWBRIDGE_UP, flags: DB_MOAT }); }, true],
    ['a raised drawbridge over lava', () => { Object.assign(game.level.at(10, 10), { typ: DRAWBRIDGE_UP, flags: DB_LAVA }); }, false],
    ['a raised drawbridge over ice', () => { Object.assign(game.level.at(10, 10), { typ: DRAWBRIDGE_UP, flags: DB_ICE }); }, false],
]) {
    test(`eel hiding respects ${name}`, () => {
        const { mon } = setup({ species: PM_GIANT_EEL, terrain: POOL });
        configure(mon);
        assert.equal(hideUnder(mon), expected);
    });
}

test('shared hideunder emits source feedback only when the monster was visible', () => {
    const { mon } = setup();
    mon.mundetected = 0;
    mon.m_id = 42;
    const messages = [];
    hideUnder(mon, { messages });
    assert.deepEqual(messages, ['You see the garter snake slither under a tallow candle.']);
    assert.equal(game.last_hider, 42);
    assert.equal(game.iflags.last_msg, PLNMSG_HIDE_UNDER);
    hideUnder(mon, { messages });
    assert.equal(messages.length, 1);
});

test('maybe_unhide_at does not force re-evaluation while valid cover remains', () => {
    const { mon } = setup();
    mon.mtame = 10;
    game.level.objects[0].cursed = true;
    // C's narrow maybe_unhide_at condition does not include the pet curse test.
    maybeUnhideAt(10, 10);
    assert.equal(!!mon.mundetected, true);
    assert.equal(hideUnder(mon), false);
});

test('objects carried in containers cannot cover a floor monster', () => {
    const { obj } = setup();
    game.level.objects = [];
    game.inventory = [{ contents: [obj] }];
    assert.equal(canHideUnderObject(obj), false);
});
