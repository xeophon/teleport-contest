import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, IRONBARS, W_WEP, W_SWAPWEP, W_QUIVER, LANDMINE, LAVAPOOL, LADDER, HOLE, POOL, LEVITATION, W_ARTI } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { rhack, holdCaughtThrownObject, landMonsterThrownObject, earthFloorEffects, queueImpactDroppedObjects,
    __shopBillingTestHooks as shop } from '../js/cmd.js';
import { beginBurn, processBurnTimers } from '../js/burn.js';
import { attachEggHatchTimeout } from '../js/egg_timers.js';
import { BURN_OBJECT, HATCH_EGG, ROT_CORPSE, TIMER_OBJECT, startTimer, peekTimer } from '../js/timeout.js';
import { objectLocations } from '../js/obj_location.js';
import { dropMonsterInventory, monsterByRndName, artifactDefinitionForName } from '../js/mklev.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { processMonsterTurns, moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';
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

for (const species of ['newt', 'cockatrice', 'pyrolisk']) {
    for (const quantity of [1, 3]) {
        test(`throwing ${quantity} ${species} egg${quantity > 1 ? 's' : ''} upward deletes only the broken egg timer`, async () => {
            // C dothrow.c:throw_obj splits/freeinv before toss_up's breakobj.
            setup();
            game.u.uhp = game.u.uhpmax = 100;
            game.u.stoneResistance = true;
            const eggs = { kind: 'egg', cls: 'food', otyp: 10001, letter: 'a', quan: quantity,
                corpsenm: { name: species }, age: 100 };
            game.inventory.push(eggs);
            attachEggHatchTimeout(eggs, 100);
            await rhack('t'); await rhack('a'); await rhack('<');
            assert.equal(game.level.objects.some(obj => obj.kind === 'egg'), false);
            assert.equal(game.inventory.includes(eggs), quantity > 1);
            assert.equal(game.timers.length, quantity > 1 ? 1 : 0);
            assert.equal(peekTimer(HATCH_EGG, eggs), quantity > 1 ? 200 : 0);
            if (quantity > 1) assert.equal(eggs.quan, quantity - 1);
        });
    }
}

for (const quantity of [1, 3]) {
    test(`an upward-thrown corpse from quantity ${quantity} keeps its rot timer on the landed object`, async () => {
        setup();
        const corpse = { kind: 'newt corpse', cls: 'food', otyp: 'corpse', letter: 'a', quan: quantity,
            corpsenm: { name: 'newt', cwt: 10 }, age: 100 };
        game.inventory.push(corpse);
        startTimer(100, TIMER_OBJECT, ROT_CORPSE, corpse);
        await rhack('t'); await rhack('a'); await rhack('<');
        const landed = game.level.objects.find(obj => obj.kind === 'newt corpse');
        assert.ok(landed);
        assert.equal(landed.quan, 1);
        assert.equal(peekTimer(ROT_CORPSE, landed), 200);
        assert.equal(game.timers.length, quantity > 1 ? 2 : 1);
        if (quantity === 1) assert.equal(landed, corpse);
        else {
            assert.notEqual(landed, corpse);
            assert.equal(corpse.quan, quantity - 1);
            assert.equal(peekTimer(ROT_CORPSE, corpse), 200);
        }
    });
}

test('throwing a wielded burning lamp upward detaches the real object and preserves extinction', async () => {
    setup();
    const lamp = { kind: 'oil lamp', cls: 'tool', otyp: 227, letter: 'a', quan: 1, age: 1,
        wielded: true, owornmask: W_WEP };
    game.inventory.push(lamp); game.u.uwep = lamp;
    beginBurn(lamp);
    await rhack('t'); await rhack('a'); await rhack('<');
    assert.equal(game.level.objects[0], lamp);
    assert.equal(game.inventory.includes(lamp), false);
    assert.equal(game.u.uwep, null);
    assert.equal(lamp.owornmask, 0);
    assert.equal(lamp.wielded, false);
    assert.equal(peekTimer(BURN_OBJECT, lamp), 101);
    game.moves = 101;
    await processBurnTimers();
    assert.equal(lamp.lamplit, false);
});

test('throwing one burning candle upward leaves the wielded remainder and splits its timer', async () => {
    setup();
    const candles = { kind: 'tallow candle', cls: 'tool', otyp: 370, letter: 'a', quan: 3, age: 100,
        wielded: true, owornmask: W_WEP };
    game.inventory.push(candles); game.u.uwep = candles;
    beginBurn(candles);
    await rhack('t'); await rhack('a'); await rhack('<');
    const thrown = game.level.objects.find(obj => obj.kind === 'tallow candle');
    assert.ok(thrown);
    assert.equal(thrown.quan, 1);
    assert.equal(candles.quan, 2);
    assert.equal(game.u.uwep, candles);
    assert.equal(candles.wielded, true);
    assert.equal(thrown.wielded, false);
    assert.equal(thrown.owornmask, 0);
    assert.equal(peekTimer(BURN_OBJECT, thrown), 125);
    assert.equal(peekTimer(BURN_OBJECT, candles), 125);
});

test('upward-thrown burning oil is detached before exploding and leaves no burn callback', async () => {
    setup();
    game.u.uhp = game.u.uhpmax = 100;
    const oil = { kind: 'potion of oil', cls: 'potion', otyp: 252, letter: 'a', quan: 1, age: 100 };
    game.inventory.push(oil);
    beginBurn(oil);
    await rhack('t'); await rhack('a'); await rhack('<');
    assert.equal(game.inventory.includes(oil), false);
    assert.equal(game.level.objects.includes(oil), false);
    assert.equal(oil.lamplit, false);
    assert.equal(oil.timed, 0);
    assert.equal(game.timers.length, 0);
});

for (const water of [false, true]) {
    test(`throwing the active Heart upward ${water ? 'resumes its detached identity after saved water escape' : 'lands the hero before the projectile flight'}`, async () => {
        // C throw_obj:freeinv ends invocation before throwit starts toss_up.
        setup();
        initRng(31);
        game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
        game.u.uhp = game.u.uhpmax = 100;
        game.u.uen = game.u.uenmax = 30;
        game.u.ualign = { type: 0, record: 10 };
        const def = artifactDefinitionForName('The Heart of Ahriman');
        let heart = { id: 1, artifact: def.name, kind: def.base, cls: def.cls, otyp: def.otyp,
            glyph: def.glyph, letter: 'a', quan: 1, age: 0, wielded: true, owornmask: W_WEP };
        game.inventory.push(heart); game.u.uwep = heart;
        game.u.uprops = { [LEVITATION]: { intrinsic: 0, extrinsic: W_ARTI } };
        game.u.levitating = game.u.levitation = true;
        if (water) {
            Object.assign(game.u, { ulevel: 12, teleportation: true, teleportControl: true });
            game.level.at(10, 10).typ = POOL;
        }
        enableRngLog();
        await rhack('t'); await rhack('a'); await rhack('<');
        assert.equal(game.inventory.includes(heart), false);
        assert.equal(game.u.uwep, null);
        assert.equal(heart.owornmask, 0);
        assert.equal(heart.wielded, false);
        assert.equal(game.u.uprops[LEVITATION].extrinsic & W_ARTI, 0);
        assert.equal(getRngLog().filter(entry => entry.startsWith('rnz(100)')).length, 1);
        if (water) {
            assert.equal(game._command_mode, 'waterTeleportCursor');
            assert.equal(game.level.objects.includes(heart), false);
            assert.equal(game._artifact_float_continuation.after.object, heart);
            assert.equal(getRngLog().some(entry => entry.startsWith('rn2(5)')), false);
            const cooldown = heart.age;
            const saved = encodeSaveState();
            resetGame(); restoreSaveState(saved);
            initRng(31, { resetLog: false }); // The runtime initializes RNG outside the saved state.
            heart = game._artifact_float_continuation.after.object;
            while (game._message_more) await rhack(' ');
            await rhack('l'); await rhack('.');
            assert.equal(heart.age, cooldown);
            assert.equal(getRngLog().filter(entry => entry.startsWith('rnz(100)')).length, 1);
            assert.equal(game._artifact_float_continuation, null);
            assert.deepEqual([heart.ox, heart.oy], [11, 10]);
        } else {
            assert.match(game._pending_message, /float gently.*Heart of Ahriman.*(?:hits|flies)/);
        }
        assert.equal(game.level.objects.includes(heart), true);
        assert.equal(heart.age > game.moves, true);
        assert.equal(game.u.levitating, false);
    });
}

test('firing a readied burning lamp moves its original object and clears the quiver slot', async () => {
    setup();
    const lamp = { kind: 'oil lamp', cls: 'tool', otyp: 227, letter: 'a', quan: 1, age: 1,
        quivered: true, owornmask: W_QUIVER };
    game.inventory.push(lamp); game.u.uquiver = lamp;
    beginBurn(lamp);
    await rhack('f'); await rhack('l');
    assert.equal(game.level.objects[0], lamp);
    assert.equal(game.u.uquiver, null);
    assert.equal(lamp.owornmask, 0);
    assert.equal(lamp.quivered, false);
    assert.equal(peekTimer(BURN_OBJECT, lamp), 101);
});

test('firing one readied hatching egg deletes only its split timer on a hard landing', async () => {
    setup();
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, letter: 'a', quan: 3,
        quivered: true, owornmask: W_QUIVER };
    game.inventory.push(eggs); game.u.uquiver = eggs;
    attachEggHatchTimeout(eggs, 100);
    await rhack('f'); await rhack('l');
    assert.equal(eggs.quan, 2);
    assert.equal(game.u.uquiver, eggs);
    assert.equal(game.timers.length, 1);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
    assert.equal(game.level.objects.length, 0);
});

test('firing a readied egg onto water preserves both independently hatching portions', async () => {
    setup();
    for (let x = 11; x < 30; x++) game.level.at(x, 10).typ = POOL;
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, letter: 'a', quan: 3, quivered: true };
    game.inventory.push(eggs);
    attachEggHatchTimeout(eggs, 100);
    await rhack('f'); await rhack('l');
    const landed = game.level.objects.find(obj => obj.kind === 'egg');
    assert.ok(landed);
    assert.equal(eggs.quan, 2);
    assert.equal(peekTimer(HATCH_EGG, landed), 200);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
});

test('firing one burning candle snuffs the thrown portion and leaves the readied remainder lit', async () => {
    // C throwit calls snuff_candle after flooreffects, before ship_object.
    setup();
    const candles = { kind: 'tallow candle', cls: 'tool', otyp: 370, letter: 'a', quan: 3, age: 100,
        quivered: true, owornmask: W_QUIVER };
    game.inventory.push(candles); game.u.uquiver = candles;
    beginBurn(candles);
    await rhack('f'); await rhack('l');
    const landed = game.level.objects.find(obj => obj.kind === 'tallow candle');
    assert.ok(landed);
    assert.equal(landed.lamplit, false);
    assert.equal(landed.age, 100);
    assert.equal(peekTimer(BURN_OBJECT, landed), 0);
    assert.equal(peekTimer(BURN_OBJECT, candles), 125);
    assert.equal(candles.lamplit, true);
    assert.equal(candles.quan, 2);
});

test('moveloop firing a lamp consumes one turn and expires the landed original', async () => {
    setup(); resetInputState();
    game.u.umovement = 12;
    const lamp = { kind: 'oil lamp', cls: 'tool', otyp: 227, letter: 'a', quan: 1, age: 1, quivered: true };
    game.inventory.push(lamp); beginBurn(lamp);
    pushKey('f'); await moveloop_core();
    assert.equal(game.moves, 100);
    pushKey('l'); await moveloop_core();
    while (game._message_more) await rhack(' ');
    pushKey('\x1b'); await moveloop_core();
    assert.equal(game.moves, 101);
    assert.equal(game.level.objects[0], lamp);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.timers.length, 0);
    resetInputState();
});

for (const quantity of [1, 3]) {
    test(`firing quivered gold with quantity ${quantity} preserves only the surviving slot`, async () => {
        setup();
        const coins = { id: 50, kind: 'gold piece', cls: 'coin', glyph: '$', letter: '$',
            quan: quantity, quivered: true, owornmask: W_QUIVER };
        game.inventory.push(coins); game.u.uquiver = coins; game._goldCount = quantity;
        await rhack('f'); await rhack('l');
        assert.equal(game._goldCount, quantity - 1);
        if (quantity === 1) {
            assert.equal(game.u.uquiver, null);
            assert.equal(game.level.objects[0], coins);
        } else {
            assert.equal(game.u.uquiver, coins);
            assert.equal(coins.quan, quantity - 1);
            assert.match(coins.line, /2 gold pieces \(in quiver pouch\)$/);
        }
    });
}

test('firing a gem to a unicorn transfers the same detached object into monster inventory', async () => {
    // C dothrow.c:gem_accept passes the projectile itself to mpickobj.
    setup();
    game.level.flags.noteleport = true;
    game.u.ualign = { type: 1, record: 0 };
    const ruby = { id: 51, kind: 'ruby', actualKind: 'ruby', cls: 'gem', glyph: '*',
        quan: 1, letter: 'a', quivered: true, known: true, gemDescription: 'ruby', gemTough: true };
    const unicorn = { mx: 11, my: 10, mhp: 24, mhpmax: 24, mcanmove: true,
        data: { name: 'white unicorn', mlet: 'u', maligntyp: 7 } };
    game.inventory.push(ruby); game.level.monsters.push(unicorn);
    await rhack('f'); await rhack('l');
    assert.match(game._pending_message, /accepts your gift/);
    assert.equal(game.inventory.includes(ruby), false);
    assert.equal(unicorn.minvent[0], ruby);
    assert.equal(ruby.quivered, false);
});

test('firing the active Heart resumes the detached projectile after a saved water escape', async () => {
    setup(); initRng(31);
    game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
    Object.assign(game.u, { ulevel: 12, uhp: 100, uhpmax: 100, uen: 30, uenmax: 30,
        teleportation: true, teleportControl: true, ualign: { type: 0, record: 10 } });
    const def = artifactDefinitionForName('The Heart of Ahriman');
    let heart = { id: 52, artifact: def.name, kind: def.base, cls: def.cls, otyp: def.otyp,
        glyph: def.glyph, letter: 'a', quan: 1, age: 0, quivered: true, owornmask: W_QUIVER };
    game.inventory.push(heart); game.u.uquiver = heart;
    game.u.uprops = { [LEVITATION]: { intrinsic: 0, extrinsic: W_ARTI } };
    game.u.levitating = game.u.levitation = true;
    game.level.at(10, 10).typ = POOL;
    enableRngLog();
    await rhack('f'); await rhack('l');
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game.u.uquiver, null);
    assert.equal(game.inventory.includes(heart), false);
    assert.equal(game.level.objects.includes(heart), false);
    assert.equal(game._artifact_float_continuation.after.object, heart);
    const cooldown = heart.age;
    const saved = encodeSaveState(); resetGame(); restoreSaveState(saved);
    initRng(31, { resetLog: false });
    heart = game._artifact_float_continuation.after.object;
    while (game._message_more) await rhack(' ');
    await rhack('l'); await rhack('.');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(game.level.objects.includes(heart), true);
    assert.equal(heart.ox > 11, true);
    assert.equal(heart.age, cooldown);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnz(100)')).length, 1);
});

test('firing completes the bars impact before recoil collision damage', async () => {
    // C dothrow.c:1674-1682 calls bhit before hurtle, which can roll damage.
    setup();
    game.u.levitating = true;
    game.level.at(9, 10).typ = STONE;
    game.level.at(12, 10).typ = IRONBARS;
    const lamp = { kind: 'oil lamp', cls: 'tool', otyp: 227, letter: 'a', quan: 1,
        quivered: true, age: 100 };
    game.inventory.push(lamp); beginBurn(lamp);
    const burnDeadline = peekTimer(BURN_OBJECT, lamp);
    enableRngLog();
    await rhack('f'); await rhack('l');
    const calls = getRngLog().map(entry => entry.replace(/=.*/, ''));
    const bars = calls.indexOf('rn2(5)');
    const collision = calls.indexOf('rnd(3)');
    assert.equal(bars >= 0, true);
    assert.equal(collision > bars, true);
    assert.equal(game.level.objects[0], lamp);
    assert.equal(peekTimer(BURN_OBJECT, lamp), burnDeadline);
});

for (const kind of ['oil lamp', 'corpse']) {
    for (const quantity of [1, 3]) {
        test(`horizontal throw preserves ${kind} identity and timers from quantity ${quantity}`, async () => {
            setup();
            const object = { id: 60, kind, cls: kind === 'corpse' ? 'food' : 'tool', letter: 'a',
                quan: quantity, age: 1, wielded: true, owornmask: W_WEP };
            if (kind === 'corpse') object.corpsenm = monsterByRndName('newt');
            game.inventory.push(object); game.u.uwep = object;
            if (kind === 'corpse') startTimer(100, TIMER_OBJECT, ROT_CORPSE, object);
            else beginBurn(object);
            await rhack('t'); await rhack('a'); await rhack('l');
            const landed = game.level.objects.find(item => item.kind === kind);
            assert.ok(landed);
            assert.equal(landed.quan, 1);
            assert.equal(landed.owornmask, 0);
            assert.equal(peekTimer(kind === 'corpse' ? ROT_CORPSE : BURN_OBJECT, landed), kind === 'corpse' ? 200 : 101);
            if (quantity === 1) {
                assert.equal(landed, object);
                assert.equal(game.u.uwep, null);
            } else {
                assert.equal(object.quan, 2);
                assert.equal(game.u.uwep, object);
                assert.equal(object.wielded, true);
                assert.equal(peekTimer(kind === 'corpse' ? ROT_CORPSE : BURN_OBJECT, object), kind === 'corpse' ? 200 : 101);
            }
        });
    }
}

test('horizontal candle throw splits timers and snuffs only the detached candle', async () => {
    setup();
    const candles = { kind: 'tallow candle', cls: 'tool', otyp: 370, letter: 'a', quan: 3,
        age: 100, wielded: true, owornmask: W_WEP };
    game.inventory.push(candles); game.u.uwep = candles; beginBurn(candles);
    await rhack('t'); await rhack('a'); await rhack('l');
    const landed = game.level.objects.find(object => object.kind === 'tallow candle');
    assert.ok(landed);
    assert.equal(landed.lamplit, false);
    assert.equal(landed.age, 100);
    assert.equal(landed.timed, 0);
    assert.equal(candles.quan, 2);
    assert.equal(candles.lamplit, true);
    assert.equal(peekTimer(BURN_OBJECT, candles), 125);
});

test('horizontal soft landing preserves the split fertile egg timer', async () => {
    setup();
    for (let x = 11; x < 30; x++) game.level.at(x, 10).typ = POOL;
    const eggs = { kind: 'egg', cls: 'food', otyp: 10001, letter: 'a', quan: 3 };
    game.inventory.push(eggs); attachEggHatchTimeout(eggs, 100);
    await rhack('t'); await rhack('a'); await rhack('l');
    const landed = game.level.objects.find(object => object.kind === 'egg');
    assert.ok(landed);
    assert.equal(peekTimer(HATCH_EGG, landed), 200);
    assert.equal(peekTimer(HATCH_EGG, eggs), 200);
    assert.equal(eggs.quan, 2);
});

test('throwing all gold moves the actual coin object and clears its quiver slot', async () => {
    setup();
    const gold = { kind: 'gold piece', cls: 'coin', glyph: '$', letter: '$', quan: 10, quivered: true, owornmask: W_QUIVER };
    game.inventory.push(gold); game.u.uquiver = gold; game._goldCount = 10;
    await rhack('t'); await rhack('$'); await rhack('l');
    assert.equal(game.level.objects[0], gold);
    assert.equal(gold.quan, 10);
    assert.equal(gold.owornmask, 0);
    assert.equal(game.u.uquiver, null);
    assert.equal(game._goldCount, 0);
});

test('a failed aklys return lands the actual detached weapon', async () => {
    setup();
    const raw = Array(100).fill(0n);
    game.coreCtx = { n: raw.length, r: raw, m: [], a: 0n, b: 0n, c: 0n };
    game.rng = { ...(game.rng || {}), core: game.coreCtx };
    const aklys = { id: 61, kind: 'aklys', cls: 'weapon', glyph: ')', letter: 'a', quan: 1,
        wielded: true, owornmask: W_WEP };
    game.inventory.push(aklys); game.u.uwep = aklys;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.match(game._pending_message, /fails to return/);
    assert.equal(game.level.objects[0], aklys);
    assert.equal(game.u.uwep, null);
    assert.equal(aklys.wielded, false);
});

test('boomerang recoil life saving retains a detached projectile across save and restore', async () => {
    setup();
    const raw = [2n, ...Array(100).fill(0n)];
    game.coreCtx = { n: raw.length, r: raw.reverse(), m: [], a: 0n, b: 0n, c: 0n };
    game.rng = { ...(game.rng || {}), core: game.coreCtx };
    Object.assign(game.u, { levitating: true, uhp: 3, uhpmax: 20 });
    game.u.acurr.a[3] = 25;
    game.level.at(9, 10).typ = STONE;
    const amulet = { id: 62, kind: 'amulet of life saving', cls: 'amulet', letter: 'a', worn: true, quan: 1 };
    let boomerang = { id: 63, kind: 'boomerang', cls: 'weapon', glyph: ')', letter: 'b',
        quan: 1, wielded: true, owornmask: W_WEP };
    const offhand = { id: 69, kind: 'dagger', cls: 'weapon', glyph: ')', letter: 'c',
        quan: 1, alternate: true, owornmask: W_SWAPWEP };
    game.inventory.push(amulet, boomerang, offhand); game.u.uwep = boomerang;
    game.u.uswapwep = offhand; game.u.twoweap = true;
    await rhack('t'); await rhack('b'); await rhack('l');
    assert.equal(game._command_mode, 'lifeSavingMore');
    assert.equal(game.inventory.includes(boomerang), false);
    assert.equal(game.u.uwep, null);
    assert.equal(game.u.twoweap, false);
    assert.equal(game._life_saving_boomerang_pre_recoil.after.object, boomerang);
    const saved = encodeSaveState(); resetGame(); restoreSaveState(saved); initRng(1);
    boomerang = game._life_saving_boomerang_pre_recoil.after.object;
    await rhack(' ');
    assert.match(game._pending_message, /skillfully catch/);
    assert.equal(game.inventory.includes(boomerang), true);
    assert.equal(game.u.uwep, boomerang);
    assert.equal(boomerang.owornmask, W_WEP);
    assert.equal(game.u.twoweap, true);
});

test('horizontal active Heart throw resumes flight from its saved water escape location', async () => {
    setup(); initRng(31);
    game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
    Object.assign(game.u, { ulevel: 12, uhp: 100, uhpmax: 100, uen: 30, uenmax: 30,
        teleportation: true, teleportControl: true, ualign: { type: 0, record: 10 } });
    const def = artifactDefinitionForName('The Heart of Ahriman');
    let heart = { id: 64, artifact: def.name, kind: def.base, cls: def.cls, otyp: def.otyp,
        glyph: def.glyph, letter: 'a', quan: 1, age: 0, wielded: true, owornmask: W_WEP };
    game.inventory.push(heart); game.u.uwep = heart;
    game.u.uprops = { [LEVITATION]: { intrinsic: 0, extrinsic: W_ARTI } };
    game.u.levitating = game.u.levitation = true;
    game.level.at(10, 10).typ = POOL;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game.inventory.includes(heart), false);
    assert.equal(game.level.objects.includes(heart), false);
    assert.equal(game._artifact_float_continuation.after.object, heart);
    const cooldown = heart.age;
    const saved = encodeSaveState(); resetGame(); restoreSaveState(saved); initRng(31);
    heart = game._artifact_float_continuation.after.object;
    while (game._message_more) await rhack(' ');
    await rhack('l'); await rhack('.');
    assert.equal(game.level.objects.includes(heart), true);
    assert.equal(heart.ox > 11, true);
    assert.equal(heart.age, cooldown);
    assert.equal(game.u.uwep, null);
});

for (const species of ['newt', 'cockatrice', 'pyrolisk']) {
    test(`horizontal ${species} egg impact cancels only the thrown egg hatch timer`, async () => {
        setup();
        game.u.acurr.a[3] = 25;
        const eggs = { kind: 'egg', cls: 'food', otyp: 10001, letter: 'a', quan: 3,
            corpsenm: monsterByRndName(species) };
        const goblin = { mx: 11, my: 10, mhp: 50, mhpmax: 50, data: monsterByRndName('goblin') };
        game.inventory.push(eggs); game.level.monsters.push(goblin);
        attachEggHatchTimeout(eggs, 100);
        await rhack('t'); await rhack('a'); await rhack('l');
        assert.match(game._pending_message, /hit.*egg/i);
        assert.equal(game.timers.length, 1);
        assert.equal(peekTimer(HATCH_EGG, eggs), 200);
        assert.equal(eggs.quan, 2);
    });
}

for (const [flag, slot, mask] of [['wielded', 'uwep', W_WEP], ['alternate', 'uswapwep', W_SWAPWEP], ['quivered', 'uquiver', W_QUIVER]]) {
    test(`caught boomerang restores its original ${slot} slot and object`, async () => {
        setup();
        game.u.acurr.a[3] = 25;
        const boomerang = { id: 65, kind: 'boomerang', cls: 'weapon', glyph: ')',
            letter: 'b', quan: 1, [flag]: true, owornmask: mask };
        const other = { ...boomerang, id: 66, letter: 'a', [flag]: false, owornmask: 0 };
        game.inventory.push(other, boomerang); game.u[slot] = boomerang;
        await rhack('t'); await rhack('b'); await rhack('l');
        assert.match(game._pending_message, /skillfully catch/);
        assert.deepEqual(game.inventory, [other, boomerang]);
        assert.equal(game.u[slot], boomerang);
        assert.equal(boomerang.owornmask, mask);
        assert.equal(boomerang.letter, 'b');
    });
}

test('a caught split boomerang rejoins its source stack before another compatible stack', async () => {
    setup(); game.u.acurr.a[3] = 25;
    const other = { id: 67, kind: 'boomerang', cls: 'weapon', glyph: ')', letter: 'a', quan: 2 };
    const stack = { ...other, id: 68, letter: 'b', quan: 3, wielded: true, owornmask: W_WEP };
    game.inventory.push(other, stack); game.u.uwep = stack;
    await rhack('t'); await rhack('b'); await rhack('l');
    assert.match(game._pending_message, /skillfully catch/);
    assert.equal(game.inventory.length, 2);
    assert.equal(other.quan, 2);
    assert.equal(stack.quan, 3);
    assert.equal(game.u.uwep, stack);
});

test('moveloop horizontal throw expires the same landed lamp after one turn', async () => {
    setup(); resetInputState(); game.u.umovement = 12;
    const lamp = { kind: 'oil lamp', cls: 'tool', otyp: 227, letter: 'a', quan: 1, age: 1,
        wielded: true, owornmask: W_WEP };
    game.inventory.push(lamp); game.u.uwep = lamp; beginBurn(lamp);
    for (const key of ['t', 'a']) { pushKey(key); await moveloop_core(); }
    assert.equal(game.moves, 100);
    pushKey('l'); await moveloop_core();
    while (game._message_more) await rhack(' ');
    pushKey('\x1b'); await moveloop_core();
    assert.equal(game.moves, 101);
    assert.equal(game.level.objects[0], lamp);
    assert.equal(game.u.uwep, null);
    assert.equal(lamp.lamplit, false);
    assert.equal(lamp.timed, 0);
    resetInputState();
});
