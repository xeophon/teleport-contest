import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { ROOM, STONE } from '../js/const.js';
import { initRng, rn1, rn2, d, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { processMonsterTurns } from '../js/allmain.js';
import { monsterByRndName } from '../js/mklev.js';

function setup(seed, changes = {}, hornChanges = {}) {
    resetGame();
    initRng(seed);
    game.moves = 1;
    game.flags = {};
    game.context = {};
    game.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30, ulevel: 5, uhunger: 900,
        acurr: { a: [10, 10, 10, 10, 10, 10] }, ...changes };
    const cells = Array.from({ length: 80 }, (_, x) => Array.from({ length: 21 }, (_, y) => ({
        typ: x > 0 && x < 79 && y > 0 && y < 20 ? ROOM : STONE, lit: true,
    })));
    game.level = { flags: {}, monsters: [], objects: [], traps: [], engravings: [],
        at: (x, y) => cells[x]?.[y] };
    game.inventory = [{ letter: 'a', kind: 'unicorn horn', cls: 'tool', ...hornChanges }];
    vision_reset();
    game._command_mode = 'applyObject';
}

function seedFor(predicate) {
    for (let seed = 1; seed < 10000; seed++) {
        initRng(seed);
        if (predicate()) return seed;
    }
    throw new Error('No seed for requested C branch');
}

const conditions = [
    ['sickness', '_sickTimeout', { sick: true, usick_type: 3, _statusSuffix: ' Sick' }],
    ['blindness', '_blindTimeout', { blind: true, _statusSuffix: ' Blind' }],
    ['hallucination', '_halluTimeout', { hallucinating: true, _statusSuffix: ' Hallu' }],
    ['vomiting', '_vomitingTimeout', { vomiting: true, _statusSuffix: ' Vom' }],
    ['confusion', '_confusionTimeout', { _statusSuffix: ' Conf' }],
    ['stun', '_stunTimeout', { stunned: true, _statusSuffix: ' Stun' }],
    ['deafness', '_deafTimeout', { _statusSuffix: ' Deaf' }],
];

for (const [name, timer, state] of conditions) {
    test(`unicorn horn cures timed ${name} without altering unrelated problems`, async () => {
        const seed = seedFor(() => rn2(d(2, 2)) > 0);
        setup(seed, { ...state, [timer]: 40, slimed: true, _stoningCountdown: 4, acurr: { a: [5, 5, 5, 5, 5, 5] } });
        await rhack('a');
        assert.equal(game.u[timer], 0);
        assert.equal(game.u._statusSuffix.trim(), '');
        assert.equal(game.u.slimed, true);
        assert.equal(game.u._stoningCountdown, 4);
        assert.deepEqual(game.u.acurr.a, [5, 5, 5, 5, 5, 5]);
        assert.equal(game.inventory.length, 1);
        assert.equal(game.context.move, 1);
    });
}

test('horn with no timed trouble does no RNG and preserves permanent statuses', async () => {
    setup(3, { stunned: true, blind: true, _statusSuffix: ' Stun Blind' });
    enableRngLog({ reset: true });
    await rhack('a');
    assert.deepEqual(getRngLog(), []);
    assert.equal(game.u.stunned, true);
    assert.equal(game.u.blind, true);
    assert.equal(game._pending_message, 'Nothing happens.');
});

test('a failed horn cure consumes the C limit draw and leaves trouble untouched', async () => {
    const seed = seedFor(() => rn2(d(2, 2)) === 0);
    setup(seed, { _confusionTimeout: 40, _statusSuffix: ' Conf' });
    await rhack('a');
    assert.equal(game.u._confusionTimeout, 40);
    assert.equal(game._pending_message, 'Nothing seems to happen.');
});

for (const blessed of [false, true]) {
    test(`${blessed ? 'blessed' : 'uncursed'} horn shuffles all troubles before its cure-limit draw`, async () => {
        setup(8, Object.assign({}, ...conditions.map(([, timer, state]) => ({ ...state, [timer]: 40 }))), { blessed });
        enableRngLog({ reset: true });
        await rhack('a');
        const trace = getRngLog().map(row => row.split('=')[0]);
        assert.deepEqual(trace.slice(0, 7), ['rn2(7)', 'rn2(6)', 'rn2(5)', 'rn2(4)', 'rn2(3)', 'rn2(2)', `d(2,${blessed ? 4 : 2})`]);
        const cured = conditions.filter(([, timer]) => game.u[timer] === 0).length;
        assert.ok(cured <= (blessed ? 7 : 3));
    });
}

test('horn cures timed blindness only down to the remaining cream duration', async () => {
    const seed = seedFor(() => rn2(d(2, 2)) > 0);
    setup(seed, { _blindTimeout: 40, ucreamed: 7, blind: true, _statusSuffix: ' Blind' });
    await rhack('a');
    assert.equal(game.u._blindTimeout, 7);
    assert.equal(game.u.ucreamed, 7);
    assert.equal(game.u.blind, true);
});

test('horn cannot remove cream-only blindness or blindness from an engulfer', async () => {
    for (const swallowed of [false, true]) {
        setup(1, { _blindTimeout: 7, ucreamed: swallowed ? 0 : 7, blind: true,
            uswallow: swallowed, ustuck: { data: monsterByRndName('dust vortex') } });
        enableRngLog({ reset: true });
        await rhack('a');
        assert.equal(game.u._blindTimeout, 7);
        assert.deepEqual(getRngLog(), []);
    }
});

test('curing timed blindness preserves a worn blindfold', async () => {
    const seed = seedFor(() => rn2(d(2, 2)) > 0);
    setup(seed, { _blindTimeout: 40, blind: true, blindfolded: true, _statusSuffix: ' Blind' });
    game.inventory.push({ kind: 'blindfold', cls: 'tool', worn: true, letter: 'b' });
    await rhack('a');
    assert.equal(game.u._blindTimeout, 0);
    assert.equal(game.u.blind, true);
    assert.equal(game.u.blindfolded, true);
});

for (const [branch, name, timer] of conditions.map(([name, timer], index) => [index, name, timer])) {
    // C cursed order differs from cure order: sick, blind, confused,
    // stunned, vomiting, hallucinated, deaf (apply.c:2269-2306).
    const cursedTimers = ['_sickTimeout', '_blindTimeout', '_confusionTimeout', '_stunTimeout', '_vomitingTimeout', '_halluTimeout', '_deafTimeout'];
    test(`cursed horn outcome ${branch} sets its timed condition`, async () => {
        const seed = seedFor(() => { rn1(90, 10); return Math.trunc(rn2(13) / 2) === branch; });
        setup(seed, {}, { cursed: true });
        await rhack('a');
        assert.ok(game.u[cursedTimers[branch]] > 0);
        assert.equal(game.inventory.length, 1);
        if (branch === 0) assert.equal(game.u.usick_type, 2);
        if (branch === 4) assert.equal(game.u._vomitingTimeout, 14);
    });
}

test('a cursed horn shortens existing sickness and retains both sickness types', async () => {
    const seed = seedFor(() => { rn1(90, 10); return rn2(13) < 2; });
    setup(seed, { _sickTimeout: 30, sick: true, usick_type: 1 }, { cursed: true });
    await rhack('a');
    assert.equal(game.u._sickTimeout, 11);
    assert.equal(game.u.usick_type, 3);
});

async function tick() {
    game._pending_time_passed = 1;
    game._pending_message = '';
    game._message_more = 0;
    game._command_mode = null;
    await processMonsterTurns();
}

for (const [time, text] of [[7, 'illness feels worse'], [5, 'illness is severe'], [3, "Death's door"]]) {
    test(`terminal sickness gives its ${time}-turn warning before decrementing`, async () => {
        setup(3, { _sickTimeout: time, sick: true, usick_type: 2, _statusSuffix: ' Ill' });
        await tick();
        assert.equal(game.u._sickTimeout, time - 1);
        assert.match(game._pending_message || '', new RegExp(text));
    });
}

test('prayer invulnerability suspends sickness progression', async () => {
    setup(3, { _sickTimeout: 1, sick: true, usick_type: 2, uinvulnerable: true });
    await tick();
    assert.equal(game.u._sickTimeout, 1);
    assert.notEqual(game._command_mode, 'deathDieMore');
});

for (const lifeSaving of [false, true]) {
    test(`terminal sickness expiry ${lifeSaving ? 'uses life saving' : 'enters death'} without a CON survival roll`, async () => {
        setup(3, { _sickTimeout: 1, sick: true, usick_type: 2, _sicknessCause: 'a unicorn horn', _statusSuffix: ' Ill' });
        const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, letter: 'b' };
        if (lifeSaving) game.inventory.push(amulet);
        enableRngLog({ reset: true });
        await tick();
        assert.equal(game.u._sickTimeout, 0);
        assert.equal(game._command_mode, lifeSaving ? 'lifeSavingMore' : 'deathDieMore');
        assert.match(game._pending_message, /You die from your illness/);
        assert.equal(game._death_cause, 'killed by a unicorn horn');
        assert.equal(game.u.uhp, 30, 'timed death leaves HP intact until the death prompt');
        assert.ok(!getRngLog().some(row => row.startsWith('rn2(100)')));
        if (lifeSaving) {
            assert.ok(!game.inventory.includes(amulet));
            assert.equal(game.u.usick_type, 0);
            assert.equal(game.u.sick, false);
        }
    });
}

test('curing sickness with a horn prevents its next-turn expiry', async () => {
    const seed = seedFor(() => rn2(d(2, 2)) > 0);
    setup(seed, { _sickTimeout: 1, sick: true, usick_type: 2 });
    await rhack('a');
    await tick();
    assert.notEqual(game._command_mode, 'deathDieMore');
    assert.equal(game.u._sickTimeout, 0);
});

for (const recovered of [false, true]) {
    test(`food poisoning ${recovered ? 'recovers' : 'kills'} according to the CON roll`, async () => {
        const seed = seedFor(() => { rn2(2); return (rn2(100) < 10) === recovered; });
        setup(seed, { _sickTimeout: 1, sick: true, usick_type: 1, _statusSuffix: ' Sick' });
        await tick();
        assert.equal(game._command_mode === 'deathDieMore', !recovered);
        if (recovered) {
            assert.equal(game.u.sick, false);
            assert.equal(game.u.usick_type, 0);
            assert.equal(game.u.acurr.a[4], 9);
            assert.match(game._pending_message, /recovered from your illness/);
        }
    });
}

test('hallucinatory terminal warning uses the C random pronoun before CON exercise', async () => {
    setup(5, { _sickTimeout: 3, sick: true, usick_type: 2, hallucinating: true });
    enableRngLog({ reset: true });
    await tick();
    assert.match(game._pending_message, /(?:He is|She is|It is|They are) inviting you in/);
    const trace = getRngLog().map(row => row.split('=')[0]);
    const pronoun = trace.indexOf('rn2(4)');
    assert.ok(pronoun >= 0);
    assert.deepEqual(trace.slice(pronoun, pronoun + 2), ['rn2(4)', 'rn2(2)']);
});

test('declining sickness death clears illness and resumes the interrupted turn', async () => {
    setup(3, { _sickTimeout: 1, sick: true, usick_type: 2, _statusSuffix: ' Ill' });
    game.flags.explore = true;
    await tick();
    await rhack(' ');
    assert.equal(game._command_mode, 'wizardDieConfirm');
    await rhack('n');
    assert.equal(game.u.sick, false);
    assert.equal(game.u.usick_type, 0);
    assert.doesNotMatch(game.u._statusSuffix, /Ill/);
    assert.ok(game.u.uhp > 0);
    assert.equal(game._resume_turn_tail_now, 1);
});

test('an already-vomiting hero expels food poisoning but retains terminal illness', async () => {
    const seed = seedFor(() => { rn1(90, 10); return Math.trunc(rn2(13) / 2) === 4; });
    setup(seed, { _vomitingTimeout: 8, vomiting: true, sick: true, _sickTimeout: 9, usick_type: 3 }, { cursed: true });
    await rhack('a');
    assert.equal(game.u._vomitingTimeout, 8);
    assert.equal(game.u._sickTimeout, 18);
    assert.equal(game.u.usick_type, 2);
    assert.equal(game._helpless_time, 2);
});
