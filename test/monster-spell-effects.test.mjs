import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { ROOM, IN_SIGHT, COULD_SEE, W_ARM, W_ARMC, M_SEEN_MAGR } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function install(spell, seed = 42) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.flags = {};
    g.context = {};
    g.inventory = [];
    g.moves = 100;
    g.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 200, uhpmax: 200, uac: 10, acurr: { a: [14, 14, 14, 14, 14, 14] } };
    g.level = new GameMap();
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(IN_SIGHT | COULD_SEE));
    const mon = { data: { name: 'arch-lich', mmove: 9, mlevel: 20 },
        m_id: 80, mx: 11, my: 10, m_lev: 20, mhp: 10, mhpmax: 100,
        mcansee: true, mcanmove: true, mpeaceful: false, minvent: [] };
    g.level.monsters = [mon];
    g._pending_message = 'The arch-lich touches you!';
    g._message_more = 1;
    g._queued_messages_after_more = [{ text: 'The arch-lich casts a spell!', more: true,
        lichChain: 1, lichCastEffect: { monId: mon.m_id, spell } }];
    return { g, mon };
}

function wornArmor(kind = 'chain mail', extra = {}) {
    return { kind, actualKind: kind, cls: 'armor', glyph: '[', worn: true,
        owornmask: kind.includes('cloak') ? W_ARMC : W_ARM, quan: 1, letter: 'a', ...extra };
}

// These enter cmd's actual deferred cast boundary, not an isolated effect helper.
// C mcastu.c:240 rolls base damage for every directed cast before its effect.
test('destroy armor erodes worn metal using the shared 5.0 destroy_arm algorithm', async () => {
    const { g, mon } = install('DESTRY_ARMR');
    const armor = wornArmor();
    g.inventory.push(armor);
    mon.m_seenres = M_SEEN_MAGR;
    await rhack(' ');
    assert.ok((armor.oeroded || 0) > 0);
    assert.equal(mon.m_seenres & M_SEEN_MAGR, 0);
    assert.match(g._queued_messages_after_more.map(e => e.text).join(' '), /rust/);
    assert.match(getRngLog()[0], /^d\(11,6\)=/);
    assert.match(getRngLog()[1], /^rn2\(4\)=/);
});

test('destroy armor removes maximally eroded armor and updates its armor class', async () => {
    const { g } = install('DESTRY_ARMR');
    const armor = wornArmor('chain mail', { oeroded: 3 });
    g.inventory.push(armor);
    g.u.uac = 8;
    await rhack(' ');
    assert.equal(g.inventory.includes(armor), false);
    assert.equal(g.u.uac, 10);
    assert.equal(armor.worn, false);
});

test('antimagic stops destroy armor before its armor-selection roll and teaches witnesses', async () => {
    const { g, mon } = install('DESTRY_ARMR');
    const armor = wornArmor('cloak of magic resistance');
    g.inventory.push(armor);
    await rhack(' ');
    assert.equal(armor.oeroded || 0, 0);
    assert.equal(g.inventory.includes(armor), true);
    assert.equal(mon.m_seenres & M_SEEN_MAGR, M_SEEN_MAGR);
    assert.equal(getRngLog().length, 1);
    assert.match(g._queued_messages_after_more[0].text, /field of force/);
});

test('naked destroy armor still rolls hits and does not erase remembered resistance', async () => {
    const { g, mon } = install('DESTRY_ARMR');
    mon.m_seenres = M_SEEN_MAGR;
    await rhack(' ');
    assert.match(getRngLog()[1] || '', /^rn2\(4\)=/);
    assert.equal(mon.m_seenres & M_SEEN_MAGR, M_SEEN_MAGR);
    assert.equal(g._queued_messages_after_more[0].text, 'Your skin itches.');
});

for (const [antimagic, halfSpell] of [[false, false], [true, false], [false, true], [true, true]]) {
    test(`psi bolt applies Half_spell_damage then Antimagic: ${antimagic}, ${halfSpell}`, async () => {
        const { g, mon } = install('PSI_BOLT');
        g.u.antimagic = antimagic;
        g.u.halfSpellDamage = halfSpell;
        await rhack(' ');
        let damage = Number(getRngLog()[0].split('=')[1]);
        if (halfSpell) damage = Math.ceil(damage / 2);
        if (antimagic) damage = Math.ceil(damage / 2);
        assert.equal(g.u.uhp, 200 - damage);
        assert.equal(!!(mon.m_seenres & M_SEEN_MAGR), antimagic);
    });
}

test('a lethal psi bolt runs the existing life-saving message continuation', async () => {
    const { g } = install('PSI_BOLT');
    g.u.uhp = 1;
    const amulet = { cls: 'amulet', kind: 'amulet of life saving', actualKind: 'amulet of life saving',
        amuletIndex: 1, worn: true, quan: 1, letter: 'a' };
    g.inventory.push(amulet);
    await rhack(' ');
    assert.equal(g.inventory.includes(amulet), false);
    assert.ok(g._queued_messages_after_more.some(e => e.lifeSaving));
    await rhack(' ');
    await rhack(' ');
    assert.equal(g._command_mode, 'lifeSavingMore');
    assert.match(g._death_cause, /arch-lich/);
});

test('stun rolls duration from dexterity and extends existing stun', async () => {
    const { g } = install('STUN_YOU');
    g.u.acurr.a[3] = 10;
    g.u._stunTimeout = 5;
    g.u.halfSpellDamage = true;
    await rhack(' ');
    const rolls = getRngLog();
    assert.match(rolls[1] || '', /^d\(6,4\)=/);
    assert.equal(g.u._stunTimeout, 5 + Math.ceil(Number(rolls[1].split('=')[1]) / 2));
    assert.equal(g.u.uhp, 200);
});

test('free action resets existing stun to one turn rather than preserving a long timeout', async () => {
    const { g, mon } = install('STUN_YOU');
    g.u.freeAction = true;
    g.u._stunTimeout = 50;
    await rhack(' ');
    assert.equal(g.u._stunTimeout, 1);
    assert.equal(mon.m_seenres & M_SEEN_MAGR, M_SEEN_MAGR);
    assert.equal(getRngLog().length, 1);
});

test('cure self rolls a separate 3d6, capped at monster maximum HP', async () => {
    const { mon } = install('CURE_SELF');
    mon.mhp = 98;
    await rhack(' ');
    assert.match(getRngLog()[1] || '', /^d\(3,6\)=/);
    assert.equal(mon.mhp, 100);
});

test('haste self removes intrinsic slowness before making a later cast fast', async () => {
    const { g, mon } = install('HASTE_SELF');
    mon.permspeed = mon.mspeed = 'slow';
    await rhack(' ');
    assert.equal(mon.permspeed, 0);
    assert.equal(mon.mspeed, 0);
    g._queued_messages_after_more = [{ text: 'The arch-lich casts a spell!', more: true,
        lichCastEffect: { monId: mon.m_id, spell: 'HASTE_SELF' } }];
    await rhack(' ');
    assert.equal(mon.permspeed, 'fast');
    assert.equal(mon.mspeed, 'fast');
});

test('disappear gives permanent invisibility and marks a now unseen monster', async () => {
    const { g, mon } = install('DISAPPEAR');
    await rhack(' ');
    assert.equal(mon.minvis, 1);
    assert.equal(mon.perminvis, 1);
    assert.equal(g.level.at(mon.mx, mon.my).map_invisible, true);
});

test('successful destroy armor stops interruptible occupation and counted movement', async () => {
    const { g } = install('DESTRY_ARMR');
    g.inventory.push(wornArmor());
    g._pick_dig_occupation = { x: 9, y: 10 };
    g._run_steps_remaining = 8;
    await rhack(' ');
    assert.equal(g._pick_dig_occupation, null);
    assert.equal(g._run_steps_remaining, 0);
});

test('protected armor still receives selection rolls without eroding or interrupting', async () => {
    const { g } = install('DESTRY_ARMR');
    const armor = wornArmor('chain mail', { oerodeproof: true });
    g.inventory.push(armor);
    const occupation = { x: 9, y: 10 };
    g._pick_dig_occupation = occupation;
    await rhack(' ');
    assert.equal(armor.oeroded || 0, 0);
    assert.equal(g._pick_dig_occupation, occupation);
    assert.match(getRngLog()[1] || '', /^rn2\(4\)=/);
    assert.ok(getRngLog().slice(2).every(entry => /^rn2\(1\)=0$/.test(entry)));
});

test('aggravation uses the shared one-in-five frozen recovery gate', async () => {
    const { g, mon } = install('AGGRAVATION');
    const other = { ...mon, m_id: 81, mx: 12, msleeping: 1, mfrozen: 10, mcanmove: false };
    g.level.monsters.push(other);
    await rhack(' ');
    assert.equal(other.msleeping, 0);
    const wake = Number(getRngLog()[1]?.split('=')[1]);
    assert.match(getRngLog()[1] || '', /^rn2\(5\)=/);
    assert.equal(other.mfrozen, wake === 0 ? 0 : 10);
    assert.equal(!!other.mcanmove, wake === 0);
});

test('full-health cure retains initial attack damage as in C m_cure_self', async () => {
    const { g, mon } = install('CURE_SELF');
    mon.mhp = mon.mhpmax;
    await rhack(' ');
    assert.equal(getRngLog().length, 1);
    assert.equal(g.u.uhp, 200 - Number(getRngLog()[0].split('=')[1]));
});

test('psi bolt consumes monster-form HP before base hero HP', async () => {
    const { g } = install('PSI_BOLT');
    g.u._polyself_form = { name: 'red dragon' };
    g.u.mh = g.u.mhmax = 100;
    await rhack(' ');
    assert.equal(g.u.uhp, 200);
    assert.equal(g.u.mh, 100 - Number(getRngLog()[0].split('=')[1]));
});

test('carried Orb of Fate halves psi damage independently of armor magic resistance', async () => {
    const { g } = install('PSI_BOLT');
    g.inventory.push({ cls: 'tool', kind: 'crystal ball', artifact: 'The Orb of Fate' });
    await rhack(' ');
    assert.equal(g.u.uhp, 200 - Math.ceil(Number(getRngLog()[0].split('=')[1]) / 2));
});
