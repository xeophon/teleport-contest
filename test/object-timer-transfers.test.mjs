import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, W_WEP } from '../js/const.js';
import { initRng } from '../js/rng.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { rhack, holdCaughtThrownObject, __shopBillingTestHooks as shop } from '../js/cmd.js';
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
