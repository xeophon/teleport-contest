import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import {
    ANTI_MAGIC, ARROW_TRAP, BEAR_TRAP, DART_TRAP, D_CLOSED, D_TRAPPED, DOOR,
    HOLE, PIT, ROCKTRAP, ROOM, WEB,
} from '../js/const.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

// C refs: src/cmd.c (enter_explore_mode, do_repeat), src/pager.c (doidtrap,
// dohistory), src/version.c (doversion).  NetHack 5.0 has no #diagnose.

const VERSION_SHORT_LINE = 'MacOS NetHack Version 5.0.0 - last build May  2 2026 12:00:00.';

function testCell(typ = ROOM, extra = {}) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0, ...extra };
}

function installState(seed = 1, { debug = false, explore = false } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = { debug, explore };
    g.inventory = [];
    g._goldCount = 0;
    g.context = {};
    g.moves = 1;
    g.u = {
        ux: 10,
        uy: 10,
        ublesscnt: 0,
        uluck: 0,
        moreluck: 0,
        uhp: 10,
        uhpmax: 10,
        ulevel: 1,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    g.urole = { name: { m: 'Valkyrie', f: 'Valkyrie' } };
    g.level = {
        flags: {},
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
        engravings: [],
        at: () => testCell(),
    };
    vision_reset();
    return g;
}

async function typeExtended(text) {
    await rhack('#');
    for (const ch of text) await rhack(ch.charCodeAt(0));
    await rhack('\r');
}

function overlayText() {
    return (game._overlay_lines || []).map(row => row[2]).join('\n');
}

test('#history opens the history file pager and pages through it', async () => {
    installState();
    await typeExtended('history');
    assert.equal(game._command_mode, 'helpPager');
    assert.match(overlayText(), /NetHack History file for release 5\.0/);
    assert.match(overlayText(), /Behold, mortal, the origins of NetHack/);
    assert.match(overlayText(), /--More--/);

    await rhack(' ');
    assert.equal(game._command_mode, 'helpPager');
    assert.doesNotMatch(overlayText(), /NetHack History file for release 5\.0/);

    await rhack('\x1b');
    assert.equal(game._command_mode, null);
    assert.equal(game._overlay_lines, null);
    assert.equal(game.context.move, 0);
});

test('#hist unique-prefix autocompletes to #history', async () => {
    installState();
    await typeExtended('hist');
    assert.equal(game._command_mode, 'helpPager');
    assert.match(overlayText(), /NetHack History file for release 5\.0/);
});

test('#diagnose is unknown in NetHack 5.0', async () => {
    installState();
    await typeExtended('diagnose');
    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /#diagnose: unknown extended command\./);
});

test('#redo is unknown in NetHack 5.0 (command is #repeat)', async () => {
    installState();
    await typeExtended('redo');
    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /#redo: unknown extended command\./);
});

test('^ with no trap reports none visible and prompts first', async () => {
    installState();
    await rhack('^');
    assert.equal(game._command_mode, 'showtrapDirection');
    assert.match(game._pending_message, /In what direction\?/);

    await rhack('.');
    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /I can't see a trap there\./);
    assert.equal(game.context.move, 0);
});

test('^ describes a seen trap on the hero square', async () => {
    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: BEAR_TRAP, tseen: true }];
    await rhack('^');
    await rhack('.');
    assert.match(game._pending_message, /That is a bear trap\./);
    assert.equal(game.context.move, 0);
});

test('^ describes a seen adjacent trap via direction', async () => {
    installState();
    game.level.traps = [{ tx: 11, ty: 10, ttyp: ARROW_TRAP, tseen: true }];
    await rhack('^');
    await rhack('l');
    assert.match(game._pending_message, /That is an arrow trap\./);
});

test('^ uses an for vowel-initial trap names', async () => {
    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: ANTI_MAGIC, tseen: true }];
    await rhack('^');
    await rhack('.');
    assert.match(game._pending_message, /That is an anti-magic field\./);
});

test('^ ignores traps the hero has not seen', async () => {
    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: DART_TRAP, tseen: false }];
    await rhack('^');
    await rhack('.');
    assert.match(game._pending_message, /I can't see a trap there\./);
});

test('^ credits player-made traps with set/dug/woven wording', async () => {
    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: BEAR_TRAP, tseen: true, madeby_u: true }];
    await rhack('^');
    await rhack('.');
    assert.match(game._pending_message, /That is a bear trap set by you\./);

    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: WEB, tseen: true, madeby_u: true }];
    await rhack('^');
    await rhack('.');
    assert.match(game._pending_message, /That is a web woven by you\./);

    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: PIT, tseen: true, madeby_u: true }];
    await rhack('^');
    await rhack('.');
    assert.match(game._pending_message, /That is a pit dug by you\./);
});

test('^ up/down directions hide holes above and rock traps below', async () => {
    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: HOLE, tseen: true }];
    await rhack('^');
    await rhack('<');
    assert.match(game._pending_message, /I can't see a trap there\./);

    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: ROCKTRAP, tseen: true }];
    await rhack('^');
    await rhack('>');
    assert.match(game._pending_message, /I can't see a trap there\./);

    installState();
    game.level.traps = [{ tx: 10, ty: 10, ttyp: BEAR_TRAP, tseen: true }];
    await rhack('^');
    await rhack('<');
    assert.match(game._pending_message, /That is a bear trap\./);
});

test('^ describes a trapped door', async () => {
    installState();
    game.level.at = (x, y) => x === 11 && y === 10
        ? testCell(DOOR, { doormask: D_CLOSED | D_TRAPPED })
        : testCell();
    await rhack('^');
    await rhack('l');
    assert.match(game._pending_message, /That is a trapped door\./);
});

test('^ describes a known trapped chest', async () => {
    installState();
    game.level.objects = [{ ox: 11, oy: 10, kind: 'chest', otrapped: true, tknown: true }];
    await rhack('^');
    await rhack('l');
    assert.match(game._pending_message, /That is a trapped chest\./);
});

test('^ escape cancels the direction prompt silently', async () => {
    installState();
    await rhack('^');
    await rhack('\x1b');
    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message, '');
});

test('X enters explore mode after the beware prompt and confirmation', async () => {
    installState();
    await rhack('X');
    assert.equal(game._command_mode, 'exploreModeMore');
    assert.match(game._pending_message, /Beware!  From explore mode there will be no return to normal game,/);

    await rhack(' ');
    assert.equal(game._command_mode, 'exploreModeConfirm');
    assert.match(game._pending_message, /Do you want to enter explore mode\? \[yn\] \(n\)/);

    await rhack('y');
    assert.equal(game._command_mode, null);
    assert.equal(game.flags.explore, true);
    assert.match(game._pending_message, /You are now in non-scoring explore mode\./);
    assert.equal(game.context.move, 0);
});

test('X declined continues the normal game', async () => {
    installState();
    await rhack('X');
    await rhack(' ');
    await rhack('n');
    assert.equal(game._command_mode, null);
    assert.ok(!game.flags.explore);
    assert.match(game._pending_message, /Continuing with normal game\./);
});

test('X in explore mode reports it is already active', async () => {
    installState(1, { explore: true });
    await rhack('X');
    assert.ok(!game._command_mode);
    assert.match(game._pending_message, /You are already in explore mode\./);
});

test('X from debug mode names debug mode and drops wizard on entry', async () => {
    installState(1, { debug: true });
    await rhack('X');
    assert.match(game._pending_message, /no return to debug mode,/);
    await rhack(' ');
    await rhack('y');
    assert.equal(game.flags.explore, true);
    assert.equal(game.flags.debug, false);
});

test('V shows the one-line short version string', async () => {
    installState();
    await rhack('V');
    assert.ok(!game._command_mode);
    assert.equal(game._pending_message, VERSION_SHORT_LINE);
});

test('m-prefixed V shows the full version overlay', async () => {
    installState();
    await rhack('m');
    await rhack('V');
    assert.equal(game._command_mode, 'versionInfo');
    assert.match(overlayText(), /MacOS NetHack Version 5\.0\.0/);
});

test('^A with no previous command has nothing to repeat', async () => {
    installState();
    await rhack('\x01');
    assert.match(game._pending_message, /There is no command available to repeat\./);
});

test('^A repeats the last rest command', async () => {
    installState();
    await rhack('.');
    assert.equal(game.context.move, 1);
    game.context.move = 0;
    await rhack('\x01');
    assert.equal(game.context.move, 1);
    assert.equal(game._in_doagain, 0);
    assert.equal(game._repeat_last_key, '.');
});

test('^A repeats the last search command', async () => {
    installState();
    await rhack('s');
    assert.equal(game.context.move, 1);
    game.context.move = 0;
    await rhack('\x01');
    assert.equal(game.context.move, 1);
    assert.equal(game._repeat_last_key, 's');
});

test('^A repeats the last movement command', async () => {
    installState();
    await rhack('h');
    assert.equal(game.u.ux, 9);
    await rhack('\x01');
    assert.equal(game.u.ux, 8);
});

test('unknown commands clear the repeatable command', async () => {
    installState();
    await rhack('s');
    await rhack('\x03');
    assert.match(game._pending_message, /Unknown command '\^C'\./);
    await rhack('\x01');
    assert.match(game._pending_message, /There is no command available to repeat\./);
});

test('#repeat repeats the last command like ^A', async () => {
    installState();
    await rhack('s');
    game.context.move = 0;
    await typeExtended('repeat');
    assert.equal(game.context.move, 1);
});
