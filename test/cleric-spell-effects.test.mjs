import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { vision_reset } from '../js/vision.js';
import { ROOM, IN_SIGHT, COULD_SEE, M_SEEN_MAGR } from '../js/const.js';
import { AD_CLRC, AT_MAGC } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function install(spell, options = {}) {
    const g = resetGame(); initRng(42); enableRngLog();
    Object.assign(g, { flags: {}, context: {}, inventory: [], moves: 100, level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 200, uhpmax: 200, uac: 10, acurr: { a: [14, 14, 14, 14, 14, 14] }, ...options } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset();
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(IN_SIGHT | COULD_SEE));
    const mon = { data: { name: 'high cleric', mlevel: 20 }, m_id: 80,
        mx: 11, my: 10, mux: 10, muy: 10, m_lev: 20, mhp: 10, mhpmax: 100,
        mcansee: true, mcanmove: true, mpeaceful: false, minvent: [] };
    g.level.monsters = [mon];
    g._pending_message = 'The high priest kicks!'; g._message_more = 1;
    g._queued_messages_after_more = [{ text: 'The high priest casts a spell!', more: true,
        lichChain: 1, lichCastEffect: { monId: 80, spell,
            attack: { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 } } }];
    return { g, mon };
}

for (const antimagic of [false, true]) for (const halfSpellDamage of [false, true]) {
    test(`open wounds uses the cleric attack dice, half spell then antimagic: ${antimagic}/${halfSpellDamage}`, async () => {
        const { g, mon } = install('OPEN_WOUNDS', { antimagic, halfSpellDamage });
        await rhack(' ');
        assert.match(getRngLog()[0], /^d\(12,8\)=/);
        let damage = Number(getRngLog()[0].split('=')[1]);
        if (halfSpellDamage) damage = Math.ceil(damage / 2);
        if (antimagic) damage = Math.ceil(damage / 2);
        assert.equal(g.u.uhp, 200 - damage);
        assert.equal(!!(mon.m_seenres & M_SEEN_MAGR), antimagic);
        assert.match(g._queued_messages_after_more.at(-1).text, /wounds|itches/i);
    });
}

for (const [antimagic, halfSpellDamage, hallucinating] of [[false, false, false], [false, true, true], [true, false, false]]) {
    test(`confusion extends its timer and observes resistance: ${antimagic}/${halfSpellDamage}/${hallucinating}`, async () => {
        const { g, mon } = install('CONFUSE_YOU', { antimagic, halfSpellDamage, hallucinating, _confusionTimeout: 3 });
        await rhack(' ');
        assert.equal(g.u._confusionTimeout, 3 + (antimagic ? 0 : halfSpellDamage ? 10 : 20));
        assert.equal(g.u.uhp, 200); assert.equal(getRngLog().length, 1);
        assert.equal(!!(mon.m_seenres & M_SEEN_MAGR), antimagic);
        assert.match(g._queued_messages_after_more.at(-1).text, antimagic ? /momentarily dizzy/ : hallucinating ? /trippier/ : /more confused/);
    });
}

for (const [antimagic, freeAction, halfSpellDamage] of [[false, false, false], [false, false, true], [true, false, false], [false, true, false]]) {
    test(`paralysis applies C's duration and its returned hit-point damage: ${antimagic}/${freeAction}/${halfSpellDamage}`, async () => {
        const { g, mon } = install('PARALYZE', { antimagic, freeAction, halfSpellDamage });
        await rhack(' ');
        const duration = antimagic || freeAction ? 1 : halfSpellDamage ? 12 : 24;
        assert.equal(g._helpless_time, duration);
        assert.equal(g._multi_reason, 'paralyzed by a monster');
        assert.equal(g._wake_message, 'You can move again.'); // unmul's default for nomovemsg=NULL
        // C mcastu.c:882 assigns mcast_paralyze's return to dmg; line898
        // passes it to mdamageu despite the duration-only comment at757.
        assert.equal(g.u.uhp, 200 - duration);
        assert.equal(!!(mon.m_seenres & M_SEEN_MAGR), antimagic || freeAction);
        assert.equal(getRngLog().length, 1);
    });
}

test('paralysis cannot shorten an existing longer incapacitation', async () => {
    const { g } = install('PARALYZE', { freeAction: true });
    g._helpless_time = 50; g.multi = -50;
    await rhack(' ');
    assert.equal(g._helpless_time, 50); assert.equal(g.multi, -50);
    assert.equal(g.u.uhp, 199);
    assert.equal(g._queued_messages_after_more.some(e => /stiffen|frozen/.test(e.text)), false);
});

for (const halfSpellDamage of [false, true]) test(`blindness ignores ordinary blinding resistance and uses fixed duration: ${halfSpellDamage}`, async () => {
    const { g } = install('BLIND_YOU', { halfSpellDamage, blindResistance: true, antimagic: true });
    await rhack(' ');
    assert.equal(g.u._blindTimeout, halfSpellDamage ? 100 : 200);
    assert.equal(g.u.blind, true); assert.match(g.u._statusSuffix, /Blind/);
    assert.equal(g.u.uhp, 200); assert.equal(getRngLog().length, 1);
    assert.equal(g._queued_messages_after_more.at(-1).text, 'Scales cover your eyes!');
});

test('the Eyes of the Overworld preserve sight while the blindness timeout still applies', async () => {
    const { g } = install('BLIND_YOU');
    g.inventory.push({ kind: 'lenses', artifact: 'The Eyes of the Overworld', worn: true });
    await rhack(' ');
    assert.equal(g.u._blindTimeout, 200); assert.equal(g.u.blind, false);
    assert.equal(g._queued_messages_after_more.at(-1).text, 'Your vision quickly clears.');
});

for (const halfPhysicalDamage of [false, true]) test(`geyser replaces base damage and applies only physical halving: ${halfPhysicalDamage}`, async () => {
    const { g } = install('GEYSER', { halfPhysicalDamage, halfSpellDamage: true, antimagic: true, fireResistance: true });
    await rhack(' ');
    assert.deepEqual(getRngLog().map(call => call.split('=')[0]), ['d(12,8)', 'd(8,6)']);
    const damage = Number(getRngLog()[1].split('=')[1]);
    assert.equal(g.u.uhp, 200 - (halfPhysicalDamage ? Math.ceil(damage / 2) : damage));
});

test('lethal open wounds uses shared life saving and resumes the actual effect queue', async () => {
    const { g } = install('OPEN_WOUNDS', { uhp: 1 });
    const amulet = { cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1, letter: 'a' };
    g.inventory.push(amulet);
    await rhack(' ');
    assert.equal(g.inventory.includes(amulet), false);
    assert.ok(g._queued_messages_after_more.some(e => e.lifeSaving));
    await rhack(' '); await rhack(' ');
    assert.equal(g._command_mode, 'lifeSavingMore');
});
