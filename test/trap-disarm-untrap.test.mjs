import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { mksobj } from '../js/mklev.js';
import { ARROW_TRAP, ROCKTRAP, ROOM } from '../js/const.js';

// C refs for this file:
//  - mktrap_victim()/mksobj() missile identity (mklev.c:1813-1830 +
//    mkobj.c object identity tables);
//  - untrap() default branch (trap.c:5952-5978);
//  - #levelchange pluslvl loop + trailing intrinsic message
//    (wizcmds.c:478-481, exper.c:307-365, attrib.c wiz_abil) combined per
//    update_topl() (win/tty/topl.c:251).

function testCell(typ = ROOM, extra = {}) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0, ...extra };
}

function installState(seed = 1, { debug = false } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = { debug, explore: false };
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
        uenmax: 10,
        uen: 10,
        ulevel: 1,
        uexp: 0,
        ulevelmax: 1,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    g.urole = { name: { m: 'Wizard', f: 'Wizard' }, rank: { m: 'Evoker', f: 'Evoker' } };
    g._startup_role = 'Wizard';
    g._startup_race = 'human';
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

test('mksobj assigns arrow identity (kind/plural/class) without waiting for mongets', () => {
    installState();
    const arrow = mksobj(349 /* ARROW */, true, false);
    assert.equal(arrow.kind, 'arrow');
    assert.equal(arrow.plural, 'arrows');
    assert.equal(arrow.cls, 'weapon');
    const dart = mksobj(353 /* DART */, true, false);
    assert.equal(dart.kind, 'dart');
    assert.equal(dart.plural, 'darts');
    const elven = mksobj(350 /* ELVEN_ARROW */, true, false);
    assert.equal(elven.kind, 'runed arrow');
    assert.equal(elven.actualKind, 'elven arrow');
    const orcish = mksobj(351 /* ORCISH_ARROW */, true, false);
    assert.equal(orcish.kind, 'crude arrow');
    const bolt = mksobj(10068 /* CROSSBOW_BOLT */, true, false);
    assert.equal(bolt.kind, 'crossbow bolt');
});

test('#untrap on a seen non-disarmable trap reports cannot-disable without consuming time', async () => {
    installState(9160, { debug: true });
    game.level.traps = [{ ttyp: ROCKTRAP, tx: 9, ty: 10, tseen: 1 }];
    await typeExtended('untrap');
    assert.equal(game._command_mode, 'untrapDirection');
    await rhack('h'.charCodeAt(0));
    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message, 'You cannot disable that trap.');
    assert.equal(game.context.move, 0);
    // The trap survives untouched.
    assert.equal(game.level.traps.length, 1);
});

test('#untrap . on a hero-square arrow trap runs try_disarm and consumes a turn', async () => {
    installState(9160, { debug: true });
    game.level.traps = [{ ttyp: ARROW_TRAP, tx: 10, ty: 10, tseen: 1 }];
    await typeExtended('untrap');
    assert.equal(game._command_mode, 'untrapDirection');
    await rhack('.'.charCodeAt(0));
    assert.equal(game.context.move, 1);
    // Whatever the roll outcome, control returns to the command loop and
    // the pending message is one of try_disarm's documented results
    // (trap.c:5441-5540).
    assert.match(game._pending_message,
        /^(Whoops\.\.\.|This arrow trap is difficult to disarm\.|You disarm (the|your) trap\.)/);
    assert.equal(game._command_mode, null);
});

test('#levelchange to a wizard level-15 endpoint shows trailing intrinsic message', async () => {
    installState(9160, { debug: true });
    game.u.ulevel = 14;
    game.u.ulevelmax = 14;
    await typeExtended('levelchange');
    assert.equal(game._command_mode, 'levelChangeText');
    await rhack('1'.charCodeAt(0));
    await rhack('5'.charCodeAt(0));
    await rhack('\r');
    assert.equal(game.u.ulevel, 15);
    assert.equal(game._pending_message, 'You feel more experienced.  Welcome to experience level 15.');
    assert.equal(game._message_more, 1);
    assert.equal(game._command_mode, 'levelChangeMore');
    // Dismissing the --More-- shows adjabil()'s intrinsic message alone,
    // without another --More-- (exper.c:363; tty topl line is fresh then).
    await rhack(' '.charCodeAt(0));
    assert.equal(game._pending_message, 'You feel sensitive!');
    assert.equal(game._message_more, 0);
    assert.equal(game._command_mode, null);
    assert.equal(game.u.warning, true);
});
