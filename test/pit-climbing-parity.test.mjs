import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { enableRngLog, getRngLog, initRng, rn2, rn2_on_display_rng } from '../js/rng.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { DOOR, D_CLOSED, PIT, ROOM, STONE, TT_PIT } from '../js/const.js';

function setup(turns = 3, seed = 43) {
    resetGame();
    game.u = { ux: 10, uy: 10, utrap: turns, utraptype: TT_PIT, uhp: 50, uhpmax: 50,
        uz: { dnum: 0, dlevel: 1 }, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap();
    game.inventory = [];
    game.context = {};
    game.flags = { verbose: true, paranoid_confirmation: { trap: false } };
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = ROOM;
    game.level.traps.push({ tx: 10, ty: 10, ttyp: PIT, tseen: true });
    vision_reset();
    vision_recalc(0);
    initRng(seed);
    enableRngLog();
}

// trap.c:climb_pit consumes rn2(2) even without a boulder. Success spends
// the action at the original position; domove_core passes no destination trap.
for (const key of ['h', 'j', 'k', 'l', '<']) {
    test(`${JSON.stringify(key)} attempts pit escape and stays at the origin`, async () => {
        setup();
        await rhack(key);
        assert.equal(game.u.utrap, 2);
        assert.deepEqual([game.u.ux, game.u.uy], [10, 10]);
        assert.equal(game.context.move, 1);
        assert.match(game._pending_message, /You are still in a pit/);
        assert.equal(getRngLog()[0]?.startsWith('rn2(2)'), true);
    });
}

test('successful escape consumes a turn, then the following turn can move', async () => {
    setup(1);
    await rhack('l');
    assert.equal(game.u.utrap, 0);
    assert.equal(game.u.utraptype, null);
    assert.deepEqual([game.u.ux, game.u.uy], [10, 10]);
    assert.match(game._pending_message, /You crawl to the edge of the pit/);
    await rhack('l');
    assert.equal(game.u.ux, 11);
});

for (const terrain of [STONE, DOOR]) {
    test(`pit escape precedes obstruction/opening checks for terrain ${terrain}`, async () => {
        setup();
        Object.assign(game.level.at(11, 10), { typ: terrain, doormask: D_CLOSED });
        await rhack('l');
        assert.equal(game.u.utrap, 2);
        assert.equal(game.level.at(11, 10).doormask, D_CLOSED);
        assert.match(game._pending_message, /still in a pit/);
    });
}

for (const form of ['xorn', 'earth elemental']) {
    test(`${form} ascends without an escape RNG roll`, async () => {
        setup();
        game.u._polyself_form = { name: form };
        await rhack('<');
        assert.equal(game.u.utrap, 0);
        assert.deepEqual(getRngLog(), []);
        assert.match(game._pending_message, /You ascend from the pit/);
    });
}

for (const form of ['pit fiend', 'titan']) {
    test(`${form} escapes easily after the boulder check`, async () => {
        setup(7);
        game.u._polyself_form = { name: form };
        await rhack('<');
        assert.equal(game.u.utrap, 0);
        assert.equal(getRngLog()[0]?.startsWith('rn2(2)'), true);
    });
}

for (const [form, verb] of [['rock piercer', 'crawl'], ['large mimic', 'ooze']]) {
    test(`${form} clings out of the pit using the canonical species row`, async () => {
        setup(7);
        game.u._polyself_form = { name: form };
        await rhack('<');
        assert.equal(game.u.utrap, 0);
        assert.equal(game._pending_message, `You ${verb} from the pit.`);
    });
}

test('flight exits immediately but cannot do so in Sokoban', async () => {
    setup(7);
    game.u.flying = true;
    await rhack('<');
    assert.equal(game.u.utrap, 0);
    assert.match(game._pending_message, /You fly from the pit/);
    setup(7);
    game.u.flying = true;
    game.sokoban_dnum = 0;
    await rhack('<');
    assert.equal(game.u.utrap, 6);
});

for (const roll of [0, 1]) {
    test(`boulder escape check ${roll} preserves C timer and filling effects`, async () => {
        let seed = 1;
        for (; seed < 100; seed++) { initRng(seed); if (rn2(2) === roll) break; }
        setup(1, seed);
        game.level.objects.push({ otyp: 465, ox: 10, oy: 10, quan: 1 });
        await rhack('<');
        assert.equal(game.u.utrap, roll ? 0 : 1);
        assert.equal(game.level.objects.length, roll ? 0 : 1);
        assert.equal(game.level.traps.length, roll ? 0 : 1);
        assert.match(game._pending_message, roll ? /boulder fills a pit/ : /Your leg gets stuck in a crevice/);
    });
}

test('verbose off suppresses walking failure but explicit up still reports it', async () => {
    setup();
    game.flags.verbose = false;
    await rhack('l');
    assert.equal(game.u.utrap, 2);
    assert.equal(game._pending_message || '', '');
    await rhack('<');
    assert.match(game._pending_message, /still in a pit/);
});

test('trying to move out of a pit does not push a neighboring boulder', async () => {
    setup();
    const boulder = { otyp: 465, ox: 11, oy: 10, quan: 1 };
    game.level.objects.push(boulder);
    await rhack('l');
    assert.equal(game.u.utrap, 2);
    assert.equal(boulder.ox, 11);
});

test('a boulder filling an escaped pit removes its reciprocal connections', async () => {
    setup();
    game.u._polyself_form = { name: 'xorn' };
    const origin = game.level.traps[0];
    origin.conjoined = 1 << 4;
    const neighbor = { tx: 11, ty: 10, ttyp: PIT, conjoined: 1 };
    game.level.traps.push(neighbor);
    game.level.objects.push({ otyp: 465, ox: 10, oy: 10, quan: 1 });
    await rhack('<');
    assert.deepEqual(game.level.traps, [neighbor]);
    assert.equal(origin.conjoined, 0);
    assert.equal(neighbor.conjoined, 0);
});

test('a polymorphed leg in a boulder crevice uses the C anatomy table', async () => {
    let seed = 1;
    for (; seed < 100; seed++) { initRng(seed); if (!rn2(2)) break; }
    setup(1, seed);
    game.u._polyself_form = { name: 'newt' };
    game.level.objects.push({ otyp: 465, ox: 10, oy: 10, quan: 1 });
    await rhack('<');
    assert.match(game._pending_message, /Your rear limb gets stuck in a crevice/);
});

test('hallucinated trap names use the display stream before the escape roll', async () => {
    let seed = 1;
    // C trapname: 24 actual trap slots followed by 62 hallucinated names.
    for (; seed < 10000; seed++) { initRng(seed); if (rn2_on_display_rng(87) === 24) break; }
    assert.ok(seed < 10000);
    setup(1, seed);
    game.u._statusSuffix = 'Hallu';
    await rhack('<');
    assert.match(game._pending_message, /edge of the bottomless pit/);
    assert.equal(getRngLog()[0]?.startsWith('rn2(2)'), true);
});

test('a boulder does not disable repeated failure-message suppression', async () => {
    let seed = 1;
    for (; seed < 1000; seed++) { initRng(seed); if (rn2(2) && rn2(2)) break; }
    setup(7, seed);
    game.level.objects.push({ otyp: 465, ox: 10, oy: 10, quan: 1 });
    await rhack('<');
    assert.match(game._pending_message, /still in a pit/);
    await rhack('<');
    assert.equal(game.u.utrap, 5);
    assert.equal(game._pending_message, '');
});
