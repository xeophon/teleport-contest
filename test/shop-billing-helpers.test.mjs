import assert from 'node:assert/strict';
import test from 'node:test';

import { processSpellbookStudyOccupation, rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { LAVAPOOL, ROOM, ROOMOFFSET, SHOPBASE } from '../js/const.js';

function installShopState() {
    const g = resetGame();
    initRng(1);
    const roomno = ROOMOFFSET;
    const shkp = {
        isshk: true,
        shoproom: roomno,
        shoptype: SHOPBASE,
        shknam: 'Izchak',
        mx: 6,
        my: 5,
        shk: { x: 6, y: 5 },
        bill: [],
        billct: 0,
        minvent: [{ cls: 'coin', otyp: 466, glyph: '$', quan: 100 }],
        m_id: 1,
    };
    g.flags = {};
    g.inventory = [];
    g._goldCount = 0;
    g.u = {
        ux: 5,
        uy: 5,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    g.level = {
        rooms: [{ rtype: SHOPBASE, resident: shkp }],
        monsters: [shkp],
        objects: [],
        at: () => ({ roomno }),
    };
    return { shkp };
}

function installCommandShopState() {
    const state = installShopState();
    Object.assign(game.u, {
        uhunger: 900,
        uhp: 10,
        uhpmax: 10,
        uen: 0,
        uenmax: 0,
        ulevel: 1,
        uac: 10,
    });
    return state;
}

function dagger(id, letter = 'd') {
    return {
        id,
        cls: 'weapon',
        glyph: ')',
        kind: 'dagger',
        actualKind: 'dagger',
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a dagger`,
        dknown: true,
        known: true,
    };
}

function foodRation(id, letter = 'a') {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'food ration',
        actualKind: 'food ration',
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a food ration`,
    };
}

function chargedTool(id, kind, letter = 't', spe = 3) {
    return {
        id,
        cls: 'tool',
        glyph: '(',
        kind,
        actualKind: kind,
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a ${kind}`,
    };
}

function tin(id, letter = 't', quan = 1) {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'tin',
        actualKind: 'tin',
        singular: 'tin',
        plural: 'tins',
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter || 't'} - ${quan > 1 ? `${quan} tins` : 'a tin'}`,
        corpsenm: { name: 'newt' },
        spe: -2,
        known: true,
        dknown: true,
    };
}

function egg(id, letter = 'e', quan = 1) {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'egg',
        actualKind: 'egg',
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} eggs` : 'an egg'}`,
    };
}

function goldPieces(id, quan, letter = '$') {
    return {
        id,
        cls: 'coin',
        otyp: 466,
        glyph: '$',
        quan,
        letter,
        line: `${letter} - ${quan} gold piece${quan === 1 ? '' : 's'}`,
    };
}

function sack(id, letter = 'b') {
    return {
        id,
        cls: 'tool',
        otyp: 217,
        glyph: '(',
        kind: 'sack',
        actualKind: 'sack',
        quan: 1,
        letter,
        line: `${letter} - a sack`,
        cknown: true,
        contents: [],
    };
}

function bagOfHolding(id, letter = 'b') {
    return {
        ...sack(id, letter),
        otyp: 219,
        kind: 'bag of holding',
        actualKind: 'bag of holding',
        line: `${letter} - a bag of holding`,
    };
}

function cancellationWand(id, letter = 'c') {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'wand of cancellation',
        actualKind: 'wand of cancellation',
        quan: 1,
        spe: 1,
        letter,
        line: `${letter} - a wand of cancellation`,
    };
}

function healingSpellbook(id, letter = 'b') {
    return {
        id,
        cls: 'spellbook',
        glyph: '+',
        kind: 'spellbook of healing',
        actualKind: 'spellbook of healing',
        spellName: 'healing',
        spell: { name: 'healing', level: 1, skill: 'healing' },
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a spellbook of healing`,
        known: false,
        bknown: true,
    };
}

function shopFloorContainer(id, x = 5, y = 5) {
    return {
        id,
        cls: 'tool',
        glyph: '(',
        kind: 'large box',
        actualKind: 'large box',
        ox: x,
        oy: y,
        contents: [],
        cknown: true,
    };
}

function shopFloorIceBox(id, x = 5, y = 5) {
    return {
        id,
        cls: 'tool',
        otyp: 216,
        glyph: '(',
        kind: 'ice box',
        actualKind: 'ice box',
        ox: x,
        oy: y,
        contents: [],
        cknown: true,
    };
}

function putObjectInContainer(container, obj) {
    obj.contained = true;
    obj.container = container;
    delete obj.letter;
    delete obj.line;
    delete obj.ox;
    delete obj.oy;
    container.contents = [...(container.contents || []), obj];
    return obj;
}

function assertBillRowsFor(shkp, objects) {
    assert.equal(shkp.billct, objects.length);
    assert.deepEqual(
        new Set(shkp.bill.map(entry => String(entry.bo_id))),
        new Set(objects.map(obj => String(obj.id))),
    );
    for (const obj of objects) {
        const entry = shop.shopBillEntryForObject(shkp, obj);
        assert.ok(entry);
        assert.equal(obj.unpaid, true);
        assert.equal(obj.unpaidPrice, shop.shopBillEntryTotal(entry));
    }
}

test('picked shop item enters the bill before inventory display compatibility', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(1001, 'a');
    const carried = { ...floorObj, line: 'a - a food ration' };
    const result = shop.addPickedObjectToShopBill(floorObj, carried);

    assert.ok(result.price > 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shkp.bill[0].bo_id, String(carried.id));
    assert.equal(carried.unpaid, true);
    assert.match(carried.line, /unpaid, \d+ zorkmids?/);
});

test('dropping unpaid non-container merchandise in the shop returns it to the bill', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(1001, 'a');
    const carried = { ...floorObj, line: 'a - a food ration' };
    shop.addPickedObjectToShopBill(floorObj, carried);

    const returned = { ...carried, ox: 5, oy: 5 };
    assert.equal(shop.sellobjReturnUnpaidToShop(returned, 5, 5), true);
    assert.equal(shkp.billct, 0);
    assert.equal(returned.unpaid, false);
    assert.doesNotMatch(returned.line, /unpaid/);
});

test('multiple bill entries can be removed by object or saved bill id', () => {
    const { shkp } = installShopState();
    const first = foodRation(2001, 'a');
    const second = foodRation(2002, 'b');

    shop.addObjectToShopBill(shkp, first, 45);
    shop.addObjectToShopBill(shkp, second, 45);
    assert.equal(shkp.billct, 2);
    assert.equal(shkp.bill.reduce((sum, entry) => sum + shop.shopBillEntryTotal(entry), 0), 90);

    assert.equal(shop.removeObjectFromShopBill(shkp, first), true);
    assert.equal(shop.removeObjectFromShopBillById(shkp, second.id), true);
    assert.equal(shkp.billct, 0);
});

test('shop-created carried objects use the same ledger representation', () => {
    const { shkp } = installShopState();
    const hornCreated = foodRation(3001, 'c');
    const bill = shop.addObjectToShopBill(shkp, hornCreated, 45);

    assert.ok(bill);
    assert.equal(hornCreated.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, hornCreated), bill);
    assert.equal(shop.shopBillEntryTotal(bill), 45);
});

test('normal unpaid charged tool use adds debit without changing the bill row', () => {
    const { shkp } = installShopState();
    const bag = chargedTool(3051, 'bag of tricks', 'b', 3);
    game.inventory = [bag];
    shop.addObjectToShopBill(shkp, bag, 100);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(bag, messages);

    assert.equal(fee, 20);
    assert.equal(shkp.debit, 20);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, bag);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(bag.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Usage fee, 20 zorkmids/);
});

test('alternate unpaid horn emptying charges full use fee', () => {
    const { shkp } = installShopState();
    const horn = chargedTool(3061, 'horn of plenty', 'h', 4);
    game.inventory = [horn];
    shop.addObjectToShopBill(shkp, horn, 50);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(horn, messages, { altusage: true, chargeCount: 4 });

    assert.equal(fee, 50);
    assert.equal(shkp.debit, 50);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, horn).useup, false);
    assert.match(messages[0], /Emptying that will cost you 50 zorkmids/);
});

test('charged instrument use follows C quarter-price rule when more than one charge remains', () => {
    const { shkp } = installShopState();
    const drum = chargedTool(3071, 'drum of earthquake', 'd', 3);
    game.inventory = [drum];
    shop.addObjectToShopBill(shkp, drum, 100);

    const fee = shop.checkUnpaidUsageForTest(drum, []);

    assert.equal(fee, 25);
    assert.equal(shkp.debit, 25);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, drum).useup, false);
});

test('unpaid wand use with more than one charge follows C quarter-price rule', () => {
    const { shkp } = installShopState();
    const wand = cancellationWand(3082, 'w');
    wand.spe = 3;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(wand, messages);

    assert.equal(fee, 25);
    assert.equal(shkp.debit, 25);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Usage fee, 25 zorkmids/);
});

test('unpaid wand use with one charge bills full item price', () => {
    const { shkp } = installShopState();
    const wand = cancellationWand(3083, 'w');
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(wand, messages);

    assert.equal(fee, 100);
    assert.equal(shkp.debit, 100);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Usage fee, 100 zorkmids/);
});

test('unpaid wand use with no charges is not billed for usage', () => {
    const { shkp } = installShopState();
    const wand = cancellationWand(3084, 'w');
    wand.spe = 0;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(wand, messages);

    assert.equal(fee, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, true);
    assert.equal(messages.length, 0);
});

test('unpaid camera grease and tinning kit use charge one tenth price', () => {
    for (const [index, kind] of ['expensive camera', 'can of grease', 'tinning kit'].entries()) {
        const { shkp } = installShopState();
        const tool = chargedTool(3091 + index, kind, 't', 4);
        game.inventory = [tool];
        shop.addObjectToShopBill(shkp, tool, 100);
        const messages = [];

        const fee = shop.checkUnpaidUsageForTest(tool, messages);

        assert.equal(fee, 10, kind);
        assert.equal(shkp.debit, 10, kind);
        assert.equal(shkp.billct, 1, kind);
        const entry = shop.shopBillEntryForObject(shkp, tool);
        assert.ok(entry, kind);
        assert.equal(entry.useup, false, kind);
        assert.equal(shop.shopBillEntryTotal(entry), 100, kind);
        assert.equal(tool.unpaid, true, kind);
        assert.equal(messages.length, 1, kind);
        assert.match(messages[0], /Usage fee, 10 zorkmids/, kind);
    }
});

test('unpaid spellbook study usage charges four fifths of bill price', () => {
    const { shkp } = installShopState();
    const book = healingSpellbook(3093, 'b');
    game.inventory = [book];
    shop.addObjectToShopBill(shkp, book, 100);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(book, messages);

    assert.equal(fee, 80);
    assert.equal(shkp.debit, 80);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /This is no free library/);
    assert.match(messages[0], /80 zorkmids/);
});

test('completing study of an unpaid spellbook bills library usage and keeps live bill row', async () => {
    const { shkp } = installCommandShopState();
    const book = healingSpellbook(3099, 'b');
    book.blessed = true;
    game.inventory = [book];
    game.nhDisplay = { cols: 200 };
    shop.addObjectToShopBill(shkp, book, 100);

    await rhack('r');

    assert.equal(game._command_mode, 'readObject');
    assert.match(game._pending_message, /What do you want to read\? \[b or \?\*\]/);

    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /You begin to memorize the runes\./);
    assert.ok(game._spellbook_study_occupation);
    assert.equal(shkp.debit || 0, 0);

    await processSpellbookStudyOccupation();
    await processSpellbookStudyOccupation();

    assert.equal(game._spellbook_study_occupation, null);
    assert.equal(shkp.debit, 80);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, true);
    assert.equal(book.known, true);
    assert.equal(game._known_spells?.some(spell => spell.name === 'healing'), true);
    assert.match(`${game._pending_message || ''} ${game._topline_after_more || ''}`, /You learn the "healing" spell\./);
    assert.match(`${game._pending_message || ''} ${game._topline_after_more || ''}`, /This is no free library/);
    assert.match(`${game._pending_message || ''} ${game._topline_after_more || ''}`, /80 zorkmids/);
});

test('applying unpaid can of grease bills usage and greases the selected object', async () => {
    const { shkp } = installCommandShopState();
    const grease = chargedTool(3094, 'can of grease', 'g', 4);
    const target = dagger(3095, 'd');
    game.inventory = [grease, target];
    shop.addObjectToShopBill(shkp, grease, 100);

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\?/);

    await rhack('g');

    assert.equal(game._command_mode, 'greaseObject');
    assert.equal(game._apply_grease_letter, 'g');
    assert.match(game._pending_message, /What do you want to grease\? \[- gd or \?\*\]/);
    assert.equal(grease.spe, 4);
    assert.equal(shkp.debit || 0, 0);

    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(grease.spe, 3);
    assert.equal(target.greased, true);
    assert.match(target.line, /greased/);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, grease);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(grease.unpaid, true);
    assert.match(game._pending_message, /Usage fee, 10 zorkmids/);
    assert.match(game._pending_message, /You cover a dagger with a thick layer of grease/);
});

test('grease target selection rejects inaccessible worn equipment without spending a charge', async () => {
    const { shkp } = installCommandShopState();
    const grease = chargedTool(3096, 'can of grease', 'g', 4);
    const cloak = {
        id: 3097,
        cls: 'armor',
        glyph: '[',
        kind: 'cloak of displacement',
        actualKind: 'cloak of displacement',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'c',
        line: 'c - a +0 cloak of displacement (being worn)',
        worn: true,
    };
    const suit = {
        id: 3098,
        cls: 'armor',
        glyph: '[',
        kind: 'ring mail',
        actualKind: 'ring mail',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'r',
        line: 'r - a +0 ring mail (being worn)',
        worn: true,
    };
    game.inventory = [grease, cloak, suit];
    shop.addObjectToShopBill(shkp, grease, 100);

    await rhack('a');
    await rhack('g');

    assert.equal(game._command_mode, 'greaseObject');
    assert.match(game._pending_message, /What do you want to grease\? \[- gc or \?\*\]/);

    await rhack('r');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(grease.spe, 4);
    assert.equal(suit.greased, undefined);
    assert.equal(shkp.debit || 0, 0);
    assert.match(game._pending_message, /You need to take off your \+0 cloak of displacement to grease your \+0 ring mail\./);
});

test('unpaid charged object with no remaining charges is not billed for usage', () => {
    const { shkp } = installShopState();
    const bag = chargedTool(3081, 'bag of tricks', 'b', 0);
    game.inventory = [bag];
    shop.addObjectToShopBill(shkp, bag, 100);

    const fee = shop.checkUnpaidUsageForTest(bag, []);

    assert.equal(fee, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, bag).useup, false);
});

test('costly tin opens one carried unpaid tin from a stack', () => {
    const { shkp } = installShopState();
    const stack = tin(3091, 't', 2);
    game.inventory = [stack];
    const unitPrice = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);
    shop.addObjectToShopBill(shkp, stack, unitPrice * 2);

    const opened = shop.costlyTinForTest(stack, { floorObject: false, alterType: 'open' });

    assert.notEqual(opened, stack);
    assert.equal(game.inventory.includes(stack), true);
    assert.equal(game.inventory.includes(opened), true);
    assert.equal(stack.quan, 1);
    assert.equal(opened.quan, 1);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, unitPrice);
    assert.notEqual(opened.unpaid, true);
    assert.equal(opened.unpaidPrice, undefined);
    assert.equal(shkp.billct, 2);
    const live = shop.shopBillEntryForObject(shkp, stack);
    const used = shop.shopBillEntryForObject(shkp, opened);
    assert.ok(live);
    assert.ok(used);
    assert.equal(live.useup, false);
    assert.equal(used.useup, true);
    assert.equal(shop.shopBillEntryTotal(live), unitPrice);
    assert.equal(shop.shopBillEntryTotal(used), unitPrice);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(opened.id)), true);
});

test('costly tin opens one shop-floor tin from a stack', () => {
    const { shkp } = installShopState();
    const stack = tin(3092, undefined, 2);
    delete stack.letter;
    delete stack.line;
    game.level.objects = [stack];
    const unitPrice = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);

    const opened = shop.costlyTinForTest(stack, { floorObject: true, alterType: 'open' });

    assert.notEqual(opened, stack);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(game.level.objects.includes(opened), true);
    assert.equal(stack.quan, 1);
    assert.equal(opened.quan, 1);
    assert.equal(opened.no_charge, true);
    assert.notEqual(opened.unpaid, true);
    assert.notEqual(stack.unpaid, true);
    assert.notEqual(stack.no_charge, true);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, opened);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), unitPrice);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(opened.id)), true);
});

test('costly tin ignores no-charge shop-floor tins', () => {
    const { shkp } = installShopState();
    const floorTin = tin(3093, undefined, 2);
    delete floorTin.letter;
    delete floorTin.line;
    floorTin.no_charge = true;
    game.level.objects = [floorTin];

    const opened = shop.costlyTinForTest(floorTin, { floorObject: true, alterType: 'open' });

    assert.equal(opened, floorTin);
    assert.equal(floorTin.quan, 2);
    assert.equal(floorTin.no_charge, true);
    assert.notEqual(floorTin.unpaid, true);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
});

test('first bite of unpaid carried food stack splits live and used-up bill rows', () => {
    const { shkp } = installShopState();
    const stack = foodRation(3101, 'a');
    stack.quan = 2;
    stack.line = 'a - 2 food rations';
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 90);

    const touched = shop.touchFoodForBiteTest(stack, false);

    assert.notEqual(touched, stack);
    assert.equal(game.inventory.includes(touched), true);
    assert.equal(stack.quan, 1);
    assert.equal(touched.quan, 1);
    assert.equal(touched.oeaten, 800);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 45);
    assert.match(stack.line, /unpaid, 45 zorkmids/);
    assert.notEqual(touched.unpaid, true);
    assert.equal(touched.unpaidPrice, undefined);
    assert.equal(shkp.billct, 2);
    const live = shop.shopBillEntryForObject(shkp, stack);
    const bite = shop.shopBillEntryForObject(shkp, touched);
    assert.ok(live);
    assert.ok(bite);
    assert.equal(live.useup, false);
    assert.equal(bite.useup, true);
    assert.equal(shop.shopBillEntryTotal(live), 45);
    assert.equal(shop.shopBillEntryTotal(bite), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(touched.id)), true);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(entry => entry.billPortion === 'fullyUsedUp' && entry.price === 45), true);
    assert.equal(debts.some(entry => entry.billPortion === 'intact' && entry.price === 45), true);
});

test('repeated bite touch on partly eaten food does not double bill', () => {
    const { shkp } = installShopState();
    const ration = foodRation(3111, 'a');
    game.inventory = [ration];
    shop.addObjectToShopBill(shkp, ration, 45);

    const touched = shop.touchFoodForBiteTest(ration, false);
    const again = shop.touchFoodForBiteTest(touched, false);

    assert.equal(again, touched);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, touched);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal((game._usedUpShopBills || []).filter(bill => String(bill.bo_id) === String(touched.id)).length, 1);
});

test('first bite of shop-floor food stack bills only the touched unit', () => {
    const { shkp } = installShopState();
    const floor = foodRation(3121);
    floor.quan = 2;
    delete floor.letter;
    delete floor.line;
    game.level.objects = [floor];
    const expected = shop.shopItemPrice({ ...floor, quan: 1 }, 5, 5);

    const touched = shop.touchFoodForBiteTest(floor, true);

    assert.equal(touched, floor);
    assert.equal(floor.quan, 1);
    assert.equal(floor.oeaten, 800);
    assert.equal(floor.no_charge, true);
    assert.notEqual(floor.unpaid, true);
    const rest = game.level.objects.find(obj => obj !== floor && obj.kind === 'food ration');
    assert.ok(rest);
    assert.equal(rest.quan, 1);
    assert.notEqual(rest.unpaid, true);
    assert.notEqual(rest.no_charge, true);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, floor);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expected);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(floor.id)), true);
});

test('shop pickup merge rejects unpaid into paid and combines compatible unpaid bills', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(4001, 'b');
    const paidStack = foodRation(4002, 'a');

    assert.deepEqual(
        shop.mergePickedObjectIntoShopBill(floorObj, paidStack, 45),
        { canMerge: false, price: 45, billEntry: null },
    );
    assert.equal(paidStack.unpaid, undefined);
    assert.equal(shkp.billct, 0);

    const unpaidStack = foodRation(4003, 'c');
    shop.addObjectToShopBill(shkp, unpaidStack, 45);
    const result = shop.mergePickedObjectIntoShopBill(floorObj, unpaidStack, 45);

    assert.equal(result.canMerge, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, unpaidStack), result.billEntry);
    assert.equal(result.billEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(result.billEntry), 90);
    assert.equal(unpaidStack.unpaidPrice, 90);
});

test('paid saleable shop drop computes C-style sale offer and transfers cash on accept', () => {
    const { shkp } = installShopState();
    const dropped = dagger(5001);
    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(shop.shopSaleableObject(shkp, dropped), true);
    assert.equal(shop.shopSaleOffer(dropped, shkp), 2);
    assert.equal(sale.prompt, true);
    assert.equal(sale.offer, 2);

    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, /receive 2 gold pieces/);
    assert.equal(shkp.minvent[0].quan, 98);
    assert.equal(shop.shopkeeperCash(shkp), 98);
    assert.equal(game._goldCount, 2);
    assert.equal(dropped.no_charge, undefined);
});

test('declining a paid shop sale marks the floor object no-charge', () => {
    installShopState();
    const dropped = dagger(5002);
    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);
    const message = shop.finishDroppedObjectSale({ ...sale, declineMessage: 'You drop a dagger.' }, false);

    assert.equal(message, 'You drop a dagger.');
    assert.equal(dropped.no_charge, true);
    assert.equal(game._goldCount, 0);
});

test('cashless shopkeeper offers sale credit without changing hero gold', () => {
    const { shkp } = installShopState();
    shkp.minvent = [];
    const dropped = dagger(5003);
    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.credit, true);
    assert.equal(sale.offer, 1);
    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, /1 zorkmid in credit/);
    assert.equal(shkp.credit, 1);
    assert.equal(game._goldCount, 0);
    assert.equal(dropped.no_charge, undefined);
});

test('angry shopkeeper keeps a paid non-gold drop without sale prompt', () => {
    const { shkp } = installShopState();
    shkp.angry = true;
    const dropped = dagger(5004);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.angry, true);
    assert.match(sale.message, /smirks/);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.notEqual(dropped.no_charge, true);
});

test('robbed shopkeeper treats a paid non-gold drop as restock contribution', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    const dropped = dagger(5005);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.robbed, true);
    assert.equal(sale.robbedContribution, shop.shopSaleOffer(dropped, shkp));
    assert.match(sale.message, /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.notEqual(dropped.no_charge, true);
});

test('dropping gold in a shop partially pays shop debt', () => {
    const { shkp } = installShopState();
    shkp.debit = 10;
    shkp.loan = 10;
    shkp.credit = 3;

    const result = shop.sellobjDroppedGoldAt(5, 5, 4);

    assert.equal(result.donated, 4);
    assert.deepEqual(result.messages, ['Your debt is partially paid off.']);
    assert.equal(shkp.debit, 6);
    assert.equal(shkp.loan, 6);
    assert.equal(shkp.credit, 3);
});

test('dropping gold in a shop pays debt before adding credit', () => {
    const { shkp } = installShopState();
    shkp.debit = 7;
    shkp.loan = 7;
    shkp.credit = 2;

    const result = shop.sellobjDroppedGoldAt(5, 5, 12);

    assert.equal(result.donated, 12);
    assert.deepEqual(result.messages, [
        'Your debt is paid off.',
        '5 zorkmids added to your credit; total is now 7 zorkmids.',
    ]);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 7);
});

test('dropping gold in a shop establishes or adds credit without changing shopkeeper cash', () => {
    const { shkp } = installShopState();

    const established = shop.sellobjDroppedGoldAt(5, 5, 8);

    assert.deepEqual(established.messages, ['You have established 8 zorkmids credit.']);
    assert.equal(shkp.credit, 8);
    assert.equal(shop.shopkeeperCash(shkp), 100);

    const added = shop.sellobjDroppedGoldAt(5, 5, 3);

    assert.deepEqual(added.messages, ['3 zorkmids added to your credit; total is now 11 zorkmids.']);
    assert.equal(shkp.credit, 11);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('dropping gold outside a shop does not affect shop debt or credit', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    shkp.debit = 4;
    shkp.loan = 4;

    const result = shop.sellobjDroppedGoldAt(9, 5, 12);

    assert.equal(result.donated, 0);
    assert.deepEqual(result.messages, []);
    assert.equal(shkp.debit, 4);
    assert.equal(shkp.loan, 4);
    assert.equal(shkp.credit || 0, 0);
});

test('dropping gold for angry or robbed shopkeepers does not create credit', () => {
    const { shkp } = installShopState();
    shkp.angry = true;

    const angry = shop.sellobjDroppedGoldAt(5, 5, 6);

    assert.equal(angry.angry, true);
    assert.match(angry.messages.join(' '), /smirks/);
    assert.equal(shkp.credit || 0, 0);

    shkp.angry = false;
    shkp.robbed = 20;
    const robbed = shop.sellobjDroppedGoldAt(5, 5, 6);

    assert.equal(robbed.robbedContribution, 6);
    assert.match(robbed.messages.join(' '), /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.credit || 0, 0);
});

test('picking up shop-floor gold consumes shop credit before adding carried gold', () => {
    const { shkp } = installShopState();
    shkp.credit = 10;
    const gold = { cls: 'coin', otyp: 466, glyph: '$', ox: 5, oy: 5, quan: 4 };
    game.level.objects = [gold];

    const result = shop.pickUpFloorGoldObject(gold);

    assert.equal(result.picked, true);
    assert.deepEqual(result.messages, [
        '$ - 4 gold pieces.',
        'Your credit is reduced by 4 zorkmids.',
    ]);
    assert.equal(game._goldCount, 4);
    assert.equal(game.inventory[0].quan, 4);
    assert.equal(game.level.objects.includes(gold), false);
    assert.equal(shkp.credit, 6);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.loan || 0, 0);
});

test('picking up shop-floor gold erases credit then increases debt', () => {
    const { shkp } = installShopState();
    shkp.credit = 3;
    shkp.debit = 2;
    shkp.loan = 2;
    const gold = { cls: 'coin', otyp: 466, glyph: '$', ox: 5, oy: 5, quan: 8 };
    game.level.objects = [gold];

    const result = shop.pickUpFloorGoldObject(gold);

    assert.deepEqual(result.messages, [
        '$ - 8 gold pieces.',
        'Your credit is erased.',
        'Your debt increases by 5 zorkmids.',
    ]);
    assert.equal(game._goldCount, 8);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
});

test('picking up shop-floor gold creates debt when no credit exists', () => {
    const { shkp } = installShopState();
    const gold = { cls: 'coin', otyp: 466, glyph: '$', ox: 5, oy: 5, quan: 6 };
    game.level.objects = [gold];

    const result = shop.pickUpFloorGoldObject(gold);

    assert.deepEqual(result.messages, [
        '$ - 6 gold pieces.',
        'You owe Izchak 6 zorkmids.',
    ]);
    assert.equal(game._goldCount, 6);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 6);
    assert.equal(shkp.loan, 6);
});

test('dropping a paid container in a shop can sell saleable contents', () => {
    const { shkp } = installShopState();
    const bag = sack(5104, 'b');
    const blade = putObjectInContainer(bag, dagger(5105));
    bag.ox = 5;
    bag.oy = 5;
    game._goldCount = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    const expectedOffer = shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp);

    assert.equal(sale.kind, 'drop');
    assert.equal(sale.prompt, true);
    assert.equal(sale.containerSale, true);
    assert.equal(sale.topOffer, shop.shopSaleOffer(bag, shkp));
    assert.equal(sale.contentOffer, shop.shopSaleOffer(blade, shkp));
    assert.equal(sale.contentSaleCount, 1);
    assert.equal(sale.offer, expectedOffer);
    assert.match(sale.promptMessage, /bag and its contents/);
    assert.match(sale.promptMessage, /Sell them/);

    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, new RegExp(`receive ${expectedOffer} gold pieces?`));
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.equal(game._goldCount, 5 + expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), 100 - expectedOffer);
    assert.equal(shkp.billct, 0);
});

test('declining a dropped container sale marks owned contents no-charge', () => {
    const { shkp } = installShopState();
    const bag = sack(5106, 'b');
    const blade = putObjectInContainer(bag, dagger(5107));
    bag.ox = 5;
    bag.oy = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    const message = shop.finishDroppedObjectSale({ ...sale, declineMessage: 'You drop a sack.' }, false);

    assert.equal(message, 'You drop a sack.');
    assert.equal(bag.no_charge, true);
    assert.equal(blade.no_charge, true);
    assert.equal(shkp.billct, 0);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('cashless shopkeeper offers credit for dropped container contents', () => {
    const { shkp } = installShopState();
    shkp.minvent = [];
    const bag = sack(5108, 'b');
    const blade = putObjectInContainer(bag, dagger(5109));
    bag.ox = 5;
    bag.oy = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    const baseOffer = shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp);
    const expectedCredit = Math.trunc((baseOffer * 9) / 10) + (baseOffer <= 1 ? 1 : 0);

    assert.equal(sale.prompt, true);
    assert.equal(sale.credit, true);
    assert.equal(sale.offer, expectedCredit);
    assert.match(sale.promptMessage, /credit for your bag and its contents/);

    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, /credit/);
    assert.equal(shkp.credit, expectedCredit);
    assert.equal(game._goldCount, 0);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
});

test('dropped container sale donates contained gold before selling the rest', () => {
    const { shkp } = installShopState();
    const bag = sack(5110, 'b');
    const coins = putObjectInContainer(bag, goldPieces(5111, 9));
    const blade = putObjectInContainer(bag, dagger(5112));
    bag.ox = 5;
    bag.oy = 5;
    shkp.credit = 1;
    shkp.debit = 5;
    shkp.loan = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);

    assert.equal(sale.prompt, true);
    assert.equal(sale.contentOffer, shop.shopSaleOffer(blade, shkp));
    assert.equal(sale.offer, shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp));
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 5);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);

    shop.finishDroppedObjectSale(sale, false);
    assert.equal(blade.no_charge, true);
});

test('dropped container sale removes unpaid contained bill rows on decline', () => {
    const { shkp } = installShopState();
    const bag = sack(5113, 'b');
    const ration = putObjectInContainer(bag, foodRation(5114));
    bag.ox = 5;
    bag.oy = 5;
    shop.addObjectToShopBill(shkp, ration, 45);
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    assert.equal(sale.contentOffer, 0);
    const result = shop.finishDroppedObjectSale(sale, false);

    assert.match(result, /drop/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(bag.no_charge, true);
});

test('angry shopkeeper takes dropped container contents without sale or no-charge marking', () => {
    const { shkp } = installShopState();
    shkp.angry = true;
    const bag = sack(5121, 'b');
    const blade = putObjectInContainer(bag, dagger(5122));
    const ration = putObjectInContainer(bag, foodRation(5123));
    shop.addObjectToShopBill(shkp, ration, 45);

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.angry, true);
    assert.match(sale.message, /smirks/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.billct, 0);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.notEqual(ration.no_charge, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
});

test('robbed shopkeeper treats dropped container contents as restock contribution', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    const bag = sack(5131, 'b');
    const blade = putObjectInContainer(bag, dagger(5132));
    const coins = putObjectInContainer(bag, goldPieces(5133, 9));
    const ration = putObjectInContainer(bag, foodRation(5134));
    shop.addObjectToShopBill(shkp, ration, 45);

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.robbed, true);
    assert.equal(sale.robbedContribution, shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp) + 1);
    assert.match(sale.message, /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.billct, 0);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('putting paid merchandise into a shop-floor container accepts cash sale', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(5051);
    const item = dagger(5052, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [container];

    const pending = shop.beginShopFloorContainerPutSale(container, item);

    assert.equal(pending.prompt, true);
    assert.equal(pending.credit, false);
    assert.equal(pending.offer, 2);
    assert.equal(game.inventory.includes(item), true);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.contained, true);
    assert.equal(item.container, container);
    assert.notEqual(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 7);
    assert.equal(shop.shopkeeperCash(shkp), 98);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a shop-floor ice box accepts cash sale', () => {
    const { shkp } = installShopState();
    const iceBox = shopFloorIceBox(5056);
    const item = dagger(5057, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [iceBox];

    const pending = shop.beginShopFloorContainerPutSale(iceBox, item);
    assert.equal(pending.prompt, true);
    assert.equal(pending.offer, 2);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(iceBox.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.equal(game._goldCount, 7);
    assert.equal(shop.shopkeeperCash(shkp), 98);
});

test('putting paid merchandise into a shop-floor container declines cash sale', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(5061);
    const item = dagger(5062, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [container];

    const pending = shop.beginShopFloorContainerPutSale(container, item);
    const result = shop.finishShopFloorContainerPutSale(pending, false);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a shop-floor container accepts cashless credit sale', () => {
    const { shkp } = installShopState();
    shkp.minvent = [];
    const container = shopFloorContainer(5071);
    const item = dagger(5072, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [container];

    const pending = shop.beginShopFloorContainerPutSale(container, item);

    assert.equal(pending.prompt, true);
    assert.equal(pending.credit, true);
    assert.equal(pending.offer, 1);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopkeeperCash(shkp), 0);
    assert.equal(shkp.credit, 1);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a shop-floor container for an angry shopkeeper does not mark no-charge', () => {
    const { shkp } = installShopState();
    shkp.angry = true;
    const container = shopFloorContainer(5075);
    const item = dagger(5076, 'a');
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.match(result.message, /smirks/);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a robbed shop-floor container is a restock contribution', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    const container = shopFloorContainer(5077);
    const item = dagger(5078, 'a');
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.match(result.message, /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting a paid container into a shop-floor container can sell saleable contents', () => {
    const { shkp } = installShopState();
    const target = shopFloorContainer(5081);
    const bag = sack(5082, 'b');
    const blade = putObjectInContainer(bag, dagger(5083));
    game._goldCount = 5;
    game.inventory = [bag];
    game.level.objects = [target];

    const pending = shop.beginShopFloorContainerPutSale(target, bag);
    const expectedOffer = shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp);

    assert.equal(pending.prompt, true);
    assert.equal(pending.credit, false);
    assert.equal(pending.offer, expectedOffer);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(bag), false);
    assert.equal(target.contents.includes(bag), true);
    assert.equal(bag.container, target);
    assert.equal(blade.container, bag);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.notEqual(bag.unpaid, true);
    assert.notEqual(blade.unpaid, true);
    assert.equal(game._goldCount, 5 + expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), 100 - expectedOffer);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('no-charge floor merchandise is not billed when picked back up', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(6001, 'a');
    floorObj.no_charge = true;
    const carried = { ...floorObj, line: 'a - a food ration' };
    const result = shop.addPickedObjectToShopBill(floorObj, carried);

    assert.equal(result.price, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(carried.unpaid, undefined);
});

test('taking merchandise from a shop-floor container adds the carried object to the bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6101);
    const contained = putObjectInContainer(container, foodRation(6102));
    game.level.objects = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(container.contents.length, 0);
    assert.equal(game.inventory.includes(contained), true);
    assert.equal(contained.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shkp.bill[0].bo_id, String(contained.id));
    assert.equal(contained.unpaidPrice, shop.shopBillEntryTotal(shkp.bill[0]));
    assert.match(line, /unpaid, \d+ zorkmids?/);
    assert.match(contained.line, /unpaid, \d+ zorkmids?/);
});

test('taking gold from a shop-floor container charges debt and merges into hero gold', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6151);
    const contained = putObjectInContainer(container, goldPieces(6152, 12));
    const wallet = goldPieces(6153, 3);
    shkp.credit = 5;
    game._goldCount = 3;
    game.inventory = [wallet];
    game.level.objects = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(container.contents.length, 0);
    assert.equal(game._goldCount, 15);
    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], wallet);
    assert.equal(wallet.quan, 15);
    assert.equal(contained.contained, false);
    assert.equal(contained.container, null);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.match(line, /12 gold pieces/);
});

test('taking a nested shop-floor container bills recursive contents and charges contained gold', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6161);
    const bag = sack(6162);
    const ration = putObjectInContainer(bag, foodRation(6163));
    const inner = sack(6164);
    const blade = putObjectInContainer(inner, dagger(6165));
    const coins = putObjectInContainer(inner, goldPieces(6166, 12));
    putObjectInContainer(bag, inner);
    putObjectInContainer(source, bag);
    shkp.credit = 5;
    shkp.debit = 2;
    shkp.loan = 2;
    game.level.objects = [source];

    shop.removeContainedObject(source, bag);
    const line = shop.addContainerTakeoutObjectToInventory(source, bag);

    assert.equal(game.inventory.includes(bag), true);
    assertBillRowsFor(shkp, [bag, ration, inner, blade]);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 9);
    assert.equal(shkp.loan, 9);
    assert.match(line, /unpaid/);
});

test('taking no-charge contents from a shop-floor container does not bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6201);
    const contained = putObjectInContainer(container, foodRation(6202));
    contained.no_charge = true;
    game.level.objects = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(game.inventory.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.no_charge, false);
    assert.doesNotMatch(line, /unpaid/);
});

test('taking contents from a carried container does not use shop-floor billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6301);
    container.letter = 'b';
    const contained = putObjectInContainer(container, foodRation(6302));
    game.inventory = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(game.inventory.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
    assert.doesNotMatch(line, /unpaid/);
});

test('putting a whole unpaid item into a shop-floor container returns it to shop billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6401);
    const item = foodRation(6402, 'a');
    shop.addObjectToShopBill(shkp, item, 45);
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.contained, true);
    assert.equal(item.container, container);
    assert.equal(item.unpaid, false);
    assert.equal(item.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, item), null);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('putting gold into a shop-floor container pays debt before adding excess credit', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6451);
    const wallet = goldPieces(6452, 20);
    shkp.credit = 3;
    shkp.debit = 7;
    shkp.loan = 7;
    game._goldCount = 20;
    game.inventory = [wallet];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, wallet, 12);

    assert.equal(result.moved, true);
    assert.match(result.message, /Your debt is paid off/);
    assert.match(result.message, /5 zorkmids added to your credit/);
    assert.equal(game._goldCount, 8);
    assert.equal(wallet.quan, 8);
    assert.equal(container.contents.length, 1);
    assert.equal(container.contents[0].quan, 12);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 8);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('putting gold into a shop-floor container for angry or robbed shopkeepers does not donate', () => {
    const { shkp } = installShopState();
    const angryContainer = shopFloorContainer(6453);
    const angryWallet = goldPieces(6454, 20);
    shkp.angry = true;
    shkp.debit = 7;
    shkp.loan = 7;
    game._goldCount = 20;
    game.inventory = [angryWallet];
    game.level.objects = [angryContainer];

    const angry = shop.putInventoryObjectIntoContainer(angryContainer, angryWallet, 8);

    assert.equal(angry.moved, true);
    assert.match(angry.message, /smirks/);
    assert.equal(game._goldCount, 12);
    assert.equal(angryContainer.contents[0].quan, 8);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.credit || 0, 0);

    shkp.angry = false;
    shkp.robbed = 20;
    const robbedContainer = shopFloorContainer(6455);
    const robbedWallet = goldPieces(6456, 12);
    game._goldCount = 12;
    game.inventory = [robbedWallet];
    game.level.objects = [robbedContainer];

    const robbed = shop.putInventoryObjectIntoContainer(robbedContainer, robbedWallet, 5);

    assert.equal(robbed.moved, true);
    assert.match(robbed.message, /contribution/);
    assert.equal(game._goldCount, 7);
    assert.equal(robbedContainer.contents[0].quan, 5);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.credit || 0, 0);
});

test('putting a carried container with contents into a shop-floor container donates contained gold', () => {
    const { shkp } = installShopState();
    const target = shopFloorContainer(6461);
    const bag = sack(6462, 'b');
    const inner = sack(6463);
    const ration = putObjectInContainer(inner, foodRation(6464));
    const coins = putObjectInContainer(inner, goldPieces(6465, 9));
    putObjectInContainer(bag, inner);
    shkp.credit = 1;
    shkp.debit = 5;
    shkp.loan = 5;
    game.inventory = [bag];
    game.level.objects = [target];

    const prompt = shop.putInventoryObjectIntoContainer(target, bag);
    assert.equal(prompt.pendingSale.prompt, true);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(bag), false);
    assert.equal(target.contents.includes(bag), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shkp.credit, 5);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(bag.no_charge, true);
    assert.equal(inner.no_charge, true);
    assert.equal(ration.no_charge, true);
    assert.notEqual(coins.unpaid, true);
});

test('putting part of an unpaid stack into a shop-floor container reduces only the live bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6501);
    const stack = { ...dagger(6502, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, stack, 1);
    const contained = container.contents[0];
    const parentEntry = shop.shopBillEntryForObject(shkp, stack);

    assert.equal(result.moved, true);
    assert.equal(stack.quan, 2);
    assert.equal(contained.quan, 1);
    assert.notEqual(contained.id, stack.id);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, undefined);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 10);
    assert.match(stack.line, /unpaid, 10 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('putting unpaid merchandise into an outside-shop container preserves the debt', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const container = shopFloorContainer(6601, 9, 5);
    const item = foodRation(6602, 'a');
    shop.addObjectToShopBill(shkp, item, 45);
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.unpaid, true);
    assert.equal(item.unpaidPrice, 45);
    assert.equal(shop.shopBillEntryForObject(shkp, item), shkp.bill[0]);
    assert.equal(shkp.billct, 1);
});

test('putting paid and no-charge items into a shop-floor container does not create debt', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6701);
    const paid = dagger(6702, 'd');
    const free = foodRation(6703, 'e');
    free.no_charge = true;
    game.inventory = [paid, free];
    game.level.objects = [container];

    const paidPrompt = shop.putInventoryObjectIntoContainer(container, paid);
    assert.equal(paidPrompt.moved, false);
    assert.equal(paidPrompt.pendingSale.prompt, true);
    assert.equal(shop.finishShopFloorContainerPutSale(paidPrompt.pendingSale, false).moved, true);
    assert.equal(shop.putInventoryObjectIntoContainer(container, free).moved, true);

    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.notEqual(paid.unpaid, true);
    assert.notEqual(free.unpaid, true);
    assert.equal(paid.no_charge, true);
    assert.equal(free.no_charge, true);
    assert.equal(game._goldCount, 0);
});

test('shop-floor container put-in does not merge no-charge goods into chargeable stacks', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6801);
    const stocked = { ...dagger(6802), letter: undefined, line: undefined };
    const paid = dagger(6803, 'd');
    container.contents = [stocked];
    stocked.contained = true;
    stocked.container = container;
    game.inventory = [paid];
    game.level.objects = [container];

    const prompt = shop.putInventoryObjectIntoContainer(container, paid);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.moved, true);
    assert.equal(container.contents.length, 2);
    assert.equal(stocked.no_charge, undefined);
    assert.equal(paid.no_charge, true);
    assert.equal(shkp.billct, 0);
});

test('tipping merchandise from a shop-floor container to the floor returns it to shop stock', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6901);
    const contained = putObjectInContainer(container, foodRation(6902));
    game.level.objects = [container];

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /Objects spill|An object spills/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(contained.ox, 5);
    assert.equal(contained.oy, 5);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('tipping no-charge contents from a shop-floor container clears no-charge without billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6911);
    const contained = putObjectInContainer(container, foodRation(6912));
    contained.no_charge = true;
    game.level.objects = [container];

    shop.tipContainerToFloor(container);

    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.no_charge, false);
});

test('tipping lost merchandise from a cursed shop-floor magic bag charges debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6916);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6917));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.length, 0);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping unpaid lost merchandise from a cursed shop-floor magic bag removes bill row and consumes credit first', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6918);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(6919));
    shop.addObjectToShopBill(shkp, ration, 45);
    shkp.credit = 10;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 35 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 35);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping lost merchandise from a cursed shop-floor magic bag routes angry shopkeeper value to robbed', () => {
    const { shkp } = installShopState();
    initRng(17);
    shkp.angry = true;
    const source = bagOfHolding(6920);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6923));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(shkp.robbed, expected);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.notEqual(blade.no_charge, true);
});

test('tipping no-charge lost contents from a cursed shop-floor magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6924);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6925));
    blade.no_charge = true;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting a cancellation wand into an empty shop-floor magic bag leaves the destroyed bag on the bill', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(6928);
    const wand = cancellationWand(6929);
    source.ox = 5;
    source.oy = 5;
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);
    const cashBefore = shop.shopkeeperCash(shkp);

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.moved, true);
    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(result.pendingSale, undefined);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(game.level.objects.includes(source), false);
    assert.notEqual(wand.no_charge, true);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
});

test('shop-floor magic bag explosion charges contents destroyed by the bag blast as lost merchandise', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = bagOfHolding(6930);
    const wand = cancellationWand(6934);
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6935));
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);
    const expectedBladePrice = shop.shopItemPrice(blade, 5, 5);
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.level.objects.includes(source), false);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.debit, expectedBladePrice);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
});

test('unpaid cancellation wand that explodes a shop-floor magic bag remains as a used-up bill row', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(6936);
    const wand = cancellationWand(6937);
    source.ox = 5;
    source.oy = 5;
    shop.addObjectToShopBill(shkp, wand, 45);
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.inventory.includes(wand), false);
    assert.notEqual(wand.unpaid, true);
    assert.equal(wand.unpaidPrice, undefined);
    const wandEntry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(wandEntry);
    assert.equal(wandEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(wandEntry), 45);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shkp.billct, 2);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(wand.id)), true);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
});

test('tipping unpaid lost contents from a carried cursed magic bag converts the bill to debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6938);
    source.cursed = true;
    const ration = putObjectInContainer(source, foodRation(6939));
    shop.addObjectToShopBill(shkp, ration, 45);
    shkp.credit = 10;
    game.inventory = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 35 zorkmids? for lost merchandise/);
    assert.equal(source.contents.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 35);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('paid carried container lost from a cursed magic bag preserves nested unpaid contents as used-up bills', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6940);
    const inner = sack(6941);
    const ration = putObjectInContainer(inner, foodRation(6942));
    source.cursed = true;
    putObjectInContainer(source, inner);
    shop.addObjectToShopBill(shkp, ration, 45);
    game.inventory = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, ration);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.notEqual(ration.unpaid, true);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(ration.id)), true);
});

test('carried magic bag explosion converts unpaid contents destroyed by the blast to debt', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = bagOfHolding(6943);
    const wand = cancellationWand(6944);
    const blade = putObjectInContainer(source, dagger(6945));
    const expected = 45;
    shop.addObjectToShopBill(shkp, blade, expected);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
});

test('unpaid carried magic bag destroyed by its own explosion remains as a used-up bill', () => {
    const { shkp } = installShopState();
    initRng(1);
    const source = bagOfHolding(6946);
    const wand = cancellationWand(6947);
    shop.addObjectToShopBill(shkp, source, 100);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.inventory.includes(source), false);
    assert.notEqual(source.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(source.id)), true);
});

test('carried magic bag scatter break preserves unpaid destroyed contents as used-up bills', () => {
    const { shkp } = installShopState();
    initRng(1);
    const source = bagOfHolding(6948);
    const wand = cancellationWand(6949);
    const thrownEgg = putObjectInContainer(source, egg(6950));
    shop.addObjectToShopBill(shkp, thrownEgg, 45);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.level.objects.includes(thrownEgg), false);
    assert.notEqual(thrownEgg.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, thrownEgg);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(thrownEgg.id)), true);
});

test('carried magic bag scatter splits unpaid stacks before preserving used-up bills', () => {
    const { shkp } = installShopState();
    initRng(1);
    const source = bagOfHolding(6951);
    const wand = cancellationWand(6952);
    const eggs = putObjectInContainer(source, egg(6953, 'e', 2));
    shop.addObjectToShopBill(shkp, eggs, 90);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(source.contents.length, 0);
    assert.equal(game.level.objects.some(obj => obj.kind === 'egg'), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 2);
    assert.equal(shkp.bill.every(entry => entry.useup), true);
    assert.equal(shkp.bill.reduce((sum, entry) => sum + shop.shopBillEntryTotal(entry), 0), 90);
    const originalEntry = shop.shopBillEntryForObject(shkp, eggs);
    assert.ok(originalEntry);
    assert.equal(originalEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(originalEntry), 45);
});

test('carried magic bag scatter into lava preserves unpaid landing destruction as used-up bill', () => {
    const { shkp } = installShopState();
    initRng(2);
    game.level.at = (x, y) => ({
        typ: x === 5 && y === 5 ? ROOM : LAVAPOOL,
        roomno: x === 5 && y === 5 ? ROOMOFFSET : 0,
        doormask: 0,
    });
    const source = bagOfHolding(6957);
    const wand = cancellationWand(6958);
    const ration = putObjectInContainer(source, foodRation(6959));
    shop.addObjectToShopBill(shkp, ration, 45);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.level.objects.includes(ration), false);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, ration);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(ration.id)), true);
});

test('unpaid trigger object destroyed by tipping into a carried magic bag remains as a used-up bill', () => {
    const { shkp } = installShopState();
    const source = sack(6954);
    const target = bagOfHolding(6955);
    const wand = putObjectInContainer(source, cancellationWand(6956));
    shop.addObjectToShopBill(shkp, wand, 45);
    game.u.uhp = 100;
    game.inventory = [source, target];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(source.contents.length, 0);
    assert.notEqual(wand.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
});

test('tipping contents from a carried container does not use shop-floor billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6921);
    container.letter = 'b';
    const contained = putObjectInContainer(container, foodRation(6922));
    game.inventory = [container];

    shop.tipContainerToFloor(container);

    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
});

test('tipping a non-floor container with stale shop coordinates does not bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6926);
    const contained = putObjectInContainer(container, foodRation(6927));

    shop.tipContainerToFloor(container);

    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
});

test('tipping merchandise from a shop-floor container into another container keeps the bill with the moved object', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6931);
    const target = shopFloorContainer(6932);
    target.letter = 'b';
    const contained = putObjectInContainer(source, dagger(6933));
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(contained), true);
    assert.equal(contained.container, target);
    assert.equal(contained.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].bo_id, String(contained.id));
    assert.equal(contained.unpaidPrice, shop.shopBillEntryTotal(shkp.bill[0]));
});

test('tipping nested shop-floor container into a carried container bills recursive contents and charges contained gold', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6936);
    const target = sack(6937, 'b');
    const bag = sack(6938);
    const inner = sack(6939);
    const blade = putObjectInContainer(inner, dagger(6940));
    const coins = putObjectInContainer(inner, goldPieces(6941, 6));
    putObjectInContainer(bag, inner);
    putObjectInContainer(source, bag);
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(target.contents.includes(bag), true);
    assert.equal(bag.container, target);
    assertBillRowsFor(shkp, [bag, inner, blade]);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.credit, 4);
    assert.equal(shkp.debit, 2);
    assert.equal(shkp.loan, 2);
});

test('tipping gold from a shop-floor container to the floor charges then donates it', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6941);
    const contained = putObjectInContainer(container, goldPieces(6942, 6));
    const wallet = goldPieces(6943, 4);
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game._goldCount = 4;
    game.inventory = [wallet];
    game.level.objects = [container];

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /spills/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(contained.ox, 5);
    assert.equal(contained.oy, 5);
    assert.equal(game._goldCount, 4);
    assert.equal(wallet.quan, 4);
    assert.equal(shkp.credit, 8);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping nested shop-floor container to the floor charges then donates contained gold and returns bill rows', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6946);
    const bag = sack(6947);
    const inner = sack(6948);
    const blade = putObjectInContainer(inner, dagger(6949));
    const coins = putObjectInContainer(inner, goldPieces(6950, 6));
    putObjectInContainer(bag, inner);
    putObjectInContainer(source, bag);
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /spills/);
    assert.equal(game.level.objects.includes(bag), true);
    assert.equal(bag.ox, 5);
    assert.equal(bag.oy, 5);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.notEqual(bag.unpaid, true);
    assert.notEqual(inner.unpaid, true);
    assert.notEqual(blade.unpaid, true);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.credit, 8);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
});

test('tipping gold from a shop-floor container into a carried container only charges it', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6951);
    const target = shopFloorContainer(6952);
    const contained = putObjectInContainer(source, goldPieces(6953, 6));
    const wallet = goldPieces(6954, 4);
    target.letter = 'b';
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game._goldCount = 4;
    game.inventory = [target, wallet];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(contained), true);
    assert.equal(contained.container, target);
    assert.equal(contained.ox, undefined);
    assert.equal(contained.oy, undefined);
    assert.equal(game._goldCount, 4);
    assert.equal(wallet.quan, 4);
    assert.equal(shkp.credit, 4);
    assert.equal(shkp.debit, 2);
    assert.equal(shkp.loan, 2);
    assert.equal(shkp.billct, 0);
});

test('tipping lost merchandise from a cursed shop-floor magic bag into another container charges debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6956);
    const target = sack(6957, 'b');
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6958));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(blade), false);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
});

test('non-food pickup merges compatible paid inventory stacks', () => {
    installShopState();
    const carried = dagger(7001, 'd');
    const floorObj = { ...dagger(7002), letter: undefined, line: undefined };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 0);
    assert.equal(merge.target, carried);
    const message = shop.mergePickedObjectIntoInventory(floorObj, carried);

    assert.equal(carried.quan, 2);
    assert.match(carried.line, /^d - 2 \+0 daggers/);
    assert.match(message, /2 in total/);
});

test('non-food shop pickup merge rejects unpaid into paid stacks', () => {
    const { shkp } = installShopState();
    const paidStack = dagger(7101, 'd');
    const floorObj = { ...dagger(7102), letter: undefined, line: undefined };
    game.inventory = [paidStack];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorObj, 5), null);
    assert.equal(paidStack.quan, 1);
    assert.equal(shkp.billct, 0);
});

test('non-food shop pickup merge combines compatible unpaid bill entries', () => {
    const { shkp } = installShopState();
    const unpaidStack = dagger(7201, 'd');
    shop.addObjectToShopBill(shkp, unpaidStack, 5);
    game.inventory = [unpaidStack];
    const floorObj = { ...dagger(7202), letter: undefined, line: undefined };

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 5);
    assert.equal(merge.target, unpaidStack);
    shop.mergePickedObjectIntoInventory(floorObj, unpaidStack);

    assert.equal(unpaidStack.quan, 2);
    assert.equal(unpaidStack.unpaidPrice, 10);
    assert.equal(shop.shopBillEntryTotal(merge.billMerge.billEntry), 10);
    assert.match(unpaidStack.line, /unpaid, 10 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('split shop bill entry preserves parent and child unit prices', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(8001, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, parent, 15);
    const child = { ...parent, id: 8002, quan: 1, letter: 'e', line: 'e - a +0 dagger' };

    const childEntry = shop.splitShopBillEntry(shkp, parent, child, 1);
    const parentEntry = shop.shopBillEntryForObject(shkp, parent);

    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(parent.unpaidPrice, 10);
    assert.equal(childEntry.bo_id, String(child.id));
    assert.equal(childEntry.bquan, 1);
    assert.equal(childEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(childEntry), 5);
    assert.equal(child.unpaidPrice, 5);
    assert.equal(shkp.billct, 2);
});

test('returning a split unpaid child leaves the parent bill entry intact', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(8101, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, parent, 15);
    const child = { ...parent, id: 8102, quan: 1, letter: 'e', line: 'e - a +0 dagger' };
    shop.splitShopBillEntry(shkp, parent, child, 1);

    assert.equal(shop.sellobjReturnUnpaidToShop(child, 5, 5), true);

    const parentEntry = shop.shopBillEntryForObject(shkp, parent);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, child), null);
    assert.equal(child.unpaid, false);
    assert.equal(shkp.billct, 1);
});

test('unpaid return keeps used-up residual bill quantity when live stack shrank', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8201, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 1;
    stack.line = 'd - a +0 dagger (unpaid, 15 zorkmids)';

    assert.equal(shop.sellobjReturnUnpaidToShop(stack, 5, 5), true);

    assert.equal(stack.unpaid, false);
    assert.doesNotMatch(stack.line, /unpaid/);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.notEqual(String(shkp.bill[0].bo_id), String(stack.id));
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shkp.bill[0].bquan, 2);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 10);
    assert.equal(game._usedUpShopBills.length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.equal(game._usedUpShopBills[0].price, 10);
});

test('unpaid return without matching bill does not delete unrelated ledger rows', () => {
    const { shkp } = installShopState();
    const billed = dagger(8301, 'd');
    shop.addObjectToShopBill(shkp, billed, 5);
    const orphanedSplit = {
        ...dagger(8302, 'e'),
        unpaid: true,
        unpaidPrice: 5,
        line: 'e - a +0 dagger (unpaid, 5 zorkmids)',
    };

    assert.equal(shop.sellobjReturnUnpaidToShop(orphanedSplit, 5, 5), true);

    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, billed), shkp.bill[0]);
    assert.equal(orphanedSplit.unpaid, false);
});

test('partial unpaid inventory use keeps bill total visible until return', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8401, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];

    shop.removeInventoryItem(stack, 1);

    assert.equal(stack.quan, 2);
    assert.equal(stack.unpaidPrice, 15);
    assert.match(stack.line, /^d - 2 \+0 daggers \(unpaid, 15 zorkmids\)$/);
    const entry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(entry.bquan, 3);
    assert.equal(shop.shopBillEntryTotal(entry), 15);

    assert.equal(shop.sellobjReturnUnpaidToShop(stack, 5, 5), true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shkp.bill[0].bquan, 1);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 5);
});

test('projectile split creates a separate child bill before inventory removal', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8501, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    const thrown = {
        ...stack,
        id: 8502,
        letter: undefined,
        line: undefined,
        quan: 1,
        ox: 7,
        oy: 5,
    };

    const thrownEntry = shop.splitCarriedObjectShopBill(stack, thrown, 1);
    shop.removeInventoryItem(stack, 1);

    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(stack.quan, 2);
    assert.equal(stack.unpaidPrice, 10);
    assert.match(stack.line, /^d - 2 \+0 daggers \(unpaid, 10 zorkmids\)$/);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(thrownEntry.bo_id, String(thrown.id));
    assert.equal(thrownEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(thrownEntry), 5);
    assert.equal(thrown.unpaidPrice, 5);
    assert.equal(shkp.billct, 2);
});

test('returning a thrown unpaid projectile removes only the child bill', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8601, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    const thrown = {
        ...stack,
        id: 8602,
        letter: undefined,
        line: undefined,
        quan: 1,
        ox: 5,
        oy: 5,
    };
    shop.splitCarriedObjectShopBill(stack, thrown, 1);
    shop.removeInventoryItem(stack, 1);

    assert.equal(shop.returnUnpaidObjectToShopBillOwnerAt(thrown, 5, 5), true);

    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown), null);
    assert.equal(thrown.unpaid, false);
    assert.equal(thrown.unpaidPrice, undefined);
    assert.equal(shkp.billct, 1);
});

test('projectile leaving its owning shop converts the child bill to debit', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const stack = { ...dagger(8701, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    const thrown = {
        ...stack,
        id: 8702,
        letter: undefined,
        line: undefined,
        quan: 1,
        ox: 9,
        oy: 5,
    };
    shop.splitCarriedObjectShopBill(stack, thrown, 1);
    const result = shop.resolveUnpaidProjectileShopLanding(thrown, 9, 5, { silent: true });
    shop.removeInventoryItem(stack, 1);

    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(result.charged, true);
    assert.equal(result.value, 5);
    assert.equal(shkp.debit, 5);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown), null);
    assert.equal(thrown.unpaid, false);
    assert.equal(thrown.unpaidPrice, undefined);
    assert.equal(shkp.billct, 1);
});

test('floor stacking rejects unpaid projectiles into paid stacks', () => {
    const { shkp } = installShopState();
    const paidStack = { ...dagger(8801), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const thrown = { ...dagger(8802), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, thrown, 5);
    game.level.objects = [paidStack];

    const stacked = shop.placeStackableFloorObject(thrown);

    assert.equal(stacked, thrown);
    assert.equal(game.level.objects.length, 2);
    assert.equal(paidStack.quan, 1);
    assert.equal(thrown.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown).bquan, 1);
    assert.equal(shkp.billct, 1);
});

test('floor stacking merges compatible unpaid bill rows', () => {
    const { shkp } = installShopState();
    const floorStack = { ...dagger(8901), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const thrown = { ...dagger(8902), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, floorStack, 5);
    shop.addObjectToShopBill(shkp, thrown, 5);
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(thrown);

    const floorEntry = shop.shopBillEntryForObject(shkp, floorStack);
    assert.equal(stacked, floorStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorStack.quan, 2);
    assert.equal(floorEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(floorEntry), 10);
    assert.equal(floorStack.unpaidPrice, 10);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown), null);
    assert.equal(thrown.unpaid, false);
    assert.equal(shkp.billct, 1);
});

test('payable debts split partly used stacks into used and intact bill portions', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(9001, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    game._goldCount = 20;
    shop.removeInventoryItem(stack, 1);

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].billPortion, 'partlyUsedUp');
    assert.equal(entries[0].price, 5);
    assert.equal(entries[1].billPortion, 'intact');
    assert.equal(entries[1].price, 10);

    const payment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    const bill = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(payment.cashTotal, 5);
    assert.equal(game._goldCount, 15);
    assert.equal(bill.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(bill), 10);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 10);
});

test('paying intact portion after used-up quantity clears the remaining bill row', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(9101, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    game._goldCount = 20;
    shop.removeInventoryItem(stack, 1);

    let entries = shop.collectPayableShopDebts(shkp);
    shop.finishShopPaymentSelection(shkp, [entries[0]]);
    entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'intact');

    const payment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    assert.equal(payment.cashTotal, 10);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopBillEntryForObject(shkp, stack), null);
    assert.equal(stack.unpaid, false);
    assert.equal(stack.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
});

test('paying a split stack child removes only the child ledger row', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(9201, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    const child = { ...parent, id: 9202, letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, parent, 15);
    shop.splitShopBillEntry(shkp, parent, child, 1);
    game.inventory = [parent];
    game.level.objects = [child];
    game._goldCount = 20;

    const entries = shop.collectPayableShopDebts(shkp);
    const childEntry = entries.find(entry => entry.billEntry?.bo_id === String(child.id));
    const payment = shop.finishShopPaymentSelection(shkp, [childEntry]);

    const parentEntry = shop.shopBillEntryForObject(shkp, parent);
    assert.equal(payment.cashTotal, 5);
    assert.equal(game._goldCount, 15);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, child), null);
    assert.equal(child.unpaid, false);
    assert.equal(child.unpaidPrice, undefined);
    assert.equal(shkp.billct, 1);
});

test('paying a used-up residual bill removes ledger row and tracker once', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(9301, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 1;
    stack.line = 'd - a +0 dagger (unpaid, 15 zorkmids)';
    shop.sellobjReturnUnpaidToShop(stack, 5, 5);
    game._goldCount = 20;

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'fullyUsedUp');
    assert.equal(entries[0].price, 10);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 10);
    assert.equal(game._goldCount, 10);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game._usedUpShopBills.length, 0);
});

test('shop credit offsets itemized bill rows before hero gold', () => {
    const { shkp } = installShopState();
    const ration = foodRation(9401, 'a');
    shop.addObjectToShopBill(shkp, ration, 45);
    game.inventory = [ration];
    game._goldCount = 50;
    shkp.credit = 20;

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(shop.shopPaymentCashDue(shkp, entries), 25);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 25);
    assert.equal(game._goldCount, 25);
    assert.equal(shkp.credit, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(ration.unpaid, false);
});
