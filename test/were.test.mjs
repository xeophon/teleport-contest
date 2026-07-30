import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import {
    WERE_SPECIES, FULL_MOON,
    isWereData, isWereHumanForm, wereSpeciesOf, counterWereData,
    wereBeastieSpecies, nightNow,
    wereChange, newWere, wereSummon, wereBiteInfectsHero,
    setUlycn, youWere, youUnwere,
} from '../js/were.js';

// C refs:
//  src/were.c:9-44 were_change(), :48-67 counter_were(), :70-93 were_beastie(),
//  :96-139 new_were(), :142-189 were_summon(), :192-211 you_were(),
//  :213-229 you_unwere(), :231-238 set_ulycn()
//  src/uhitm.c:4265-4290 mhitm_ad_were() mhitu hero-infection branch
//  src/mon.c:1198 were_change(mtmp) from m_calcdistress
//  include/monsters.h were form data, include/flag.h:80-81 moon phases.

function installGame(overrides = {}) {
    const g = resetGame();
    initRng(overrides.seed ?? 42);
    g.flags = { moonphase: 1, ...(overrides.flags || {}) };
    g.inventory = overrides.inventory || [];
    g.moves = 100;
    g._datetime = overrides.datetime || '20260730120000'; // noon, not night
    g.u = {
        ux: 10, uy: 10, uhp: 30, uhpmax: 30,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        ...(overrides.u || {}),
    };
    g.level = {
        monsters: overrides.monsters || [],
        objects: [], traps: [], engravings: overrides.engravings || [],
    };
    return g;
}

function wereMon(species, form = 'human', extra = {}) {
    const data = { ...WERE_SPECIES.get(species)[form] };
    return {
        data, name: data.name, mlet: data.mlet, glyph: data.glyph,
        mx: 12, my: 10, mhp: 8, mhpmax: 8,
        msleeping: 0, mfrozen: 0, mcanmove: true,
        mpeaceful: false, ...extra,
    };
}

test('is_were / is_human distinctions (mondata.h:96,101)', () => {
    installGame();
    assert.equal(isWereData(WERE_SPECIES.get('wererat').human), true);
    assert.equal(isWereData(WERE_SPECIES.get('werewolf').beast), true);
    assert.equal(isWereData({ name: 'jackal' }), false);
    assert.equal(isWereHumanForm(WERE_SPECIES.get('wererat').human), true);
    assert.equal(isWereHumanForm(WERE_SPECIES.get('wererat').beast), false);
});

test('counterWereData mirrors counter_were (were.c:48-67)', () => {
    assert.equal(counterWereData(WERE_SPECIES.get('wererat').human).wereBeast, true);
    assert.equal(counterWereData(WERE_SPECIES.get('wererat').beast).wereHuman, true);
    assert.equal(counterWereData(WERE_SPECIES.get('werejackal').beast).wereHuman, true);
    assert.equal(counterWereData(WERE_SPECIES.get('werewolf').human).wereBeast, true);
    assert.equal(counterWereData({ name: 'jackal' }), null); // C NON_PM
});

test('wereBeastieSpecies mirrors were_beastie (were.c:70-93)', () => {
    assert.equal(wereBeastieSpecies('wererat'), 'wererat');
    assert.equal(wereBeastieSpecies('sewer rat'), 'wererat');
    assert.equal(wereBeastieSpecies('giant rat'), 'wererat');
    assert.equal(wereBeastieSpecies('rabid rat'), 'wererat');
    assert.equal(wereBeastieSpecies('jackal'), 'werejackal');
    assert.equal(wereBeastieSpecies('fox'), 'werejackal');
    assert.equal(wereBeastieSpecies('coyote'), 'werejackal');
    assert.equal(wereBeastieSpecies('wolf'), 'werewolf');
    assert.equal(wereBeastieSpecies('warg'), 'werewolf');
    assert.equal(wereBeastieSpecies('winter wolf'), 'werewolf');
    assert.equal(wereBeastieSpecies('winter wolf cub'), 'werewolf');
    assert.equal(wereBeastieSpecies('hell hound'), null); // C: no entry -> NON_PM
});

test('nightNow mirrors night() hour<6||hour>21 (calendar.c:214-220)', () => {
    assert.equal(nightNow(installGame({ datetime: '20260730235959' })), true);
    assert.equal(nightNow(installGame({ datetime: '20260730050000' })), true);
    assert.equal(nightNow(installGame({ datetime: '20260730060000' })), false);
    assert.equal(nightNow(installGame({ datetime: '20260730210000' })), false);
    assert.equal(nightNow(installGame({ datetime: '20260730220000' })), true);
});

test('wereChange: non-were monsters consume no PRNG draws', () => {
    installGame();
    enableRngLog();
    const n0 = getRngLog().length;
    assert.equal(wereChange({ data: { name: 'jackal' } }), false);
    assert.equal(getRngLog().length, n0);
});

test('wereChange: human form consumes exactly one draw per turn (daytime 1-in-50, were.c:16-18)', () => {
    const g = installGame({ seed: 7 });
    const mon = wereMon('wererat', 'human');
    g.level.monsters.push(mon);
    enableRngLog();
    const n0 = getRngLog().length;
    wereChange(mon, { g, canseemon: () => true });
    assert.equal(getRngLog().length, n0 + 1);
});

test('wereChange: Protection_from_shape_changers skips the human-form roll entirely (were.c:16 short-circuit)', () => {
    const g = installGame(); delete g.u;
    g.u = { ux: 10, uy: 10, protectionFromShapeChangers: true };
    const mon = wereMon('wererat', 'human');
    g.level.monsters.push(mon);
    enableRngLog();
    const n0 = getRngLog().length;
    assert.equal(wereChange(mon, { g }), false);
    assert.equal(getRngLog().length, n0); // no draw: were.c:16
});

test('wereChange: beast form consumes rn2(30) and reverts to human on success or protection (were.c:40-43)', () => {
    // run many turns: with 1/30 per turn, a transformation must occur and
    // hp must regenerate by 1/4 of the lost points on the transition.
    const g = installGame({ seed: 1234 });
    const mon = wereMon('werejackal', 'beast', { mhp: 4, mhpmax: 8 });
    g.level.monsters.push(mon);
    let changed = -1;
    for (let t = 0; t < 400 && changed < 0; t++) {
        if (wereChange(mon, { g, canseemon: () => false })) changed = t;
    }
    assert.ok(changed >= 0, 'beast->human change eventually fires');
    assert.equal(mon.data.wereHuman, true);
    // were.c:125: healmon (mhpmax - mhp)/4 -> 4 + (8-4)/4 = 5
    assert.equal(mon.mhp, 5);
    // protection forces the revert without the roll succeeding
    g.u.protectionFromShapeChangers = true;
    const mon2 = wereMon('werewolf', 'beast');
    assert.equal(wereChange(mon2, { g, canseemon: () => false }), true);
    assert.equal(mon2.data.wereHuman, true);
});

test('newWere: human->beast blocked by protection, wakes, heals, sheds gear (were.c:96-139)', () => {
    const g = installGame({ seed: 9 });
    const mon = wereMon('wererat', 'human', {
        mhp: 2, mhpmax: 8, msleeping: 1,
        mw: { kind: 'dagger' }, helmet: { kind: 'leather helm' },
    });
    g.level.monsters.push(mon);
    assert.equal(newWere(mon, { g, canseemon: () => false }), true);
    assert.equal(mon.data.wereBeast, true);
    assert.equal(mon.msleeping, 0); // were.c:120-122
    assert.equal(mon.mhp, 2 + Math.trunc((8 - 2) / 4)); // 2+1=3, were.c:125
    assert.equal(mon.mw, null); // possibly_unwield, were.c:127
    assert.equal(mon.helmet, null); // mon_break_armor, were.c:128
    // protection blocks human->beast (were.c:101-104)
    g.u.protectionFromShapeChangers = true;
    const mon2 = wereMon('wererat', 'human');
    assert.equal(newWere(mon2, { g }), false);
    assert.equal(mon2.data.wereHuman, true);
});

test('newWere: scares into flight only when mon_moving, onscary target (were.c:131-136)', () => {
    const g = installGame({
        seed: 5,
        engravings: [{ x: 11, y: 10, text: 'Elbereth' }],
    });
    const mon = wereMon('werewolf', 'beast', { mux: 11, muy: 10, mx: 10, my: 10 });
    g.level.monsters.push(mon);
    const changed = newWere(mon, {
        g, monMoving: true, canseemon: () => false,
        onscary: (x, y) => x === 11 && y === 10,
    });
    assert.equal(changed, true);
    assert.ok(mon.mflee, 'monflee fires');
    assert.ok(mon.mfleetim >= 2 && mon.mfleetim <= 10, 'rn1(9,2) => 2..10 turns');
});

test('wereSummon: wererat pack sizes follow rnd(5) and the rn2(3)/rn2(3) chain (were.c:142-189)', async () => {
    // Deterministic fake makemon; count species distribution over many
    // samples: P(sewer rat)=2/3, P(giant rat)=(1/3)*(2/3)=2/9,
    // P(rabid rat)=(1/3)*(1/3)=1/9 per attempt.
    const g = installGame({ seed: 2026 });
    const speciesCount = { 'sewer rat': 0, 'giant rat': 0, 'rabid rat': 0 };
    let attempts = 0;
    for (let k = 0; k < 200; k++) {
        await wereSummon('wererat', {
            g, heroX: 5, heroY: 5,
            makemon: async (name) => { speciesCount[name]++; attempts++; return { name }; },
        });
    }
    const total = attempts;
    assert.ok(total > 200, 'should average above one attempt per summon (rnd(5) mean 3, minus failures)');
    const pSewer = speciesCount['sewer rat'] / total;
    const pGiant = speciesCount['giant rat'] / total;
    const pRabid = speciesCount['rabid rat'] / total;
    assert.ok(Math.abs(pSewer - 2 / 3) < 0.05, `sewer rat ~66% (got ${pSewer})`);
    assert.ok(Math.abs(pGiant - 2 / 9) < 0.04, `giant rat ~22% (got ${pGiant})`);
    assert.ok(Math.abs(pRabid - 1 / 9) < 0.04, `rabid rat ~11% (got ${pRabid})`);
});

test('wereSummon: protection blocks enemy summons entirely with zero draws (were.c:151-152)', async () => {
    const g = installGame({ seed: 3 });
    g.u.protectionFromShapeChangers = true;
    enableRngLog();
    const n0 = getRngLog().length;
    const res = await wereSummon('werewolf', { g, yours: false, makemon: async () => ({}) });
    assert.deepEqual(res, { total: 0, visible: 0 });
    assert.equal(getRngLog().length, n0);
});

test('wereSummon: hero summons bypass protection and tame the pack (were.c:151,184-185)', async () => {
    const g = installGame({ seed: 44 });
    g.u.protectionFromShapeChangers = true;
    const tamed = [];
    const res = await wereSummon('werewolf', {
        g, yours: true, heroX: 3, heroY: 4,
        makemon: async (name, x, y) => ({ name, x, y }),
        tamedog: (m) => tamed.push(m),
    });
    assert.equal(res.total, tamed.length);
    assert.ok(tamed.every(m => m.x === 3 && m.y === 4), 'summons target hero coordinates');
});

test('wereBiteInfectsHero: roll ordering and infection conditions (uhitm.c:4265-4290)', () => {
    const g = installGame({ seed: 77 });
    enableRngLog();
    let infected = false;
    // 1-in-4 per bite: within 50 non-protected bites infection must land.
    for (let i = 0; i < 50 && !infected; i++) {
        infected = wereBiteInfectsHero({ data: { ...WERE_SPECIES.get('wererat').beast } }, {
            g, magicNegation: 0,
            addToplineMessage: (msg) => { assert.equal(msg, 'You feel feverish.'); },
        });
    }
    assert.ok(infected, 'were bite eventually infects (!rn2(4) branch)');
    assert.equal(g.u.ulycn, 'wererat');
    // once infected, no reinfection (u.ulycn != NON_PM gates the roll effects)
    const n0 = getRngLog().length;
    assert.equal(wereBiteInfectsHero({ data: { ...WERE_SPECIES.get('werewolf').beast } }, { g, magicNegation: 0 }), false);
    assert.equal(getRngLog().length, n0 + 1, 'rn2(4) still consumed; rn2(10) short-circuited');
});

test('you_were / you_unwere hero cycle flags (were.c:192-229)', () => {
    const g = installGame({ seed: 88 });
    setUlycn('werejackal', g); // were.c:231-238 infection state
    assert.equal(g.u.ulycn, 'werejackal');

    // No adjacent monsters -> uncontrollable you_were transforms the hero
    // into beast form (were.c:204-210 polymon(u.ulycn)).
    let polymorphedTo = null;
    assert.equal(youWere({ g, polymon: (sp) => { polymorphedTo = sp; g.u._polyself_form = { ...WERE_SPECIES.get(sp).beast }; } }), true);
    assert.equal(polymorphedTo, 'werejackal');
    assert.equal(g.u._polyself_form.wereBeast, true);
    assert.equal(g.were_changes, 1);

    // Already in were form -> second you_were is a no-op (were.c:196).
    assert.equal(youWere({ g }), false);

    // Hostile adjacent monster blocks you_unwere rehumanization (were.c:220-221).
    g.level.monsters.push(wereMon('wererat', 'human', { mx: 10, my: 10 }));
    g.u.mtimedone = 5;
    assert.equal(youUnwere(false, { g, rehumanize: () => { throw new Error('should not rehumanize'); } }), false);

    // Clearing the monster allows rehumanize (were.c:220-224).
    g.level.monsters = [];
    let rehumanized = false;
    assert.equal(youUnwere(false, { g, rehumanize: () => { rehumanized = true; } }), true);
    assert.ok(rehumanized);

    // Purifying cure clears u.ulycn (were.c:218-219 / pray.c:515).
    setUlycn('werewolf', g);
    youUnwere(true, { g });
    assert.equal(g.u.ulycn, -1);
});

test('you_unwere extends beast-form tenure via rn1(200,200) when staying were (were.c:228)', () => {
    const g = installGame({ seed: 99 });
    g.u._polyself_form = { ...WERE_SPECIES.get('wererat').beast };
    g.u.polymorphControl = true;
    youUnwere(false, { g, queryYNC: () => true /* "Remain in beast form?" -> yes */ });
    assert.ok(g.u.mtimedone >= 200 && g.u.mtimedone <= 400);
});
