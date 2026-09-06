import assert from 'node:assert/strict';
import test from 'node:test';

import { finishLevelTeleport, rhack } from '../js/cmd.js';
import { monCatchupElapsedTime } from '../js/dog.js';
import { resurrect } from '../js/wizard.js';
import { ROOM, MIGR_RANDOM, MON_MIGRATING, LARGEST_INT } from '../js/const.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function install({ moves = 400, savedMoves = 100, migrate = false } = {}) {
    const g = resetGame();
    initRng(42);
    enableRngLog();
    g.flags = {};
    g.context = {};
    g.inventory = [];
    g.moves = moves;
    g._startup_role = 'Wizard';
    g.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 }, uhp: 50, uhpmax: 50,
        ulevel: 1, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    g.dungeons = [{ name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 20 }];
    g.level = new GameMap();
    const target = new GameMap();
    for (const level of [g.level, target]) {
        for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) level.at(x, y).typ = ROOM;
    }
    target.dndest = { lx: 8, ly: 8, hx: 8, hy: 8, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    const mon = { data: { name: 'little dog', mmove: 18, mac: 6 },
        mx: 30, my: 10, mhp: 5, mhpmax: 20, pet: true, mtame: 10, mpeaceful: true,
        mblinded: 100, mcansee: false, mfrozen: 200, mcanmove: false,
        mfleetim: 300, mflee: true, mtrapped: 1, mconf: 1, mstun: 1,
        meating: 10, mspec_used: 350, mlstmv: savedMoves,
        minvent: [], mextra: { edog: { hungrytime: moves + 1000 } } };
    if (migrate) {
        Object.assign(mon, { mx: 0, my: 0, mux: 0, muy: 2,
            mstate: MON_MIGRATING, mtrack: [{ x: MIGR_RANDOM, y: 0 }] });
        g.migrating_mons = [mon];
    } else target.monsters.push(mon);
    g.stairs = { sx: 5, sy: 5, up: false, tolev: { dnum: 0, dlevel: 2 } };
    const returnStair = { sx: 8, sy: 8, up: true, tolev: { dnum: 0, dlevel: 1 } };
    g._saved_levels = new Map([['0:2', { level: target, moves: savedMoves, stairs: returnStair }]]);
    return { g, mon, target };
}

// restore.c:1213 performs dog.c:627 catchup before the independent rnd(10)
// hiding check. All timed ailments stop at one for the next monster turn.
for (const entry of ['teleport', 'stairs down', 'stairs up']) {
    test(`resident monster catches up through ${entry}`, async () => {
        const { g, mon, target } = install();
        if (entry === 'teleport') await finishLevelTeleport({ dnum: 0, dlevel: 2 });
        else {
            if (entry === 'stairs up') g.stairs.up = true;
            await rhack(entry === 'stairs up' ? '<' : '>');
        }
        assert.equal(g.level, target);
        assert.equal(mon.mhp, 20);
        assert.equal(mon.mtame, 8);
        assert.equal(mon.mblinded, 1);
        assert.equal(mon.mfrozen, 1);
        assert.equal(mon.mfleetim, 1);
        assert.equal(mon.mcansee, false);
        assert.equal(mon.mcanmove, false);
        assert.equal(mon.meating, 0);
        assert.equal(mon.mspec_used, 50);
        assert.equal(mon.mlstmv, 400);
        assert.deepEqual(getRngLog().slice(0, 4).map(entry => entry.split('=')[0]),
            ['rn2(301)', 'rn2(301)', 'rn2(301)', 'rnd(10)']);
    });
}

// dog.c:491 uses moves-1-mlstmv for an independent arrival, unlike the
// full saved-level elapsed interval passed by restore.c.
for (const entry of ['teleport', 'stairs down', 'stairs up']) {
test(`migrating monster catches up before ${entry} arrival using moves minus one`, async () => {
    const { g, mon, target } = install({ migrate: true });
    if (entry === 'teleport') await finishLevelTeleport({ dnum: 0, dlevel: 2 });
    else {
        if (entry === 'stairs up') g.stairs.up = true;
        await rhack(entry === 'stairs up' ? '<' : '>');
    }
    assert.equal(target.monsters.includes(mon), true);
    assert.equal(g.migrating_mons.includes(mon), false);
    assert.equal(mon.mhp, 19);
    assert.equal(mon.mtame, 8);
    assert.equal(mon.mfleetim, 1);
    assert.equal(mon.mspec_used, 51);
    assert.equal(mon.mlstmv, 400);
    const rolls = getRngLog();
    const firstRecovery = rolls.findIndex(entry => entry.startsWith('rn2(300)='));
    const firstPlacement = rolls.findIndex(entry => entry.startsWith('rnd(79)='));
    assert.ok(firstRecovery >= 0 && firstRecovery < firstPlacement);
});
}

test('an off-level pet goes wild from starvation before catchup healing', async () => {
    const { mon } = install({ moves: 601, savedMoves: 581 });
    mon.mhp = 2;
    mon.mextra.edog.hungrytime = 100;
    await finishLevelTeleport({ dnum: 0, dlevel: 2 });
    assert.equal(mon.mtame, 0);
    assert.equal(mon.pet, false);
    assert.equal(!!mon.mpeaceful, false);
    assert.equal(mon.mhp, 3);
});

test('regenerating monsters heal every off-level turn', async () => {
    const { mon } = install({ moves: 110, savedMoves: 100 });
    mon.data = { name: 'troll', mmove: 12 };
    await finishLevelTeleport({ dnum: 0, dlevel: 2 });
    assert.equal(mon.mhp, 15);
});

test('finishing an off-level meal clears borrowed mimic appearance', async () => {
    const { mon } = install();
    mon.m_ap_type = 2;
    mon.mappearance = 123;
    mon.appearObj = 'boulder';
    await finishLevelTeleport({ dnum: 0, dlevel: 2 });
    assert.equal(mon.meating, 0);
    assert.equal(mon.m_ap_type, 0);
    assert.equal(mon.mappearance, 0);
    assert.equal(mon.appearObj, null);
});

test('off-level catchup rejects future timestamps before mutating state', () => {
    const { mon } = install();
    const before = structuredClone(mon);
    assert.throws(() => monCatchupElapsedTime(mon, -1), /catchup from future time/);
    assert.deepEqual(mon, before);
    assert.deepEqual(getRngLog(), []);
});

test('long catchup clamps ailment rolls and healing to the C signed-short bound', () => {
    const { mon } = install();
    mon.data = { name: 'troll' };
    mon.mhpmax = 100000;
    monCatchupElapsedTime(mon, 1000000);
    assert.equal(mon.mhp, 5 + LARGEST_INT - 1);
    assert.deepEqual(getRngLog().slice(0, 3).map(entry => entry.split('=')[0]),
        ['rn2(32767)', 'rn2(32767)', 'rn2(32767)']);
});

test('catchup preserves a real mimic disguise and does not finish a meal on equality', () => {
    for (const [name, elapsed] of [['small mimic', 11], ['little dog', 10]]) {
        const { mon } = install();
        mon.data = { name };
        mon.m_ap_type = 2;
        mon.mappearance = 123;
        monCatchupElapsedTime(mon, elapsed);
        assert.equal(mon.meating, 0);
        assert.equal(mon.m_ap_type, 2);
        assert.equal(mon.mappearance, 123);
    }
});

test('pet loyalty decays at the rounded 150-turn boundary and clears a feral leash', () => {
    const { g, mon } = install();
    mon.mtrapped = mon.mconf = mon.mstun = 0;
    monCatchupElapsedTime(mon, 74);
    assert.equal(mon.mtame, 10);
    monCatchupElapsedTime(mon, 75);
    assert.equal(mon.mtame, 9);
    mon.mtame = 1;
    mon.mleashed = true;
    mon.m_id = 91;
    g.inventory.push({ kind: 'leash', leashmon: 91 });
    monCatchupElapsedTime(mon, 150);
    assert.equal(mon.mtame, 0);
    assert.equal(mon.mpeaceful, true);
    assert.equal(mon.mleashed, false);
    assert.equal(g.inventory[0].leashmon, 0);
});

test('Wizard resurrection catches up ailments and releases the final frozen turn', async () => {
    const { g, mon } = install({ migrate: true });
    g.context.noOfWizards = 1;
    Object.assign(mon, { iswiz: true, mtame: 0, data: { name: 'Wizard of Yendor' } });
    const result = await resurrect();
    assert.equal(result.mon, mon);
    assert.equal(mon.mhp, 20);
    assert.equal(mon.mfrozen, 0);
    assert.equal(mon.mcanmove, 1);
    assert.equal(mon.mlstmv, 400);
    assert.equal(g.level.monsters.includes(mon), true);
    assert.equal(g.migrating_mons.includes(mon), false);
});

test('Wizard resurrection leaves a sleeping Wizard in migration when its wake roll fails', async () => {
    const { g, mon } = install({ moves: 101, savedMoves: 100, migrate: true });
    g.context.noOfWizards = 1;
    Object.assign(mon, { iswiz: true, mtame: 0, mfrozen: 0, mcanmove: 1,
        msleeping: 1, data: { name: 'Wizard of Yendor' } });
    const result = await resurrect();
    assert.equal(result.mon, null);
    assert.equal(mon.msleeping, 1);
    assert.equal(g.migrating_mons.includes(mon), true);
    assert.ok(getRngLog().some(entry => entry === 'rn2(1)=0'));
});

test('Wizard resurrection caps its independent waking interval before dividing by fifty', async () => {
    const { g, mon } = install({ moves: 1000000, savedMoves: 100, migrate: true });
    g.context.noOfWizards = 1;
    Object.assign(mon, { iswiz: true, mtame: 0, mfrozen: 0, mcanmove: 1,
        msleeping: 1, data: { name: 'Wizard of Yendor' } });
    await resurrect();
    assert.ok(getRngLog().some(entry => entry.startsWith('rn2(656)=')));
    assert.ok(!getRngLog().some(entry => entry.startsWith('rn2(19999)=')));
});

// C do.c:1792 stair damage precedes losedogs:1816; trapdoor damage is later.
test('stair fall damage is rolled before independent monster catchup and placement', async () => {
    const { g, mon, target } = install({ migrate: true });
    g.u.fumbling = true;
    await rhack('>');
    assert.equal(target.monsters.includes(mon), true);
    const rolls = getRngLog();
    const recovery = rolls.findIndex(entry => entry.startsWith('rn2(300)='));
    const placement = rolls.findIndex(entry => entry.startsWith('rnd(79)='));
    const falling = rolls.findIndex(entry => entry.startsWith('rnd(3)='));
    assert.ok(falling >= 0 && falling < recovery && recovery < placement);
    assert.ok(g._stairs_fall_after_more.damage >= 1 && g._stairs_fall_after_more.damage <= 3);
});

test('Wizard resurrection preserves permanent immobility represented by a boolean', async () => {
    const { g, mon } = install({ migrate: true });
    g.context.noOfWizards = 1;
    Object.assign(mon, { iswiz: true, mtame: 0, mfrozen: 0, mcanmove: false,
        data: { name: 'Wizard of Yendor' } });
    assert.equal((await resurrect()).mon, null);
    assert.equal(g.migrating_mons.includes(mon), true);
});
