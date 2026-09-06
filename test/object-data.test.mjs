import assert from 'node:assert/strict';
import test from 'node:test';
import { OBJECT_DATA } from '../js/object_data.js';

// objclass.h distinguishes per-object known from knowledge of a type.
// Non-enchantable rings and all potions have no per-object known payload;
// identifying a charged ring or weapon must also reveal its enchantment.
for (const [symbol, usesKnown, nameKnown, merge] of [
    ['ARROW', 1, 1, 1], ['LONG_SWORD', 1, 1, 0], ['RUNESWORD', 1, 0, 0],
    ['RIN_ADORNMENT', 1, 0, 0], ['RIN_REGENERATION', 0, 0, 0],
    ['POT_HEALING', 0, 0, 1], ['SCR_IDENTIFY', 0, 0, 1],
    ['WAN_WISHING', 1, 0, 0], ['CRYSTAL_BALL', 1, 0, 0],
    ['LENSES', 0, 1, 0], ['GOLD_PIECE', 0, 1, 1], ['LUCKSTONE', 0, 0, 1],
]) test(`canonical object metadata: ${symbol}`, () => {
    const type = OBJECT_DATA.find(type => type.symbol === symbol);
    assert.ok(type, symbol);
    assert.equal(type.usesKnown, usesKnown);
    assert.equal(type.nameKnown, nameKnown);
    assert.equal(type.merge, merge);
});

test('C object enum and initializer retain all 481 distinct entries', () => {
    assert.equal(OBJECT_DATA.length, 481);
    assert.equal(new Set(OBJECT_DATA.map(type => type.symbol)).size, 481);
    for (const [id, type] of OBJECT_DATA.entries()) {
        assert.equal(type.id, id);
        assert.equal(Object.isFrozen(type), true);
        assert.ok(Number.isInteger(type.weight) && type.weight >= 0);
        assert.ok(Number.isInteger(type.material) && type.material >= 0 && type.material <= 21);
    }
    assert.equal(Object.isFrozen(OBJECT_DATA), true);
});

test('zero-generation weapons retain source damage, weight and descriptions', () => {
    const rune = OBJECT_DATA.find(type => type.symbol === 'RUNESWORD');
    assert.equal(rune.probability, 0);
    assert.equal(rune.weight, 40);
    assert.equal(rune.description, 'runed broadsword');
    assert.deepEqual([rune.smallDamage, rune.largeDamage], [4, 6]);
    const blade = OBJECT_DATA.find(type => type.symbol === 'TSURUGI');
    assert.equal(blade.probability, 0);
    assert.equal(blade.big, 1);
    assert.deepEqual([blade.smallDamage, blade.largeDamage], [16, 8]);
});
