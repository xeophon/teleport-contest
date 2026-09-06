import { W_RINGL, LEVITATION, PIT } from '../js/const.js';
import { resumeMonsterSpellCommand } from '../js/cmd.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { vision_reset } from '../js/vision.js';
import { ROOM, IRONBARS, ROOMOFFSET, W_NONDIGGABLE, IN_SIGHT, COULD_SEE, M_SEEN_ELEC, M_SEEN_REFL } from '../js/const.js';
import { AD_CLRC, AT_MAGC } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function setup(options = {}, seed = 42) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { flags: {}, context: {}, inventory: [], moves: 100, level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 200, uhpmax: 200, acurr: { a: [14, 14, 14, 14, 14, 14] }, ...options } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset(); g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(IN_SIGHT | COULD_SEE));
    const mon = { data: { name: 'high cleric' }, m_id: 80, mx: 11, my: 10, m_lev: 20, mhp: 100, mcansee: true };
    g.level.monsters = [mon];
    g._pending_message = 'The high priest kicks!'; g._message_more = 1;
    g._queued_messages_after_more = [{ text: 'The high priest casts a spell!', more: true,
        lichCastEffect: { monId: 80, spell: 'LIGHTNING', attack: { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 } } }];
    return { g, mon };
}
async function run(g) {
    for (let i = 0; i < 25 && (g._message_more || g._monster_spell_continuation || g._queued_messages_after_more?.length); i++) {
        if (g._command_mode) return;
        await rhack(' ');
    }
}
for (const shockResistance of [false, true]) for (const halfSpellDamage of [false, true]) {
    test(`lightning rolls fresh damage then destroys inventory and blinds: resistance=${shockResistance}, half=${halfSpellDamage}`, async () => {
        const { g, mon } = setup({ shockResistance, halfSpellDamage }); await run(g);
        const calls = getRngLog();
        assert.deepEqual(calls.map(e => e.split('=')[0]), ['d(12,8)', 'd(8,6)', 'rn2(5)', 'rnd(100)']);
        const raw = +calls[1].split('=')[1];
        assert.equal(g.u.uhp, 200 - (shockResistance ? 0 : halfSpellDamage ? Math.ceil(raw / 2) : raw));
        assert.equal(g.u._blindTimeout, +calls[3].split('=')[1]);
        assert.equal(!!(mon.m_seenres & M_SEEN_ELEC), shockResistance); assert.equal(mon.m_seenres & M_SEEN_REFL, 0);
        assert.equal(g._monster_spell_continuation, null);
    });
}

test('reflection still rolls damage but protects inventory, terrain and sight', async () => {
    const { g, mon } = setup();
    g.inventory.push({ cls: 'armor', kind: 'silver dragon scale mail', worn: true });
    Object.assign(g.level.at(10, 10), { typ: IRONBARS, roomno: ROOMOFFSET });
    await run(g);
    assert.deepEqual(getRngLog().map(e => e.split('=')[0]), ['d(12,8)', 'd(8,6)']);
    assert.equal(g.u.uhp, 200); assert.equal(g.u._blindTimeout || 0, 0);
    assert.equal(g.level.at(10, 10).typ, IRONBARS); assert.ok(mon.m_seenres & M_SEEN_REFL);
});

test('lethal lightning resumes after life saving without repeating blindness or inventory selection', async () => {
    const { g } = setup({ uhp: 1 });
    g.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    await run(g); assert.equal(g._command_mode, 'lifeSavingMore');
    const rolls = [...getRngLog()]; await rhack(' '); await run(g);
    assert.equal(g._monster_spell_continuation, null);
    assert.deepEqual(getRngLog().slice(0, rolls.length), rolls);
    assert.equal(getRngLog().filter(e => e.startsWith('d(8,6)=')).length, 1);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(100)=')).length, 1);
    assert.ok(g.u.uhp > 0);
});

for (const rescue of ['amulet', 'wizard']) test(`lightning ring loss resumes saved ${rescue} pit death before the spell tail`, async () => {
    const { g, mon } = setup({ uhp: 1, levitating: true });
    g.flags.debug = rescue === 'wizard'; g.flags.pickup = false;
    const ring = { id: 2, letter: 'b', cls: 'ring', glyph: '=', kind: 'ring of levitation',
        quan: 1, worn: 'left', owornmask: W_RINGL, dknown: true };
    g.inventory.push(ring); g.u.uleft = ring; g.u.uprops = { [LEVITATION]: { intrinsic: 0, extrinsic: W_RINGL } };
    if (rescue === 'amulet') g.inventory.push({ id: 3, cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    g.level.traps.push({ tx: 10, ty: 10, ttyp: PIT });
    g._message_more = 0; g._pending_message = ''; g._queued_messages_after_more = [];
    g.coreCtx = { n: 100, r: Array(100).fill(0n), m: [], a: 0n, b: 0n, c: 0n }; g.rng.core = g.coreCtx;
    g._monster_spell_continuation = { mon, spell: 'LIGHTNING', phase: 'inventory', damage: 8, electric: { damage: 8 } };
    await resumeMonsterSpellCommand();
    assert.equal(g._command_mode, rescue === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
    assert.match(g._pending_message, /turns to dust.*pit/s);
    assert.ok(g.inventory.includes(ring)); assert.equal(g._artifact_float_continuation.after.type, 'monsterSpell');
    assert.equal(getRngLog().some(e => e.startsWith('rnd(100)=')), false);
    const { coreCtx, displayCtx, rng } = g; restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng });
    await rhack(' '); if (rescue === 'wizard') await rhack('n'); await run(g);
    assert.equal(g._artifact_float_continuation, null); assert.equal(g._monster_spell_continuation, null);
    assert.equal(g.inventory.some(obj => obj.id === 2), false);
    assert.equal(getRngLog().filter(e => e.startsWith('rnd(100)=')).length, 1);
    assert.equal(g.u.uhp, Math.min(g.u.uhpmax, 50 + 10 * Math.trunc(g.u.acurr.a[4] / 2)) - 8);
});
