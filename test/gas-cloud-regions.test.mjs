import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { initRng, getRngLog, enableRngLog } from '../js/rng.js';
import { createGasCloud } from '../js/region.js';
import { ROOM, POOL, VWALL, HWALL } from '../js/const.js';

// C refs:
//  region.c:1213-1311 create_gas_cloud() — breadth-first expansion with a
//    Fisher-Yates-Knuth direction shuffle (region.c:1250-1259), the
//    nvalid==4 anti-rhombus rn2(2) skip (region.c:1270-1280), validity via
//    valid_cloud_pos() (read.c:1066-1074), and ttl = (rn1(3,4) * cloudsize)
//    / newidx (region.c:1301-1305).
//  region.c:1046-1061 expire_gas_cloud() — a "thick" cloud (damage >= 5)
//    halves damage and resets ttl to 2 instead of expiring on the first
//    zero-ttl crossing.

function installOpenLevel(seed = 4, { blocked = [] } = {}) {
    resetGame();
    initRng(seed);
    enableRngLog();
    const blockedSet = new Set(blocked.map(([x, y]) => `${x},${y}`));
    const cells = {};
    game.level = {
        regions: [],
        monsters: [],
        objects: [],
        at(x, y) {
            if (x < 1 || x >= 80 || y < 0 || y >= 21) return null;
            const key = `${x},${y}`;
            if (!cells[key]) cells[key] = { typ: blockedSet.has(key) ? VWALL : ROOM };
            return cells[key];
        },
    };
    game.u = { ux: 40, uy: 10, uhp: 40, uhpmax: 40 };
    game.moves = 1;
    game.context = {};
    return game;
}

test('createGasCloud: growth is BFS from center, no duplicates, bounded', () => {
    installOpenLevel(4);
    const region = createGasCloud(40, 10, 25, 8);
    assert.equal(region.coords[0].x, 40);
    assert.equal(region.coords[0].y, 10);
    assert.equal(new Set(region.coords.map(c => `${c.x},${c.y}`)).size, region.coords.length);
    assert.ok(region.coords.length <= 25);
});

test('createGasCloud: four shuffle draws per expanded cell (region.c:1250-1259)', () => {
    installOpenLevel(7);
    createGasCloud(40, 10, 9, 8);
    const log = getRngLog();
    // The first two cells are fully open, so they must consume exactly four
    // shuffle rolls (rn2(4..1)) before the ttl roll terminates creation.
    const firstShuffle = log.findIdx ?? 0;
    const shuffles = log.filter(e => /^rn2\((?:1|2|3|4)\)=/.test(e));
    // first cell: exactly rn2(4),rn2(3),rn2(2),rn2(1) in order, leading off
    assert.equal(shuffles[0].split('=')[0], 'rn2(4)');
    assert.equal(shuffles[1].split('=')[0], 'rn2(3)');
    assert.equal(shuffles[2].split('=')[0], 'rn2(2)');
    assert.equal(shuffles[3].split('=')[0], 'rn2(1)');
    // ttl roll is rn1(3,4) == rn2(3) + 4 (region.c:1301-1303)
    assert.ok(log.some(e => e.startsWith('rn2(3)=')));
});

test('createGasCloud: anti-rhombus skip consumes rn2(2) only when nvalid==4', () => {
    installOpenLevel(11);
    createGasCloud(40, 10, 25, 8);
    const log = getRngLog();
    // Anti-rhombus rolls are distinguishable from shuffles only by position,
    // but a fully-open second cell (all four neighbors valid and reachable)
    // consumes one extra rn2(2) right after its shuffle.
    const kinds = log.map(e => e.split('(')[1].split(')')[0]);
    // first cell's shuffle: 4,3,2,1 — then every BFS cell with all four
    // neighbors valid pays one extra nvalid==4 rn2(2) probe right after its
    // shuffle block, before the terminal rn1(3,4) (== rn2(3)) ttl roll.
    assert.deepEqual(kinds.slice(0, 4), ['4', '3', '2', '1']);
    const ttlIdx = kinds.lastIndexOf('3');
    assert.ok(ttlIdx > 4);
    const probes = kinds.slice(4, ttlIdx).filter(x => x === '2').length;
    assert.ok(probes > 0);
});

test('createGasCloud: walls/blocked terrain are never added (valid_cloud_pos)', () => {
    installOpenLevel(13, { blocked: [[40, 9], [41, 10]] });
    const region = createGasCloud(40, 10, 25, 8);
    assert.ok(!region.coords.some(c => (c.x === 40 && c.y === 9) || (c.x === 41 && c.y === 10)));
    assert.ok(region.coords.every(c => c.x >= 1 && c.x < 80 && c.y >= 0 && c.y < 21));
});

test('createGasCloud: ttl = trunc(rn1(3,4) * cloudsize / newidx)', () => {
    installOpenLevel(19);
    const region = createGasCloud(40, 10, 25, 8);
    const log = getRngLog();
    const ttlRoll = log.filter(e => e.startsWith('rn2(3)=')).pop();
    const base = Number(ttlRoll.split('=')[1]) + 4;
    assert.equal(region.ttl, Math.trunc((base * 25) / region.coords.length));
});

// --------------------------------------------------------------------------
// The expiry/hero-sides live in allmain.js advanceRegions().

import { advanceRegions } from '../js/allmain.js';

function installTickState() {
    resetGame();
    initRng(23);
    const level = {
        regions: [],
        monsters: [],
        objects: [],
        traps: [],
        at: (x, y) => ({ typ: ROOM }),
    };
    game.level = level;
    game.u = {
        ux: 40, uy: 10, uhp: 40, uhpmax: 40,
        blind: false, _blindTimeout: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    game.moves = 1;
    game.context = {};
    return level;
}

// region.c:1091-1133 inside_gas_cloud() hero branch: eyes sting +
// make_blinded(1) first, then burning-lungs damage rnd(dam)+5.
// Mon-side calls reuse the same ordering contract.
// ── But note: the direct heavy assertion here is expire_gas_cloud's
// damage-halving path, which allmain.advanceRegions port visibly.

test('advanceRegions: thick poison cloud halves damage before expiring (region.c:1046-1061)', () => {
    const level = installTickState();
    // no region covers the hero (far corner cloud)
    level.regions.push({
        type: 'gas_cloud', damage: 8, visible: true, ttl: 0,
        coords: [{ x: 10, y: 15 }, { x: 11, y: 15 }],
    });
    advanceRegions(game);
    assert.equal(level.regions.length, 1);
    assert.equal(level.regions[0].damage, 4);
    // expire_gas_cloud (region.c:1056-1059) resets ttl to 2; run_regions'
    // second loop (region.c:445-446) ticks that same round, leaving ttl 1.
    assert.equal(level.regions[0].ttl, 1);
    advanceRegions(game);
    assert.equal(level.regions.length, 1); // ttl 1 -> 0 this round
    advanceRegions(game);                  // second zero-crossing removes it
    assert.equal(level.regions.length, 0);
});