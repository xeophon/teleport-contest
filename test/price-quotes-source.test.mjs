import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { recordPriceQuote, appendPriceQuote } from '../js/shk.js';
import { objectTypeIsKnown } from '../js/object_knowledge.js';
import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { initRng } from '../js/rng.js';
import { ROOM, ROOMOFFSET, SHOPBASE } from '../js/const.js';

function setup() {
    resetGame(); initRng(43);
    const shkp = { isshk: true, m_id: 1, mx: 6, my: 5, shoproom: ROOMOFFSET,
        shoptype: SHOPBASE, shknam: 'Izchak', shk: { x: 6, y: 5 }, bill: [], billct: 0,
        minvent: [{ cls: 'coin', glyph: '$', otyp: 466, quan: 1000 }] };
    Object.assign(game, { flags: {}, inventory: [], _goldCount: 0,
        u: { ux: 5, uy: 5, ulevel: 1, uhp: 10, uhpmax: 10, uhunger: 900,
            acurr: { a: [10, 10, 10, 10, 10, 10] } },
        level: { rooms: [{ rtype: SHOPBASE, resident: shkp }], monsters: [shkp], objects: [],
            at: () => ({ roomno: ROOMOFFSET, typ: ROOM, lit: true }) } });
    return shkp;
}

function potion(fields = {}) {
    const type = OBJECT_DATA.find(type => type.symbol === 'POT_HEALING');
    return { _c_otyp: type.id, cls: 'potion', kind: 'healing', appearance: 'ruby',
        letter: 'a', id: 2, quan: 1, ox: 5, oy: 5, known: true, dknown: true, ...fields };
}

test('all compiled C quote histories and buffer boundaries', () => {
    const cases = JSON.parse(readFileSync(new URL('./fixtures/oracles/price-quotes.json', import.meta.url)));
    for (const [buys, sells, name, expected] of cases) {
        setup();
        for (const price of buys) recordPriceQuote(1, price, true);
        for (const price of sells) recordPriceQuote(1, price, false);
        assert.equal(appendPriceQuote(name, 1), expected, JSON.stringify([buys, sells, name.length]));
    }
});

for (const [buys, sells, text] of [
    [[], [], 'potion'], [[20], [], 'potion {buy 20}'], [[], [8], 'potion {sell 8}'],
    [[20, 20], [8, 8], 'potion {buy 20 sell 8}'],
    [[40, 20, 30], [10, 3, 8], 'potion {buy 20-40 sell 3-10}'],
    [[0], [0], 'potion {buy 0 sell 0}'], [[40, 0], [5, 0], 'potion {buy 0-40 sell 0-5}'],
]) test(`C quote history ${JSON.stringify([buys, sells])}`, () => {
    setup();
    for (const price of buys) recordPriceQuote(1, price, true);
    for (const price of sells) recordPriceQuote(1, price, false);
    assert.equal(appendPriceQuote('potion', 1), text);
    assert.equal(appendPriceQuote('potion', 2), 'potion');
});

for (const [length, appended] of [[0, true], [245, true], [246, false], [247, false], [255, false]])
    test(`C quote append buffer boundary at ${length} bytes`, () => {
        setup(); recordPriceQuote(1, 40, true);
        const name = 'x'.repeat(length);
        assert.equal(appendPriceQuote(name, 1), name + (appended ? ' {buy 40}' : ''));
    });

test('billing records a per-unit buy quote independently of the display option', () => {
    const shkp = setup(), item = potion({ quan: 3 });
    shop.addObjectToShopBill(shkp, item, 180);
    assert.equal(appendPriceQuote('potion', item._c_otyp), 'potion {buy 60}');
    assert.equal(objectTypeIsKnown(item), false);
});

test('floor prices remember per-unit costs and no-charge prices do not replace them', () => {
    setup(); const item = potion({ quan: 3 });
    const cost = shop.shopItemPrice(item);
    assert.ok(cost > 0);
    assert.equal(shop.shopItemPriceSuffix(item), ` (for sale, ${cost} zorkmids)`);
    assert.equal(appendPriceQuote('potion', item._c_otyp), `potion {buy ${Math.trunc(cost / 3)}}`);
    item.no_charge = true;
    assert.equal(shop.shopItemPriceSuffix(item), ' (no charge)');
    assert.equal(appendPriceQuote('potion', item._c_otyp), `potion {buy ${Math.trunc(cost / 3)}}`);
});

for (const gate of ['suppress_price', 'restoring']) test(`${gate} bypasses price lookup and recording`, () => {
    setup(); const item = potion();
    if (gate === 'restoring') game.program_state = { restoring: true };
    else game.iflags = { suppress_price: true };
    assert.equal(shop.shopItemPriceSuffix(item), '');
    assert.equal(game._object_price_quotes, undefined);
});

for (const known of [false, true]) for (const option of [false, true])
    test(`ordinary inventory price history: type known=${known}, option=${option}`, async () => {
        setup(); const item = potion(); game.inventory.push(item);
        game.flags.price_quotes = option;
        if (known) game._known_object_types = [item._c_otyp];
        recordPriceQuote(item._c_otyp, 40, true);
        await rhack('i');
        const line = game._overlay_lines.find(row => row[2].startsWith('a - '))[2];
        assert.equal(line.includes('{buy 40}'), option && !known);
    });

test('a container quote totals unpaid contents and records the container type', async () => {
    const shkp = setup(), child = potion({ quan: 2 });
    const chest = { _c_otyp: OBJECT_DATA.find(type => type.symbol === 'CHEST').id,
        cls: 'tool', kind: 'chest', letter: 'b', quan: 1, contents: [child], dknown: true };
    shop.addObjectToShopBill(shkp, child, 120);
    game.inventory.push(chest);
    await rhack('i');
    assert.ok(game._overlay_lines.some(row => row[2].includes('(contents, 120 zorkmids)')));
    assert.equal(appendPriceQuote('chest', chest._c_otyp), 'chest {buy 120}');
});

test('discovery listings include known-type quotes even with price_quotes disabled', async () => {
    setup(); const item = potion();
    game._discoveries = [{ section: 'Potions', name: 'potion of healing', text: 'potion of healing (ruby)', known: true }];
    recordPriceQuote(item._c_otyp, 40, true);
    recordPriceQuote(item._c_otyp, 10, false);
    await rhack('\\');
    assert.ok(game._overlay_lines.some(row => row[2] === '  potion of healing (ruby) {buy 40 sell 10}'));
});

test('quote ranges survive saving and remain shared between objects of one type', () => {
    setup(); const item = potion();
    recordPriceQuote(item._c_otyp, 40, true);
    recordPriceQuote(item._c_otyp, 10, false);
    const saved = encodeSaveState(); resetGame(); restoreSaveState(saved);
    const other = potion({ id: 3 });
    recordPriceQuote(other._c_otyp, 50, true);
    assert.equal(appendPriceQuote('potion', item._c_otyp), 'potion {buy 40-50 sell 10}');
});

for (const credit of [false, true]) test(`only a prompted ${credit ? 'credit' : 'cash'} sale records the sell offer`, () => {
    const shkp = setup(), item = potion({ quan: 3 });
    if (credit) shkp.minvent = [];
    game.flags.price_quotes = true;
    const preview = shop.shopDroppedPaidObjectSaleInfo(item, 5, 5);
    assert.ok(preview.prompt);
    assert.equal(game._object_price_quotes, undefined);
    const sale = shop.beginDroppedPaidObjectSale(item, 5, 5);
    const price = Math.trunc(sale.offer / 3);
    assert.equal(appendPriceQuote('potion', item._c_otyp), `potion {sell ${price}}`);
    if (credit) assert.ok(sale.promptMessage.includes(`3 ruby potions {sell ${price}}`));
});
