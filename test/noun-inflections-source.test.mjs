import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { makePlural, makeSingular } from '../js/objnam.js';
import { pluralFruitName, singularFruitName } from '../js/fruit.js';

// These answers come from compiling the original C functions, not from the
// JavaScript implementation. The corpus includes all object and monster names,
// case variants, compounds, irregular endings and boundary inputs.
const cases = JSON.parse(readFileSync(new URL('./fixtures/oracles/noun-inflections.json', import.meta.url)));
for (const [name, fn, index] of [['plural', makePlural, 1], ['singular', makeSingular, 2]])
    test(`${name} agrees with all ${cases.length} C oracle inputs`, () => {
        for (const row of cases) assert.equal(fn(row[0]), row[index], JSON.stringify(row[0]));
    });

for (const [input, plural, singular] of [
    ['pair of boots', 'pair of boots', 'pair of boots'],
    ['potion of healing', 'potions of healing', 'potion of healing'],
    ['knives named Apples', 'knives named Apples', 'knife named Apples'],
    ['mongoose', 'mongooses', 'mongoose'],
    ['shuriken', 'shuriken', 'shuriken'],
    ['VAX', 'VAXES', 'VAX'],
    ['foOt', 'feEt', 'foOt'],
    ['NeMesis', 'NeMeses', 'NeMesis'],
    ['HER', 'Them', 'HER'],
    ['THEIR', 'THEIRS', 'Its'],
    ['elf ', 'elves', 'elf '],
    ['', 's', ''],
]) test(`C noun boundary ${JSON.stringify(input)}`, () => {
    assert.equal(makePlural(input), plural); assert.equal(makeSingular(input), singular);
});

for (const [name, single, plural] of [['goose', 'goose', 'geese'], ['berries', 'berry', 'berries'],
    ['lump of jelly', 'lump of jelly', 'lumps of jelly'], ['children', 'child', 'children'],
    ['mongoose', 'mongoose', 'mongooses'], ['fish', 'fish', 'fish']])
    test(`named fruit uses shared C inflection for ${name}`, () => {
        assert.equal(singularFruitName(name), single); assert.equal(pluralFruitName(name), plural);
    });
