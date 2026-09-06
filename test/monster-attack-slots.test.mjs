import { W_ARMG } from '../js/const.js';
import { W_AMUL, W_ARMC, PROTECTION } from '../js/const.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as cmd from '../js/cmd.js';
import { processMonsterTurns } from '../js/allmain.js';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { monsterByRndName } from '../js/mklev.js';
import { ROOM, COULD_SEE, IN_SIGHT, W_WEP } from '../js/const.js';
import { vision_reset } from '../js/vision.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function setup(name = 'high cleric', seed = 42, width = 800) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { flags: {}, context: {}, inventory: [], moves: 100,
        level: new GameMap(), nhDisplay: { cols: width },
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 200, uhpmax: 200, uac: 10, uhunger: 800,
            acurr: { a: [14, 14, 14, 14, 14, 14] } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset();
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const mon = { data: monsterByRndName(name) || { name }, m_id: 50, mx: 11, my: 10, mux: 10, muy: 10,
        m_lev: 20, mhp: 100, mhpmax: 100, mcansee: true, mcanmove: true,
        minvent: [], movement: 12, mcan: true };
    g.level.monsters.push(mon); return { g, mon };
}

async function drain(g) {
    for (let i = 0; i < 40 && (g._monster_attack_continuation || g._message_more); i++) {
        if (g._command_mode) break;
        await cmd.rhack(' ');
    }
}

for (const name of ['high cleric', 'master lich', 'gnomish wizard']) test(`${name}: canonical spell slots survive failed contact attacks`, async () => {
    const { g, mon } = setup(name); g.u.uac = -100; mon.m_lev = 1;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    const calls = getRngLog().map(e => e.split('=')[0]);
    assert.ok(calls.includes('rn2(1)'), 'castmu selection occurs after contact miss');
    assert.equal(g.u.uhp, 200); assert.equal(g._monster_attack_continuation, null);
    const contactRolls = calls.filter(e => /^rnd\(2[01]\)$/.test(e));
    assert.equal(contactRolls.length, name === 'high cleric' ? 2 : name === 'master lich' ? 1 : 0);
});

test('wielding spends only the weapon slot; the priest still kicks and casts', async () => {
    const { g, mon } = setup();
    const weapon = { cls: 'weapon', kind: 'mace', quan: 1, spe: 0 }; mon.minvent = [weapon];
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    assert.equal(mon.mw, weapon); assert.equal(weapon.owornmask, W_WEP);
    const calls = getRngLog().map(e => e.split('=')[0]);
    assert.equal(calls.includes('rnd(20)'), false); assert.ok(calls.includes('rnd(21)'));
    assert.ok(calls.includes('rn2(20)')); assert.ok(g.u.uhp < 200);
});

for (const name of ['high cleric', 'master lich']) test(`${name}: More suspension preserves all attack RNG and damage`, async () => {
    let { g, mon } = setup(name); mon.mcan = false; mon.mspec_used = 3;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    const expected = { hp: g.u.uhp, rng: [...getRngLog()] };
    ({ g, mon } = setup(name, 42, 55)); mon.mcan = false; mon.mspec_used = 3;
    g._pending_message = 'A long existing message fills the top line.';
    await cmd.runMonsterAttackTurn(mon);
    assert.ok(g._monster_attack_continuation); assert.equal(g.u.uhp, 200);
    await drain(g);
    assert.deepEqual(getRngLog(), expected.rng); assert.equal(g.u.uhp, expected.hp);
    assert.equal(g._monster_attack_continuation, null);
});

test('life saving resumes the next priest attack without replaying the first hit', async () => {
    const { g, mon } = setup(); g.u.uhp = 1;
    const amulet = { cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 };
    g.inventory.push(amulet);
    await cmd.runMonsterAttackTurn(mon);
    await drain(g);
    assert.equal(g._command_mode, 'lifeSavingMore'); assert.equal(g.inventory.includes(amulet), false);
    assert.equal(getRngLog().some(e => e.startsWith('rnd(21)=')), false);
    await cmd.rhack(' '); await drain(g);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(20)=')).length, 1);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(21)=')).length, 1);
    assert.equal(g._monster_attack_continuation, null); assert.ok(g.u.uhp > 0);
});

test('movement during an interrupted attack invalidates remaining source slots', async () => {
    const { g, mon } = setup('high cleric', 42, 55);
    g._pending_message = 'A long existing message fills the top line.';
    await cmd.runMonsterAttackTurn(mon); g.u.ux++;
    await drain(g);
    assert.equal(getRngLog().some(e => e.startsWith('rnd(21)=')), false);
    assert.equal(getRngLog().some(e => e.startsWith('rn2(20)=')), false);
});

test('the live monster sweep uses pure magic slots without inventing a contact attack', async () => {
    const { g, mon } = setup('gnomish wizard'); mon.m_lev = 1;
    await processMonsterTurns(); await drain(g);
    assert.equal(getRngLog().some(e => e.startsWith('rnd(20)=')), false);
    assert.ok(getRngLog().some(e => e.startsWith('rn2(1)=')));
    assert.equal(g.u.uhp, 200);
});

for (const rescue of ['amulet', 'wizard']) test(`cold potion destruction resumes before exercise and the next item after ${rescue} rescue`, async () => {
    const { g, mon } = setup('master lich'); mon.mcan = false; mon.m_lev = 100; mon.mspec_used = 3; g.u.uhp = 1;
    g.flags.debug = rescue === 'wizard';
    const potion = { cls: 'potion', kind: 'pink potion', potionIndex: 0, quan: 20, letter: 'b' };
    g.inventory.push(potion);
    if (rescue === 'amulet') g.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    await cmd.runMonsterAttackTurn(mon);
    await drain(g);
    assert.equal(g._command_mode, rescue === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
    assert.equal(g._monster_attack_continuation.phase, 'effect');
    assert.equal(g._monster_attack_continuation.effect.phase, 'exercise');
    assert.equal(g._monster_attack_continuation.effect.index, 1);
    const potionQuantity = potion.quan;
    const before = [...getRngLog()];
    assert.equal(before.some(e => e.startsWith('rn2(2)=')), false, 'no strength exercise before losehp returns');
    await cmd.rhack(' ');
    if (rescue === 'wizard') { assert.equal(g._command_mode, 'wizardDieConfirm'); await cmd.rhack('n'); }
    await drain(g);
    assert.equal(potion.quan, potionQuantity);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(4)=')).length, 1);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(20)=')).length, 1);
    assert.equal(g._monster_attack_continuation, null);
    assert.ok(g.u.uhp > 0);
});

test('synchronous slot completion does not skip the same monster on its next scheduled turn', async () => {
    const { g, mon } = setup('gnomish wizard'); mon.m_lev = 1; g.u.umovement = 12;
    await processMonsterTurns(); await drain(g);
    assert.equal(g._monster_resume_index || 0, 0);
    const before = getRngLog().filter(e => e.startsWith('rn2(1)=')).length;
    mon.movement = 12; g.u.umovement = 12; g._pending_message = '';
    await processMonsterTurns(); await drain(g);
    assert.equal(getRngLog().filter(e => e.startsWith('rn2(1)=')).length, before + 1);
});

test('physical weapon damage preserves both inner and outer negative-AC rolls', async () => {
    const { g, mon } = setup('wizard'); g.u.uac = -10; mon.m_lev = 100;
    mon.mw = { cls: 'weapon', kind: 'mace', quan: 1, spe: 0, owornmask: W_WEP }; mon.minvent = [mon.mw];
    g.coreCtx.r = Array(100).fill(0n); g.coreCtx.n = 100;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(10)=')).length, 3,
        'mattacku AC_VALUE, mhitm_ad_phys pudding calculation even for human, then hitmu reduction');
});

test('a successful slot can shorten sleep before later attacks', async () => {
    const { g, mon } = setup('wizard'); mon.m_lev = 100;
    g.u.usleep = 99; g._sleeping_time = 5; g._helpless_time = 5;
    g.coreCtx.r = Array(100).fill(0n); g.coreCtx.n = 100;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g._helpless_time, 1); assert.equal(g.multi, -1);
    assert.equal(g._wake_message, 'The combat suddenly awakens you.');
});

for (const protection of [1, 2, 3]) test(`hero magic cancellation includes source protection MC${protection}`, async () => {
    const { g, mon } = setup('master lich'); mon.mcan = false; mon.m_lev = 100; mon.mspec_used = 3;
    if (protection === 1) { g.u.HProtection = 1; g.u.ublessed = 1; }
    else {
        g.inventory.push({ cls: 'amulet', kind: 'amulet of guarding', amuletIndex: 9, owornmask: W_AMUL });
        g.u.uprops = { [PROTECTION]: { extrinsic: W_AMUL } };
        if (protection === 3) g.inventory.push({ otyp: 10063, owornmask: W_ARMC }); // canonical JS robe type, no display-name fields
    }
    const values = [0n, 0n, 0n, 0n, BigInt(protection * 3 - 1), ...Array(100).fill(0n)];
    g.coreCtx.r = values.reverse(); g.coreCtx.n = values.length;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g.u.uhp, 200); assert.match(g._pending_message, /avoid harm/);
    assert.equal(getRngLog().some(e => e.startsWith('rn2(20)=')), false);
});

test('worn gauntlets of power add their source weapon-damage roll', async () => {
    const { g, mon } = setup('wizard'); mon.m_lev = 100;
    mon.mw = { cls: 'weapon', kind: 'mace', quan: 1, spe: 0, owornmask: W_WEP };
    mon.minvent = [mon.mw, { cls: 'armor', kind: 'gauntlets of power', owornmask: W_ARMG }];
    g.coreCtx.r = Array(100).fill(0n); g.coreCtx.n = 100;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    assert.equal(getRngLog().filter(e => e.startsWith('rn2(4)=')).length, 1);
    assert.equal(g.u.uhp, 194);
});

test('mdamageu contact damage does not emit the losehp low-health warning', async () => {
    const { g, mon } = setup('wizard'); mon.m_lev = 100; g.u.uhp = 10; g._startup_role = 'Wizard';
    g.coreCtx.r = Array(100).fill(0n); g.coreCtx.n = 100;
    await cmd.runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g.u.uhp, 9); assert.doesNotMatch(g._pending_message, /life force|CwnAnnwn|Banshee/);
});

for (const occupation of ['_pick_lock_occupation', '_force_lock_occupation', '_pick_dig_occupation', '_tin_opening_occupation'])
    test(`hitmu stops ${occupation} without spending an extra action`, async () => {
        const { g, mon } = setup('wizard'); mon.m_lev = 100;
        g[occupation] = { turns: 2, action: 'picking the lock' };
        g.coreCtx.r = Array(100).fill(0n); g.coreCtx.n = 100;
        await cmd.runMonsterAttackTurn(mon); await drain(g);
        assert.equal(g[occupation], null); assert.match(g._pending_message, /You stop /);
        assert.equal(g.moves, 100);
    });

for (const width of [70, 800]) test(`life-saving recovery follows the visible death message at width ${width}`, async () => {
    const { g, mon } = setup('high cleric', 42, width); g.u.uhp = 1;
    g.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    await cmd.runMonsterAttackTurn(mon);
    assert.equal(g._command_mode || null, null, 'tty puts death on its own line even when it would fit');
    assert.doesNotMatch(g._pending_message, /You die/);
    await cmd.rhack(' ');
    assert.equal(g._command_mode, 'lifeSavingMore'); assert.match(g._pending_message, /You die.*medallion/s);
    await cmd.rhack(' '); await drain(g);
    assert.ok(g.u.uhp > 0); assert.equal(g._monster_attack_continuation, null);
    assert.doesNotMatch([g._pending_message, g._topline_after_more,
        ...(g._queued_messages_after_more || []).map(e => e.text)].join(' '), /You die/);
});
