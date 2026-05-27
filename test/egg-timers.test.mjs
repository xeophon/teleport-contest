import test from 'node:test';
import assert from 'node:assert/strict';

import { resetGame } from '../js/gstate.js';
import {
    eggHatchMonsterData,
    killDeadSpeciesEggHatchTimers,
} from '../js/egg_timers.js';
import { processEggHatchTimeouts } from '../js/allmain.js';

const EGG = 10001;

function installTimerTestGame() {
    const g = resetGame();
    g.moves = 100;
    g.flags = {};
    g.inventory = [];
    g.level = {
        objects: [],
        buriedobjlist: [],
        monsters: [],
        at: () => ({ typ: 1 }),
    };
    g.u = { ux: 5, uy: 5 };
    return g;
}

function timedEgg(name, extra = {}) {
    return {
        otyp: EGG,
        kind: 'egg',
        quan: 1,
        corpsenm: { name },
        eggHatchTurn: 100,
        _egg_hatch_seq: 7,
        _egg_hatch_consumed: true,
        ...extra,
    };
}

function assertEggHatchTimerCleared(egg) {
    assert.equal(egg.eggHatchTurn, undefined);
    assert.equal(egg._egg_hatch_seq, undefined);
    assert.equal(egg._egg_hatch_consumed, undefined);
}

test('genocide cleanup clears hatchling-species egg timers while preserving egg species', () => {
    const g = installTimerTestGame();
    const redDragonEgg = timedEgg('red dragon');
    const newtEgg = timedEgg('newt');
    g.inventory = [redDragonEgg, newtEgg];
    g._genocided_monsters = ['baby red dragon'];

    assert.equal(killDeadSpeciesEggHatchTimers(g), 1);
    assert.equal(redDragonEgg.corpsenm.name, 'red dragon');
    assert.equal(redDragonEgg.eggHatchTurn, undefined);
    assert.equal(redDragonEgg._egg_hatch_seq, undefined);
    assert.equal(redDragonEgg._egg_hatch_consumed, undefined);
    assert.equal(newtEgg.eggHatchTurn, 100);
});

test('genocide cleanup scans containers, buried objects, monster inventory, and migration queues', () => {
    const g = installTimerTestGame();
    const contained = timedEgg('newt');
    const buried = timedEgg('newt');
    const held = timedEgg('newt');
    const migrating = timedEgg('newt');
    g.inventory = [{ kind: 'box', contents: [contained] }];
    g.level.buriedobjlist = [buried];
    g.level.monsters = [{ minvent: [held] }];
    g._impact_drop_migrations = new Map([['0:2', [migrating]]]);
    g._genocided_monsters = ['newt'];

    assert.equal(killDeadSpeciesEggHatchTimers(g), 4);
    for (const egg of [contained, buried, held, migrating])
        assert.equal(egg.eggHatchTurn, undefined);
});

test('extinction does not proactively clear egg timers but blocks due hatching', async () => {
    const g = installTimerTestGame();
    const egg = timedEgg('red dragon', { quan: 3 });
    g.inventory = [egg];
    g._extinct_monsters = ['baby red dragon'];

    assert.equal(killDeadSpeciesEggHatchTimers(g), 0);
    assert.equal(egg.eggHatchTurn, 100);
    assert.equal(eggHatchMonsterData(egg, g), null);

    await processEggHatchTimeouts(g);

    assertEggHatchTimerCleared(egg);
    assert.equal(egg.quan, 3);
    assert.deepEqual(g.inventory, [egg]);
    assert.equal(g._egg_hatch_processed || 0, 0);
});

test('contained due egg consumes hatch timer without hatching or leaving container', async () => {
    const g = installTimerTestGame();
    const egg = timedEgg('newt', { quan: 2 });
    const box = { kind: 'box', contents: [egg] };
    g.inventory = [box];

    await processEggHatchTimeouts(g);

    assertEggHatchTimerCleared(egg);
    assert.equal(egg.quan, 2);
    assert.deepEqual(box.contents, [egg]);
    assert.equal(g.level.monsters.length, 0);
    assert.equal(g._egg_hatch_processed || 0, 0);
});

test('contained due egg scan recurses through active carried floor and monster containers', async () => {
    const g = installTimerTestGame();
    const carriedEgg = timedEgg('newt', { quan: 2 });
    const floorEgg = timedEgg('newt');
    const heldEgg = timedEgg('newt');
    const futureEgg = timedEgg('newt', { eggHatchTurn: 125, _egg_hatch_seq: 8 });
    const siblingFood = { kind: 'food ration' };
    const carriedInner = { kind: 'sack', contents: [carriedEgg, futureEgg] };
    const carriedOuter = { kind: 'box', contents: [carriedInner, siblingFood] };
    const floorBox = { kind: 'box', ox: 3, oy: 4, cobj: [floorEgg] };
    const monsterBox = { kind: 'box', contents: [heldEgg] };
    const carrier = { mx: 8, my: 5, minvent: [monsterBox] };
    g.inventory = [carriedOuter];
    g.level.objects = [floorBox];
    g.level.monsters = [carrier];

    await processEggHatchTimeouts(g);

    for (const egg of [carriedEgg, floorEgg, heldEgg]) {
        assertEggHatchTimerCleared(egg);
        assert.equal(egg.quan, egg === carriedEgg ? 2 : 1);
    }
    assert.equal(futureEgg.eggHatchTurn, 125);
    assert.equal(futureEgg._egg_hatch_seq, 8);
    assert.deepEqual(carriedOuter.contents, [carriedInner, siblingFood]);
    assert.deepEqual(carriedInner.contents, [carriedEgg, futureEgg]);
    assert.deepEqual(floorBox.cobj, [floorEgg]);
    assert.deepEqual(monsterBox.contents, [heldEgg]);
    assert.deepEqual(carrier.minvent, [monsterBox]);
    assert.equal(g.level.monsters.length, 1);
    assert.equal(g._egg_hatch_processed || 0, 0);
});

test('buried due egg consumes hatch timer without hatching or unburying', async () => {
    const g = installTimerTestGame();
    const buriedEgg = timedEgg('newt', { quan: 2, buried: true, ox: 4, oy: 7 });
    const buriedBoxEgg = timedEgg('newt');
    const futureBuriedEgg = timedEgg('newt', { eggHatchTurn: 125, _egg_hatch_seq: 8, buried: true });
    const buriedBox = { kind: 'box', buried: true, ox: 4, oy: 7, contents: [buriedBoxEgg, futureBuriedEgg] };
    g.level.buriedobjlist = [buriedEgg, buriedBox];

    await processEggHatchTimeouts(g);

    assertEggHatchTimerCleared(buriedEgg);
    assertEggHatchTimerCleared(buriedBoxEgg);
    assert.equal(futureBuriedEgg.eggHatchTurn, 125);
    assert.equal(futureBuriedEgg._egg_hatch_seq, 8);
    assert.equal(buriedEgg.quan, 2);
    assert.deepEqual(g.level.buriedobjlist, [buriedEgg, buriedBox]);
    assert.deepEqual(buriedBox.contents, [buriedBoxEgg, futureBuriedEgg]);
    assert.equal(g.level.objects.length, 0);
    assert.equal(g.level.monsters.length, 0);
    assert.equal(g._egg_hatch_processed || 0, 0);
});

test('migrating due egg consumes hatch timer without hatching or dequeuing', async () => {
    const g = installTimerTestGame();
    const impactEgg = timedEgg('newt', { quan: 3 });
    const directMigratingEgg = timedEgg('newt');
    const queuedBoxEgg = timedEgg('newt');
    const queuedFutureEgg = timedEgg('newt', { eggHatchTurn: 125, _egg_hatch_seq: 8 });
    const queuedBox = { kind: 'sack', contents: [queuedBoxEgg, queuedFutureEgg] };
    const carriedByMigratingMonster = timedEgg('newt');
    const migratingMonster = { mx: 0, my: 0, minvent: [carriedByMigratingMonster] };
    g._impact_drop_migrations = new Map([['0:2', [impactEgg, queuedBox]]]);
    g.migrating_objs = [directMigratingEgg];
    g.migrating_mons = [migratingMonster];

    await processEggHatchTimeouts(g);

    for (const egg of [impactEgg, directMigratingEgg, queuedBoxEgg, carriedByMigratingMonster])
        assertEggHatchTimerCleared(egg);
    assert.equal(queuedFutureEgg.eggHatchTurn, 125);
    assert.equal(queuedFutureEgg._egg_hatch_seq, 8);
    assert.equal(impactEgg.quan, 3);
    assert.deepEqual(g._impact_drop_migrations.get('0:2'), [impactEgg, queuedBox]);
    assert.deepEqual(g.migrating_objs, [directMigratingEgg]);
    assert.deepEqual(migratingMonster.minvent, [carriedByMigratingMonster]);
    assert.equal(g.level.monsters.length, 0);
    assert.equal(g._egg_hatch_processed || 0, 0);
});
