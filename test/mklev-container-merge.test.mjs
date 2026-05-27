import test from 'node:test';
import assert from 'node:assert/strict';

import { resetGame } from '../js/gstate.js';
import { add_to_container, add_to_minv } from '../js/mklev.js';

const FOOD_CLASS = 7;
const POTION_CLASS = 9;
const SCROLL_CLASS = 8;
const TOOL_CLASS = 12;
const CORPSE = 471;
const EGG = 10001;
const TIN = 10004;
const WAX_CANDLE = 371;
const POT_OIL = 252;
const MEAT_RING = 10164;

function installContainerTestGame() {
    const g = resetGame();
    g.moves = 100;
    g.flags = {};
    g.inventory = [];
    g.level = { objects: [], monsters: [], at: () => ({ typ: 1 }) };
    g.u = { ux: 5, uy: 5 };
    return g;
}

function box(contents = []) {
    return { otyp: 1000, kind: 'box', contents };
}

function food(id, kind = 'food ration', extra = {}) {
    return {
        id,
        otyp: FOOD_CLASS,
        cls: 'food',
        glyph: '%',
        kind,
        actualKind: kind,
        quan: 1,
        ...extra,
    };
}

function egg(id, name = 'newt', extra = {}) {
    return {
        id,
        otyp: EGG,
        cls: 'food',
        glyph: '%',
        kind: 'egg',
        actualKind: 'egg',
        quan: 1,
        corpsenm: { name },
        ...extra,
    };
}

function tin(id, name = 'newt', extra = {}) {
    return {
        id,
        otyp: TIN,
        cls: 'food',
        glyph: '%',
        kind: 'tin',
        actualKind: 'tin',
        quan: 1,
        corpsenm: { name },
        spe: -2,
        ...extra,
    };
}

function corpse(id, name = 'newt', extra = {}) {
    return {
        id,
        otyp: CORPSE,
        cls: 'food',
        glyph: '%',
        kind: `${name} corpse`,
        actualKind: `${name} corpse`,
        quan: 1,
        corpsenm: { name },
        ...extra,
    };
}

function scroll(id, kind = 'scroll of light', extra = {}) {
    return {
        id,
        otyp: SCROLL_CLASS,
        cls: 'scroll',
        glyph: '?',
        kind,
        actualKind: kind,
        quan: 1,
        ...extra,
    };
}

function potion(id, kind = 'potion of oil', extra = {}) {
    return {
        id,
        otyp: POT_OIL,
        cls: 'potion',
        glyph: '!',
        kind,
        actualKind: kind,
        quan: 1,
        potionIndex: 24,
        ...extra,
    };
}

function candle(id, age = 10, extra = {}) {
    return {
        id,
        otyp: WAX_CANDLE,
        cls: 'tool',
        glyph: '(',
        kind: 'wax candle',
        actualKind: 'wax candle',
        quan: 1,
        age,
        ...extra,
    };
}

function wand(id, extra = {}) {
    return {
        id,
        otyp: 10,
        cls: 'wand',
        glyph: '/',
        kind: 'wand of light',
        actualKind: 'wand of light',
        quan: 1,
        spe: 3,
        ...extra,
    };
}

function tool(id, kind = 'tin opener', extra = {}) {
    return {
        id,
        otyp: TOOL_CLASS,
        cls: 'tool',
        glyph: '(',
        kind,
        actualKind: kind,
        quan: 1,
        ...extra,
    };
}

test('add_to_container merges compatible special food and averages age', () => {
    installContainerTestGame();
    const existingEgg = egg(1, 'newt', { age: 20 });
    const sourceEgg = egg(2, 'newt', { age: 80 });
    const container = box([existingEgg]);

    const mergedEgg = add_to_container(container, sourceEgg);

    assert.equal(mergedEgg, existingEgg);
    assert.deepEqual(container.contents, [existingEgg]);
    assert.equal(existingEgg.quan, 2);
    assert.equal(existingEgg.age, 50);
    assert.equal(existingEgg.contained, true);
    assert.equal(existingEgg.container, container);

    const existingTin = tin(3, 'newt');
    const sourceTin = tin(4, 'newt');
    const tinBox = box([existingTin]);

    assert.equal(add_to_container(tinBox, sourceTin), existingTin);
    assert.equal(existingTin.quan, 2);

    const existingCorpse = corpse(5, 'newt', { age: 10 });
    const sourceCorpse = corpse(6, 'newt', { age: 50, rotAwayTurn: 200 });
    const corpseBox = box([existingCorpse]);

    assert.equal(add_to_container(corpseBox, sourceCorpse), existingCorpse);
    assert.equal(existingCorpse.quan, 2);
    assert.equal(existingCorpse.age, 30);
    assert.equal(sourceCorpse.rotAwayTurn, undefined);
});

test('add_to_container rejects hatching eggs reviver corpses and species mismatches', () => {
    installContainerTestGame();
    const existingEgg = egg(10, 'newt');
    const hatchingEgg = egg(11, 'newt', { eggHatchTurn: 130, _egg_hatch_seq: 1 });
    const eggBox = box([existingEgg]);

    assert.equal(add_to_container(eggBox, hatchingEgg), hatchingEgg);
    assert.deepEqual(eggBox.contents, [hatchingEgg, existingEgg]);
    assert.equal(existingEgg.quan, 1);
    assert.equal(hatchingEgg.eggHatchTurn, 130);

    const tinBox = box([tin(12, 'newt')]);
    const dragonTin = tin(13, 'red dragon');

    assert.equal(add_to_container(tinBox, dragonTin), dragonTin);
    assert.equal(tinBox.contents.length, 2);
    assert.equal(tinBox.contents[1].quan, 1);

    const trollBox = box([corpse(14, 'troll')]);
    const otherTroll = corpse(15, 'troll');

    assert.equal(add_to_container(trollBox, otherTroll), otherTroll);
    assert.equal(trollBox.contents.length, 2);
    assert.equal(trollBox.contents[1].quan, 1);
});

test('add_to_container applies food eaten rotten and name compatibility gates', () => {
    installContainerTestGame();
    const fresh = food(20, 'food ration');
    const partlyEaten = food(21, 'food ration', { oeaten: 1 });
    const rationBox = box([fresh]);

    assert.equal(add_to_container(rationBox, partlyEaten), partlyEaten);
    assert.equal(rationBox.contents.length, 2);
    assert.equal(fresh.quan, 1);

    const namedEgg = egg(22, 'newt', { oname: 'breakfast' });
    const differentNamedEgg = egg(23, 'newt', { oname: 'dinner' });
    const namedEggBox = box([namedEgg]);

    assert.equal(add_to_container(namedEggBox, differentNamedEgg), differentNamedEgg);
    assert.equal(namedEggBox.contents.length, 2);

    const unnamedEgg = egg(24, 'newt');
    const sourceNamedEgg = egg(25, 'newt', { oname: 'breakfast' });
    const copyNameBox = box([unnamedEgg]);

    assert.equal(add_to_container(copyNameBox, sourceNamedEgg), unnamedEgg);
    assert.equal(unnamedEgg.quan, 2);
    assert.equal(unnamedEgg.oname, 'breakfast');

    const unnamedCorpse = corpse(26, 'newt');
    const namedCorpse = corpse(27, 'newt', { oname: 'snack' });
    const corpseBox = box([unnamedCorpse]);

    assert.equal(add_to_container(corpseBox, namedCorpse), namedCorpse);
    assert.equal(corpseBox.contents.length, 2);
    assert.equal(unnamedCorpse.quan, 1);
});

test('add_to_container keeps meat rings separate', () => {
    installContainerTestGame();
    const first = food(30, 'meat ring', { otyp: MEAT_RING });
    const second = food(31, 'meat ring', { otyp: MEAT_RING });
    const container = box([first]);

    assert.equal(add_to_container(container, second), second);
    assert.deepEqual(container.contents, [second, first]);
    assert.equal(first.quan, 1);
    assert.equal(second.quan, 1);
});

test('add_to_container respects modeled C oc_merge metadata', () => {
    installContainerTestGame();
    const firstScroll = scroll(40);
    const secondScroll = scroll(41);
    const scrollBox = box([firstScroll]);

    assert.equal(add_to_container(scrollBox, secondScroll), firstScroll);
    assert.deepEqual(scrollBox.contents, [firstScroll]);
    assert.equal(firstScroll.quan, 2);

    const firstWand = wand(42);
    const secondWand = wand(43);
    const wandBox = box([firstWand]);

    assert.equal(add_to_container(wandBox, secondWand), secondWand);
    assert.deepEqual(wandBox.contents, [secondWand, firstWand]);
    assert.equal(firstWand.quan, 1);

    const firstTool = tool(44);
    const secondTool = tool(45);
    const toolBox = box([firstTool]);

    assert.equal(add_to_container(toolBox, secondTool), secondTool);
    assert.deepEqual(toolBox.contents, [secondTool, firstTool]);
    assert.equal(firstTool.quan, 1);
});

test('add_to_container applies candle oil and how-lost merge gates', () => {
    installContainerTestGame();
    const oldCandle = candle(50, 10);
    const sameBucketCandle = candle(51, 24);
    const candleBox = box([oldCandle]);

    assert.equal(add_to_container(candleBox, sameBucketCandle), oldCandle);
    assert.equal(oldCandle.quan, 2);

    const bucketedCandle = candle(52, 10);
    const laterBucketCandle = candle(53, 30);
    const splitCandleBox = box([bucketedCandle]);

    assert.equal(add_to_container(splitCandleBox, laterBucketCandle), laterBucketCandle);
    assert.equal(splitCandleBox.contents.length, 2);
    assert.equal(bucketedCandle.quan, 1);

    const litOil = potion(54, 'potion of oil', { lamplit: true });
    const otherLitOil = potion(55, 'potion of oil', { lamplit: true });
    const oilBox = box([litOil]);

    assert.equal(add_to_container(oilBox, otherLitOil), otherLitOil);
    assert.equal(oilBox.contents.length, 2);
    assert.equal(litOil.quan, 1);

    const thrownScroll = scroll(56, 'scroll of light', { how_lost: 'LOST_THROWN' });
    const droppedScroll = scroll(57, 'scroll of light', { how_lost: 'LOST_DROPPED' });
    const lostBox = box([thrownScroll]);

    assert.equal(add_to_container(lostBox, droppedScroll), droppedScroll);
    assert.equal(lostBox.contents.length, 2);
    assert.equal(thrownScroll.quan, 1);
});

test('add_to_minv uses the same modeled C merge gates as containers', () => {
    installContainerTestGame();
    const mon = { data: { name: 'goblin' }, minvent: [food(60, 'food ration', { age: 10 })] };
    const sourceFood = food(61, 'food ration', { age: 50 });

    assert.equal(add_to_minv(mon, sourceFood), mon.minvent[0]);
    assert.equal(mon.minvent.length, 1);
    assert.equal(mon.minvent[0].quan, 2);
    assert.equal(mon.minvent[0].age, 30);
    assert.equal(mon.minvent[0].ocarry, mon);

    const hatchingEgg = egg(62, 'newt', { eggHatchTurn: 125, _egg_hatch_seq: 1 });
    mon.minvent = [egg(63, 'newt')];

    assert.equal(add_to_minv(mon, hatchingEgg), hatchingEgg);
    assert.equal(mon.minvent.length, 2);
    assert.equal(mon.minvent[1].quan, 1);
    assert.equal(hatchingEgg.ocarry, mon);

    const carriedWand = wand(64);
    const sourceWand = wand(65);
    mon.minvent = [carriedWand];

    assert.equal(add_to_minv(mon, sourceWand), sourceWand);
    assert.deepEqual(mon.minvent, [sourceWand, carriedWand]);
    assert.equal(carriedWand.quan, 1);
});
