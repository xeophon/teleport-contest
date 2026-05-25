import assert from 'node:assert/strict';
import test from 'node:test';

import { __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { ROOMOFFSET, SHOPBASE } from '../js/const.js';

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
