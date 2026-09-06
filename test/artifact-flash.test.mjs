import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, DOOR, D_CLOSED, W_WEP } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { monsterExperienceValue } from '../js/exper.js';

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
    for (let i = 0; game._message_more && i < 20; i++) await rhack(' ');
    assert.ok(!game._message_more, 'prior command message prompts are drained');
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

for (const camera of [false, true]) {
    test(`${camera ? 'camera' : 'Sunsword'} invalid direction cancels instead of keeping the prompt open`, async () => {
        const item = setup(camera);
        await flash('?', camera); // Help keeps the prompt; use an invalid letter after it.
        await rhack('z');
        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 0);
        assert.equal(camera ? item.spe : item.age, camera ? 5 : 100);
    });
}

test('stunned horizontal invocation uses the same direction order as C confdir', async () => {
    setup();
    const targets = [[9,10],[10,9],[11,10],[10,11],[9,9],[11,9],[11,11],[9,11]].map(([x,y]) => {
        const mon = monster('goblin', x); mon.my = y; return mon;
    });
    game.u.stunned = true;
    await flash('l');
    assert.equal(targets.filter(mon => !mon.mcansee).length, 1);
    assert.match(getRngLog()[0], /^rn2\(8\)/);
});

test('stunning cannot turn an upward flash into a lateral ray', async () => {
    setup(); monster('goblin'); game.u.stunned = true;
    await flash('<');
    assert.equal(game.level.monsters[0].mcansee, true);
    assert.deepEqual(getRngLog(), []);
});

test('furniture mimics reveal their C map-symbol description', async () => {
    setup(); const mimic = monster('small mimic', 11, { m_ap_type: 1, mappearance: 33 });
    await flash();
    assert.equal(mimic.m_ap_type, 0);
    assert.match(game._pending_message, /That altar is really a small mimic!/);
});

test('object mimics let the flash pass to the next monster', async () => {
    setup(); const mimic = monster('small mimic', 11, { m_ap_type: 2, mappearance: 7 });
    const target = monster('goblin', 12);
    await flash();
    assert.equal(mimic.m_ap_type, 2);
    assert.equal(mimic.mcansee, true);
    assert.equal(!!target.mcansee, false);
});

test('camera records first closeup and photograph once per species', async () => {
    setup(true); const mon = monster('goblin');
    await flash('l', true);
    assert.equal(game.mvitals[mon.data.pm].seen_close, 1);
    assert.equal(game.mvitals[mon.data.pm].photographed, 1);
    assert.equal(game.context.lifelist.total_seen_upclose, 1);
    assert.equal(game.context.lifelist.total_photographed, 1);
    await flash('l', true);
    assert.equal(game.context.lifelist.total_photographed, 1);
});

test('Tourist first photograph awards source experience without recording a kill', async () => {
    setup(true); game._startup_role = 'Tourist';
    const mon = monster('goblin'); const xp = monsterExperienceValue(mon, 0);
    await flash('l', true);
    assert.equal(game.u.uexp, xp);
    assert.equal(game.u.urexp, xp * 4); // more_experienced(experience(mon,0),0)
    assert.equal(game._vanquished_total || 0, 0);
    await flash('l', true);
    assert.equal(game.u.uexp, xp);
});

test('the Tourist starting pet photograph gives no experience until its form changes', async () => {
    setup(true); game._startup_role = 'Tourist';
    const mon = monster('little dog', 11, { mtame: 10 });
    game.context.startingpet_mid = mon.m_id;
    game.context.startingpet_typ = mon.data.pm;
    await flash('l', true);
    assert.equal(game.u.uexp || 0, 0);
    mon.data = MONS.find(pm => pm.name === 'dog');
    await flash('l', true);
    assert.equal(game.u.uexp, monsterExperienceValue(mon, 0));
});

test('hallucination prevents photographic species records', async () => {
    setup(true); monster('goblin'); game.u.hallucinating = true;
    await flash('l', true);
    assert.equal(game.context.lifelist?.total_photographed || 0, 0);
});

test('flash illumination leaves remembered monsters when temporary light is removed', async () => {
    setup(); const mon = monster('goblin', 14);
    for (let x = 11; x <= 15; x++) game.level.at(x, 10).lit = false;
    vision_recalc();
    await flash();
    assert.equal(game.level.at(14, 10).lit, false);
    assert.equal(game.level.at(14, 10).map_invisible, true);
    assert.equal(mon.mtemplit, 0);
    assert.equal(game._transientFlashSpots, undefined);
});

test('flashing a long-worm tail does not blind its head and photographs the tail species', async () => {
    setup(true);
    const mon = monster('long worm', 15, { wormno: 1, wormSegments: [{ x: 11, y: 10 }] });
    await flash('l', true);
    assert.equal(mon.mcansee, true);
    const tail = MONS.find(pm => pm.name === 'long worm tail');
    assert.equal(game.mvitals[tail.pm].photographed, 1);
    assert.equal(game.mvitals[mon.data.pm], undefined);
});

test('a lethal gremlin flash runs shared death, inventory drop and live experience', async () => {
    setup(); const coin = { kind: 'gold piece', cls: 'coin', quan: 3 };
    const mon = monster('gremlin', 11, { mhp: 1, minvent: [coin] });
    await flash();
    assert.equal(mon.dead, true);
    assert.ok(!game.level.monsters.includes(mon));
    assert.ok(game.level.objects.includes(coin));
    assert.ok(game.u.uexp > 0);
});

test('a life-saved gremlin survives its flash and then receives blindness', async () => {
    setup(); const amulet = { kind: 'amulet of life saving', cls: 'amulet', amuletIndex: 1, worn: true };
    const mon = monster('gremlin', 11, { mhp: 1, minvent: [amulet] });
    await flash();
    assert.equal(mon.dead, false);
    assert.ok(mon.mhp > 0);
    assert.ok(!mon.minvent.includes(amulet));
    assert.equal(!!mon.mcansee, false);
});

test('an Unchanging gremlin hero is restored before continued self-flash effects', async () => {
    setup(); const form = MONS.find(pm => pm.name === 'gremlin');
    Object.assign(game.u, { _polyself_form: form, mh: 1, mhmax: 200, unchanging: true });
    const amulet = { cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, letter: 'b' };
    game.inventory.push(amulet);
    await flash('.');
    assert.equal(game._command_mode, 'lifeSavingMore');
    assert.ok(game.u.mh > 0);
    assert.ok(!game.inventory.includes(amulet));
    assert.equal(game.u.blind, true);
});

test('vertical Sunsword lighting injures gremlins throughout a Rogue room', async () => {
    setup();
    game.level.flags.rogue_level = true;
    game.level.rooms = [{ lx: 9, hx: 13, ly: 9, hy: 11, rlit: 0 }];
    game.level.at(10, 10).roomno = 3;
    const mon = monster('gremlin', 12);
    await flash('>');
    assert.ok(mon.mhp < 30 && mon.mhp >= 25);
    assert.equal(game.level.rooms[0].rlit, 1);
});

for (const [name, suffix] of [['purple worm', 'stomach is lit.'], ['air elemental', 'shines briefly.'], ['fog cloud', 'shines briefly.']]) {
    test(`vertical light uses the ${name} engulfer feedback`, async () => {
        setup(); const mon = monster(name, 10);
        game.u.uswallow = 1; game.u.ustuck = mon;
        await flash('>');
        assert.ok(game._pending_message.includes(suffix));
    });
}
