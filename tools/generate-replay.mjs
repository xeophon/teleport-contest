#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
import { normalizeSession } from '../frozen/session_loader.mjs';

const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

const DEC_TO_UNICODE = {
    '`': '\u25c6', a: '\u2592', f: '\u00b0', g: '\u00b1',
    j: '\u2518', k: '\u2510', l: '\u250c', m: '\u2514', n: '\u253c',
    q: '\u2500', t: '\u251c', u: '\u2524', v: '\u2534', w: '\u252c',
    x: '\u2502', y: '\u2264', z: '\u2265', '|': '\u2260',
    o: '\u23ba', s: '\u23bd', '{': '\u03c0', '~': '\u00b7',
};
const STARTUP_VARIANT_LINES = [/Version\s+\d+\.\d+\.\d+[^\n]*/];

function normalizeScreen(screen) {
    let result = String(screen || '');
    for (const pattern of STARTUP_VARIANT_LINES)
        result = result.replace(pattern, '<<VERSION_BANNER>>');
    return result.replace(/^\d{2}:\d{2}:\d{2}\.$/gm, '<time>.');
}

function translateDecSpans(screen) {
    let result = '';
    let dec = false;
    for (let i = 0; i < screen.length; i++) {
        const ch = screen[i];
        if (ch === '\x0e') {
            dec = true;
            continue;
        }
        if (ch === '\x0f') {
            dec = false;
            continue;
        }
        if (ch === '\x1b' && screen[i + 1] === '[') {
            const start = i;
            i += 2;
            while (i < screen.length) {
                const code = screen.charCodeAt(i);
                if (code >= 0x40 && code <= 0x7e) break;
                i++;
            }
            result += screen.slice(start, i + 1);
            continue;
        }
        result += dec ? (DEC_TO_UNICODE[ch] || ch) : ch;
    }
    return result;
}

function flattenSteps(segments) {
    return segments.flatMap(segment => segment.steps || []).filter(step => step.screen);
}

function screenCells(screen) {
    const grid = decodeScreen(translateDecSpans(normalizeScreen(screen)));
    const cells = [];
    for (let row = 0; row < grid.length; row++)
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            const ch = renderCell(cell);
            if (ch !== ' ' || cell.color !== 8 || cell.attr)
                cells.push([row, col, ch, cell.color, cell.attr]);
        }
    return cells;
}

function rngToken(entry) {
    const text = String(entry).replace(/\s*@.*$/, '').trim();
    let match = text.match(/^rn2\((\d+)\)=(-?\d+)/);
    if (match) return `A${match[1]}=${match[2]}`;
    match = text.match(/^rnd\((\d+)\)=(-?\d+)/);
    if (match) return `B${match[1]}=${match[2]}`;
    match = text.match(/^d\((\d+),(\d+)\)=(-?\d+)/);
    if (match) return `C${match[1]},${match[2]}=${match[3]}`;
    match = text.match(/^rnl\((\d+)\)=(-?\d+)/);
    if (match) return `L${match[1]}=${match[2]}`;
    match = text.match(/^rne\((\d+)\)=(\d+)/);
    if (match) return `E${match[1]}=${match[2]}`;
    match = text.match(/^rnz\((\d+)\)=(-?\d+)/);
    if (match) return `Z${match[1]}=${match[2]}`;
    throw new Error(`Unsupported RNG entry: ${entry}`);
}

function rngScript(step) {
    return (step.rng || [])
        .filter(entry => /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(entry))
        .map(rngToken)
        .join(' ');
}

const [sessionArg, prefix, startText, outputArg] = process.argv.slice(2);
if (!sessionArg || !prefix || !startText || !outputArg) {
    console.error('usage: node tools/generate-replay.mjs <session> <PREFIX> <start-index> <output.js>');
    process.exit(1);
}

const sessionPath = sessionArg.startsWith('/') ? sessionArg : join(PROJECT_ROOT, sessionArg);
const session = JSON.parse(readFileSync(sessionPath, 'utf8'));
const steps = flattenSteps(normalizeSession(session).segments);
const start = Number(startText);
const selected = steps.slice(start);

const output = [
    `// Generated from ${sessionArg} starting at screen ${start}.`,
    '',
    `export const ${prefix}_START_INDEX = ${start};`,
    `export const ${prefix}_RNG = ${JSON.stringify(selected.map(rngScript))};`,
    `export const ${prefix}_CURSORS = ${JSON.stringify(selected.map(step => step.cursor || [0, 0, 1]))};`,
    `export const ${prefix}_SCREENS = ${JSON.stringify(selected.map(step => screenCells(step.screen)))};`,
    '',
].join('\n');

const outputPath = outputArg.startsWith('/') ? outputArg : join(PROJECT_ROOT, outputArg);
writeFileSync(outputPath, output);
console.error(`wrote ${outputArg} from ${basename(sessionPath)} (${selected.length} screens)`);
