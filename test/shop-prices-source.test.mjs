import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { MONS } from '../js/permonst.js';
import { shopObjectPrice } from '../js/shk.js';
import { intrinsicPossible } from '../js/eat.js';
import { __shopBillingTestHooks as shop } from '../js/cmd.js';
import { FIRE_RES, COLD_RES, POISON_RES, TELEPAT, TELEPORT, ROOM, ROOMOFFSET, SHOPBASE } from '../js/const.js';

const cases = JSON.parse(readFileSync(new URL('./fixtures/oracles/shop-prices.json', import.meta.url)));
for (const legacy of [false, true]) test(`all ${cases.length} compiled C intrinsic prices, legacy monster=${legacy}`, () => {
    resetGame(); game.u = {};
    for (const row of cases) {
        const [typeId, monster, spe, blessed, cursed, oeaten, age, hunger, buying, artifact, expected] = row;
        const type = OBJECT_DATA[typeId];
        const item = { _c_otyp: typeId, spe, blessed, cursed, oeaten, age, oartifact: artifact ? 1 : 0,
            corpsenm: legacy && monster >= 0 ? { name: MONS[monster].name, glyph: MONS[monster].sym } : monster };
        game.u.uhs = hunger;
        assert.equal(shopObjectPrice(item, !!buying, artifact || type.cost), expected, JSON.stringify(row));
    }
});

for (const [name, property, expected] of [['red dragon', FIRE_RES, true], ['red dragon', COLD_RES, false],
    ['baby red dragon', FIRE_RES, false], ['floating eye', TELEPAT, true], ['mind flayer', TELEPAT, true],
    ['master mind flayer', TELEPAT, true], ['cockatrice', POISON_RES, true], ['tengu', TELEPORT, true],
    ['newt', TELEPAT, false], ['red dragon', 999, false]])
    test(`C intrinsic_possible: ${name}, property ${property}`, () => {
        assert.equal(intrinsicPossible(property, MONS.find(mon => mon.name === name)), expected);
    });

for (const [symbol, monster, hungry, buy, sell] of [
    ['CORPSE', 'cockatrice', 1, 59, 30], ['CORPSE', 'cockatrice', 3, 177, 30],
    ['TIN', 'cockatrice', 1, 53, 27], ['EGG', 'cockatrice', 1, 57, 29],
    ['TIN', 'newt', 1, 6, 3], ['CORPSE', 'newt', 1, 7, 4],
    ['TIN', null, 1, 5, 3], ['POT_WATER', null, 1, 5, 0],
]) test(`live ${symbol} ${monster} pricing at hunger ${hungry}`, () => {
    resetGame();
    const shkp = { isshk: true, m_id: 1, shoproom: ROOMOFFSET };
    game.u = { ux: 5, uy: 5, uhs: hungry, acurr: { a: [12, 12, 12, 12, 12, 12] } };
    game.level = { rooms: [{ rtype: SHOPBASE, resident: shkp }],
        at: () => ({ typ: ROOM, roomno: ROOMOFFSET }) };
    const type = OBJECT_DATA.find(type => type.symbol === symbol);
    const item = { _c_otyp: type.id, cls: type.class === 7 ? 'food' : 'potion',
        kind: type.name, id: 1, quan: 1, known: true, dknown: true,
        corpsenm: monster ? { name: monster } : -1 };
    assert.equal(shop.shopItemPrice(item), buy);
    assert.equal(shop.shopSaleOffer(item, shkp), sell);
});
