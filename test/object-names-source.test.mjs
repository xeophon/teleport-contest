import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { MONS, vegetarian } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { xname, indefiniteArticle, objectMonsterName, armorSimpleName } from '../js/objnam.js';
import { tinDetails, tinVariety } from '../js/eat.js';

function object(symbol, fields = {}, typeKnown = false) {
    const type = OBJECT_DATA.find(type => type.symbol === symbol);
    if (typeKnown) {
        game._known_object_types ??= [];
        if (!game._known_object_types.includes(type.id)) game._known_object_types.push(type.id);
    }
    return { _c_otyp: type.id, quan: 1, spe: 0, corpsenm: -1,
        known: !type.usesKnown, dknown: true, bknown: false, ...fields };
}

const names = [
    ['POT_HEALING', {}, false, 'purple-red potion'],
    ['POT_HEALING', { dknown: false }, true, 'potion'],
    ['POT_HEALING', {}, true, 'potion of healing'],
    ['POT_HEALING', { odiluted: true, quan: 2 }, false, 'diluted purple-red potions'],
    ['POT_WATER', { blessed: true, bknown: true }, true, 'potion of holy water'],
    ['POT_WATER', { cursed: true, bknown: false }, true, 'potion of water'],
    ['SCR_IDENTIFY', {}, false, 'scroll labeled KERNOD WEL'],
    ['SCR_IDENTIFY', { dknown: false }, true, 'scroll'],
    ['SCR_BLANK_PAPER', {}, false, 'unlabeled scroll'],
    ['SCR_MAIL', {}, false, 'stamped scroll'],
    ['SCR_MAIL', {}, true, 'scroll of mail'],
    ['WAN_WISHING', {}, true, 'wand of wishing'],
    ['WAN_WISHING', { dknown: false }, true, 'wand'],
    ['SPE_NOVEL', { dknown: false }, true, 'book'],
    ['SPE_NOVEL', {}, true, 'novel'],
    ['SPE_BOOK_OF_THE_DEAD', {}, true, 'Book of the Dead'],
    ['RIN_LEVITATION', { dknown: false }, true, 'ring'],
    ['RIN_LEVITATION', {}, true, 'ring of levitation'],
    ['AMULET_OF_REFLECTION', { dknown: false }, true, 'amulet'],
    ['AMULET_OF_REFLECTION', {}, true, 'amulet of reflection'],
    ['FAKE_AMULET_OF_YENDOR', { known: false }, true, 'Amulet of Yendor'],
    ['FAKE_AMULET_OF_YENDOR', { known: true }, true, 'cheap plastic imitation of the Amulet of Yendor'],
    ['DART', { opoisoned: true, quan: 3 }, true, 'poisoned darts'],
    ['LONG_SWORD', { opoisoned: true }, true, 'long sword'],
    ['LENSES', { quan: 2 }, true, 'pair of lenses'],
    ['TOWEL', { spe: 2 }, true, 'moist towel'],
    ['TOWEL', { spe: 3 }, true, 'wet towel'],
    ['GRAY_DRAGON_SCALES', { quan: 2 }, true, 'sets of gray dragon scales'],
    ['ELVEN_SHIELD', { dknown: false }, true, 'shield'],
    ['SHIELD_OF_REFLECTION', { dknown: false }, true, 'smooth shield'],
    ['SPEED_BOOTS', { dknown: false }, true, 'pair of speed boots'],
    ['JADE', {}, true, 'jade stone'],
    ['RUBY', {}, true, 'ruby'],
    ['FLINT', {}, true, 'flint stone'],
    ['FLINT', { dknown: false }, true, 'stone'],
    ['JADE', { dknown: false }, true, 'gem'],
    ['GOLD_PIECE', { quan: 2 }, true, 'gold pieces'],
    ['IRON_CHAIN', { quan: 2 }, true, 'iron chains'],
    ['HEAVY_IRON_BALL', { owt: 481 }, true, 'very heavy iron ball'],
    ['CORPSE', { corpsenm: 0, quan: 2 }, true, 'corpses'],
];
for (const [symbol, fields, known, expected] of names) test(`xname ${symbol} ${JSON.stringify(fields)} typeKnown=${known}`, () => {
    resetGame(); const item = object(symbol, fields, known);
    assert.equal(xname(item, { blind: true }), expected);
});

for (const symbol of ['POT_HEALING', 'SCR_IDENTIFY', 'SPE_FORCE_BOLT', 'WAN_WISHING', 'RIN_LEVITATION', 'AMULET_OF_REFLECTION', 'JADE'])
    test(`unseen ${symbol} hides both type and called name`, () => {
        resetGame(); const item = object(symbol, { dknown: false }, true);
        const text = xname(item, { blind: true, called: () => 'secret' });
        assert.equal(text.includes('secret'), false);
        assert.equal(item.dknown, false);
    });

test('xname observations precede rendering without identifying the type or exercising Wisdom', () => {
    resetGame(); initRng(12); enableRngLog({ reset: true });
    const item = object('POT_HEALING', { dknown: false }); const observed = [];
    assert.equal(xname(item, { observe: item => observed.push(item.dknown) }), 'purple-red potion');
    assert.deepEqual(observed, [true]); assert.deepEqual(game._known_object_types, undefined);
    assert.deepEqual(getRngLog(), []);
});

for (const mode of [{ blind: true }, { distant: true }, { hallucinating: true }])
    test(`xname suppresses observation under ${JSON.stringify(mode)}`, () => {
        resetGame(); const item = object('POT_HEALING', { dknown: false });
        assert.equal(xname(item, { ...mode, observe: () => assert.fail('unexpected observation') }), 'potion');
        assert.equal(item.dknown, false);
    });

test('Priest BUC knowledge is independent of sight and hallucination', () => {
    resetGame(); const item = object('POT_WATER', { blessed: true, dknown: true }, true);
    assert.equal(xname(item, { role: 'Priest', blind: true, hallucinating: true }), 'potion of holy water');
    assert.equal(item.bknown, true);
});

test('forgotten unique types clear instance knowledge before the wizard override', () => {
    resetGame(); const item = object('SPE_BOOK_OF_THE_DEAD', { known: true, dknown: false });
    assert.equal(xname(item, { blind: true, override: true }), 'Book of the Dead');
    assert.equal(item.known, false); assert.equal(item.dknown, false);
});

for (const [symbol, expected] of [['SHORT_SWORD', 'wakizashi'], ['FOOD_RATION', 'gunyoki'],
    ['POT_BOOZE', 'potion of sake'], ['MAGIC_HARP', 'magic koto']])
    test(`Samurai actual name for ${symbol}`, () => {
        resetGame(); assert.equal(xname(object(symbol, {}, true), { role: 'Samurai' }), expected);
    });

test('Samurai harp appearance remains koto before its type is known', () => {
    resetGame(); assert.equal(xname(object('MAGIC_HARP'), { role: 'Samurai', description: () => 'harp' }), 'koto');
});

// C appends its debug suffix before makeplural, including the odd apostrophe.
test('wet towel debug suffix and singular override retain their separate meanings', () => {
    resetGame(); const item = object('TOWEL', { spe: 4, quan: 3 });
    assert.equal(xname(item, { wizard: true }), "wet towel (4)'s");
    assert.equal(xname(item, { wizard: true }, { singular: true }), 'wet towel (4)');
    assert.equal(item.quan, 3);
});

test('called names and object names appear after pluralization at their C boundaries', () => {
    resetGame(); const item = object('POT_HEALING', { quan: 2, oname: 'My Apples' });
    assert.equal(xname(item, { called: () => 'juice' }), 'potions called juice named My Apples');
});

test('artifact personal names require full object knowledge, while wizard rendering leaves unseen discovery alone', () => {
    resetGame(); const item = object('LONG_SWORD', { known: true, artifact: 'Excalibur', bknown: true, rknown: false });
    game._identified_artifacts = ['Excalibur'];
    assert.equal(xname(item, { blind: true }), 'long sword named Excalibur');
    item.rknown = true; assert.equal(xname(item, { blind: true }), 'Excalibur');
    item.dknown = false;
    assert.equal(xname(item, { blind: true, override: true, findArtifact: () => assert.fail('unseen artifact') }), 'Excalibur');
    assert.equal(item.dknown, false);
});

test('artifact names lose only the leading definite article', () => {
    resetGame(); const item = object('CRYSTAL_BALL', { artifact: 'The Orb of Fate' });
    assert.equal(xname(item, { override: true }), 'Orb of Fate');
    assert.equal(xname(item, { blind: true }), 'glass orb named the Orb of Fate');
});

test('next boulder is a one-use field and corpse xname omits the species', () => {
    resetGame(); const boulder = object('BOULDER', { corpsenm: 1 });
    assert.equal(xname(boulder), 'next boulder'); assert.equal(xname(boulder), 'boulder');
});

for (const [weight, size] of [[100, 'small'], [101, 'medium'], [300, 'medium'], [301, 'large'], [500, 'large'], [501, 'very large']])
    test(`glob xname size at weight ${weight}`, () => {
        resetGame(); assert.equal(xname(object('GLOB_OF_GRAY_OOZE', { globby: true, owt: weight, oeaten: 10 }), {}, { partlyEaten: true }), `partly eaten ${size} glob of gray ooze`);
    });

for (const [spe, expected] of [[0, 'cleric'], [1, 'priestess'], [2, 'priest'], [3, 'aligned cleric']])
    test(`object monster gender bits ${spe} use saved object state`, () => {
        resetGame(); const item = object('STATUE', { corpsenm: MONS.find(mon => mon.name === 'aligned cleric').pm, spe });
        assert.equal(objectMonsterName(item), expected);
    });

test('statues and figurines use distinct monster articles and historical prefixes', () => {
    resetGame(); const medusa = MONS.find(mon => mon.name === 'Medusa').pm;
    const wizard = MONS.find(mon => mon.name === 'Wizard of Yendor').pm;
    assert.equal(xname(object('STATUE', { corpsenm: medusa, spe: 4 }), { role: 'Archeologist' }), 'historic statue of Medusa');
    assert.equal(xname(object('STATUE', { corpsenm: wizard })), 'statue of the Wizard of Yendor');
    assert.equal(xname(object('FIGURINE', { corpsenm: medusa })), 'figurine of a Medusa');
});

for (const [text, article] of [['x', 'an '], ['xorn', 'a '], ['x-ray', 'an '], ['one-eyed monster', 'a '],
    ['oneiric dream', 'an '], ['unicorn', 'a '], ['uranium wand', 'a '], ['useful tool', 'a '], ['eucalyptus leaf', 'a '],
    ['the Eye', ''], ['ice', ''], ['iron bars', ''], ['molten lava', '']])
    test(`C indefinite article for ${text}`, () => assert.equal(indefiniteArticle(text), article));

test('tin details retain display-time randomness even when the selected variety is hidden', () => {
    resetGame(); initRng(4); enableRngLog({ reset: true });
    assert.equal(tinDetails(object('TIN', { known: true, corpsenm: 0 })), 'tin of giant ant meat');
    assert.equal(getRngLog().length, 1); assert.match(getRngLog()[0], /^rn2\(15\)/);
    assert.equal(xname(object('TIN', { known: true, corpsenm: -1 })), 'empty tin');
    assert.equal(getRngLog().length, 2);
});

for (const [name, expected] of [['lizard', 'homemade tin of lizard meat'], ['lichen', 'homemade tin of lichen'],
    ['acid blob', 'homemade tin of acid blob'], ['Death', 'homemade tin of Death meat'], ['newt', 'rotten tin of newt meat']])
    test(`cursed tins preserve C nonrotting species exception for ${name}`, () => {
        resetGame(); const monster = MONS.find(mon => mon.name === name);
        const item = object('TIN', { known: true, cknown: true, spe: -6, cursed: true, corpsenm: monster.pm });
        assert.equal(xname(item), expected);
    });

test('tin contents knowledge hides preparation independently of instance identification', () => {
    resetGame(); const item = object('TIN', { known: true, spe: -6, corpsenm: 0 });
    assert.equal(xname(item), 'tin of giant ant meat');
    item.cknown = true; assert.equal(xname(item), 'tin of boiled giant ant meat');
    item.spe = 1; assert.equal(xname(item), 'tin of spinach');
});

for (const [name, expected] of [['gray ooze', true], ['brown pudding', true], ['black pudding', false],
    ['iron golem', true], ['flesh golem', false], ['leather golem', false], ['stalker', false], ['air elemental', true], ['ghost', true]])
    test(`tin meat wording uses C vegetarian category for ${name}`, () => {
        resetGame(); const monster = MONS.find(mon => mon.name === name);
        assert.equal(vegetarian(monster), expected);
        assert.equal(tinDetails(object('TIN', { corpsenm: monster.pm, spe: -6 })), 'tin of ' + name + (expected ? '' : ' meat'));
    });

for (const [symbol, fields, known, description, expected] of [
    ['PLATE_MAIL', {}, true, null, 'mail'], ['LEATHER_JACKET', {}, true, null, 'jacket'],
    ['GRAY_DRAGON_SCALE_MAIL', {}, true, null, 'dragon mail'],
    ['GRAY_DRAGON_SCALES', {}, true, null, 'dragon scales'],
    ['ROBE', {}, true, null, 'robe'], ['MUMMY_WRAPPING', {}, true, null, 'wrapping'],
    ['ALCHEMY_SMOCK', {}, false, null, 'apron'], ['ALCHEMY_SMOCK', {}, true, null, 'smock'],
    ['HELMET', {}, false, null, 'helm'], ['HELMET', { material: 18 }, false, null, 'hat'],
    ['HELMET', { material: 19 }, false, null, 'helm'],
    ['LEATHER_GLOVES', {}, false, 'old gauntlets', 'gauntlets'],
    ['LEATHER_GLOVES', { dknown: false }, false, 'old gauntlets', 'gloves'],
    ['SPEED_BOOTS', {}, false, 'muddy shoes', 'shoes'],
    ['SPEED_BOOTS', { dknown: false }, false, 'muddy shoes', 'boots'],
    ['SHIELD_OF_REFLECTION', { dknown: false }, false, null, 'smooth shield'],
    ['SHIELD_OF_REFLECTION', {}, false, null, 'silver shield'],
]) test(`C armor short name ${symbol} ${JSON.stringify(fields)} typeKnown=${known}`, () => {
    resetGame(); const item = object(symbol, fields, known);
    assert.equal(armorSimpleName(item, undefined, description), expected);
});

test('tin display leaves homemade contents unchanged without the consumption spoilage draw', () => {
    resetGame(); initRng(1); enableRngLog({ reset: true });
    const item = object('TIN', { spe: -2, corpsenm: 0 });
    assert.equal(tinVariety(item, true), 1); assert.deepEqual(getRngLog(), []);
    tinVariety(item, false); assert.equal(getRngLog().length, 1);
    assert.match(getRngLog()[0], /^rn2\(7\)/);
    item.blessed = true; tinVariety(item, false); assert.equal(getRngLog().length, 1);
});
