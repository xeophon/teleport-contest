import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, ICE, ICED_POOL } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { beginBurn } from '../js/burn.js';
import { scheduleMeltIceTimeout } from '../js/ice.js';
import { finishLevelTeleport, rhack } from '../js/cmd.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';

function setup(entry, controlled = true) {
    resetGame(); resetInputState(); initRng(41);
    game.moves = 10; game.flags = { verbose: false }; game.context = {};
    game._startup_role = 'Wizard'; game.inventory = [];
    game.dungeons = [{ name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 20 }];
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 2 }, uhp: 30, uhpmax: 30,
        ulevel: 10, uen: 100, uhunger: 900, umovement: 12, teleportation: controlled,
        teleportControl: controlled, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    const target = new GameMap(), origin = new GameMap();
    for (const level of [target, origin]) for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(level.at(x, y), { typ: ROOM, lit: true });
    target.dndest = target.updest = { lx: 20, ly: 10, hx: 20, hy: 10, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    Object.assign(target.at(20, 10), { typ: ICE, flags: ICED_POOL });
    game.level = target;
    const lamp = { otyp: 227, kind: 'oil lamp', cls: 'tool', ox: 30, oy: 10, age: 1, quan: 1 };
    target.objects.push(lamp); beginBurn(lamp); scheduleMeltIceTimeout(20, 10, 1);
    game.level = origin; game.moves = 11;
    game.u.uz.dlevel = entry === '<' ? 3 : 1;
    game.stairs = { sx: 10, sy: 10, up: entry === '<', tolev: { dnum: 0, dlevel: 2 } };
    game._saved_levels = new Map([['0:2', { level: target, moves: 10,
        stairs: { sx: 20, sy: 10, up: entry !== '<', tolev: { ...game.u.uz } } }]]);
    vision_reset(); enableRngLog({ reset: true });
    return lamp;
}

for (const entry of ['teleport', '>', '<']) for (const save of [false, true])
    test(`${entry} arrival waits for its timer teleport ${save ? 'across save/restore' : 'in the live game'}`, async () => {
        let lamp = setup(entry);
        if (entry === 'teleport') await finishLevelTeleport({ dnum: 0, dlevel: 2 }, { portalArrival: true });
        else await rhack(entry);
        assert.equal(game._command_mode, 'waterTeleportCursor');
        assert.ok(game._level_arrival_continuation);
        assert.equal(game._redraw_level_after_more || 0, 0);
        assert.equal(lamp.lamplit, true);
        assert.equal(game.context.move || 0, 0);
        if (save) {
            restoreSaveState(encodeSaveState()); initRng(41, { resetLog: false });
            lamp = game.level.objects.find(obj => obj.kind === 'oil lamp');
        }
        while (game._message_more) await rhack(' ');
        const log = getRngLog();
        await rhack('l');
        assert.deepEqual(getRngLog(), log);
        assert.equal(lamp.lamplit, true);
        await rhack('.');
        assert.equal(game._level_arrival_continuation, null);
        assert.equal(game._timer_callback_pending, null);
        assert.equal(lamp.lamplit, false);
        assert.equal(game.moves, 11);
        assert.equal(game.context.mon_moving, undefined);
        if (entry !== 'teleport') assert.equal(game.context.move, 1);
    });

test('fall damage waits until an arrival timer and its rescue finish', async () => {
    setup('teleport');
    await finishLevelTeleport({ dnum: 0, dlevel: 2 }, { portalArrival: true, falling: true });
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game.u.uhp, 30);
    while (game._message_more) await rhack(' ');
    await rhack('l'); await rhack('.');
    assert.ok(game.u.uhp < 30 && game.u.uhp >= 24);
    assert.ok(getRngLog().some(row => row.startsWith('d(1,6)')));
});

test('arrival waits for crawl messages before resetting the destination display', async () => {
    const lamp = setup('teleport', false);
    await finishLevelTeleport({ dnum: 0, dlevel: 2 }, { portalArrival: true });
    assert.equal(game._command_mode, 'waterCrawlMore');
    assert.deepEqual([game.u.ux, game.u.uy], [20, 10]);
    assert.equal(lamp.lamplit, true);
    while (game._water_continuation) await rhack(' ');
    assert.equal(game._level_arrival_continuation, null);
    assert.equal(lamp.lamplit, false);
    assert.notDeepEqual([game.u.ux, game.u.uy], [20, 10]);
});

for (const entry of ['teleport', '>', '<']) for (const amulet of [false, true])
    test(`${entry} arrival survives ${amulet ? 'life saving' : 'wizard refusal'} before the next queued callback`, async () => {
        const lamp = setup(entry, false);
        game.flags.debug = !amulet;
        if (amulet) game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
        const target = game._saved_levels.get('0:2').level;
        for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) target.at(x, y).typ = STONE;
        target.at(20, 10).typ = ICE;
        target.at(30, 10).typ = ROOM;
        if (entry === 'teleport') await finishLevelTeleport({ dnum: 0, dlevel: 2 }, { portalArrival: true });
        else await rhack(entry);
        assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
        assert.equal(lamp.lamplit, true);
        assert.ok(game._level_arrival_continuation);
        const log = getRngLog();
        await rhack('x');
        assert.deepEqual(getRngLog(), log);
        await rhack(' ');
        if (!amulet) {
            assert.equal(game._command_mode, 'wizardDieConfirm');
            await rhack('n');
        }
        assert.equal(game._level_arrival_continuation, null);
        assert.equal(lamp.lamplit, false);
        assert.equal(game.moves, 11);
        assert.ok(game.u.uhp > 0);
    });

test('quest rejection keeps its timer prompt and completes caller bookkeeping after rescue', async () => {
    const lamp = setup('teleport');
    game.branches = [{ end1: { dnum: 0, dlevel: 2 }, end2: { dnum: 0, dlevel: 1 } }];
    game._command_mode = 'questLeaderRejectMore'; game._message_more = 1;
    await rhack(' ');
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game._level_arrival_continuation.options.questRejection, true);
    assert.equal(game._process_deferred_context_now || 0, 0);
    while (game._message_more) await rhack(' ');
    await rhack('l'); await rhack('.');
    assert.equal(lamp.lamplit, false);
    assert.equal(game._level_arrival_continuation, null);
    assert.equal(game._process_deferred_context_now, 1);
    assert.equal(game._pending_time_passed, 1);
    assert.equal(game._command_mode, null);
});

for (const entry of ['>', '<']) test(`the main loop parks ${entry} arrival through cursor input`, async () => {
    const lamp = setup(entry);
    pushKey(entry); await moveloop_core();
    assert.equal(game.moves, 11);
    assert.equal(game._command_mode, 'waterTeleportCursor');
    while (game._message_more) { pushKey(' '); await moveloop_core(); }
    const log = getRngLog();
    pushKey('l'); await moveloop_core();
    assert.equal(game.moves, 11);
    assert.deepEqual(getRngLog(), log);
    assert.equal(lamp.lamplit, true);
    pushKey('.'); await moveloop_core();
    assert.equal(game._level_arrival_continuation, null);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.moves, 11);
});
