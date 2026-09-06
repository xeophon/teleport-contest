import assert from 'node:assert/strict';
import test from 'node:test';
import { processMonsterTurns } from '../js/allmain.js';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, COULD_SEE, IN_SIGHT, W_SADDLE, W_WEP } from '../js/const.js';

function setup({ inventory = [], here = false, weight = 10, name = 'pony' } = {}) {
    const g = resetGame(); initRng(42); enableRngLog();
    Object.assign(g, { moves: 50, flags: {}, context: { move: 0 }, inventory: [], level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 1, uhp: 20, uhpmax: 20,
            acurr: { a: [10, 10, 10, 10, 10, 10] }, ualign: { type: 0, record: 0 } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const pet = { m_id: 19, mx: 12, my: 10, mux: 10, muy: 10, mhp: 15, mhpmax: 15, m_lev: 3,
        movement: 12, mcanmove: true, mcansee: true, pet: true, mtame: 10, mpeaceful: true, minvent: inventory,
        data: { name, mlet: name === 'pony' ? 'unicorn' : '@', mmove: 12 },
        mextra: { edog: { apport: 10, hungrytime: 1001, dropdist: 10000, droptime: 0, whistletime: 0 } } };
    g.level.monsters.push(pet);
    const obj = { otyp: 10025, kind: 'pick-axe', cls: 'weapon', glyph: ')', quan: 1, owt: weight, ox: here ? 12 : 14, oy: 10 };
    g.level.objects.push(obj);
    return { g, pet, obj };
}

for (const [label, inventory, name] of [
    ['worn saddle', [{ kind: 'saddle', cls: 'tool', owt: 200, quan: 1, owornmask: W_SADDLE }], 'pony'],
    ['wielded sword', [{ kind: 'long sword', cls: 'weapon', owt: 40, quan: 1, owornmask: W_WEP }], 'human'],
    ['useful unicorn horn', [{ kind: 'unicorn horn', cls: 'tool', owt: 20, quan: 1 }], 'human'],
]) {
    test(`dog_goal considers fetching while retaining a ${label} (dogmove.c:502,550-555)`, async () => {
        const { pet } = setup({ inventory, name });
        if (label === 'wielded sword') pet.mw = inventory[0];
        await processMonsterTurns();
        assert.ok(getRngLog().some(call => call.startsWith('rn2(8)=')), 'fetch apport roll must use droppables, not any inventory');
        assert.ok(pet.minvent.includes(inventory[0]));
    });
}

test('a pony uses canonical strong carrying capacity when its saddle is its only load (mon.c:1927-1955)', async () => {
    const saddle = { kind: 'saddle', cls: 'tool', owt: 200, quan: 1, owornmask: W_SADDLE };
    setup({ inventory: [saddle], here: true, weight: 600 });
    await processMonsterTurns();
    assert.match(getRngLog()[2], /^rn2\(20\)=/, '800 total is below the strong pony limit of 1000');
});

test('the saddle still contributes to load when a pony cannot carry the floor object (mon.c:1913-1923)', async () => {
    const saddle = { kind: 'saddle', cls: 'tool', owt: 200, quan: 1, owornmask: W_SADDLE };
    const { g, pet, obj } = setup({ inventory: [saddle], here: true, weight: 850 });
    await processMonsterTurns();
    assert.match(getRngLog()[2], /^rn2\(100\)=/, 'dog_invent must skip the pickup roll for 1050 total weight');
    assert.ok(g.level.objects.includes(obj)); assert.ok(!pet.minvent.includes(obj));
});
