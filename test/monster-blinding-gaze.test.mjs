import assert from 'node:assert/strict';
import test from 'node:test';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { GameDisplay } from '../js/game_display.js';
import { HeadlessTerminal } from '../js/terminal.js';
import { monsterByRndName } from '../js/mklev.js';
import * as commands from '../js/cmd.js';
import { supportsMonsterAttackSlots } from '../js/mhitu.js';
import { processMonsterTurns } from '../js/allmain.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { vision_reset } from '../js/vision.js';
import { initRng, enableRngLog, enableDisplayRngLog, getRngLog } from '../js/rng.js';
import { ROOM, COULD_SEE, IN_SIGHT, BLINDED, BLND_RES, STUNNED, W_TOOL, W_WEP, FAINTED } from '../js/const.js';
import { AT_GAZE, AD_BLND } from '../js/permonst.js';

function setup(width = 800, values = []) {
    const g = resetGame(); initRng(42); enableRngLog(); enableDisplayRngLog(false);
    Object.assign(g, { flags: {}, context: {}, inventory: [], moves: 100,
        level: new GameMap(), nhDisplay: { cols: width },
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 200, uhpmax: 200, uac: 10, uhunger: 800,
            acurr: { a: [14, 14, 14, 14, 14, 14] } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset(); g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const mon = { data: monsterByRndName('Archon'), m_id: 50, mx: 11, my: 10, mux: 10, muy: 10,
        m_lev: 20, mhp: 100, mhpmax: 100, mcansee: true, mcanmove: true, minvent: [], movement: 12, mspec_used: 100 };
    g.level.monsters.push(mon);
    if (width < 800) g.nhDisplay = new GameDisplay(new HeadlessTerminal({ cols: width }));
    const rolls = [...values.map(BigInt), ...Array(300).fill(0n)];
    g.coreCtx.r = rolls.reverse(); g.coreCtx.n = rolls.length;
    return { g, mon, attack: { aatyp: AT_GAZE, adtyp: AD_BLND, damn: 2, damd: 6 } };
}

test('Archon gaze rolls blindness then max(old stun, rnd3), without direct damage or cooldown', async () => {
    const { g, mon, attack } = setup();
    g.u._stunTimeout = 9; g.u.stunned = true;
    g.u.uprops = { [STUNNED]: { intrinsic: 9 } };
    g._pick_lock_occupation = { turns: 2 };
    assert.equal(await commands.monsterGaze(mon, attack), true);
    assert.equal(g.u._blindTimeout, 2); assert.equal(g.u.blind, true);
    assert.equal(g.u._stunTimeout, 9); assert.equal(g.u.uprops[STUNNED].intrinsic, 9);
    assert.equal(g.u.uhp, 200); assert.equal(mon.mspec_used, 100);
    assert.equal(g._pick_lock_occupation, null);
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]), ['d(2,6)', 'rnd(3)']);
    assert.match(g._pending_message, /blinded by the Archon's radiance/);
    assert.doesNotMatch(g._pending_message, /stagger/);
});

for (const mounted of [false, true]) test(`new gaze stun reports its source message: mounted=${mounted}`, async () => {
    const { g, mon, attack } = setup(); if (mounted) g.u.usteed = { data: { name: 'pony' } };
    await commands.monsterGaze(mon, attack);
    assert.equal(g.u._stunTimeout, 1); assert.equal(g.u.stunned, true);
    assert.match(g._pending_message, mounted ? /wobble in the saddle/ : /You stagger/);
});

for (const state of ['blind', 'sleep', 'unconscious', 'fainted', 'invisible', 'distant', 'Sunsword'])
    test(`Archon gaze is blocked by ${state}, with no gaze RNG`, async () => {
        const { g, mon, attack } = setup();
        if (state === 'blind') g.u.blind = true;
        if (state === 'sleep') { g.multi = -3; g.u.usleep = 99; }
        if (state === 'unconscious') { g.multi = -3; g._wake_message = 'You regain consciousness.'; }
        if (state === 'fainted') { g.multi = -3; g.u.uhs = FAINTED; }
        if (state === 'invisible') mon.minvis = true;
        if (state === 'distant') mon.mx = 20;
        if (state === 'Sunsword') g.inventory = [{ artifact: 'Sunsword', cls: 'weapon', kind: 'long sword', owornmask: W_WEP }];
        await commands.monsterGaze(mon, attack);
        assert.equal(g.u._blindTimeout || 0, 0); assert.equal(g.u._stunTimeout || 0, 0);
        assert.deepEqual(getRngLog(), []);
    });

test('a blind Archon still radiates; its own mcansee does not gate AD_BLND', async () => {
    const { g, mon, attack } = setup(); mon.mcansee = false;
    await commands.monsterGaze(mon, attack);
    assert.equal(g.u._blindTimeout, 2); assert.equal(g.u._stunTimeout, 1);
});

test('Eyes of the Overworld allow blindness duration but block sight loss and stun roll', async () => {
    const { g, mon, attack } = setup();
    g.inventory = [{ artifact: 'The Eyes of the Overworld', cls: 'tool', kind: 'lenses', worn: true, owornmask: W_TOOL }];
    g.u.uprops = { [BLINDED]: { intrinsic: 0, blocked: W_TOOL } };
    await commands.monsterGaze(mon, attack);
    assert.equal(g.u._blindTimeout, 2); assert.equal(g.u.uprops[BLINDED].intrinsic, 2);
    assert.equal(g.u.blind, false); assert.equal(g.u._stunTimeout || 0, 0);
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]), ['d(2,6)']);
    assert.match(g._pending_message, /Your vision clears\./);
});

for (const suppressed of [false, true]) test(`cancelled Archon reaction consumes source rolls: suppressed=${suppressed}`, async () => {
    const { g, mon, attack } = setup(800, [1, +suppressed]); mon.mcan = true;
    await commands.monsterGaze(mon, attack);
    assert.equal(g.u.blind || false, false);
    // The JS rn1 wrapper logs its single underlying rn2 call.
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]), suppressed ? ['rn2(2)', 'rn2(5)'] : ['rn2(2)', 'rn2(5)', 'rn2(3)']);
    if (suppressed) assert.equal(g._pending_message || '', '');
    else assert.match(g._pending_message, /The Archon looks dazzled\./);
});

test('hallucination cancels before visibility and uses the full reaction table', async () => {
    const { g, mon, attack } = setup(800, [1, 0, 1, 7, 1, 1]); g.u.hallucinating = true;
    await commands.monsterGaze(mon, attack);
    assert.equal(g.u._blindTimeout || 0, 0);
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]), ['rn2(4)', 'rn2(2)', 'rn2(3)', 'rn2(8)', 'rn2(3)', 'rn2(2)']);
    assert.match(g._pending_message, /looks somewhat dulled/);
});

test('live Archon gaze resumes after saved radiance More before blindness and stun RNG', async () => {
    const { g, mon } = setup(55);
    assert.equal(supportsMonsterAttackSlots(mon), true);
    await processMonsterTurns();
    for (let i = 0; i < 30 && !getRngLog().some(line => line.startsWith('d(2,6)=')); i++) await commands.rhack(' ');
    assert.ok(g._message_more);
    assert.equal(g.u._blindTimeout || 0, 0);
    assert.equal(getRngLog().filter(line => line.startsWith('d(2,6)=')).length, 1);
    assert.equal(getRngLog().filter(line => line.startsWith('rnd(3)=')).length, 0);
    const { coreCtx, displayCtx, rng, nhDisplay } = g;
    restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
    for (let i = 0; i < 50 && g._monster_attack_continuation; i++) await commands.rhack(' ');
    assert.equal(g.u._blindTimeout, 2); assert.equal(g.u._stunTimeout, 1);
    assert.equal(g._monster_attack_continuation, null);
    assert.equal(getRngLog().filter(line => line.startsWith('d(2,6)=')).length, 1);
    assert.equal(getRngLog().filter(line => line.startsWith('rnd(3)=')).length, 1);
});

for (const field of ['intrinsic', 'extrinsic']) test(`canonical BLND_RES ${field} blocks gaze before damage dice`, async () => {
    const { g, mon, attack } = setup(); g.u.uprops = { [BLND_RES]: { [field]: 1 } };
    await commands.monsterGaze(mon, attack);
    assert.equal(g.u._blindTimeout || 0, 0); assert.deepEqual(getRngLog(), []);
});

test('carried Sunsword does not provide the defense of the wielded weapon', async () => {
    const { g, mon, attack } = setup(); g.inventory = [{ artifact: 'Sunsword', cls: 'weapon', kind: 'long sword' }];
    await commands.monsterGaze(mon, attack); assert.equal(g.u._blindTimeout, 2);
});

for (const [dx, dy, affected] of [[8, 0, true], [6, 6, false]]) test(`blinding radiance uses squared range at ${dx},${dy}`, async () => {
    const { g, mon, attack } = setup(); mon.mx = 10 + dx; mon.my = 10 + dy;
    await commands.monsterGaze(mon, attack); assert.equal(!!g.u.blind, affected);
});

test('hallucinated gazing monster uses the display RNG after core reaction choice', async () => {
    const { g, mon, attack } = setup(800, [1]); g.u.hallucinating = true;
    enableDisplayRngLog();
    await commands.monsterGaze(mon, attack);
    assert.ok(getRngLog().some(line => line.startsWith('~drn2')));
    assert.doesNotMatch(g._pending_message, /The Archon looks/);
});

test('saved stagger More precedes stun application and gazemu still returns a missed slot', async () => {
    const { g, mon } = setup(42);
    await commands.runMonsterAttackTurn(mon);
    for (let i = 0; i < 40 && !getRngLog().some(line => line.startsWith('rnd(3)=')); i++) await commands.rhack(' ');
    assert.ok(g._message_more); assert.equal(g.u._blindTimeout, 2); assert.equal(g.u._stunTimeout || 0, 0);
    const { coreCtx, displayCtx, rng, nhDisplay } = g;
    restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
    const attackState = g._monster_attack_continuation;
    for (let i = 0; i < 50 && g._monster_attack_continuation; i++) await commands.rhack(' ');
    assert.equal(g.u._stunTimeout, 1); assert.equal(attackState.hits[2], false);
    assert.equal(getRngLog().filter(line => line.startsWith('rnd(3)=')).length, 1);
    assert.equal(getRngLog().some(line => line.startsWith('rnd(22)=')), false);
});
