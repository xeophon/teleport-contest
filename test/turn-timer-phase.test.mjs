import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, ICE, ICED_POOL } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { beginBurn } from '../js/burn.js';
import { scheduleMeltIceTimeout } from '../js/ice.js';
import { processGameTimers, processMonsterTurns, moveloop_core } from '../js/allmain.js';
import { rhack } from '../js/cmd.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { pushKey, resetInputState } from '../js/input.js';

function setup(changes = {}) {
    resetGame(); resetInputState(); initRng(41);
    game.moves = 99;
    game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Wizard';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 10, uhpmax: 30,
        uen: 100, uenmax: 100, ulevel: 10, uhunger: 900, umovement: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] }, ualign: { type: 0, record: 0 }, ...changes };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.level.regions = [{ type: 'gas_cloud', damage: 0, ttl: 5, coords: [{ x: 50, y: 10 }] }];
    const lamp = { otyp: 227, kind: 'oil lamp', age: 1, quan: 1, letter: 'a', cls: 'tool' };
    game.inventory = [lamp];
    vision_reset(); enableRngLog({ reset: true });
    return lamp;
}

test('C turn setup advances the clock before timers, regions and regeneration', async () => {
    const lamp = setup({ _polyself_form: { name: 'newt' } });
    beginBurn(lamp);
    let observed;
    Object.defineProperty(lamp, 'lamplit', { configurable: true, get: () => true,
        set: value => { if (!value) observed = { moves: game.moves, ttl: game.level.regions[0].ttl, hp: game.u.uhp }; } });
    await processMonsterTurns();
    assert.deepEqual(observed, { moves: 100, ttl: 5, hp: 10 });
    assert.equal(game.moves, 100);
    assert.equal(game.level.regions[0].ttl, 4);
    assert.equal(game.u.uhp, 11);
});

test('C prayer invulnerability skips object timers while regions still advance', async () => {
    const lamp = setup({ uinvulnerable: true, _confusionTimeout: 2 });
    beginBurn(lamp);
    await processMonsterTurns();
    assert.equal(game.moves, 100);
    assert.equal(lamp.lamplit, true);
    assert.equal(game.timers.length, 1);
    assert.equal(game.u._confusionTimeout, 2);
    assert.equal(game.level.regions[0].ttl, 4);
    // goto_level() directly runs timers even during invulnerability.
    await processGameTimers();
    assert.equal(lamp.lamplit, false);
});

for (const save of [false, true]) test(`melt callback resumes controlled teleport ${save ? 'from a saved game' : 'in the live game'}`, async () => {
    let lamp = setup({ teleportation: true, teleportControl: true });
    // Keep the subsequent callback dry when drowning wets hero inventory.
    game.inventory = [];
    Object.assign(lamp, { ox: 30, oy: 10 }); game.level.objects.push(lamp);
    beginBurn(lamp);
    Object.assign(game.level.at(10, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(10, 10, 1);
    assert.equal(await processMonsterTurns(), 'defer-tail');
    assert.equal(game.moves, 100);
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(lamp.lamplit, true);
    assert.equal(game.timers.length, 1);
    assert.equal(game.level.regions[0].ttl, 5);
    assert.equal(game.u.uhp, 10);
    assert.equal(game.context.mon_moving, true);
    if (save) {
        restoreSaveState(encodeSaveState());
        // jsmain initializes the process PRNG after restoring game data.
        initRng(41, { resetLog: false });
        lamp = game.level.objects.find(obj => obj.kind === 'oil lamp');
        assert.equal(game.timers[0].arg, lamp);
        assert.equal(game._timer_callback_pending.contextMoving, undefined);
    }
    const log = getRngLog();
    while (game._message_more) await rhack(' ');
    await rhack('l');
    assert.deepEqual(getRngLog(), log);
    assert.equal(lamp.lamplit, true);
    await rhack('.');
    assert.equal(game._water_continuation, null);
    assert.equal(await processMonsterTurns(), true);
    assert.equal(game.moves, 100);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.timers.length, 0);
    assert.equal(game.level.regions[0].ttl, 4);
    assert.equal(game.context.mon_moving, undefined);
});

test('slow hero advances the clock and regions once per actual full turn', async () => {
    setup({ _monsterMove: 6, _polyself_form: { name: 'newt' } });
    assert.equal(await processMonsterTurns(), true);
    assert.equal(game.moves, 101);
    assert.equal(game.level.regions[0].ttl, 3);
    assert.equal(game.u.uhp, 11);
});

test('expired water walking is gone before the melting-ice callback', async () => {
    setup({ waterWalking: true, _temporaryWaterWalkingTimeout: 1, teleportation: true, teleportControl: true });
    game.inventory = [];
    Object.assign(game.level.at(10, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(10, 10, 1);
    await processMonsterTurns();
    assert.equal(game.u.waterWalking, false);
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game._turn_tail_phase, 'timers');
});

test('moveloop retains a melting turn across cursor input without spending another turn', async () => {
    const lamp = setup({ teleportation: true, teleportControl: true });
    game.inventory = [];
    Object.assign(lamp, { ox: 30, oy: 10 }); game.level.objects.push(lamp);
    beginBurn(lamp);
    Object.assign(game.level.at(10, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(10, 10, 1);
    game._pending_time_passed = 1;
    game.u.umovement = 12;
    pushKey(' ');
    await moveloop_core();
    assert.equal(game.moves, 100);
    while (game._message_more) await rhack(' ');
    const log = getRngLog();
    pushKey('l');
    await moveloop_core();
    assert.equal(game.moves, 100);
    assert.deepEqual(getRngLog(), log);
    pushKey('.');
    await moveloop_core();
    assert.equal(game._water_operation_resumed, 1);
    pushKey('\x1b');
    await moveloop_core();
    assert.equal(game.moves, 100);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.level.regions[0].ttl, 4);
    assert.equal(game._pending_time_passed, 0);
});

for (const amulet of [true, false]) test(`melt callback survives ${amulet ? 'life saving' : 'wizard death refusal'} before continuing the queue`, async () => {
    const lamp = setup();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = STONE;
    game.level.at(20, 10).typ = ROOM;
    game.inventory = amulet ? [{ letter: 'b', cls: 'amulet', glyph: '"', amuletIndex: 1, worn: true, quan: 1 }] : [];
    game.flags.debug = !amulet;
    Object.assign(lamp, { ox: 20, oy: 10 }); game.level.objects.push(lamp);
    beginBurn(lamp);
    Object.assign(game.level.at(10, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(10, 10, 1);
    assert.equal(await processMonsterTurns(), 'defer-tail');
    assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
    const log = getRngLog();
    await rhack('x');
    assert.deepEqual(getRngLog(), log);
    assert.equal(lamp.lamplit, true);
    await rhack(' ');
    if (!amulet) {
        assert.equal(game._command_mode, 'wizardDieConfirm');
        await rhack('n');
    }
    assert.equal(game._water_continuation, null);
    assert.equal(game.context.mon_moving, true);
    await processMonsterTurns();
    assert.equal(game.moves, 100);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.level.regions[0].ttl, 4);
    assert.equal(game.context.mon_moving, undefined);
});

test('a melt callback waits for the crawl message before relocating the hero', async () => {
    const lamp = setup();
    game.inventory = [];
    Object.assign(lamp, { ox: 30, oy: 10 }); game.level.objects.push(lamp);
    beginBurn(lamp);
    Object.assign(game.level.at(10, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(10, 10, 1);
    assert.equal(await processMonsterTurns(), 'defer-tail');
    assert.equal(game._command_mode, 'waterCrawlMore');
    assert.deepEqual([game.u.ux, game.u.uy], [10, 10]);
    const log = getRngLog();
    await rhack('x');
    assert.deepEqual(getRngLog(), log);
    assert.equal(lamp.lamplit, true);
    while (game._water_continuation) await rhack(' ');
    assert.notDeepEqual([game.u.ux, game.u.uy], [10, 10]);
    assert.equal(game.context.move, 0);
    await processMonsterTurns();
    assert.equal(game.moves, 100);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.level.regions[0].ttl, 4);
});

test('repeated drowning refusals leave the next timer queued until rescue completes', async () => {
    const lamp = setup();
    game.flags.debug = true;
    game.inventory = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = STONE;
    Object.assign(lamp, { ox: 30, oy: 10 }); game.level.objects.push(lamp);
    beginBurn(lamp);
    Object.assign(game.level.at(10, 10), { typ: ICE, flags: ICED_POOL });
    scheduleMeltIceTimeout(10, 10, 1);
    await processMonsterTurns();
    for (let attempt = 1; attempt <= 2; attempt++) {
        assert.equal(game._command_mode, 'deathDieMore');
        assert.equal(game._water_continuation.deathAttempts, attempt);
        assert.equal(lamp.lamplit, true);
        assert.equal(game.level.regions[0].ttl, 5);
        await rhack(' ');
        assert.equal(game._command_mode, 'wizardDieConfirm');
        await rhack('n');
        if (attempt === 1) assert.equal(await processMonsterTurns(), 'defer-tail');
    }
    assert.equal(game._water_continuation, null);
    await processMonsterTurns();
    assert.equal(game.moves, 100);
    assert.equal(lamp.lamplit, false);
    assert.equal(game.level.regions[0].ttl, 4);
});
