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
