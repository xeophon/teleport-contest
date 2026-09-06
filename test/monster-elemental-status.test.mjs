import assert from 'node:assert/strict';
import test from 'node:test';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { monsterByRndName } from '../js/mklev.js';
import { monsterCastSpell, runMonsterAttackTurn, rhack } from '../js/cmd.js';
import { supportsMonsterAttackSlots } from '../js/mhitu.js';
import { processMonsterTurns } from '../js/allmain.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { vision_reset } from '../js/vision.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, POOL, ICE, HEADSTONE, COULD_SEE, IN_SIGHT, M_SEEN_MAGR, M_SEEN_COLD,
    FREE_ACTION, W_RINGL, W_WEP, W_ARMG } from '../js/const.js';
import { AT_MAGC, AD_MAGM, AD_COLD, AD_CONF, AD_PLYS, AD_STUN } from '../js/permonst.js';

function setup(name = 'Angel', width = 800) {
    const g = resetGame(); initRng(42); enableRngLog();
    Object.assign(g, { flags: {}, context: {}, inventory: [], moves: 100,
        level: new GameMap(), nhDisplay: { cols: width },
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 200, uhpmax: 200, uac: 10, uhunger: 800,
            acurr: { a: [14, 14, 14, 14, 14, 14] } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset(); g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const mon = { data: monsterByRndName(name) || { name }, m_id: 50, mx: 11, my: 10, mux: 10, muy: 10,
        m_lev: 20, mhp: 100, mhpmax: 100, mcansee: true, mcanmove: true, minvent: [], movement: 12 };
    g.level.monsters.push(mon);
    return { g, mon };
}
function rolls(g, values = []) {
    const all = [...values.map(BigInt), ...Array(200).fill(0n)];
    g.coreCtx.r = all.reverse(); g.coreCtx.n = all.length;
}
function calls() { return getRngLog().map(line => line.split('=')[0]); }
async function drain(g) {
    for (let i = 0; i < 80 && (g._monster_attack_continuation || g._monster_spell_continuation
        || g._message_more || g._queued_messages_after_more?.length); i++) {
        if (g._command_mode) break;
        await rhack(' ');
    }
}
const magic = { aatyp: AT_MAGC, adtyp: AD_MAGM, damn: 2, damd: 6 };
const frost = { aatyp: AT_MAGC, adtyp: AD_COLD, damn: 6, damd: 6 };

// castmu(mcastu.c:154-211): elemental attacks neither select spells nor set cooldown.
for (const [attack, remembered] of [[magic, M_SEEN_MAGR], [frost, M_SEEN_COLD]]) {
    for (const gate of ['mcan', 'mspec_used', 'm_seenres']) test(`elemental ${attack.adtyp} respects ${gate} before any roll`, async () => {
        const { g, mon } = setup(); mon[gate] = gate === 'm_seenres' ? remembered : 1;
        assert.equal(await monsterCastSpell(mon, { attack }), false);
        assert.deepEqual(calls(), []); assert.equal(g.u.uhp, 200);
    });
    test(`elemental ${attack.adtyp} wrong target consumes no cooldown or damage rolls`, async () => {
        const { g, mon } = setup(); mon.mux = 9;
        assert.equal(await monsterCastSpell(mon, { attack, found: false }), false);
        assert.deepEqual(calls(), []); assert.equal(mon.mspec_used || 0, 0);
        assert.match(g._pending_message, /thin air/);
    });
}
for (const halfSpellDamage of [false, true]) test(`magic missiles reroll damage after base spell reduction: half=${halfSpellDamage}`, async () => {
    const { g, mon } = setup(); g.u.halfSpellDamage = halfSpellDamage; rolls(g, [99]);
    await monsterCastSpell(mon, { attack: magic }); await drain(g);
    assert.deepEqual(calls(), ['rn2(200)', 'd(12,6)', 'd(11,6)']);
    // mcastu.c:293 replaces dmg AFTER the common Half_spell_damage operation.
    assert.equal(g.u.uhp, 189); assert.equal(mon.mspec_used || 0, 0);
    assert.match(g._pending_message, /shower of missiles/);
});

test('antimagic still rolls initial damage and scuffs even a protected headstone', async () => {
    const { g, mon } = setup(); g.u.antimagic = true; rolls(g, [99]);
    const engr = { x: 10, y: 10, text: 'Elbereth', type: HEADSTONE }; g.level.engravings = [engr];
    await monsterCastSpell(mon, { attack: magic }); await drain(g);
    assert.deepEqual(calls(), ['rn2(200)', 'd(12,6)', 'd(6,6)']);
    assert.equal(g.u.uhp, 200); assert.equal(engr.text, 'Elbereth'); assert.ok(mon.m_seenres & M_SEEN_MAGR);
    assert.match(g._pending_message, /missiles bounce off/);
});

test('resisted frost freezes terrain but preserves carried and floor potions', async () => {
    const { g, mon } = setup('Asmodeus'); g.u.coldResistance = true; rolls(g, [99]);
    g.level.at(10, 10).typ = POOL;
    const carried = { cls: 'potion', kind: 'pink potion', potionIndex: 0, quan: 20 };
    const floor = { ...carried, ox: 10, oy: 10 };
    g.inventory.push(carried); g.level.objects.push(floor);
    await monsterCastSpell(mon, { attack: frost }); await drain(g);
    assert.deepEqual(calls().slice(0, 2), ['rn2(200)', 'd(16,6)']);
    assert.equal(calls().some(call => call === 'rnd(4)'), false);
    assert.equal(g.level.at(10, 10).typ, ICE); assert.equal(g.u.uhp, 200);
    assert.equal(carried.quan, 20); assert.equal(floor.quan, 20); assert.ok(mon.m_seenres & M_SEEN_COLD);
});

for (const attack of [magic, frost]) test(`elemental ${attack.adtyp} survives saved More without repeating damage`, async () => {
    let { g, mon } = setup(); rolls(g, [99]);
    await monsterCastSpell(mon, { attack }); await drain(g);
    const expected = { hp: g.u.uhp, rng: [...getRngLog()] };
    ({ g, mon } = setup('Angel', 55)); rolls(g, [99]); g._pending_message = 'The previous attack occupies this line.';
    await monsterCastSpell(mon, { attack });
    assert.deepEqual(calls(), ['rn2(200)'], 'cast pline suspends before base damage');
    const { coreCtx, displayCtx, rng, nhDisplay } = g;
    restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
    await drain(g); assert.equal(g.u.uhp, expected.hp); assert.deepEqual(getRngLog(), expected.rng);
    assert.equal(g._monster_spell_continuation, null);
});

// Start at a real canonical slot, preserving all subsequent slots. This isolates
// the effect's RNG while testing the owning resumable attack driver.
async function fromSlot(g, mon, adtyp) {
    const { pmOf } = await import('../js/mhitm.js');
    const index = pmOf(mon).attacks.findIndex(attack => attack.adtyp === adtyp);
    assert.ok(index >= 0);
    g._monster_attack_continuation = { mon, phase: 'slot', index, toHit: 100,
        firstX: 10, firstY: 10, firstFound: true, hits: [] };
    await runMonsterAttackTurn(mon); await drain(g);
}

test('confusion weapon attack discards HP damage and suppresses the following magic slot', async () => {
    const { g, mon } = setup('Yeenoghu'); rolls(g);
    mon.mw = { cls: 'weapon', kind: 'mace', quan: 1, spe: 20, owornmask: W_WEP };
    mon.minvent = [mon.mw, { kind: 'gauntlets of power', owornmask: W_ARMG }];
    await fromSlot(g, mon, AD_CONF);
    assert.equal(g.u._confusionTimeout, 2); assert.equal(mon.mspec_used, 2);
    assert.equal(g.u.uhp, 199, 'only the subsequent paralysis claw inflicts one point');
    assert.deepEqual(calls(), ['rnd(21)', 'd(2,8)', 'rn2(4)', 'rn2(6)', 'rn2(3)', 'rn2(6)',
        'rnd(22)', 'd(1,6)', 'rn2(3)', 'rn2(10)', 'rnd(10)', 'rn2(2)', 'rn2(3)', 'rn2(6)']);
});
for (const mcan of [false, true]) test(`confusion with used special cooldown keeps zero damage: cancelled=${mcan}`, async () => {
    const { g, mon } = setup('Yeenoghu'); rolls(g); mon.mcan = mcan; mon.mspec_used = 4;
    await fromSlot(g, mon, AD_CONF);
    assert.equal(g.u._confusionTimeout || 0, 0); assert.equal(g.u.uhp, 199);
    assert.equal(calls().filter(c => c === 'rn2(4)').length, mcan ? 0 : 1);
});
for (const prior of [0, 8]) test(`stun applies duration and halves its own damage: prior=${prior}`, async () => {
    const { g, mon } = setup('abbot'); rolls(g); mon.mspec_used = 2; g.u._stunTimeout = prior;
    await fromSlot(g, mon, AD_STUN);
    assert.equal(g.u._stunTimeout, prior + 3); assert.equal(g.u.uhp, 199);
    assert.equal(/You stagger/.test(g._pending_message), prior === 0);
});
for (const gate of ['free', 'cancelled', 'helpless', 'armor']) test(`paralysis ${gate} preserves contact damage with source gating`, async () => {
    const { g, mon } = setup('Yeenoghu'); rolls(g); mon.mspec_used = 2;
    if (gate === 'free') g.u.uprops = { [FREE_ACTION]: { extrinsic: W_RINGL } };
    if (gate === 'cancelled') mon.mcan = true;
    if (gate === 'helpless') { g.multi = -7; g._helpless_time = 7; }
    if (gate === 'armor') { g.u.HProtection = 1; g.u.ublessed = 1; }
    await fromSlot(g, mon, AD_PLYS);
    assert.equal(g.u.uhp, 199); assert.equal(g._helpless_time || 0, gate === 'helpless' ? 7 : 0);
    assert.equal(calls().includes('rnd(10)'), false);
    // hitmu's unconditional knockback preamble has a separate rn2(3).
    assert.equal(calls().filter(call => call === 'rn2(3)').length, gate === 'helpless' ? 1 : 2);
    assert.equal(calls().includes('rn2(10)'), gate === 'free' || gate === 'armor');
    if (gate === 'free') assert.match(g._pending_message, /momentarily stiffen/);
    if (gate === 'armor') assert.match(g._pending_message, /avoid harm/);
});

for (const name of ['Angel', 'Asmodeus', 'Yeenoghu', 'abbot']) test(`${name} canonical array reaches its actual live spell slot`, async () => {
    const { g, mon } = setup(name); mon.mcan = true; rolls(g);
    assert.equal(supportsMonsterAttackSlots(mon), true);
    await processMonsterTurns(); await drain(g);
    assert.ok(calls().includes('rnd(20)')); assert.match(g._pending_message, /curses/);
    assert.equal(g._monster_attack_continuation, null);
});

for (const attack of [magic, frost]) for (const rescue of ['amulet', 'wizard'])
    test(`elemental ${attack.adtyp} saved ${rescue} death resumes after final damage`, async () => {
        const { g, mon } = setup(); g.u.uhp = 1; g.flags.debug = rescue === 'wizard'; rolls(g, [99]);
        if (rescue === 'amulet') g.inventory.push({ cls: 'amulet', kind: 'amulet of life saving',
            amuletIndex: 1, worn: true, quan: 1 });
        await monsterCastSpell(mon, { attack }); await drain(g);
        assert.equal(g._command_mode, rescue === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
        assert.equal(g._monster_spell_continuation.phase, 'done');
        const before = [...getRngLog()];
        const { coreCtx, displayCtx, rng, nhDisplay } = g;
        restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
        await rhack(' '); if (rescue === 'wizard') await rhack('n'); await drain(g);
        assert.equal(g._monster_spell_continuation, null); assert.ok(g.u.uhp > 0);
        assert.equal(getRngLog().filter(call => call.startsWith('d(')).length,
            before.filter(call => call.startsWith('d(')).length);
    });

for (const [name, adtyp, field] of [['Yeenoghu', AD_CONF, '_confusionTimeout'],
    ['Yeenoghu', AD_PLYS, '_helpless_time'], ['abbot', AD_STUN, '_stunTimeout']])
    test(`${name} ${adtyp} saved status-message suspension matches uninterrupted source order`, async () => {
        let { g, mon } = setup(name); rolls(g); if (adtyp !== AD_CONF) mon.mspec_used = 2;
        await fromSlot(g, mon, adtyp);
        const expected = { hp: g.u.uhp, timer: field === '_helpless_time' ? g[field] : g.u[field], rng: [...getRngLog()] };
        ({ g, mon } = setup(name, 55)); rolls(g); if (adtyp !== AD_CONF) mon.mspec_used = 2;
        g._pending_message = 'A long existing message fills this line.';
        const { pmOf } = await import('../js/mhitm.js');
        g._monster_attack_continuation = { mon, phase: 'slot',
            index: pmOf(mon).attacks.findIndex(a => a.adtyp === adtyp), toHit: 100,
            firstX: 10, firstY: 10, firstFound: true, hits: [] };
        await runMonsterAttackTurn(mon);
        assert.equal(g._monster_attack_continuation.phase, 'effect');
        assert.equal(g.u.uhp, 200);
        const { coreCtx, displayCtx, rng, nhDisplay } = g;
        restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
        await drain(g);
        assert.equal(g.u.uhp, expected.hp);
        assert.equal(field === '_helpless_time' ? g[field] : g.u[field], expected.timer);
        assert.deepEqual(getRngLog(), expected.rng); assert.equal(g._monster_attack_continuation, null);
    });

for (const state of ['mounted', 'asleep', 'unconscious', 'cancelled'])
    test(`stun ${state} preserves make_stunned message and damage semantics`, async () => {
        const { g, mon } = setup('abbot'); rolls(g); mon.mspec_used = 2;
        if (state === 'mounted') g.u.usteed = { data: { name: 'pony' } };
        if (state === 'asleep') { g.multi = -10; g._helpless_time = 10; g.u.usleep = 100; }
        if (state === 'unconscious') { g.multi = -10; g._helpless_time = 10; g._wake_message = 'You regain consciousness.'; }
        if (state === 'cancelled') mon.mcan = true;
        await fromSlot(g, mon, AD_STUN);
        assert.equal(g.u._stunTimeout || 0, state === 'cancelled' ? 0 : 3);
        assert.equal(g.u.uhp, state === 'cancelled' ? 197 : 199);
        if (state === 'mounted') assert.match(g._pending_message, /wobble in the saddle/);
        else assert.doesNotMatch(g._pending_message, /stagger|wobble/);
    });

for (const confused of [false, true]) test(`elemental fumble threshold: confused=${confused}`, async () => {
    const { g, mon } = setup(); mon.mconf = confused; rolls(g, [confused ? 99 : 19]);
    assert.equal(await monsterCastSpell(mon, { attack: magic }), false);
    assert.deepEqual(calls(), ['rn2(200)']); assert.equal(mon.mspec_used || 0, 0);
    assert.match(g._pending_message, /air crackles/); assert.equal(g.u.uhp, 200);
});

test('unresisted elemental frost uses the original half-spell roll', async () => {
    const { g, mon } = setup('Asmodeus'); g.u.halfSpellDamage = true; rolls(g, [99]);
    await monsterCastSpell(mon, { attack: frost }); await drain(g);
    assert.deepEqual(calls(), ['rn2(200)', 'd(16,6)']); assert.equal(g.u.uhp, 192);
    assert.equal(mon.m_seenres & M_SEEN_COLD, 0);
});
