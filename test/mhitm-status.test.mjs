import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { processMonsterTurns } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { mdamagem, gazemm, setMhitmHooks, M_ATTK_HIT, M_ATTK_MISS } from '../js/mhitm.js';
import {
    MONS, AT_CLAW, AT_TUCH, AT_ENGL, AT_GAZE, AT_SPIT, AT_BREA,
    AD_BLND, AD_CONF, AD_SLOW, AD_STCK, AD_WRAP,
} from '../js/permonst.js';
import { STRAT_WAITFORU, W_ARM, W_ARMH, W_ARMF } from '../js/const.js';

function installGame(seed = 123) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.level = new GameMap();
    g.flags = {};
    g.context = {};
    g.inventory = [];
    g.moves = 1;
    g.u = {
        ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 20, uhpmax: 20,
        ulevel: 1, umovement: 0, acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    setMhitmHooks({ pline: null, vis: null, cansee: null, canseemon: null, canspotmon: null });
    return g;
}

function monster(name, extra = {}) {
    const pm = MONS.find(mon => mon.name === name);
    assert.ok(pm, name);
    const mon = {
        mx: 5, my: 5, mhp: 50, mhpmax: 50, movement: 0,
        mcanmove: true, mcansee: true, mblinded: 0, mcan: false,
        mconf: 0, mspec_used: 0, mstrategy: STRAT_WAITFORU | 1,
        data: { name: pm.name, pm: pm.pm, mmove: pm.mmove },
        minvent: [], ...extra,
    };
    game.level.monsters.push(mon);
    return mon;
}

// C: uhitm.c:mhitm_ad_blnd rerolls the blindness duration after mdamagem's
// ordinary damage roll, adds it to the timeout, and never removes hit points.
test('blinding claw rolls duration separately, retains HP, and clears wait strategy', () => {
    installGame();
    const attacker = monster('raven');
    const defender = monster('goblin');
    const result = mdamagem(attacker, defender, { aatyp: AT_CLAW, adtyp: AD_BLND, damn: 1, damd: 6 });
    assert.equal(result, M_ATTK_MISS, 'C reports no damaging hit when only blindness was applied');
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['d(1,6)', 'd(1,6)', 'rn2(3)', 'rn2(6)']);
    assert.equal(defender.mblinded, Number(getRngLog()[1].split('=')[1]));
    assert.equal(defender.mcansee, false);
    assert.equal(defender.mhp, 50);
    assert.equal(defender.mstrategy, 1);
});

test('physical blindness extends existing timeout and saturates at the C 7-bit limit', () => {
    installGame();
    const attacker = monster('raven');
    const defender = monster('goblin', { mcansee: false, mblinded: 126 });
    mdamagem(attacker, defender, { aatyp: AT_CLAW, adtyp: AD_BLND, damn: 2, damd: 1 });
    assert.equal(defender.mblinded, 127);
    assert.equal(defender.mhp, 50);
});

// C: mondata.c:can_blnd differentiates physical, light, and engulf attacks.
for (const [label, aatyp, attackerName, defenderName, attackerState, defenderState, blind] of [
    ['cancelled raven claw still blinds', AT_CLAW, 'raven', 'goblin', { mcan: true }, {}, true],
    ['raven does not blind raven', AT_CLAW, 'raven', 'raven', {}, {}, false],
    ['eyeless species resists claw', AT_CLAW, 'raven', 'gelatinous cube', {}, {}, false],
    ['permanent blindness is unchanged', AT_CLAW, 'raven', 'goblin', {}, { mcansee: false }, false],
    ['cancelled touch cannot blind', AT_TUCH, 'raven', 'goblin', { mcan: true }, {}, false],
    ['uncancelled touch blinds', AT_TUCH, 'raven', 'goblin', {}, {}, true],
    ['engulf cannot blind sleeping target', AT_ENGL, 'dust vortex', 'goblin', {}, { msleeping: true }, false],
    ['engulf blinds awake target', AT_ENGL, 'dust vortex', 'goblin', {}, {}, true],
    ['light does not blind light-emitting species', AT_BREA, 'yellow light', 'Archon', {}, {}, false],
    ['light does not extend existing blindness', AT_BREA, 'yellow light', 'goblin', {}, { mcansee: false, mblinded: 3 }, false],
    ['light cannot blind sleeping target', AT_BREA, 'yellow light', 'goblin', {}, { msleeping: true }, false],
    ['cancelled light cannot blind', AT_BREA, 'yellow light', 'goblin', { mcan: true }, {}, false],
    ['unresisted light blinds', AT_BREA, 'yellow light', 'goblin', {}, {}, true],
    ['spit requires the projectile path', AT_SPIT, 'cobra', 'goblin', {}, {}, false],
]) {
    test(`blindness: ${label}`, () => {
        installGame();
        const attacker = monster(attackerName, attackerState);
        const defender = monster(defenderName, defenderState);
        assert.equal(mdamagem(attacker, defender, { aatyp, adtyp: AD_BLND, damn: 1, damd: 1 }), M_ATTK_MISS);
        assert.equal(defender.mblinded, (defenderState.mblinded || 0) + Number(blind));
        assert.equal(defender.mcansee, blind ? false : (defenderState.mcansee ?? true));
        assert.equal(defender.mhp, 50);
        assert.equal(defender.mstrategy, blind ? 1 : STRAT_WAITFORU | 1);
        assert.equal(getRngLog().length, blind ? 4 : 3);
    });
}

for (const [label, item, protectedEyes] of [
    ['worn visor', { kind: 'helmet', appearance: 'visored helmet', owornmask: W_ARMH }, true],
    ['carried visor', { kind: 'helmet', appearance: 'visored helmet' }, false],
    ['worn unvisored helm', { kind: 'helm of telepathy', appearance: 'etched helmet', worn: true }, false],
]) {
    test(`blinding claw respects ${label}`, () => {
        installGame();
        const attacker = monster('raven');
        const defender = monster('goblin', { minvent: [item] });
        mdamagem(attacker, defender, { aatyp: AT_CLAW, adtyp: AD_BLND, damn: 1, damd: 1 });
        assert.equal(defender.mcansee, protectedEyes);
    });
}

test('Archon gaze blinds before stun and base damage, without a duplicate blindness roll', () => {
    installGame();
    const attacker = monster('Archon', { mcansee: false });
    const defender = monster('goblin');
    assert.equal(gazemm(attacker, defender, { aatyp: AT_GAZE, adtyp: AD_BLND, damn: 2, damd: 1 }), M_ATTK_MISS);
    assert.equal(defender.mblinded, 2);
    assert.equal(defender.mcansee, false);
    assert.equal(defender.mhp, 50);
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['d(2,1)', 'rn2(2)', 'd(2,1)', 'rn2(3)', 'rn2(6)']);
    assert.equal(defender.mstun || 0, Number(getRngLog()[1].split('=')[1]));
});

for (const name of ['yellow light', 'Archon', 'gelatinous cube']) {
    test(`Archon gaze does not stun or roll damage against ${name}`, () => {
        installGame();
        const attacker = monster('Archon');
        const defender = monster(name);
        assert.equal(gazemm(attacker, defender, { aatyp: AT_GAZE, adtyp: AD_BLND, damn: 2, damd: 1 }), M_ATTK_MISS);
        assert.equal(defender.mstun || 0, 0);
        assert.deepEqual(getRngLog(), []);
    });
}

// C: uhitm.c:mhitm_ad_conf preserves ordinary HP damage even when the
// confusion effect is cancelled, already active, or on attacker cooldown.
for (const [label, attackerState, defenderState, confused] of [
    ['new confusion', {}, {}, true],
    ['cancelled attacker', { mcan: true }, {}, false],
    ['attacker cooldown', { mspec_used: 4 }, {}, false],
    ['already confused', {}, { mconf: 1 }, true],
]) {
    test(`confusion retains damage: ${label}`, () => {
        installGame();
        const attacker = monster('umber hulk', attackerState);
        const defender = monster('goblin', defenderState);
        assert.equal(mdamagem(attacker, defender, { aatyp: AT_GAZE, adtyp: AD_CONF, damn: 3, damd: 1 }), M_ATTK_HIT);
        assert.equal(defender.mconf, Number(confused));
        assert.equal(defender.mhp, 47);
        assert.equal(attacker.mspec_used, attackerState.mspec_used || 0);
        assert.equal(defender.mstrategy, confused && !defenderState.mconf ? 1 : STRAT_WAITFORU | 1);
        assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['d(3,1)', 'rn2(3)', 'rn2(6)']);
    });
}

// C: uhitm.c:mhitm_ad_slow + worn.c:mon_adjust_speed change intrinsic speed;
// worn speed boots retain effective fast speed while the attack still hurts.
for (const [label, attackerState, defenderState, speed, permanent, clearsWait] of [
    ['normal becomes slow', {}, {}, 'slow', 'slow', true],
    ['fast becomes normal', {}, { mspeed: 'fast', permspeed: 'fast' }, 0, 0, true],
    ['numeric fast becomes normal', {}, { mspeed: 2, permspeed: 2 }, 0, 0, true],
    ['slow stays slow', {}, { mspeed: 'slow', permspeed: 'slow' }, 'slow', 'slow', false],
    ['cancelled attacker preserves speed', { mcan: true }, { mspeed: 0, permspeed: 0 }, 0, 0, false],
    ['speed boots retain effective speed', {}, { mspeed: 'fast', permspeed: 0, minvent: [{ kind: 'speed boots', owornmask: W_ARMF }] }, 'fast', 'slow', true],
]) {
    test(`slowing attack: ${label}`, () => {
        installGame();
        const attacker = monster('skeleton', attackerState);
        const defender = monster('goblin', defenderState);
        assert.equal(mdamagem(attacker, defender, { aatyp: AT_TUCH, adtyp: AD_SLOW, damn: 2, damd: 1 }), M_ATTK_HIT);
        assert.equal(defender.mspeed, speed);
        assert.equal(defender.permspeed, permanent);
        assert.equal(defender.mhp, 48);
        assert.equal(defender.mstrategy, clearsWait ? 1 : STRAT_WAITFORU | 1);
        assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), attackerState.mcan
            ? ['d(2,1)', 'rn2(3)', 'rn2(6)'] : ['d(2,1)', 'rn2(10)', 'rn2(3)', 'rn2(6)']);
    });
}

// C: uhitm.c:3659 checks defended() after the MC roll. mondata.c:91-125
// treats an adult dragon as its own scales; artifact.c:672 gives blue
// scales and mail protection from slow, without reducing ordinary damage.
for (const [label, species, armor, defended] of [
    ['adult blue dragon', 'blue dragon', null, true],
    ['baby blue dragon', 'baby blue dragon', null, false],
    ['adult red dragon', 'red dragon', null, false],
    ['worn blue scales', 'goblin', { kind: 'blue dragon scales', owornmask: W_ARM }, true],
    ['carried blue scales', 'goblin', { kind: 'blue dragon scales' }, false],
    ['worn blue mail', 'goblin', { kind: 'blue dragon scale mail', owornmask: W_ARM }, true],
    ['carried blue mail', 'goblin', { kind: 'blue dragon scale mail' }, false],
]) {
    test(`slowing attack respects dragon defense: ${label}`, () => {
        installGame();
        const attacker = monster('skeleton');
        const defender = monster(species, { mspeed: 'fast', permspeed: 'fast',
            minvent: armor ? [armor] : [] });
        assert.equal(mdamagem(attacker, defender, { aatyp: AT_TUCH, adtyp: AD_SLOW, damn: 2, damd: 1 }), M_ATTK_HIT);
        assert.equal(defender.mspeed, defended ? 'fast' : 0);
        assert.equal(defender.permspeed, defended ? 'fast' : 0);
        assert.equal(defender.mhp, 48);
        assert.equal(defender.mstrategy, defended ? STRAT_WAITFORU | 1 : 1);
        assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['d(2,1)', 'rn2(10)', 'rn2(3)', 'rn2(6)']);
    });
}

// C: mon.c:mcalcmove applies speed before randomly rounding to twelve
// movement points. Keep the monster asleep so the test measures accrual.
for (const [name, state, adjustedSpeed] of [
    ['grid bug', 'slow', 8], ['grid bug', 1, 8], ['grid bug', -1, 8],
    ['air elemental', 'slow', 16], ['acid blob', 'slow', 2], ['quivering blob', 'slow', 1],
    ['grid bug', 2, 16], ['grid bug', 'fast', 16],
]) {
    test(`monster turn schedules ${name} with speed ${state}`, async () => {
        for (let seed = 1; seed <= 12; seed++) {
            installGame(seed);
            const defender = monster(name, { mspeed: state, msleeping: true });
            await processMonsterTurns();
            const movementRoll = getRngLog().find(entry => entry.startsWith('rn2(12)='));
            assert.ok(movementRoll, 'movement accrual must consume its rounding roll');
            const roll = Number(movementRoll.split('=')[1]);
            assert.equal(defender.movement, adjustedSpeed - adjustedSpeed % 12 + (roll < adjustedSpeed % 12 ? 12 : 0), `seed ${seed}`);
        }
    });
}

for (const adtyp of [AD_CONF, AD_SLOW]) {
    test(`zero-damage status ${adtyp} preserves C combat result flags`, () => {
        installGame();
        const attacker = monster('umber hulk');
        const defender = monster('goblin');
        assert.equal(mdamagem(attacker, defender, { aatyp: AT_GAZE, adtyp, damn: 0, damd: 0 }), M_ATTK_MISS);
        assert.equal(defender.mhp, 50);
    });
}

// C: uhitm.c:mhitm_ad_stck/mhitm_ad_wrap do not attach two monsters to one
// another. They retain ordinary damage unless their cancellation gate wins.
for (const adtyp of [AD_STCK, AD_WRAP]) {
    for (const cancelled of [false, true]) {
        test(`monster damage type ${adtyp}, cancelled ${cancelled}`, () => {
            installGame();
            const attacker = monster('python', { mcan: cancelled });
            const defender = monster('goblin');
            assert.equal(mdamagem(attacker, defender, { aatyp: AT_TUCH, adtyp, damn: 2, damd: 1 }), cancelled ? M_ATTK_MISS : M_ATTK_HIT);
            assert.equal(defender.mhp, cancelled ? 50 : 48);
            assert.equal(defender.mstrategy, STRAT_WAITFORU | 1);
            assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), adtyp === AD_STCK && !cancelled
                ? ['d(2,1)', 'rn2(10)', 'rn2(3)', 'rn2(6)'] : ['d(2,1)', 'rn2(3)', 'rn2(6)']);
        });
    }
}

// C: allmain.c:u_calc_moveamt delegates a moving rider's speed to
// mon.c:mcalcmove. Hero haste affects only turns spent without riding a move.
for (const [name, state, adjustedSpeed] of [
    ['pony', 'slow', 9], ['pony', 1, 9], ['pony', -1, 9],
    ['horse', 'slow', 10], ['silver dragon', 'slow', 6],
    ['warhorse', 'slow', 12], ['horse', 2, 27], ['horse', 'fast', 27],
]) {
    test(`moving rider schedules ${name} with speed ${state}`, async () => {
        for (let seed = 1; seed <= 12; seed++) {
            const g = installGame(seed);
            g.u.usteed = monster(name, { mspeed: state, msleeping: true });
            g.u.umoved = true;
            g.u.veryfast = true;
            await processMonsterTurns();
            const movementRoll = getRngLog().filter(entry => entry.startsWith('rn2(12)=')).at(-1);
            assert.ok(movementRoll);
            const roll = Number(movementRoll.split('=')[1]);
            assert.equal(g.u.umovement, adjustedSpeed - adjustedSpeed % 12 + (roll < adjustedSpeed % 12 ? 12 : 0), `seed ${seed}`);
            assert.equal(getRngLog().some(entry => entry.startsWith('rn2(3)=')), false, 'hero haste cannot augment a ridden move');
        }
    });
}

test('stationary rider uses hero form speed instead of steed speed', async () => {
    const g = installGame();
    g.u.usteed = monster('horse', { mspeed: 'fast', msleeping: true });
    g.u.umoved = false;
    g.u._monsterMove = 18;
    await processMonsterTurns();
    assert.equal(g.u.umovement, 18);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(12)=')).length, 1, 'only the steed itself rolls movement');
});

for (const moving of [false, true]) {
    test(`ridden gallop requires movement context ${moving}`, async () => {
        for (let seed = 1; seed <= 12; seed++) {
            const g = installGame(seed);
            g.u.usteed = monster('warhorse', { mspeed: 'slow', msleeping: true });
            g.u.umoved = true;
            g.u.ugallop = 10;
            g.context.mv = moving;
            await processMonsterTurns();
            const draws = getRngLog().filter(entry => /^rn2\((2|12)\)=/.test(entry));
            assert.deepEqual(draws.map(entry => entry.split('=')[0]), moving
                ? ['rn2(2)', 'rn2(12)', 'rn2(2)', 'rn2(12)']
                : ['rn2(12)', 'rn2(12)']);
            const gallopRoll = moving ? Number(draws.at(-2).split('=')[1]) : 0;
            const adjusted = moving ? (gallopRoll ? 16 : 20) : 12;
            const roll = Number(draws.at(-1).split('=')[1]);
            assert.equal(g.u.umovement, adjusted - adjusted % 12 + (roll < adjusted % 12 ? 12 : 0), `seed ${seed}`);
        }
    });
}
