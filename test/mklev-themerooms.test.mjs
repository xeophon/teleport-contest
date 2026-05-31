import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { __mklevTestHooks as mklevHooks } from '../js/mklev.js';
import { processCorpseTimers } from '../js/cmd.js';
import { COLNO, ROWNO, STONE, ROOM, ROOMOFFSET, TREE, ICE, ICED_POOL, ICED_MOAT } from '../js/const.js';
import { initRng } from '../js/rng.js';

const CORPSE = 471;

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
