import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { __mklevTestHooks as mklevHooks } from '../js/mklev.js';
import { processCorpseTimers } from '../js/cmd.js';
import { ROOM, ROOMOFFSET } from '../js/const.js';
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
