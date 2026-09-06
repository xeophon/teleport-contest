import assert from 'node:assert/strict';
import test from 'node:test';
import { __allmainTestHooks, newgame } from '../js/allmain.js';
import { dropMonsterInventory } from '../js/mklev.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { objectLocations } from '../js/obj_location.js';
import { ROOM, W_SADDLE } from '../js/const.js';
import { MONS, PM_PONY, PM_KITTEN, PM_LITTLE_DOG } from '../js/permonst.js';

function setup(role = 'Knight', pauper = false) {
    const g = resetGame(); initRng(42); enableRngLog();
    Object.assign(g, { moves: 1, flags: { bones: false, legacy: false }, context: {}, inventory: [],
        _startup_role: role, _startup_race: 'human', _startup_align: role === 'Knight' ? 'lawful' : 'neutral',
        _next_ident: 900, u: { ux: 40, uy: 10, uroleplay: { pauper }, ualign: { type: 1, record: 10 } }, level: new GameMap() });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    return g;
}

test('starting Knight pony owns one identified worn saddle tied to its monster id', () => {
    const g = setup(); __allmainTestHooks.initializePet();
    const pony = g.level.monsters.find(mon => mon.data.name === 'pony'); const saddle = pony.minvent?.[0];
    assert.ok(saddle); assert.equal(saddle.kind, 'saddle'); assert.equal(pony.m_id, 900);
    assert.equal(saddle.ocarry, pony); assert.equal(saddle.leashmon, pony.m_id);
    assert.equal(saddle.owornmask, W_SADDLE); assert.equal(pony.misc_worn_check & W_SADDLE, W_SADDLE);
    assert.equal(saddle.owt, 200); assert.equal(saddle.quan, 1);
    for (const field of ['known', 'dknown', 'bknown', 'rknown']) assert.equal(saddle[field], true);
    assert.equal(objectLocations(g).get(saddle).owner, pony); assert.equal(g.level.objects.includes(saddle), false);
    assert.equal(g.context.startingpet_mid, pony.m_id); assert.equal(g.context.startingpet_typ, PM_PONY);
    assert.deepEqual(getRngLog().slice(-4).map(call => call.split('=')[0]), ['rnd(2)', 'd(2,8)', 'rn2(2)', 'rnd(2)']);
    assert.equal(getRngLog().some(call => call.startsWith('rn2(100)')), false);
});

test('pauper Knight starts with a pony but without a saddle or its object-id draw', () => {
    const normal = setup(); __allmainTestHooks.initializePet(); const normalLog = [...getRngLog()];
    const g = setup('Knight', true); __allmainTestHooks.initializePet(); const pony = g.level.monsters[0];
    assert.equal(pony.data.name, 'pony'); assert.equal(pony.saddled, false);
    assert.equal((pony.minvent || []).length, 0); assert.equal(pony.misc_worn_check || 0, 0);
    assert.deepEqual(getRngLog(), normalLog.slice(0, -1)); assert.equal(g.context.startingpet_mid, pony.m_id);
});

for (const [role, species, pm] of [['Wizard', 'kitten', PM_KITTEN], ['Ranger', 'little dog', PM_LITTLE_DOG]]) {
    test(`${role} starting pet retains its own id and gets no saddle`, () => {
        const g = setup(role); __allmainTestHooks.initializePet(); const pet = g.level.monsters[0];
        assert.equal(pet.data.name, species); assert.equal(pet.m_id, 900);
        assert.equal((pet.minvent || []).length, 0); assert.equal(pet.saddled, false);
        assert.equal(g.context.startingpet_mid, pet.m_id); assert.equal(g.context.startingpet_typ, pm);
        assert.equal(getRngLog().filter(call => call.startsWith('rnd(2)')).length, 1);
    });
}

test('no-pet startup sets the source NON_PM sentinel and consumes no pet RNG', () => {
    const g = setup(); g.preferred_pet = 'n'; __allmainTestHooks.initializePet();
    assert.equal(g.context.startingpet_typ, -1); assert.equal(g.level.monsters.length, 0); assert.deepEqual(getRngLog(), []);
});

test('starting saddle identity survives saves and its floor drop comes from the pony inventory', () => {
    const g = setup(); __allmainTestHooks.initializePet();
    restoreSaveState(encodeSaveState());
    const pony = g.level.monsters[0], saddle = pony.minvent?.[0]; assert.ok(saddle);
    assert.equal(saddle.ocarry, pony); assert.equal(saddle.leashmon, pony.m_id);
    dropMonsterInventory(pony);
    assert.equal(g.level.objects.includes(saddle), true); assert.equal((pony.minvent || []).includes(saddle), false);
    assert.deepEqual([saddle.ox, saddle.oy], [pony.mx, pony.my]);
});

test('actual newgame Knight startup constructs the carried saddle without an extra inventory source', async () => {
    const g = setup(); g.level = null;
    await newgame();
    const pony = g.level.monsters.find(mon => mon.pet && mon.data.name === 'pony'); const saddle = pony?.minvent?.find(obj => obj.kind === 'saddle');
    assert.ok(saddle); assert.equal(saddle.ocarry, pony); assert.equal(saddle.leashmon, pony.m_id);
    assert.equal(saddle.owornmask, W_SADDLE); assert.equal(g.context.startingpet_mid, pony.m_id);
    assert.equal(g.inventory.includes(saddle), false); assert.equal(g.level.objects.includes(saddle), false);
});
