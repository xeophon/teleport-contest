import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { classifyLoot, lootSortName, sortLoot, SORTLOOT_PACK, SORTLOOT_INVLET,
    SORTLOOT_LOOT, SORTLOOT_INUSE, SORTLOOT_PETRIFY } from '../js/inventory_sort.js';
import { W_WEP, W_QUIVER, W_SWAPWEP, W_ARM, W_ARMC, W_ARMH, W_ARMG,
    W_ARMF, W_ARMU, W_ARMS, W_AMUL, W_TOOL, W_RINGL, W_RINGR } from '../js/const.js';

const types = new Map(OBJECT_DATA.map(type => [type.symbol, type]));
function object(symbol, fields = {}) {
    return { _c_otyp: types.get(symbol).id, kind: types.get(symbol).name, ...fields };
}
const D = { blind: true, observe: item => { item.dknown = true; }, called: item => item.called,
    xname: item => item.kind, petrifies: item => item.corpsenm === 'cockatrice' };
function setup() { resetGame(); game.flags = {}; }

for (const [symbol, subclass] of [
    ['ARROW', 1], ['CROSSBOW_BOLT', 1], ['BOW', 2], ['CROSSBOW', 2], ['DART', 3],
    ['BOOMERANG', 3], ['DAGGER', 4], ['KNIFE', 4], ['JAVELIN', 4], ['LONG_SWORD', 5], ['LANCE', 6], ['HALBERD', 6],
    ['HELMET', 1], ['LEATHER_GLOVES', 2], ['LOW_BOOTS', 3], ['SMALL_SHIELD', 4],
    ['CLOAK_OF_MAGIC_RESISTANCE', 5], ['HAWAIIAN_SHIRT', 6], ['PLATE_MAIL', 7],
    ['CHEST', 1], ['BAG_OF_TRICKS', 1], ['HORN_OF_PLENTY', 3], ['MAGIC_FLUTE', 3], ['TOWEL', 4],
    ['SLIME_MOLD', 1], ['FOOD_RATION', 2], ['TIN', 3], ['EGG', 4], ['CORPSE', 5],
]) test(`C loot subclass ${symbol}`, () => {
    setup(); assert.equal(classifyLoot(object(symbol), D).subclass, subclass);
});

test('known pseudo containers move after real containers; Snickersnee sorts with polearms', () => {
    setup(); const bag = object('BAG_OF_TRICKS', { dknown: true }), horn = object('HORN_OF_PLENTY', { dknown: true });
    game._known_object_types = [bag._c_otyp, horn._c_otyp];
    assert.equal(classifyLoot(bag, D).subclass, 2); assert.equal(classifyLoot(horn, D).subclass, 2);
    assert.equal(classifyLoot(object('KATANA', { artifact: 'Snickersnee' }), D).subclass, 6);
    assert.equal(classifyLoot(object('GLOB_OF_BLACK_PUDDING', { globby: true }), D).subclass, 6);
});

for (const [symbol, seen, known, subclass] of [
    ['SAPPHIRE', false, true, 1], ['SAPPHIRE', true, false, 2], ['SAPPHIRE', true, true, 3],
    ['WORTHLESS_BLUE_GLASS', false, true, 1], ['WORTHLESS_BLUE_GLASS', true, false, 2], ['WORTHLESS_BLUE_GLASS', true, true, 4],
    ['TOUCHSTONE', false, true, 5], ['TOUCHSTONE', true, false, 6], ['TOUCHSTONE', true, true, 7], ['ROCK', true, true, 8],
]) test(`C gems do not leak hidden value: ${symbol}, seen=${seen}, known=${known}`, () => {
    setup(); const item = object(symbol, { dknown: seen });
    if (known) game._known_object_types = [item._c_otyp];
    assert.equal(classifyLoot(item, D).subclass, subclass);
});

test('discovery ordering is unseen, seen, called, known and observes before classification', () => {
    setup(); const item = object('POT_GAIN_ABILITY');
    assert.equal(classifyLoot(item, D).disco, 1);
    assert.equal(classifyLoot(item, { ...D, blind: false }).disco, 2);
    item.called = 'test'; assert.equal(classifyLoot(item, D).disco, 3);
    game._known_object_types = [item._c_otyp]; assert.equal(classifyLoot(item, D).disco, 4);
});

test('inventory letters use the complete C order and stable equal-item ties', () => {
    setup(); const letters = ['?', '#', 'Z', 'A', 'z', 'a', '$', '!'];
    const items = letters.map(letter => object('LONG_SWORD', { letter }));
    assert.deepEqual(sortLoot(items, SORTLOOT_INVLET, D).map(item => item.letter), ['$', 'a', 'z', 'A', 'Z', '#', '?', '!']);
    assert.deepEqual(items.map(item => item.letter), letters);
    assert.equal(items.every(item => !item.dknown), true);
});

test('pack plus invlet ignores subclasses while loot order uses subclass and discovery', () => {
    setup(); const sword = object('LONG_SWORD', { letter: 'a' }), arrow = object('ARROW', { letter: 'b' });
    assert.deepEqual(sortLoot([sword, arrow], SORTLOOT_PACK | SORTLOOT_INVLET, D), [sword, arrow]);
    assert.deepEqual(sortLoot([sword, arrow], SORTLOOT_LOOT, D), [arrow, sword]);
    game.flags.sortpack = false;
    const armor = object('HELMET'), potion = object('POT_GAIN_ABILITY');
    assert.deepEqual(sortLoot([sword, armor, potion], SORTLOOT_LOOT, D), [potion, sword, armor]);
    game.flags.sortpack = true; game.flags.packorder = '[)';
    assert.deepEqual(sortLoot([sword, armor, potion], SORTLOOT_LOOT, D), [armor, sword, potion]);
});

for (const [field, values, order] of [
    ['buc', [0, 1, 2, 3], [3, 2, 1, 0]], ['greased', [false, true], [true, false]],
    ['oeroded', [3, 1, 2, 0], [0, 1, 2, 3]], ['proof', [false, true], [true, false]],
    ['spe', [-1, 2, 0, -3], [2, 0, -1, -3]],
]) test(`C same-name tie break: ${field}`, () => {
    setup(); const items = values.map(value => object('LONG_SWORD', { known: true, dknown: true,
        value, ...(field === 'buc' ? { bknown: value > 0, blessed: value === 3, cursed: value === 1 }
            : field === 'proof' ? { rknown: true, oerodeproof: value } : { [field]: value }) }));
    assert.deepEqual(sortLoot(items, SORTLOOT_LOOT, D).map(item => item.value), order);
});

test('erosion uses the worse damage; unknown enchantment and unknown proof do not leak', () => {
    setup(); const a = object('LONG_SWORD', { oeroded: 1, oeroded2: 3 }), b = object('LONG_SWORD', { oeroded: 2 });
    assert.deepEqual(sortLoot([a, b], SORTLOOT_LOOT, D), [b, a]);
    a.oeroded = a.oeroded2 = b.oeroded = 0;
    a.spe = 20; a.oerodeproof = true; b.spe = 0; b.known = true;
    assert.deepEqual(sortLoot([a, b], SORTLOOT_LOOT, D), [b, a]);
    const egg = object('EGG', { spe: 5, known: true }), other = object('EGG', { spe: 0, known: true });
    assert.deepEqual(sortLoot([other, egg], SORTLOOT_LOOT, D), [other, egg]);
});

test('sort names normalize cloned state and retain C towel and glob suffixes', () => {
    setup(); const water = object('POT_WATER', { odiluted: true, blessed: true, cursed: false, oname: 'Joe', quan: 8 });
    const original = structuredClone(water);
    assert.equal(lootSortName(water, { ...D, xname: view => {
        assert.equal(view.odiluted, false); assert.equal(view.blessed, false); assert.equal(view.oname, null); assert.equal(view.quan, 1);
        return 'potion of water';
    } }), 'potion of water');
    assert.deepEqual(water, original);
    for (const [spe, suffix] of [[0, 'z'], [1, 'y'], [3, 'x']])
        assert.equal(lootSortName(object('TOWEL', { spe }), D), 'towel' + suffix);
    for (const [owt, suffix] of [[100, 'a'], [300, 'b'], [500, 'c'], [501, 'd']]) {
        const glob = object('GLOB_OF_BLACK_PUDDING', { globby: true, owt });
        assert.equal(lootSortName(glob, { ...D, xname: view => { assert.equal(view.owt, 20); return 'glob'; } }), 'glob' + suffix);
        assert.equal(glob.owt, owt);
    }
});

for (const leftHanded of [false, true]) test(`in-use ordering follows C slots, handedness=${leftHanded}`, () => {
    setup(); const masks = [W_ARMU, W_ARMF, W_ARMG, W_ARMH, W_ARMS, W_ARMC, W_ARM,
        W_QUIVER, W_SWAPWEP, W_WEP, W_TOOL, leftHanded ? W_RINGR : W_RINGL, leftHanded ? W_RINGL : W_RINGR, W_AMUL];
    const items = masks.map(owornmask => object('LONG_SWORD', { owornmask }));
    const leash = object('LEASH', { leashmon: 1 }), lamp = object('OIL_LAMP', { lamplit: true }), unused = object('LONG_SWORD');
    assert.deepEqual(sortLoot([unused, ...items, lamp, leash], SORTLOOT_INUSE | SORTLOOT_LOOT, { ...D, leftHanded }), [...items].reverse().concat(lamp, leash, unused));
    lamp.owornmask = W_WEP;
    assert.deepEqual(sortLoot([lamp, items[9]], SORTLOOT_INUSE, D), [lamp, items[9]], 'equal slots retain chain order');
});

test('filter augmentation retains petrifying corpses only and no-sort does not observe', () => {
    setup(); const ordinary = object('CORPSE', { corpsenm: 'newt' }), petrifier = object('CORPSE', { corpsenm: 'cockatrice' });
    const sword = object('LONG_SWORD');
    const items = [ordinary, petrifier, sword];
    const dependencies = { ...D, observe: () => { throw Error('unexpected observation'); } };
    assert.deepEqual(sortLoot(items, SORTLOOT_PETRIFY, dependencies, item => item === sword), [petrifier, sword]);
    assert.deepEqual(sortLoot(items, 0, dependencies, item => item === sword), [sword]);
    assert.deepEqual(sortLoot([sword], SORTLOOT_LOOT, dependencies), [sword]);
});
