import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, P_ATTACK_SPELL, P_EXPERT } from '../js/const.js';
import { castKnownSpellByName, rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup() {
    resetGame(); initRng(41);
    game.moves = 10; game.flags = { debug: true }; game.context = {}; game._startup_role = 'Wizard';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30,
        uen: 0, uenmax: 100, uhunger: 900, ulevel: 10, acurr: { a: [10, 18, 10, 10, 10, 10] } };
    game.inventory = []; game.level = new GameMap(); game._known_spells = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); enableRngLog({ reset: true });
}

async function wizardCast() {
    for (const ch of '#wizcast\n') await rhack(ch);
}

test('C #wizcast lists all 41 spells with per-page accelerators', async () => {
    setup(); await wizardCast();
    assert.equal(game._command_mode, 'wizCast');
    assert.equal(game._spell_menu_spells.length, 41);
    assert.ok(game._overlay_lines.some(row => row[0] === 2 && row[2] === 'a - dig'));
    assert.ok(game._overlay_lines.some(row => row[0] === 22 && row[2] === 'u - cure sickness'));
    await rhack('>');
    assert.ok(game._overlay_lines.some(row => row[0] === 0 && row[2] === 'a - charm monster'));
    assert.ok(game._overlay_lines.some(row => row[0] === 19 && row[2] === 't - chain lightning'));
    assert.ok(game._overlay_lines.some(row => row[0] === 20 && row[2] === '(2 of 2)'));
    assert.deepEqual(getRngLog(), []);
    assert.equal(game.context.move, 0);
});

for (const state of [{ stunned: true }, { strangled: true }, { _polyself_form: { name: 'stone golem' } },
    { uhunger: 0, acurr: { a: [3, 3, 3, 3, 3, 3] } }])
    test(`forced C casting bypasses rejection: ${JSON.stringify(state)}`, async () => {
        setup(); Object.assign(game.u, state); await wizardCast(); await rhack('k');
        assert.equal(game._command_mode, 'spellDirection');
        assert.equal(game._casting_spell.name, 'force bolt');
        assert.equal(game._casting_spell.force, true);
        assert.equal(game.u.uen, 0);
        assert.equal(game.u.uhunger, state.uhunger ?? 900);
        assert.ok(!getRngLog().some(line => line.startsWith('rnd(100)')));
    });

test('forced casting uses current skill and survives saving its selection', async () => {
    setup(); game._weapon_skill_levels = { [P_ATTACK_SPELL]: P_EXPERT };
    await wizardCast(); const saved = encodeSaveState();
    const { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    await rhack('c');
    assert.equal(game._command_mode, 'spellExplosionTarget');
    assert.equal(game._casting_spell.name, 'fireball');
    assert.equal(game.u.uen, 0);
});

test('forced casting uses the second-page letter as a new local accelerator', async () => {
    setup(); await wizardCast(); await rhack('|'); await rhack('e');
    assert.equal(game._casting_spell.name, 'extra healing');
    assert.equal(game._command_mode, 'spellDirection');
});

test('forced casting menu cancellation consumes no time or random numbers', async () => {
    setup(); await wizardCast(); await rhack('\x1b');
    assert.equal(game._command_mode, null); assert.equal(game.context.move, 0);
    assert.deepEqual(getRngLog(), []);
});

test('wizard casting remains unavailable outside debug mode', async () => {
    setup(); game.flags.debug = false; await wizardCast();
    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /unknown extended command/);
});

for (const [state, message] of [[{ stunned: true }, 'You are too impaired to cast a spell.'],
    [{ strangled: true }, 'You are unable to chant the incantation.']])
    test(`direct known-spell calls repeat C rejection before forgotten backfire: ${message}`, async () => {
        setup(); Object.assign(game.u, state);
        game._known_spells = [{ name: 'turn undead', level: 6, skill: 'cleric', knowledge: 0 }];
        assert.equal(await castKnownSpellByName('turn undead'), true);
        assert.equal(game._pending_message, message);
        assert.equal(game._command_mode, null); assert.equal(game.context.move, 0);
        assert.deepEqual(getRngLog(), []);
    });

test('direct known-spell call accepts forgotten knowledge for C backfire', async () => {
    setup(); game._known_spells = [{ name: 'turn undead', level: 6, skill: 'cleric', knowledge: 0 }];
    assert.equal(await castKnownSpellByName('turn undead'), true);
    assert.match(game._pending_message, /knowledge of this spell is twisted/);
    assert.equal(game.context.move, 1);
    assert.equal(getRngLog().length, 2);
});

test('direct known-spell call reports an absent spell without opening a menu', async () => {
    setup(); assert.equal(await castKnownSpellByName('turn undead'), false);
    assert.equal(game._command_mode ?? null, null); assert.equal(game._overlay_lines ?? null, null);
    assert.deepEqual(getRngLog(), []);
});

for (const name of ['wizard-casting', 'spell-wizard-death', 'spell-rays', 'spell-direction-cancel', 'spell-explosions', 'armor-callbacks']) test(`fresh C oracle: ${name}`, () => {
    const path = fileURLToPath(new URL(`./fixtures/oracles/${name}.session.json`, import.meta.url));
    const child = spawnSync(process.execPath, ['frozen/ps_test_runner.mjs', `--worker-session=${path}`],
        { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(child.status, 0, child.stderr);
    const marker = '__RESULT_ONE__';
    const result = JSON.parse(child.stdout.slice(child.stdout.lastIndexOf(marker) + marker.length));
    assert.equal(result.metrics.screens.matched, result.metrics.screens.total);
    assert.equal(result.metrics.rngCalls.matched, result.metrics.rngCalls.total);
    assert.equal(result.passed, true);
});
