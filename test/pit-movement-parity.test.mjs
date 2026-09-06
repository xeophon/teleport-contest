import assert from 'node:assert/strict';
import test from 'node:test';
import { movementPitResult, rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { DIR_180, PIT, ROOM, SPIKED_PIT, TT_PIT, xdir, ydir } from '../js/const.js';

function setup(direction = 4, spikes = false, conjoined = true) {
    resetGame();
    initRng(43);
    enableRngLog();
    game.u = { ux0: 10, uy0: 10, ux: 10 + xdir[direction], uy: 10 + ydir[direction],
        dx: xdir[direction], dy: ydir[direction], utrap: 5, utraptype: TT_PIT,
        uhp: 100, uhpmax: 100, acurr: { a: [10, 10, 10, 10, 10, 10] },
        aexe: { a: [0, 0, 0, 0, 0, 0] }, uz: { dnum: 0, dlevel: 1 } };
    game.level = new GameMap();
    game.inventory = [];
    game.flags = { verbose: true };
    game.context = {};
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = ROOM;
    vision_reset();
    const origin = { tx: 10, ty: 10, ttyp: PIT, tseen: true, conjoined: conjoined ? 1 << direction : 0 };
    const target = { tx: game.u.ux, ty: game.u.uy, ttyp: spikes ? SPIKED_PIT : PIT,
        tseen: true, conjoined: conjoined ? 1 << DIR_180(direction) : 0 };
    game.level.traps.push(origin, target);
    return target;
}

// C trap.c:trapeffect_pit: connected pits do not inflict a fall or an escape roll.
for (let direction = 0; direction < 8; direction++) {
    test(`connected pit entry has no falling damage, direction ${direction}`, () => {
        const trap = setup(direction);
        const result = movementPitResult(trap);
        assert.match(result.message, /You move into an adjacent pit\./);
        assert.equal(game.u.uhp, 100);
        assert.equal(getRngLog()[0].startsWith('rn2(6)'), true);
        assert.equal(getRngLog().some(line => /^rnd\(/.test(line)), false);
    });
}

for (const connected of [false, true]) {
    test(`spiked pit entry uses ${connected ? 'd4' : 'd6'} for adjacent pits`, () => {
        const trap = setup(4, true, connected);
        const result = movementPitResult(trap);
        assert.match(result.message, connected ? /You step on/ : /You stumble over debris/);
        assert.equal(getRngLog().some(line => line.startsWith(`rnd(${connected ? 4 : 6})`)), true);
        assert.equal(getRngLog().some(line => line.startsWith('rnd(10)')), false);
    });
}

test('unconnected adjacent ordinary pit entry rolls d3 and debris text before trapping', () => {
    const trap = setup(4, false, false);
    const result = movementPitResult(trap);
    assert.match(result.message, /You stumble over debris/);
    assert.equal(getRngLog()[0].startsWith('rn2(5)'), true);
    assert.equal(getRngLog()[1].startsWith('rn2(6)'), true);
    assert.equal(getRngLog()[2].startsWith('rnd(3)'), true);
});

test('a previous pit without hero trapping does not create a connected transition', () => {
    const trap = setup();
    game.u.utrap = 0;
    trap.tseen = false;
    const result = movementPitResult(trap);
    assert.match(result.message, /You fall into a pit!/);
    assert.equal(getRngLog().some(line => line.startsWith('rnd(6)')), true);
});

test('runtime movement toward a connected pit attempts to climb at the origin', async () => {
    setup();
    game.u.ux = game.u.ux0;
    game.u.uy = game.u.uy0;
    await rhack('l');
    assert.match(game._pending_message, /Really step into that pit/);
    await rhack('y');
    assert.deepEqual([game.u.ux, game.u.uy], [10, 10], game._pending_message);
    assert.equal(game.u.uhp, 100);
    assert.equal(game.u.utrap, 4);
    assert.match(game._pending_message, /You are still in a pit/);
});
