import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { HATCH_EGG, FIG_TRANSFORM, TIMER_OBJECT, startTimer, peekTimer } from '../js/timeout.js';
import { attachFigurineTransformTimeout, stopFigurineTransformTimeout } from '../js/figurine.js';
import { attachEggHatchTimeout, killDeadSpeciesEggHatchTimers } from '../js/egg_timers.js';
import { processGameTimers } from '../js/allmain.js';
import { monsterByRndName } from '../js/mklev.js';
import { vision_reset, vision_recalc } from '../js/vision.js';

function setup() {
    resetGame(); initRng(1);
    game.moves = 100; game.flags = { female: true }; game.context = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 1 };
    game.inventory = []; game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); vision_recalc();
    enableRngLog({ reset: true });
}

test('fertile eggs attach an object timer with the source hatch deadline', () => {
    setup();
    const egg = { otyp: 10001, corpsenm: monsterByRndName('newt') };
    attachEggHatchTimeout(egg);
    assert.ok(peekTimer(HATCH_EGG, egg) > 250);
    assert.equal(peekTimer(HATCH_EGG, egg), egg.eggHatchTurn);
    assert.equal(egg.timed, 1);
    assert.match(getRngLog()[0], /^rnd\(151\)/);
});

test('figurine rescheduling replaces its timer and cancellation decrements its count', () => {
    setup();
    const fig = { otyp: 795, corpsenm: monsterByRndName('newt') };
    attachFigurineTransformTimeout(fig, 12);
    assert.equal(peekTimer(FIG_TRANSFORM, fig), 112);
    attachFigurineTransformTimeout(fig, 4);
    assert.equal(peekTimer(FIG_TRANSFORM, fig), 104);
    assert.equal(fig.timed, 1);
    stopFigurineTransformTimeout(fig);
    assert.equal(fig.timed, 0);
    assert.equal(game.timers.length, 0);
});

for (const source of ['contained', 'buried', 'migrating']) {
    test(`${source} figurines retry from the shared queue with exactly rnd(5000)`, async () => {
        setup();
        const fig = { otyp: 795, corpsenm: monsterByRndName('newt') };
        if (source === 'contained') game.inventory = [{ contents: [fig] }];
        if (source === 'buried') game.level.buriedobjlist = [fig];
        if (source === 'migrating') game.migrating_objs = [fig];
        fig.figurineTransformTurn = 101;
        startTimer(1, TIMER_OBJECT, FIG_TRANSFORM, fig);
        game.moves++;
        await processGameTimers();
        assert.ok(peekTimer(FIG_TRANSFORM, fig) > 101);
        assert.equal(fig.timed, 1);
        assert.equal(getRngLog().length, 1);
        assert.match(getRngLog()[0], /^rnd\(5000\)/);
    });
}

test('blocked carried eggs still draw fatherhood then hatch count before extinction is checked', async () => {
    setup(); game.flags.female = false;
    const egg = { otyp: 10001, corpsenm: monsterByRndName('newt'), quan: 3, eggHatchTurn: 101 };
    game.inventory = [egg]; game._extinct_monsters = ['newt'];
    startTimer(1, TIMER_OBJECT, HATCH_EGG, egg);
    game.moves++;
    await processGameTimers();
    assert.equal(egg.timed, 0);
    assert.equal(egg.eggHatchTurn, undefined);
    assert.equal(egg.quan, 3);
    assert.equal(getRngLog().length, 2);
    assert.match(getRngLog()[0], /^rn2\(2\)/);
    assert.match(getRngLog()[1], /^rnd\(3\)/);
});

test('genocide cancels timers carried by migrating monsters and stored on other levels', () => {
    setup();
    const eggs = [0, 1].map(() => ({ otyp: 10001, corpsenm: monsterByRndName('newt'), eggHatchTurn: 101 }));
    for (const egg of eggs) startTimer(1, TIMER_OBJECT, HATCH_EGG, egg);
    game._migrating_monsters = [{ minvent: [eggs[0]] }];
    game._saved_levels = new Map([['old', { level: { objects: [eggs[1]] } }]]);
    game._genocided_monsters = ['newt'];
    assert.equal(killDeadSpeciesEggHatchTimers(), 2);
    assert.equal(game.timers.length, 0);
    for (const egg of eggs) assert.equal(egg.timed, 0);
});
