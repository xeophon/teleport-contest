import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, applyHeroElectricInventoryDamage } from '../js/cmd.js';
import { moveloop_core, processMonsterTurns } from '../js/allmain.js';
import { castSpellNodirEffect } from '../js/spell.js';
import { initRng } from '../js/rng.js';
import { resetInputState } from '../js/input.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { findAc } from '../js/do_wear.js';
import { armorBonus } from '../js/armor.js';
import { PM_STONE_GOLEM, PM_GOLD_DRAGON } from '../js/permonst.js';
import { ROOM, W_ARM, W_ARMC, W_ARMH, W_ARMF, W_ARMS, W_ARMG, W_ARMU, W_AMUL,
    W_WEP, W_RINGL, W_RINGR, PROTECTION, INTRINSIC, FROMOUTSIDE, I_SPECIAL } from '../js/const.js';

function setup() {
    resetGame(); initRng(73); resetInputState();
    game.moves = 100; game.context = {}; game.flags = { pickup: false };
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 100, uhpmax: 100, uen: 50, uenmax: 50, uhunger: 900, uac: 10,
        acurr: { a: [12, 12, 12, 12, 12, 12] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.inventory = []; vision_reset(); vision_recalc();
}

async function remove(item) {
    game._command_mode = 'takeOffObject'; game._pending_message = ''; game._message_more = 0;
    await rhack(item.letter);
    if (!game._armor_wear_occupation) return;
    game._pending_time_passed = 8;
    try { await moveloop_core(); }
    catch (error) { if (!/Input queue empty/.test(error.message)) throw error; }
    resetInputState();
    for (let i = 0; game._message_more && i < 12; i++) await rhack(' ');
}

for (const spe of [110, -110]) test(`ring AC saturation retains the ${spe} source through both removals`, async () => {
    setup();
    const rings = [spe, spe > 0 ? 20 : -20].map((value, i) => ({ id: i + 1, letter: 'ab'[i],
        cls: 'ring', kind: 'ring of protection', spe: value, quan: 1, dknown: true }));
    game.inventory.push(...rings);
    for (const [i, hand] of ['l', 'r'].entries()) {
        await rhack('P'); await rhack(rings[i].letter); await rhack(hand);
        assert.equal(game.u.uac, spe > 0 ? -99 : 99);
    }
    await remove(rings[1]); assert.equal(game.u.uac, spe > 0 ? -99 : 99);
    await remove(rings[0]); assert.equal(game.u.uac, 10);
});

for (const command of ['W', 'P']) test(`${command} counts corrosion when armor is equipped and later removed`, async () => {
    setup(); const armor = { id: 1, letter: 'a', cls: 'armor', kind: 'leather armor',
        spe: 3, oeroded: 1, oeroded2: 3, quan: 1 };
    game.inventory.push(armor);
    await rhack(command); await rhack('a');
    game._pending_time_passed = 1;
    try { await moveloop_core(); }
    catch (error) { if (!/Input queue empty/.test(error.message)) throw error; }
    resetInputState();
    assert.equal(game.u.uac, 7);
    await remove(armor); assert.equal(game.u.uac, 10);
});

test('guarding amulet grants and removes its fixed two AC points through live commands', async () => {
    setup(); const amulet = { id: 1, letter: 'a', cls: 'amulet', kind: 'amulet of guarding',
        amuletIndex: 9, quan: 1 };
    game.inventory.push(amulet);
    await rhack('P'); await rhack('a'); assert.equal(game.u.uac, 8);
    await remove(amulet); assert.equal(game.u.uac, 10);
});

test('protection ring recalculation retains intrinsic, spell and current-form armor', async () => {
    setup(); game.u._polyself_form = { name: 'stone golem', mac: 5 };
    game.u.uprops = { [PROTECTION]: { intrinsic: INTRINSIC, extrinsic: 0 } };
    game.u.ublessed = 3; game.u.uspellprot = 4; game.u.uac = -2;
    const obj = { id: 1, letter: 'a', cls: 'ring', kind: 'ring of protection', spe: 120, quan: 1 };
    game.inventory.push(obj);
    await rhack('P'); await rhack('a'); await rhack('l'); assert.equal(game.u.uac, -99);
    await remove(obj); assert.equal(game.u.uac, -2);
});

test('electrical charged-ring destruction recomputes from remaining gear beyond the AC cap', async () => {
    setup();
    const armor = { id: 1, letter: 'a', cls: 'armor', kind: 'gray dragon scale mail',
        spe: 110, quan: 1, worn: true, owornmask: W_ARM };
    const ring = { id: 2, letter: 'b', cls: 'ring', kind: 'ring of protection',
        spe: 2, quan: 1, worn: 'left', owornmask: W_RINGL };
    game.inventory.push(armor, ring); game.u.uarm = armor; game.u.uleft = ring;
    game.u.uprops = { [PROTECTION]: { intrinsic: 0, extrinsic: W_RINGL } }; game.u.uac = -99;
    game.coreCtx = { n: 100, r: Array(100).fill(0n), m: [], a: 0n, b: 0n, c: 0n };
    game.rng.core = game.coreCtx;
    await applyHeroElectricInventoryDamage({ damage: 5 }, []);
    assert.equal(game.u.uac, -99); assert.equal(game.inventory.includes(ring), false);
    initRng(73);
    await remove(armor); assert.equal(game.u.uac, 10);
});

test('find_ac combines all seven armor slots, both rings, guarding, intrinsic and spell protection', () => {
    setup();
    const armor = [
        ['plate mail', W_ARM, 2, 1, 3], ['cloak of protection', W_ARMC, -1, 2, 0],
        ['dwarvish iron helm', W_ARMH, 1, 3, 0], ['iron shoes', W_ARMF, 0, 1, 0],
        ['large shield', W_ARMS, 3, 0, 2], ['leather gloves', W_ARMG, -2, 3, 0],
        ['t-shirt', W_ARMU, 4, 0, 3],
    ].map(([kind, owornmask, spe, oeroded, oeroded2]) => ({ kind, owornmask, spe, oeroded, oeroded2, cls: 'armor' }));
    game.inventory.push(...armor, { cls: 'ring', kind: 'ring of protection', owornmask: W_RINGL, spe: 2 },
        { cls: 'ring', ringRoll: 6, owornmask: W_RINGR, spe: -4 },
        { cls: 'amulet', amuletIndex: 9, owornmask: W_AMUL });
    game.u.uarm = armor[0];
    game.u.ublessed = 3; game.u.uspellprot = 4;
    game.u.uprops = { [PROTECTION]: { intrinsic: FROMOUTSIDE, extrinsic: W_RINGL | W_RINGR } };
    assert.equal(findAc(), -10); assert.equal(game.disp.botl, true);
    game.disp.botl = false; assert.equal(findAc(), -10); assert.equal(game.disp.botl, false);
});

for (const [mask, expected] of [[0, 10], [1, 10], [I_SPECIAL, 10], [FROMOUTSIDE, 5], [INTRINSIC, 5]]) {
    test(`blessed protection requires a persistent intrinsic source: mask=${mask}`, () => {
        setup(); game.u.ublessed = 5; game.u.uprops = { [PROTECTION]: { intrinsic: mask, extrinsic: W_RINGL } };
        assert.equal(findAc(), expected);
    });
}

for (const [umonnum, form, expected] of [[PM_STONE_GOLEM, null, 5], [PM_GOLD_DRAGON, null, -1],
    [PM_STONE_GOLEM, { name: 'gold dragon', mac: 99 }, -1], [undefined, null, 10]]) {
    test(`natural AC comes from current species ${form?.name || umonnum || 'human'}`, () => {
        setup(); Object.assign(game.u, { umonnum, _polyself_form: form, uac: 80 });
        assert.equal(findAc(), expected);
    });
}

for (const [kind, spe, erosion, corrosion, expected] of [
    ['leather gloves', 5, 0, 0, 6], ['leather gloves', 5, 3, 0, 5],
    ['plate mail', 2, 1, 3, 6], ['plate mail', 2, 3, 1, 6],
    ['t-shirt', -3, 3, 3, -3], ['cloak of protection', -2, 2, 3, -2],
]) test(`ARM_BONUS preserves enchantment for ${kind} ${spe}/${erosion}/${corrosion}`, () => {
    assert.equal(armorBonus({ kind, spe, oeroded: erosion, oeroded2: corrosion }), expected);
});

test('wielded armor, carried protection and non-guarding amulets do not change AC', () => {
    setup(); game.inventory.push({ cls: 'armor', kind: 'plate mail', owornmask: W_WEP, worn: true },
        { cls: 'ring', kind: 'ring of protection', spe: 9 },
        { cls: 'amulet', amuletIndex: 10, owornmask: W_AMUL });
    assert.equal(findAc(), 10);
});

for (const [spe, expected] of [[108, -98], [109, -99], [110, -99], [-88, 98], [-89, 99], [-90, 99]]) {
    test(`find_ac clamps at the source boundary for ring enchantment ${spe}`, () => {
        setup(); game.inventory.push({ cls: 'ring', kind: 'ring of protection', spe, owornmask: W_RINGL });
        assert.equal(findAc(), expected);
    });
}

test('casting protection preserves armor-class saturation while adding the full timed source', async () => {
    setup(); game.u.uac = -99;
    game.inventory.push({ cls: 'armor', kind: 'gray dragon scale mail', spe: 110, owornmask: W_ARM });
    await castSpellNodirEffect({ name: 'protection' }, {
        heroIsBlind: () => false, heroProtectionAtmosphere: () => 'air', spellRoleSkillLevel: () => 4,
    });
    assert.equal(game.u.uspellprot, 4); assert.equal(game.u.uac, -99);
    assert.equal(game.u.usptime, 20); assert.equal(game.u.uspmtime, 20);
});

for (const [blind, invulnerable, protection, timeout, expectedProtection, expectedTime] of [
    [false, false, 2, 1, 1, 20], [true, false, 1, 1, 0, 20],
    [false, true, 2, 1, 2, 1], [false, false, 2, 2, 2, 1], [false, false, 0, 1, 0, 0],
]) test(`protection decay follows nh_timeout: blind=${blind} invulnerable=${invulnerable} protection=${protection} time=${timeout}`, async () => {
    setup(); Object.assign(game.u, { blind, uinvulnerable: invulnerable,
        uspellprot: protection, usptime: timeout, uspmtime: 20, uac: 10 - protection });
    await processMonsterTurns();
    assert.equal(game.u.uspellprot, expectedProtection); assert.equal(game.u.usptime, expectedTime);
    assert.equal(game.u.uac, 10 - expectedProtection);
    const message = [game._pending_message, game._topline_after_more, game._queued_message_after_more].join('  ');
    if (!blind && expectedProtection !== protection) assert.match(message, /golden haze.*becomes less dense/);
    else assert.doesNotMatch(message, /haze/);
});

test('protection decay checks blindness before the same turn restores sight', async () => {
    setup(); Object.assign(game.u, { blind: true, _blindTimeout: 1, uspellprot: 1, usptime: 1, uspmtime: 10, uac: 9 });
    await processMonsterTurns();
    assert.equal(game.u.uspellprot, 0); assert.equal(game.u.blind, false); assert.equal(game.u.uac, 10);
    assert.doesNotMatch([game._pending_message, game._topline_after_more].join('  '), /haze/);
});

test('confused enchant armor repairs both erosion fields without losing AC overflow', async () => {
    setup(); game.u.confused = true; game.u._confusionTimeout = 5; game.u.uac = -99;
    const armor = { id: 1, letter: 'a', cls: 'armor', kind: 'plate mail', spe: 110,
        oeroded: 1, oeroded2: 3, worn: true, owornmask: W_ARM };
    game.inventory.push(armor, { id: 2, letter: 'b', cls: 'scroll', kind: 'scroll of enchant armor', scrollIndex: 0, quan: 1 });
    await rhack('r'); await rhack('b');
    assert.equal(armor.oeroded, 0); assert.equal(armor.oeroded2, 0); assert.equal(game.u.uac, -99);
});

test('polymorph and return to human recompute current protection rings rather than restoring cached AC', async () => {
    setup(); game.flags.debug = true;
    const ring = { id: 1, letter: 'a', cls: 'ring', kind: 'ring of protection', spe: 2, quan: 1,
        worn: 'left', owornmask: W_RINGL };
    game.inventory.push(ring); game.u.uleft = ring; game.u.uac = 8;
    for (const [name, expected] of [['stone golem', 3], ['human', 8]]) {
        game._command_mode = null; game._pending_message = ''; game._message_more = 0;
        await rhack('#'); for (const ch of 'polyself') await rhack(ch); await rhack('\n');
        for (const ch of name) await rhack(ch.charCodeAt(0)); await rhack('\n');
        assert.equal(game.u._polyself_form?.name || 'human', name);
        assert.equal(game.u.uac, expected);
    }
});

for (const [name, beastAc] of [['wererat', 6], ['werejackal', 7], ['werewolf', 4]]) {
    for (const beast of [false, true]) test(`${name} AC distinguishes canonical ${beast ? 'beast' : 'human'} form`, () => {
        setup(); game.u._polyself_form = { name, wereBeast: beast, wereHuman: !beast };
        assert.equal(findAc(), beast ? beastAc : 10);
    });
}

test('spell-protection decay suppresses repeated source Norep feedback', async () => {
    setup(); Object.assign(game.u, { uspellprot: 2, usptime: 1, uspmtime: 10, uac: 8 });
    game._norep_prevmsg = 'The golden haze around you becomes less dense.';
    await processMonsterTurns();
    assert.equal(game.u.uspellprot, 1); assert.equal(game.u.uac, 9);
    assert.doesNotMatch([game._pending_message, game._topline_after_more].join('  '), /haze/);
});

test('recharging a worn protection ring preserves armor overflow then reveals the new bonus after takeoff', async () => {
    setup();
    const armor = { id: 1, letter: 'a', cls: 'armor', kind: 'gray dragon scale mail',
        spe: 110, quan: 1, worn: true, owornmask: W_ARM };
    const ring = { id: 2, letter: 'b', cls: 'ring', kind: 'ring of protection',
        spe: 2, quan: 1, worn: 'left', owornmask: W_RINGL };
    game.inventory.push(armor, ring); game.u.uarm = armor; game.u.uleft = ring;
    game.u.uprops = { [PROTECTION]: { intrinsic: 0, extrinsic: W_RINGL } }; game.u.uac = -99;
    const raw = [0, 1, 6, ...Array(97).fill(0)].map(BigInt);
    game.coreCtx = { n: 100, r: raw.reverse(), m: [], a: 0n, b: 0n, c: 0n }; game.rng.core = game.coreCtx;
    await applyHeroElectricInventoryDamage({ damage: 5 }, []);
    assert.equal(ring.spe, 3); assert.equal(game.u.uac, -99); assert.equal(game.u.uleft, ring);
    initRng(73); await remove(armor); assert.equal(game.u.uac, 7);
    await remove(ring); assert.equal(game.u.uac, 10);
});
