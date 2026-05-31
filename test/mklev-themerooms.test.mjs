import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { __mklevTestHooks as mklevHooks } from '../js/mklev.js';
import { processCorpseTimers } from '../js/cmd.js';
import { init_rect } from '../js/rect.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, ROOMOFFSET, TREE, ICE, ICED_POOL, ICED_MOAT,
    VWALL, HWALL, POOL, LAVAPOOL, WATER, FOUNTAIN, ALTAR, AM_SHRINE, OROOM, TEMPLE,
    SDOOR, AIR, CLOUD, FILL_NORMAL,
    MAXNROFROOMS,
    A_CHAOTIC, A_LAWFUL, A_NEUTRAL, Align2amask,
    SHOPBASE, CANDLESHOP, MATCH_WALL, SET_LIT_RANDOM, SET_LIT_NOCHANGE,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
    SLP_GAS_TRAP, RUST_TRAP, TELEP_TRAP, WEB, STATUE_TRAP, ANTI_MAGIC, BURN,
} from '../js/const.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';

const CHEST = 215;
const OIL_LAMP = 227;
const BOULDER = 465;
const CORPSE = 471;
const STATUE = 472;

const MASSACRE_CORPSE_NAMES = new Set([
    'apprentice', 'warrior', 'ninja', 'thug',
    'hunter', 'acolyte', 'abbot', 'page',
    'attendant', 'neanderthal', 'chieftain',
    'student', 'wizard', 'valkyrie', 'tourist',
    'samurai', 'rogue', 'ranger', 'priestess',
    'priest', 'monk', 'knight', 'healer',
    'cavewoman', 'caveman', 'barbarian',
    'archeologist',
]);

function installThemeroomGame({
    dlevel = 1,
    moves = 100,
    seed = 1,
    width = 4,
    height = 4,
} = {}) {
    const g = resetGame();
    initRng(seed);
    g.moves = moves;
    g.flags = {};
    g.inventory = [];
    g.in_mklev = true;
    g.u = {
        ux: 70,
        uy: 18,
        ulevel: 1,
        uz: { dnum: 0, dlevel },
        uhave: {},
    };
    g.level = new GameMap();
    const room = {
        lx: 2,
        ly: 2,
        hx: 2 + width - 1,
        hy: 2 + height - 1,
        nsubrooms: 0,
        roomnoidx: 0,
    };
    g.level.rooms = [room];
    g.level.nroom = 1;
    for (let x = room.lx; x <= room.hx; x++) {
        for (let y = room.ly; y <= room.hy; y++) {
            const loc = g.level.at(x, y);
            loc.typ = ROOM;
            loc.roomno = ROOMOFFSET;
        }
    }
    return { g, room };
}

function installMkmapGame({ seed = 1, dlevel = 1 } = {}) {
    const g = resetGame();
    initRng(seed);
    g.moves = 0;
    g.flags = {};
    g.inventory = [];
    g.in_mklev = true;
    g.u = {
        ux: 70,
        uy: 18,
        ulevel: 1,
        uz: { dnum: 0, dlevel },
        uhave: {},
    };
    g.level = new GameMap();
    return g;
}

function terrainSignature(g) {
    const parts = [];
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            parts.push(g.level.at(x, y)?.typ ?? -1);
    return parts.join(',');
}

function minesInitSignature(seed, options = {}) {
    const g = installMkmapGame({ seed });
    mklevHooks.splevMinesLevelInit(ROOM, STONE, options);
    return terrainSignature(g);
}

test('themed buried zombie species follow C difficulty gates', () => {
    installThemeroomGame({ dlevel: 1 });
    assert.deepEqual(mklevHooks.themeroomBuriedZombieSpecies(), ['kobold', 'gnome', 'orc', 'dwarf']);

    installThemeroomGame({ dlevel: 4 });
    assert.deepEqual(mklevHooks.themeroomBuriedZombieSpecies(), [
        'kobold', 'gnome', 'orc', 'dwarf', 'elf', 'human',
    ]);

    installThemeroomGame({ dlevel: 7 });
    assert.deepEqual(mklevHooks.themeroomBuriedZombieSpecies(), [
        'kobold', 'gnome', 'orc', 'dwarf', 'elf', 'human', 'ettin', 'giant',
    ]);
});

test('mines level_init smoothed option gates only the C pass-three smoothing', () => {
    const options = { lit: 0, joined: false, walled: false };
    assert.equal(
        minesInitSignature(12, options),
        minesInitSignature(12, { ...options, smoothed: false }),
    );

    let foundSmoothedDifference = false;
    for (let seed = 1; seed <= 20 && !foundSmoothedDifference; seed++) {
        foundSmoothedDifference = minesInitSignature(seed, { ...options, smoothed: false })
            !== minesInitSignature(seed, { ...options, smoothed: true });
    }
    assert.equal(foundSmoothedDifference, true);
});

test('mines level_init defaults leave rooms unjoined and explicit joined lit rooms become cavernous', () => {
    const unjoined = installMkmapGame({ seed: 5 });
    mklevHooks.splevMinesLevelInit(ROOM, STONE, { lit: 0 });
    assert.equal(unjoined.level.nroom, 0);
    assert.equal(!!unjoined.level.flags.is_cavernous_lev, false);

    const joined = installMkmapGame({ seed: 5 });
    joined.level.flags.is_maze_lev = true;
    mklevHooks.splevMinesLevelInit(ROOM, STONE, {
        lit: 1, smoothed: true, joined: true, walled: true,
    });

    assert.equal(joined.level.flags.is_maze_lev, false);
    assert.equal(joined.level.flags.is_cavernous_lev, true);
});

test('mkmap finish matches C tree lighting and ice pool metadata', () => {
    const moatIce = installMkmapGame();
    moatIce.level.at(10, 10).typ = TREE;
    moatIce.level.at(11, 10).typ = ICE;
    moatIce.level.rooms = [{ rlit: 0 }];
    moatIce.level.nroom = 1;
    mklevHooks.mkmap_finish(ROOM, TREE, true, false, false, false);
    assert.equal(moatIce.level.at(10, 10).lit, true);
    assert.equal(moatIce.level.at(11, 10).icedpool, ICED_MOAT);
    assert.equal(moatIce.level.rooms[0].rlit, 1);

    const poolIce = installMkmapGame();
    poolIce.level.at(11, 10).typ = ICE;
    mklevHooks.mkmap_finish(ROOM, ICE, false, false, false, true);
    assert.equal(poolIce.level.at(11, 10).icedpool, ICED_POOL);
});

test('replace terrain supports C region bounds wall matching and lit updates', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = VWALL;
    g.level.at(11, 10).typ = HWALL;
    g.level.at(12, 10).typ = ROOM;

    const changed = mklevHooks.replace_special_terrain({
        x1: 10, y1: 10, x2: 12, y2: 10,
        fromTyp: MATCH_WALL, toTyp: ROOM, chance: 100, lit: 1,
    });

    assert.equal(changed, 2);
    assert.equal(g.level.at(10, 10).typ, ROOM);
    assert.equal(g.level.at(11, 10).typ, ROOM);
    assert.equal(g.level.at(12, 10).typ, ROOM);
    assert.equal(g.level.at(10, 10).lit, true);
    assert.equal(g.level.at(11, 10).lit, true);
});

test('replace terrain preserves old width-height signature and C lava lighting', () => {
    const g = installMkmapGame();
    g.level.at(3, 4).typ = STONE;
    g.level.at(4, 4).typ = STONE;
    g.level.at(5, 4).typ = STONE;

    const changed = mklevHooks.replace_special_terrain(3, 4, 2, 1, STONE, LAVAPOOL, 100, 0);

    assert.equal(changed, 2);
    assert.equal(g.level.at(3, 4).typ, LAVAPOOL);
    assert.equal(g.level.at(4, 4).typ, LAVAPOOL);
    assert.equal(g.level.at(5, 4).typ, STONE);
    assert.equal(g.level.at(3, 4).lit, true);
    assert.equal(g.level.at(4, 4).lit, true);
});

test('replace terrain accepts C mapchars and simple selection masks', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = VWALL;
    g.level.at(11, 10).typ = HWALL;
    g.level.at(12, 10).typ = VWALL;

    const changed = mklevHooks.replaceDesTerrain({
        selection: new Set(['10,10', '12,10']),
        fromterrain: '|',
        toterrain: '.',
        chance: 100,
        lit: 1,
    });

    assert.equal(changed, 2);
    assert.equal(g.level.at(10, 10).typ, ROOM);
    assert.equal(g.level.at(11, 10).typ, HWALL);
    assert.equal(g.level.at(12, 10).typ, ROOM);
    assert.equal(g.level.at(10, 10).lit, true);
    assert.equal(g.level.at(12, 10).lit, true);
});

test('replace terrain accepts C-style selection object predicates and bounds', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = ROOM;
    g.level.at(11, 10).typ = ROOM;
    g.level.at(12, 10).typ = ROOM;
    g.level.at(13, 10).typ = ROOM;
    const getQueries = [];

    const changedByGet = mklevHooks.replaceDesTerrain({
        selection: {
            bounds: () => ({ lx: 10, ly: 10, hx: 12, hy: 10 }),
            get(x, y) {
                getQueries.push(`${x},${y}`);
                return x === 11 && y === 10;
            },
        },
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });
    const changedByHas = mklevHooks.replaceDesTerrain({
        selection: {
            lx: 12, ly: 10, hx: 13, hy: 10,
            has: (x, y) => x === 12 && y === 10,
        },
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(changedByGet, 1);
    assert.deepEqual(getQueries, ['10,10', '11,10', '12,10']);
    assert.equal(changedByHas, 1);
    assert.equal(g.level.at(10, 10).typ, ROOM);
    assert.equal(g.level.at(11, 10).typ, CORR);
    assert.equal(g.level.at(12, 10).typ, CORR);
    assert.equal(g.level.at(13, 10).typ, ROOM);
});

test('replace terrain keeps explicit empty selections empty', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = ROOM;
    g.level.at(11, 10).typ = ROOM;

    const changed = mklevHooks.replaceDesTerrain({
        selection: [],
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });
    const cSelectionChanged = mklevHooks.replaceDesTerrain({
        selection: {
            bounds: () => [10, 10, 11, 10],
            get: () => false,
        },
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(changed, 0);
    assert.equal(cSelectionChanged, 0);
    assert.equal(g.level.at(10, 10).typ, ROOM);
    assert.equal(g.level.at(11, 10).typ, ROOM);
});

test('replace terrain accepts iterator selections and keeps C column-zero skip', () => {
    const g = installMkmapGame();
    g.level.at(0, 10).typ = ROOM;
    g.level.at(1, 10).typ = ROOM;
    g.level.at(2, 10).typ = ROOM;

    const changed = mklevHooks.replaceDesTerrain({
        selection: {
            iterate(callback) {
                callback(0, 10);
                callback(1, 10);
                callback(2, 10);
            },
        },
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(changed, 2);
    assert.equal(g.level.at(0, 10).typ, ROOM);
    assert.equal(g.level.at(1, 10).typ, CORR);
    assert.equal(g.level.at(2, 10).typ, CORR);
});

test('replace terrain default full-map selection keeps C column-zero skip', () => {
    const g = installMkmapGame();
    g.level.at(0, 10).typ = ROOM;
    g.level.at(1, 10).typ = ROOM;

    const changed = mklevHooks.replaceDesTerrain({
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(changed, 1);
    assert.equal(g.level.at(0, 10).typ, ROOM);
    assert.equal(g.level.at(1, 10).typ, CORR);
});

test('replace terrain region takes precedence over selection masks', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = ROOM;
    g.level.at(11, 10).typ = ROOM;

    const changed = mklevHooks.replaceDesTerrain({
        region: [10, 10, 10, 10],
        selection: new Set(['11,10']),
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(changed, 1);
    assert.equal(g.level.at(10, 10).typ, CORR);
    assert.equal(g.level.at(11, 10).typ, ROOM);
});

test('special-level selection area and grow feed replace terrain masks', () => {
    const g = installMkmapGame();
    for (let x = 0; x <= 2; x++)
        for (let y = 9; y <= 11; y++)
            g.level.at(x, y).typ = ROOM;

    const changed = mklevHooks.replaceDesTerrain({
        selection: mklevHooks.splevSelection.area(1, 10, 1, 10).grow(),
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(changed, 6);
    assert.equal(g.level.at(0, 9).typ, ROOM);
    assert.equal(g.level.at(0, 10).typ, ROOM);
    assert.equal(g.level.at(0, 11).typ, ROOM);
    assert.equal(g.level.at(1, 9).typ, CORR);
    assert.equal(g.level.at(2, 11).typ, CORR);
});

test('special-level selection match percentage and union follow C mask contracts', () => {
    const g = installMkmapGame({ seed: 23 });
    g.level.at(10, 10).typ = ROOM;
    g.level.at(11, 10).typ = ROOM;
    g.level.at(12, 10).typ = ROOM;
    enableRngLog({ reset: true });

    const selected = mklevHooks.splevSelection.match('.').percentage(100);
    const changed = mklevHooks.replaceDesTerrain({
        selection: selected.or(mklevHooks.splevSelection.area(12, 10, 12, 10)),
        fromterrain: '.',
        toterrain: '#',
        chance: 100,
    });

    assert.equal(selected.numpoints(), 3);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(100)=')).length, 6);
    assert.equal(changed, 3);
    assert.equal(g.level.at(10, 10).typ, CORR);
    assert.equal(g.level.at(11, 10).typ, CORR);
    assert.equal(g.level.at(12, 10).typ, CORR);
});

test('special-level room selection filters mapchars and random coordinates like C', () => {
    const { g, room } = installThemeroomGame({ seed: 7, width: 3, height: 2 });
    g.level.at(room.lx, room.ly).edge = true;
    g.level.at(room.hx, room.hy).roomno = ROOMOFFSET + 1;
    g.level.at(room.lx + 1, room.ly).lit = true;
    g.level.at(room.lx + 2, room.ly).typ = CORR;

    const sel = mklevHooks.splevSelection.room(room);
    const litFloors = sel.filterMapchar('.', 1);
    const allFloors = sel.filter_mapchar('.', SET_LIT_NOCHANGE);

    assert.equal(sel.numpoints(), 4);
    assert.equal(sel.has(room.lx, room.ly), false);
    assert.equal(sel.has(room.hx, room.hy), false);
    assert.deepEqual(litFloors.iterate(), [[room.lx + 1, room.ly]]);
    assert.equal(allFloors.numpoints(), 3);

    const points = mklevHooks.splevSelection.fromPoints([
        [2, 2],
        [2, 3],
        [3, 2],
    ]);
    enableRngLog({ reset: true });
    const picked = points.rndcoord(true);

    assert.match(getRngLog()[0], /^rn2\(3\)=/);
    assert.equal(points.numpoints(), 2);
    assert.equal(points.has(picked.x, picked.y), false);
    assert.deepEqual(mklevHooks.splevSelection.new().rndcoord(true), { x: -1, y: -1 });
});

test('replace terrain rejects unrecognized explicit selections', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = ROOM;

    assert.throws(
        () => mklevHooks.replaceDesTerrain({
            selection: {},
            fromterrain: '.',
            toterrain: '#',
            chance: 100,
        }),
        /replace_terrain selection/,
    );
    assert.equal(g.level.at(10, 10).typ, ROOM);
});

test('replace terrain rejects falsy and malformed explicit selectors', () => {
    const g = installMkmapGame();
    g.level.at(10, 10).typ = ROOM;

    assert.throws(
        () => mklevHooks.replaceDesTerrain({
            selection: false,
            fromterrain: '.',
            toterrain: '#',
            chance: 100,
        }),
        /replace_terrain selection/,
    );
    assert.throws(
        () => mklevHooks.replaceDesTerrain({
            x1: 10, y1: 10,
            fromterrain: '.',
            toterrain: '#',
            chance: 100,
        }),
        /replace_terrain bounds/,
    );
    assert.throws(
        () => mklevHooks.replaceDesTerrain({
            region: [],
            fromterrain: '.',
            toterrain: '#',
            chance: 100,
        }),
        /replace_terrain region/,
    );
    assert.equal(g.level.at(10, 10).typ, ROOM);
});

test('replace terrain mapfragments support transparent and wall wildcard cells', () => {
    const g = installMkmapGame();
    g.level.at(19, 10).typ = VWALL;
    g.level.at(20, 10).typ = ROOM;
    g.level.at(21, 10).typ = HWALL;
    g.level.at(29, 10).typ = POOL;
    g.level.at(30, 10).typ = ROOM;
    g.level.at(31, 10).typ = STONE;

    const wallChanged = mklevHooks.replaceDesTerrain({
        region: [20, 10, 20, 10],
        mapfragment: 'w.w',
        toterrain: 'L',
    });
    const transparentChanged = mklevHooks.replaceDesTerrain({
        region: [30, 10, 30, 10],
        mapfragment: 'x.x',
        toterrain: 'W',
    });

    assert.equal(wallChanged, 1);
    assert.equal(g.level.at(20, 10).typ, LAVAPOOL);
    assert.equal(g.level.at(20, 10).lit, true);
    assert.equal(transparentChanged, 1);
    assert.equal(g.level.at(30, 10).typ, WATER);
});

test('replace terrain mapfragment validation follows C center and size gates', () => {
    installMkmapGame();
    assert.throws(
        () => mklevHooks.replaceDesTerrain({ region: [10, 10, 10, 10], mapfragment: '..', toterrain: '.' }),
        /mapfragment needs to have odd height and width/,
    );
    assert.throws(
        () => mklevHooks.replaceDesTerrain({ region: [10, 10, 10, 10], mapfragment: 'x', toterrain: '.' }),
        /mapfragment center must be valid terrain/,
    );
});

test('replace terrain consumes chance RNG only after selected terrain matches', () => {
    const g = installMkmapGame({ seed: 9 });
    enableRngLog({ reset: true });
    g.level.at(10, 10).typ = ROOM;
    g.level.at(11, 10).typ = STONE;
    g.level.at(12, 10).typ = ROOM;

    const changed = mklevHooks.replaceDesTerrain({
        region: [10, 10, 12, 10],
        fromterrain: '.',
        toterrain: '#',
        chance: 0,
    });

    assert.equal(changed, 0);
    assert.equal(g.level.at(10, 10).typ, ROOM);
    assert.equal(g.level.at(12, 10).typ, ROOM);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(100)=')).length, 2);
});

test('replace terrain random lit consumes lit RNG only for changed non-lava cells', () => {
    const g = installMkmapGame({ seed: 13 });
    enableRngLog({ reset: true });
    g.level.at(10, 10).typ = ROOM;
    g.level.at(11, 10).typ = STONE;

    const changed = mklevHooks.replaceDesTerrain({
        region: [10, 10, 11, 10],
        fromterrain: '.',
        toterrain: '#',
        lit: SET_LIT_RANDOM,
    });

    assert.equal(changed, 1);
    assert.equal(g.level.at(10, 10).typ, CORR);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(100)=')).length, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(2)=')).length, 1);
});

test('Minetown-3 remains a room special level with fixed town structure', async () => {
    const g = installMkmapGame({ seed: 17, dlevel: 6 });
    g.u.ualign = { type: 0, record: 0 };
    g.urace = { adj: 'human', noun: 'human' };
    g.dungeons = [{ name: 'The Gnomish Mines', depth_start: 1, entry_lev: 1 }];
    g.splev_align = [0, 0, 0];

    await mklevHooks.make_minetn3_level();

    assert.equal(g._level_populated, true);
    assert.equal(g.level.flags.is_maze_lev, false);
    assert.equal(g.level.flags.rndmongen, true);
    assert.equal(g.level.flags.has_town, true);
    assert.equal(g.level.flags.has_temple, true);
    assert.ok(g.level.nroom >= 4);
    assert.equal(g.level.subrooms.length, 16);
    const stairs = [];
    for (let stair = g.stairs; stair; stair = stair.next) stairs.push(stair);
    assert.equal(stairs.filter(stair => stair.up).length, 1);
    assert.equal(stairs.filter(stair => !stair.up).length, 1);

    const outer = g.level.rooms.find(room =>
        room.hx - room.lx + 1 === 31 && room.hy - room.ly + 1 === 15 && room.nsubrooms === 16);
    assert.ok(outer);
    assert.equal(outer.rlit, 1);

    const subroomTypes = new Map();
    for (const room of g.level.subrooms) subroomTypes.set(room.rtype, (subroomTypes.get(room.rtype) || 0) + 1);
    assert.equal(subroomTypes.get(TEMPLE), 1);
    assert.equal(subroomTypes.get(SHOPBASE), 1);
    assert.equal(subroomTypes.get(CANDLESHOP), 1);
    assert.ok((subroomTypes.get(OROOM) || 0) >= 9);

    let fountains = 0;
    let shrines = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = g.level.at(x, y);
            if (loc?.typ === FOUNTAIN) fountains++;
            if (loc?.typ === ALTAR && (loc.flags & AM_SHRINE)) shrines++;
        }
    assert.equal(fountains, 2);
    assert.equal(shrines, 1);
});

test('themed random dungeon feature creates odd room with centered terrain', () => {
    const g = installMkmapGame({ seed: 47, dlevel: 8 });
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
    init_rect();
    const room = mklevHooks.create_themeroom_random_dungeon_feature();

    assert.ok(room);
    const width = room.hx - room.lx + 1;
    const height = room.hy - room.ly + 1;
    assert.equal(width % 2, 1);
    assert.equal(height % 2, 1);
    assert.equal(width >= 3 && width <= 7, true);
    assert.equal(height >= 3 && height <= 7, true);
    assert.equal(room.needfill, FILL_NORMAL);

    const centerX = room.lx + Math.trunc((width - 1) / 2);
    const centerY = room.ly + Math.trunc((height - 1) / 2);
    const features = [];
    for (let x = room.lx; x <= room.hx; x++) {
        for (let y = room.ly; y <= room.hy; y++) {
            const typ = g.level.at(x, y).typ;
            if (typ !== ROOM) features.push({ x, y, typ });
        }
    }

    assert.equal(features.length, 1);
    assert.deepEqual({ x: features[0].x, y: features[0].y }, { x: centerX, y: centerY });
    assert.equal(new Set([CLOUD, LAVAPOOL, ICE, POOL, TREE]).has(features[0].typ), true);
    if (features[0].typ === LAVAPOOL) assert.equal(g.level.at(centerX, centerY).lit, true);
    if (features[0].typ === ICE) assert.equal(g.level.at(centerX, centerY).icedpool, 0);
});

test('themed buried zombie corpses use buriedobjlist with explicit zombify timers', () => {
    const { g, room } = installThemeroomGame({ dlevel: 7, moves: 200, seed: 3, width: 4, height: 4 });
    const allowed = new Set(mklevHooks.themeroomBuriedZombieSpecies());

    mklevHooks.themeroom_buried_zombies(room);

    assert.equal(g.level.objects.length, 0);
    assert.equal(g.level.buriedobjlist.length, 8);
    for (const corpse of g.level.buriedobjlist) {
        assert.equal(corpse.otyp, CORPSE);
        assert.equal(corpse.buried, true);
        assert.equal(corpse.hidden, true);
        assert.equal(corpse.rotAwayTurn, undefined);
        assert.equal(corpse.reviveTurn, undefined);
        assert.ok(corpse.zombifyTurn >= 1190 && corpse.zombifyTurn <= 1210);
        assert.ok(corpse.ox >= room.lx && corpse.ox <= room.hx);
        assert.ok(corpse.oy >= room.ly && corpse.oy <= room.hy);
        assert.equal(allowed.has(corpse.corpsenm?.name), true);
    }
});

test('themed Massacre creates explicit role corpse piles without side effects', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 40, width: 7, height: 6,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Massacre' }, room);

    const corpses = g.level.objects.filter(obj => obj.otyp === CORPSE);
    assert.equal(room.themeFillName, 'Massacre');
    assert.ok(corpses.length >= 5 && corpses.length <= 25);
    assert.equal(g.level.objects.length, corpses.length);
    assert.equal(g.level.monsters.length, 0);
    assert.equal(g.level.traps.length, 0);
    for (const corpse of corpses) {
        assert.equal(MASSACRE_CORPSE_NAMES.has(corpse.corpsenm?.name), true);
        assert.equal(corpse.spe, 0);
        assert.equal(corpse.rotAwayTurn > g.moves, true);
        assert.equal(corpse.ox >= room.lx && corpse.ox <= room.hx, true);
        assert.equal(corpse.oy >= room.ly && corpse.oy <= room.hy, true);
    }
    for (let x = room.lx; x <= room.hx; x++)
        for (let y = room.ly; y <= room.hy; y++)
            assert.equal(g.level.at(x, y).typ, ROOM);
});

test('themed Cloud room creates sleeping fog clouds and a room gas region', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 41, width: 6, height: 4,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Cloud room' }, room);

    const fogClouds = g.level.monsters.filter(mon => mon.data?.name === 'fog cloud');
    const [region] = g.level.regions || [];
    assert.equal(room.themeFillName, 'Cloud room');
    assert.equal(fogClouds.length, 6);
    assert.equal(fogClouds.every(mon => mon.msleeping === 1), true);
    assert.equal(fogClouds.every(mon =>
        mon.mx >= room.lx && mon.mx <= room.hx
        && mon.my >= room.ly && mon.my <= room.hy), true);
    assert.equal(region?.type, 'gas_cloud');
    assert.equal(region.damage, 0);
    assert.equal(region.visible, true);
    assert.equal(region.ttl, undefined);
    assert.equal(region.coords.length, 24);
    for (let x = room.lx; x <= room.hx; x++)
        for (let y = room.ly; y <= room.hy; y++) {
            assert.equal(region.coords.some(coord => coord.x === x && coord.y === y), true);
            assert.equal(g.level.at(x, y).typ, ROOM);
        }
    assert.equal(g.level.objects.length, 0);
    assert.equal(g.level.traps.length, 0);
});

test('themed Teleportation hub postprocess creates seen destination traps', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 42, width: 8, height: 6,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Teleportation hub' }, room);

    assert.equal(room.themeFillName, 'Teleportation hub');
    assert.ok(g._themeroom_postprocess.length >= 2 && g._themeroom_postprocess.length <= 4);
    assert.deepEqual(g.level.traps, []);

    await mklevHooks.run_themeroom_postprocess();

    const traps = g.level.traps.filter(trap => trap.ttyp === TELEP_TRAP);
    assert.equal(traps.length, g.level.traps.length);
    assert.ok(traps.length >= 2 && traps.length <= 4);
    assert.equal(g._themeroom_postprocess.length, 0);
    for (const trap of traps) {
        assert.equal(trap.tseen, true);
        assert.equal(trap.tx >= room.lx && trap.tx <= room.hx, true);
        assert.equal(trap.ty >= room.ly && trap.ty <= room.hy, true);
        assert.equal(g.level.at(trap.tx, trap.ty).typ, ROOM);
        assert.equal(g.level.at(trap.teledest.x, trap.teledest.y).typ, ROOM);
        assert.notEqual(trap.teledest.x, trap.tx);
        assert.notEqual(trap.teledest.y, trap.ty);
    }
});

test('themed Storeroom creates only chests and chest mimics', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 43, width: 12, height: 8,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Storeroom' }, room);

    const chests = g.level.objects.filter(obj => obj.otyp === CHEST);
    const mimics = g.level.monsters.filter(mon => mon.data?.name?.includes('mimic'));
    assert.equal(room.themeFillName, 'Storeroom');
    assert.ok(chests.length + mimics.length > 0);
    assert.equal(g.level.objects.length, chests.length);
    assert.equal(g.level.monsters.length, mimics.length);
    assert.equal(g.level.traps.length, 0);
    for (const chest of chests) {
        assert.equal(chest.ox >= room.lx && chest.ox <= room.hx, true);
        assert.equal(chest.oy >= room.ly && chest.oy <= room.hy, true);
    }
    for (const mimic of mimics) {
        assert.equal(mimic.appearObj, CHEST);
        assert.equal(mimic.appearGlyph, '(');
        assert.equal(mimic.mx >= room.lx && mimic.mx <= room.hx, true);
        assert.equal(mimic.my >= room.ly && mimic.my <= room.hy, true);
    }
    for (let x = room.lx; x <= room.hx; x++)
        for (let y = room.ly; y <= room.hy; y++)
            assert.equal(g.level.at(x, y).typ, ROOM);
});

test('themed Buried treasure creates a buried loot chest and dig engraving', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 8, moves: 200, seed: 44, width: 8, height: 6,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Buried treasure' }, room);

    assert.equal(room.themeFillName, 'Buried treasure');
    assert.equal(g.level.objects.length, 0);
    assert.equal(g.level.buriedobjlist.length, 1);
    assert.equal(g._themeroom_postprocess.length, 1);
    const [chest] = g.level.buriedobjlist;
    assert.equal(chest.otyp, CHEST);
    assert.equal(chest.buried, true);
    assert.equal(chest.hidden, true);
    assert.equal(chest.ox >= room.lx && chest.ox <= room.hx, true);
    assert.equal(chest.oy >= room.ly && chest.oy <= room.hy, true);
    assert.equal(chest.contents.length >= 3 && chest.contents.length <= 12, true);
    assert.equal(chest.contents.every(obj => obj.contained && obj.container === chest), true);

    await mklevHooks.run_themeroom_postprocess();

    assert.equal(g._themeroom_postprocess.length, 0);
    assert.equal(g.level.engravings.length, 1);
    const [engraving] = g.level.engravings;
    assert.equal(engraving.type, BURN);
    assert.equal(g.level.at(engraving.x, engraving.y).typ, ROOM);
    const tx = chest.ox - engraving.x;
    const ty = chest.oy - engraving.y;
    let expected = 'Dig';
    if (tx === 0 && ty === 0) expected += ' here';
    else {
        if (tx !== 0) expected += ` ${Math.abs(tx)} ${tx > 0 ? 'east' : 'west'}`;
        if (ty !== 0) expected += ` ${Math.abs(ty)} ${ty > 0 ? 'south' : 'north'}`;
    }
    assert.equal(engraving.text, expected);
});

test('themed Garden creates sleeping nymphs fountains and tree walls', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 8, moves: 200, seed: 45, width: 12, height: 6,
    });
    for (let x = room.lx - 1; x <= room.hx + 1; x++) {
        for (let y = room.ly - 1; y <= room.hy + 1; y++) {
            if (x >= room.lx && x <= room.hx && y >= room.ly && y <= room.hy) continue;
            const loc = g.level.at(x, y);
            loc.typ = (x === room.lx - 1 || x === room.hx + 1) ? VWALL : HWALL;
        }
    }
    const secretDoorX = room.lx - 1;
    const secretDoorY = room.ly + 1;
    const secretDoor = g.level.at(secretDoorX, secretDoorY);
    secretDoor.typ = SDOOR;

    await mklevHooks.apply_themeroom_fill({ name: 'Garden' }, room);

    const expectedNymphs = Math.trunc(((room.hx - room.lx + 1) * (room.hy - room.ly + 1)) / 6);
    const nymphs = g.level.monsters.filter(mon => mon.data?.name === 'wood nymph');
    assert.equal(room.themeFillName, 'Garden');
    assert.equal(nymphs.length, expectedNymphs);
    assert.equal(nymphs.every(mon => mon.msleeping === 1), true);
    assert.equal(g.level.flags.nfountains > 0, true);
    assert.equal(g._themeroom_postprocess.length, 1);
    assert.equal(secretDoor.typ, SDOOR);

    await mklevHooks.run_themeroom_postprocess();

    assert.equal(g._themeroom_postprocess.length, 0);
    assert.equal(secretDoor.typ, AIR);
    assert.equal(g.level.flags.arboreal, true);
    let trees = 0;
    for (let x = room.lx - 1; x <= room.hx + 1; x++)
        for (let y = room.ly - 1; y <= room.hy + 1; y++) {
            const loc = g.level.at(x, y);
            if (x >= room.lx && x <= room.hx && y >= room.ly && y <= room.hy) {
                assert.equal(loc.typ === ROOM || loc.typ === FOUNTAIN, true);
            } else if (x === secretDoorX && y === secretDoorY) {
                assert.equal(loc.typ, AIR);
            } else if (loc.typ === TREE) {
                trees++;
            }
        }
    assert.equal(trees > 0, true);
});

test('themed Ghost of an Adventurer places ghost loot on the ghost square', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 8, moves: 200, seed: 46, width: 8, height: 6,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Ghost of an Adventurer' }, room);

    const ghosts = g.level.monsters.filter(mon => mon.data?.name === 'ghost');
    assert.equal(room.themeFillName, 'Ghost of an Adventurer');
    assert.equal(ghosts.length, 1);
    const [ghost] = ghosts;
    assert.equal(ghost.msleeping, 1);
    assert.equal(ghost.waiting, true);
    assert.equal(ghost.mx >= room.lx && ghost.mx <= room.hx, true);
    assert.equal(ghost.my >= room.ly && ghost.my <= room.hy, true);
    assert.equal(g.level.objects.length > 0, true);
    assert.equal(g.level.objects.every(obj => obj.ox === ghost.mx && obj.oy === ghost.my), true);
    assert.equal(g.level.objects.every(obj => obj.blessed === false), true);
    assert.equal(g.level.objects.some(obj => obj.ox === 0 && obj.oy === 0), false);
});

test('themed Ice room converts room terrain and gates C melt timers', async () => {
    const { g: stableGame, room: stableRoom } = installThemeroomGame({
        dlevel: 3, moves: 200, seed: 1, width: 3, height: 2,
    });
    enableRngLog({ reset: true });
    await mklevHooks.apply_themeroom_fill({ name: 'Ice room' }, stableRoom);

    for (let x = stableRoom.lx; x <= stableRoom.hx; x++)
        for (let y = stableRoom.ly; y <= stableRoom.hy; y++) {
            const loc = stableGame.level.at(x, y);
            assert.equal(loc.typ, ICE);
            assert.equal(loc.icedpool, 0);
        }
    assert.equal(stableGame.level.meltIceTimers?.length || 0, 0);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(100)=')).length, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(1000)=')).length, 0);

    const { g: meltingGame, room: meltingRoom } = installThemeroomGame({
        dlevel: 3, moves: 200, seed: 9, width: 3, height: 2,
    });
    enableRngLog({ reset: true });
    await mklevHooks.apply_themeroom_fill({ name: 'Ice room' }, meltingRoom);

    assert.equal(meltingGame.level.meltIceTimers.length, 6);
    assert.equal(meltingGame.level.meltIceTimers.every(timer =>
        timer.turn >= 900 && timer.turn <= 1899), true);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(100)=')).length, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(1000)=')).length, 6);
});

test('themed Boulder and Trap rooms use C room selections', async () => {
    const { g: boulderGame, room: boulderRoom } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 33, width: 12, height: 8,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Boulder room' }, boulderRoom);

    const rollingTraps = boulderGame.level.traps.filter(trap => trap.ttyp === ROLLING_BOULDER_TRAP);
    const boulders = boulderGame.level.objects.filter(obj => obj.otyp === BOULDER);
    assert.equal(boulderRoom.themeFillName, 'Boulder room');
    assert.ok(rollingTraps.length + boulders.length > 0);
    assert.equal(rollingTraps.every(trap =>
        trap.tx >= boulderRoom.lx && trap.tx <= boulderRoom.hx
        && trap.ty >= boulderRoom.ly && trap.ty <= boulderRoom.hy), true);

    const { g: trapGame, room: trapRoom } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 34, width: 12, height: 8,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Trap room' }, trapRoom);

    const allowedTraps = new Set([
        ARROW_TRAP, DART_TRAP, ROCKTRAP, BEAR_TRAP,
        LANDMINE, SLP_GAS_TRAP, RUST_TRAP, ANTI_MAGIC,
    ]);
    assert.ok(trapGame.level.traps.length > 0);
    assert.equal(allowedTraps.has(trapGame.level.traps[0].ttyp), true);
    assert.equal(trapGame.level.traps.every(trap => trap.ttyp === trapGame.level.traps[0].ttyp), true);
    assert.equal(trapGame.level.traps.every(trap =>
        trap.tx >= trapRoom.lx && trap.tx <= trapRoom.hx
        && trap.ty >= trapRoom.ly && trap.ty <= trapRoom.hy), true);
});

test('themed Spider nest gates web spiders by C difficulty', async () => {
    const { g: lowGame, room: lowRoom } = installThemeroomGame({
        dlevel: 6, moves: 200, seed: 37, width: 12, height: 8,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Spider nest' }, lowRoom);

    assert.equal(lowRoom.themeFillName, 'Spider nest');
    assert.ok(lowGame.level.traps.length > 0);
    assert.equal(lowGame.level.traps.every(trap => trap.ttyp === WEB), true);
    assert.equal(lowGame.level.monsters.filter(mon => mon.data?.name === 'giant spider').length, 0);

    const { g: highGame, room: highRoom } = installThemeroomGame({
        dlevel: 10, moves: 200, seed: 38, width: 12, height: 8,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Spider nest' }, highRoom);

    const spiders = highGame.level.monsters.filter(mon => mon.data?.name === 'giant spider');
    assert.ok(highGame.level.traps.length > 0);
    assert.equal(highGame.level.traps.every(trap => trap.ttyp === WEB), true);
    assert.ok(spiders.length > 0);
    assert.equal(spiders.every(mon =>
        highGame.level.traps.some(trap => trap.tx === mon.mx && trap.ty === mon.my)), true);
});

test('themed Statuary and Light source fills create C-shaped contents', async () => {
    const { g: statuaryGame, room: statuaryRoom } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 35, width: 10, height: 8,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Statuary' }, statuaryRoom);

    assert.equal(statuaryRoom.themeFillName, 'Statuary');
    assert.ok(statuaryGame.level.objects.filter(obj => obj.otyp === STATUE).length >= 5);
    assert.ok(statuaryGame.level.traps.filter(trap => trap.ttyp === STATUE_TRAP).length >= 1);

    const { g: lightGame, room: lightRoom } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 36, width: 4, height: 4,
    });
    await mklevHooks.apply_themeroom_fill({ name: 'Light source' }, lightRoom);

    const lamps = lightGame.level.objects.filter(obj => obj.otyp === OIL_LAMP);
    assert.equal(lightRoom.themeFillName, 'Light source');
    assert.equal(lamps.length, 1);
    assert.equal(lamps[0].lamplit, true);
    assert.equal(lamps[0].lit, true);
});

test('themed Temple of the gods places three plain shuffled-alignment altars', async () => {
    const { g, room } = installThemeroomGame({
        dlevel: 7, moves: 200, seed: 39, width: 6, height: 6,
    });
    mklevHooks.setThemeroomAlign(g.u.uz.dnum, [A_CHAOTIC, A_NEUTRAL, A_LAWFUL]);

    await mklevHooks.apply_themeroom_fill({ name: 'Temple of the gods' }, room);

    const altars = [];
    for (let x = room.lx; x <= room.hx; x++)
        for (let y = room.ly; y <= room.hy; y++) {
            const loc = g.level.at(x, y);
            if (loc.typ === ALTAR) altars.push(loc);
        }

    assert.equal(room.themeFillName, 'Temple of the gods');
    assert.equal(altars.length, 3);
    assert.deepEqual(
        altars.map(loc => loc.altarmask).sort((a, b) => a - b),
        [Align2amask(A_CHAOTIC), Align2amask(A_NEUTRAL), Align2amask(A_LAWFUL)].sort((a, b) => a - b),
    );
    assert.equal(altars.every(loc => !(loc.altarmask & AM_SHRINE)), true);
});

test('themed buried zombie timers raise zombies from the buried list', async () => {
    const { g, room } = installThemeroomGame({ dlevel: 1, moves: 50, seed: 8, width: 2, height: 1 });
    mklevHooks.themeroom_buried_zombies(room);
    const [corpse] = g.level.buriedobjlist;

    g.in_mklev = false;
    g.moves = corpse.zombifyTurn;
    await processCorpseTimers(g);

    assert.equal(g.level.buriedobjlist.includes(corpse), false);
    assert.equal(g.level.objects.includes(corpse), false);
    assert.equal(g.level.monsters.length, 1);
    assert.match(g.level.monsters[0].data?.name || g.level.monsters[0].name || '', /zombie$/);
});
