import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { monsterByRndName } from '../js/mklev.js';
import { ROOM, POOL, COULD_SEE, IN_SIGHT, A_WIS, MON_MIGRATING } from '../js/const.js';
import { initRng, enableRngLog, getRngLog, enableDisplayRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { aggravate } from '../js/wizard.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { PM_VAMPIRE } from '../js/permonst.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKeys, resetInputState } from '../js/input.js';

function setup({ role = 'Priest', level = 1, align = 0, width = 800 } = {}) {
    resetGame(); initRng(73); enableRngLog(); enableDisplayRngLog(false);
    Object.assign(game, { moves: 100, flags: {}, context: {}, inventory: [],
        _startup_role: role, urole: { name: { m: role } }, nhDisplay: { cols: width },
        dungeons: [{ name: 'The Dungeons of Doom', flags: { hellish: false } }],
        level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: level,
            uhp: 200, uhpmax: 200, uen: 200, uenmax: 200, uhunger: 900, umovement: 12,
            ualign: { type: align, record: 0 }, acurr: { a: [10, 10, 10, 10, 10, 10] } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
}

function monster(name, changes = {}) {
    const mon = { data: monsterByRndName(name), m_id: game.level.monsters.length + 50,
        mx: 11, my: 10, m_lev: 1, mhp: 20, mhpmax: 20, movement: 0,
        mcanmove: true, mcansee: true, msleeping: 1, minvent: [], ...changes };
    assert.ok(mon.data, name); game.level.monsters.push(mon); return mon;
}

function rolls(values) {
    game.coreCtx.r = values.map(BigInt).reverse(); game.coreCtx.n = values.length;
    enableRngLog();
}

async function turn() {
    game._command_mode = 'extendedCommand'; game._extended_command = 'turn';
    await rhack('\n');
}

test('unknown non-cleric #turn is free and does not violate atheism', async () => {
    setup({ role: 'Wizard' }); await turn();
    assert.equal(game.context.move, 0); assert.equal(game.u.uconduct?.gnostic || 0, 0);
    assert.match(game._pending_message, /don't know how to turn undead/);
    assert.deepEqual(getRngLog(), []);
});

for (const form of ['floating eye', 'killer bee', 'jabberwock', 'fog cloud'])
    test(`incapable ${form} chant counts intent and only the first attempt spends time`, async () => {
        setup(); game.u._polyself_form = monsterByRndName(form);
        await turn();
        assert.equal(game.u.uconduct?.gnostic, 1); assert.equal(game.context.move, 1);
        assert.match(game._pending_message, /incapable of calling upon Crom/);
        assert.equal(game._helpless_time || 0, 0); assert.deepEqual(getRngLog(), []);
        await turn(); assert.equal(game.u.uconduct.gnostic, 2); assert.equal(game.context.move, 0);
        assert.equal(game._chronicle_entries.filter(e => /rejected atheism/.test(e.text)).length, 1);
    });

test('strangulation has its own failed-chant message and respects earlier religious conduct', async () => {
    setup(); game.u._strangledTimeout = 3; game.u.strangled = true; game.u.uconduct = { gnostic: 4 };
    await turn(); assert.equal(game.u.uconduct.gnostic, 5); assert.equal(game.context.move, 0);
    assert.match(game._pending_message, /not able to call upon Crom/);
    assert.equal(game._chronicle_entries?.length || 0, 0);
});

test('Priest and Knight turning permits stun and does not require free hands', async () => {
    setup({ role: 'Knight' }); game.u.stunned = true;
    game.inventory.push({ kind: 'long sword', cls: 'weapon', wielded: true, cursed: true },
        { kind: 'large shield', cls: 'armor', worn: true, cursed: true });
    await turn(); assert.match(game._pending_message, /Calling upon Brigit/);
    assert.equal(game.u.uconduct?.gnostic, 1); assert.equal(game._helpless_time, 5);
    assert.equal(game.context.move, 1);
});

for (const [form, align, rejected] of [['vampire', 0, true], ['water demon', 1, true], ['water demon', -1, false]])
    test(`${form} at alignment ${align} ${rejected ? 'is rejected' : 'can turn'}`, async () => {
        setup({ align }); game.u._polyself_form = monsterByRndName(form); rolls([1]);
        const mon = monster('human zombie'); await turn();
        assert.match(game._pending_message, rejected ? /seems to ignore you/ : /chant an arcane formula/);
        assert.equal(game.u._aexe[A_WIS], rejected ? -1 : 0);
        assert.equal(game._helpless_time || 0, rejected ? 0 : 5);
        assert.equal(mon.msleeping, 0);
    });

for (const anger of [6, 7]) test(`divine anger ${anger} observes the strict rejection boundary`, async () => {
    setup(); game.u.ugangr = anger; await turn();
    assert.match(game._pending_message, anger > 6 ? /seems to ignore you/ : /chant an arcane formula/);
});

test('hellish topology rejects turning, aggravates, and does not exercise wisdom', async () => {
    setup(); game.dungeons[0].flags.hellish = true;
    const mon = monster('human zombie'); await turn();
    assert.match(game._pending_message, /Since you are in Gehennom, Crom can't help you/);
    assert.equal(mon.msleeping, 0); assert.equal(game._helpless_time || 0, 0);
    assert.equal(game.u._aexe, undefined); assert.equal(game.context.move, 1);
});

test('hallucinated gods use only display RNG, with Moloch refusing help in Gehennom', async () => {
    setup(); game.u.hallucinating = true; game.dungeons[0].flags.hellish = true;
    game.displayCtx.r = [8n, 0n]; game.displayCtx.n = 2; enableDisplayRngLog();
    await turn(); assert.match(game._pending_message, /Moloch won't help you/);
    assert.deepEqual(getRngLog(), ['~drn2(13)=0', '~drn2(9)=8']);
    enableDisplayRngLog(false);
});

test('confusion wakes, unfreezes and unflees eligible targets without clearing their flee timer', async () => {
    setup(); game.u._confusionTimeout = 7;
    const mons = [monster('human zombie'), monster('ghoul', { mx: 12 })];
    for (const mon of mons) Object.assign(mon, { mflee: true, mfleetim: 7, mfrozen: 9, mcanmove: false });
    await turn();
    assert.equal((game._pending_message.match(/Unfortunately, your voice falters/g) || []).length, 1);
    for (const mon of mons) assert.deepEqual([mon.msleeping, !!mon.mflee, mon.mfleetim, mon.mfrozen, !!mon.mcanmove], [0, false, 7, 0, true]);
    assert.equal(getRngLog().length, 1); assert.match(getRngLog()[0], /^rn2\(19\)/);
});

test('couldsee, range, life and hostile checks select targets independently of vision', async () => {
    setup(); game.u.blind = true;
    const unseen = monster('human zombie', { minvis: true });
    const edge = monster('human zombie', { mx: 18 });
    const far = monster('human zombie', { mx: 18, my: 11 });
    const wall = monster('human zombie', { mx: 9 }); game.viz_array[10][9] = 0;
    const peaceful = monster('human zombie', { mpeaceful: true });
    const offmap = monster('human zombie', { mstate: MON_MIGRATING });
    const dead = monster('human zombie', { dead: true, mhp: 0 });
    await turn(); assert.ok(unseen.mflee); assert.ok(edge.mflee);
    for (const mon of [far, wall, peaceful, offmap, dead]) assert.equal(mon.msleeping, 1);
    assert.doesNotMatch(game._pending_message, /turns to flee/);
});

for (const level of [15, 16]) test(`demons only become turn targets above level fifteen: ${level}`, async () => {
    setup({ level }); const mon = monster('water demon'); rolls([0, 99]); await turn();
    assert.equal(!!mon.mflee, level > 15); assert.equal(mon.msleeping, level > 15 ? 0 : 1);
});

for (const [name, threshold] of [['human zombie', 6], ['human mummy', 8], ['wraith', 10],
    ['vampire', 12], ['ghost', 14], ['lich', 16]])
    test(`${name} pacification threshold is ${threshold}, with two MR checks`, async () => {
        setup({ level: threshold - 1, align: -1 }); let mon = monster(name); rolls([0, 99]);
        await turn(); assert.equal(!!mon.mpeaceful, false); assert.ok(mon.mflee);
        setup({ level: threshold, align: -1 }); mon = monster(name); rolls([0, 99, 99]);
        await turn(); assert.equal(mon.mpeaceful, true); assert.equal(!!mon.mflee, false);
        assert.equal(getRngLog().length, 3); assert.ok(mon.malign != null);
    });

test('first resistance wakes only; second resistance permits fleeing instead of pacification', async () => {
    setup({ level: 16, align: -1 }); let mon = monster('lich'); rolls([0, 0]);
    await turn(); assert.equal(mon.msleeping, 0); assert.equal(!!mon.mflee, false); assert.equal(!!mon.mpeaceful, false);
    setup({ level: 16, align: -1 }); mon = monster('lich'); rolls([0, 99, 0]);
    await turn(); assert.ok(mon.mflee); assert.equal(!!mon.mpeaceful, false);
});

test('vampire shapechangers in living forms flee without the vampire-class second roll', async () => {
    setup({ level: 30 }); const mon = monster('bat', { cham: 'vampire' }); rolls([0, 99]);
    await turn(); assert.ok(mon.mflee); assert.equal(getRngLog().length, 2);
});

test('fleeing vrocks release a gas cloud once and clear recent tracks', async () => {
    setup({ level: 16 }); const mon = monster('vrock', { mtrack: [{ x: 9, y: 10 }] }); rolls([0, 99, 7]);
    await turn(); assert.equal(mon.mspec_used, 82); assert.equal(game.level.regions.length, 1);
    assert.equal(game.level.regions[0].damage, 8); assert.ok(mon.mflee);
    const oldRegions = game.level.regions.length; await turn(); assert.equal(game.level.regions.length, oldRegions);
});

test('aggravation visits newest monsters first for independent unfreeze draws', () => {
    setup(); const first = monster('human zombie', { mcanmove: false, mfrozen: 7 });
    const second = monster('ghoul', { mcanmove: false, mfrozen: 7 }); rolls([0, 1]); aggravate();
    assert.equal(second.mcanmove, 1); assert.equal(first.mcanmove, false);
    assert.deepEqual(getRngLog(), ['rn2(5)=0', 'rn2(5)=1']);
});

async function drain() {
    const messages = [];
    for (let i = 0; i < 60 && (game._turn_undead || game._message_more); i++) {
        messages.push(game._pending_message || '');
        await rhack(game._command_mode === 'wizardDieConfirm' ? 'n' : ' ');
    }
    assert.equal(game._turn_undead, null, 'turn command completed');
    messages.push(game._pending_message || ''); return messages.join('\n');
}

test('killed() marks HP and conduct before its message pauses inventory and XP cleanup', async () => {
    setup({ level: 6, width: 80 }); const mon = monster('human zombie');
    const item = { id: 82, kind: 'dagger', cls: 'weapon', quan: 1 };
    mon.minvent = [item]; rolls([0, 99, 99, 1]);
    await turn();
    assert.equal(game._message_more, 1); assert.equal(mon.mhp, 0);
    assert.equal(game.u.uconduct.killer, 1); assert.equal(mon.minvent[0], item);
    assert.equal(game.level.objects.includes(item), false);
    assert.equal(game._helpless_time || 0, 0);
    await drain(); assert.equal(game.level.monsters.includes(mon), false);
    assert.equal(game.level.objects.includes(item), true); assert.equal(game.u.uconduct.killer, 1);
    assert.ok(game.u.uexp > 0); assert.equal(game._helpless_time, 5);
});

test('unseen kill feedback does not identify the turned monster', async () => {
    setup({ level: 6 }); game.u.blind = true;
    monster('human zombie', { minvis: true }); rolls([0, 99, 99, 1]);
    await turn(); assert.match(game._pending_message, /You destroy it!/);
    assert.doesNotMatch(game._pending_message, /zombie/);
});

test('turning a vampire uses its life-saving amulet once, without dropping surviving inventory', async () => {
    setup({ level: 12 }); const mon = monster('vampire', { cham: PM_VAMPIRE });
    const amulet = { id: 93, cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 };
    const weapon = { id: 94, cls: 'weapon', kind: 'dagger', quan: 1 };
    mon.minvent = [amulet, weapon]; rolls([0, 99, 99]);
    await turn(); await drain();
    assert.ok(mon.mhp > 0); assert.equal(mon.dead, false); assert.equal(mon.minvent.includes(amulet), false);
    assert.equal(mon.minvent[0], weapon); assert.equal(game.level.objects.includes(weapon), false);
    assert.equal(game.u.uconduct.killer, 1); assert.equal(game.u.uexp || 0, 0);
    assert.equal(getRngLog().length, 3);
});

test('source monster order maps resistance results to the newest target first', async () => {
    setup({ level: 16, align: -1 }); const first = monster('lich'), second = monster('lich');
    rolls([0, 0, 99, 99]); await turn();
    assert.equal(!!second.mpeaceful, false); assert.equal(first.mpeaceful, true);
    assert.equal(getRngLog().length, 4);
});

for (const saved of [false, true]) test(`${saved ? 'saved' : 'live'} More keeps the exact turn phase and resistance draws`, async () => {
    setup({ level: 5 }); monster('human zombie'); monster('human mummy', { mx: 12 });
    rolls([0, 99, 99]); await turn(); await drain(); const expected = [...getRngLog()];
    setup({ level: 5, width: 65 }); monster('human zombie'); monster('human mummy', { mx: 12 });
    rolls([0, 99, 99]); await turn(); assert.equal(game._message_more, 1);
    assert.equal(game.context.move, 0);
    if (saved) {
        const { coreCtx, displayCtx } = game;
        restoreSaveState(encodeSaveState());
        Object.assign(game, { coreCtx, displayCtx });
    }
    await drain();
    assert.deepEqual(getRngLog(), expected); assert.equal(game.u.uconduct.gnostic, 1);
    assert.ok(game.level.monsters.every(mon => mon.mflee)); assert.equal(game.context.move, 1);
});

test('held hero release precedes a fleeing monster message and does not overwrite an existing cooldown', async () => {
    setup({ level: 1 }); const mon = monster('human zombie', { mspec_used: 9 }); game.u.ustuck = mon;
    rolls([0, 99]); await turn();
    assert.equal(game.u.ustuck, null); assert.equal(mon.mspec_used, 9);
    assert.match(game._pending_message, /You get released!.*turns to flee/);
});

test('a sticky polymorphed hero keeps holding the fleeing target', async () => {
    setup({ level: 1 }); game.u._polyself_form = monsterByRndName('owlbear');
    const mon = monster('human zombie'); game.u.ustuck = mon; rolls([0, 99]);
    await turn(); assert.equal(game.u.ustuck, mon); assert.ok(mon.mflee);
    assert.doesNotMatch(game._pending_message, /released/);
});

for (const cooldown of [0, 9]) test(`swallowed turning expels a fog-cloud shifter, preserving cooldown ${cooldown}`, async () => {
    setup(); const mon = monster('fog cloud', { mx: 10, cham: PM_VAMPIRE, mspec_used: cooldown });
    game.u.ustuck = mon; game.u.uswallow = 1; game.u.uswldtim = 8;
    const chain = { id: 98, cls: 'chain', kind: 'iron chain', quan: 1, where: 0 };
    game.u.uchain = chain; game.flags.pickup = false; rolls([0, 99, 0]);
    await turn(); const messages = await drain();
    assert.equal(game.u.uswallow, 0); assert.equal(game.u.ustuck, null); assert.equal(game.u.uswldtim, 0);
    assert.equal(mon.mspec_used, cooldown || 1); assert.ok(mon.mflee);
    assert.ok(game.level.objects.includes(chain)); assert.deepEqual([chain.ox, chain.oy], [10, 10]);
    assert.match(messages, /You get expelled from the fog cloud!/);
    assert.equal(getRngLog().filter(call => call.startsWith('rnd(2)')).length, cooldown ? 0 : 1);
});

for (const level of [1, 7, 13, 19, 25]) test(`level ${level} turn paralysis uses nomul semantics even with Free_action and fast speed`, async () => {
    setup({ level }); Object.assign(game.u, { freeAction: true, veryfast: true, uinvulnerable: true, usleep: 4 });
    game._run_steps_remaining = 5; game._travel_dynamic_target = { x: 15, y: 10 };
    await turn(); assert.equal(game._helpless_time, 5 - Math.floor((level - 1) / 6));
    assert.equal(game.context.move, 1); assert.equal(game.u.uinvulnerable, false); assert.equal(game.u.usleep, 0);
    assert.equal(game._run_steps_remaining, 0); assert.equal(game._travel_dynamic_target, null);
});

test('real moveloop spends one #turn action and advances all five ordinary paralysis ticks', async () => {
    setup(); game.nhDisplay = null; resetInputState(); pushKeys('#turn\n');
    for (;;) {
        try { await moveloop_core(); }
        catch (error) { if (error.message.includes('Input queue empty')) break; throw error; }
    }
    assert.equal(game.moves, 105); assert.equal(game._helpless_time, 0);
    assert.equal(game.u.uconduct.gnostic, 1); assert.match(game._pending_message, /You can move again/);
});

for (const knowledge of [10000, 0]) test(`non-cleric fallback enters the actual known spell with knowledge ${knowledge}`, async () => {
    setup({ role: 'Wizard', level: 30 });
    game.u.acurr.a[1] = 25;
    game._known_spells = [{ name: 'turn undead', level: 6, category: 'cleric', skillLevel: 4, knowledge }];
    rolls([0, 0, 0]); await turn();
    assert.equal(game.u.uconduct?.gnostic || 0, 0); assert.equal(game._helpless_time || 0, 0);
    if (knowledge) {
        assert.equal(game._command_mode, 'spellDirection'); assert.equal(game.u.uen, 170);
        assert.match(game._pending_message, /In what direction/);
    } else {
        assert.match(game._pending_message, /knowledge of this spell is twisted/);
        assert.equal(game.context.move, 1); assert.equal(game.u.uen, 199);
        assert.equal(game.u._confusionTimeout, 21);
    }
});

test('non-cleric fallback rejects stun before forgotten-memory backfire', async () => {
    setup({ role: 'Wizard' }); game.u.stunned = true;
    game._known_spells = [{ name: 'turn undead', level: 6, knowledge: 0 }];
    await turn(); assert.match(game._pending_message, /too impaired to cast/);
    assert.deepEqual(getRngLog(), []); assert.equal(game.context.move, 0);
});

test('swallower expulsion runs automatic pickup before the monster begins fleeing', async () => {
    setup(); game.flags.pickup = true;
    const mon = monster('fog cloud', { mx: 10, cham: PM_VAMPIRE });
    game.u.ustuck = mon; game.u.uswallow = 1;
    const object = { id: 201, cls: 'weapon', kind: 'dagger', otyp: 24, quan: 1, ox: 10, oy: 10, owt: 10 };
    game.level.objects.push(object); rolls([0, 99, 0]); await turn(); await drain();
    assert.equal(game.inventory.includes(object), true); assert.equal(game.level.objects.includes(object), false);
    assert.ok(mon.mflee); assert.equal(game._helpless_time, 5);
});

for (const saved of [false, true]) test(`drowning after expulsion resumes ${saved ? 'saved' : 'live'} #turn after life saving`, async () => {
    setup(); game.flags.pickup = false;
    for (let x = 9; x <= 11; x++) for (let y = 9; y <= 11; y++) game.level.at(x, y).typ = POOL;
    const mon = monster('fog cloud', { mx: 10, cham: PM_VAMPIRE, mspec_used: 9 });
    game.u.ustuck = mon; game.u.uswallow = 1;
    game.inventory.push({ id: 202, cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    rolls([0, 99]); await turn();
    assert.equal(game._command_mode, 'lifeSavingMore'); assert.equal(game._water_continuation?.phase, 'afterDeath');
    assert.equal(!!mon.mflee, false); assert.equal(game._helpless_time || 0, 0);
    if (saved) {
        const { coreCtx, displayCtx } = game;
        restoreSaveState(encodeSaveState()); Object.assign(game, { coreCtx, displayCtx });
    }
    await drain();
    assert.equal(game._water_continuation, null); assert.ok(game.u.uhp > 0);
    assert.ok(game.level.monsters[0].mflee); assert.equal(game.level.monsters[0].mspec_used, 9);
    assert.equal(game.inventory.some(item => item.id === 202), false);
    assert.equal(game.u.uconduct.gnostic, 1); assert.equal(game._helpless_time, 5);
});
