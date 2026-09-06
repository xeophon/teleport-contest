import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { objectTypeName, discoveryTypeName } from '../js/objnam.js';
import { rhack } from '../js/cmd.js';
import { initRng } from '../js/rng.js';

test('every compiled C type name, knowledge state, Samurai alias and called-name boundary', () => {
    const cases = JSON.parse(readFileSync(new URL('./fixtures/oracles/object-type-names.json', import.meta.url)));
    resetGame();
    for (const [id, known, samurai, called, expected] of cases) {
        assert.equal(objectTypeName(OBJECT_DATA[id], { known: !!known, role: samurai ? 'Samurai' : 'Wizard',
            called: [null, 'amber named thing', 'x'.repeat(300)][called] }), expected,
        JSON.stringify([id, known, samurai, called]));
    }
});

for (const [symbol, known, expected] of [
    ['AMULET_OF_YENDOR', false, 'amulet (Amulet of Yendor)'],
    ['AMULET_OF_YENDOR', true, 'Amulet of Yendor (Amulet of Yendor)'],
    ['FAKE_AMULET_OF_YENDOR', true, 'cheap plastic imitation of the Amulet of Yendor (Amulet of Yendor)'],
    ['GRAY_DRAGON_SCALES', true, 'set of gray dragon scales'],
    ['RUBY', false, 'red gem'], ['AMETHYST', true, 'amethyst stone (violet)'],
    ['SPE_NOVEL', true, 'novel (paperback)'],
    ['SPE_BOOK_OF_THE_DEAD', true, 'Book of the Dead (papyrus)'],
]) test(`C type name ${symbol}, known=${known}`, () => {
    resetGame(); const type = OBJECT_DATA.find(type => type.symbol === symbol);
    assert.equal(objectTypeName(type, { known }), expected);
});

test('type formatting reads knowledge without observing or identifying an instance', () => {
    resetGame(); const type = OBJECT_DATA.find(type => type.symbol === 'WAN_FIRE');
    const before = structuredClone(game._discoveries);
    assert.equal(objectTypeName(type, { description: 'copper' }), 'wand (copper)');
    assert.deepEqual(game._discoveries, before);
    game._known_object_types = [type.id];
    assert.equal(objectTypeName(type, { description: 'copper' }), 'wand of fire (copper)');
});

for (const [symbol, known, called, expected] of [
    ['SHORT_SWORD', true, null, 'wakizashi [short sword]'],
    ['HELMET', true, null, 'kabuto [helmet] (plumed helmet)'],
    ['LEATHER_GLOVES', true, 'soft', 'pair of yugake [leather gloves] called soft (old gloves)'],
    ['FOOD_RATION', true, null, 'gunyoki [food ration]'],
    ['POT_BOOZE', true, 'brown', 'potion of sake [booze] called brown (brown)'],
    ['MAGIC_HARP', false, 'music', 'koto [harp] called music'],
    ['MAGIC_HARP', true, null, 'magic koto [magic harp] (koto)'],
]) test(`C Samurai discovery explanation: ${symbol} known=${known}`, () => {
    resetGame(); const type = OBJECT_DATA.find(type => type.symbol === symbol);
    assert.equal(discoveryTypeName(type, { role: 'Samurai', known, called }), expected);
});

for (const known of [false, true]) test(`discovery menu reserves appearance and omits overflowing quote, known=${known}`, async () => {
    resetGame(); initRng(1);
    const type = OBJECT_DATA.find(type => type.symbol === 'POT_HEALING');
    game.flags = {}; game.u = {}; game.inventory = []; game.level = { monsters: [], objects: [] };
    game._discoveries = [{ typeId: type.id, section: 'Potions', name: 'potion of healing',
        text: 'stale cached name', known }];
    game._called_object_types = { [type.id]: 'x'.repeat(300) };
    game._object_price_quotes = { [type.id]: { buy: { min: 40, max: 40 } } };
    await rhack('\\');
    const line = game._overlay_lines.find(row => row[2].includes(' called '))[2];
    assert.equal(line.length, 255);
    assert.ok(line.startsWith(known ? '  potion of healing called ' : '  potion called '));
    assert.ok(line.endsWith(' (purple-red)'));
    assert.equal(line.includes('stale cached'), false);
    assert.equal(line.includes('{buy'), false);
});
