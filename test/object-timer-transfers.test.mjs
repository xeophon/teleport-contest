import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, W_WEP, LANDMINE, LAVAPOOL, LADDER, HOLE } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { rhack, holdCaughtThrownObject, landMonsterThrownObject, earthFloorEffects, queueImpactDroppedObjects,
    __shopBillingTestHooks as shop } from '../js/cmd.js';
import { beginBurn, processBurnTimers } from '../js/burn.js';
import { attachEggHatchTimeout } from '../js/egg_timers.js';
import { BURN_OBJECT, HATCH_EGG, peekTimer } from '../js/timeout.js';
import { objectLocations } from '../js/obj_location.js';
import { dropMonsterInventory, monsterByRndName } from '../js/mklev.js';
import { processMonsterTurns } from '../js/allmain.js';
import { stealarm } from '../js/steal.js';

function setup() {
    resetGame();
    initRng(1);
    game.moves = 100;
    game.context = { seer_turn: 1000 };
    game.flags = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 30, uhpmax: 30, uhunger: 900, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.inventory = [];
    vision_reset();
    vision_recalc();
}

for (const route of ['drop', 'pickup']) {
    test(`ordinary ${route} retains a burning lamp and its scheduled extinction`, async () => {
        // C do.c:dropx and invent.c:addinv/freeinv move the same object.
        setup();
        const lamp = { kind: 'oil lamp', cls: 'tool', age: 1, quan: 1, ox: 10, oy: 10 };
        if (route === 'drop') game.inventory.push(Object.assign(lamp, { letter: 'a' }));
        else game.level.objects.push(lamp);
        beginBurn(lamp);
        if (route === 'drop') { await rhack('d'); await rhack('a'); }
        else await rhack(',');
        const live = route === 'drop' ? game.level.objects[0] : game.inventory[0];
        assert.equal(live, lamp);
        assert.equal(peekTimer(BURN_OBJECT, live), 101);
        game.moves = 101;
        await processBurnTimers();
        assert.equal(live.lamplit, false);
        assert.equal(live.timed, 0);
        assert.equal(game.timers.length, 0);
    });
}

test('caught burning object keeps its timer when hold_another_object adds it to inventory', async () => {
    setup();
    const lamp = { kind: 'oil lamp', cls: 'tool', age: 1, quan: 1 };
    beginBurn(lamp);
    const result = holdCaughtThrownObject(lamp);
    assert.equal(result.object, lamp);
    assert.equal(peekTimer(BURN_OBJECT, result.object), 101);
    game.moves = 101;
    await processBurnTimers();
    assert.equal(game.inventory[0].lamplit, false);
});

test('partial container insertion duplicates hatch timers at the original deadline', async () => {
    // C mkobj.c:splitobj resets timed and invokes obj_split_timers.
    setup();
    const sack = { kind: 'sack', cls: 'tool', letter: 'a', quan: 1, contents: [] };
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, letter: 'b', quan: 3 };
    game.inventory.push(sack, eggs);
    attachEggHatchTimeout(eggs, 100);
    game._command_mode = 'containerPutObjects';
    game._container_put_container = sack;
    game._container_put_entries = [{ item: eggs, letter: 'b', amount: 1 }];
    game._container_put_selected = ['b'];
    await rhack(' ');
    const split = sack.contents[0];
    assert.equal(eggs.quan, 2);
    assert.equal(split.quan, 1);
    assert.equal(peekTimer(HATCH_EGG, split), 200);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
    assert.equal(split.timed, 1);
    assert.equal(game.timers.length, 2);
});

test('partial floor pickup duplicates timers while leaving the remainder on the floor', async () => {
    setup();
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, quan: 2000, ox: 10, oy: 10 };
    game.level.objects.push(eggs);
    attachEggHatchTimeout(eggs, 100);
    await rhack(',');
    if (game._command_mode === 'floorPickupBurdenConfirm') await rhack('y');
    const split = game.inventory[0];
    assert.ok(split && split.quan > 0 && split.quan < 2000);
    assert.equal(split.quan + eggs.quan, 2000);
    assert.equal(peekTimer(HATCH_EGG, split), 200);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
    assert.equal(game.timers.length, 2);
});

test('monster inventory drops do not merge independently hatching egg stacks', () => {
    // C invent.c:mergable refuses to merge eggs with hatch timers.
    setup();
    const floor = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1, ox: 10, oy: 10 };
    const held = { kind: 'egg', cls: 'food', otyp: 10001, quan: 2 };
    const mon = { mx: 10, my: 10, minvent: [held] };
    game.level.objects.push(floor);
    game.level.monsters.push(mon);
    attachEggHatchTimeout(floor, 100);
    attachEggHatchTimeout(held, 150);
    dropMonsterInventory(mon);
    assert.equal(game.level.objects.length, 2);
    assert.equal(objectLocations().get(held)?.source, 'floor');
    assert.equal(peekTimer(HATCH_EGG, held), 250);
    assert.equal(peekTimer(HATCH_EGG, floor), 200);
});

test('monster candle stack merging retires the discarded source burn timer', () => {
    setup();
    const floor = { kind: 'tallow candle', cls: 'tool', quan: 1, age: 20, ox: 10, oy: 10 };
    const held = { kind: 'tallow candle', cls: 'tool', quan: 2, age: 20 };
    const mon = { mx: 10, my: 10, minvent: [held] };
    game.level.objects.push(floor);
    game.level.monsters.push(mon);
    beginBurn(floor);
    beginBurn(held);
    dropMonsterInventory(mon);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floor.quan, 3);
    assert.equal(peekTimer(BURN_OBJECT, held), 0);
    assert.equal(held.timed, 0);
    assert.equal(peekTimer(BURN_OBJECT, floor), 105);
});

test('destroying a carried container stops timers on its entire contents tree', () => {
    // C shk.c:obfree/delete_contents recurse before mkobj.c:dealloc_obj.
    setup();
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    const inner = { kind: 'sack', cls: 'tool', quan: 1, contents: [eggs] };
    const outer = { kind: 'sack', cls: 'tool', letter: 'a', quan: 1, contents: [inner] };
    game.inventory.push(outer);
    attachEggHatchTimeout(eggs, 100);
    shop.useUpInventoryItemForTest(outer);
    assert.equal(game.inventory.length, 0);
    assert.equal(peekTimer(HATCH_EGG, eggs), 0);
    assert.equal(eggs.timed, 0);
});

test('walking over a burning lamp preserves its timer during autopickup', async () => {
    setup();
    game._autopickup = true;
    const lamp = { kind: 'oil lamp', cls: 'tool', glyph: '(', age: 1, quan: 1, ox: 11, oy: 10 };
    game.level.objects.push(lamp);
    beginBurn(lamp);
    await rhack('l');
    assert.equal(game.inventory[0], lamp);
    assert.equal(peekTimer(BURN_OBJECT, lamp), 101);
});

test('partial container takeout duplicates hatch timers on both surviving stacks', async () => {
    setup();
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, quan: 2000 };
    const sack = { kind: 'sack', cls: 'tool', quan: 1, ox: 10, oy: 10, contents: [eggs] };
    game.level.objects.push(sack);
    attachEggHatchTimeout(eggs, 100);
    game._command_mode = 'lootTakeoutObjects';
    game._loot_takeout_container = sack;
    game._loot_takeout_entries = [{ item: eggs, letter: 'a', label: 'Comestibles' }];
    game._loot_takeout_selected = ['a'];
    await rhack(' ');
    if (game._command_mode === 'containerTakeoutBurdenConfirm') await rhack('y');
    const split = game.inventory[0];
    assert.ok(split && split.quan > 0 && split.quan < 2000);
    assert.equal(split.quan + eggs.quan, 2000);
    assert.equal(peekTimer(HATCH_EGG, split), 200);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
});

test('a cursed bag losing a nested container cancels its eggs timers', async () => {
    setup();
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    const inner = { kind: 'sack', cls: 'tool', quan: 1, contents: [eggs] };
    const bag = { kind: 'bag of holding', cls: 'tool', letter: 'a', cursed: true, quan: 1, contents: [inner] };
    game.inventory.push(bag);
    attachEggHatchTimeout(eggs, 100);
    // Reopening makes the C 1-in-13 loss check; no turns or deadlines advance.
    for (let attempts = 0; bag.contents.length && attempts < 200; attempts++) {
        game._command_mode = 'applyObject';
        await rhack('a');
    }
    assert.equal(bag.contents.length, 0);
    assert.equal(peekTimer(HATCH_EGG, eggs), 0);
    assert.equal(eggs.timed, 0);
});

test('dropping a compatible candle stack retires the old floor timer and light', async () => {
    // C stackobj keeps the incoming object; merged stops the consumed timer.
    setup();
    const floor = { kind: 'tallow candle', cls: 'tool', glyph: '(', otyp: 370, age: 20, quan: 2, ox: 10, oy: 10 };
    const held = { ...floor, letter: 'a', quan: 1 };
    game.level.objects.push(floor);
    game.inventory.push(held);
    beginBurn(floor);
    beginBurn(held);
    await rhack('d'); await rhack('a');
    assert.deepEqual(game.level.objects, [held]);
    assert.equal(held.quan, 3);
    assert.equal(peekTimer(BURN_OBJECT, held), 105);
    assert.equal(peekTimer(BURN_OBJECT, floor), 0);
    assert.equal(floor.lamplit, false);
});

for (const variant of ['different light states', 'different candle fuel bands', 'burning oil', 'oil lamps']) {
    test(`floor drop refuses merging ${variant}`, async () => {
        // C invent.c:mergable checks oc_merge, lamplit, candle age and oil.
        setup();
        const potion = variant === 'burning oil';
        const lamp = variant === 'oil lamps';
        const floor = { kind: potion ? 'potion of oil' : lamp ? 'oil lamp' : 'tallow candle',
            cls: potion ? 'potion' : 'tool', glyph: potion ? '!' : '(',
            otyp: potion ? 252 : lamp ? 227 : 370, age: 20, quan: 1, ox: 10, oy: 10 };
        const held = { ...floor, letter: 'a', age: variant === 'different candle fuel bands' ? 100 : 20 };
        game.level.objects.push(floor);
        game.inventory.push(held);
        if (!lamp) beginBurn(floor);
        if (variant !== 'different light states' && !lamp) beginBurn(held);
        await rhack('d'); await rhack('a');
        assert.equal(game.level.objects.length, 2);
        assert.ok(game.level.objects.includes(floor));
        assert.ok(game.level.objects.includes(held));
    });
}

test('monster projectile floor merge retires its source timer', () => {
    setup();
    const floor = { kind: 'tallow candle', cls: 'tool', glyph: '(', otyp: 370, age: 20, quan: 1, ox: 10, oy: 10 };
    const incoming = { ...floor, quan: 2 };
    game.level.objects.push(floor);
    beginBurn(floor); beginBurn(incoming);
    assert.equal(shop.stackMonsterThrownObject(incoming), floor);
    assert.equal(floor.quan, 3);
    assert.equal(peekTimer(BURN_OBJECT, incoming), 0);
    assert.equal(incoming.lamplit, false);
});

for (const route of ['nymph', 'bullwhip']) {
    test(`deferred ${route} transfer preserves the stolen lamp timer`, async () => {
        setup();
        const lamp = { kind: 'oil lamp', cls: 'tool', glyph: '(', otyp: 227, letter: 'a', age: 1, quan: 1, wielded: true, owornmask: W_WEP };
        const mon = { data: monsterByRndName('water nymph'), mx: 11, my: 10, minvent: [], mhp: 12 };
        game.inventory.push(lamp);
        game.u.uwep = lamp;
        game.level.monsters.push(mon);
        beginBurn(lamp);
        game._pending_message = 'The monster disarms you.';
        game._message_more = 1;
        game._topline_after_more = 'The monster takes the lamp.';
        if (route === 'nymph') game._nymph_steal_after_more = {
            mon, itemLetter: 'a', item: lamp, theftMessage: game._topline_after_more };
        else game._bullwhip_after_more = { mon, itemLetter: 'a', item: lamp, whereTo: 3 };
        await rhack(' ');
        assert.equal(game.inventory.length, 0);
        assert.equal(mon.minvent[0], lamp);
        assert.equal(game.u.uwep, null);
        assert.equal(lamp.owornmask, 0);
        assert.equal(peekTimer(BURN_OBJECT, lamp), 101);
        game.moves = 101;
        await processBurnTimers();
        assert.equal(mon.minvent[0].lamplit, false);
    });
}

test('stealarm hands the original removed armor to the thief', () => {
    // C steal.c:stealarm calls freeinv then mpickobj on the same pointer.
    setup();
    const armor = { id: 55, kind: 'scale mail', cls: 'armor', letter: 'a', quan: 1 };
    const mon = { m_id: 77, mx: 11, my: 10, mhp: 12, minvent: [],
        data: { name: 'water nymph', attacks: [{ adtyp: 'steal' }] } };
    game.inventory.push(armor); game.level.monsters.push(mon);
    game._stealoid = 55; game._stealmid = 77;
    const result = stealarm();
    assert.ok(result);
    assert.equal(mon.minvent[0], armor);
});

test('a no-hands pet picking one candle splits its burn timer at the existing deadline', async () => {
    // C dog_invent calls splitobj when can_carry returns only one object.
    setup();
    const candles = { kind: 'tallow candle', cls: 'tool', glyph: '(', otyp: 370, age: 100, quan: 3, ox: 12, oy: 10 };
    const pet = { data: monsterByRndName('little dog'), mx: 12, my: 10, mux: 10, muy: 10,
        mhp: 12, mhpmax: 12, movement: 12, mcanmove: true, mcansee: true,
        pet: true, mtame: 10, mpeaceful: true, minvent: [],
        mextra: { edog: { apport: 100, hungrytime: 10000, dropdist: 10000, droptime: 0, whistletime: 0 } } };
    game.level.monsters.push(pet); game.level.objects.push(candles);
    beginBurn(candles);
    await processMonsterTurns();
    assert.equal(pet.minvent.length, 1);
    const picked = pet.minvent[0];
    assert.equal(picked.quan, 1);
    assert.equal(candles.quan, 2);
    assert.equal(peekTimer(BURN_OBJECT, picked), 125);
    assert.equal(peekTimer(BURN_OBJECT, candles), 125);
    assert.equal(picked.timed, 1);
});

for (const kind of ['ya', 'athame', 'scalpel', 'stiletto', 'worm tooth', 'crysknife']) {
    test(`the C stackable weapon ${kind} merges when dropped`, async () => {
        setup();
        const floor = { kind, cls: 'weapon', glyph: ')', quan: 2, ox: 10, oy: 10 };
        const held = { ...floor, quan: 1, letter: 'a' };
        game.level.objects.push(floor); game.inventory.push(held);
        await rhack('d'); await rhack('a');
        assert.equal(game.level.objects.length, 1);
        assert.equal(game.level.objects[0].quan, 3);
    });
}

for (const [kind, otyp] of [['boulder', 465], ['statue', 472]]) {
    test(`the C nonmergeable ${kind} remains separate when dropped`, async () => {
        setup();
        const floor = { kind, otyp, cls: 'rock', glyph: '`', quan: 1, ox: 10, oy: 10 };
        const held = { ...floor, letter: 'a' };
        game.level.objects.push(floor); game.inventory.push(held);
        await rhack('d'); await rhack('a');
        assert.equal(game.level.objects.length, 2);
    });
}

test('a no-hands hostile monster taking one potion preserves both burn timers', async () => {
    // C mon.c:mpickstuff splits can_carry's quantity before mpickobj.
    setup();
    const oil = { kind: 'potion of oil', cls: 'potion', glyph: '!', otyp: 252,
        age: 100, quan: 3, ox: 30, oy: 11 };
    const mon = { data: monsterByRndName('Ixoth'), mx: 30, my: 11, mux: 10, muy: 10,
        mhp: 100, mhpmax: 100, movement: 12, mcanmove: true, mcansee: true,
        mcan: 1, mspec_used: 1000, minvent: [] };
    game.level.monsters.push(mon); game.level.objects.push(oil);
    beginBurn(oil);
    await processMonsterTurns();
    assert.equal(mon.minvent.length, 1);
    assert.equal(mon.minvent[0].quan, 1);
    assert.equal(oil.quan, 2);
    assert.equal(peekTimer(BURN_OBJECT, mon.minvent[0]), 200);
    assert.equal(peekTimer(BURN_OBJECT, oil), 200);
});

test('nymph theft transfers the whole egg stack without leaving a duplicate carried remainder', async () => {
    setup();
    const eggs = { kind: 'egg', otyp: 10001, cls: 'food', letter: 'a', quan: 3 };
    const mon = { data: monsterByRndName('water nymph'), mx: 11, my: 10, minvent: [], mhp: 12 };
    game.inventory.push(eggs); game.level.monsters.push(mon);
    attachEggHatchTimeout(eggs, 100);
    game._pending_message = 'The monster approaches.';
    game._message_more = 1;
    game._topline_after_more = 'The monster takes the eggs.';
    game._nymph_steal_after_more = { mon, itemLetter: 'a', item: eggs, theftMessage: game._topline_after_more };
    await rhack(' ');
    assert.equal(game.inventory.length, 0);
    assert.equal(mon.minvent[0], eggs);
    assert.equal(eggs.quan, 3);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
    assert.equal(game.timers.length, 1);
});

for (const hit of [false, true]) {
    test(`a monster-thrown hatching egg ${hit ? 'breaks and cancels its timer' : 'lands with its original timer identity'}`, () => {
        // C mthrowu.c:drop_throw places the same object, or delobj stops timers.
        setup();
        const egg = { kind: 'egg', otyp: 10001, cls: 'food', quan: 1 };
        attachEggHatchTimeout(egg, 100);
        const result = landMonsterThrownObject(egg, 12, 10, { ohit: hit });
        assert.equal(result.consumed, hit);
        assert.equal(peekTimer(HATCH_EGG, egg), hit ? 0 : 200);
        assert.equal(egg.timed, hit ? 0 : 1);
        if (!hit) assert.equal(result.object, egg);
        assert.equal(game.timers.length, hit ? 0 : 1);
    });
}

for (const hit of [false, true]) {
    test(`a live monster egg-stack throw ${hit ? 'deletes only the broken split timer' : 'preserves both hatch deadlines on a miss'}`, async () => {
        // C mthrowu.c:m_throw calls splitobj before flight; each portion owns a timer.
        setup();
        game.u.uac = hit ? 30 : -100;
        game.u.stoneResistance = true;
        const eggs = { kind: 'egg', otyp: 10001, cls: 'food', quan: 3,
            corpsenm: { name: 'cockatrice', touchPetrifies: true }, known: true };
        const mon = { data: monsterByRndName('soldier'), mx: 14, my: 10, mux: 10, muy: 10,
            mhp: 20, mhpmax: 20, movement: 12, mcanmove: true, mcansee: true,
            minvent: [eggs] };
        game.level.monsters.push(mon);
        attachEggHatchTimeout(eggs, 100);
        await processMonsterTurns();
        assert.equal(eggs.quan, 2);
        assert.equal(peekTimer(HATCH_EGG, eggs), 200);
        assert.equal(game.timers.length, hit ? 1 : 2);
        const landing = game.level.objects.find(obj => obj.kind === 'egg');
        if (hit) assert.equal(landing, undefined);
        else {
            assert.ok(landing);
            assert.notEqual(landing, eggs);
            assert.equal(landing.quan, 1);
            assert.equal(landing.timed, 1);
            assert.equal(peekTimer(HATCH_EGG, landing), 200);
        }
    });
}

async function scatterAtDeferredLandmine(obj) {
    game.u.uhp = game.u.uhpmax = 100;
    game.sokoban_dnum = 999;
    const trap = { ttyp: LANDMINE, tx: 10, ty: 10, tseen: false };
    game.level.traps.push(trap);
    game.level.objects.push(Object.assign(obj, { ox: 10, oy: 10 }));
    game._command_mode = 'objectListMore';
    game._overlay_lines = [[0, 0, 'Items on the floor']];
    game._pending_landmine_trap = trap;
    await rhack(' ');
    assert.equal(game._pending_landmine_trap, null);
}

test('live landmine scatter preserves burn timers on every surviving candle portion', async () => {
    // C explode.c:scatter splits each stack with mkobj.c:splitobj before movement.
    setup();
    const candles = { kind: 'tallow candle', cls: 'tool', otyp: 370, quan: 3, age: 100 };
    beginBurn(candles);
    await scatterAtDeferredLandmine(candles);
    const portions = game.level.objects.filter(obj => obj.kind === 'tallow candle');
    assert.ok(portions.length > 1);
    assert.equal(portions.reduce((sum, obj) => sum + obj.quan, 0), 3);
    for (const portion of portions) {
        assert.equal(portion.timed, 1);
        assert.equal(peekTimer(BURN_OBJECT, portion), 125);
    }
    assert.equal(game.timers.length, portions.length);
    game.moves = 200;
    await processBurnTimers();
    for (const portion of portions) assert.equal(portion.lamplit, false);
});

test('live landmine scatter destroys every egg portion and cancels all hatch callbacks', async () => {
    // C explode.c:scatter -> dothrow.c:breaks/breakobj -> delobj/dealloc_obj.
    setup();
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, quan: 3 };
    attachEggHatchTimeout(eggs, 100);
    await scatterAtDeferredLandmine(eggs);
    assert.equal(game.level.objects.some(obj => obj.kind === 'egg'), false);
    assert.equal(eggs.timed, 0);
    assert.equal(game.timers.length, 0);
});

test('live landmine scatter exploding burning oil retires the burn callback', async () => {
    setup();
    initRng(2);
    const oil = { kind: 'potion of oil', cls: 'potion', otyp: 252, quan: 1, age: 100 };
    beginBurn(oil);
    await scatterAtDeferredLandmine(oil);
    assert.equal(game.level.objects.includes(oil), false);
    assert.equal(oil.lamplit, false);
    assert.equal(oil.timed, 0);
    assert.equal(game.timers.length, 0);
});

test('a monster-thrown egg burning in lava cancels its hatch timer', () => {
    // C do.c:flooreffects -> trap.c:lava_damage -> delobj/dealloc_obj.
    setup();
    game.level.at(12, 10).typ = LAVAPOOL;
    const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    attachEggHatchTimeout(egg, 100);
    const result = landMonsterThrownObject(egg, 12, 10);
    assert.equal(result.floorEffects.consumed, true);
    assert.equal(egg.timed, 0);
    assert.equal(peekTimer(HATCH_EGG, egg), 0);
});

for (const protectedEgg of [false, true]) {
    test(`lava destroys a thrown container and ${protectedEgg ? 'preserves' : 'deletes'} its spilled egg timer`, () => {
        // C fire_damage extracts contents before flooreffects and container deletion.
        setup();
        game.level.at(12, 10).typ = LAVAPOOL;
        const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1, oerodeproof: protectedEgg };
        const sack = { kind: 'sack', cls: 'tool', quan: 1, contents: [egg] };
        attachEggHatchTimeout(egg, 100);
        const result = landMonsterThrownObject(sack, 12, 10);
        assert.equal(result.floorEffects.consumed, true);
        assert.equal(game.level.objects.includes(egg), protectedEgg);
        assert.equal(peekTimer(HATCH_EGG, egg), protectedEgg ? 200 : 0);
        assert.equal(game.timers.length, protectedEgg ? 1 : 0);
    });
}

for (const carried of [false, true]) {
    test(`${carried ? 'dropping' : 'monster landing'} a hatching egg down a ladder deletes its timer when it breaks`, async () => {
        // C dokick.c:ship_object calls obfree when breaktest succeeds.
        setup();
        const x = carried ? 10 : 12;
        game.level.at(x, 10).typ = LADDER;
        game.stairs = { sx: x, sy: 10, up: false, isladder: true, tolev: { dnum: 0, dlevel: 2 } };
        const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1, letter: 'a' };
        attachEggHatchTimeout(egg, 100);
        if (carried) {
            game.inventory.push(egg);
            await rhack('d'); await rhack('a');
        } else {
            const result = landMonsterThrownObject(egg, x, 10);
            assert.equal(result.shipObject.broke, true);
        }
        assert.equal(game.inventory.includes(egg), false);
        assert.equal(egg.timed, 0);
        assert.equal(game.timers.length, 0);
        assert.equal(game._impact_drop_migrations?.size || 0, 0);
    });
}

test('shipping a thrown container preserves its identity and the timers of surviving contents', () => {
    setup();
    game.level.at(12, 10).typ = LADDER;
    game.stairs = { sx: 12, sy: 10, up: false, isladder: true, tolev: { dnum: 0, dlevel: 2 } };
    const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    const sack = { kind: 'sack', cls: 'tool', quan: 1, contents: [egg] };
    attachEggHatchTimeout(egg, 100);
    const result = landMonsterThrownObject(sack, 12, 10);
    assert.equal(result.shipObject.handled, true);
    assert.equal(result.shipObject.broke, false);
    assert.equal(game._impact_drop_migrations.get('0:2')[0], sack);
    assert.equal(objectLocations().get(egg)?.source, 'migrating');
    assert.equal(peekTimer(HATCH_EGG, egg), 200);
});

test('an egg breaking at migration delivery retires its hatch callback', () => {
    // C dokick.c:obj_delivery calls delobj after impact breaktest.
    setup();
    const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    attachEggHatchTimeout(egg, 100);
    queueImpactDroppedObjects(game.u.uz, [egg]);
    shop.deliverQueuedImpactDroppedObjectsForTest(game.u.uz);
    assert.equal(game.level.objects.includes(egg), false);
    assert.equal(game._impact_drop_migrations.size, 0);
    assert.equal(game.timers.length, 0);
    assert.equal(egg.timed, 0);
});

test('a hatching egg falling through a hole beneath the hero loses its timer on shipping breakage', () => {
    // C do.c:flooreffects delegates escaped-shaft landing to ship_object.
    setup();
    initRng(167);
    game.level.traps.push({ tx: 10, ty: 10, ttyp: HOLE, tseen: true });
    const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    attachEggHatchTimeout(egg, 100);
    const messages = [];
    const consumed = earthFloorEffects(egg, 10, 10, messages);
    assert.equal(consumed, true);
    assert.match(messages.join(' '), /muffled splat/);
    assert.equal(game.timers.length, 0);
    assert.equal(egg.timed, 0);
});

test('hero projectile hard-floor breakage retires the thrown egg hatch callback', () => {
    // C dothrow.c:throwit invokes breakobj before flooreffects/ship_object.
    setup();
    const egg = { kind: 'egg', cls: 'food', otyp: 10001, quan: 1 };
    attachEggHatchTimeout(egg, 100);
    const landing = shop.landProjectileObjectWithShopHandling(egg, 12, 10, { breakRoll: 1 });
    assert.equal(landing.topBreak.broke, true);
    assert.equal(game.timers.length, 0);
    assert.equal(egg.timed, 0);
});

for (const resistsBreak of [false, true]) {
    test(`kicking hatching eggs ${resistsBreak ? 'splits the timer when one egg survives flight' : 'cancels the timer when the stack splats'}`, async () => {
        // C dokick.c:kick_object breaks first, then splits the surviving stack.
        setup();
        initRng(resistsBreak ? 167 : 1);
        game.u.acurr.a[0] = 18;
        const eggs = { kind: 'egg', cls: 'food', otyp: 10001, quan: 3, ox: 11, oy: 10 };
        game.level.objects.push(eggs);
        attachEggHatchTimeout(eggs, 100);
        enableRngLog();
        await rhack('\x04'); await rhack('l');
        assert.deepEqual(getRngLog(), resistsBreak ? ['rn2(100)=0', 'rnd(2)=1'] : ['rn2(100)=45']);
        if (resistsBreak) {
            const kicked = game.level.objects.find(obj => obj !== eggs && obj.kind === 'egg');
            assert.ok(kicked);
            assert.equal(eggs.quan, 2);
            assert.equal(kicked.quan, 1);
            assert.equal(peekTimer(HATCH_EGG, kicked), 200);
            assert.equal(peekTimer(HATCH_EGG, eggs), 200);
            assert.equal(game.timers.length, 2);
        } else {
            assert.equal(game.level.objects.length, 0);
            assert.equal(eggs.timed, 0);
            assert.equal(game.timers.length, 0);
        }
    });
}
