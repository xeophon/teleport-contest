import assert from 'node:assert/strict';
import test from 'node:test';

import { processMonsterTurns } from '../js/allmain.js';
import { resetGame } from '../js/gstate.js';
import { MONS } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STONE, COULD_SEE, IN_SIGHT, W_ARMC, W_AMUL } from '../js/const.js';

function install(name = 'goblin', { seed = 1, hp = 500, inventory = [] } = {}) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.flags = {};
    g.context = {};
    g.moves = 2;
    g.inventory = [];
    g.u = { ux: 11, uy: 10, uhp: 100, uhpmax: 100, ulevel: 1, uac: 10,
        uz: { dnum: 0, dlevel: 1 }, acurr: { a: [10, 10, 10, 10, 10, 10] },
        ualign: { type: 0, record: 0 } };
    const species = MONS.find(mon => mon.name === name);
    const target = { mx: 12, my: 10, movement: 0, mcanmove: false, mfrozen: 20,
        msleeping: true, mhp: hp, mhpmax: hp, minvent: inventory,
        m_lev: species.lvl, data: { name, mmove: species.mmove, mac: species.ac } };
    const wand = { cls: 'wand', kind: 'wand of striking', wandIndex: 7, spe: 3 };
    const zapper = { mx: 10, my: 10, mux: 11, muy: 10, movement: 12,
        mcanmove: true, mcansee: true, mhp: 100, mhpmax: 100,
        data: { name: 'goblin', mmove: 12, mac: 10 }, minvent: [wand] };
    const cells = Array.from({ length: 21 }, (_, y) => Array.from({ length: 80 }, (_, x) => ({
        typ: y === 10 && x >= 9 && x <= 16 ? ROOM : STONE,
        roomno: 0, flags: 0, doormask: 0,
    })));
    g.level = { flags: {}, rooms: [], monsters: [target, zapper], objects: [], traps: [],
        engravings: [], at: (x, y) => cells[y]?.[x] };
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    for (let x = 9; x <= 16; x++) g.viz_array[10][x] = COULD_SEE | IN_SIGHT;
    return { g, target, zapper, wand };
}

// muse.c:1597-1652: an inexperienced user misses the hero but may hit
// another monster beyond the hero. A monster hit rolls 2d12 then resist().
test('striking wand damages intervening monsters with AC and MR rolls', async () => {
    let hits = 0, resistedHits = 0;
    for (let seed = 1; seed <= 40; seed++) {
        const { g, target, wand } = install('water nymph', { seed });
        await processMonsterTurns();
        assert.equal(wand.spe, 2);
        assert.equal(g.u.uhp, 100, 'first zap misses hero');
        assert.equal(target.msleeping, 0, 'every wand contact wakes the target');
        const log = getRngLog();
        const hitRolls = log.filter(entry => entry.startsWith('rnd(20)='));
        assert.equal(hitRolls.length, 2, 'hero and monster get separate accuracy rolls');
        const hit = Number(hitRolls[1].split('=')[1]) < 19; // water nymph AC9
        if (hit) {
            hits++;
            const damage = Number(log.find(entry => entry.startsWith('d(2,12)=')).split('=')[1]);
            const roll = Number(log.find(entry => entry.startsWith('rn2(109)=')).split('=')[1]);
            const resisted = roll < 20; // nymph level3, MR20
            resistedHits += Number(resisted);
            assert.equal(target.mhp, 500 - (resisted ? Math.trunc((damage + 1) / 2) : damage));
        } else assert.equal(target.mhp, 500);
    }
    assert.ok(hits > 0 && hits < 40);
    assert.ok(resistedHits > 0 && resistedHits < hits);
});

for (const name of ['gray dragon', 'baby gray dragon', 'Angel']) {
    test(`innate magic resistance blocks striking against ${name}`, async () => {
        const { target } = install(name);
        await processMonsterTurns();
        assert.equal(target.mhp, 500);
        assert.equal(target.msleeping, 0);
        assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(20)=')).length, 1);
        assert.equal(getRngLog().some(entry => entry.startsWith('d(2,12)=')), false);
    });
}

test('worn magic resistance blocks striking while carried cloak does not', async () => {
    for (const worn of [false, true]) {
        const { target } = install('goblin', { inventory: [{ cls: 'armor',
            kind: 'cloak of magic resistance', owornmask: worn ? W_ARMC : 0 }] });
        await processMonsterTurns();
        assert.equal(target.msleeping, 0);
        assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(20)=')).length, worn ? 1 : 2);
    }
});

test('striking contact reveals a mimic even when the accuracy roll misses', async () => {
    const { target } = install('small mimic');
    target.m_ap_type = 2;
    target.appearObj = 'boulder';
    await processMonsterTurns();
    assert.equal(target.m_ap_type, 0);
    assert.equal(target.appearObj, null);
});

test('a lethal monster striking wand uses life saving without hero kill credit', async () => {
    const amulet = { cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, owornmask: W_AMUL };
    const { g, target } = install('goblin', { seed: 2, hp: 1, inventory: [amulet] });
    await processMonsterTurns();
    assert.ok(target.mhp >= 10, JSON.stringify(getRngLog()));
    assert.equal(target.minvent.includes(amulet), false);
    assert.equal(g.level.monsters.includes(target), true);
    assert.equal(target.dead, false);
    assert.equal(g.u.uconduct?.killer || 0, 0);
});

test('a lethal striking wand removes the target and drops inventory without hero credit', async () => {
    const dagger = { kind: 'dagger', cls: 'weapon', quan: 1 };
    const { g, target } = install('goblin', { seed: 2, hp: 1, inventory: [dagger] });
    await processMonsterTurns();
    assert.equal(target.dead, true);
    assert.equal(g.level.monsters.includes(target), false);
    assert.ok(g.level.objects.includes(dagger));
    assert.equal(g.u.uconduct?.killer || 0, 0);
});

test('a surviving invisible striking target is marked even when missed', async () => {
    const { g, target } = install('goblin');
    target.minvis = true;
    await processMonsterTurns();
    assert.equal(target.mhp, 500, 'seed exercises the miss branch');
    assert.equal(g.level.at(12, 10).map_invisible, true);
});
