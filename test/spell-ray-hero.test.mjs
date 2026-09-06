import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, P_BASIC, COULD_SEE, IN_SIGHT, M_SEEN_MAGR, M_SEEN_COLD, M_SEEN_SLEEP, M_SEEN_REFL,
    ANTIMAGIC, COLD_RES, FROMOUTSIDE } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(name, extra = {}) {
    resetGame(); initRng(41); game.moves = 100; game.flags = {}; game.context = {};
    game._startup_role = 'Barbarian'; game.inventory = []; game._known_spells = [];
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 1000, uhpmax: 1000,
        uhppeak: 1000, uen: 100, uenmax: 100, uhunger: 900, ulevel: 10, uac: 100,
        acurr: { a: [10, 18, 10, 10, 10, 10] }, ...extra };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.level.at(11, 10).typ = STONE;
    game._command_mode = 'spellDirection'; game._casting_spell = { name, skillLevel: P_BASIC };
    vision_reset(); game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    enableRngLog({ reset: true });
}

async function finishRay() {
    for (let i = 0; i < 30 && (game._player_spell_continuation || game._message_more); i++)
        await rhack(game._command_mode === 'wizardDieConfirm' ? 'n' : ' ');
}

function saveRestore() {
    const { coreCtx, displayCtx, rng } = game, state = encodeSaveState();
    resetGame(); restoreSaveState(state); Object.assign(game, { coreCtx, displayCtx, rng });
}

for (const name of ['magic missile', 'cone of cold'])
    test(`returning ${name} uses canonical polymorph HP`, async () => {
        setup(name, { _polyself_form: { name: 'red dragon' }, mh: 1000, mhmax: 1000 });
        await rhack('l'); await finishRay();
        assert.ok(game.u.mh < 1000); assert.equal(game.u.uhp, 1000);
    });

for (const name of ['magic missile', 'cone of cold'])
    test(`returning ${name} uses half spell damage, independently of half physical damage`, async () => {
        const amounts = [];
        for (const extra of [{}, { halfPhysicalDamage: true }, { halfSpellDamage: true }]) {
            setup(name, extra); await rhack('l'); await finishRay(); amounts.push(1000 - game.u.uhp);
        }
        assert.ok(amounts[0] > 0); assert.equal(amounts[1], amounts[0]);
        assert.equal(amounts[2], Math.ceil(amounts[0] / 2));
    });

test('returning magic missile resistance avoids damage dice and is observed by other monsters', async () => {
    setup('magic missile', { antimagic: true });
    const observer = { data: MONS.find(m => m.name === 'wolf'), mx: 10, my: 11, mhp: 50, m_seenres: 0 };
    game.level.monsters.push(observer);
    await rhack('l'); await finishRay();
    assert.equal(game.u.uhp, 1000); assert.ok(observer.m_seenres & M_SEEN_MAGR);
    assert.ok(!getRngLog().some(line => line.startsWith('d(6,6)')));
});

test('returning sleep uses d(level/2+1,25), shared sleep state, and interrupts study', async () => {
    setup('sleep'); game._search_pending_count = 5;
    await rhack('l'); await finishRay();
    assert.ok(getRngLog().some(line => line.startsWith('d(6,25)')));
    assert.equal(game.u.usleep, 100); assert.equal(game.multi, -game._helpless_time);
    assert.equal(game.u._deafTimeout || 0, 0); assert.equal(game._search_pending_count, 0);
});

test('sleep resistance uses source punctuation, no duration draw, and visible resistance memory', async () => {
    setup('sleep', { sleepResistance: true });
    const observer = { data: MONS.find(m => m.name === 'wolf'), mx: 10, my: 11, mhp: 50, m_seenres: 0 };
    game.level.monsters.push(observer);
    await rhack('l'); await finishRay();
    assert.ok(observer.m_seenres & M_SEEN_SLEEP); assert.equal(game.u.usleep || 0, 0);
    assert.ok(!getRngLog().some(line => line.startsWith('d(6,25)')));
    assert.match(game._pending_message, /You don't feel sleepy\./);
});

for (const rescue of ['amulet', 'wizard'])
    test(`a saved returning missile continues past the hero after ${rescue} recovery`, async () => {
        setup('magic missile', { uhp: 1 }); game.flags.debug = rescue === 'wizard';
        if (rescue === 'amulet') game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
        const target = { data: MONS.find(m => m.name === 'wolf'), mx: 9, my: 10, mhp: 1000, mhpmax: 1000, m_lev: 5 };
        game.level.monsters.push(target);
        await rhack('l');
        assert.equal(target.mhp, 1000); assert.equal(game._player_spell_continuation.kind, 'heroRay');
        saveRestore(); await finishRay();
        assert.ok(game.level.monsters[0].mhp < 1000); assert.ok(game.u.uhp > 0);
        assert.equal(game._player_spell_continuation, null);
        assert.equal(getRngLog().filter(line => line.startsWith('rn2(7)')).length, 1);
    });

test('death ray kills a living polymorph directly instead of reverting its body', async () => {
    setup('finger of death', { _polyself_form: { name: 'red dragon' }, mh: 1000, mhmax: 1000 });
    await rhack('l'); await finishRay();
    assert.equal(game.u.uhp, 0); assert.equal(game.u._polyself_form.name, 'red dragon');
    assert.equal(game.u.mh, 0);
    assert.match(game._death_cause, /finger of death/);
});

for (const form of ['stone golem', 'vrock'])
    test(`death ray uses the nonliving/demon message for ${form}`, async () => {
        setup('finger of death', { _polyself_form: { name: form }, mh: 1000, mhmax: 1000 });
        await rhack('l'); await finishRay();
        assert.equal(game.u.uhp, 1000); assert.equal(game.u.mh, 1000);
        assert.match(game._pending_message, /You seem unaffected\./);
    });

for (const blind of [false, true])
    test(`returning ray honors an equipped reflection amulet with blindness=${blind}`, async () => {
        setup('magic missile', { blind });
        const amulet = { letter: 'a', kind: 'amulet of reflection', cls: 'amulet', worn: true, quan: 1 };
        game.inventory.push(amulet);
        const observer = { data: MONS.find(m => m.name === 'wolf'), mx: 10, my: 11, mhp: 50, m_seenres: 0 };
        game.level.monsters.push(observer);
        await rhack('l'); await finishRay();
        assert.equal(game.u.uhp, 1000); assert.ok(observer.m_seenres & M_SEEN_REFL);
        assert.equal(!!amulet.known, !blind);
    });

test('a narrow tty pauses at the hit message before ray damage and survives a saved game', async () => {
    setup('magic missile');
    game.nhDisplay = { cols: 50 };
    await rhack('l');
    assert.equal(game.u.uhp, 1000); assert.equal(game._player_spell_continuation.kind, 'heroRay');
    assert.ok(!getRngLog().some(line => line.startsWith('d(6,6)')));
    saveRestore(); await finishRay(); assert.ok(game.u.uhp < 1000);
});

for (const rescue of ['amulet', 'wizard'])
    test(`cold inventory death waits for ${rescue} before the ray's separate direct damage`, async () => {
        setup('cone of cold', { uhp: 1 }); initRng(1); game.flags.debug = rescue === 'wizard';
        if (rescue === 'amulet') game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
        game.inventory.push({ letter: 'p', cls: 'potion', kind: 'potion of healing', quan: 8 });
        await rhack('l');
        const inventory = game._player_spell_continuation.state.inventory;
        assert.equal(inventory.phase, 'damage');
        assert.equal(game.inventory.find(item => item.letter === 'p').quan, 8);
        assert.equal(game.u.uhp, 1);
        assert.equal(inventory.destroyed, 4); assert.equal(inventory.damage, 4);
        saveRestore(); await finishRay();
        assert.equal(game.inventory.find(item => item.letter === 'p').quan, 4);
        assert.equal(game.u.uhp, rescue === 'amulet' ? 66 : 76);
        assert.equal(getRngLog().filter(line => line.startsWith('d(6,6)')).length, 1);
        assert.equal(getRngLog().filter(line => line.startsWith('rnd(4)')).length, 1);
        assert.equal(game._player_spell_continuation, null);
    });

test('half spell damage does not reduce cold inventory damage', async () => {
    setup('cone of cold', { halfSpellDamage: true }); initRng(1);
    game.inventory.push({ letter: 'p', cls: 'potion', kind: 'potion of healing', quan: 8 });
    await rhack('l'); await finishRay();
    assert.equal(game.u.uhp, 1000 - 4 - 12);
});

test('cold resistance protects the body while carried potions can still shatter', async () => {
    setup('cone of cold', { coldResistance: true }); initRng(1);
    game.inventory.push({ letter: 'p', cls: 'potion', kind: 'potion of healing', quan: 8 });
    await rhack('l'); await finishRay();
    assert.equal(game.u.uhp, 996); assert.equal(game.inventory[0].quan, 4);
});

test('the ray restores the pre-existing bhit position only when traversal completes', async () => {
    setup('magic missile'); game.bhitpos = { x: 42, y: 7 };
    game.nhDisplay = { cols: 50 };
    await rhack('l'); saveRestore(); await finishRay();
    assert.deepEqual(game.bhitpos, { x: 42, y: 7 });
});

test('observers retain prior reflection memory until zhitu returns from saved death recovery', async () => {
    setup('magic missile', { uhp: 1 }); game.flags.debug = true;
    game.level.monsters.push({ data: MONS.find(mon => mon.name === 'wolf'), mx: 10, my: 11,
        mhp: 50, m_seenres: M_SEEN_REFL });
    await rhack('l');
    assert.ok(game.level.monsters[0].m_seenres & M_SEEN_REFL);
    saveRestore(); await finishRay();
    assert.equal(game.level.monsters[0].m_seenres & M_SEEN_REFL, 0);
});

test('dobuzz hallucinated beam selection uses core RNG even before the swallowed guard', async () => {
    setup('magic missile', { hallucinating: true, uswallow: true });
    game.u.ustuck = { data: MONS.find(mon => mon.name === 'purple worm'), mx: 10, my: 10, mhp: 1000, mhpmax: 1000 };
    await rhack('l');
    assert.equal(getRngLog()[1].split('=')[0], 'rn2(6)');
});

for (const female of [false, true]) test(`reflected spell death attributes the cast using C flags.female=${female}`, async () => {
    setup('magic missile', { uhp: 1, female: !female }); game.flags.female = female;
    await rhack('l');
    assert.equal(game._death_cause, `killed by a magic missile cast by ${female ? 'herself' : 'himself'}`);
});

test('cancelled spell directions clear the previous vertical component and release at self', async () => {
    setup('magic missile'); game._last_spell_dir = { dx: 0, dy: 0, dz: -1 };
    await rhack('\x1b'); await finishRay();
    assert.ok(getRngLog().some(line => line.startsWith('d(4,6)')));
    assert.ok(!getRngLog().some(line => line.startsWith('rn2(7)')));
});

test('cancelled directions bypass confusion redirection before reusing horizontal direction', async () => {
    setup('magic missile', { _confusionTimeout: 10 }); game._last_spell_dir = { dx: 1, dy: 0, dz: 0 };
    await rhack('\x1b'); await finishRay();
    assert.equal(getRngLog()[0].split('=')[0], 'rn2(19)');
});

test('a cancelled ray publishes the energy-release message before traversal', async () => {
    setup('magic missile'); game._last_spell_dir = { dx: 1, dy: 0, dz: 0 };
    await rhack('\x1b');
    assert.match(game._pending_message, /The magical energy is released!/);
    await finishRay();
});

test('hallucinated ray names draw afresh at bounce and hit before zhitu damage', async () => {
    setup('magic missile', { hallucinating: true });
    await rhack('l'); await finishRay();
    const calls = getRngLog().map(line => line.split('=')[0]);
    assert.deepEqual(calls.slice(0, 8), ['rn2(19)', 'rn2(6)', 'rn2(7)', 'rn2(96)',
        'rn2(20)', 'rn2(96)', 'd(6,6)', 'rn2(2)']);
    assert.match(game._pending_message, /The blast of .*hits you!/);
});

test('a hallucinated fatal ray preserves its actual type in the death cause', async () => {
    setup('magic missile', { hallucinating: true, uhp: 1 });
    await rhack('l'); await finishRay();
    assert.equal(game._death_cause, 'killed by a magic missile cast by himself');
    assert.equal(getRngLog().filter(line => line.startsWith('rn2(96)')).length, 2);
});

for (const [name, property] of [['magic missile', ANTIMAGIC], ['cone of cold', COLD_RES]])
    for (const source of ['intrinsic', 'extrinsic'])
        test(`returning ${name} respects canonical ${source} resistance`, async () => {
            setup(name, { uprops: { [property]: { [source]: FROMOUTSIDE } } });
            await rhack('l'); await finishRay();
            assert.equal(game.u.uhp, 1000);
        });

for (const [name, formName] of [['cone of cold', 'lich'], ['cone of cold', 'frost giant'],
    ['magic missile', 'Angel'], ['magic missile', 'Oracle'], ['magic missile', 'Yeenoghu'],
    ['magic missile', 'Chromatic Dragon'], ['magic missile', 'baby gray dragon']])
    test(`returning ${name} respects ${formName}'s canonical form resistance`, async () => {
        setup(name, { _polyself_form: MONS.find(form => form.name === formName), mh: 1000, mhmax: 1000 });
        await rhack('l'); await finishRay();
        assert.equal(game.u.mh, 1000); assert.equal(game.u.uhp, 1000);
    });

for (const [name, extra, mask, message] of [
    ['magic missile', { antimagic: true }, M_SEEN_MAGR, /missiles bounce off/],
    ['cone of cold', { coldResistance: true }, M_SEEN_COLD, /don't feel cold/],
    ['sleep', { sleepResistance: true }, M_SEEN_SLEEP, /don't feel sleepy/]])
    test(`${name} resistance memory waits for its saved resistance-message boundary`, async () => {
        setup(name, extra); game.nhDisplay = { cols: 50 };
        game.level.monsters.push({ data: MONS.find(mon => mon.name === 'wolf'), mx: 10, my: 11, mhp: 50, m_seenres: 0 });
        await rhack('l');
        for (let i = 0; i < 10; i++) {
            const queued = [game._pending_message, game._topline_after_more, game._queued_message_after_more,
                ...(game._queued_messages_after_more || []).map(entry => entry.text)].join(' ');
            if (message.test(queued)) break;
            await rhack(' ');
        }
        assert.ok(game._message_more || game._topline_after_more);
        assert.equal(game.level.monsters[0].m_seenres & mask, 0, 'zhitu observes resistance only after pline returns');
        saveRestore(); await finishRay();
        assert.ok(game.level.monsters[0].m_seenres & mask); assert.equal(game.u.uhp, 1000);
    });
