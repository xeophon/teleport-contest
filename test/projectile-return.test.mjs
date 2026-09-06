import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, W_WEP, INTRINSIC, TELEPORT, SEE_INVIS, POISON_RES, COLD_RES } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { rhack, applyHeroHitPointDamage } from '../js/cmd.js';
import { monsterByRndName } from '../js/mklev.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(values = [1, 1, 2]) {
    resetGame(); initRng(1);
    game.moves = 100; game.context = {}; game.flags = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 30, uhpmax: 30, uhunger: 900, fumbling: true,
        acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const aklys = { id: 1, kind: 'aklys', cls: 'weapon', glyph: ')', letter: 'a',
        quan: 1, wielded: true, owornmask: W_WEP };
    game.inventory = [aklys]; game.u.uwep = aklys;
    const raw = [...values, ...Array(100).fill(0)].map(BigInt);
    game.coreCtx = { n: raw.length, r: raw.reverse(), m: [], a: 0n, b: 0n, c: 0n };
    game.rng = { ...(game.rng || {}), core: game.coreCtx };
    vision_reset(); vision_recalc(); enableRngLog();
    return aklys;
}

test('a missed returning catch lands beneath the hero after recoil', async () => {
    // C dothrow.c:1758 uses u.ux/u.uy after hurtle, not the launch square.
    const aklys = setup([1, 0]); game.u.levitating = true;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.deepEqual([game.u.ux, game.u.uy], [9, 10]);
    assert.deepEqual([aklys.ox, aklys.oy], [9, 10]);
    assert.match(game._pending_message, /landing beneath your feet/);
});

test('air-level recoil alone does not describe a missed catch as beneath the hero', async () => {
    const aklys = setup([1, 0]); game.air_level = { ...game.u.uz };
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.deepEqual([game.u.ux, game.u.uy], [9, 10]);
    assert.deepEqual([aklys.ox, aklys.oy], [9, 10]);
    assert.match(game._pending_message, /landing at your feet/);
});

test('a returning arm hit applies half physical damage to its full 1d3+1', async () => {
    setup(); game.u.halfPhysicalDamage = true;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game.u.uhp, 28);
    assert.deepEqual(getRngLog(), ['rn2(100)=1', 'rn2(2)=1', 'rnd(3)=3']);
});

test('a returning weapon can damage the hero during prayer invulnerability', async () => {
    setup(); game.u.uinvulnerable = true;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game.u.uhp, 26);
});

test('a blind hero feels a returning weapon hit the polymorphed arm', async () => {
    setup(); game.u.blind = true;
    game.u._polyself_form = monsterByRndName('wood golem'); game.u.mh = game.u.mhmax = 20;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.match(game._pending_message, /The aklys hits your arm!/);
    assert.doesNotMatch(game._pending_message, /flies back|hitting your arm/);
    assert.equal(game.u.mh, 16);
    assert.equal(game.u.uhp, 30);
});

test('a returning arm hit destroys the monster form before landing the weapon', async () => {
    const aklys = setup();
    game.u._polyself_form = monsterByRndName('wood golem'); game.u.mh = 2; game.u.mhmax = 20;
    game.u._polyself_base = { uhp: 19, uhpmax: 30 };
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game.u._polyself_form, null);
    assert.equal(game.u.uhp, 19);
    assert.equal(game.level.objects.includes(aklys), true);
    assert.match(game._pending_message, /return to human form/);
});

for (const rescue of ['amulet', 'wizard']) {
    test(`returning arm death pauses landing and resumes once through ${rescue}`, async () => {
        let aklys = setup(); game.u.uhp = 2;
        if (rescue === 'wizard') game.flags.debug = true;
        else game.inventory.push({ id: 2, kind: 'amulet of life saving', cls: 'amulet',
            letter: 'b', worn: true, quan: 1 });
        await rhack('t'); await rhack('a'); await rhack('l');
        assert.equal(game._command_mode, rescue === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
        assert.equal(game.level.objects.includes(aklys), false);
        assert.equal(game._hero_projectile_return_landing.object, aklys);
        const saved = encodeSaveState(); resetGame(); restoreSaveState(saved); initRng(1, { resetLog: false });
        aklys = game._hero_projectile_return_landing.object;
        await rhack(' ');
        if (rescue === 'wizard') {
            assert.equal(game._command_mode, 'wizardDieConfirm');
            await rhack('n');
        }
        assert.equal(game._hero_projectile_return_landing, null);
        assert.equal(game.level.objects.filter(obj => obj === aklys).length, 1);
        assert.equal(game.u.uhp, game.u.uhpmax);
        assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(3)')).length, 1);
    });
}

test('fatal return leaves its detached weapon in flight until death ends the command', async () => {
    const aklys = setup(); game.u.uhp = 2;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.level.objects.includes(aklys), false);
    assert.equal(game.inventory.includes(aklys), false);
    assert.match(game._death_cause, /aklys/);
});

test('unchanging return death consumes life saving and restores monster hit points', async () => {
    const aklys = setup();
    game.u._polyself_form = monsterByRndName('wood golem'); game.u.mh = 2; game.u.mhmax = 20;
    game.u.unchanging = true;
    game.inventory.push({ id: 2, kind: 'amulet of life saving', cls: 'amulet', letter: 'b', worn: true, quan: 1 });
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game._command_mode, 'lifeSavingMore');
    await rhack(' ');
    assert.equal(game.u.mh, 20);
    assert.equal(game.u._polyself_form.name, 'wood golem');
    assert.equal(game.level.objects.includes(aklys), true);
});

for (const [role, race, hp, expected] of [
    ['Rogue', 'human', 1, 'You hear the wailing of the Banshee...'],
    ['Rogue', 'human', 2, 'You hear the howling of the CwnAnnwn...'],
    ['Wizard', 'human', 1, 'Wizard is about to die.'],
    ['Rogue', 'elf', 2, 'Elf, your life force is running out.'],
    ['Valkyrie', 'human', 2, 'Valkyrie, your life force is running out.'],
]) {
    test(`C low HP warning for ${role}/${race} at ${hp} HP`, () => {
        setup(); game._startup_role = role; game._startup_race = race;
        game.u.uhp = hp + 4; game.u.uhpmax = 100;
        const messages = [];
        applyHeroHitPointDamage(messages, 4, 'an aklys');
        assert.deepEqual(messages, [expected]);
        game.u.uhp += 1; game.moves = 150;
        applyHeroHitPointDamage(messages, 1, 'an aklys');
        assert.equal(messages.length, 1); // Warning interval is strictly greater than 50 turns.
        game.u.uhp += 1; game.moves = 151;
        applyHeroHitPointDamage(messages, 1, 'an aklys');
        assert.equal(messages.length, 2);
    });
}

test('C low HP power warning counts permanent intrinsic properties', () => {
    setup(); game._startup_role = 'Wizard'; game.u.uhp = 6; game.u.uhpmax = 100;
    game.u.uprops = Object.fromEntries([TELEPORT, SEE_INVIS, POISON_RES, COLD_RES]
        .map(id => [id, { intrinsic: INTRINSIC }]));
    const messages = [];
    applyHeroHitPointDamage(messages, 4, 'an aklys');
    assert.deepEqual(messages, ['Wizard, all your powers will be lost...']);
});

test('temporary and equipment properties do not count as low HP intrinsic powers', () => {
    setup(); game._startup_role = 'Wizard'; game.u.uhp = 6; game.u.uhpmax = 100;
    game.u.uprops = Object.fromEntries([TELEPORT, SEE_INVIS, POISON_RES, COLD_RES]
        .map(id => [id, { intrinsic: 100, extrinsic: W_WEP }]));
    const messages = [];
    applyHeroHitPointDamage(messages, 4, 'an aklys');
    assert.deepEqual(messages, ['Wizard, your life force is running out.']);
});

test('deaf low HP warning remains silent but consumes the shared warning interval', () => {
    setup(); game.u.uhp = 6; game.u.uhpmax = 100; game.u._deafTimeout = 1;
    const messages = [];
    applyHeroHitPointDamage(messages, 1, 'an aklys');
    assert.deepEqual(messages, []);
    game.u._deafTimeout = 0; game.moves = 101;
    applyHeroHitPointDamage(messages, 1, 'an aklys');
    assert.deepEqual(messages, []);
    game.moves = 151;
    applyHeroHitPointDamage(messages, 1, 'an aklys');
    assert.deepEqual(messages, ['You hear the howling of the CwnAnnwn...']);
});

test('only an unchanging polymorph warns, using the human HP in the warning text', () => {
    setup(); game._startup_role = 'Wizard'; game.u.uhp = 1;
    game.u._polyself_form = monsterByRndName('wood golem'); game.u.mh = 5; game.u.mhmax = 100;
    const messages = [];
    applyHeroHitPointDamage(messages, 1, 'an aklys');
    assert.deepEqual(messages, []);
    game.u.unchanging = true;
    applyHeroHitPointDamage(messages, 1, 'an aklys');
    assert.deepEqual(messages, ['Wizard is about to die.']);
    assert.equal(game.u.mh, 3);
});

test('C direct damage cancels running and travel but preserves a negative occupation delay', () => {
    setup();
    Object.assign(game.context, { run: 8, travel: 1, travel1: 1, mv: 1 });
    game._run_steps_remaining = 40; game._travel_target = { x: 20, y: 10 }; game.multi = -5;
    applyHeroHitPointDamage([], 1, 'an aklys');
    assert.deepEqual([game.context.run, game.context.travel, game.context.travel1, game.context.mv], [0, 0, 0, 0]);
    assert.equal(game._travel_target, null); assert.equal(game._run_steps_remaining, 0);
    assert.equal(game.multi, -5);
    game.multi = 4;
    applyHeroHitPointDamage([], 0, 'an aklys');
    assert.equal(game.multi, 0);
});
