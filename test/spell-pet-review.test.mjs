import assert from 'node:assert/strict';
import test from 'node:test';

import { processMonsterTurns } from '../js/allmain.js';
import { rhack } from '../js/cmd.js';
import { COULD_SEE, IN_SIGHT, ROOM, STONE } from '../js/const.js';
import { resetGame } from '../js/gstate.js';
import { MONS } from '../js/permonst.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

function installPet(name = 'little dog', { moves = 1752, seed = 41, inventory = [] } = {}) {
    const g = resetGame();
    initRng(seed);
    const pm = MONS.find(mon => mon.name === name);
    const pet = {
        m_id: 71, mx: 11, my: 10, mux: 10, muy: 10,
        mhp: 4, mhpmax: 4, m_lev: pm.lvl,
        movement: 12, mcanmove: true, mcansee: true,
        pet: true, mtame: 10, mpeaceful: true, minvent: inventory,
        mextra: { edog: { apport: 10, hungrytime: 1001, mhpmax_penalty: 8,
            dropdist: 10000, droptime: 0, whistletime: 0 } },
        data: { name, mlet: pm.sym, mlevel: pm.lvl, mmove: pm.mmove, mac: pm.ac, mr: 0 },
    };
    g.moves = moves;
    g.flags = {};
    g.context = { move: 0 };
    g.inventory = [];
    g._pet_food_scan_inventory = g.inventory;
    g.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100,
        ulevel: 10, uexp: 0, uen: 100, uenmax: 100, uhunger: 900, uluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        abase: { a: [10, 10, 10, 10, 10, 10] },
        amax: { a: [18, 18, 18, 18, 18, 18] },
        ualign: { type: 0, record: 0 } };
    const cells = Array.from({ length: 21 }, (_, y) => Array.from({ length: 80 }, (_, x) => ({
        typ: y === 10 && x >= 9 && x <= 12 ? ROOM : STONE,
        roomno: 0, flags: 0, doormask: 0,
    })));
    g.level = { flags: {}, rooms: [], monsters: [pet], objects: [],
        traps: [], engravings: [], at: (x, y) => cells[y]?.[x] };
    vision_reset();
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    for (let x = 9; x <= 12; x++) g.viz_array[10][x] = COULD_SEE | IN_SIGHT;
    return { g, pet, edog: pet.mextra.edog };
}

test('starving pet death releases the attached inventory leash (mon.c:m_detach)', async () => {
    const { g, pet } = installPet();
    const leash = { kind: 'leash', cls: 'tool', leashmon: pet.m_id };
    g.inventory.push(leash);
    pet.mleashed = true;
    await processMonsterTurns();
    assert.ok(!g.level.monsters.includes(pet));
    assert.equal(pet.mleashed, false);
    assert.equal(leash.leashmon, 0, 'a dead pet must not leave the leash attached');
});

test('a life-saved abused pet becomes feral and releases the leash (dog.c:wary_dog)', async () => {
    const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, amuletIndex: 1 };
    const { g, pet, edog } = installPet('little dog', { inventory: [amulet] });
    const leash = { kind: 'leash', cls: 'tool', leashmon: pet.m_id };
    g.inventory.push(leash);
    pet.mleashed = true;
    edog.abuse = 10;
    await processMonsterTurns();
    assert.ok(g.level.monsters.includes(pet));
    assert.equal(pet.mtame, 0);
    assert.equal(pet.pet, false);
    assert.equal(pet.mpeaceful, false);
    assert.equal(pet.mhpmax, 12);
    assert.equal(leash.leashmon, 0);
});

test('mounted pets also become weak at the hunger threshold (dogmove.c:dog_move)', async () => {
    const { g, pet, edog } = installPet('pony', { moves: 1502 });
    pet.mhp = pet.mhpmax = 12;
    edog.mhpmax_penalty = 0;
    pet.mx = g.u.ux;
    pet.my = g.u.uy;
    g.u.usteed = pet;
    await processMonsterTurns();
    assert.equal(pet.mhpmax, 4);
    assert.equal(pet.mhp, 4);
    assert.equal(edog.mhpmax_penalty, 8);
});

test('a starving steed that becomes feral throws its rider (dog.c:wary_dog)', async () => {
    const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, amuletIndex: 1 };
    const { g, pet, edog } = installPet('pony', { inventory: [amulet] });
    pet.mx = g.u.ux;
    pet.my = g.u.uy;
    g.u.usteed = pet;
    g.u.ugallop = 5;
    edog.abuse = 10;
    await processMonsterTurns();
    assert.equal(pet.mtame, 0);
    assert.equal(g.u.usteed, null);
    assert.equal(g.u.ugallop, 0);
    assert.ok(g.u.uhp < 100, 'being thrown inflicts damage');
    assert.notDeepEqual([g.u.ux, g.u.uy], [pet.mx, pet.my]);
});

test('a hero-lethal drain runs wary_dog when an amulet saves a tame target (mon.c:lifesaved_monster)', async () => {
    const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, amuletIndex: 1 };
    const { g, pet, edog } = installPet('little dog', { moves: 1, inventory: [amulet] });
    pet.mhp = 1;
    pet.mhpmax = 200;
    edog.mhpmax_penalty = 0;
    g._casting_spell = { name: 'drain life', level: 2, skill: 'attack' };
    g._command_mode = 'spellDirection';
    await rhack('l');
    assert.ok(g.level.monsters.includes(pet));
    assert.equal(pet.minvent.length, 0);
    assert.equal(edog.killed_by_u, 1);
    assert.equal(pet.mtame, 0, 'a pet killed by the hero loses tameness during life saving');
    assert.equal(pet.pet, false);
});

test('a new hunger penalty is applied before testing the starvation deadline (dogmove.c:dog_hunger)', async () => {
    const { g, pet, edog } = installPet('little dog', { moves: 9000 });
    pet.mhp = pet.mhpmax = 12;
    edog.mhpmax_penalty = 0;
    await processMonsterTurns();
    assert.ok(g.level.monsters.includes(pet), 'first hunger check weakens even after a long absence');
    assert.equal(pet.mhpmax, 4);
    assert.equal(edog.mhpmax_penalty, 8);
});

test('a surviving nearby shrieker responds to drain by waking distant monsters (zap.c:bhitm)', async () => {
    const { g, pet: shrieker } = installPet('shrieker', { moves: 1 });
    shrieker.mhp = shrieker.mhpmax = 200;
    shrieker.pet = false;
    shrieker.mtame = 0;
    shrieker.mpeaceful = false;
    const sleeper = { mx: 40, my: 15, mhp: 20, mhpmax: 20,
        msleeping: 1, mpeaceful: false, data: { name: 'wolf', mlevel: 5 } };
    g.level.monsters.push(sleeper);
    g._casting_spell = { name: 'drain life', level: 2, skill: 'attack' };
    g._command_mode = 'spellDirection';
    await rhack('l');
    assert.ok(shrieker.mhp > 0);
    assert.equal(sleeper.msleeping, 0, 'm_respond(shrieker) calls aggravate globally');
    assert.match(g._pending_message, /shrieks/);
});
