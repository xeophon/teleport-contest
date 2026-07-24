import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { __allmainTestHooks } from '../js/allmain.js';
import { digDirectionCandidates, pickDigDirectionPrompt } from '../js/dig.js';
import {
    COLNO, DOOR, D_NODOOR, ROOM, ROWNO, STONE, TREE,
} from '../js/const.js';
import { initRng } from '../js/rng.js';

const PICK_AXE = 10025;
const DWARVISH_MATTOCK = 10104;

function testCell(typ = ROOM) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0 };
}

function makeGrid(fill = STONE) {
    const rows = [];
    for (let y = 0; y < ROWNO; y++) {
        const row = [];
        for (let x = 0; x < COLNO; x++) row.push(testCell(fill));
        rows.push(row);
    }
    return rows;
}

function pickAxeItem(letter = 'o', extra = {}) {
    return {
        otyp: PICK_AXE,
        letter,
        cls: 'weapon',
        kind: 'pick-axe',
        actualKind: 'pick-axe',
        singular: 'pick-axe',
        spe: 0,
        quan: 1,
        wielded: false,
        line: `${letter} - a pick-axe`,
        ...extra,
    };
}

// C ref: dig.c use_pick_axe() flow needs a hero in a room surrounded by
// diggable rock/wall, mirroring the level shape where the pilot session
// was recorded.
function installApplyState(seed = 1, { heroX = 10, heroY = 10, fill = STONE } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = {};
    g.context = {};
    g.inventory = [];
    g.moves = 100;
    const grid = makeGrid(fill);
    g.level = {
        flags: {},
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
        engravings: [],
        at: (x, y) => (x >= 0 && x < COLNO && y >= 0 && y < ROWNO ? grid[y][x] : testCell(STONE)),
        grid,
    };
    g.u = {
        ux: heroX,
        uy: heroY,
        uz: { dnum: 0, dlevel: 1 },
        uhp: 12,
        uhpmax: 12,
        ulevel: 1,
        udaminc: 0,
        utrap: 0,
        utraptype: null,
        acurr: { a: [13, 13, 11, 18, 11, 9] },
        ualign: { type: 0, record: 0 },
        uevent: {},
    };
    g.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 30 }];
    g.urace = { noun: 'human' };
    g.urole = { name: { m: 'Wizard' } };
    g._startup_race = 'human';
    g._startup_role = 'Wizard';
    grid[heroY][heroX] = testCell(ROOM);
    delete g._pick_dig_context;
    delete g._pick_dig_occupation;
    delete g._pending_message;
    delete g._message_more;
    delete g._command_mode;
    delete g._queued_pick_dig_apply_letter;
    delete g._apply_pick_dig_letter;
    delete g._pick_dig_reapply_letter;
    return g;
}

function givePick(letter = 'o', extra = {}) {
    const item = pickAxeItem(letter, extra);
    game.inventory.push(item);
    return item;
}

// C ref: dig.c use_pick_axe() dirsyms[] — candidate list is built in DIR_
// order (W,NW,N,NE,E,SE,S,SW) then down/up, skipping off-map and
// DIGTYP_UNDIGGABLE directions.
test('digDirectionCandidates lists every direction when rock surrounds the hero', () => {
    installApplyState();
    const item = givePick();
    assert.equal(digDirectionCandidates(item), 'hykulnjb>');
});

test('digDirectionCandidates skips floor (undiggable) directions', () => {
    const g = installApplyState();
    const item = givePick();
    // Open floor to the north and east; rock everywhere else.
    g.level.grid[g.u.uy - 1][g.u.ux] = testCell(ROOM);
    g.level.grid[g.u.uy][g.u.ux + 1] = testCell(ROOM);
    assert.equal(digDirectionCandidates(item), 'hyunjb>');
});

test('digDirectionCandidates skips an open doorway', () => {
    const g = installApplyState();
    const item = givePick();
    const doorway = testCell(DOOR);
    doorway.doormask = D_NODOOR;
    g.level.grid[g.u.uy][g.u.ux - 1] = doorway; // west, already dug open
    assert.equal(digDirectionCandidates(item), 'ykulnjb>');
});

test('digDirectionCandidates skips trees for a pick', () => {
    const g = installApplyState();
    const item = givePick();
    g.level.grid[g.u.uy - 1][g.u.ux] = testCell(TREE); // north
    assert.equal(digDirectionCandidates(item), 'hyulnjb>');
});

test('digDirectionCandidates offers up instead of down while levitating', () => {
    installApplyState();
    const item = givePick();
    game.u.levitating = true;
    assert.equal(digDirectionCandidates(item), 'hykulnjb<');
});

test('pickDigDirectionPrompt formats the C prompt with verb and bracket list', () => {
    installApplyState();
    const item = givePick();
    assert.equal(pickDigDirectionPrompt(item),
        'In what direction do you want to dig? [hykulnjb>]');
});

test('pickDigDirectionPrompt uses chop for axe tools', () => {
    const g = installApplyState();
    const axe = {
        otyp: 10000 + 999, letter: 'p', cls: 'weapon', kind: 'battle-axe',
        actualKind: 'battle-axe', spe: 0, quan: 1, wielded: true,
        line: 'p - a battle-axe (weapon in right hand)',
    };
    game.inventory.push(axe);
    // C ref: dig.c dig_typ() — an axe only digs closed doors and trees;
    // plain rock is DIGTYP_UNDIGGABLE and drops out of the candidate list.
    assert.equal(pickDigDirectionPrompt(axe),
        'In what direction do you want to chop? [>]');
    for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
            if (dx || dy) g.level.grid[g.u.uy + dy][g.u.ux + dx] = testCell(TREE);
    assert.equal(pickDigDirectionPrompt(axe),
        'In what direction do you want to chop? [hykulnjb>]');
});

async function applyObjectKey(letter) {
    game._command_mode = 'applyObject';
    await rhack(letter);
}

// C ref: dig.c:1092-1108 use_pick_axe() — applying an unwielded pick wields
// it ("You now wield %s.", wield.c:744 doname), queues a CANNED re-apply and
// returns ECMD_TIME (the wield consumes the turn).
test('applying an unwielded pick wields it, queues the canned re-apply, and takes the turn', async () => {
    installApplyState();
    const item = givePick();
    await applyObjectKey('o');
    assert.equal(item.wielded, true);
    assert.equal(game._pending_message, 'You now wield a pick-axe.');
    assert.equal(game._queued_pick_dig_apply_letter, 'o');
    assert.equal(game.context.move, 1);
    assert.equal(game._command_mode, null);
});

test('applying an already-wielded pick shows the candidate-list prompt immediately', async () => {
    installApplyState();
    givePick('o', { wielded: true, line: 'o - a pick-axe (weapon in right hand)' });
    await applyObjectKey('o');
    assert.equal(game._pending_message, 'In what direction do you want to dig? [hykulnjb>]');
    assert.equal(game._command_mode, 'applyPickDigDirection');
    assert.equal(game.context.move, 0);
});

// C ref: tty topl.c:tty_yn_function() — the canned re-apply's getdir()
// prompt must wait behind a --More-- while the wield message is
// unacknowledged; the prompt appears only after the player dismisses it.
test('canned re-apply gates the direction prompt behind a --More-- on the wield message', async () => {
    installApplyState();
    givePick('o', { wielded: true, line: 'o - a pick-axe (weapon in right hand)' });
    game._queued_pick_dig_apply_letter = 'o';
    game._pending_message = 'You now wield a pick-axe.';
    await __allmainTestHooks.maybePromptQueuedPickDigApplyForTest();
    assert.equal(game._command_mode, 'pickDigReapplyMore');
    assert.equal(game._message_more, 1);
    assert.equal(game._pending_message, 'You now wield a pick-axe.');
    // Non-dismiss keys are no-ops at the pending --More--.
    await rhack('.');
    assert.equal(game._command_mode, 'pickDigReapplyMore');
    assert.equal(game._message_more, 1);
    assert.equal(game._pending_message, 'You now wield a pick-axe.');
    // Dismissing reveals the prompt; no time elapses.
    await rhack(' ');
    assert.equal(game._command_mode, 'applyPickDigDirection');
    assert.equal(game._pending_message, 'In what direction do you want to dig? [hykulnjb>]');
    assert.equal(game._message_more, 0);
    assert.equal(game.context.move, 0);
});

test('canned re-apply shows the prompt immediately when the topline is clear', async () => {
    installApplyState();
    givePick('o', { wielded: true, line: 'o - a pick-axe (weapon in right hand)' });
    game._queued_pick_dig_apply_letter = 'o';
    await __allmainTestHooks.maybePromptQueuedPickDigApplyForTest();
    assert.equal(game._command_mode, 'applyPickDigDirection');
    assert.equal(game._message_more || 0, 0);
    assert.equal(game._pending_message, 'In what direction do you want to dig? [hykulnjb>]');
});

test('canned re-apply is dropped when the tool is no longer wielded', async () => {
    installApplyState();
    givePick('o', { wielded: true, line: 'o - a pick-axe (weapon in right hand)' });
    game._queued_pick_dig_apply_letter = 'o';
    game._apply_pick_dig_letter = null;
    game._pending_message = '';
    const item = game.inventory[0];
    item.wielded = false;
    item.line = 'o - a pick-axe';
    await __allmainTestHooks.maybePromptQueuedPickDigApplyForTest();
    assert.equal(game._command_mode ?? null, null);
    assert.equal(game._pending_message, '');
});

// C ref: cmd.c:getdir() — quitchars (" \r\n\033") cancel the direction
// prompt silently: use_pick_axe() returns ECMD_CANCEL with no message and
// no time elapsed.
test('space cancels the dig direction prompt silently', async () => {
    installApplyState();
    givePick('o', { wielded: true, line: 'o - a pick-axe (weapon in right hand)' });
    game._apply_pick_dig_letter = 'o';
    game._command_mode = 'applyPickDigDirection';
    await rhack(' ');
    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message || '', '');
    assert.equal(game.context.move, 0);
});

test('escape cancels the dig direction prompt silently', async () => {
    installApplyState();
    givePick('o', { wielded: true, line: 'o - a pick-axe (weapon in right hand)' });
    game._apply_pick_dig_letter = 'o';
    game._command_mode = 'applyPickDigDirection';
    await rhack('\x1b');
    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message || '', '');
    assert.equal(game.context.move, 0);
});
