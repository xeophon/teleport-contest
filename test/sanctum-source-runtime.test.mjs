import { vision_reset } from '../js/vision.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as cmd from '../js/cmd.js';
import { processMonsterTurns } from '../js/allmain.js';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { monsterByRndName } from '../js/mklev.js';
import { ROOM, TEMPLE, ROOMOFFSET, ALTAR, AM_SHRINE, AM_SANCTUM, COULD_SEE, IN_SIGHT } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function setup(name = 'master lich', seed = 42) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { moves: 72, flags: {}, context: {}, inventory: [], level: new GameMap(),
        specialLevels: [{ name: 'sanctum', dnum: 1, dlevel: 20 }],
        dungeons: [{ name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 25 }, { name: 'Gehennom', depth_start: 26, num_dunlevs: 20 }],
        u: { ux: 20, uy: 10, uz: { dnum: 1, dlevel: 20 }, ulevel: 12, uhp: 200, uhpmax: 200, uac: 10,
            acurr: { a: [14, 14, 14, 14, 14, 14] }, ualign: { type: 0, record: 0 }, uhunger: 800 } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset();
    g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const mon = { m_id: 50, data: monsterByRndName(name) || { name }, mx: 21, my: 10, mux: 20, muy: 10,
        m_lev: 23, mhp: 50, mhpmax: 100, mcansee: true, mcanmove: true, mpeaceful: false, minvent: [], movement: 12 };
    g.level.monsters.push(mon); return { g, mon };
}

for (const [x, y] of [[20, 10], [67, 15]]) test(`blind no-hands arrival at ${x},${y} leaves combat to resident monsters`, async () => {
    const { g } = setup(); g.level.monsters = [];
    Object.assign(g.u, { ux: x, uy: y, blind: true, _polyself_form: { name: 'brown mold' }, mh: 9, mhmax: 9 });
    Object.assign(g, { _command_mode: 'objectListMore', _pending_message: 'text-window', _message_more: 1,
        _object_list_process_deferred_now: 1, _object_list_nohands_on_other_key: 1, _overlay_lines: ['a potion'], _deferred_context_move: 1 });
    await cmd.rhack(' ');
    assert.equal(g._queued_damage_after_more || 0, 0);
    assert.equal(g._queued_map_invisible_after_more, undefined);
    assert.equal(g.level.monsters.length, 0);
    assert.equal(g.u.uhp, 200); assert.equal(g.u.mh, 9); assert.equal(g.moves, 72);
    assert.deepEqual(getRngLog(), []);
});

for (const name of ['master lich', 'high cleric']) test(`${name} cancellation is checked after source spell selection`, async () => {
    const { g, mon } = setup(name); mon.mcan = true;
    assert.equal(await cmd.monsterCastSpell(mon), false);
    assert.match(getRngLog()[0], /^rn2\(23\)=/);
    assert.equal(getRngLog().some(call => call.startsWith('rn2(230)=')), false);
    assert.equal(g.u.uhp, 200); assert.equal(mon.mspec_used || 0, 0);
});

test('a directed spell aimed at a displaced position consumes its cooldown without damage or fumble rolls', async () => {
    const { g, mon } = setup('master lich', 1); mon.m_lev = 1; mon.mux = 25; mon.muy = 10;
    assert.equal(await cmd.monsterCastSpell(mon, { found: false }), false);
    assert.equal(mon.mspec_used, 9); assert.equal(g.u.uhp, 200);
    assert.deepEqual(getRngLog(), ['rn2(1)=0']);
    assert.match(g._pending_message, /thin air/);
});

test('a non-attacking low-level caster skips directed spells after exactly one selection', async () => {
    const { g, mon } = setup('gnomish wizard', 7); mon.m_lev = 1;
    assert.equal(await cmd.monsterCastSpell(mon, { thinksFound: false, found: false }), false);
    assert.deepEqual(getRngLog(), ['rn2(1)=0']); assert.equal(g._pending_message || '', '');
});

test('an unseen cancelled caster uses the source once-per-four-turn curse without an extra roll', async () => {
    const { g, mon } = setup('master lich'); mon.m_lev = 1; mon.mcan = true; g.u.blind = true;
    await cmd.monsterCastSpell(mon);
    assert.deepEqual(getRngLog(), ['rn2(1)=0']); assert.match(g._pending_message, /mumbled curse/);
});

test('a high priest selects open wounds from the cleric list at level one', async () => {
    const { g, mon } = setup('high cleric', 42); mon.m_lev = 1;
    await cmd.monsterCastSpell(mon);
    assert.equal(mon.mspec_used, 9);
    // Seed42 has rn2(10)=6 after selection, below20: a level-one caster fumbles.
    assert.deepEqual(getRngLog().map(call => call.split('=')[0]), ['rn2(1)', 'rn2(10)']);
    assert.match(g._pending_message, /air crackles/); assert.equal(g.u.uhp, 200);
});

for (const [deaf, asleep] of [[false, false], [true, false], [false, true]]) {
    test(`entering Moloch's temple angers its high priest even when deaf=${deaf}, asleep=${asleep}`, async () => {
        const { g, mon } = setup('high cleric');
        Object.assign(mon, { mx: 24, my: 11, ispriest: true, mpeaceful: true, msleeping: asleep,
            shrine: { room: ROOMOFFSET, x: 24, y: 10, align: -128, specialLevel: true } });
        g.u.deaf = deaf;
        g.level.rooms = [{ lx: 21, ly: 8, hx: 26, hy: 12, rtype: TEMPLE }];
        for (let x = 21; x <= 26; x++) for (let y = 8; y <= 12; y++) g.level.at(x, y).roomno = ROOMOFFSET;
        Object.assign(g.level.at(24, 10), { typ: ALTAR, flags: AM_SHRINE | AM_SANCTUM });
        await cmd.rhack('l');
        if (g._queued_priest_entry_after_more) await cmd.rhack(' ');
        assert.equal(mon.mpeaceful, 0);
        const text = [g._pending_message, ...(g._queued_messages_after_more || []).map(e => e.text)].join(' ');
        if (!deaf && !asleep) assert.match(text, /Moloch's Sanctum/);
        assert.equal(text.includes('Pilgrim'), false);
        assert.equal(getRngLog().some(call => call.startsWith('d(10,20)=')), false, 'sanctum omits ordinary temple feelings');
    });
}
