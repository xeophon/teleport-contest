import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, W_ARM } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset, vision_recalc, cansee } from '../js/vision.js';
import { beginBurn, endBurn, processBurnTimers } from '../js/burn.js';
import { BURN_OBJECT, peekTimer, splitObjectTimers } from '../js/timeout.js';
import { objectLocations } from '../js/obj_location.js';
import { rhack, processObjectBurnTimers } from '../js/cmd.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(kind = 'oil lamp', age = 151, state = {}) {
    resetGame();
    initRng(1);
    game.moves = 100;
    game.context = { seer_turn: 1000 };
    game.flags = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 30, uhpmax: 30, uhunger: 900, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const obj = { kind, cls: 'tool', letter: 'a', age, quan: 1, ...state };
    game.inventory = [obj];
    vision_reset();
    vision_recalc();
    return obj;
}

for (const kind of ['oil lamp', 'brass lantern']) {
    for (const [age, reserve] of [[1, 0], [25, 0], [26, 25], [50, 25], [51, 50],
        [100, 50], [101, 100], [150, 100], [151, 150], [1500, 150]]) {
        test(`${kind} age ${age} uses C fuel threshold ${reserve}`, () => {
            const obj = setup(kind, age);
            enableRngLog({ reset: true });
            beginBurn(obj);
            assert.equal(obj.age, reserve);
            assert.equal(peekTimer(BURN_OBJECT, obj), 100 + age - reserve);
            assert.equal(obj.timed, 1);
            assert.deepEqual(getRngLog(), []);
        });
    }
}

for (const kind of ['tallow candle', 'wax candle', 'candelabrum of invocation']) {
    for (const [age, reserve] of [[1, 0], [15, 0], [16, 15], [75, 15], [76, 75], [200, 75]]) {
        test(`${kind} age ${age} uses C candle threshold ${reserve}`, () => {
            const obj = setup(kind, age, { spe: 7 });
            beginBurn(obj);
            assert.equal(obj.age, reserve);
            assert.equal(peekTimer(BURN_OBJECT, obj), 100 + age - reserve);
        });
    }
}

test('applying and snuffing a lamp returns only the unused scheduled fuel', async () => {
    const obj = setup('oil lamp', 160);
    game._command_mode = 'applyObject';
    await rhack('a');
    assert.equal(peekTimer(BURN_OBJECT, obj), 110);
    assert.equal(obj.age, 150);
    game.moves = 104;
    game._command_mode = 'applyObject';
    await rhack('a');
    assert.equal(obj.age, 156);
    assert.equal(obj.lamplit, false);
    assert.equal(obj.timed, 0);
    game._command_mode = 'applyObject';
    await rhack('a');
    assert.equal(peekTimer(BURN_OBJECT, obj), 110);
});

test('oil lamps progress through all source warning thresholds and go dark at zero', async () => {
    const obj = setup('oil lamp', 151);
    beginBurn(obj);
    const expected = [[101, 'Your oil lamp flickers.'], [151, 'Your oil lamp flickers.'],
        [201, 'Your oil lamp flickers considerably.'], [226, 'Your oil lamp seems about to go out.'],
        [251, 'Your oil lamp has gone out.']];
    for (const [turn, message] of expected) {
        game.moves = turn;
        assert.deepEqual(await processBurnTimers(), [message]);
    }
    assert.equal(obj.lamplit, false);
    assert.equal(obj.timed, 0);
    assert.equal(obj.age, 0);
    assert.equal(game.inventory[0], obj);
});

for (const age of [1, 2, 3, 4, 5, 6, 7]) {
    test(`diluted burning oil age ${age} follows rounded C duration and retains reserved fuel`, async () => {
        const obj = setup('potion of oil', age, { otyp: 252, odiluted: true });
        const turns = Math.trunc((3 * age + 2) / 4);
        beginBurn(obj);
        assert.equal(peekTimer(BURN_OBJECT, obj), 100 + turns);
        assert.equal(obj.age, age - turns);
        game.moves = 100 + turns;
        await processBurnTimers();
        assert.equal(game.inventory.length, 0);
        assert.equal(obj.lamplit, false);
    });
}

test('an early snuff returns diluted oil residual fuel as in cleanup_burn', () => {
    const obj = setup('potion of oil', 10, { odiluted: true });
    beginBurn(obj);
    game.moves = 102;
    endBurn(obj);
    assert.equal(obj.age, 8);
    assert.equal(obj.timed, 0);
});

test('magic lamps and worn gold armor light indefinitely without fuel timers', async () => {
    for (const fields of [{ kind: 'magic lamp', spe: 1 }, { artifact: 'Sunsword', kind: 'long sword' },
        { otyp: 10140, owornmask: W_ARM }, { otyp: 10149, owornmask: W_ARM }]) {
        const obj = setup(fields.kind, 0, fields);
        assert.equal(beginBurn(obj), true);
        assert.equal(peekTimer(BURN_OBJECT, obj), 0);
        assert.equal(obj.timed || 0, 0);
        game.moves += 10000;
        await processBurnTimers();
        assert.equal(obj.lamplit, true);
        endBurn(obj);
        assert.equal(obj.lamplit, false);
    }
});

test('an empty ordinary lamp does not create a light or timer', () => {
    const obj = setup('oil lamp', 0);
    assert.equal(beginBurn(obj), false);
    assert.equal(obj.lamplit, undefined);
    assert.equal(peekTimer(BURN_OBJECT, obj), 0);
});

test('numeric Sunsword identity supplies its C light radius without fuel', () => {
    const obj = setup('long sword', 0, { oartifact: 20 });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        game.level.at(x, y).lit = false;
    assert.equal(beginBurn(obj), true);
    vision_recalc();
    assert.equal(cansee(12, 10), true);
    assert.equal(cansee(13, 10), false);
    assert.equal(peekTimer(BURN_OBJECT, obj), 0);
});

test('burnt oil removal updates every migrating parent container weight', async () => {
    const obj = setup('potion of oil', 1, { otyp: 252, owt: 20 });
    const inner = { kind: 'sack', otyp: 212, quan: 1, owt: 35, contents: [obj] };
    const outer = { kind: 'sack', otyp: 212, quan: 1, owt: 50, contents: [inner] };
    game.inventory = [];
    game.migrating_objs = [outer];
    beginBurn(obj);
    game.moves++;
    assert.deepEqual(await processObjectBurnTimers(), []);
    assert.deepEqual(inner.contents, []);
    assert.equal(inner.owt, 15);
    assert.equal(outer.owt, 30);
});

test('blind heroes feel carried lamp and candle extinction but not a lantern', async () => {
    for (const [kind, text] of [['oil lamp', 'Your oil lamp has gone out.'],
        ['wax candle', 'Your wax candle is consumed!'], ['brass lantern', '']]) {
        const obj = setup(kind, 1);
        beginBurn(obj);
        game.u.blind = true;
        game.moves++;
        assert.equal((await processBurnTimers()).join('  '), text);
    }
});

test('hallucinated lantern warnings and candle extinction preserve C messages', async () => {
    let obj = setup('brass lantern', 151);
    game.u.hallucinating = true;
    beginBurn(obj);
    game.moves++;
    assert.deepEqual(await processBurnTimers(), ['Your lantern is getting dim.', 'Batteries have not been invented yet.']);
    obj = setup('wax candle', 1, { quan: 3 });
    game.u.hallucinating = true;
    beginBurn(obj);
    game.moves++;
    assert.deepEqual(await processBurnTimers(), ['Your wax candles are consumed!', 'They shriek!']);
});

test('spent invocation candles leave an unlit empty candelabrum of base weight', async () => {
    const obj = setup('candelabrum of invocation', 1, { spe: 7, owt: 214 });
    beginBurn(obj);
    game.moves++;
    assert.deepEqual(await processBurnTimers(), ["Your candelabrum's flames die."]);
    assert.equal(game.inventory[0], obj);
    assert.equal(obj.spe, 0);
    assert.equal(obj.owt, 200);
});

test('a saved-level burn waits for arrival, then silently consumes elapsed fuel', async () => {
    const obj = setup('oil lamp', 160);
    obj.ox = 10; obj.oy = 10;
    game.inventory = [];
    game.level.objects = [obj];
    beginBurn(obj);
    const saved = game.level;
    game._saved_levels = new Map([['old', { level: saved }]]);
    game.level = new GameMap();
    game.moves = 150;
    assert.deepEqual(await processBurnTimers(), []);
    assert.equal(obj.age, 150);
    assert.equal(peekTimer(BURN_OBJECT, obj), 110);
    game.level = saved;
    assert.deepEqual(await processBurnTimers(), []);
    assert.equal(obj.age, 100);
    assert.equal(peekTimer(BURN_OBJECT, obj), 160);
});

test('returning after candle fuel is exhausted silently removes the whole stack', async () => {
    const obj = setup('tallow candle', 100, { quan: 4 });
    game.inventory = [];
    obj.ox = 10; obj.oy = 10;
    game.level.objects = [obj];
    beginBurn(obj);
    game.moves = 250;
    assert.deepEqual(await processBurnTimers(), []);
    assert.equal(game.level.objects.length, 0);
    assert.equal(obj.timed, 0);
});

test('nested and migrating light timers expire without visible feedback', async () => {
    const obj = setup('wax candle', 1);
    game.inventory = [{ contents: [obj] }];
    beginBurn(obj);
    game.moves++;
    assert.deepEqual(await processBurnTimers(), []);
    assert.equal(game.inventory[0].contents.length, 0);
    const oil = { kind: 'potion of oil', age: 2 };
    game.migrating_objs = [oil];
    beginBurn(oil);
    game.moves += 2;
    assert.deepEqual(await processBurnTimers(), []);
    assert.equal(game.migrating_objs.length, 0);
});

test('split lit candles retain independent burn callbacks at the same deadline', async () => {
    const obj = setup('tallow candle', 1, { quan: 3 });
    beginBurn(obj);
    const split = { ...obj, quan: 1, timed: 0 };
    obj.quan--;
    game.inventory.push(split);
    splitObjectTimers(obj, split);
    game.moves++;
    await processBurnTimers();
    assert.equal(game.inventory.length, 0);
    assert.equal(obj.timed, 0);
    assert.equal(split.timed, 0);
});

test('burned-out oil in a migrating monster inventory is removed with its timer', async () => {
    const obj = setup('potion of oil', 1);
    const carrier = { minvent: [obj] };
    game.inventory = [];
    game._migrating_mons = [carrier];
    beginBurn(obj);
    game.moves++;
    assert.deepEqual(await processObjectBurnTimers(), []);
    assert.equal(carrier.minvent.length, 0);
    assert.equal(obj.timed, 0);
});

test('burn expiry remains connected to inventory identities after a save round trip', async () => {
    const obj = setup('potion of oil', 1);
    beginBurn(obj);
    restoreSaveState(encodeSaveState());
    game.moves++;
    await processObjectBurnTimers();
    assert.equal(game.inventory.length, 0);
    assert.equal(game.timers.length, 0);
});

test('live monster-turn advancement consumes lit fuel without an explicit timer call', async () => {
    const obj = setup('oil lamp', 1);
    game._command_mode = 'applyObject';
    await rhack('a');
    game._pending_time_passed = 1;
    game._pending_message = '';
    game._command_mode = null;
    resetInputState();
    pushKey('\x1b');
    await moveloop_core();
    assert.equal(obj.lamplit, false);
    assert.equal(obj.age, 0);
});

test('ownership discovery preserves cycles and includes buried and saved monster inventories', () => {
    const obj = setup();
    const box = { contents: [obj] };
    obj.contents = [box];
    game.inventory = [box];
    const buried = { ox: 20, oy: 5 };
    game.level.buriedobjlist = [buried];
    const other = {};
    game._saved_levels = new Map([['old', { level: { monsters: [{ mx: 30, my: 6, minvent: [other] }] } }]]);
    const locations = objectLocations(game, true);
    assert.equal(locations.size, 4);
    assert.equal(locations.get(obj).parent, box);
    assert.equal(locations.get(obj).x, 10);
    assert.equal(locations.get(buried).buried, true);
    assert.equal(locations.get(other).saved, true);
});
