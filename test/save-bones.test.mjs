import assert from 'node:assert/strict';
import test from 'node:test';

import { GameMap } from '../js/game.js';
import { game, resetGame } from '../js/gstate.js';
import { encodeBonesLevel } from '../js/save.js';

test('bones restore identity count treats death-cleanup thrown objects as ordinary floor objects', () => {
    resetGame();
    game.plname = 'Elara';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 } };
    game.inventory = [];
    game.stairs = null;
    game.level = new GameMap();
    game.level.objects = [
        { id: 10, kind: 'arrow', quan: 1, ox: 10, oy: 10, _deathCleanupThrownObject: true },
        { id: 11, kind: 'arrow', quan: 1, ox: 11, oy: 10, transientProjectile: true },
        { id: 12, kind: 'rock', quan: 1, ox: 12, oy: 10 },
    ];
    game.level.buriedobjlist = [{ id: 13, kind: 'rock', quan: 1 }];
    game.level.monsters = [];

    const bones = JSON.parse(encodeBonesLevel());

    assert.equal(bones.restoreIdentityCount, 5);
});

test('bones encoding force-places object from active launch drop spot', () => {
    resetGame();
    game.plname = 'Elara';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 } };
    game.inventory = [];
    game.stairs = null;
    game.level = new GameMap();
    const boulder = { id: 20, otyp: 465, kind: 'boulder', quan: 1, ox: 6, oy: 3, otrapped: 1 };
    game.level.objects = [];
    game.level.buriedobjlist = [];
    game.level.monsters = [];
    game._launch_drop_spot = { obj: boulder, x: 4, y: 3 };

    const bones = JSON.parse(encodeBonesLevel());
    const bonesBoulder = bones.level.objects.find(obj => obj.id === boulder.id);

    assert.equal(bonesBoulder.ox, 4);
    assert.equal(bonesBoulder.oy, 3);
    assert.equal(bonesBoulder.otrapped, 0);
    assert.equal(game.level.objects.includes(boulder), true);
    assert.equal(game._launch_drop_spot, undefined);
    assert.equal(bones.restoreIdentityCount, 1);
});
