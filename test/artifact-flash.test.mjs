import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, DOOR, D_CLOSED, W_WEP } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { vision_reset, vision_recalc } from '../js/vision.js';

function setup(camera = false) {
    resetGame(); initRng(27);
    game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Knight';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 100, uhpmax: 100, uen: 50, uenmax: 50, acurr: { a: [12,12,12,12,12,12] },
        ualign: { type: 1, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const item = camera ? { kind: 'expensive camera', otyp: 10082, cls: 'tool', spe: 5 }
        : { artifact: 'Sunsword', kind: 'long sword', cls: 'weapon', age: 0 };
    Object.assign(item, { letter: 'a', quan: 1 });
    game.inventory = [item];
    vision_reset(); vision_recalc();
    return item;
}

function monster(name, x = 11, extra = {}) {
    const data = MONS.find(mon => mon.name === name);
    assert.ok(data, name);
    const mon = { data, mx: x, my: 10, mcansee: true, mblinded: 0,
        mhp: 30, mhpmax: 30, m_lev: data.lvl, m_id: x, ...extra };
    game.level.monsters.push(mon);
    return mon;
}

async function flash(direction = 'l', camera = false) {
    game._command_mode = camera ? 'applyObject' : 'invokeObject';
    await rhack('a');
    assert.equal(game._command_mode, camera ? 'cameraDirection' : 'invokeFlashDirection');
    game.context.move = 0;
    enableRngLog({ reset: true });
    await rhack(direction);
}

test('Sunsword requests a direction and permanently blinds a nearby awake monster', async () => {
    setup(); const mon = monster('goblin');
    await flash();
    assert.equal(!!mon.mcansee, false);
    assert.equal(mon.mblinded, 0);
    assert.equal(game.context.move, 1);
});

for (const camera of [false, true]) {
    test(`${camera ? 'camera' : 'Sunsword'} wakes a sleeping monster without also blinding it`, async () => {
        setup(camera); const mon = monster('goblin', 11, { msleeping: 1 });
        await flash('l', camera);
        assert.equal(mon.msleeping, 0);
        assert.equal(mon.mcansee, true);
        assert.equal(mon.mblinded, 0);
        assert.deepEqual(getRngLog(), []);
    });
}

for (const [name, extra] of [
    ['brown mold', {}], ['Archon', {}], ['yellow light', {}],
    ['goblin', { mblinded: 7 }],
    ['goblin', { minvent: [{ artifact: 'Sunsword', owornmask: W_WEP }] }],
]) {
    test(`flash resistance preserves ${name} ${JSON.stringify(extra)}`, async () => {
        setup(); const mon = monster(name, 11, extra);
        await flash();
        assert.equal(mon.mcansee, true);
        assert.equal(mon.mblinded, extra.mblinded || 0);
        assert.deepEqual(getRngLog(), []);
    });
}

test('a distant flash uses the squared-distance blindness duration bound', async () => {
    setup(); const mon = monster('goblin', 14);
    await flash();
    assert.equal(!!mon.mcansee, false);
    assert.ok(mon.mblinded >= 1 && mon.mblinded <= 4);
    assert.equal(getRngLog().length, 1);
});

test('flash passes through invisible monsters and stops at a visible one', async () => {
    setup(); const invisible = monster('goblin', 11, { minvis: true });
    const next = monster('orc', 12); const behind = monster('goblin', 13);
    await flash();
    assert.equal(!!invisible.mcansee, false);
    assert.equal(!!next.mcansee, false);
    assert.equal(behind.mcansee, true);
});

test('closed doors stop a flash before the monster behind them', async () => {
    setup(); const mon = monster('goblin', 12);
    Object.assign(game.level.at(11, 10), { typ: DOOR, doormask: D_CLOSED });
    await flash();
    assert.equal(mon.mcansee, true);
});

test('canceling a ready Sunsword direction refunds cooldown and time', async () => {
    const item = setup();
    await flash('\x1b');
    assert.equal(item.age, game.moves);
    assert.equal(game.context.move, 0);
    assert.deepEqual(getRngLog(), []);
});

test('canceling a power-paid Sunsword invocation retains its energy cost', async () => {
    const item = setup(); item.age = 500;
    await flash('\x1b');
    assert.equal(game.u.uen, 25);
    assert.equal(item.age, 100);
    assert.equal(game.context.move, 0);
});

test('self flash blinds without requiring the sword to be wielded', async () => {
    setup(); await flash('.');
    assert.equal(game.u.blind, true);
    assert.ok(game.u._blindTimeout >= 11 && game.u._blindTimeout <= 20);
});

test('wielding Sunsword resists its self flash', async () => {
    const item = setup(); item.wielded = true;
    await flash('.');
    assert.equal(!!game.u.blind, false);
});

test('vertical invocation lights only the hero square on an ordinary level', async () => {
    setup();
    game.level.at(10, 10).lit = game.level.at(10, 10).waslit = false;
    game.level.at(11, 10).lit = false;
    await flash('>');
    assert.equal(game.level.at(10, 10).lit, true);
    assert.equal(game.level.at(11, 10).lit, false);
});

test('camera self flash preserves existing blindness and consumes no extra blindness roll', async () => {
    setup(true); game.u.blind = true; game.u._blindTimeout = 40;
    await flash('.', true);
    assert.equal(game.u._blindTimeout, 40);
    assert.equal(getRngLog().length, 1); // zapyourself still rolls duration before resistance.
});
