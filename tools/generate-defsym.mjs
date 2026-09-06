import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const include = new URL('../nethack-c/upstream/include/', import.meta.url);
const colors = {};
for (const [, name, value] of (await readFile(new URL('color.h', include), 'utf8'))
    .matchAll(/^#define\s+((?:CLR_|HI_|NO_COLOR)\w*)\s+(\w+)/gm))
    colors[name] = /^\d+$/.test(value) ? Number(value) : colors[value];
const symbols = [];
const source = await readFile(new URL('defsym.h', include), 'utf8');
for (const match of source.matchAll(/PCHAR2?\(\s*(\d+),\s*'((?:\\.|[^'])*)',\s*(\w+),\s*((?:"(?:\\.|[^"])*"\s*,\s*)+)(\w+)\)/g)) {
    const [, index, character, name, descriptions, color] = match;
    const strings = [...descriptions.matchAll(/"(?:\\.|[^"])*"/g)].map(([text]) => JSON.parse(text));
    assert.equal(Number(index), symbols.length);
    assert.equal(typeof colors[color], 'number');
    symbols.push({ name, ch: character.replace(/\\(.)/g, '$1'), explanation: strings.at(-1), color: colors[color] });
}
assert.equal(symbols.length, 105);
const output = `// Generated from include/defsym.h by tools/generate-defsym.mjs.
// Copyright (c) 2016 by Pasi Kallinen.
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
export const DEFSYMS = ${JSON.stringify(symbols, null, 2)};
export const CMAP_EXPLANATIONS = DEFSYMS.map(symbol => symbol.explanation);
`;
const destination = new URL('../js/defsym.js', import.meta.url);
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output);
else await writeFile(destination, output);
