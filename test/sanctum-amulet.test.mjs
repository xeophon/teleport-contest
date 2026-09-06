import assert from 'node:assert/strict';
import test from 'node:test';
import * as mk from '../js/mklev.js';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { init_dungeons_rng } from '../js/dungeon.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

for (const seed of [1, 17, 42]) test(`Sanctum high priest owns the real unique Amulet through creation and dropping: seed ${seed}`, async () => {
    const g = resetGame(); initRng(seed); init_dungeons_rng();
    const sanctum = g.specialLevels.find(level => level.name === 'sanctum');
    Object.assign(g, { flags: {}, context: {}, moves: 100, inventory: [], in_mklev: true, level: new GameMap(),
        u: { ux: 40, uy: 10, ulevel: 25, uz: { dnum: sanctum.dnum, dlevel: sanctum.dlevel }, uhave: {}, ualign: { type: 0, record: 10 } } });
    await mk.mklev();
    const priest = g.level.monsters.find(mon => mon.ispriest && mon.data?.name === 'high cleric');
    assert.ok(priest);
    const amulet = priest.minvent.find(obj => obj.realAmuletOfYendor);
    assert.ok(amulet, 'C priestini gives AMULET_OF_YENDOR, not a random or life-saving amulet');
    assert.equal(amulet.actualKind, 'Amulet of Yendor');
    assert.equal(amulet.amuletIndex, undefined); assert.equal(amulet.fakeAmuletOfYendor, undefined);
    assert.equal(amulet.owt, 20); assert.equal(amulet.material, 'mithril');
    assert.equal(amulet.unique, true); assert.equal(g.context.made_amulet, true);
    mk.dropMonsterInventory(priest);
    assert.ok(g.level.objects.includes(amulet)); assert.equal(amulet.ox, priest.mx); assert.equal(amulet.oy, priest.my);
});

test('real Amulet constructor uses amulet initialization rolls and only marks creation when initialized', () => {
    const g = resetGame(); initRng(42); enableRngLog();
    g.context = {};
    assert.ok(mk.AMULET_OF_YENDOR);
    const uninitialized = mk.mksobj(mk.AMULET_OF_YENDOR, false, false);
    assert.equal(g.context.made_amulet, undefined); assert.equal(uninitialized.realAmuletOfYendor, true);
    initRng(42); enableRngLog();
    const amulet = mk.mksobj(mk.AMULET_OF_YENDOR, true, false);
    assert.equal(g.context.made_amulet, true);
    const rolls = getRngLog();
    initRng(42); enableRngLog(); mk.mksobj(15, true, false);
    assert.deepEqual(rolls, getRngLog());
    assert.equal(amulet.amuletIndex, undefined); assert.equal(amulet.owt, 20);
});
