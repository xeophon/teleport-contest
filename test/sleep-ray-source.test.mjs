import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, COULD_SEE, IN_SIGHT, W_ARM, STRAT_WAITMASK, M_SEEN_SLEEP } from '../js/const.js';
import { MONS, S_MIMIC, MR_SLEEP } from '../js/permonst.js';
import { sleepMonst, setMhitmHooks } from '../js/mhitm.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { objectTypeIsKnown } from '../js/object_knowledge.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(kind = 'sleep') {
    resetGame(); initRng(41); game.moves = 100; game.flags = {}; game.context = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100,
        uhunger: 900, ulevel: 12, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap(); game.inventory = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(IN_SIGHT | COULD_SEE));
    const values = Array(4096).fill(19n);
    game.coreCtx = { n: values.length, r: values, m: [], a: 0n, b: 0n, c: 0n }; game.rng.core = game.coreCtx;
    const type = OBJECT_DATA.find(t => t.symbol === `WAN_${kind.toUpperCase()}`);
    const item = { _c_otyp: type.id, kind, cls: 'wand', glyph: '/',
        letter: 'a', known: false, bknown: false, dknown: true, spe: 4 };
    game.inventory = [item]; game._zap_item = item; game._command_mode = 'zapDirection';
    enableRngLog({ reset: true });
    return item;
}

async function finishRay({ save = false } = {}) {
    const messages = [];
    for (let n = 0; n < 30 && (game._player_spell_continuation || game._message_more); n++) {
        if (game._pending_message) messages.push(game._pending_message);
        if (save) {
            const encoded = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
            resetGame(); restoreSaveState(encoded); Object.assign(game, { coreCtx, displayCtx, rng });
        }
        await rhack(' ');
    }
    assert.equal(game._player_spell_continuation || null, null);
    messages.push(game._pending_message || '');
    return messages.join('\n');
}

test('monster sleep transitions match 2,880 compiled C cases', () => {
    resetGame(); initRng(41); game.u = { ulevel: 12 };
    const values = Array(4096).fill(19n);
    game.coreCtx = { n: values.length, r: values, m: [], a: 0n, b: 0n, c: 0n }; game.rng.core = game.coreCtx;
    const cases = JSON.parse(readFileSync(new URL('fixtures/oracles/monster-sleep.json', import.meta.url)));
    for (const [how, amount, sleeping, frozen, movable, mimic, appearance, resistance, expected] of cases) {
        let redraws = 0; setMhitmHooks({ newsym: () => { redraws++; } });
        const mon = { data: { name: 'sleep test species', mlet: mimic ? S_MIMIC : 0, mr: resistance === 3 ? 100 : 0 },
            mx: 10, my: 10, m_lev: 5, msleeping: sleeping, mfrozen: frozen, mcanmove: movable,
            m_ap_type: appearance, meating: 5, mintrinsics: resistance === 1 ? MR_SLEEP : 0,
            minvent: resistance === 2 ? [{ kind: 'orange dragon scales', cls: 'armor', owornmask: W_ARM }] : [] };
        enableRngLog({ reset: true });
        const result = sleepMonst(mon, amount, how === 11 ? 10 : how);
        const actual = [result, mon.msleeping, mon.mfrozen, Number(mon.mcanmove), mon.meating,
            getRngLog().length, mimic ? redraws : 0];
        assert.deepEqual(actual, expected, JSON.stringify({ how, amount, sleeping, frozen, movable, mimic, appearance, resistance }));
    }
    setMhitmHooks({ newsym: null });
});

for (const save of [false, true]) test(`sleep wand hits successive monsters and retains its source state across saves=${save}`, async () => {
    setup();
    game.level.monsters = [11, 12].map((x, index) => ({ m_id: index + 1, data: MONS.find(m => m.name === 'newt'),
        mx: x, my: 10, mhp: 100, mhpmax: 100, mcanmove: true, mfrozen: index * 10, meating: 5,
        mstrategy: STRAT_WAITMASK | 1, minvent: [] }));
    await rhack('l'); await finishRay({ save });
    assert.deepEqual(game.level.monsters.map(m => m.mfrozen), [120, 127]);
    assert.ok(game.level.monsters.every(m => !m.mcanmove && !m.meating && m.mhp === 100 && m.mstrategy === 1));
    assert.equal(getRngLog().filter(r => r.startsWith('d(6,25)')).length, 2);
    assert.equal(getRngLog().filter(r => r.startsWith('rn2(111)')).length, 2, 'wand resistance uses attack level 12');
    assert.equal(game.inventory[0].known, false); assert.equal(objectTypeIsKnown(game.inventory[0]), true);
    assert.equal(game.u.urexp, 10);
});

for (const resistance of ['species', 'intrinsic', 'armor', 'magic'])
    test(`sleep wand rolls duration before ${resistance} resistance`, async () => {
        setup();
        const mon = { data: MONS.find(m => m.name === (resistance === 'species' ? 'gelatinous cube'
            : resistance === 'magic' ? 'Oracle' : 'newt')),
            mx: 11, my: 10, mhp: 100, mhpmax: 100, mcanmove: true, mfrozen: 0, meating: 5,
            mintrinsics: resistance === 'intrinsic' ? MR_SLEEP : 0,
            minvent: resistance === 'armor' ? [{ kind: 'orange dragon scale mail', owornmask: W_ARM }] : [] };
        game.level.monsters = [mon]; await rhack('l'); await finishRay();
        assert.equal(mon.mcanmove, true); assert.equal(mon.mfrozen, 0); assert.equal(mon.meating, 5);
        assert.ok(getRngLog().includes('d(6,25)=120'));
        if (resistance !== 'magic') assert.equal(getRngLog().some(r => r.startsWith('rn2(111)')), false,
            'resistant species/items skip the magic-resistance roll');
    });

for (const direction of ['<', '>']) for (const resistant of [false, true])
    test(`vertical sleep ray ${direction} uses one square and hero resistance=${resistant}`, async () => {
        setup(); game.u.sleepResistance = resistant;
        await rhack(direction); await finishRay();
        assert.equal(getRngLog().filter(r => r.startsWith('rn2(7)')).length, 1);
        assert.equal(getRngLog().filter(r => r.startsWith('rn2(20)')).length, 1);
        assert.equal(getRngLog().filter(r => r.startsWith('d(6,25)')).length, resistant ? 0 : 1);
        assert.equal(game._helpless_time || 0, resistant ? 0 : 120);
        assert.equal(game.inventory[0].known, false);
    });

for (const sticky of [false, true]) test(`sleep ray releases a grabbing monster unless hero sticks=${sticky}`, async () => {
    setup(); game.u.sticks = sticky;
    const mon = { m_id: 1, data: MONS.find(m => m.name === 'owlbear'), mx: 11, my: 10,
        mhp: 100, mhpmax: 100, mcanmove: true, minvent: [] };
    game.level.monsters = [mon]; game.u.ustuck = mon;
    await rhack('l'); const messages = await finishRay();
    assert.equal(game.u.ustuck === mon, sticky);
    assert.equal(messages.includes('grip relaxes'), !sticky);
});

for (const symbol of ['ORANGE_DRAGON_SCALES', 'ORANGE_DRAGON_SCALE_MAIL'])
    for (const state of ['carried', 'worn', 'skin']) test(`hero sleep resistance from ${symbol} while ${state}`, async () => {
        setup();
        game.inventory.push({ _c_otyp: OBJECT_DATA.find(type => type.symbol === symbol).id,
            letter: 'b', cls: 'armor', worn: state === 'worn', _polyselfSkin: state === 'skin' });
        await rhack('>'); await finishRay();
        assert.equal(game._helpless_time || 0, state === 'carried' ? 120 : 0);
        assert.equal(getRngLog().some(r => r.startsWith('d(6,25)')), state === 'carried');
    });

test('sleep ray reaches an engulfer without a range or hit roll', async () => {
    setup(); const mon = { data: MONS.find(m => m.name === 'purple worm'), mx: 10, my: 10,
        mhp: 100, mhpmax: 100, mcanmove: true, minvent: [] };
    game.level.monsters = [mon]; game.u.ustuck = mon; game.u.uswallow = 1;
    game.coreCtx.r[game.coreCtx.n - 8] = 96n; // Wisdom, six duration dice, then the purple worm's resistance roll.
    await rhack('l'); await finishRay();
    assert.equal(mon.mfrozen, 120); assert.equal(game.u.ustuck, mon);
    assert.equal(getRngLog().some(r => r.startsWith('rn2(7)') || r.startsWith('rn2(20)')), false);
    assert.match(game._pending_message, /sleep ray rips into the purple worm/);
});

test('a saved grip-relaxation message returns before releasing the sleeping holder', async () => {
    setup(); game.nhDisplay = { cols: 50 };
    const mon = { m_id: 1, data: MONS.find(m => m.name === 'owlbear'), mx: 11, my: 10,
        mhp: 100, mhpmax: 100, mcanmove: true, minvent: [] };
    game.level.monsters = [mon]; game.u.ustuck = mon;
    await rhack('l');
    assert.equal(game.u.ustuck, mon);
    assert.equal(game._player_spell_continuation.state.releaseGrip, mon);
    await rhack('x'); assert.equal(game.u.ustuck, mon);
    await finishRay({ save: true });
    assert.equal(game.u.ustuck, null);
    assert.equal(getRngLog().filter(r => r.startsWith('d(6,25)')).length, 1);
});

test('saved reflection pauses before learning the shield or wand and resumes each once', async () => {
    const wand = setup(); game.nhDisplay = { cols: 50 };
    const shield = { letter: 'b', kind: 'shield of reflection', cls: 'armor', worn: true,
        dknown: true, known: false, bknown: false, spe: 0 };
    game.inventory.push(shield); game.level.at(11, 10).typ = STONE;
    await rhack('l');
    assert.equal(objectTypeIsKnown(wand), false); assert.equal(objectTypeIsKnown(shield), false);
    const rolls = getRngLog().length; await rhack('x'); assert.equal(getRngLog().length, rolls);
    await finishRay({ save: true });
    assert.ok(game.inventory.every(item => objectTypeIsKnown(item)));
    assert.ok(game.inventory.every(item => item.known === false));
    assert.equal(getRngLog().filter(r => r.startsWith('rn2(7)')).length, 1);
    assert.equal(getRngLog().filter(r => r.startsWith('rn2(19)')).length, 3);
});

for (const known of [false, true]) for (const seen of [false, true])
    for (const blind of [false, true]) for (const hallucinating of [false, true])
        for (const resistant of [false, true]) test(`self sleep: known=${known} seen=${seen} blind=${blind} hallucinating=${hallucinating} resistant=${resistant}`, async () => {
            const wand = setup(); wand.dknown = seen;
            if (known) game._known_object_types = [wand._c_otyp];
            Object.assign(game.u, { blind, hallucinating, sleepResistance: resistant });
            const observer = { data: MONS.find(mon => mon.name === 'wolf'), mx: 10, my: 11, mhp: 100 };
            game.level.monsters = [observer];
            await rhack('.'); await finishRay();
            const learned = !known && (seen || !blind && !hallucinating);
            assert.equal(objectTypeIsKnown(wand), known || learned);
            assert.equal(wand.known, false); assert.equal(wand.bknown, false); assert.equal(wand.spe, 4);
            assert.equal(game.u.urexp || 0, 0, 'zapyourself gives no weffects discovery score');
            assert.equal(!!(observer.m_seenres & M_SEEN_SLEEP), resistant);
            assert.equal(game._helpless_time || 0, resistant ? 0 : 20);
            assert.equal(game.context.move, 1);
            assert.deepEqual(getRngLog(), [...(resistant ? [] : ['rnd(50)=20']), ...(learned ? ['rn2(19)=0'] : [])]);
        });

for (const resistant of [false, true]) test(`self sleep waits for its message before resistance and sleep effects: ${resistant}`, async () => {
    const wand = setup(); game.nhDisplay = { cols: 50 }; game.u.sleepResistance = resistant;
    game._zap_prelude_messages = ['You wrest one last charge from the worn-out wand.'];
    await rhack('.');
    assert.equal(game._player_spell_continuation.kind, 'selfZap');
    assert.equal(objectTypeIsKnown(wand), false);
    assert.deepEqual(getRngLog(), []); assert.equal(game.u.usleep || 0, 0);
    await rhack('x'); assert.deepEqual(getRngLog(), []);
    await finishRay({ save: true });
    assert.equal(objectTypeIsKnown(game.inventory[0]), true);
    assert.equal(game._helpless_time || 0, resistant ? 0 : 20);
});

for (const protection of ['none', 'physical', 'spell', 'resistance'])
    test(`self cold wand uses C direct damage and ${protection} protection`, async () => {
        const wand = setup('cold'); Object.assign(game.u, { uhp: 1000, uhpmax: 1000,
            halfPhysicalDamage: protection === 'physical', halfSpellDamage: protection === 'spell', coldResistance: protection === 'resistance' });
        await rhack('.'); await finishRay();
        assert.equal(1000 - game.u.uhp, protection === 'resistance' ? 0 : protection === 'physical' ? 12 : 24);
        assert.equal(objectTypeIsKnown(wand), true); assert.equal(wand.known, false);
        assert.equal(game.u.urexp || 0, 0);
        assert.deepEqual(getRngLog(), ['d(12,6)=24', 'rn2(5)=4', 'rn2(19)=0']);
    });

test('cold self-zap learns the wand before saved fatal direct damage returns', async () => {
    const wand = setup('cold'); game.u.uhp = 1; game.flags.debug = true;
    await rhack('.');
    assert.equal(objectTypeIsKnown(wand), true);
    assert.equal(game.u.urexp || 0, 0); assert.equal(wand.known, false);
    assert.match(game._death_cause, /zapped himself with a wand of cold/);
    assert.equal(game._player_spell_continuation.kind, 'selfZap');
    const encoded = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(encoded); Object.assign(game, { coreCtx, displayCtx, rng });
    for (let n = 0; n < 20 && (game._player_spell_continuation || game._message_more || game._command_mode); n++)
        await rhack(game._command_mode === 'wizardDieConfirm' ? 'n' : ' ');
    assert.ok(game.u.uhp > 0);
    assert.equal(getRngLog().filter(r => r.startsWith('d(12,6)')).length, 1);
    assert.equal(getRngLog().filter(r => r.startsWith('rn2(19)')).length, 1);
});
