import assert from 'node:assert/strict';
import test from 'node:test';
import { sameLevelTeleportOk, teleportHeroSameLevel } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { ARROW_TRAP, DOOR, D_CLOSED, HWALL, LAVAPOOL, PIT, POOL, ROOM, SPIKED_PIT, HOLE, TRAPDOOR, TT_PIT, VIBRATING_SQUARE, WATER, W_NONPASSWALL } from '../js/const.js';

function setup() {
    resetGame();
    initRng(43);
    game.u = { ux: 10, uy: 10, uhp: 30, uhpmax: 30, uz: { dnum: 0, dlevel: 1 } };
    game.level = new GameMap();
    game.inventory = [];
    game.flags = {};
    game.context = {};
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = ROOM;
    vision_reset();
}

// C teleport.c:teleok permits special harmless traps before goodpos().
for (const ttyp of [PIT, SPIKED_PIT, HOLE, TRAPDOOR, ARROW_TRAP, VIBRATING_SQUARE]) {
    for (const airborne of ['grounded', 'flying', 'levitating']) {
        test(`teleok trap ${ttyp}, ${airborne}`, () => {
            setup();
            game.u[airborne] = true;
            game.level.traps.push({ tx: 12, ty: 10, ttyp });
            assert.equal(sameLevelTeleportOk(12, 10), ttyp === VIBRATING_SQUARE
                || (airborne !== 'grounded' && ttyp !== ARROW_TRAP));
            assert.equal(sameLevelTeleportOk(12, 10, true), true);
        });
    }
}

// C tele_jump_ok rejects crossing either exclusion rectangle in either direction.
for (const dest of ['updest', 'dndest']) {
    for (const startsInside of [false, true]) {
        test(`teleport respects ${dest} boundary from ${startsInside ? 'inside' : 'outside'}`, () => {
            setup();
            game.level[dest] = { nlx: 20, nly: 5, nhx: 30, nhy: 15 };
            game.u.ux = startsInside ? 25 : 10;
            assert.equal(sameLevelTeleportOk(startsInside ? 10 : 25, 10), false);
            assert.equal(sameLevelTeleportOk(startsInside ? 20 : 12, 10), true);
        });
    }
}

for (const [typ, property, expected] of [
    [POOL, null, false], [POOL, 'flying', true], [POOL, 'levitating', true],
    [POOL, 'swimming', true], [POOL, 'amphibious', true], [POOL, 'waterWalking', true],
    [WATER, 'flying', false], [WATER, 'swimming', true],
    [LAVAPOOL, null, false], [LAVAPOOL, 'flying', true], [LAVAPOOL, 'levitating', true],
]) {
    test(`goodpos terrain ${typ} with ${property}`, () => {
        setup();
        game.level.at(12, 10).typ = typ;
        if (property) game.u[property] = true;
        assert.equal(sameLevelTeleportOk(12, 10), expected);
    });
}

test('wall passing respects nonpasswall while an amorphous form can use a closed door', () => {
    setup();
    const cell = game.level.at(12, 10);
    cell.typ = HWALL;
    game.u.passWalls = true;
    assert.equal(sameLevelTeleportOk(12, 10), true);
    cell.wall_info = W_NONPASSWALL;
    assert.equal(sameLevelTeleportOk(12, 10), false);
    game.u.passWalls = false;
    game.u._polyself_form = { name: 'gray ooze', amorphous: true };
    cell.typ = DOOR;
    cell.doormask = D_CLOSED;
    assert.equal(sameLevelTeleportOk(12, 10), true);
});

test('teleds resets trapping, holding, and swallowing before moving hero and steed', () => {
    setup();
    Object.assign(game.u, { utrap: 7, utraptype: TT_PIT, ustuck: { id: 4 }, uswallow: 1, uswldtim: 12,
        usteed: { mx: 10, my: 10 } });
    game._swallow_overlay_active = 1;
    game._overlay_lines = ['old stomach'];
    teleportHeroSameLevel(12, 10, { recalcVision: false });
    assert.equal(game.u.utrap, 0);
    assert.equal(game.u.utraptype, null);
    assert.equal(game.u.ustuck, null);
    assert.equal(game.u.uswallow, 0);
    assert.equal(game.u.uswldtim, 0);
    assert.equal(game._swallow_overlay_active, 0);
    assert.equal(game._overlay_lines, null);
    assert.deepEqual([game.u.ux0, game.u.uy0, game.u.ux, game.u.uy], [10, 10, 12, 10]);
    assert.deepEqual([game.u.usteed.mx, game.u.usteed.my], [12, 10]);
});
