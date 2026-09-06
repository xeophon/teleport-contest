import assert from 'node:assert/strict';
import test from 'node:test';

import { finishLevelTeleport } from '../js/cmd.js';
import { ROOM } from '../js/const.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { enableRngLog, getRngLog, initRng, rn2 } from '../js/rng.js';

// C: do.c:goto_level -> dungeon.c:u_on_rndspot -> mkmaze.c:place_lregion.
// A revisited level uses its arrival rectangle, including for blind heroes
// and forms which cannot move without magical speed.
for (const special of ['valley', 'sanctum']) {
    for (const seed of [42, 87, 301]) {
        for (const blindMold of [false, true]) {
            test(`${special} saved arrival uses its region and PRNG (${seed}, mold=${blindMold})`, async () => {
                const g = resetGame();
                initRng(seed);
                const expected = [20 + rn2(3), 6 + rn2(3)];
                initRng(seed);
                enableRngLog();
                g.level = new GameMap();
                g.flags = {};
                g.context = {};
                g.inventory = [];
                g.moves = 10;
                g._startup_role = 'Wizard';
                g.u = {
                    ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 },
                    blind: blindMold, _polyself_form: blindMold ? { name: 'brown mold' } : null,
                    uhp: 20, uhpmax: 20, ulevel: 1, acurr: { a: [10, 10, 10, 10, 10, 10] },
                };
                g.dungeons = [
                    { name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 25 },
                    { name: 'Gehennom', depth_start: 26, num_dunlevs: 22 },
                ];
                const destination = { dnum: 1, dlevel: special === 'valley' ? 1 : 22 };
                g.specialLevels = [{ name: special, ...destination }];
                const target = new GameMap();
                target.dndest = { lx: 20, ly: 6, hx: 22, hy: 8, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
                for (let x = 20; x <= 22; x++) {
                    for (let y = 6; y <= 8; y++) target.at(x, y).typ = ROOM;
                }
                g._saved_levels = new Map([[`1:${destination.dlevel}`, { level: target, moves: 10, stairs: null }]]);

                await finishLevelTeleport(destination);

                assert.equal(g.level, target);
                assert.deepEqual([g.u.ux, g.u.uy], expected);
                assert.deepEqual(getRngLog().slice(0, 2), [`rn2(3)=${expected[0] - 20}`, `rn2(3)=${expected[1] - 6}`]);
                assert.equal(g.u._monsterMoveRollQueue, undefined);
            });
        }
    }
}
