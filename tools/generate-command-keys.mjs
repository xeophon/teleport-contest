import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../nethack-c/upstream/src/cmd.c', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('struct ext_func_tab extcmdlist[] = {'), source.indexOf('/* internal commands:'));
const symbols = { AMULET_SYM: '"', ARMOR_SYM: '[', RING_SYM: '=', TOOL_SYM: '(', WEAPON_SYM: ')', GOLD_SYM: '$', SPBOOK_SYM: '+' };
const keys = {};
for (const match of body.matchAll(/\{\s*((?:[MC]\()?\s*'(?:\\.|[^'])+'\)?|[A-Z_]+),\s*"([^"]+)"/g)) {
    const token = match[1].trim();
    let key = symbols[token];
    if (!key) {
        const quoted = token.match(/'((?:\\.|[^'])+)'/)[1];
        key = quoted.startsWith('\\') ? ({ '\\0': '\0', '\\\\': '\\', "\\'": "'" }[quoted] ?? quoted[1]) : quoted;
        if (token.startsWith('C(')) key = String.fromCharCode(key.charCodeAt(0) & 31);
        if (token.startsWith('M(')) key = String.fromCharCode(key.charCodeAt(0) | 128);
    }
    keys[match[2]] = key === '\0' ? null : key;
}
for (const [i, direction] of ['west', 'northwest', 'north', 'northeast', 'east', 'southeast', 'south', 'southwest'].entries())
    keys[`move${direction}`] = 'hykulnjb'[i];
const output = '// Generated from C src/cmd.c:extcmdlist and VI movement keys.\n'
    + '// Command names identify dispatch targets; their presence does not imply complete behavior.\n'
    + 'export const COMMAND_KEYS = ' + JSON.stringify(keys, null, 4) + ';\n';
const target = new URL('../js/command_keys.js', import.meta.url);
if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== output) throw new Error('Run node tools/generate-command-keys.mjs');
} else writeFileSync(target, output);
