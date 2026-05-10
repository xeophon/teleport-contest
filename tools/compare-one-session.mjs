#!/usr/bin/env node
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import { decodeScreen, diffCell, renderCell, ROWS_24, COLS_80 } from '../frozen/screen-decode.mjs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';

const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const STARTUP_VARIANT_LINES = [/Version\s+\d+\.\d+\.\d+[^\n]*/];
const DEC_TO_UNICODE = {
    '`': '\u25c6', a: '\u2592', f: '\u00b0', g: '\u00b1',
    j: '\u2518', k: '\u2510', l: '\u250c', m: '\u2514', n: '\u253c',
    q: '\u2500', t: '\u251c', u: '\u2524', v: '\u2534', w: '\u252c',
    x: '\u2502', y: '\u2264', z: '\u2265', '|': '\u2260',
    o: '\u23ba', s: '\u23bd', '{': '\u03c0', '~': '\u00b7',
};

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

function preDecode(screen) {
    let result = String(screen || '');
    for (const pattern of STARTUP_VARIANT_LINES)
        result = result.replace(pattern, '<<VERSION_BANNER>>');
    result = result.replace(/^\d{2}:\d{2}:\d{2}\.$/gm, '<time>.');
    return translateDecSpans(result);
}

function replayInputFor(segment) {
    return {
        seed: segment.seed,
        datetime: segment.datetime,
        nethackrc: segment.nethackrc,
        moves: segment.moves,
    };
}

function gridLines(screen) {
    const grid = decodeScreen(preDecode(screen));
    return grid.map(row => row.map(renderCell).join('').replace(/\s+$/, ''));
}

function screensEqual(a, b) {
    const ga = decodeScreen(preDecode(a));
    const gb = decodeScreen(preDecode(b));
    for (let row = 0; row < ROWS_24; row++)
        for (let col = 0; col < COLS_80; col++)
            if (diffCell(ga[row][col], gb[row][col])) return false;
    return true;
}

function firstCellDiff(a, b) {
    const ga = decodeScreen(preDecode(a));
    const gb = decodeScreen(preDecode(b));
    for (let row = 0; row < ROWS_24; row++)
        for (let col = 0; col < COLS_80; col++)
            if (diffCell(ga[row][col], gb[row][col]))
                return { row, col, js: ga[row][col], c: gb[row][col], kind: diffCell(ga[row][col], gb[row][col]) };
    return null;
}

function flattenScreens(segments) {
    const screens = [];
    for (let s = 0; s < segments.length; s++) {
        const steps = segments[s].steps || [];
        for (let step = 0; step < steps.length; step++) {
            if (steps[step].screen) screens.push({ screen: steps[step].screen, segment: s, step, key: steps[step].key });
        }
    }
    return screens;
}

function printScreen(label, lines, from = 0, to = ROWS_24 - 1) {
    console.log(label);
    for (let row = from; row <= to; row++)
        console.log(`${String(row).padStart(2)}|${lines[row] || ''}`);
}

function printColoredCells(label, screen) {
    const grid = decodeScreen(preDecode(screen));
    console.log(label);
    for (let row = 0; row < ROWS_24; row++)
        for (let col = 0; col < COLS_80; col++) {
            const cell = grid[row][col];
            const ch = renderCell(cell);
            if (ch !== ' ' && (cell.color !== 8 || cell.attr))
                console.log(`${row}:${col} ${JSON.stringify(ch)} color=${cell.color} attr=${cell.attr}`);
        }
}

async function main() {
    const [sessionArg, indexArg, fullArg] = process.argv.slice(2);
    if (!sessionArg) {
        console.error('usage: node tools/compare-one-session.mjs <session> [screen-index]');
        process.exit(1);
    }

    const sessionPath = sessionArg.startsWith('/') ? sessionArg : join(PROJECT_ROOT, sessionArg);
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf8'));
    const segments = normalizeSession(sessionData).segments;
    const cScreens = flattenScreens(segments);

    let game = null;
    for (const segment of segments)
        game = await runSegment(replayInputFor(segment), game);
    const jsScreens = game.getScreens() || [];

    let index = indexArg == null ? -1 : Number(indexArg);
    if (index < 0) {
        const total = Math.max(cScreens.length, jsScreens.length);
        for (let i = 0; i < total; i++) {
            if (!screensEqual(jsScreens[i], cScreens[i]?.screen)) {
                index = i;
                break;
            }
        }
    }

    console.log(`${basename(sessionPath)} JS ${jsScreens.length} C ${cScreens.length}`);
    if (index < 0) {
        console.log('all screens match');
        return;
    }

    const meta = cScreens[index] || {};
    const cell = firstCellDiff(jsScreens[index], meta.screen);
    console.log(`screen ${index} segment ${meta.segment} step ${meta.step} key ${JSON.stringify(meta.key)} diff ${JSON.stringify(cell)}`);

    const jsLines = gridLines(jsScreens[index]);
    const cLines = gridLines(meta.screen);
    if (fullArg === 'colors') {
        printColoredCells('JS colors', jsScreens[index]);
        printColoredCells('C colors', meta.screen);
        return;
    }
    if (fullArg?.startsWith('line')) {
        const row = Number(fullArg.slice(4));
        for (const [label, lines] of [['JS', jsLines], ['C', cLines]]) {
            console.log(label, JSON.stringify(lines[row]));
            console.log(lines[row].split('').map((ch, col) => `${col}:${ch}`).join(' '));
        }
        return;
    }
    let firstRow = 0;
    let lastRow = ROWS_24 - 1;
    for (let row = 0; row < ROWS_24; row++) {
        if (jsLines[row] !== cLines[row]) {
            firstRow = Math.max(0, row - 2);
            lastRow = Math.min(ROWS_24 - 1, row + 8);
            break;
        }
    }
    if (fullArg === 'full') {
        firstRow = 0;
        lastRow = ROWS_24 - 1;
    }
    printScreen('JS', jsLines, firstRow, lastRow);
    printScreen('C', cLines, firstRow, lastRow);
}

main();
