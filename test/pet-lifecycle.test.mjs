import assert from 'node:assert/strict';
import test from 'node:test';

import { processMonsterTurns } from '../js/allmain.js';
import { heroMetalNonFoodNutrition } from '../js/cmd.js';
import { resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { MONS } from '../js/permonst.js';
import { ROOM, STONE, COULD_SEE, IN_SIGHT, W_SADDLE, W_WEP } from '../js/const.js';

test('object nutrition keeps the fake Amulet exception and potion oil value (objects.h:867,1173)', () => {
    assert.equal(heroMetalNonFoodNutrition({ cls: 'amulet', kind: 'Amulet of Yendor',
        actualKind: 'cheap plastic imitation of the Amulet of Yendor', owt: 20 }), 1);
    assert.equal(heroMetalNonFoodNutrition({ cls: 'amulet', kind: 'Amulet of Yendor', owt: 20 }), 20);
    assert.equal(heroMetalNonFoodNutrition({ cls: 'potion', kind: 'potion of oil', owt: 20 }), 10);
    assert.equal(heroMetalNonFoodNutrition({ cls: 'spellbook', kind: 'Book of the Dead', owt: 50 }), 20);
});

function installPet(name = 'little dog', { moves = 1602, seed = 1, inventory = [], food = null } = {}) {
    const g = resetGame();
    initRng(seed);
    const pm = MONS.find(mon => mon.name === name);
    const pet = {
        mx: 11, my: 10, mux: 10, muy: 10, mhp: 12, mhpmax: 12,
        movement: 12, mcanmove: true, mcansee: true,
        pet: true, mtame: 10, mpeaceful: true, minvent: inventory,
        mextra: { edog: { apport: 10, hungrytime: 1001, dropdist: 10000, droptime: 0, whistletime: 0 } },
        data: { name, mlet: pm.sym, mlevel: pm.lvl, mmove: pm.mmove, mac: pm.ac },
    };
    g.moves = moves;
    g.flags = {};
    g.context = { move: 0 };
    g.inventory = [];
    g._pet_food_scan_inventory = g.inventory;
    g.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 20, uhpmax: 20,
        ulevel: 1, acurr: { a: [10, 10, 10, 10, 10, 10] }, ualign: { type: 0, record: 0 } };
    const cells = Array.from({ length: 21 }, (_, y) => Array.from({ length: 80 }, (_, x) => ({
        typ: y === 10 && (x === 10 || x === 11) ? ROOM : STONE,
        roomno: 0, flags: 0, doormask: 0,
    })));
    g.level = { flags: {}, rooms: [], monsters: [pet], objects: food ? [{ ...food, ox: 11, oy: 10 }] : [],
        traps: [], engravings: [], at: (x, y) => cells[y]?.[x] };
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    g.viz_array[10][10] = g.viz_array[10][11] = COULD_SEE | IN_SIGHT;
    return { g, pet, edog: pet.mextra.edog };
}

test('pet becomes weak only after hungrytime + 500 (dogmove.c:362-393)', async () => {
    const { g, pet, edog } = installPet('little dog', { moves: 1501 });
    await processMonsterTurns();
    assert.equal(pet.mhpmax, 12);
    g.moves++;
    pet.movement = 12;
    await processMonsterTurns();
    assert.equal(pet.mhpmax, 4);
    assert.equal(pet.mhp, 4);
    assert.equal(edog.mhpmax_penalty, 8);
    assert.equal(pet.mconf, 1);
});

test('starvation removes a weak pet and drops its inventory (dogmove.c:348-393)', async () => {
    const token = { kind: 'dagger', cls: 'weapon', quan: 1 };
    const { g, pet, edog } = installPet('little dog', { moves: 1752, inventory: [token] });
    pet.mhp = pet.mhpmax = 4;
    edog.mhpmax_penalty = 8;
    await processMonsterTurns();
    assert.ok(!g.level.monsters.includes(pet));
    assert.ok(g.level.objects.includes(token));
    assert.match(g._pending_message, /starves/);
});

test('pets with no carnivore or herbivore diet postpone hunger (dogmove.c:365-368)', async () => {
    const { pet, edog } = installPet('iron golem');
    await processMonsterTurns();
    assert.equal(edog.hungrytime, 2102);
    assert.equal(pet.mhpmax, 12);
    assert.equal(edog.mhpmax_penalty || 0, 0);
});

test('eating a corpse restores a weak pet and uses species nutrition (dogmove.c:156-251)', async () => {
    const { g, pet, edog } = installPet('little dog', { food: {
        otyp: 'corpse', kind: 'newt corpse', cls: 'food', quan: 1, corpsenm: { name: 'newt' },
    } });
    pet.mhp = pet.mhpmax = 4;
    pet.mconf = 1;
    pet.mflee = 1;
    pet.mfleetim = 10;
    edog.mhpmax_penalty = 8;
    await processMonsterTurns();
    assert.equal(edog.hungrytime, 1722, 'newt nutrition 20 times small-pet multiplier 6');
    assert.equal(pet.mhpmax, 12);
    assert.equal(edog.mhpmax_penalty, 0);
    assert.equal(pet.mconf, 0);
    assert.equal(pet.meating, 3, 'newt corpse weighs 10');
    assert.equal(g.level.objects.length, 0);
});

test('partly eaten food scales nutrition and eating time (dogmove.c:194; eat.c:3788)', async () => {
    const { g, pet, edog } = installPet('little dog', { moves: 1002, food: {
        otyp: 7, kind: 'tripe ration', cls: 'food', quan: 2, oeaten: 50,
    } });
    await processMonsterTurns();
    assert.equal(edog.hungrytime, 1302, 'one quarter of 200 times small-pet multiplier 6');
    assert.equal(pet.meating, 1);
    assert.equal(g.level.objects[0].quan, 1, 'only one food item is consumed');
    assert.equal(g.level.objects[0].oeaten, 50);
});

test('pet fetch keeps a leading worn saddle and drops every eligible object (dogmove.c:28; steal.c:894)', async () => {
    const saddle = { kind: 'saddle', cls: 'tool', owornmask: W_SADDLE, worn: true };
    const dagger = { kind: 'dagger', cls: 'weapon', quan: 1 };
    const scroll = { kind: 'identify', cls: 'scroll', quan: 1 };
    let observedDrop = false;
    for (let seed = 1; seed <= 20 && !observedDrop; seed++) {
        const { g, pet } = installPet('pony', { moves: 1002, seed, inventory: [saddle, dagger, scroll] });
        await processMonsterTurns();
        if (!g.level.objects.length) continue;
        observedDrop = true;
        assert.deepEqual(pet.minvent, [saddle]);
        assert.ok(g.level.objects.includes(dagger));
        assert.ok(g.level.objects.includes(scroll));
        assert.equal(pet.mextra.edog.dropdist, 1);
        assert.equal(pet.mextra.edog.droptime, 1002);
    }
    assert.ok(observedDrop, 'the drop branch was exercised');
});

test('a humanoid pet keeps a wielded weapon and useful tools (dogmove.c:28-132)', async () => {
    const sword = { kind: 'long sword', cls: 'weapon', owornmask: W_WEP };
    const horn = { kind: 'unicorn horn', cls: 'tool' };
    const key = { kind: 'skeleton key', cls: 'tool' };
    const { pet } = installPet('human', { moves: 1002, inventory: [sword, horn, key] });
    pet.mw = sword;
    await processMonsterTurns();
    assert.deepEqual(pet.minvent, [sword, horn, key]);
});

test('an already weak pet survives through hungrytime + 750 (dogmove.c:387)', async () => {
    const { g, pet, edog } = installPet('little dog', { moves: 1751 });
    pet.mhp = pet.mhpmax = 4;
    edog.mhpmax_penalty = 8;
    await processMonsterTurns();
    assert.ok(g.level.monsters.includes(pet));
    assert.equal(pet.mhpmax, 4, 'weakness penalty is applied only once');
});

test('a pet with less than three maximum HP dies when weakness starts (dogmove.c:375)', async () => {
    const { g, pet } = installPet('little dog', { moves: 1502 });
    pet.mhp = pet.mhpmax = 2;
    await processMonsterTurns();
    assert.ok(!g.level.monsters.includes(pet));
    assert.equal(pet.mhp, 0);
});

test('life saving consumes one amulet and restores starvation health and hunger (mon.c:2839; dog.c:1292)', async () => {
    const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, amuletIndex: 1 };
    const { g, pet, edog } = installPet('little dog', { moves: 1752, inventory: [amulet] });
    pet.mhp = pet.mhpmax = 4;
    edog.mhpmax_penalty = 8;
    enableRngLog();
    await processMonsterTurns();
    assert.ok(g.level.monsters.includes(pet));
    assert.equal(pet.mhpmax, 12, 'restore penalty before the life-saving minimum');
    assert.equal(pet.mhp, 12);
    assert.ok(!pet.minvent.includes(amulet));
    assert.equal(edog.mhpmax_penalty, 0);
    assert.equal(edog.revivals, 1);
    assert.equal(edog.hungrytime, 2252);
    assert.deepEqual(edog.ogoal, { x: -1, y: -1 });
    assert.equal(getRngLog().filter(line => line.startsWith('rn2(11)')).length, 1, 'one wary_dog tame roll');
    const hp = pet.mhp;
    g._message_more = 0;
    g._pending_message = '';
    pet.movement = 12;
    await processMonsterTurns();
    assert.equal(edog.revivals, 1, 'no second revival when the next turn resumes');
    assert.equal(pet.mhp, hp);
});

for (const [name, multiplier] of [
    ['sewer rat', 8], ['little dog', 6], ['dog', 5], ['winter wolf', 4],
    ['baby red dragon', 3], ['red dragon', 2],
]) {
    test(`${name} receives C's size-dependent pet nutrition multiplier ${multiplier}`, async () => {
        const { pet, edog } = installPet(name, { moves: 1002, food: {
            kind: 'tripe ration', cls: 'food', quan: 1,
        } });
        await processMonsterTurns();
        assert.equal(edog.hungrytime, 1002 + 200 * multiplier);
        assert.equal(pet.meating, 2);
    });
}

test('a dwarf pet retains the best digging tool, horn, and key (dogmove.c:76-124)', async () => {
    const pick = { kind: 'pick-axe', cls: 'tool' };
    const mattock = { kind: 'dwarvish mattock', cls: 'weapon' };
    const horn = { kind: 'unicorn horn', cls: 'tool' };
    const artifactHorn = { kind: 'unicorn horn', cls: 'tool', artifact: true };
    const card = { kind: 'credit card', cls: 'tool' };
    const lockpick = { kind: 'lock pick', cls: 'tool' };
    const key = { kind: 'skeleton key', cls: 'tool' };
    const { g, pet } = installPet('dwarf', { moves: 1002,
        inventory: [pick, mattock, horn, artifactHorn, card, lockpick, key] });
    g.u.blind = true;
    await processMonsterTurns();
    assert.deepEqual(pet.minvent, [mattock, artifactHorn, key]);
    assert.deepEqual(new Set(g.level.objects), new Set([pick, horn, card, lockpick]));
});

test('a preferred ordinary tool cannot displace an artifact (dogmove.c:76-124)', async () => {
    const pick = { kind: 'pick-axe', cls: 'tool', artifact: true };
    const mattock = { kind: 'dwarvish mattock', cls: 'weapon' };
    const card = { kind: 'credit card', cls: 'tool', artifact: true };
    const key = { kind: 'skeleton key', cls: 'tool' };
    const { g, pet } = installPet('dwarf', { moves: 1002, inventory: [pick, mattock, card, key] });
    g.u.blind = true;
    await processMonsterTurns();
    assert.deepEqual(pet.minvent, [pick, card]);
    assert.deepEqual(new Set(g.level.objects), new Set([mattock, key]));
});

test('food delivered by the hero rewards a recent fetch (dogmove.c:314-320)', async () => {
    const { edog } = installPet('little dog', { moves: 1002, food: {
        kind: 'tripe ration', cls: 'food', quan: 1, letter: 'a',
    } });
    edog.dropdist = 2;
    edog.droptime = 1000;
    await processMonsterTurns();
    assert.equal(edog.apport, 60, '10 plus 200 / (distance 2 + elapsed 2)');
});

test('moving to food uses the same nutrition and recovery as eating in place (dogmove.c:1292)', async () => {
    const { g, pet, edog } = installPet('little dog', { moves: 1002, food: {
        otyp: 'corpse', kind: 'newt corpse', cls: 'food', quan: 1, corpsenm: { name: 'newt' },
    } });
    g.level.at(12, 10).typ = ROOM;
    g.level.objects[0].ox = 12;
    await processMonsterTurns();
    assert.equal(pet.mx, 12);
    assert.equal(edog.hungrytime, 1122);
    assert.equal(pet.meating, 3);
    assert.equal(g.level.objects.length, 0);
});

test('a mounted pet eats at the hero square without walking away (dogmove.c:1016,495)', async () => {
    const { g, pet, edog } = installPet('pony', { moves: 1002, food: {
        kind: 'apple', cls: 'food', quan: 2,
    } });
    g.u.usteed = pet;
    pet.mx = g.u.ux;
    g.level.objects[0].ox = g.u.ux;
    await processMonsterTurns();
    assert.equal(pet.mx, g.u.ux);
    assert.equal(pet.my, g.u.uy);
    assert.equal(edog.hungrytime, 1252, 'pony is medium: apple nutrition 50 times 5');
    assert.equal(g.level.objects[0].quan, 1);
    pet.movement = 12;
    await processMonsterTurns();
    assert.equal(pet.meating, 0);
    assert.equal(g.level.objects[0].quan, 1, 'finish the current mouthful before eating again');
    assert.equal(edog.hungrytime, 1252);
});

test('a paused fetch resumes dropping without repeating its decision or reward (dogmove.c:416-429)', async () => {
    const a = { kind: 'dagger', cls: 'weapon', quan: 1 };
    const b = { kind: 'identify', cls: 'scroll', quan: 1 };
    const { g, pet, edog } = installPet('pony', { moves: 1002, inventory: [a, b] });
    g._pending_message = 'A long message already occupies most of the top line before the pet drops its items.';
    enableRngLog();
    await processMonsterTurns();
    assert.equal(g._pet_inventory_resume, pet);
    assert.equal(pet._pet_dropping, true);
    for (let i = 0; i < 3 && pet._pet_dropping; i++) {
        g._message_more = 0;
        g._pending_message = '';
        await processMonsterTurns();
    }
    assert.equal(pet._pet_dropping, false);
    assert.equal(pet.minvent.length, 0);
    assert.equal(edog.apport, 9);
    assert.equal(edog.droptime, 1002);
    assert.equal(getRngLog().filter(line => line.startsWith('rn2(10)')).length, 1);
});

test('merged globs retain their object-type pet nutrition (dogmove.c:174)', async () => {
    const { pet, edog } = installPet('little dog', { food: {
        kind: 'glob of gray ooze', cls: 'food', globby: true, owt: 40, quan: 1,
    } });
    pet.mhp = pet.mhpmax = 4;
    edog.mhpmax_penalty = 8;
    await processMonsterTurns();
    assert.equal(edog.hungrytime, 1722, 'object nutrition 20 times small-pet multiplier 6');
    assert.equal(pet.meating, 2);
});

for (const [kind, cls, nutrition] of [
    ['scroll of identify', 'scroll', 6], ['spellbook of force bolt', 'spellbook', 20],
    ['wooden ring', 'ring', 15], ['wooden wand', 'wand', 30],
]) {
    test(`a starving pet cube receives object nutrition when eating a ${kind} (dogmove.c:211)`, async () => {
        const { g, pet, edog } = installPet('gelatinous cube', { food: { kind, cls, quan: 1 } });
        pet.mhp = pet.mhpmax = 4;
        edog.mhpmax_penalty = 8;
        await processMonsterTurns();
        assert.equal(edog.hungrytime, 1602 + 5 * nutrition);
        assert.equal(g.level.objects.length, 0);
    });
}

test('hunger stops an occupation without cancelling timed armor or prayer actions (allmain.c:stop_occupation)', async () => {
    const { g } = installPet('little dog', { moves: 1502 });
    const armor = { item: { kind: 'plate mail' }, turns: 2 };
    g._armor_wear_occupation = armor;
    g._prayer_occupation = 2;
    g._pick_dig_occupation = { turns: 3 };
    await processMonsterTurns();
    assert.equal(g._pick_dig_occupation, null);
    assert.equal(g._armor_wear_occupation, armor);
    assert.equal(g._prayer_occupation, 2);
});

for (const kind of ['ruby', 'worthless piece of red glass']) {
    test(`a hungry pet cube cannot eat mineral or glass ${kind} (dog.c:dogfood)`, async () => {
        const { g, pet, edog } = installPet('gelatinous cube', { food: { kind, cls: 'gem', quan: 1 } });
        pet.mhp = pet.mhpmax = 4;
        edog.mhpmax_penalty = 8;
        const gem = g.level.objects[0];
        await processMonsterTurns();
        assert.equal(edog.hungrytime, 1001);
        assert.ok(g.level.objects.includes(gem) || pet.minvent.includes(gem));
    });
}
