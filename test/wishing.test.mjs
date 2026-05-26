import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { ROOM } from '../js/const.js';
import { initRng } from '../js/rng.js';

const HORN_OF_PLENTY = 957;
const MEAT_RING = 10164;
const K_RATION = 10035;
const C_RATION = 10036;
const CRAM_RATION = 145;
const PANCAKE = 11011;

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

test('wished ration foods use concrete C object metadata', async () => {
    const cases = [
        ['1 pancake', PANCAKE, 'pancake', 'pancakes', 200, 2, 15],
        ['1 cram ration', CRAM_RATION, 'cram ration', 'cram rations', 600, 15, 35],
        ['1 K-ration', K_RATION, 'K-ration', 'K-rations', 400, 10, 25],
        ['1 C-ration', C_RATION, 'C-ration', 'C-rations', 300, 10, 20],
    ];

    for (const [wish, otyp, kind, plural, nutrition, weight, cost] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.plural, plural);
        assert.equal(item.nutrition, nutrition);
        assert.equal(item.quan, 1);
        assert.equal(item.owt, weight);
        assert.equal(shop.shopBaseCost(item), cost);
        assert.match(item.line, new RegExp(kind));
    }
});

test('plural wished ration foods keep C plural metadata and weights', async () => {
    const cases = [
        ['pancakes', PANCAKE, 'pancake', 'pancakes', 2, 4],
        ['cram rations', CRAM_RATION, 'cram ration', 'cram rations', 2, 30],
        ['K-rations', K_RATION, 'K-ration', 'K-rations', 2, 20],
        ['C-rations', C_RATION, 'C-ration', 'C-rations', 2, 20],
    ];

    for (const [wish, otyp, kind, plural, quantity, weight] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.plural, plural);
        assert.equal(item.quan, quantity);
        assert.equal(item.owt, weight);
        assert.match(item.line, new RegExp(`${quantity} ${plural}`));
    }
});

test('K-ration and C-ration wishes tolerate C fuzzy hyphen spacing', async () => {
    const cases = [
        ['K ration', K_RATION, 'K-ration', 1],
        ['krations', K_RATION, 'K-ration', 2],
        ['C ration', C_RATION, 'C-ration', 1],
        ['crations', C_RATION, 'C-ration', 2],
    ];

    for (const [wish, otyp, kind, quantity] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.quan, quantity);
    }
});

test('normal-mode wish quantity keeps C merge caps', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('7 wax candles');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'wax candle');
    assert.equal(game.inventory[0].quan, 7);
    assert.equal(game.inventory[0].spe, 1);
    assert.equal(game.inventory[0].age, 400);
    assert.equal(game.inventory[0].lamplit || false, false);
    assert.equal(game.inventory[0].owt, 14);

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

test('plural meat ring wish remains one nonmergeable food object', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 meat rings');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, MEAT_RING);
    assert.equal(item.cls, 'food');
    assert.equal(item.kind, 'meat ring');
    assert.equal(item.actualKind, 'meat ring');
    assert.equal(item.quan, 1);
    assert.equal(item.owt, 5);
    assert.match(item.line, /a meat ring/);
    assert.doesNotMatch(item.line, /meat rings/);
});

test('burning wished candles keep C candle metadata', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('6 burning tallow candles');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.kind, 'tallow candle');
    assert.equal(item.quan, 6);
    assert.equal(item.spe, 1);
    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(item.age, 75);
    assert.equal(item.owt, 12);
    assert.match(item.line, /6 tallow candles \(lit\)/);
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

test('wish charge suffix applies before object naming', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('wand of fire (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].cls, 'wand');
    assert.equal(game.inventory[0].wand, 'fire');
    assert.equal(game.inventory[0].spe, 3);
    assert.equal(game.inventory[0].recharged, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('magic marker (0:7) named dry');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'magic marker');
    assert.equal(game.inventory[0].oname, 'dry');
    assert.equal(game.inventory[0].spe, 7);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
});

test('wish charge suffix ignores tool recharge count in normal mode', async () => {
    installWishState(3, { debug: false });
    beginWishDirectly();
    await submitWish('horn of plenty (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].otyp, HORN_OF_PLENTY);
    assert.equal(game.inventory[0].actualKind, 'horn of plenty');
    assert.equal(game.inventory[0].spe, 3);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
    assert.equal(game.inventory[0].owt, 18);
});

test('empty wished horn of plenty zeroes charges after charge suffix parsing', async () => {
    installWishState(3, { debug: false });
    beginWishDirectly();
    await submitWish('empty horn of plenty (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].otyp, HORN_OF_PLENTY);
    assert.equal(game.inventory[0].actualKind, 'horn of plenty');
    assert.equal(game.inventory[0].spe, 0);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
});

test('normal-mode wished wand of wishing ignores requested abuse charges', async () => {
    installWishState(11, { debug: false });
    beginWishDirectly();
    await submitWish('wand of wishing (7:99)');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.cls, 'wand');
    assert.equal(item.wand, 'wishing');
    assert.ok(item.spe === -1 || item.spe === 0);
    assert.equal(item.recharged, 1);
    assert.notEqual(item.spe, 7);
});

test('wizard bell of opening wish follows C namedesc silver-bell path', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('Bell of Opening');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'silver bell');
    assert.equal(game.inventory[0].actualKind, 'bell of opening');
    assert.notEqual(game.inventory[0].unique, true);
    assert.match(game.inventory[0].line, /silver bell/);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('wizard wishes create real unique invocation candelabrum and book objects', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('Candelabrum of Invocation');

    assert.equal(game.inventory[0].actualKind, 'Candelabrum of Invocation');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'tool');

    installWishState();
    beginWishDirectly();
    await submitWish('Book of the Dead');

    assert.equal(game.inventory[0].actualKind, 'Book of the Dead');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'spellbook');
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('wished object finalization recomputes stack weight', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 daggers');

    assert.equal(game.inventory[0].kind, 'dagger');
    assert.equal(game.inventory[0].quan, 2);
    assert.equal(game.inventory[0].owt, 20);
});

test('wished lenses use C pair naming, weight, and cost', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('lenses');

    const item = game.inventory[0];
    assert.equal(item.kind, 'lenses');
    assert.equal(item.actualKind, 'lenses');
    assert.equal(item.quan, 1);
    assert.equal(item.owt, 3);
    assert.match(item.line, /a pair of lenses/);
    assert.match(game._pending_message, /a pair of lenses/);
    assert.equal(shop.shopBaseCost(item), 80);

    item.line = '';
    await rhack('i');
    const overlayText = (game._overlay_lines || []).map(line => line[2]).join('\n');
    assert.match(overlayText, /a pair of lenses/);
    assert.doesNotMatch(overlayText, /a lenses/);
});

test('pair of lenses wish remains one non-mergeable object', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 pair of lenses');

    const item = game.inventory[0];
    assert.equal(item.kind, 'lenses');
    assert.equal(item.actualKind, 'lenses');
    assert.equal(item.quan, 1);
    assert.match(item.line, /a pair of lenses/);
    assert.doesNotMatch(item.line, /2 lenses/);
});

test('signed wish charge suffix is invalid and stripped like C', async () => {
    installWishState(17);
    beginWishDirectly();
    await submitWish('magic marker');
    const generatedSpe = game.inventory[0].spe;

    installWishState(17);
    beginWishDirectly();
    await submitWish('magic marker (-3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'magic marker');
    assert.equal(game.inventory[0].spe, generatedSpe);
    assert.equal(game.inventory[0].cursed || false, false);
});
