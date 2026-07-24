import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev } from '../js/mklev.js';
import { init_dungeons_rng } from '../js/dungeon.js';
import {
    COLNO, ROWNO, STONE, ROOM, WATER, AIR, STAIRS, ALTAR, THRONE,
    AM_SHRINE, AM_SANCTUM, W_NONDIGGABLE, W_NONPASSWALL,
    OROOM, COURT, ZOO, BARRACKS, TEMPLE,
    MAGIC_PORTAL,
} from '../js/const.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';

const BOULDER = 465;
const GOLD_PIECE = 466;
const GEM_CLASS = 14;
const AMULET_CLASS = 15;

// Build a special level through the real mklev() dispatch.  The dungeon graph
// decides where each special level lives for the given seed, so the builder is
// exercised exactly the way wizard-mode levelport or stair travel reaches it.
async function buildSpecialLevel({ name, seed = 1, ulevel = 25 } = {}) {
    const g = resetGame();
    initRng(seed);
    init_dungeons_rng();
    const special = g.specialLevels?.find(level => level.name === name);
    assert.ok(special, `special level ${name} not registered in the dungeon graph`);
    g.moves = 100;
    g.flags = {};
    g.inventory = [];
    g.in_mklev = true;
    g.u = {
        ux: 40,
        uy: 10,
        ulevel,
        uz: { dnum: special.dnum, dlevel: special.dlevel },
        uhave: {},
        ualign: { type: 0, record: 10 },
    };
    g.level = new GameMap();
    enableRngLog({ reset: true });
    await mklev();
    return g;
}

function terrainSignature(g) {
    const parts = [];
    for (let y = 0; y < ROWNO; y++)
        for (let x = 0; x < COLNO; x++)
            parts.push(g.level.at(x, y)?.typ ?? -1);
    return parts.join(',');
}

function countTerrain(g, predicate) {
    let n = 0;
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (predicate(g.level.at(x, y), x, y)) n++;
    return n;
}

function monsterCounts(g) {
    const names = {};
    for (const mon of g.level.monsters || []) {
        const name = mon.data?.name || mon.name;
        names[name] = (names[name] || 0) + 1;
    }
    return names;
}

function stairsOf(g) {
    const stairs = [];
    for (let stair = g.stairs; stair; stair = stair.next) stairs.push(stair);
    return stairs;
}

test('earth plane builds cavern topology with portal to air and a stable RNG log', async () => {
    const g = await buildSpecialLevel({ name: 'earth', seed: 7 });
    const log = getRngLog();
    // getbones chance roll, nhlib.lua align shuffle, then the solidfill lit roll.
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(2\)=/);

    assert.equal(g.level.flags.is_maze_lev, true);
    assert.equal(g.level.flags.noteleport, true);
    assert.equal(g.level.flags.hardfloor, true);
    assert.equal(g.level.flags.shortsighted, true);
    // des.teleport_region({ region = {69,16,69,16} }) feeds both arrival regions.
    assert.deepEqual(
        [g.level.updest.lx, g.level.updest.ly, g.level.updest.hx, g.level.updest.hy],
        [g.level.dndest.lx, g.level.dndest.ly, g.level.dndest.hx, g.level.dndest.hy],
    );

    // 62 scripted monsters, 27 of them hostile earth elementals.
    assert.equal(g.level.monsters.length, 62);
    const names = monsterCounts(g);
    assert.equal(names['earth elemental'], 27);
    assert.equal(names['Elvenking'], 1);
    assert.equal(names['minotaur'], 2);
    for (const mon of g.level.monsters)
        if ((mon.data?.name || mon.name) === 'earth elemental') assert.equal(mon.mpeaceful, 0);
    assert.ok((g.level.objects || []).some(obj => obj.otyp === BOULDER));
    assert.ok(countTerrain(g, loc => loc?.typ === ROOM) > 100);

    const portal = (g.level.traps || []).find(trap => trap.ttyp === MAGIC_PORTAL);
    assert.ok(portal, 'earth -> air portal missing');
    assert.equal(portal.dst?.dnum, g.air_level?.dnum);
    assert.equal(portal.dst?.dlevel, g.air_level?.dlevel);
});

test('water plane floods the map, makes bubbles, and portals to astral', async () => {
    const g = await buildSpecialLevel({ name: 'water', seed: 7 });
    const log = getRngLog();
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(2\)=/);

    assert.equal(g.level.flags.noteleport, true);
    assert.equal(g.level.flags.shortsighted, true);
    // setup_waterlevel converts all leftover stone to water and cuts air bubbles.
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const typ = g.level.at(x, y)?.typ;
            assert.ok(typ === WATER || typ === AIR, `unexpected terrain ${typ} at ${x},${y}`);
        }
    assert.ok((g.level._waterBubbles || []).length > 0, 'no air bubbles generated');
    assert.ok(countTerrain(g, loc => loc?.typ === AIR) > 0);

    assert.equal(g.level.monsters.length, 60);
    const names = monsterCounts(g);
    assert.equal(names['water elemental'], 19);
    assert.ok(names['kraken'] >= 9);
    assert.ok(names['giant eel'] >= 8);
    assert.ok(names['electric eel'] >= 8);
    assert.ok(names['jellyfish'] >= 4);

    const portal = (g.level.traps || []).find(trap => trap.ttyp === MAGIC_PORTAL);
    assert.ok(portal, 'water -> astral portal missing');
    assert.equal(portal.dst?.dnum, g.astral_level?.dnum);
    assert.equal(portal.dst?.dlevel, g.astral_level?.dlevel);
});

test('astral plane creates three sanctum altars with high priests', async () => {
    const g = await buildSpecialLevel({ name: 'astral', seed: 7 });
    const log = getRngLog();
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(2\)=/);

    assert.equal(g.level.flags.noteleport, true);
    assert.equal(g.level.flags.nommap, true);
    assert.equal(g.level.flags.has_temple, true);

    const altars = [];
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            if (loc?.typ === ALTAR) altars.push(loc);
        }
    assert.equal(altars.length, 3);
    for (const altar of altars)
        assert.equal((altar.flags & (AM_SHRINE | AM_SANCTUM)) === (AM_SHRINE | AM_SANCTUM), true);

    const temples = (g.level.rooms || []).filter(room => room && room.hx > 0 && room.rtype === TEMPLE);
    assert.equal(temples.length, 3);
    const courts = (g.level.rooms || []).filter(room => room && room.hx > 0 && room.rtype === OROOM);
    assert.equal(courts.length, 3);
    const priests = (g.level.monsters || []).filter(mon => (mon.data?.name || mon.name) === 'high cleric');
    assert.equal(priests.length, 3);
    for (const priest of priests) assert.equal(priest.ispriest, 1);
    const riders = new Set(['Death', 'Pestilence', 'Famine']);
    assert.equal((g.level.monsters || []).filter(mon => riders.has(mon.data?.name || mon.name)).length, 3);

    // solidify: stone outside the map fragment is sealed.
    assert.ok(countTerrain(g, loc => loc?.typ === STONE
        && (loc.wall_info & W_NONDIGGABLE) && (loc.wall_info & W_NONPASSWALL)) > 0);
});

test('Fort Ludios builds the fort with Croesus, treasury gold, and branch portal', async () => {
    const g = await buildSpecialLevel({ name: 'knox', seed: 7 });
    const log = getRngLog();
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(2\)=/);

    assert.equal(g.level.flags.is_maze_lev, true);
    assert.equal(g.level.flags.noteleport, true);
    assert.equal(g.level.flags.has_court, true);
    assert.equal(g.level.flags.has_zoo, true);
    assert.equal(g.level.flags.has_barracks, true);

    // Rooms are created in script order: throne room, zoo, arrival, barracks.
    const rooms = (g.level.rooms || []).filter(room => room && room.hx > 0);
    assert.deepEqual(rooms.map(room => room.rtype), [COURT, ZOO, OROOM, BARRACKS]);
    assert.ok((g.level.monsters || []).some(mon => (mon.data?.name || mon.name) === 'Croesus'));
    assert.ok(countTerrain(g, loc => loc?.typ === THRONE) >= 1);
    // Treasury gold: one pile per treasury cell unless merged.
    const goldPiles = (g.level.objects || []).filter(obj => obj.otyp === GOLD_PIECE);
    assert.ok(goldPiles.length >= 30, `expected plenty of treasury gold, got ${goldPiles.length}`);
    // Corner-tower gems.
    const gems = (g.level.objects || []).filter(obj => obj.otyp === GEM_CLASS);
    assert.equal(gems.length, 12);
    // Walls around the fort are non-diggable.
    assert.ok(countTerrain(g, loc => loc && (loc.wall_info & W_NONDIGGABLE)) > 100);

    const portal = (g.level.traps || []).find(trap => trap.ttyp === MAGIC_PORTAL && trap.dst);
    assert.ok(portal, 'Fort Ludios branch portal missing');
});

test('fakewiz1 builds the fake tower with stairs, arrival room, and portal to wizard3', async () => {
    const g = await buildSpecialLevel({ name: 'fakewiz1', seed: 7, ulevel: 20 });
    const log = getRngLog();
    // getbones chance roll, align shuffle, then mazegrid (no solidfill roll);
    // the first mazewalk direction pick consumes rn2(3).
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(3\)=/);

    assert.equal(g.level.flags.is_maze_lev, true);
    const stairs = stairsOf(g);
    assert.equal(stairs.filter(stair => stair.up).length, 1);
    assert.equal(stairs.filter(stair => !stair.up).length, 1);
    // des.region({ region={04,03,06,06}, irregular=1, arrival_room=true })
    const rooms = (g.level.rooms || []).filter(room => room && room.hx > 0);
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].rtype, OROOM);
    assert.equal(rooms[0].irregular, true);

    const names = monsterCounts(g);
    // the vampire lord may generate in a shifted form; vampBase keeps the id
    assert.equal((g.level.monsters || []).filter(mon =>
        (mon.data?.name || mon.name) === 'vampire lord' || mon.vampBase === 'vampire lord').length, 1);
    assert.equal(names['kraken'], 1);
    const wizard3 = g.specialLevels?.find(level => level.name === 'wizard3');
    const portal = (g.level.traps || []).find(trap => trap.ttyp === MAGIC_PORTAL);
    assert.ok(portal, 'fakewiz1 -> wizard3 portal missing');
    assert.equal(portal.dst?.dnum, wizard3?.dnum);
    assert.equal(portal.dst?.dlevel, wizard3?.dlevel);
});

test('fakewiz2 mirrors fakewiz1 but with a random amulet and no portal', async () => {
    const g = await buildSpecialLevel({ name: 'fakewiz2', seed: 7, ulevel: 20 });
    const log = getRngLog();
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(3\)=/);

    const stairs = stairsOf(g);
    assert.equal(stairs.filter(stair => stair.up).length, 1);
    assert.equal(stairs.filter(stair => !stair.up).length, 1);
    assert.equal((g.level.rooms || []).filter(room => room && room.hx > 0).length, 0);
    const names = monsterCounts(g);
    // the vampire lord may generate in a shifted form; vampBase keeps the id
    assert.equal((g.level.monsters || []).filter(mon =>
        (mon.data?.name || mon.name) === 'vampire lord' || mon.vampBase === 'vampire lord').length, 1);
    assert.equal(names['kraken'], 1);
    const amulets = (g.level.objects || []).filter(obj => obj.otyp === AMULET_CLASS || obj.cls === 'amulet');
    assert.ok(amulets.length >= 1, 'fakewiz2 scripted amulet missing');
    // the scripted amulet sits inside the 9x9 tower map fragment (accounting
    // for the random level flip, it stays within the fragment bounds)
    assert.ok(amulets.some(obj => obj.ox >= 35 && obj.ox <= 43 && obj.oy >= 7 && obj.oy <= 15));
    assert.equal((g.level.traps || []).filter(trap => trap.ttyp === MAGIC_PORTAL).length, 0);
});

test('tut-2 builds the lit exit room with upstairs, burn message, and seen portal', async () => {
    const g = await buildSpecialLevel({ name: 'tut-2', seed: 7, ulevel: 1 });
    const log = getRngLog();
    assert.match(log[0], /^rn2\(3\)=/);
    assert.match(log[1], /^rn2\(3\)=/);
    assert.match(log[2], /^rn2\(2\)=/);
    assert.match(log[3], /^rn2\(2\)=/);

    assert.equal(g.level.flags.is_maze_lev, true);
    assert.equal(g.level.flags.rndmongen, false);
    assert.equal(g.level.flags.deathdrops, false);
    assert.equal(g.level.flags.noautosearch, true);

    const stairs = stairsOf(g);
    assert.equal(stairs.length, 1);
    assert.equal(stairs[0].up, true);
    assert.deepEqual([stairs[0].sx, stairs[0].sy], [35, 9]);
    assert.equal(g.level.at(35, 9)?.typ, STAIRS);

    const portal = (g.level.traps || []).find(trap => trap.ttyp === MAGIC_PORTAL);
    assert.ok(portal, 'tut-2 exit portal missing');
    assert.equal(portal.tseen, true);
    assert.deepEqual([portal.tx, portal.ty], [44, 12]);

    const engr = (g.level.engravings || []).find(e => e.x === 34 && e.y === 8);
    assert.ok(engr, 'tut-2 burn engraving missing');
    assert.equal(engr.text, "Use '<' to go up the stairs");
    assert.equal(engr.nowipeout, true);

    // "noflip": the map stays put, so the 14x8 room sits at (33,7)-(46,14).
    assert.equal(g.level.at(33, 7)?.typ === ROOM, false); // corner wall
    assert.equal(g.level.at(34, 8)?.typ, ROOM);
    assert.equal(g.level.at(45, 13)?.typ, ROOM);
    // non_diggable() seals every wall on the level.
    assert.ok(countTerrain(g, loc => loc && (loc.wall_info & W_NONDIGGABLE)) > 0);
});

test('special level builders are deterministic per seed for topology and RNG log', async () => {
    for (const name of ['earth', 'water', 'astral', 'knox', 'fakewiz1', 'fakewiz2', 'tut-2']) {
        const first = await buildSpecialLevel({ name, seed: 11 });
        const firstLog = getRngLog().join('\n');
        const firstTerrain = terrainSignature(first);
        const second = await buildSpecialLevel({ name, seed: 11 });
        const secondLog = getRngLog().join('\n');
        const secondTerrain = terrainSignature(second);
        assert.equal(secondLog, firstLog, `${name}: RNG log diverged between identical seeds`);
        assert.equal(secondTerrain, firstTerrain, `${name}: terrain diverged between identical seeds`);
    }
});