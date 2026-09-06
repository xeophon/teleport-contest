import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseQuestLua } from './quest-lua-parser.mjs';

const inputs = {
    Caveman: ['Cav', 'goal', 'loca', 'strt'], Healer: ['Hea', 'goal', 'loca', 'strt'],
    Ranger: ['Ran', 'goal', 'loca', 'strt'], Barbarian: ['Bar', 'goal'],
    Rogue: ['Rog', 'loca', 'goal', 'strt'], Valkyrie: ['Val', 'loca', 'goal', 'strt'], Knight: ['Kni', 'loca', 'strt'],
    Monk: ['Mon', 'goal', 'loca', 'strt'], Tourist: ['Tou', 'loca', 'goal', 'strt'], Samurai: ['Sam', 'goal', 'loca', 'strt'], Wizard: ['Wiz', 'goal'],
};
const programs = {}, copyrights = new Set();
for (const [role, [prefix, ...stages]] of Object.entries(inputs)) {
    programs[role] = {};
    for (const stage of stages) {
        const source = `${prefix}-${stage}.lua`;
        const text = await readFile(new URL(`../nethack-c/upstream/dat/${source}`, import.meta.url), 'utf8');
        for (const match of text.matchAll(/^--\s*(Copyright[^\n]*)/gm)) copyrights.add(match[1]);
        programs[role][`x-${stage}`] = { source, operations: parseQuestLua(text) };
    }
}
const output = `// Generated from NetHack quest Lua by tools/generate-quest-levels.mjs.
${[...copyrights].map(notice => `// ${notice}`).join('\n')}
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
// Preserve declaration order: geometry and population share the live RNG.
export const QUEST_LEVELS = ${JSON.stringify(programs, null, 2)};\n`;
const destination = new URL('../js/quest_level_data.js', import.meta.url);
if (process.argv.includes('--check')) assert.equal(await readFile(destination, 'utf8'), output);
else await writeFile(destination, output);
