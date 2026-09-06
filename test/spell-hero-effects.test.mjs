import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, P_SKILLED, BLINDED, DEAF, FROMOUTSIDE, W_TOOL } from '../js/const.js';
import { rhack } from '../js/cmd.js';
import { initRng, d, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(spell, state = {}) {
    resetGame(); initRng(41);
    game.moves = 100; game.flags = {}; game.context = {}; game._startup_role = 'Wizard';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100,
        uhppeak: 100, uen: 0, uenmax: 100, uhunger: 900, ulevel: 10,
        acurr: { a: [10, 18, 10, 10, 10, 10] }, ...state };
    game.inventory = []; game.level = new GameMap(); game._known_spells = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game._command_mode = 'spellDirection'; game._casting_spell = { name: spell, skillLevel: P_SKILLED };
    vision_reset(); enableRngLog({ reset: true });
}

for (const spell of ['force bolt', 'magic missile'])
    test(`self ${spell} damages current polymorph HP without touching human HP`, async () => {
        setup(spell, { _polyself_form: { name: 'red dragon' }, mh: 80, mhmax: 80 });
        const damage = d(spell === 'force bolt' ? 2 : 4, spell === 'force bolt' ? 12 : 6);
        initRng(41); await rhack('.');
        assert.equal(game.u.mh, 80 - damage); assert.equal(game.u.uhp, 100);
    });

for (const spell of ['force bolt', 'magic missile'])
    test(`lethal self ${spell} consumes life saving and retains its death prompt through save`, async () => {
        setup(spell, { uhp: 1 });
        game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
        await rhack('.');
        assert.equal(game._command_mode, null);
        assert.ok(game._queued_messages_after_more.at(-1).lifeSaving);
        await rhack(' ');
        assert.equal(game._command_mode, 'lifeSavingMore');
        assert.ok(!game.inventory.some(item => item.kind === 'amulet of life saving'));
        assert.match(game._pending_message, /medallion/);
        const { coreCtx, displayCtx, rng } = game;
        const saved = encodeSaveState(); resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
        await rhack(' '); assert.ok(game.u.uhp > 0);
        assert.notEqual(game._command_mode, 'deathDieMore');
    });

test('physical self-spell uses shared C low-HP warning and stops running', async () => {
    setup('magic missile'); const damage = d(4, 6); initRng(41);
    game.u.uhp = damage + 1; game.multi = 8; game.context.run = 1; game._travel_target = { x: 12, y: 12 };
    await rhack('.');
    assert.equal(game.u.uhp, 1); assert.match(game._pending_message, /Wizard is about to die/);
    assert.equal(game.multi, 0); assert.equal(game.context.run, 0); assert.equal(game._travel_target, null);
});

for (const spell of ['healing', 'extra healing'])
    test(`self ${spell} heals current canonical polymorph HP and preserves human peak`, async () => {
        setup(spell, { _polyself_form: { name: 'red dragon' }, mh: 10, mhmax: 20, uhp: 4 });
        await rhack('.');
        assert.equal(game.u.mh, 20); assert.equal(game.u.uhp, 4); assert.equal(game.u.uhppeak, 100);
    });

test('healing legacy polymorph HP does not alter the human lifetime peak', async () => {
    setup('extra healing', { _polyself_form: { name: 'red dragon' }, _polyself_base: { uhp: 10, uhpmax: 10 },
        uhp: 100, uhpmax: 200, uhppeak: 10 });
    await rhack('.'); assert.equal(game.u.uhppeak, 10);
});

test('healing cures temporary deafness after the blindness message', async () => {
    setup('healing', { blind: true, _blindTimeout: 20, deaf: true, _deafTimeout: 10, ucreamed: 3,
        _statusSuffix: ' Blind Deaf' });
    await rhack('.');
    assert.match(game._pending_message, /You feel better\.  You can see again\.  You can hear again\./);
    assert.equal(game.u._blindTimeout, 0); assert.equal(game.u._deafTimeout, 0); assert.equal(game.u.ucreamed, 0);
});

for (const permanent of ['blindfold', 'eyeless', 'intrinsic'])
    test(`curing temporary blindness preserves ${permanent} blindness and C feedback`, async () => {
        setup('healing', { blind: true, _blindTimeout: 20, _statusSuffix: ' Blind' });
        if (permanent === 'blindfold') game.inventory.push({ cls: 'tool', kind: 'blindfold', worn: true, owornmask: W_TOOL });
        else if (permanent === 'eyeless') game.u._polyself_form = { name: 'black pudding' };
        else game.u.uprops = { [BLINDED]: { intrinsic: FROMOUTSIDE | 20 } };
        await rhack('.'); assert.equal(game.u.blind, true); assert.equal(game.u._blindTimeout, 0);
        assert.doesNotMatch(game._pending_message, /can see again/);
        assert.match(game._pending_message, permanent === 'blindfold' ? /eyes momentarily itch/ : /strange feeling/);
    });

test('Eyes of the Overworld suppress blindness while its timeout is cured', async () => {
    setup('healing', { _blindTimeout: 20 });
    game.inventory.push({ kind: 'lenses', cls: 'tool', worn: true, artifact: 'The Eyes of the Overworld' });
    await rhack('.'); assert.equal(game.u.blind, false);
    assert.match(game._pending_message, /vision seems to brighten for a moment but is normal now/);
});

test('temporary deafness cure preserves permanent deafness and its C message', async () => {
    setup('healing', { deaf: true, _deafTimeout: 10, _statusSuffix: ' Deaf',
        uprops: { [DEAF]: { intrinsic: FROMOUTSIDE | 10 } } });
    await rhack('.');
    assert.equal(game.u.deaf, true); assert.equal(game.u._deafTimeout, 0);
    assert.equal(game.u.uprops[DEAF].intrinsic, FROMOUTSIDE);
    assert.match(game._pending_message, /You are unable to hear anything/);
});

for (const rescue of ['amulet', 'wizard'])
    test(`falling spell rock creation waits for ${rescue} recovery and survives save`, async () => {
        setup('dig', { uhp: 1 }); game.flags.debug = rescue === 'wizard';
        if (rescue === 'amulet') game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
        await rhack('<');
        assert.equal(game.level.objects.length, 0);
        assert.equal(game._player_spell_continuation.kind, 'fallingRock');
        const { coreCtx, displayCtx, rng } = game;
        const saved = encodeSaveState(); resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
        for (let i = 0; i < 8 && game._player_spell_continuation; i++) {
            if (game._command_mode === 'wizardDieConfirm') await rhack('n');
            else await rhack(' ');
        }
        assert.equal(game._player_spell_continuation, null);
        const rocks = game.level.objects.filter(item => item.kind === 'rock');
        assert.equal(rocks.length, 1); assert.equal(rocks[0].quan, 1);
        assert.equal(rocks[0].ox, 10); assert.equal(rocks[0].oy, 10);
        assert.ok(game.u.uhp > 0);
    });

for (const [sick, vomiting, slimed] of [[true, true, false], [true, false, true], [false, true, true], [false, false, false]])
    test(`cure sickness follows healup before spell feedback: ${sick}/${vomiting}/${slimed}`, async () => {
        setup('cure sickness', { sick, _sickTimeout: sick ? 20 : 0, vomiting, _vomitingTimeout: vomiting ? 10 : 0,
            _slimedTimeout: slimed ? 10 : 0 });
        game._command_mode = null; game.flags.debug = true;
        for (const key of '#wizcast\nu') await rhack(key);
        const expected = [vomiting ? 'You feel much less nauseated now.' : '',
            sick ? 'You feel cured.  What a relief!' : '',
            sick || !slimed ? `You are ${sick ? 'no longer' : 'not'} ill.` : '',
            slimed ? 'The slime disappears!' : ''].filter(Boolean).join('  ');
        assert.equal(game._pending_message, expected);
        assert.equal(game.u._sickTimeout, 0); assert.equal(game.u._vomitingTimeout, 0);
        assert.equal(game.u._slimedTimeout || 0, 0);
    });

for (const hp of [1, 5]) test(`light spell uses shared gremlin HP and low-HP punctuation at ${hp} HP`, async () => {
    setup('light', { _polyself_form: { name: 'gremlin' }, mh: hp, mhmax: 20, unchanging: true });
    game.flags.debug = true; game._command_mode = null;
    for (const key of '#wizcast\ng') await rhack(key);
    const messages = [game._pending_message, ...(game._queued_messages_after_more || []).map(item => item.text)].join('  ');
    assert.match(messages, /Ow, that light hurts!/);
    assert.ok(game.u.mh < hp);
    if (!game.u.mh) assert.equal(game._death_cause, 'killed while stuck in creature form');
    else assert.equal(game.u.uhp, 100);
});

for (const resistant of [false, true]) test(`self sleep spell sets C combat wake timestamp only when unresisted: ${resistant}`, async () => {
    setup('sleep', { sleepResistance: resistant }); game._search_pending_count = 5;
    await rhack('.');
    if (resistant) {
        assert.equal(game.u.usleep || 0, 0); assert.equal(game._search_pending_count, 5);
        assert.deepEqual(getRngLog(), []);
    } else {
        assert.equal(game.u.usleep, 100); assert.equal(game.multi, -game._helpless_time);
        assert.equal(game._search_pending_count, 0);
        assert.equal(game.u._deafTimeout || 0, 0);
        assert.match(game._pending_message, /The sleep ray hits you/);
    }
});
