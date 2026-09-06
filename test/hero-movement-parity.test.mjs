import assert from 'node:assert/strict';
import test from 'node:test';

import { processMonsterTurns } from '../js/allmain.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { MONS } from '../js/permonst.js';

function installHero(name, seed = 123) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.level = new GameMap();
    g.flags = {};
    g.context = {};
    g.inventory = [];
    g.moves = 1;
    g.u = {
        ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 20, uhpmax: 20,
        ulevel: 1, umovement: 0, acurr: { a: [10, 10, 10, 10, 10, 10] },
        _monsterMove: MONS.find(mon => mon.name === name).mmove,
        _polyself_form: { name },
    };
    return g;
}

// C: allmain.c:u_calc_moveamt uses the form's actual speed. The move loop
// waits until the accumulated movement pays the 12-point cost of an action.
for (const [name, expected] of [['xorn', 18], ['grid bug', 12], ['air elemental', 36]]) {
    test(`hero movement uses canonical ${name} speed`, async () => {
        const g = installHero(name);
        await processMonsterTurns();
        assert.equal(g.u.umovement, expected);
    });
}

for (const speed of ['fast', 'veryfast']) {
    for (const seed of [1, 7, 123, 987]) {
        test(`${speed} uses actual rn2(3) results (seed ${seed})`, async () => {
            const original = installHero('brown mold', seed);
            original.u[speed] = true;
            await processMonsterTurns();
            const expectedMovement = original.u.umovement;
            const expectedLog = [...getRngLog()];
            const g = installHero('brown mold', seed);
            g.u[speed] = true;
            g.u._monsterMoveRollQueue = [2, 2, 1, 2, 2, 2, 0];
            await processMonsterTurns();
            assert.ok(expectedLog.some(entry => entry.startsWith('rn2(3)=')));
            assert.equal(g.u.umovement, expectedMovement);
            assert.deepEqual(getRngLog(), expectedLog);
            assert.deepEqual(g.u._monsterMoveRollQueue, [2, 2, 1, 2, 2, 2, 0], 'an unrelated field cannot override the PRNG');
        });
    }
}
