import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, FOUNTAIN } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { moveloop_core } from '../js/allmain.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { vision_reset } from '../js/vision.js';
import { pushKeys, resetInputState } from '../js/input.js';

function setup(changes = {}) {
    resetGame(); resetInputState(); initRng(41);
    game.moves = 100; game.context = {}; game.flags = {};
    game._startup_role = 'Wizard';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30,
        uen: 100, uenmax: 100, ulevel: 10, uhunger: 900, umovement: 12,
        acurr: { a: [10, 10, 10, 10, 10, 10] }, ualign: { type: 0, record: 0 }, ...changes };
    game.level = new GameMap(); game.inventory = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); enableRngLog({ reset: true });
}

async function command(keys) {
    pushKeys(keys);
    for (;;) {
        try { await moveloop_core(); }
        catch (error) {
            if (error.message.includes('Input queue empty')) return;
            throw error;
        }
    }
}

for (const spareAction of [false, true]) test(`clean #wipe spends an action ${spareAction ? 'from very-fast movement credit' : 'at ordinary speed'}`, async () => {
    setup(spareAction ? { veryfast: true, umovement: 24 } : {});
    // C do.c:dowipe returns ECMD_TIME even when the face is already clean.
    await command('#wipe\n');
    assert.match(game._pending_message, /face is already clean/);
    assert.equal(game.moves, spareAction ? 100 : 101);
    assert.equal(game.u.umovement, 12);
    if (spareAction) {
        assert.deepEqual(getRngLog(), []);
        await command('#sit\n');
        assert.equal(game.moves, 101);
    }
});

for (const veryfast of [false, true]) for (const saved of [false, true])
    test(`fountain vomiting preserves earned ${veryfast ? 'very-fast' : 'ordinary'} movement after ${saved ? 'saved' : 'live'} More`, async () => {
        setup(veryfast ? { veryfast: true, umovement: 24 } : {});
        game.level.at(10, 10).typ = FOUNTAIN;
        // C fountain.c:294 fate20, then hunger roll and dryup roll.
        game.coreCtx.r = [19n, 0n, 0n].reverse(); game.coreCtx.n = 3;
        await command('qy');
        assert.match(game._pending_message, /gag and vomit/);
        assert.equal(game._helpless_time, 0);
        assert.equal(game._message_more, 1);
        const credit = game.u.umovement, turn = game.moves, rng = [...getRngLog()];
        assert.ok(credit >= 12);
        if (saved) {
            const core = game.coreCtx;
            restoreSaveState(encodeSaveState());
            game.coreCtx = core;
        }
        await command(' ');
        // C hack.c:unmul prints the wake message without changing umovement.
        assert.equal(game.u.umovement, credit);
        assert.equal(game.moves, turn);
        assert.deepEqual(getRngLog(), rng);
        assert.match(game._pending_message, /You can move again/);
    });
