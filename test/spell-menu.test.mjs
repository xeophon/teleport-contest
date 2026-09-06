import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, P_ATTACK_SPELL } from '../js/const.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(count = 4) {
    resetGame(); initRng(41);
    game.moves = 10; game.flags = {}; game.context = {}; game._command_mode = null; game._startup_role = 'Wizard';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30,
        uen: 0, uenmax: 100, uhunger: 900, ulevel: 10, acurr: { a: [10, 18, 10, 10, 10, 10] } };
    game.inventory = []; game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const spells = [{ name: 'healing', level: 1, skill: 'healing', knowledge: 6000 },
        { name: 'magic missile', level: 2, skill: 'attack', knowledge: 8000 },
        { name: 'force bolt', level: 1, skill: 'attack', knowledge: 12000 },
        { name: 'drain life', level: 2, skill: 'attack', knowledge: 16000 }];
    game._known_spells = Array.from({ length: count }, (_, i) => ({ ...spells[i % 4] }));
    vision_reset(); enableRngLog({ reset: true });
}

for (const [state, message] of [[{ stunned: true, strangled: true }, 'You are too impaired to cast a spell.'],
    [{ _stunTimeout: 2 }, 'You are too impaired to cast a spell.'],
    [{ strangled: true }, 'You are unable to chant the incantation.'],
    ...['giant ant', 'killer bee', 'jabberwock', 'shrieker'].map(name =>
        [{ _polyself_form: { name } }, 'You are unable to chant the incantation.'])])
    test(`C rejects casting before spell selection: ${JSON.stringify(state)}`, async () => {
        setup(); Object.assign(game.u, state); await rhack('Z');
        assert.equal(game._pending_message, message);
        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 0); assert.deepEqual(getRngLog(), []);
    });

test('the no-spells message precedes the stunned casting rejection', async () => {
    setup(0); game.u.stunned = true; await rhack('Z');
    assert.equal(game._pending_message, "You don't know any spells right now.");
});

for (const [weapon, shield, allowed] of [['two-handed sword', false, false],
    ['long sword', true, false], ['long sword', false, true], ['quarterstaff', false, true]])
    test(`C freehand casting gate: welded ${weapon}, cursed shield ${shield}`, async () => {
        setup(); game.inventory.push({ kind: weapon, cls: 'weapon', cursed: true, wielded: true });
        if (shield) game.inventory.push({ kind: 'small shield', cls: 'armor', worn: true, cursed: true });
        await rhack('Z');
        assert.equal(game._command_mode, allowed ? 'castSpell' : null);
        if (!allowed) assert.equal(game._pending_message, 'Your arms are not free to cast!');
    });

test('a speaking monster with no hands can cast when its arms are not welded', async () => {
    setup(); game.u._polyself_form = { name: 'red dragon' }; await rhack('Z');
    assert.equal(game._command_mode, 'castSpell');
});

test('failure chance and memory interval use the current spell skill', async () => {
    setup(1); Object.assign(game._known_spells[0], { name: 'fireball', level: 4, skill: 'attack', knowledge: 6000 });
    game._weapon_skill_levels = { [P_ATTACK_SPELL]: 4 };
    await rhack('Z');
    assert.equal(game._spell_menu_spells[0].successChance, 100);
    assert.ok(game._overlay_lines.some(row => String(row[2]).includes('29%-30%')));
});

for (const [count, range] of [[1, 'a'], [2, 'a-b'], [26, 'a-z'], [27, 'a-zA'], [52, 'a-zA-Z']])
    test(`traditional spell selection displays C range for ${count} spells`, async () => {
        setup(count); game.flags.menustyle = 'traditional'; await rhack('Z');
        assert.equal(game._pending_message, `Cast which spell? [${range} *?]`);
        assert.equal(game._command_mode, 'castSpellTraditional');
        await rhack('\x1b'); assert.equal(game._pending_message, 'Never mind.');
        assert.equal(game._command_mode, null); assert.deepEqual(getRngLog(), []);
    });

test('traditional spell selection limits invalid answers and can open the menu', async () => {
    setup(); game.flags.menu_style = 0; await rhack('Z');
    for (let i = 0; i < 10; i++) { await rhack('X'); if (i < 9) await rhack(' '); }
    assert.equal(game._command_mode, null); assert.match(game._pending_message, /That's enough tries/);
    game._pending_message = ''; game._message_more = 0;
    await rhack('Z'); await rhack('?'); assert.equal(game._command_mode, 'castSpell');
});

test('traditional uppercase casting selects the actual 27th spell', async () => {
    setup(27); game.flags.menustyle = 'traditional'; game._known_spells[26].name = 'magic mapping';
    await rhack('Z'); await rhack('A');
    assert.equal(game._casting_spell, null);
    assert.match(game._pending_message, /don't have enough energy/);
    assert.equal(game._command_mode, null);
});

for (const [choice, expected] of [['a', [0, 1, 2, 3]], ['b', [3, 2, 0, 1]],
    ['c', [2, 0, 3, 1]], ['d', [3, 1, 2, 0]], ['e', [3, 2, 1, 0]],
    ['f', [2, 3, 1, 0]], ['g', [3, 1, 2, 0]]])
    test(`source spell sort ${choice} preserves casting slots until retain-order is selected`, async () => {
        setup(); const originals = [...game._known_spells];
        await rhack('+'); await rhack('+'); assert.equal(game._command_mode, 'sortSpells');
        await rhack(choice);
        assert.deepEqual(game._spell_menu_spells.map(s => s.letter), expected.map(i => 'abcd'[i]));
        assert.deepEqual(game._known_spells, originals);
        await rhack('+'); await rhack('z');
        assert.deepEqual(game._known_spells, expected.map(i => originals[i]));
        await rhack('\x1b'); await rhack('Z');
        assert.deepEqual(game._spell_menu_spells.map(s => s.name), expected.map(i => originals[i].name));
        assert.equal(game.context.move, 0); assert.deepEqual(getRngLog(), []);
    });

test('view-only sorting is discarded on exit and current ordering preserves the display', async () => {
    setup(); const originals = [...game._known_spells];
    await rhack('+'); await rhack('+'); await rhack('b');
    const sorted = game._spell_menu_spells.map(s => s.letter);
    await rhack('+'); await rhack('h'); assert.deepEqual(game._spell_menu_spells.map(s => s.letter), sorted);
    await rhack('\x1b'); await rhack('+');
    assert.deepEqual(game._spell_menu_spells.map(s => s.name), originals.map(s => s.name));
});

test('swapping spells preserves full slot contents across a saved prompt', async () => {
    setup(); const originals = structuredClone(game._known_spells);
    await rhack('+'); await rhack('a');
    assert.equal(game._command_mode, 'swapSpells');
    assert.ok(game._overlay_lines.some(row => String(row[2]).includes("Reordering spells; swap 'a' with")));
    const saved = encodeSaveState(); resetGame(); restoreSaveState(saved);
    await rhack('d');
    assert.deepEqual(game._known_spells, [originals[3], originals[1], originals[2], originals[0]]);
    assert.equal(game._command_mode, 'knownSpells');
});

test('C swap cancel returns to viewing, while accepting the preselected original exits', async () => {
    setup(); await rhack('+'); await rhack('b'); await rhack('\x1b');
    assert.equal(game._command_mode, 'knownSpells');
    await rhack('b'); await rhack('\n'); assert.equal(game._command_mode, null);
});

test('one known spell is a view-only menu and zero spells produces a message', async () => {
    setup(1); await rhack('+'); await rhack('a'); assert.equal(game._command_mode, 'knownSpells');
    setup(0); await rhack('+'); assert.equal(game._pending_message, "You don't know any spells right now.");
});

test('52 spell slots use three tty pages, uppercase letters and only visible accelerators', async () => {
    setup(52); await rhack('Z');
    assert.equal(Math.max(...game._overlay_lines.map(row => row[0])), 23);
    assert.ok(game._overlay_lines.some(row => row[2] === '(1 of 3)'));
    await rhack('A'); assert.equal(game._command_mode, 'castSpell');
    await rhack(' '); assert.ok(game._overlay_lines.some(row => String(row[2]).startsWith('A - ')));
    await rhack('|'); assert.ok(game._overlay_lines.some(row => String(row[2]).startsWith('Z - ')));
    await rhack('>'); assert.equal(game._command_mode, 'castSpell');
    await rhack('^'); assert.ok(game._overlay_lines.some(row => row[2] === '(1 of 3)'));
    await rhack(' '); await rhack('A'); assert.match(game._pending_message, /don't have enough energy/);
});

test('wizard sorting retains the C debug turns-column indexing quirk', async () => {
    setup(); game.flags.debug = true; await rhack('+'); await rhack('+'); await rhack('b');
    const row = game._overlay_lines.find(row => String(row[2]).startsWith('d - drain life'));
    assert.ok(row); assert.match(row[2], /6000$/);
    assert.match(row[2], /71%-80%/);
});

for (const name of ['spell-menu', 'spell-traditional']) test(`fresh C oracle: ${name}`, () => {
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
