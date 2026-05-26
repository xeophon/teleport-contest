import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { PIT, ROOM } from '../js/const.js';
import { initRng } from '../js/rng.js';
import { mksobj } from '../js/mklev.js';

const BELL = 358;
const GOLD_PIECE = 466;
const TOOL_CLASS = 12;
const TALLOW_CANDLE = 370;
const WAX_CANDLE = 371;
const CANDELABRUM_OF_INVOCATION = 10076;
const BOOK_OF_THE_DEAD = 10097;
const HORN_OF_PLENTY = 957;
const CRYSTAL_BALL = 10088;
const EXPENSIVE_CAMERA = 10082;
const MAGIC_MARKER = 10084;
const TINNING_KIT = 10170;
const CAN_OF_GREASE = 10171;
const MAGIC_FLUTE = 946;
const FROST_HORN = 953;
const FIRE_HORN = 955;
const MAGIC_HARP = 10169;
const DRUM_OF_EARTHQUAKE = 975;
const BAG_OF_TRICKS = 10158;
const MEAT_RING = 10164;
const K_RATION = 10035;
const C_RATION = 10036;
const CRAM_RATION = 145;
const PANCAKE = 11011;
const KELP_FROND = 172;
const LUMP_OF_ROYAL_JELLY = 10089;
const MEATBALL = 11012;
const ENORMOUS_MEATBALL = 11013;

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
        flags: {},
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
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

test('explicit nothing wishes decline without consuming wish conduct', async () => {
    for (const wish of ['nothing', 'nil', 'none']) {
        installWishState();
        await beginWizardWish();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game._wish_tries, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
        assert.doesNotMatch(game._pending_message || '', /Nothing fitting/, wish);
    }
});

test('qualified nothing wishes retry as bad descriptions', async () => {
    for (const wish of ['blessed nothing', 'a nothing', 'nothing (0)']) {
        installWishState();
        await beginWizardWish();
        await submitWish(wish);

        assert.equal(game._command_mode, 'wizardWish', wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game._wish_tries, 1, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.match(game._pending_message, /Nothing fitting that description exists in the game\./, wish);
        assert.match(game._pending_message, /For what do you wish\?/, wish);
    }
});

test('wand of nothing remains an object wish', async () => {
    installWishState();
    await beginWizardWish();
    await submitWish('wand of nothing');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 1);
    assert.equal(item.cls, 'wand');
    assert.equal(item.kind, 'nothing');
    assert.equal(game.u.uconduct?.wishes, 1);
});

test('normal-mode wished gold clamps to C quantity bounds', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('5001 gold pieces');

    const money = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
    assert.equal(game._command_mode, null);
    assert.equal(game._goldCount, 5000);
    assert.equal(money.quan, 5000);
    assert.equal(money.owt, 50);
    assert.match(game._pending_message, /\$ - 5000 gold pieces\./);
    assert.equal(game.u.uconduct?.wishes, 1);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('0 zorkmids');

    const one = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
    assert.equal(game._goldCount, 1);
    assert.equal(one.quan, 1);
    assert.equal(one.owt, 1);
    assert.match(game._pending_message, /\$ - 1 gold piece\./);
});

test('wizard-mode wished gold keeps requested quantity above normal cap', async () => {
    installWishState(1, { debug: true });
    beginWishDirectly();
    await submitWish('6000 zorkmids');

    const money = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
    assert.equal(game._command_mode, null);
    assert.equal(game._goldCount, 6000);
    assert.equal(money.quan, 6000);
    assert.equal(money.owt, 60);
    assert.match(game._pending_message, /\$ - 6000 gold pieces\./);
});

test('bare plural money wishes follow C singularization count', async () => {
    for (const wish of ['gold pieces', 'coins', 'zorkmids']) {
        installWishState(1, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const money = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
        assert.equal(game._command_mode, null, wish);
        assert.equal(game._goldCount, 2, wish);
        assert.equal(money.quan, 2, wish);
        assert.equal(money.owt, 1, wish);
        assert.match(game._pending_message, /\$ - 2 gold pieces\./, wish);
    }
});

test('wizard trap wish creates a non-object hands result', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('pit');

    const trap = game.level.traps.find(t => t.tx === game.u.ux && t.ty === game.u.uy);
    assert.equal(game._command_mode, null);
    assert.equal(trap?.ttyp, PIT);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
    assert.equal(game.u.ublesscnt, 0);
    assert.match(game._pending_message, /^A pit\.$/);
});

test('non-wizard trap words remain bad wish descriptions', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('pit');

    assert.equal(game.level.traps.length, 0);
    assert.equal(game.inventory.length, 0);
    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game._wish_tries, 1);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);
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
        ['1 kelp frond', KELP_FROND, 'kelp frond', 'kelp fronds', 30, 1, 6],
        ['1 lump of royal jelly', LUMP_OF_ROYAL_JELLY, 'lump of royal jelly', 'lumps of royal jelly', 200, 2, 15],
        ['1 meatball', MEATBALL, 'meatball', 'meatballs', 5, 1, 5],
        ['1 enormous meatball', ENORMOUS_MEATBALL, 'enormous meatball', 'enormous meatballs', 2000, 400, 105],
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
        ['kelp fronds', KELP_FROND, 'kelp frond', 'kelp fronds', 2, 2],
        ['lumps of royal jelly', LUMP_OF_ROYAL_JELLY, 'lump of royal jelly', 'lumps of royal jelly', 2, 4],
        ['meatballs', MEATBALL, 'meatball', 'meatballs', 2, 2],
        ['enormous meatballs', ENORMOUS_MEATBALL, 'enormous meatball', 'enormous meatballs', 2, 800],
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

test('covered food wishes tolerate C aliases and fuzzy hyphen spacing', async () => {
    const cases = [
        ['kelp', KELP_FROND, 'kelp frond', 1],
        ['K ration', K_RATION, 'K-ration', 1],
        ['krations', K_RATION, 'K-ration', 2],
        ['C ration', C_RATION, 'C-ration', 1],
        ['crations', C_RATION, 'C-ration', 2],
        ['huge meatball', ENORMOUS_MEATBALL, 'enormous meatball', 1],
        ['huge chunk of meat', ENORMOUS_MEATBALL, 'enormous meatball', 1],
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

test('mksobj initializes kelp frond quantity from C rnd(2)', () => {
    const quantities = new Set();
    for (let seed = 1; seed <= 40; seed++) {
        installWishState(seed);
        quantities.add(mksobj(KELP_FROND, true, false).quan);
    }

    assert.deepEqual([...quantities].sort(), [1, 2]);
});

test('mksobj initializes exact charged instruments with C charge ranges', () => {
    const cases = [
        [MAGIC_FLUTE, 4, 8],
        [FROST_HORN, 4, 8],
        [FIRE_HORN, 4, 8],
        [MAGIC_HARP, 4, 8],
        [DRUM_OF_EARTHQUAKE, 4, 8],
        [HORN_OF_PLENTY, 3, 20],
    ];

    for (const [otyp, minSpe, maxSpe] of cases) {
        installWishState(1);
        const item = mksobj(otyp, true, false);
        assert.equal(item.otyp, otyp);
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe, String(otyp));
    }
});

test('random tool generation maps charged instrument rolls to concrete tools', () => {
    const cases = [
        [946, MAGIC_FLUTE, 4, 8],
        [953, FROST_HORN, 4, 8],
        [955, FIRE_HORN, 4, 8],
        [957, HORN_OF_PLENTY, 3, 20],
        [963, MAGIC_HARP, 4, 8],
        [975, DRUM_OF_EARTHQUAKE, 4, 8],
    ];

    for (const [roll, otyp, minSpe, maxSpe] of cases) {
        installWishState(1);
        game._mkobj_tool_roll = roll;
        const item = mksobj(TOOL_CLASS, true, false);
        assert.equal(item.otyp, otyp, String(roll));
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe, String(roll));
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

test('wished charged tools use C object metadata rows', async () => {
    installWishState(3);
    beginWishDirectly();
    await submitWish('bag of tricks');

    let item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, BAG_OF_TRICKS);
    assert.equal(item.cls, 'tool');
    assert.equal(item.kind, 'bag of tricks');
    assert.equal(item.actualKind, 'bag of tricks');
    assert.equal(item.quan, 1);
    assert.ok(item.spe >= 3 && item.spe <= 20);
    assert.equal(item.blessed, false);
    assert.equal(item.cursed, false);
    assert.equal(item.owt, 15);
    assert.equal(shop.shopBaseCost(item), 100);

    installWishState(11);
    beginWishDirectly();
    await submitWish('magic marker');

    item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, MAGIC_MARKER);
    assert.equal(item.cls, 'tool');
    assert.equal(item.kind, 'magic marker');
    assert.equal(item.actualKind, 'magic marker');
    assert.equal(item.quan, 1);
    assert.ok(item.spe >= 30 && item.spe <= 99);
    assert.equal(item.blessed, false);
    assert.equal(item.cursed, false);
    assert.equal(item.owt, 2);
    assert.equal(shop.shopBaseCost(item), 50);

    installWishState(11);
    beginWishDirectly();
    await submitWish('glass orb');

    item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, CRYSTAL_BALL);
    assert.equal(item.cls, 'tool');
    assert.equal(item.kind, 'glass orb');
    assert.equal(item.actualKind, 'crystal ball');
    assert.equal(item.known || false, false);
    assert.ok(item.spe >= 3 && item.spe <= 7);
    assert.equal(item.owt, 150);
    assert.equal(shop.shopBaseCost(item), 60);
    assert.match(item.line, /glass orb/);
});

test('wished camera tinning kit and grease use C charged-tool metadata rows', async () => {
    const cases = [
        ['uncursed expensive camera', EXPENSIVE_CAMERA, 'expensive camera', 30, 99, 12, 200],
        ['uncursed tinning kit', TINNING_KIT, 'tinning kit', 30, 99, 100, 30],
        ['uncursed can of grease', CAN_OF_GREASE, 'can of grease', 5, 25, 15, 20],
    ];

    for (const [wish, otyp, kind, minSpe, maxSpe, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.cls, 'tool');
        assert.equal(item.kind, kind);
        assert.equal(item.actualKind, kind);
        assert.equal(item.quan, 1);
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe);
        assert.equal(item.blessed, false);
        assert.equal(item.cursed, false);
        assert.equal(item.owt, weight);
        assert.equal(shop.shopBaseCost(item), cost);
    }
});

test('wish charge suffix applies through charged-tool metadata', async () => {
    const cases = [
        ['bag of tricks (1:3)', BAG_OF_TRICKS, 'bag of tricks', 'bag of tricks', 15],
        ['magic marker (1:3)', MAGIC_MARKER, 'magic marker', 'magic marker', 2],
        ['glass orb (1:3)', CRYSTAL_BALL, 'glass orb', 'crystal ball', 150],
        ['expensive camera (1:3)', EXPENSIVE_CAMERA, 'expensive camera', 'expensive camera', 12],
        ['tinning kit (1:3)', TINNING_KIT, 'tinning kit', 'tinning kit', 100],
        ['can of grease (1:3)', CAN_OF_GREASE, 'can of grease', 'can of grease', 15],
    ];

    for (const [wish, otyp, kind, actualKind, weight] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.actualKind, actualKind);
        assert.equal(item.spe, 3);
        assert.equal(item.recharged ?? 0, 0);
        assert.equal(item.owt, weight);
    }
});

test('plural wished camera tinning kit and grease remain one requested tool', async () => {
    const cases = [
        ['2 expensive cameras', EXPENSIVE_CAMERA, 'expensive camera', 12, 200],
        ['2 tinning kits', TINNING_KIT, 'tinning kit', 100, 30],
        ['2 cans of grease', CAN_OF_GREASE, 'can of grease', 15, 20],
    ];

    for (const [wish, otyp, kind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.actualKind, kind);
        assert.equal(item.quan, 1);
        assert.equal(item.owt, weight);
        assert.equal(shop.shopBaseCost(item), cost);
        assert.match(item.line, new RegExp(kind));
        assert.doesNotMatch(item.line, /^a - 2 /);
    }
});

test('wished charged instruments use C object metadata rows', async () => {
    const cases = [
        ['magic flute', MAGIC_FLUTE, 'flute', 'magic flute', 4, 8, 5, 36],
        ['frost horn', FROST_HORN, 'horn', 'frost horn', 4, 8, 18, 50],
        ['fire horn', FIRE_HORN, 'horn', 'fire horn', 4, 8, 18, 50],
        ['magic harp', MAGIC_HARP, 'harp', 'magic harp', 4, 8, 30, 50],
        ['drum of earthquake', DRUM_OF_EARTHQUAKE, 'drum', 'drum of earthquake', 4, 8, 25, 25],
        ['horn of plenty', HORN_OF_PLENTY, 'horn', 'horn of plenty', 3, 20, 18, 50],
    ];

    for (const [wish, otyp, kind, actualKind, minSpe, maxSpe, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.cls, 'tool', wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.quan, 1, wish);
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe, wish);
        assert.equal(item.known, false, wish);
        assert.equal(item.blessed, false, wish);
        assert.equal(item.cursed, false, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
        assert.match(item.line, new RegExp(kind), wish);
    }
});

test('wish charge suffix applies through charged instrument metadata', async () => {
    const cases = [
        ['magic flute (1:3)', MAGIC_FLUTE, 'flute', 'magic flute', 5, 36],
        ['frost horn (1:3)', FROST_HORN, 'horn', 'frost horn', 18, 50],
        ['fire horn (1:3)', FIRE_HORN, 'horn', 'fire horn', 18, 50],
        ['magic harp (1:3)', MAGIC_HARP, 'harp', 'magic harp', 30, 50],
        ['drum of earthquake (1:3)', DRUM_OF_EARTHQUAKE, 'drum', 'drum of earthquake', 25, 25],
        ['horn of plenty (1:3)', HORN_OF_PLENTY, 'horn', 'horn of plenty', 18, 50],
    ];

    for (const [wish, otyp, kind, actualKind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.spe, 3, wish);
        assert.equal(item.recharged ?? 0, 0, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
    }
});

test('plural wished charged instruments remain one requested tool', async () => {
    const cases = [
        ['2 magic flutes', MAGIC_FLUTE, 'flute', 'magic flute', 5, 36],
        ['2 frost horns', FROST_HORN, 'horn', 'frost horn', 18, 50],
        ['2 fire horns', FIRE_HORN, 'horn', 'fire horn', 18, 50],
        ['2 magic harps', MAGIC_HARP, 'harp', 'magic harp', 30, 50],
        ['2 drums of earthquake', DRUM_OF_EARTHQUAKE, 'drum', 'drum of earthquake', 25, 25],
        ['2 horns of plenty', HORN_OF_PLENTY, 'horn', 'horn of plenty', 18, 50],
    ];

    for (const [wish, otyp, kind, actualKind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.quan, 1, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
        assert.match(item.line, new RegExp(kind), wish);
        assert.doesNotMatch(item.line, /^a - 2 /, wish);
    }
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
    await submitWish('Bell of Opening (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].otyp, BELL);
    assert.equal(game.inventory[0].kind, 'silver bell');
    assert.equal(game.inventory[0].actualKind, 'bell of opening');
    assert.equal(game.inventory[0].spe, 3);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
    assert.equal(game.inventory[0].owt, 10);
    assert.equal(shop.shopBaseCost(game.inventory[0]), 5000);
    assert.notEqual(game.inventory[0].unique, true);
    assert.match(game.inventory[0].line, /silver bell/);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('silver bell wish resolves through Bell of Opening namedesc path in wizard mode', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('silver bell');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, BELL);
    assert.equal(item.kind, 'silver bell');
    assert.equal(item.actualKind, 'bell of opening');
    assert.equal(item.spe, 3);
    assert.equal(item.owt, 10);
    assert.equal(shop.shopBaseCost(item), 5000);
    assert.match(item.line, /silver bell/);
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

test('wizard description wishes create real unique candelabrum and book objects', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('candelabrum');

    assert.equal(game.inventory[0].otyp, CANDELABRUM_OF_INVOCATION);
    assert.equal(game.inventory[0].actualKind, 'Candelabrum of Invocation');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'tool');

    installWishState();
    beginWishDirectly();
    await submitWish('papyrus');

    assert.equal(game.inventory[0].otyp, BOOK_OF_THE_DEAD);
    assert.equal(game.inventory[0].actualKind, 'Book of the Dead');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'spellbook');
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('non-wizard unique description wishes use C substitutions', async () => {
    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('candelabrum');

    const candle = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.ok([TALLOW_CANDLE, WAX_CANDLE].includes(candle.otyp));
    assert.equal(candle.cls, 'tool');
    assert.match(candle.kind, /candle/);
    assert.notEqual(candle.actualKind, 'Candelabrum of Invocation');
    assert.equal(game.u.uconduct?.wishes, 1);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('papyrus');

    const book = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(book.cls, 'spellbook');
    assert.equal(book.kind, 'spellbook of blank paper');
    assert.notEqual(book.actualKind, 'Book of the Dead');
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('denied quest artifact wish records artifact conduct without ordinary wish conduct', async () => {
    installWishState(5, { debug: false });
    game._startup_role = 'Wizard';
    beginWishDirectly();
    await submitWish('The Eye of the Aethiopica');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 0);
    assert.match(game._pending_message, /For a moment, you feel something in your hands, but it disappears!/);
    assert.equal(game.u.uconduct?.wisharti, 1);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.equal(game.u.ublesscnt, 0);
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
