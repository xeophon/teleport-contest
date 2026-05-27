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

    assert.equal(egg.eggHatchTurn, undefined);
    assert.equal(egg._egg_hatch_seq, undefined);
    assert.equal(egg._egg_hatch_consumed, undefined);
    assert.equal(egg.quan, 3);
    assert.deepEqual(g.inventory, [egg]);
    assert.equal(g._egg_hatch_processed || 0, 0);
});
