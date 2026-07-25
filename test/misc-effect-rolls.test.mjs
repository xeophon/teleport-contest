import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { HOLE, MAGIC_TRAP, ROOM } from '../js/const.js';

// C refs: trap.c:3035-3044 (dotrap already-seen escape roll), trap.c:2293-2320
// (trapeffect_magic_trap), trap.c:4317-4432 (domagictrap), hack.c:2552-2579
// (paranoid_confirmation:trap), hack.c:530-566 + invent.c:1446 + dig.c:2007
// (boulder plug useupf/delobj + bury_objs obj_resists rolls),
// read.c:2199-2200 + o_init.c:483 (scroll-read exercises),
// invent.c:1907-1909 + 1625-1660 (getobj letter compactify),
// insight.c:3007-3115 (list_genocided window).

const BOULDER = 465;

function testCell(typ = ROOM, extra = {}) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0, ...extra };
}

function installState(seed = 1, { debug = true } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = { debug };
    g.inventory = [];
    g._goldCount = 0;
    g.context = {};
    g.moves = 1;
    g.u = {
        ux: 10,
        uy: 10,
        uz: { dnum: 0, dlevel: 5 },
        ublesscnt: 0,
        uluck: 0,
        moreluck: 0,
        uhp: 30,
        uhpmax: 30,
        uen: 10,
        uenmax: 10,
        ulevel: 1,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        ualign: { type: 0, record: 0 },
    };
    g.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    g.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 30 }];
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

function magicTrap(tseen = true) {
    return { ttyp: MAGIC_TRAP, tseen, tx: 10, ty: 10, madeby_u: 0 };
}

function logNames() {
    return getRngLog().map(entry => entry.split('=')[0]);
}

function logValue(entry) {
    return Number(String(entry).split('=')[1]);
}

// Find a seed where the seen-trap escape roll succeeds (first roll is rn2(5)=0).
function seedWithEscape() {
    for (let seed = 1; seed < 500; seed++) {
        installState(seed);
        const trap = magicTrap(true);
        game.level.traps = [trap];
        enableRngLog();
        const result = shop.magicTrapResultForTest(trap);
        const log = getRngLog();
        if (log[0] === 'rn2(5)=0' && /escape/.test(result.message || '')) return seed;
    }
    throw new Error('no escape seed found');
}

// Find a seed where the escape roll fails and domagictrap's fate is a
// message-only outcome (13..19), avoiding monster creation and explosions.
function seedWithFate() {
    for (let seed = 1; seed < 500; seed++) {
        installState(seed);
        const trap = magicTrap(true);
        game.level.traps = [trap];
        enableRngLog();
        shop.magicTrapResultForTest(trap);
        const log = getRngLog();
        if (log[0] && log[0].startsWith('rn2(5)') && logValue(log[0]) !== 0
            && log[1] && log[1].startsWith('rn2(30)') && logValue(log[1]) !== 0
            && log[2] && log[2].startsWith('rnd(20)')) {
            const fate = logValue(log[2]);
            if (fate >= 13 && fate <= 19) return { seed, fate };
        }
    }
    throw new Error('no fate seed found');
}

test('magic trap consumes the dotrap escape roll rn2(5) before rn2(30) for a seen trap', () => {
    const { seed, fate } = seedWithFate();
    installState(seed);
    const trap = magicTrap(true);
    game.level.traps = [trap];
    enableRngLog();
    shop.magicTrapResultForTest(trap);
    const names = logNames();
    assert.deepEqual(names.slice(0, 3), ['rn2(5)', 'rn2(30)', 'rnd(20)']);
    assert.ok(fate >= 13 && fate <= 19);
});

test('magic trap escape roll of 0 escapes with no further rolls', () => {
    const seed = seedWithEscape();
    installState(seed);
    const trap = magicTrap(true);
    game.level.traps = [trap];
    enableRngLog();
    const result = shop.magicTrapResultForTest(trap);
    assert.equal(result.message, 'You escape a magic trap.');
    assert.deepEqual(logNames(), ['rn2(5)']);
});

test('magic trap on an unseen trap skips the escape roll', () => {
    const { seed } = seedWithFate();
    installState(seed);
    const trap = magicTrap(false);
    game.level.traps = [trap];
    enableRngLog();
    shop.magicTrapResultForTest(trap);
    const names = logNames();
    assert.deepEqual(names.slice(0, 2), ['rn2(30)', 'rnd(20)']);
    assert.equal(trap.tseen, true); // C ref: seetrap() in trapeffect_magic_trap (trap.c:2299)
});

test('stepping onto a seen magic trap asks paranoid_confirmation:trap first', async () => {
    installState(3);
    game.level.traps = [magicTrap(true)];
    game.level.traps[0].tx = 11;
    await rhack('l');
    assert.equal(game._command_mode, 'confirmTrapStep');
    assert.match(game._pending_message, /^Really step onto that magic trap\? \[yn\] \(n\)$/);
    assert.equal(game.context.move, 0);
    assert.equal(game.u.ux, 10);
});

test('declining the trap confirmation cancels the move', async () => {
    installState(3);
    game.level.traps = [magicTrap(true)];
    game.level.traps[0].tx = 11;
    await rhack('l');
    await rhack('n');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(game.u.ux, 10);
    assert.equal(game.u.uy, 10);
});

test('confirming the trap prompt runs the move and the dotrap escape roll', async () => {
    const { seed } = seedWithFate();
    installState(seed);
    const trap = magicTrap(true);
    trap.tx = 11;
    game.level.traps = [trap];
    await rhack('l');
    assert.equal(game._command_mode, 'confirmTrapStep');
    enableRngLog();
    await rhack('y');
    assert.equal(game.u.ux, 11);
    assert.equal(game.u.uy, 10);
    const names = logNames();
    assert.ok(names[0] === 'rn2(5)' && names[1] === 'rn2(30)');
});

test('stepping onto an unseen trap does not prompt', async () => {
    installState(3);
    const trap = magicTrap(false);
    trap.tx = 11;
    game.level.traps = [trap];
    await rhack('l');
    assert.notEqual(game._command_mode, 'confirmTrapStep');
    assert.equal(game.u.ux, 11);
});

test('pushed boulder plugs a hole: trap and boulder consumed, delobj rn2(100), no exercise', async () => {
    const g = installState(5);
    g.level.objects = [{ otyp: BOULDER, quan: 1, ox: 11, oy: 10 }];
    g.level.traps = [{ ttyp: HOLE, tseen: true, tx: 12, ty: 10, madeby_u: 0 }];
    enableRngLog();
    await rhack('l');
    assert.equal(g.level.traps.length, 0);
    assert.equal(g.level.objects.some(obj => obj.otyp === BOULDER), false);
    assert.equal(game.u.ux, 11);
    assert.equal(game.u.uy, 10);
    assert.equal(game.context.move, 1);
    assert.match(game._pending_message, /^The boulder falls into and plugs a hole in the floor!$/);
    const names = logNames();
    assert.ok(names.includes('rn2(100)')); // useupf -> delobj -> obj_resists(,0,0)
    assert.equal(names.includes('rn2(19)'), false); // dopush() skipped: no exercise
});

test('genocide read completion exercises wisdom only for a newly discovered scroll type', async () => {
    installState(7);
    game._genocide_pending = { learnedNewType: true };
    enableRngLog();
    await shop.endGenocidePromptForTest([]);
    assert.ok(logNames().includes('rn2(19)')); // discover_object (o_init.c:483)
    assert.equal(game.context.move, 1);

    installState(7);
    game._genocide_pending = { learnedNewType: false };
    enableRngLog();
    await shop.endGenocidePromptForTest([]);
    assert.equal(logNames().includes('rn2(19)'), false);
    assert.equal(game.context.move, 1);
});

test('getobj prompt letters compactify contiguous runs like C compactify()', () => {
    assert.equal(shop.getobjPromptLettersForTest('ijklmop'), 'i-mop');
    assert.equal(shop.getobjPromptLettersForTest('ijklmo'), 'i-mo');
    assert.equal(shop.getobjPromptLettersForTest('abcdef'), 'a-f');
    assert.equal(shop.getobjPromptLettersForTest('abdefg'), 'abd-g');
    // C compacts only when more than five letters are suggested (invent.c:1908)
    assert.equal(shop.getobjPromptLettersForTest('abcde'), 'abcde');
    assert.equal(shop.getobjPromptLettersForTest('ab'), 'ab');
    assert.equal(shop.getobjPromptLettersForTest('fg'), 'fg');
});

test('#genocided window matches C list_genocided layout and level sort', () => {
    installState(1);
    game._genocided_monsters = [
        'lich', 'demilich', 'master lich', 'arch-lich',
        'wood nymph', 'water nymph', 'mountain nymph',
    ];
    assert.deepEqual(shop.genocideListLinesForTest(), [
        [0, 41, 'Genocided species:'],
        [1, 41, ''],
        [2, 41, ' arch-liches'],
        [3, 41, ' master liches'],
        [4, 41, ' demiliches'],
        [5, 41, ' liches'],
        [6, 41, ' wood nymphs'],
        [7, 41, ' water nymphs'],
        [8, 41, ' mountain nymphs'],
        [9, 41, ''],
        [10, 41, '7 species genocided.'],
        [11, 41, '--More--'],
    ]);
});
