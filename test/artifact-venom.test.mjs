import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, rn2, rnd, enableRngLog, getRngLog } from '../js/rng.js';
import { A_DEX, ROOM, DOOR, D_CLOSED, POOL, WATER, LAVAWALL, SINK, IRONBARS, WEB, W_AMUL } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { monsterExperienceValue } from '../js/exper.js';

function setup() {
    resetGame(); initRng(27);
    game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Rogue'; game._startup_race = 'orc';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 100, uhpmax: 100, uen: 50, uenmax: 50, acurr: { a: [12,12,12,25,12,12] },
        ualign: { type: -1, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const item = { artifact: 'Grimtooth', kind: 'orcish dagger', cls: 'weapon', letter: 'a', quan: 1, age: 0 };
    game.inventory = [item];
    vision_reset(); vision_recalc();
    return item;
}

function monster(name, x = 11, extra = {}) {
    const data = MONS.find(mon => mon.name === name);
    assert.ok(data, name);
    const mon = { data, mx: x, my: 10, mcansee: true, mcanmove: true, mblinded: 0,
        mhp: 30, mhpmax: 30, m_lev: data.lvl, m_id: x, ...extra };
    game.level.monsters.push(mon);
    return mon;
}

async function fling(direction = 'l', acid = true, beforeDirection = null) {
    game._command_mode = 'invokeObject';
    await rhack('a');
    assert.equal(game._command_mode, 'invokeVenomDirection');
    // Select either C rn2(2) branch without replacing the production RNG.
    let seed = 1;
    for (;; seed++) {
        initRng(seed);
        const type = rn2(2);
        rnd(2); rnd(20); // next_ident and thitmonst's unused hit roll
        if (type === (acid ? 0 : 1) && rnd(25) < 25) break;
    }
    initRng(seed); enableRngLog({ reset: true });
    beforeDirection?.();
    await rhack(direction);
}

test('Grimtooth creates and throws owned acid without adding an inventory object', async () => {
    const item = setup(); const mon = monster('goblin');
    await fling();
    assert.match(game._pending_message, /Your venom burns the goblin!/);
    assert.ok(mon.mhp >= 18 && mon.mhp <= 28);
    assert.deepEqual(game.inventory, [item]);
    assert.equal(game.level.objects.length, 0);
    assert.ok(item.age > game.moves);
    assert.equal(game.context.move, 1);
    assert.deepEqual(getRngLog().map(x => x.replace(/=.*/, '')), ['rn2(2)', 'rnd(2)', 'rnd(20)', 'rnd(25)', 'rnd(6)', 'rnd(6)']);
});

test('Grimtooth selects blinding venom independently of dagger BCU', async () => {
    const item = setup(); item.cursed = true;
    const mon = monster('goblin');
    await fling('l', false);
    assert.equal(mon.mcansee, false);
    assert.ok(mon.mblinded >= 21 && mon.mblinded <= 45);
    assert.equal(mon.mhp, 30);
    assert.equal(getRngLog().some(x => x.startsWith('rn2(7)')), false);
});

for (const age of [0, 500]) test(`canceling Grimtooth at cooldown ${age} refunds time and resets age`, async () => {
    const item = setup(); item.age = age;
    await fling('\x1b');
    assert.equal(item.age, 100);
    assert.equal(game.context.move, 0);
    assert.equal(game.u.uen, age ? 25 : 50);
    assert.deepEqual(getRngLog(), []);
});

for (const [terrain, name] of [[DOOR, 'closed door'], [WATER, 'water wall'], [LAVAWALL, 'lava wall'], [SINK, 'sink']]) {
    test(`${name} stops invoked venom before a target behind it`, async () => {
        setup(); Object.assign(game.level.at(11, 10), { typ: terrain, doormask: D_CLOSED });
        const mon = monster('goblin', 12);
        await fling();
        assert.equal(mon.mhp, 30);
        assert.equal(game.level.objects.length, 0);
        assert.match(game._pending_message, /Splash!/);
    });
}

test('horizontal venom always breaks even when its range ends above soft terrain', async () => {
    setup(); game.u.acurr.a[0] = 4; game.level.at(12, 10).typ = POOL;
    await fling();
    assert.equal(game.level.objects.length, 0);
    assert.equal(game._pending_message, 'Splash!');
});

test('underwater throwing limits Grimtooth range to one square', async () => {
    setup(); game.u.uunderwater = true; const mon = monster('goblin', 12);
    await fling();
    assert.equal(mon.mhp, 30);
});

test('levitating venom throws recoil after tracing the original target square', async () => {
    setup(); game.u.levitating = true; const mon = monster('goblin', 11);
    await fling();
    assert.equal(game.u.ux, 9);
    assert.ok(mon.mhp < 30);
    assert.match(game._pending_message, /^You float in the opposite direction\./);
});

for (const direction of ['l', '<', '>', '.']) test(`swallowed ${direction} invocation always hits the engulfer`, async () => {
    setup(); game.u.acurr.a[A_DEX] = 3;
    const mon = monster('purple worm', 10); game.u.uswallow = 1; game.u.ustuck = mon;
    await fling(direction);
    assert.ok(mon.mhp < 30);
    assert.equal(getRngLog().some(x => x.startsWith('rnd(25)')), false);
});

test('zero horizontal invocation splashes at the hero without self damage', async () => {
    setup(); await fling('.');
    assert.equal(game.u.uhp, 100);
    assert.equal(game.level.objects.length, 0);
    assert.match(game._pending_message, /Splash!/);
});

test('blinding venom cannot reach the engulfer eyes from inside its body', async () => {
    setup(); const mon = monster('purple worm', 10);
    game.u.uswallow = 1; game.u.ustuck = mon;
    await fling('l', false);
    assert.equal(mon.mcansee, true);
    assert.equal(mon.mblinded, 0);
    assert.equal(game._pending_message, 'Splash!');
});

test('upward Grimtooth uses the venom ceiling operation', async () => {
    setup(); await fling('<', false);
    assert.match(game._pending_message, /ceiling/);
    assert.match(game._pending_message, /Splash!/);
    assert.equal(game.level.objects.length, 0);
});

test('downward Grimtooth reports the floor impact and splashes', async () => {
    setup(); await fling('>');
    assert.match(game._pending_message, /hits the floor/);
    assert.match(game._pending_message, /Splash!/);
    assert.equal(game.level.objects.length, 0);
});

test('canonical acid resistance prevents acid damage to a yellow dragon', async () => {
    setup(); const mon = monster('yellow dragon');
    await fling();
    assert.equal(mon.mhp, 30);
    assert.match(game._pending_message, /harmlessly/);
    assert.equal(getRngLog().some(x => x.startsWith('rnd(6)')), false);
});

test('canonical eyeless monsters cannot be blinded by invoked venom', async () => {
    setup(); const mon = monster('brown mold');
    await fling('l', false);
    assert.equal(mon.mcansee, true);
    assert.equal(mon.mblinded, 0);
});

test('acid venom uses the hero kill pipeline including inventory and live experience', async () => {
    setup(); const loot = { kind: 'dagger', cls: 'weapon', quan: 1 };
    const mon = monster('goblin', 11, { mhp: 1, minvent: [loot] });
    const xp = monsterExperienceValue(mon, 0);
    await fling();
    assert.equal(mon.dead, true);
    assert.ok(game.level.objects.includes(loot));
    assert.equal(game.u.uexp, xp);
    assert.equal(game._vanquished_counts.goblin, 1);
});

test('acid venom respects monster life saving and gives no kill experience', async () => {
    setup(); const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, owornmask: W_AMUL };
    const mon = monster('goblin', 11, { mhp: 1, minvent: [amulet] });
    await fling();
    assert.equal(!!mon.dead, false);
    assert.ok(mon.mhp > 0);
    assert.equal(mon.minvent.includes(amulet), false);
    assert.equal(game.u.uexp || 0, 0);
});

test('object-disguised mimics are passed over unless the hero can sense them', async () => {
    setup(); const mimic = monster('small mimic', 11, { m_ap_type: 2, mappearance: 1 });
    const mon = monster('goblin', 12);
    await fling();
    assert.equal(mimic.mhp, 30);
    assert.ok(mon.mhp < 30);
});

test('point-blank venom passes iron bars without the distant bars roll', async () => {
    setup(); game.level.at(11, 10).typ = IRONBARS;
    const mon = monster('goblin', 12);
    await fling();
    assert.ok(mon.mhp < 30);
    assert.equal(getRngLog().some(x => x.startsWith('rn2(5)')), false);
});

test('a web checks the C one-in-three catch branch during venom flight', async () => {
    setup(); game.level.traps.push({ tx: 11, ty: 10, ttyp: WEB, tseen: false });
    await fling();
    assert.equal(getRngLog().filter(x => x.startsWith('rn2(3)')).length, 1);
    assert.equal(game.level.objects.length, 0);
});

test('venom passes harmlessly through a shade before hitting the next monster', async () => {
    setup(); const shade = monster('shade', 11, { msleeping: 1 });
    const mon = monster('goblin', 12);
    await fling();
    assert.equal(shade.mhp, 30);
    assert.equal(shade.msleeping, 0);
    assert.ok(mon.mhp < 30);
    assert.match(game._pending_message, /passes harmlessly through the shade/);
});

test('an invisible marker makes an object-disguised mimic a known target', async () => {
    setup(); const mimic = monster('small mimic', 11, { m_ap_type: 2, mappearance: 1 });
    const behind = monster('goblin', 12);
    await fling('l', true, () => Object.assign(game.level.at(11, 10), {
        map_invisible: true, remembered_glyph: { ch: 'I', color: 0, dec: false },
    }));
    assert.match(game._pending_message, /venom hits the small mimic harmlessly/);
    assert.equal(mimic.mhp, 30); // Mimics have innate acid resistance.
    assert.equal(behind.mhp, 30);
});

test('low dexterity misses use the tmiss wake roll and still consume venom', async () => {
    setup(); game.u.acurr.a[A_DEX] = 3;
    const mon = monster('goblin');
    await fling();
    assert.equal(mon.mhp, 30);
    assert.match(game._pending_message, /misses.*Splash!/);
    assert.equal(getRngLog().filter(x => x.startsWith('rn2(3)')).length, 1);
    assert.equal(game.level.objects.length, 0);
});

for (const [label, extra] of [
    ['numeric permanent blindness', { mcansee: 0, mblinded: 0 }],
    ['worn visor', { minvent: [{ kind: 'helm of telepathy', worn: true }] }],
]) test(`${label} prevents invoked venom blindness`, async () => {
    setup(); const mon = monster('goblin', 11, extra);
    await fling('l', false);
    assert.equal(mon.mblinded, 0);
    assert.equal(getRngLog().some(x => x.startsWith('rn2(25)')), false);
});

test('temporary venom blindness extends up to the C 127-turn cap', async () => {
    setup(); const mon = monster('goblin', 11, { mcansee: false, mblinded: 120 });
    await fling('l', false);
    assert.equal(mon.mblinded, 127);
    assert.match(game._pending_message, /blinds the goblin further/);
});

test('a cooling Grimtooth with fewer than 25 energy points ignores invocation', async () => {
    const item = setup(); item.age = 500; game.u.uen = 24;
    game._command_mode = 'invokeObject';
    await rhack('a');
    assert.equal(game._command_mode, null);
    assert.equal(game.u.uen, 24);
    assert.ok(item.age >= 503 && item.age <= 530);
    assert.match(game._pending_message, /Grimtooth is ignoring you/);
    assert.equal(game.context.move, 1);
});

test('stunned vertical invocation preserves vertical direction before creating venom', async () => {
    setup(); game.u.stunned = true; game.u._stunTimeout = 5;
    await fling('>');
    assert.deepEqual([game.u.dx, game.u.dy, game.u.dz], [0,0,1]);
    assert.deepEqual(getRngLog().map(x => x.replace(/=.*/, '')), ['rn2(2)', 'rnd(2)', 'rn2(100)']);
});

test('ordinary acid venom throws share live kill experience with invocation', async () => {
    setup(); const mon = monster('goblin', 11, { mhp: 1 });
    game.inventory = [{ kind: 'splash of acid venom', otyp: 10185, cls: 'venom', glyph: '.',
        letter: 'v', quan: 1, spe: 1, owt: 1 }];
    game._command_mode = 'throwDirection'; game._throw_item_letter = 'v';
    initRng(2);
    await rhack('l');
    assert.equal(mon.dead, true);
    assert.ok(game.u.uexp > 0);
    assert.equal(game.inventory.length, 0);
});
