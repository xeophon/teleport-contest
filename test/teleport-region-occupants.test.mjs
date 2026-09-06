import assert from 'node:assert/strict';
import test from 'node:test';
import * as mk from '../js/mklev.js';
import { finishLevelTeleport } from '../js/cmd.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STONE, LR_TELE, LR_UPTELE, LR_DOWNTELE, MIGR_APPROX_XY, MIGR_RANDOM, MON_LIMBO, MON_MIGRATING, ROOMOFFSET } from '../js/const.js';

function setup({ open = true, seed = 42 } = {}) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { moves: 100, flags: {}, context: {}, inventory: [], _startup_role: 'Wizard',
        dungeons: [{ name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 20 }],
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 2 }, ulevel: 1, uhp: 20, uhpmax: 20 }, level: new GameMap() });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = open ? ROOM : STONE;
    g.level.at(10, 10).typ = ROOM;
    const mon = { m_id: 19, data: { name: 'goblin', mlet: 'o' }, mx: 10, my: 10, mux: 10, muy: 10,
        mhp: 10, mhpmax: 10, m_lev: 1, minvent: [] };
    g.level.monsters.push(mon);
    return { g, mon };
}

for (const type of [LR_TELE, LR_UPTELE, LR_DOWNTELE]) {
    test(`fixed teleport region ${type} immediately relocates its occupant after the two coordinate rolls`, () => {
        const { g, mon } = setup();
        mk.place_lregion(10, 10, 10, 10, 0, 0, 0, 0, type, null);
        assert.deepEqual([g.u.ux, g.u.uy], [10, 10]);
        assert.notDeepEqual([mon.mx, mon.my], [10, 10]);
        assert.deepEqual(getRngLog().slice(0, 4).map(call => call.split('=')[0]), ['rn2(1)', 'rn2(1)', 'rnd(79)', 'rn2(21)']);
        assert.equal(g.level.monsters.includes(mon), true);
    });
}

test('probabilistic teleport placement retries an occupied square without moving its monster', () => {
    const { g, mon } = setup();
    // Force every other square in this region to be occupied terrain. The
    // first 200 attempts reject occupants, then the exhaustive pass moves one.
    g.level.at(11, 10).typ = STONE;
    mk.place_lregion(10, 10, 11, 10, 0, 0, 0, 0, LR_TELE, null);
    const log = getRngLog();
    assert.equal(log.slice(0, 400).every((call, i) => call.startsWith(i % 2 ? 'rn2(1)=' : 'rn2(2)=')), true);
    assert.match(log[400], /^rnd\(79\)=/);
    assert.notDeepEqual([mon.mx, mon.my], [10, 10]);
    assert.deepEqual([g.u.ux, g.u.uy], [10, 10]);
});

test('an unplaceable fixed occupant enters limbo for the current level with its original approximate coordinate', () => {
    const { g, mon } = setup({ open: false });
    const ordinary = { kind: 'dagger', quan: 1, no_charge: 1, contents: [{ kind: 'ruby', no_charge: 1 }] };
    const bell = { kind: 'Bell of Opening', quan: 1 }; mon.minvent.push(ordinary, bell);
    mk.place_lregion(10, 10, 10, 10, 0, 0, 0, 0, LR_TELE, null);
    assert.equal(g.level.monsters.includes(mon), false); assert.deepEqual(g.migrating_mons, [mon]);
    assert.deepEqual([mon.mx, mon.my, mon.mux, mon.muy], [0, 0, 0, 2]);
    assert.equal(mon.mstate & (MON_LIMBO | MON_MIGRATING), MON_LIMBO | MON_MIGRATING);
    assert.deepEqual(mon.mtrack.slice(0, 3), [{ x: MIGR_APPROX_XY, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 2 }]);
    assert.equal(mon.mlstmv, 100); assert.equal(mon.minvent.includes(ordinary), true);
    assert.equal(ordinary.no_charge, 0); assert.equal(ordinary.contents[0].no_charge, 0);
    assert.equal(mon.minvent.includes(bell), false); assert.equal(g.level.objects.includes(bell), true);
    assert.deepEqual([bell.ox, bell.oy], [10, 10]);
    assert.deepEqual(getRngLog().slice(0, 2), ['rn2(1)=0', 'rn2(1)=0']);
    assert.equal(getRngLog().filter(call => call.startsWith('rnd(79)')).length, 50);
});

test('a limbo monster returns at its remembered coordinate without a random-position roll', () => {
    const { g, mon } = setup(); g.level.monsters = []; g.u.ux = 5; g.u.uy = 5;
    Object.assign(mon, { mx: 0, my: 0, mux: 0, muy: 2, mlstmv: 99,
        mstate: MON_LIMBO | MON_MIGRATING, mtrack: [{ x: MIGR_APPROX_XY, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 2 }] });
    g.migrating_mons = [mon];
    mk.arriveMigratingMonsters();
    assert.deepEqual([mon.mx, mon.my], [10, 10]); assert.equal(g.migrating_mons.length, 0);
    assert.equal(g.level.monsters.includes(mon), true); assert.equal(mon.mstate & (MON_LIMBO | MON_MIGRATING), 0);
    assert.deepEqual(getRngLog(), []);
});

test('approximate arrivals wander within their source room after off-level catchup', () => {
    const { g, mon } = setup(); g.level.monsters = []; g.u.ux = 5; g.u.uy = 5;
    g.level.rooms = [{ lx: 9, ly: 8, hx: 12, hy: 11, rtype: 0 }];
    for (let x = 9; x <= 12; x++) for (let y = 8; y <= 11; y++) g.level.at(x, y).roomno = ROOMOFFSET;
    Object.assign(mon, { mx: 0, my: 0, mux: 0, muy: 2, mlstmv: 90,
        mstate: MON_LIMBO | MON_MIGRATING, mtrack: [{ x: MIGR_APPROX_XY, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 2 }] });
    g.migrating_mons = [mon]; mk.arriveMigratingMonsters();
    assert.ok(mon.mx >= 9 && mon.mx <= 12 && mon.my >= 8 && mon.my <= 11);
    assert.deepEqual(getRngLog().map(call => call.split('=')[0]), ['rn2(4)', 'rn2(4)']);
    assert.equal(mon.mlstmv, 100);
});

test('failed random arrivals retain their destination and retry through limbo on the next arrival', () => {
    const { g, mon } = setup({ open: false }); g.level.monsters = [];
    Object.assign(mon, { mx: 0, my: 0, mux: 0, muy: 2, mlstmv: 99,
        mstate: MON_MIGRATING, mtrack: [{ x: MIGR_RANDOM, y: 0 }, { x: 25, y: 12 }, { x: 0, y: 1 }] });
    g.migrating_mons = [mon]; mk.arriveMigratingMonsters();
    assert.deepEqual([mon.mux, mon.muy], [0, 2]); assert.equal(mon.mtrack[0].x, MIGR_APPROX_XY);
    assert.equal(g.migrating_mons.includes(mon), true); assert.equal(g.level.monsters.includes(mon), false);
    g.level.at(20, 12).typ = ROOM; mk.arriveMigratingMonsters();
    assert.deepEqual([mon.mx, mon.my], [20, 12]); assert.equal(g.migrating_mons.includes(mon), false);
});

test('an actual saved-level teleport displaces the fixed-region occupant before later arrival processing', async () => {
    const { g, mon } = setup();
    const target = g.level;
    target.dndest = { lx: 10, ly: 10, hx: 10, hy: 10, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    g._saved_levels = new Map([['0:2', { level: target, moves: 100, stairs: null }]]);
    g.level = new GameMap(); g.level.at(10, 10).typ = ROOM; g.u.uz.dlevel = 1;
    await finishLevelTeleport({ dnum: 0, dlevel: 2 });
    assert.equal(g.level, target); assert.deepEqual([g.u.ux, g.u.uy], [10, 10]);
    assert.notDeepEqual([mon.mx, mon.my], [10, 10]);
    assert.deepEqual(getRngLog().slice(0, 4).map(call => call.split('=')[0]), ['rn2(1)', 'rn2(1)', 'rnd(79)', 'rn2(21)']);
});

test('limbo departure releases a leashed holder and preserves carried objects and their nested ownership', () => {
    const { g, mon } = setup({ open: false });
    mon.data = { name: 'owlbear' }; mon.mtame = 7; mon.mleashed = true;
    g.u.ustuck = mon; g.inventory = [{ kind: 'leash', leashmon: mon.m_id }];
    const nested = { kind: 'chest', no_charge: 1, cobj: [{ kind: 'ruby', no_charge: 1 }] };
    nested.ocarry = mon; mon.minvent = [nested];
    const room = { lx: 9, ly: 9, hx: 11, hy: 11, resident: mon }; g.level.rooms = [room];
    mk.mIntoLimbo(mon);
    assert.equal(g.u.ustuck, null); assert.ok(mon.mspec_used >= 1 && mon.mspec_used <= 2);
    assert.equal(mon.mtame, 6); assert.equal(mon.mleashed, false); assert.equal(g.inventory[0].leashmon, 0);
    assert.equal(room.resident, null); assert.equal(nested.ocarry, mon);
    assert.equal(nested.no_charge, 0); assert.equal(nested.cobj[0].no_charge, 0);
    assert.deepEqual(getRngLog().map(call => call.split('=')[0]), ['rnd(2)', 'rn2(100)']);
});

test('approximate arrivals outside rooms use the source clipped wander ranges', () => {
    const { g, mon } = setup(); g.level.monsters = []; g.u.ux = 50; g.u.uy = 15;
    Object.assign(mon, { mx: 0, my: 0, mux: 0, muy: 2, mlstmv: 20,
        mstate: MON_LIMBO | MON_MIGRATING, mtrack: [{ x: MIGR_APPROX_XY, y: 0 }, { x: 3, y: 2 }, { x: 0, y: 2 }] });
    g.migrating_mons = [mon]; mk.arriveMigratingMonsters();
    // dog.c:590 uses rn1(high-low,low), so the clipped upper bound is exclusive.
    assert.deepEqual(getRngLog().map(call => call.split('=')[0]), ['rn2(10)', 'rn2(10)']);
    assert.ok(mon.mx >= 1 && mon.mx < 11 && mon.my >= 0 && mon.my < 10);
});

test('near-position arrival avoids an occupied remembered square while keeping its existing occupant', () => {
    const { g, mon } = setup(); const other = { mx: 10, my: 10, data: { name: 'goblin' } };
    g.level.monsters = [other]; g.u.ux = 5; g.u.uy = 5;
    Object.assign(mon, { mx: 0, my: 0, mux: 0, muy: 2, mlstmv: 99,
        mstate: MON_LIMBO | MON_MIGRATING, mtrack: [{ x: MIGR_APPROX_XY, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 2 }] });
    g.migrating_mons = [mon]; mk.arriveMigratingMonsters();
    assert.deepEqual([other.mx, other.my], [10, 10]);
    assert.equal(Math.max(Math.abs(mon.mx - 10), Math.abs(mon.my - 10)), 1);
    assert.equal(getRngLog().some(call => call.startsWith('rnd(79)')), false);
    assert.deepEqual(getRngLog().slice(0, 7).map(call => call.split('=')[0]), ['rn2(8)', 'rn2(7)', 'rn2(6)', 'rn2(5)', 'rn2(4)', 'rn2(3)', 'rn2(2)']);
});
