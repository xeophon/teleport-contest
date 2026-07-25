import assert from 'node:assert/strict';
import test from 'node:test';

import { gatherTravelLocs, travelPathKeys, travelStopsAfterOneStep } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import {
    D_BROKEN, D_CLOSED, D_ISOPEN, D_NODOOR, DOOR, GLOC_DOOR,
    GLOC_EXPLORE, POOL, ROOM, STONE,
} from '../js/const.js';

const BOULDER = 465; // object type id, mirroring cmd.js's local const

// C refs: src/hack.c (findtravelpath/test_move/travel_delay/doorless_door),
// src/getpos.c (gather_locs/cmp_coord_distu/IS_UNEXPLORED_LOC).

// Map legend: '#' seen wall, '.' seen floor, ',' unseen floor, ' ' unexplored
// stone, '+' closed door, 'o' open (intact) door, 'n' doorless doorway,
// 'b' broken door, '~' seen pool, '@' hero.
function charToLoc(ch) {
    switch (ch) {
    case '#': return { typ: STONE, seenv: true, waslit: true, disp_ch: '|' };
    case '.': case '@': return { typ: ROOM, seenv: true, waslit: true, disp_ch: '·' };
    case ',': return { typ: ROOM };
    case ' ': return { typ: STONE };
    case '+': return { typ: DOOR, doormask: D_CLOSED, seenv: true, waslit: true, disp_ch: '+' };
    case 'o': return { typ: DOOR, doormask: D_ISOPEN, seenv: true, waslit: true, disp_ch: '.' };
    case 'n': return { typ: DOOR, doormask: D_NODOOR, seenv: true, waslit: true, disp_ch: '·' };
    case 'b': return { typ: DOOR, doormask: D_BROKEN, seenv: true, waslit: true, disp_ch: '·' };
    case '~': return { typ: POOL, seenv: true, waslit: true, disp_ch: '}' };
    default: return { typ: STONE };
    }
}

function installMap(rows, { heroProps = {}, traps = [], objects = [] } = {}) {
    const g = resetGame();
    initRng(1);
    const cells = new Map();
    let hero = null;
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            cells.set(`${x},${y}`, charToLoc(ch));
            if (ch === '@') hero = { x, y };
        }
    });
    assert.ok(hero, 'map must contain @');
    g.flags = {};
    g.inventory = [];
    g.context = {};
    g.moves = 1;
    g.u = { ux: hero.x, uy: hero.y, ...heroProps };
    g.level = {
        flags: {},
        rooms: [],
        monsters: [],
        objects,
        traps,
        engravings: [],
        at: (x, y) => cells.get(`${x},${y}`),
    };
    return g;
}

test('travelPathKeys: straight corridor path (hack.c:1316-1449 BFS)', () => {
    installMap([
        '######',
        '#.@..#',
        '######',
    ]);
    assert.deepEqual(travelPathKeys(4, 1), ['l', 'l']);
});

test('travelPathKeys: seen trap blocks the only path (hack.c:1181-1200)', () => {
    installMap([
        '######',
        '#.@..#',
        '######',
    ], { traps: [{ tx: 3, ty: 1, tseen: true }] });
    // 1-wide corridor: a seen trap on it leaves no route at all.
    assert.deepEqual(travelPathKeys(4, 1), []);
});

test('travelPathKeys: unseen trap is pathed through', () => {
    installMap([
        '######',
        '#.@..#',
        '######',
    ], { traps: [{ tx: 3, ty: 1, tseen: false }] });
    assert.deepEqual(travelPathKeys(4, 1), ['l', 'l']);
});

test('travelPathKeys: seen trap forces a detour', () => {
    installMap([
        '#######',
        '#.@...#',
        '#.....#',
        '#######',
    ], { traps: [{ tx: 3, ty: 1, tseen: true }] });
    // shortest trap-free route: (2,1)->(3,2)->(4,1)->(5,1)
    assert.deepEqual(travelPathKeys(5, 1), ['n', 'u', 'l']);
});

test('travelPathKeys: known pool avoided unless hero can cross (hack.c:1181-1200)', () => {
    installMap([
        '#######',
        '#.@~~.#',
        '#.....#',
        '#######',
    ]);
    // shortest pool-free route: (2,1)->(3,2)->(4,2)->(5,1)
    assert.deepEqual(travelPathKeys(5, 1), ['n', 'l', 'u']);
});

test('travelPathKeys: levitating hero crosses pools directly', () => {
    installMap([
        '#######',
        '#.@~~.#',
        '#.....#',
        '#######',
    ], { heroProps: { levitation: true } });
    assert.deepEqual(travelPathKeys(5, 1), ['l', 'l', 'l']);
});

test('travelPathKeys: no diagonal moves into an intact doorway (hack.c:1208-1214)', () => {
    installMap([
        '#######',
        '#.....#',
        '#.o...#',
        '#..@..#',
        '#.....#',
        '#######',
    ]);
    // hero (3,3), target door (2,2): the diagonal 'y' is banned, so the
    // path goes around via an orthogonal first step.
    assert.deepEqual(travelPathKeys(2, 2), ['k', 'h']);
});

test('travelPathKeys: no diagonal moves out of an intact doorway (hack.c:1139-1150)', () => {
    const g = installMap([
        '#######',
        '#.....#',
        '#.o...#',
        '#.....#',
        '#..@..#',
        '#######',
    ]);
    g.u.ux = 2; // hero stands on the open door
    g.u.uy = 2;
    assert.deepEqual(travelPathKeys(3, 3), ['j', 'l']);
});

test('travelPathKeys: doorless doorway allows diagonal travel (doorless_door, hack.c:4062-4074)', () => {
    installMap([
        '#######',
        '#.....#',
        '#.n...#',
        '#..@..#',
        '#.....#',
        '#######',
    ]);
    assert.deepEqual(travelPathKeys(2, 2), ['y']);
});

test('travelPathKeys: broken door allows diagonal travel (doorless_door, hack.c:4062-4074)', () => {
    installMap([
        '#######',
        '#.....#',
        '#.b...#',
        '#..@..#',
        '#.....#',
        '#######',
    ]);
    assert.deepEqual(travelPathKeys(2, 2), ['y']);
});

test('travelPathKeys: boulder-blocked target rejected without allowBlockedTarget', () => {
    installMap([
        '######',
        '#.@..#',
        '######',
    ], { objects: [{ otyp: BOULDER, ox: 4, oy: 1 }] });
    assert.deepEqual(travelPathKeys(4, 1), []);
    assert.deepEqual(travelPathKeys(4, 1, false, false, true), ['l', 'l']);
});

test('travelStopsAfterOneStep: diagonal out of a doorway stops travel (hack.c:1271-1288)', () => {
    const g = installMap([
        '#######',
        '#.....#',
        '#.o@..#',
        '#.....#',
        '#######',
    ]);
    g.u.ux = 2; // hero on the open door
    g.u.uy = 2;
    assert.equal(travelStopsAfterOneStep(3, 3), true);  // diagonal target: test_move rejects
    assert.equal(travelStopsAfterOneStep(3, 2), false); // orthogonal target: direct move is fine
    assert.equal(travelStopsAfterOneStep(2, 4), false); // two steps away: normal travel
});

test('travelStopsAfterOneStep: not in a doorway, or door target, keeps multi-step travel', () => {
    installMap([
        '#######',
        '#.....#',
        '#.@...#',
        '#.o...#',
        '#######',
    ]);
    assert.equal(travelStopsAfterOneStep(3, 2), false); // hero not on a door
    const g = installMap([
        '#######',
        '#.....#',
        '#.n@..#',
        '#.....#',
        '#######',
    ]);
    g.u.ux = 2; // hero on a doorless doorway: no door to squeeze out of
    g.u.uy = 2;
    assert.equal(travelStopsAfterOneStep(3, 3), false);
    const g3 = installMap([
        '#######',
        '#.....#',
        '#.o.o.#',
        '#..@..#',
        '#######',
    ]);
    g3.u.ux = 2; // hero on open door; target (3,2) also holds a door:
    g3.u.uy = 2; // crawl_destination rejects door targets (hack.c:4095)
    assert.equal(travelStopsAfterOneStep(3, 2), false);
});

test('gatherTravelLocs GLOC_DOOR: hero first, then Chebyshev distance, ties y then x (getpos.c:311-329,511-554)', () => {
    const g = installMap([
        '###########',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.o.......#',
        '#.........#',
        '#....@..o.#',
        '#.......o.#',
        '#.........#',
        '#....o....#',
        '###########',
    ]);
    // hero at (5,6); doors: (2,4) d3, (8,6) d3, (8,7) d3, (5,9) d3 — all d3,
    // ordered by y then x: (2,4) y4, (8,6) y6, (8,7) y7, (5,9) y9.
    void g;
    const locs = gatherTravelLocs(GLOC_DOOR);
    assert.deepEqual(locs[0], { x: 5, y: 6 });
    assert.deepEqual(locs.slice(1), [
        { x: 2, y: 4 },
        { x: 8, y: 6 },
        { x: 8, y: 7 },
        { x: 5, y: 9 },
    ]);
});

test('gatherTravelLocs GLOC_DOOR: nearer doors sort first', () => {
    installMap([
        '###########',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.o.......#',
        '#....@....#',
        '#.......o.#',
        '#.........#',
        '###########',
    ]);
    // hero (5,5); doors (2,4) d3 and (8,6) d3 — plus none nearer.
    const locs = gatherTravelLocs(GLOC_DOOR);
    assert.deepEqual(locs[0], { x: 5, y: 5 });
    assert.deepEqual(locs.slice(1), [{ x: 2, y: 4 }, { x: 8, y: 6 }]);
});

test('gatherTravelLocs GLOC_EXPLORE: only seen walkable tiles next to unexplored (getpos.c:331-334,488-495)', () => {
    installMap([
        '#########',
        '#.......#',
        '#.......#',
        '#...@.. #',
        '#.......#',
        '#########',
    ]);
    // The ' ' at (7,3) is unexplored; seen floor orthogonally adjacent to
    // it: (6,3) d2, (7,2) d3, (7,4) d3 (ties broken by y).
    const locs = gatherTravelLocs(GLOC_EXPLORE);
    assert.deepEqual(locs[0], { x: 4, y: 3 });
    assert.deepEqual(locs.slice(1), [{ x: 6, y: 3 }, { x: 7, y: 2 }, { x: 7, y: 4 }]);
});
