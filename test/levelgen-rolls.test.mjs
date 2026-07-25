import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev, object_display } from '../js/mklev.js';
import { init_dungeons_rng } from '../js/dungeon.js';
import { newsym } from '../js/display.js';
import {
    COLNO, ROWNO, DOOR, STAIRS, WEB, HOLE, TRAPDOOR,
} from '../js/const.js';
import { CLR_WHITE } from '../js/terminal.js';
import { initRng } from '../js/rng.js';

const BOULDER = 465;
const TALLOW_CANDLE = 370;
const WAX_CANDLE = 371;

// Build a special level through the real mklev() dispatch (same helper shape
// as test/special-levels.test.mjs).
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
    await mklev();
    return g;
}

function countTerrain(g, predicate) {
    let n = 0;
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (predicate(g.level.at(x, y), x, y)) n++;
    return n;
}

function stairsOf(g) {
    const stairs = [];
    for (let stair = g.stairs; stair; stair = stair.next) stairs.push(stair);
    return stairs;
}

// (a) C ref: sp_lev.c create_trap / mklev.c traptype_rnd — des.trap defaults to
// spider_on_web=1, so mktrapflags lacks MKTRAP_NOSPIDERONWEB and WEB is
// rejected (re-rolled) below level 7. Minetown is below level 7, so no random
// des.trap() web may ever generate there.
test('splevTrap never generates WEB below level 7 (minetown variants)', async () => {
    for (const seed of [1, 2, 3, 5, 8, 11, 13, 21, 42, 99]) {
        const g = await buildSpecialLevel({ name: 'minetn', seed });
        const webs = (g.level.traps || []).filter(trap => trap.ttyp === WEB);
        assert.equal(webs.length, 0,
            `seed ${seed}: WEB trap generated below level 7 (polarity inverted)`);
    }
});

// (b) C ref: detect.c premap_detect — sokoban levels are "premapped", so every
// boulder is map_object()ed at level load and stays drawn even after mapping.
test('sokoban boulders are marked seen at creation (premap)', async () => {
    const g = await buildSpecialLevel({ name: 'soko1', seed: 1 });
    const boulders = (g.level.objects || []).filter(obj => obj.otyp === BOULDER);
    assert.ok(boulders.length >= 15, `expected many boulders, got ${boulders.length}`);
    for (const boulder of boulders)
        assert.equal(boulder.seen, true, 'sokoban boulder not marked seen');
});

// (c) C ref: display.c mapglyph — stair direction comes from the tile's own
// ladder field (LA_DOWN -> '>', otherwise '<'), not from the single upstair
// pointer. Both directions must render even when a level has several up stairs.
test('stair glyph direction comes from loc.ladder, not the upstair pointer', async () => {
    const g = await buildSpecialLevel({ name: 'soko1', seed: 1 });
    const downStairTile = (() => {
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const loc = g.level.at(x, y);
                if (loc?.typ === STAIRS && (loc.ladder ?? 0) === 2) return { x, y };
            }
        return null;
    })();
    assert.ok(downStairTile, 'no down stair tile found');
    newsym(downStairTile.x, downStairTile.y);
    assert.equal(g.level.at(downStairTile.x, downStairTile.y).disp_ch, '>',
        'ladder=2 (down) stair must render >');

    // Forge an up-stair tile away from the upstair pointer and check it renders '<'.
    const loc = g.level.at(downStairTile.x + 1, downStairTile.y);
    loc.typ = STAIRS;
    loc.ladder = 1;
    newsym(downStairTile.x + 1, downStairTile.y);
    assert.equal(g.level.at(downStairTile.x + 1, downStairTile.y).disp_ch, '<',
        'ladder=1 (up) stair must render < regardless of the upstair pointer');
});

// (c) C ref: mkmaze.c fixup_special — des.levregion stair placement is deferred
// until after the script and the flip. Both stairs must exist after creation.
test('minetown levregion stairs are placed (deferred fixup_special order)', async () => {
    const g = await buildSpecialLevel({ name: 'minetn', seed: 5, ulevel: 1 });
    const stairs = stairsOf(g);
    assert.ok(stairs.some(stair => stair.up), 'no up stair placed');
    assert.ok(stairs.some(stair => !stair.up), 'no down stair placed');
});

// (c) C ref: makemon.c newmonhp/adj_lev — fixed-spawn monsters get adj_lev()
// levels; watchman (mlevel 6) and watch captain (mlevel 10) must not use stale
// hardcoded hpLevel values.
test('watchman/watch captain HP dice follow adj_lev, not stale hpLevel', async () => {
    const g = await buildSpecialLevel({ name: 'minetn', seed: 5, ulevel: 1 });
    const watchmen = (g.level.monsters || []).filter(mon =>
        /watchman|watch captain/.test(mon.data?.name || ''));
    assert.ok(watchmen.length >= 3, 'expected watchmen on the level');
    for (const mon of watchmen) {
        const name = mon.data?.name || '';
        if (name === 'watchman') {
            assert.equal(mon.m_lev, 6, 'watchman m_lev should be adj_lev(6)=6');
            assert.ok(mon.mhp >= 7 && mon.mhp <= 48,
                `watchman hp ${mon.mhp} outside d(6,8) range [7,48]`);
        } else if (name === 'watch captain') {
            assert.equal(mon.m_lev, 9, 'watch captain m_lev should be adj_lev(10)=9 at this depth');
            assert.ok(mon.mhp >= 10 && mon.mhp <= 72,
                `watch captain hp ${mon.mhp} outside d(9,8) range [10,72]`);
        }
    }
});

// (c) C ref: sp_lev.c ensure_way_out() — levels flagged "inaccessibles" get an
// escape hatch (hole/trapdoor) when a region cannot be reached from the stairs.
test('ensure_way_out creates an escape hole/trapdoor on inaccessible levels', async () => {
    const g = await buildSpecialLevel({ name: 'minetn', seed: 5, ulevel: 1 });
    const escapes = (g.level.traps || []).filter(trap =>
        trap.ttyp === HOLE || trap.ttyp === TRAPDOOR);
    assert.ok(escapes.length >= 1,
        'no ensure_way_out hole/trapdoor generated on an inaccessibles level');
});

// C ref: nhlua.c char2typ — 'x' is MAX_TYPE ("see-through"); the map loader
// leaves the mines-fill tile in place instead of converting it to stone.
test('minetn-6 map x cells stay see-through (cavern preserved)', async () => {
    const g = await buildSpecialLevel({ name: 'minetn', seed: 5, ulevel: 1 });
    const accessible = countTerrain(g, loc => (loc?.typ ?? 0) >= DOOR);
    // With 'x' wiped to STONE the accessible cavern count collapses; a healthy
    // bustling-town layout keeps several hundred accessible tiles.
    assert.ok(accessible > 400,
        `only ${accessible} accessible tiles; 'x' cells were wiped to stone`);
});

// C ref: objects.h — tallow/wax candles are WAX colored CLR_WHITE.
test('tallow and wax candles render white, not the generic tool color', () => {
    assert.equal(object_display({ otyp: TALLOW_CANDLE }).color, CLR_WHITE);
    assert.equal(object_display({ otyp: WAX_CANDLE }).color, CLR_WHITE);
});
