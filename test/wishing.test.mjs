import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { ROOM } from '../js/const.js';
import { initRng } from '../js/rng.js';

function installWishState(seed = 1, { debug = true, luck = 0 } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = { debug };
    g.inventory = [];
    g._goldCount = 0;
    g.context = {};
    g.u = {
        ux: 1,
        uy: 1,
        ublesscnt: 0,
        uluck: luck,
        moreluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    g.level = {
        rooms: [],
        monsters: [],
        objects: [],
        at: () => ({ roomno: 0, typ: ROOM }),
    };
    return g;
}

async function beginWizardWish() {
    await rhack('\x17');
    assert.equal(game._command_mode, 'wizardWish');
}

function beginWishDirectly() {
    game._wish_text = '';
    game._wish_tries = 0;
    game._command_mode = 'wizardWish';
}

async function submitWish(text) {
    for (const ch of text) await rhack(ch.charCodeAt(0));
    await rhack('\n');
}

test('unrecognized wish retries without creating a named weapon', async () => {
    installWishState();
    await beginWizardWish();

    await submitWish('blessed greased rusty nonexistent sword');

    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);
    assert.match(game._pending_message, /For what do you wish\?/);
});

test('five unrecognized wishes fall back to a random object', async () => {
    installWishState(23);
    await beginWizardWish();

    for (let i = 0; i < 4; i++) {
        await submitWish(`flibbertigibbet ${i}`);
        assert.equal(game._command_mode, 'wizardWish');
        assert.equal(game.inventory.length, 0);
    }

    await submitWish('flibbertigibbet 4');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 1);
    assert.equal(game._wish_tries, 0);
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);
    assert.match(game._pending_message, /That's enough tries!/);
    assert.doesNotMatch(game.inventory[0].kind || game.inventory[0].actualKind || '', /flibbertigibbet/);
});

test('recognized wishes still create the requested object', async () => {
    installWishState();
    await beginWizardWish();

    await submitWish('food ration');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.match(game._pending_message, /food ration/);
});

test('wish quantity only applies to mergeable object classes', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 speed boots');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'speed boots');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('2 wands of fire');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].cls, 'wand');
    assert.equal(game.inventory[0].wand, 'fire');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('2 magic markers');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'magic marker');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('2 spellbooks of magic missile');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].spellName, 'magic missile');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('pair of daggers');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'dagger');
    assert.equal(game.inventory[0].quan, 2);

    installWishState();
    beginWishDirectly();
    await submitWish('2 food rations');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.inventory[0].quan, 2);
});

test('normal-mode wish quantity keeps C merge caps', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('7 wax candles');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'wax candle');
    assert.equal(game.inventory[0].quan, 7);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('20 darts');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'dart');
    assert.equal(game.inventory[0].quan, 20);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('21 darts');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'dart');
    assert.notEqual(game.inventory[0].quan, 21);
});

test('non-debug wished spe follows C class constraints', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('+3 food ration');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.inventory[0].spe, 0);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-3 food ration');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.inventory[0].spe, 0);
    assert.equal(game.inventory[0].cursed, true);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('+99 plate mail');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'plate mail');
    assert.equal(game.inventory[0].spe, 0);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-5 potion of healing');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].actualKind, 'potion of healing');
    assert.equal(game.inventory[0].spe, 0);
    assert.equal(game.inventory[0].cursed, true);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-5 crystal ball');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].actualKind, 'crystal ball');
    assert.equal(game.inventory[0].spe, -1);
    assert.equal(game.inventory[0].cursed, true);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-3 wand of digging');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].wand, 'digging');
    assert.equal(game.inventory[0].spe, -1);
    assert.equal(game.inventory[0].cursed, true);
});
