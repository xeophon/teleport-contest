import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { objectTypeData, objectTypeIsKnown, objectIsFullyIdentified } from '../js/object_knowledge.js';
import { artifactObjectName } from '../js/mklev.js';

function identified(symbol) {
    resetGame();
    const type = OBJECT_DATA.find(type => type.symbol === symbol);
    assert.ok(type, symbol);
    game._known_object_types = [type.id];
    return { _c_otyp: type.id, known: true, dknown: true, bknown: true, rknown: true,
        cknown: true, lknown: true };
}

for (const [item, symbol] of [
    [{ cls: 'weapon', actualKind: 'runesword', kind: 'runed broadsword' }, 'RUNESWORD'],
    [{ cls: 'armor', kind: 'pair of speed boots' }, 'SPEED_BOOTS'],
    [{ cls: 'potion', kind: 'fizzy potion', potionIndex: 10 }, 'POT_HEALING'],
    [{ cls: 'scroll', scrollIndex: 13 }, 'SCR_IDENTIFY'],
    [{ cls: 'ring', ringRoll: 1 }, 'RIN_ADORNMENT'],
    [{ cls: 'amulet', amuletIndex: 7 }, 'AMULET_OF_REFLECTION'],
    [{ cls: 'wand', wand: 'wishing' }, 'WAN_WISHING'],
    [{ cls: 'spellbook', spellName: 'force bolt' }, 'SPE_FORCE_BOLT'],
    [{ cls: 'food', kind: 'tin:spinach' }, 'TIN'],
    [{ cls: 'gem', kind: 'flint stone' }, 'FLINT'],
    [{ cls: 'coin' }, 'GOLD_PIECE'],
    [{ cls: 'potion', kind: 'holy water' }, 'POT_WATER'],
]) test(`existing JS object resolves to canonical ${symbol}`, () => {
    assert.equal(objectTypeData(item).symbol, symbol);
});

test('an untagged JS integer is never mistaken for a native C object ID', () => {
    assert.equal(objectTypeData({ otyp: 18 }), null);
    assert.equal(objectTypeData({ _c_otyp: 18 }).symbol, 'ARROW');
});

for (const symbol of ['LONG_SWORD', 'WAN_WISHING', 'RIN_ADORNMENT'])
    for (const field of ['known', 'dknown', 'bknown'])
        test(`${symbol} requires per-object ${field} knowledge`, () => {
            const item = identified(symbol); assert.equal(objectIsFullyIdentified(item), true);
            item[field] = false; assert.equal(objectIsFullyIdentified(item), false);
        });

test('gold is fully identified without per-object knowledge flags', () => {
    const item = identified('GOLD_PIECE');
    for (const field of ['known', 'dknown', 'bknown', 'rknown']) item[field] = false;
    assert.equal(objectIsFullyIdentified(item), true);
});

test('the source mail exception skips only blessing knowledge', () => {
    const item = identified('SCR_MAIL'); item.bknown = false;
    assert.equal(objectIsFullyIdentified(item), true);
    item.dknown = false; assert.equal(objectIsFullyIdentified(item), false);
});

for (const symbol of ['LARGE_BOX', 'CHEST', 'ICE_BOX', 'SACK', 'BAG_OF_HOLDING', 'BAG_OF_TRICKS', 'STATUE'])
    test(`${symbol} requires contents knowledge independently of other fields`, () => {
        const item = identified(symbol); item.cknown = false;
        assert.equal(objectIsFullyIdentified(item), false);
        item.cknown = true; item.lknown = false;
        assert.equal(objectIsFullyIdentified(item), !['LARGE_BOX', 'CHEST'].includes(symbol));
    });

for (const [symbol, vulnerable] of [['LONG_SWORD', true], ['PICK_AXE', true], ['QUARTERSTAFF', true],
    ['LEATHER_ARMOR', true], ['HELM_OF_BRILLIANCE', true], ['SILVER_SABER', false],
    ['WAN_WISHING', false], ['CRYSTAL_BALL', false], ['FOOD_RATION', false], ['POT_HEALING', false]]) {
    test(`${symbol} ${vulnerable ? 'requires' : 'does not require'} erosion-proof knowledge`, () => {
        const item = identified(symbol); item.rknown = false;
        assert.equal(objectIsFullyIdentified(item), !vulnerable);
    });
}

test('per-object known and identified type are independent', () => {
    const item = identified('RIN_ADORNMENT');
    game._known_object_types = [];
    assert.equal(objectIsFullyIdentified(item), false);
    game._discoveries = [{ section: 'Rings', name: 'ring of adornment', known: false }];
    assert.equal(objectTypeIsKnown(item), false);
    game._discoveries[0].known = true;
    assert.equal(objectIsFullyIdentified(item), true);
    item.known = false;
    assert.equal(objectTypeIsKnown(item), true);
    assert.equal(objectIsFullyIdentified(item), false);
});

test('C types without a known payload default that per-object field to true', () => {
    const item = identified('POT_HEALING'); delete item.known;
    assert.equal(objectIsFullyIdentified(item), true);
    item.known = false;
    assert.equal(objectIsFullyIdentified(item), false);
});

test('artifact personal names require artifact discovery and every applicable knowledge field', () => {
    const item = identified('LONG_SWORD'); item.artifact = 'Excalibur';
    assert.equal(objectIsFullyIdentified(item), false);
    assert.equal(artifactObjectName(item), 'long sword named Excalibur');
    game._identified_artifacts = ['Excalibur'];
    assert.equal(objectIsFullyIdentified(item), true);
    assert.equal(artifactObjectName(item), 'Excalibur');
    item.rknown = false;
    assert.equal(artifactObjectName(item), 'long sword named Excalibur');
});
