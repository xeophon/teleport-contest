import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM } from '../js/const.js';
import { initRng } from '../js/rng.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { rhack, holdCaughtThrownObject, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { beginBurn, processBurnTimers } from '../js/burn.js';
import { attachEggHatchTimeout } from '../js/egg_timers.js';
import { BURN_OBJECT, HATCH_EGG, peekTimer } from '../js/timeout.js';
import { objectLocations } from '../js/obj_location.js';
import { dropMonsterInventory } from '../js/mklev.js';

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
