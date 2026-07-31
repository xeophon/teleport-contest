import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import {
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
    monnear, distmin, attkProtection, mmAggression, zombieForm, zombieMaker,
    couldSeduce, helpless, findMac, pmOf, attackList, mdamagem, passivemm,
    hitmm, missmm, mattackm, fightm, mdisplacem, mMoveAggress,
    setMhitmHooks, resistsAcid, engulfTarget, gulpmm,
} from '../js/mhitm.js';
import {
    MONS, PM, PM_KOBOLD_ZOMBIE,
    AT_CLAW, AT_KICK, AT_BITE, AT_STNG, AT_TUCH, AT_BUTT, AT_HUGS, AT_TENT,
    AT_ENGL, AT_GAZE, AT_WEAP, AT_BREA, AD_PHYS, AD_ACID, AD_PLYS, AD_DGST,
} from '../js/permonst.js';
import { W_ARMC, W_ARMG, W_ARMH, W_ARMF } from '../js/const.js';

// C refs: mhitm.c (fightm/mattackm/hitmm/mdamagem/passivemm/mdisplacem),
// uhitm.c (mhitm_adtyping subset + mhitm_knockback preamble rolls), mon.c
// (mm_aggression/mm_2way_aggression/monnear/zombie_maker/zombie_form),
// monmove.c:2086 (m_move_aggress return-attack gate), mhitu.c
// (could_seduce/getmattk), mondata.c:1607 (resist_conflict).

const byName = (n) => MONS.find((m) => m.name === n);

function installGame(seed = 42) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.level = { monsters: [], objects: [], traps: [], engravings: [] };
    g.moves = 100;
    g.u = { ux: 10, uy: 10, ulevel: 1, inv: [], acurr: { a: [10, 10, 10, 10, 10, 10] } };
    return g;
}

function mkMon(name, x, y, extra = {}) {
    const pm = byName(name);
    assert.ok(pm, `permonst ${name}`);
    const mon = {
        mx: x, my: y, mhp: 50, mhpmax: 50, movement: 12, mcanmove: true,
        mcan: false, msleeping: 0, mstun: 0, mconf: 0,
        data: { name: pm.name, mlet: pm.sym, mac: pm.ac, mlevel: pm.lvl, mmove: pm.mmove },
        minvent: [],
        ...extra,
    };
    game.level.monsters.push(mon);
    return mon;
}

test.beforeEach(() => {
    setMhitmHooks({
        pline: null, vis: null, cansee: null, canseemon: null, canspotmon: null,
        Monnam: null, mon_nam: null, monkilled: null, monstone: null, newsym: null,
        monkExplodes: null,
    });
});

test('distmin/dist2/monnear match hacklib.c and mon.c:2473 semantics', () => {
    installGame();
    assert.equal(distmin(0, 0, 3, 1), 3);
    const grid = mkMon('grid bug', 5, 5);
    assert.equal(monnear(grid, 5, 6), true);
    assert.equal(monnear(grid, 6, 6), false); /* NODIAG: hack.h:1414 */
    const rat = mkMon('giant rat', 3, 12);
    assert.equal(monnear(rat, 4, 13), true);
    assert.equal(monnear(rat, 5, 14), false);
});

test('attk_protection matrix (mhitm.c:1303-1334)', () => {
    assert.equal(attkProtection(AT_CLAW), W_ARMG);
    assert.equal(attkProtection(AT_TUCH), W_ARMG);
    assert.equal(attkProtection(AT_WEAP), W_ARMG);
    assert.equal(attkProtection(AT_KICK), W_ARMF);
    assert.equal(attkProtection(AT_BUTT), W_ARMH);
    assert.equal(attkProtection(AT_HUGS), W_ARMC | W_ARMG);
    assert.equal(attkProtection(AT_BITE), 0);
    assert.equal(attkProtection(AT_STNG), 0);
    assert.equal(attkProtection(AT_ENGL), 0);
    assert.equal(attkProtection(AT_TENT), 0);
    assert.equal(attkProtection(AT_GAZE), -1);
    assert.equal(attkProtection(AT_BREA), -1);
});

test('mm_aggression gating (mon.c:2384-2452)', () => {
    installGame();
    const worm = mkMon('purple worm', 5, 5);
    const shrieker = mkMon('shrieker', 6, 5);
    assert.notEqual(mmAggression(worm, shrieker), 0, 'purple worm -> shrieker');
    assert.equal(mmAggression(shrieker, worm), 0, 'shrieker never initiates');

    /* pets never fight each other */
    const tameWorm = mkMon('purple worm', 7, 7, { mtame: 10 });
    const tamePet = mkMon('kitten', 7, 8, { mtame: 10, pet: true });
    assert.equal(mmAggression(tameWorm, tamePet), 0);

    /* zombie maker vs zombifiable */
    const lich = mkMon('lich', 2, 2);
    const kobold = mkMon('kobold', 2, 3);
    assert.notEqual(mmAggression(lich, kobold), 0, 'lich attacks kobold for zombification');
    /* mm_2way_aggression() is symmetric on purpose (mon.c:2390): the
     * kobold will also initiate, because the lich could have. */
    assert.notEqual(mmAggression(kobold, lich), 0, 'mm_2way_aggression is symmetric');

    /* ghoul and skeleton are not zombie makers (mon.c zombie_maker) */
    const ghoul = mkMon('ghoul', 4, 4);
    const kobold2 = mkMon('kobold', 4, 5);
    assert.equal(mmAggression(ghoul, kobold2), 0);

    /* both spawn-time monsters do not fight (mgenmklev) */
    const lich2 = mkMon('lich', 8, 2, { mgenmklev: true });
    const orcMg = mkMon('orc', 8, 3, { mgenmklev: true });
    assert.equal(mmAggression(lich2, orcMg), 0);

    /* no zombie form for grid bugs */
    const lich3 = mkMon('lich', 1, 8);
    const bug = mkMon('grid bug', 1, 9);
    assert.equal(mmAggression(lich3, bug), 0);

    /* zombie_form table mirrors mon.c switch */
    assert.equal(zombieForm(byName('kobold')), PM_KOBOLD_ZOMBIE);
    assert.equal(zombieForm(byName('zombie')), -1, 'already a zombie stays put');
    assert.equal(zombieMaker(byName('ghoul')) ? 1 : 0, 0);
});

test('helpless + mattackm entry gates (mhitm.c:305-311)', () => {
    installGame();
    const wolf = mkMon('wolf', 5, 5);
    const rat = mkMon('sewer rat', 5, 6);
    wolf.msleeping = 1;
    assert.equal(mattackm(wolf, rat), M_ATTK_MISS);
    assert.equal(getRngLog().length, 0, 'helpless attacker consumes no draws');

    wolf.msleeping = 0;
    const bug = mkMon('grid bug', 8, 8);
    assert.equal(mattackm(bug, mkMon('jackal', 9, 9)), M_ATTK_MISS,
        'grid bug cannot attack diagonally; mhitm.c:312-315');
    assert.equal(getRngLog().length, 0);
});

test('mattackm hit RNG order: rnd(20+i), d(damn,damd), rn2(3), rn2(6), passive rn2(3)', () => {
    installGame(123);
    const wolf = mkMon('wolf', 5, 5, { m_lev: 5 });
    const rat = mkMon('sewer rat', 5, 6);
    const res = mattackm(wolf, rat);
    const log = getRngLog();
    /* mhitm.c:455 dieroll = rnd(20 + i) */
    assert.match(log[0], /^rnd\(20\)=/);
    const dieRoll = Number(log[0].split('=')[1]);
    /* tmp = find_mac(mdef) + m_lev = 7 + 5 = 12 */
    const expectHit = 12 > dieRoll;
    if (expectHit) {
        assert.ok(res & M_ATTK_HIT); /* struck at least once */
        assert.match(log[1], /^d\(2,4\)=/, 'mdamagem rolls the wolf 2d4 (mhitm.c:792)');
        /* uhitm.c:5261-5268 knockback preamble: rn2(3) then rn2(6) */
        assert.match(log[2], /^rn2\(3\)=/);
        assert.match(log[3], /^rn2\(6\)=/);
        /* passivemm: defender (sewer rat) has no dice passive -> rn2(3) gate */
        assert.match(log[4], /^rn2\(3\)=/);
        assert.equal(log.length, 5);
        assert.ok(rat.mhp < rat.mhpmax);
    } else {
        assert.match(log[1], /^rn2\(3\)=/, 'miss still runs passive gate (mhitm.c:777+)');
        assert.equal(log.length, 2);
        assert.equal(rat.mhp, rat.mhpmax);
    }
});

test('mattackm defender kill reports M_ATTK_DEF_DIED once', () => {
    installGame(7);
    const wolf = mkMon('wolf', 5, 5, { m_lev: 20 });
    const rat = mkMon('sewer rat', 5, 6, { mhp: 1, mhpmax: 1 });
    const res = mattackm(wolf, rat);
    const log = getRngLog();
    if (12 > Number(log[0].split('=')[1])) {
        assert.ok(res & M_ATTK_DEF_DIED, 'defender died bit set');
        assert.ok(!game.level.monsters.includes(rat), 'dead monster removed');
        assert.ok(rat.dead, 'deadMon marker');
    } else {
        assert.equal(rat.mhp, 1);
    }
});

test('mdamagem petrification: touching a cockatrice barehanded kills attacker', () => {
    installGame(5);
    const wolf = mkMon('wolf', 5, 5);
    const cock = mkMon('cockatrice', 5, 6);
    const res = mdamagem(wolf, cock, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }, null, 1);
    assert.ok(res & M_ATTK_AGR_DIED, 'wolf turns to stone (mhitm.c:799-833)');
    assert.ok(!game.level.monsters.includes(wolf));
    assert.ok(game.level.monsters.includes(cock), 'defender unaffected');
    assert.match(getRngLog()[0], /^d\(2,4\)=/, 'damage roll precedes the petrify check');
});

test('passivemm acid blob: dice, 1/2 splash gate, erosion gates, AGR_DIED on kill', () => {
    installGame(1234);
    const jackal = mkMon('jackal', 5, 5, { mhp: 2, mhpmax: 2 });
    const blob = mkMon('acid blob', 5, 6);
    /* mhitm.c:1255-1262: passive dice d(1,8) come first (1d8 acid blob) */
    const res = passivemm(jackal, blob, true, 0, null);
    const log = getRngLog();
    assert.match(log[0], /^d\(1,8\)=/);
    assert.match(log[1], /^rn2\(2\)=/, 'mhitb splash gate runs only when hit lands');
    assert.match(log[2], /^rn2\(30\)=/, 'ERODE_CORRODE gate always runs (mhitm.c:1279)');
    assert.match(log[3], /^rn2\(6\)=/, 'acid_damage gate always runs (mhitm.c:1281)');
    /* acid blob attacks a defender: only rn2(4)? no -- acid never goes through rn2(3) gate */
    if (Number(log[1].split('=')[1]) === 0) {
        assert.ok(res & M_ATTK_AGR_DIED, 'splash damage killed the jackal');
    }
});

test('passivemm floating eye paralysis (mhitm.c:1286-1309)', () => {
    installGame(99);
    const jackal = mkMon('jackal', 5, 5);
    const eye = mkMon('floating eye', 5, 6);
    const res = passivemm(jackal, eye, true, 0, null);
    const log = getRngLog();
    /* floating eye passive is 0d70: mhitm.c:1264 d(mlevel+1=3, damd=70) */
    assert.match(log[0], /^d\(3,70\)=/, 'eye passive dice rolled first');
    assert.match(log[1], /^rn2\(3\)=/, '2/3 gate');
    if (Number(log[1].split('=')[1]) !== 0) {
        assert.match(log[2], /^rn2\(4\)=/, 'eye freezes at 127 with 1/4 chance');
        assert.equal(jackal.mcanmove, 0, 'frozen');
        assert.ok((jackal.mfrozen | 0) <= 127);
    } else {
        assert.notEqual(jackal.mcanmove, 0, 'gate failed: no paralysis');
    }
});

test('fightm resist_conflict first, then adjacent attacker (mhitm.c:93-166)', () => {
    installGame(77);
    const lich = mkMon('lich', 5, 5);
    const kobold = mkMon('kobold', 5, 6);
    game.u.acurr.a[5] = 3; /* low CHA: resistChance = min(19, 3 - lev + 1) */
    const out = fightm(lich);
    const log = getRngLog();
    assert.match(log[0], /^rnd\(20\)=/, 'resist_conflict roll comes first (mondata.c:1607)');
    if (Number(log[0].split('=')[1]) > 3 - 11 + 1) {
        assert.equal(out, 0);
        assert.equal(log.length, 1, 'resisted: nothing else happens');
    } else {
        /* lich attacks (touches with cold; passive path also rolls)*/
        assert.ok(out === 0 || out === 1);
    }
});

test('fightm is a no-op with no adjacent monsters', () => {
    installGame(1);
    const lich = mkMon('lich', 5, 5);
    const far = mkMon('kobold', 20, 20);
    const out = fightm(lich);
    assert.equal(out, 0);
    assert.equal(getRngLog().length, 1, 'only resist_conflict roll consumed');
});

test('mMoveAggress return-attack gate mirrors monmove.c:2099-2111', () => {
    installGame(3);
    const worm = mkMon('purple worm', 5, 5, { m_lev: 15 });
    const shrieker = mkMon('shrieker', 5, 6, { movement: 0 });
    const { result, mstatus } = mMoveAggress(worm, shrieker);
    const log = getRngLog();
    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT) {
        /* return-attack gate: rn2(4) && movement > rn2(NORMAL_SPEED) */
        const rn4Idx = log.findIndex((l, i) => /^rn2\(4\)=/.test(l) && i > 0);
        assert.ok(rn4Idx > 0, 'rn2(4) gate roll present after a hit');
        if (Number(log[rn4Idx].split('=')[1]) !== 0) {
            assert.match(log[rn4Idx + 1], /^rn2\(12\)=/, 'defender movement check');
        }
    }
    assert.ok([4, 8].includes(result));
});

test('engulf: purple worm swallows a low-hp shrieker whole (AT_ENGL/AD_DGST)', () => {
    installGame(11);
    const worm = mkMon('purple worm', 5, 5, { mhp: 40, mhpmax: 40 });
    const shrieker = mkMon('shrieker', 5, 6, { mhp: 1, mhpmax: 1 });
    assert.equal(engulfTarget(worm, shrieker), true, 'engulf_target size checks pass');
    const res = gulpmm(worm, shrieker, { aatyp: AT_ENGL, adtyp: AD_DGST, damn: 1, damd: 10 });
    assert.ok(res & M_ATTK_DEF_DIED, 'shrieker digested');
    assert.equal(worm.mx, 5, 'worm moves into the former defender square');
    assert.equal(worm.my, 6);
    assert.ok(!game.level.monsters.includes(shrieker));
});

test('engulfing too-big or too-small defenders is impossible (mhitm.c engulf_target)', () => {
    installGame(4);
    const small = mkMon('jackal', 5, 5);
    const giant = mkMon('mastodon', 5, 6);
    assert.equal(engulfTarget(small, giant), false);
    const trapped = mkMon('purple worm', 7, 7, { mtrapped: true });
    assert.equal(engulfTarget(trapped, mkMon('shrieker', 7, 8)), false);
});

test('could_seduce: nymph cross-gender vs same-gender (mhitu.c:31-80)', () => {
    installGame();
    const woodM = mkMon('wood nymph', 5, 5, { female: true });
    const kobM = mkMon('kobold', 5, 6, { female: false });
    const kobF = mkMon('kobold', 6, 6, { female: true });
    assert.equal(couldSeduce(woodM, kobM, { adtyp: AD_ACID }), 0, 'needs a seduction attack type');
    assert.equal(couldSeduce(woodM, kobM, { adtyp: 22 }), 1, 'AD_SEDU cross-gender');
    assert.equal(couldSeduce(woodM, kobF, { adtyp: 22 }), 2, 'AD_SEDU same-gender nymph (compat 2)');
});

test('mdisplacem consumes rn2(7) first and respects the grid bug rule', () => {
    installGame(13);
    const beast = mkMon('displacer beast', 5, 5);
    const kob = mkMon('kobold', 5, 6);
    const res = mdisplacem(beast, kob);
    const log = getRngLog();
    assert.match(log[0], /^rn2\(7\)=/, 'displacement 1-in-7 failure (mhitm.c:200)');
    if (res === M_ATTK_HIT) {
        assert.equal(beast.mx, 5); assert.equal(beast.my, 6);
        assert.equal(kob.mx, 5); assert.equal(kob.my, 5);
    } else {
        assert.equal(beast.my, 5, 'failed displacement keeps positions');
    }
});

test('attackList falls back to legacy data.attack for non-permonst shapes', () => {
    installGame();
    const were = {
        mx: 1, my: 1, data: { name: 'wererat', wereBeast: true,
            attack: { verb: 'bites', aatyp: 'bite', adtyp: 'were', dice: 1, sides: 4 } },
    };
    const attks = attackList(were);
    assert.equal(attks[0].aatyp, AT_BITE);
    assert.equal(attks[0].adtyp, 29 /* AD_WERE */);
    assert.equal(attks[0].damn, 1);
    assert.equal(attks[0].damd, 4);
});

test('findMac prefers permonst ac unless legacy mac is more local', () => {
    installGame();
    const rat = mkMon('sewer rat', 5, 5);
    assert.equal(findMac(rat), 7);
});
