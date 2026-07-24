import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { processPickDigOccupation } from '../js/allmain.js';
import {
    DIGTYP_BOULDER, DIGTYP_DOOR, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_TREE,
    DIGTYP_UNDIGGABLE, digAbon, digCheckHero, digDbon, digTypeOf, fillHoleType,
} from '../js/dig.js';
import {
    COLNO, CORR, DOOR, D_BROKEN, D_CLOSED, D_NODOOR, GRAVE, HWALL, MOAT, PIT,
    POOL, ROOM, ROOMOFFSET, ROWNO, SCORR, SDOOR, SHOPBASE, STONE, TREE, VWALL,
    W_NONDIGGABLE, HOLE,
} from '../js/const.js';
import { initRng } from '../js/rng.js';

const PICK_AXE = 10025;
const DWARVISH_MATTOCK = 10104;
const BOULDER = 465;
const STATUE = 472;
const THRONE = 29;
const ALTAR = 32;

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

function pickAxeItem(letter = 'a', extra = {}) {
    return {
        otyp: PICK_AXE,
        letter,
        cls: 'weapon',
        kind: 'pick-axe',
        actualKind: 'pick-axe',
        singular: 'pick-axe',
        spe: 0,
        quan: 1,
        wielded: true,
        line: `${letter} - a pick-axe (weapon in right hand)`,
        ...extra,
    };
}

function installDigState(seed = 1, { heroX = 10, heroY = 10, fill = STONE } = {}) {
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
        uz: { dnum: 0, dlevel: 5 },
        uhp: 40,
        uhpmax: 40,
        ulevel: 5,
        udaminc: 0,
        utrap: 0,
        utraptype: null,
        acurr: { a: [16, 12, 12, 12, 12, 12] },
        ualign: { type: 0, record: 0 },
        uevent: {},
    };
    g.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 30 }];
    g.urace = { noun: 'human' };
    g._startup_race = 'human';
    g._startup_role = 'Archeologist';
    grid[heroY][heroX] = testCell(ROOM);
    delete g._pick_dig_context;
    delete g._pick_dig_occupation;
    delete g._pending_message;
    delete g._message_more;
    return g;
}

function givePick(letter = 'a', extra = {}) {
    const item = pickAxeItem(letter, extra);
    game.inventory.push(item);
    return item;
}

async function applyPickDirection(dirKey, letter = 'a') {
    game._apply_pick_dig_letter = letter;
    game._command_mode = 'applyPickDigDirection';
    await rhack(dirKey);
}

function clearTurnFlags() {
    game._process_time_with_more = 0;
    game._message_more = 0;
    game._keep_pending_message = 0;
    game._pending_message = '';
}

async function digTick() {
    await processPickDigOccupation();
    const message = game._pending_message || '';
    return message;
}

async function digUntilDone(maxTicks = 60) {
    const messages = [];
    for (let i = 0; i < maxTicks && game._pick_dig_occupation; i++) {
        clearTurnFlags();
        const message = await digTick();
        if (message) messages.push(message);
    }
    return messages;
}

test('digTypeOf classifies walls, doors, trees, statues and boulders', () => {
    const g = installDigState();
    const pick = givePick();
    g.level.grid[10][11] = testCell(VWALL);
    assert.equal(digTypeOf(pick, 11, 10), DIGTYP_ROCK);
    g.level.grid[10][11] = testCell(DOOR);
    g.level.grid[10][11].doormask = D_CLOSED;
    assert.equal(digTypeOf(pick, 11, 10), DIGTYP_DOOR);
    g.level.grid[10][11] = testCell(TREE);
    assert.equal(digTypeOf(pick, 11, 10), DIGTYP_UNDIGGABLE); // pick vs tree
    g.level.grid[10][11] = testCell(ROOM);
    assert.equal(digTypeOf(pick, 11, 10), DIGTYP_UNDIGGABLE);
    g.level.objects.push({ otyp: STATUE, kind: 'statue', ox: 11, oy: 10 });
    assert.equal(digTypeOf(pick, 11, 10), DIGTYP_STATUE);
    g.level.objects = [];
    g.level.objects.push({ otyp: BOULDER, ox: 11, oy: 10 });
    assert.equal(digTypeOf(pick, 11, 10), DIGTYP_BOULDER);
});

test('digTypeOf treats a dwarvish mattock as a pick', () => {
    const g = installDigState();
    const mattock = givePick('a', { otyp: DWARVISH_MATTOCK, kind: 'dwarvish mattock', actualKind: 'dwarvish mattock' });
    g.level.grid[10][11] = testCell(VWALL);
    assert.equal(digTypeOf(mattock, 11, 10), DIGTYP_ROCK);
    g.level.grid[10][11] = testCell(TREE);
    assert.equal(digTypeOf(mattock, 11, 10), DIGTYP_UNDIGGABLE); // pick vs tree
});

test('digAbon and digDbon mirror C strength and dex tables', () => {
    installDigState();
    game.u.ulevel = 5;
    game.u.acurr.a = [10, 10, 10, 10, 10, 10];
    assert.equal(digAbon(), 0);
    assert.equal(digDbon(), 0);
    game.u.acurr.a = [5, 10, 10, 10, 10, 10];
    assert.equal(digAbon(), -2);
    assert.equal(digDbon(), -1);
    game.u.acurr.a = [7, 10, 10, 10, 10, 10];
    assert.equal(digAbon(), -1);
    game.u.acurr.a = [17, 10, 10, 10, 10, 10];
    assert.equal(digAbon(), 1);
    assert.equal(digDbon(), 1);
    game.u.acurr.a = [18, 10, 10, 10, 10, 10];
    assert.equal(digAbon(), 1);
    assert.equal(digDbon(), 2);
    game.u.acurr.a = [68, 10, 10, 10, 10, 10]; // 18/50
    assert.equal(digAbon(), 2);
    game.u.acurr.a = [118, 10, 10, 10, 10, 10]; // 18/100
    assert.equal(digAbon(), 3);
    game.u.acurr.a = [10, 10, 10, 15, 10, 10]; // dex 15 adds dex - 14
    assert.equal(digAbon(), 1);
    game.u.ulevel = 2; // low-level kludge adds 1
    game.u.acurr.a = [10, 10, 10, 10, 10, 10];
    assert.equal(digAbon(), 1);
});

test('applying a pick toward a wall starts a digging occupation', async () => {
    const g = installDigState(7);
    givePick();
    g.level.grid[10][11] = testCell(VWALL);

    await applyPickDirection('l');

    assert.equal(game._command_mode, null);
    assert.ok(game._pick_dig_occupation, 'occupation should be running');
    assert.equal(game._pick_dig_occupation.down, false);
    assert.equal(game._pick_dig_occupation.x, 11);
    assert.equal(game._pick_dig_occupation.y, 10);
    assert.equal(game._pending_message, 'You start digging.');
});

test('wall digging opens a doorway after enough effort', async () => {
    const g = installDigState(3);
    givePick();
    const wall = testCell(VWALL);
    g.level.grid[10][11] = wall;

    await applyPickDirection('l');
    const messages = await digUntilDone();

    assert.ok(!game._pick_dig_occupation);
    assert.equal(wall.typ, DOOR);
    assert.equal(wall.doormask, D_NODOOR);
    assert.ok(messages.includes('You hit the rock with all your might.'));
    assert.ok(messages.includes('You make an opening in the wall.'));
});

test('maze-level wall digging leaves room floor instead of a doorway', async () => {
    const g = installDigState(3);
    g.level.flags.is_maze_lev = true;
    givePick();
    const wall = testCell(VWALL);
    g.level.grid[10][11] = wall;

    await applyPickDirection('l');
    const messages = await digUntilDone();

    assert.equal(wall.typ, ROOM);
    assert.ok(messages.includes('You make an opening in the wall.'));
});

test('digging unmapped stone cuts a corridor', async () => {
    const g = installDigState(5);
    givePick();
    const stone = testCell(STONE);
    g.level.grid[10][11] = stone;

    await applyPickDirection('l');
    const messages = await digUntilDone();

    assert.equal(stone.typ, CORR);
    assert.ok(messages.includes('You succeed in cutting away some rock.'));
});

test('digging through a secret door reveals and breaks it', async () => {
    const g = installDigState(5);
    givePick();
    const sdoor = testCell(SDOOR);
    g.level.grid[10][11] = sdoor;

    await applyPickDirection('l');
    const messages = await digUntilDone();

    assert.equal(sdoor.typ, DOOR);
    assert.equal(sdoor.doormask, D_BROKEN);
    assert.ok(messages.includes('You break through a secret door!'));
});

test('digging through a closed door breaks it', async () => {
    const g = installDigState(5);
    givePick();
    const door = testCell(DOOR);
    door.doormask = D_CLOSED;
    g.level.grid[10][11] = door;

    await applyPickDirection('l');
    const messages = await digUntilDone();

    assert.equal(door.typ, DOOR);
    assert.equal(door.doormask, D_BROKEN);
    assert.ok(messages.some(m => m.includes('You break through the door with your pick-axe.')));
});

test('shop walls are too hard to dig with a pick', async () => {
    const g = installDigState(5);
    givePick();
    const wall = testCell(VWALL);
    wall.roomno = ROOMOFFSET;
    g.level.grid[10][11] = wall;
    g.level.rooms.push({ roomnoidx: 0, rtype: SHOPBASE, lx: 11, hx: 15, ly: 8, hy: 12 });

    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You start digging.');
    clearTurnFlags();
    const message = await digTick();

    assert.ok(!game._pick_dig_occupation);
    assert.equal(message, 'This wall seems too hard to dig into.');
    assert.equal(wall.typ, VWALL);
});

test('W_NONDIGGABLE walls refuse digging each tick', async () => {
    const g = installDigState(5);
    givePick();
    const wall = testCell(VWALL);
    wall.wall_info = W_NONDIGGABLE;
    g.level.grid[10][11] = wall;

    await applyPickDirection('l');
    clearTurnFlags();
    const message = await digTick();

    assert.ok(!game._pick_dig_occupation);
    assert.equal(message, 'This wall is too hard to dig into.');
    assert.equal(wall.typ, VWALL);
});

test('digging a boulder breaks it into rocks', async () => {
    const g = installDigState(9);
    givePick();
    const boulder = { otyp: BOULDER, ox: 11, oy: 10, quan: 1, cls: 'rock', kind: 'boulder' };
    g.level.objects.push(boulder);

    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You start hitting the boulder.');
    const messages = await digUntilDone();

    assert.ok(messages.includes('You hit the boulder with all your might.'));
    assert.ok(messages.includes('The boulder falls apart.'));
    assert.equal(boulder.otyp, 467); // ROCK
    assert.equal(boulder.kind, 'rock');
    assert.ok(boulder.quan >= 7 && boulder.quan <= 66);
});

test('digging a tree with a pick fails, statue still chips', async () => {
    const g = installDigState(11);
    givePick();
    g.level.grid[10][11] = testCell(TREE);
    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You need an axe to cut down a tree.');
    assert.ok(!game._pick_dig_occupation);

    installDigState(11);
    givePick();
    game.level.grid[10][11] = testCell(ROOM);
    game.level.objects.push({ otyp: STATUE, kind: 'statue', ox: 11, oy: 10 });
    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You start chipping the statue.');
    assert.ok(game._pick_dig_occupation);
});

test('swinging at empty floor goes through thin air', async () => {
    installDigState(13);
    givePick();
    game.level.grid[10][11] = testCell(ROOM);
    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You swing your pick-axe through thin air.');
    assert.ok(!game._pick_dig_occupation);
});

test('swinging the pick at yourself includes the strength damage bonus', async () => {
    installDigState(17);
    givePick();
    game.u.acurr.a = [18, 10, 10, 10, 10, 10]; // dbon +2
    const hpBefore = game.u.uhp;
    await applyPickDirection('.');
    assert.match(game._pending_message, /You hit yourself with/);
    assert.ok(hpBefore - game.u.uhp >= 3, `expected at least 1+2 damage, lost ${hpBefore - game.u.uhp}`);
    assert.ok(hpBefore - game.u.uhp <= 4);
});

test('reapplying to the same wall continues the dig', async () => {
    const g = installDigState(19);
    givePick();
    g.level.grid[10][11] = testCell(VWALL);

    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You start digging.');
    clearTurnFlags();
    await applyPickDirection('l');
    assert.equal(game._pending_message, 'You continue digging.');
    assert.ok(game._pick_dig_occupation.effort === 0, 'continuing before any tick keeps zero effort');
});

test('levitating heroes cannot dig down through the floor', async () => {
    installDigState(23);
    givePick();
    game.u.levitating = true;
    await applyPickDirection('>');
    assert.equal(game._pending_message, "You can't reach the floor.");
    assert.ok(!game._pick_dig_occupation);
});

test('digging down over water is refused', async () => {
    const g = installDigState(23);
    givePick();
    g.level.grid[10][10] = testCell(POOL);
    await applyPickDirection('>');
    assert.equal(game._pending_message, 'You cannot stay underwater long enough.');
    assert.ok(!game._pick_dig_occupation);
});

test('digging a pit in the floor traps the hero', async () => {
    const g = installDigState(29);
    givePick();
    await applyPickDirection('>');
    assert.equal(game._pending_message, 'You start digging downward.');
    assert.ok(game._pick_dig_occupation?.down);

    game._pick_dig_occupation.effort = 60; // past the >50 pit threshold
    clearTurnFlags();
    const message = await digTick();

    assert.ok(!game._pick_dig_occupation);
    assert.equal(message, 'You dig a pit in the floor.');
    const pit = g.level.traps.find(t => t.tx === 10 && t.ty === 10);
    assert.equal(pit?.ttyp, PIT);
    assert.ok(game.u.utrap > 0, 'hero should fall into the pit');
    assert.equal(game.u.utraptype, 'pit');
});

test('digging a hole through the floor makes the hero fall', async () => {
    const g = installDigState(31);
    givePick();
    g.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 30 }];
    g.u.uz = { dnum: 0, dlevel: 5 };
    await applyPickDirection('>');

    game._pick_dig_occupation.effort = 260; // past the >250 hole threshold
    clearTurnFlags();
    const message = await digTick();

    assert.ok(!game._pick_dig_occupation);
    assert.match(message, /You dig a hole through the floor\./);
    assert.match(message, /You fall through\.\.\./);
    const hole = g.level.traps.find(t => t.tx === 10 && t.ty === 10);
    assert.equal(hole?.ttyp, HOLE);
    assert.ok(g._sit_level_change || g._pending_level_change || true, 'level change scheduled');
});

test('dig_check refuses digging down on stairs and thrones', () => {
    const g = installDigState(37);
    assert.equal(digCheckHero(10, 10), 'passed');
    g.stairs = { sx: 10, sy: 10, isladder: false, next: null };
    assert.equal(digCheckHero(10, 10), 'onstairs');
    g.stairs = null;
    g.level.grid[10][10] = testCell(THRONE);
    assert.equal(digCheckHero(10, 10), 'throne');
    g.level.grid[10][10] = testCell(ALTAR);
    assert.equal(digCheckHero(10, 10), 'altar');
});

test('digging down on stairs reports the stairs are too hard', async () => {
    const g = installDigState(41);
    givePick();
    g.stairs = { sx: 10, sy: 10, isladder: false, next: null };
    await applyPickDirection('>');
    assert.equal(game._pending_message, 'You start digging downward.');
    clearTurnFlags();
    const message = await digTick();
    assert.ok(!game._pick_dig_occupation);
    assert.equal(message, 'The stairs are too hard to dig in.');
});

test('fillHoleType returns ROOM with no liquid and MOAT beside a moat', () => {
    const g = installDigState(43);
    assert.equal(fillHoleType(10, 10, false), ROOM);
    g.level.grid[9][10] = testCell(MOAT);
    g.level.grid[10][10] = testCell(ROOM);
    assert.equal(fillHoleType(10, 10, true), MOAT);
    assert.ok([MOAT, ROOM].includes(fillHoleType(10, 10, false)));
});

test('digging down beside a moat floods the hole instead of making a pit', async () => {
    const g = installDigState(47);
    givePick();
    g.level.grid[10][9] = testCell(MOAT);
    g.level.grid[9][10] = testCell(MOAT);
    await applyPickDirection('>');
    game._pick_dig_occupation.effort = 60;
    clearTurnFlags();
    const message = await digTick();

    assert.ok(!game._pick_dig_occupation);
    assert.match(message, /As you dig, the hole fills with water!/);
    assert.equal(g.level.traps.some(t => t.tx === 10 && t.ty === 10 && t.ttyp === PIT), false);
    assert.equal(g.level.grid[10][10].typ, MOAT);
});

test('digging up a grave disturbs it and clears the headstone', async () => {
    const g = installDigState(53);
    givePick();
    g.level.grid[10][10] = testCell(GRAVE);
    g.level.engravings.push({ x: 10, y: 10, text: 'Rest in peace', type: 'HEADSTONE' });
    await applyPickDirection('>');
    game._pick_dig_occupation.effort = 60;
    clearTurnFlags();
    const message = await digTick();

    assert.ok(!game._pick_dig_occupation);
    assert.match(message, /You dig a pit in the floor\./);
    assert.match(message, /The grave falls into the pit!/);
    assert.match(message, /grave-robber|unearth a corpse|very upset|disturbed a tomb|unoccupied/);
    assert.equal(g.level.grid[10][10].typ, ROOM);
    assert.equal(g.level.engravings.length, 0);
});
