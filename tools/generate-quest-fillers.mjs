import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

// These source files use a small declarative subset of des. Reject anything
// else so upstream Lua changes cannot silently disappear from generated data.
export function parseQuestOperations(source) {
    const operations = [];
    while ((source = source.replace(/^(?:\s|;|--[^\n]*(?:\n|$))+/, ''))) {
        let match;
        if ((match = /^des\.room\(\{\s*type\s*=\s*"ordinary",\s*contents\s*=\s*function\(\)([\s\S]*?)\bend\s*\}\)/.exec(source))) {
            operations.push(['room', parseQuestOperations(match[1])]);
        } else if ((match = /^des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source))) {
            operations.push(['map', match[1].split('\n')]);
        } else if ((match = /^des\.region\(selection\.area\(([^)]+)\),\s*"(unlit|lit)"\)/.exec(source))) {
            operations.push(['region', match[1].split(',').map(Number), match[2]]);
        } else if ((match = /^des\.(level_init|level_flags|stair|object|monster|trap|door|random_corridors)\(([^()]*)\)/.exec(source))) {
            const literal = `[${match[2]}]`.replace(/\b(\w+)\s*=/g, '"$1":')
                .replace(/"(?:[^"\\]|\\.)*"|\b0+(\d+)\b/g, (token, digits) => digits ?? token);
            operations.push([match[1], ...JSON.parse(literal)]);
        } else {
            throw new Error(`Unsupported quest Lua: ${source.slice(0, 100)}`);
        }
        source = source.slice(match[0].length);
    }
    return operations;
}

const roles = {
    Caveman: 'Cav', Healer: 'Hea', Knight: 'Kni', Monk: 'Mon', Ranger: 'Ran',
    Rogue: 'Rog', Samurai: 'Sam', Tourist: 'Tou', Valkyrie: 'Val',
};
const programs = {};
const copyrights = new Set();
for (const [role, prefix] of Object.entries(roles)) {
    programs[role] = {};
    for (const suffix of ['a', 'b']) {
        const source = `${prefix}-fil${suffix}.lua`;
        const text = await readFile(new URL(`../nethack-c/upstream/dat/${source}`, import.meta.url), 'utf8');
        for (const match of text.matchAll(/^--\s*(Copyright[^\n]*)/gm)) copyrights.add(match[1]);
        programs[role][suffix] = { source, operations: parseQuestOperations(text) };
    }
}
const output = `// Generated from NetHack quest Lua by tools/generate-quest-fillers.mjs.
${[...copyrights].map(notice => `// ${notice}`).join('\n')}
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
// Keep operation order: geometry, object, trap and monster creation share RNG.
export const QUEST_FILLERS = ${JSON.stringify(programs, null, 2)};\n`;
const destination = new URL('../js/quest_filler_data.js', import.meta.url);
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output);
else await writeFile(destination, output);
