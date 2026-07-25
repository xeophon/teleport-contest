import assert from 'node:assert/strict';
import test from 'node:test';

import { cornerMenuGeometry, putInInventoryOverlayLines } from '../js/cmd.js';

// C refs: win/tty/wintty.c — tty_end_menu() (width accounting, lines
// 2716-2762) and tty_display_nhwindow() (NHW_MENU placement, lines
// 1902-1941).  H2344_BROKEN is always defined at the top of wintty.c, so a
// menu window's left edge is offx = min(min(82, cols / 2), cols - maxcol - 1),
// clamped at 0; the menu is promoted to a cleared full screen (offx 0) only
// when maxrow reaches the display height (or menu_overlay is off).
// maxcol = widest item string + 2 padding, vs strlen(morestr) un-padded.

test('cornerMenuGeometry caps narrow menus at cols / 2', () => {
    // seed0012 "Put in what?" picker: prompt 12+2, "Coins" 5+2,
    // "$ - 1163 gold pieces" 20+2, "(end) " 6 -> maxcol 22.
    const { offx, maxrow, fullScreen } = cornerMenuGeometry(
        ['Put in what?', '', 'Coins', '$ - 1163 gold pieces'], '(end) ');
    assert.equal(offx, Math.min(40, 80 - 22 - 1));
    assert.equal(offx, 40);
    assert.equal(maxrow, 5);
    assert.equal(fullScreen, false);
});

test('cornerMenuGeometry derives offx from the widest line', () => {
    // "Put in what type of objects?" category menu: the hint line
    // "    (ignored unless some other choices are also picked)" is 55+2.
    const { offx } = cornerMenuGeometry(
        ['Put in what type of objects?', '', 'A - Auto-select every relevant item',
            '    (ignored unless some other choices are also picked)', 'b - Coins'],
        '(end) ');
    assert.equal(offx, 80 - 57 - 1);
    assert.equal(offx, 22);

    // "Do what with your bag?" action menu: widest is
    // "r - both reversed; put in, then take out" at 40+2.
    const bag = cornerMenuGeometry(
        ['Do what with your bag?', '', ': - Look inside the bag',
            'r - both reversed; put in, then take out', 'q - do nothing'],
        '(end) ');
    assert.equal(bag.offx, 80 - 42 - 1);
    assert.equal(bag.offx, 37);
});

test('cornerMenuGeometry clamps offx at 0 for very wide menus', () => {
    assert.equal(cornerMenuGeometry(['x'.repeat(77)], '(end) ').offx, 0);
    assert.equal(cornerMenuGeometry(['x'.repeat(78)], '(end) ').offx, 0);
    assert.equal(cornerMenuGeometry(['x'.repeat(100)], '(end) ').offx, 0);
});

test('cornerMenuGeometry promotes to full screen at display height', () => {
    const items22 = Array.from({ length: 22 }, () => 'a - item');
    const items23 = Array.from({ length: 23 }, () => 'a - item');
    assert.equal(cornerMenuGeometry(items22, '(end) ').fullScreen, false); // maxrow 23
    assert.equal(cornerMenuGeometry(items23, '(end) ').fullScreen, true); // maxrow 24
});

test('putInInventoryOverlayLines renders a corner window over the map', () => {
    const entries = [
        { item: { cls: 'coin', glyph: '$' }, category: 'coin', letter: '$', amount: 1163 },
    ];
    const { rows, offx, fullScreen } = putInInventoryOverlayLines(entries, 'Put in what?', 0, new Set());
    assert.equal(offx, 40);
    assert.equal(fullScreen, false);
    assert.deepEqual(rows, [
        [0, 41, 'Put in what?', 1],
        [1, 41, ''],
        [2, 41, 'Coins', 1],
        [3, 41, '$ - 1163 gold pieces', 0],
        [4, 41, '(end)'],
    ]);
});

test('putInInventoryOverlayLines marks selected entries with +', () => {
    const entries = [
        { item: { cls: 'coin', glyph: '$' }, category: 'coin', letter: '$', amount: 1163 },
    ];
    const { rows } = putInInventoryOverlayLines(entries, 'Put in what?', 0, new Set(['$']));
    assert.deepEqual(rows[3], [3, 41, '$ + 1163 gold pieces', 0]);
});

test('putInInventoryOverlayLines forces offx 0 at full-screen height', () => {
    // 22 content rows (header + 21 entries) overflow one page; the first
    // page's 21 rows plus title, blank line, and footer reach maxrow 24:
    // the menu must clear the screen and start at column 1 (seed9011
    // "Put in what?" page-one-of-two shape).
    const entries = Array.from({ length: 21 }, (_, index) => ({
        item: { cls: 'coin', glyph: '$' },
        category: 'coin',
        letter: '$',
        amount: index + 1,
    }));
    const { rows, offx, fullScreen } = putInInventoryOverlayLines(entries, 'Put in what?', 0, new Set());
    assert.equal(fullScreen, true);
    assert.equal(offx, 0);
    assert.equal(rows.length, 24);
    assert.deepEqual(rows[0], [0, 1, 'Put in what?', 1]);
    assert.deepEqual(rows[rows.length - 1], [23, 1, '(1 of 2)']);
});

test('putInInventoryOverlayLines handles an empty inventory', () => {
    const { rows, offx, fullScreen } = putInInventoryOverlayLines([], 'Put in what?', 0, new Set());
    assert.equal(offx, 40);
    assert.equal(fullScreen, false);
    assert.deepEqual(rows[2], [2, 41, 'You are not carrying anything.', 0]);
    assert.deepEqual(rows[rows.length - 1], [3, 41, '(end)']);
});
