import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, A_INT } from '../js/const.js';
import { initRng, rn2, enableRngLog, getRngLog } from '../js/rng.js';
import { rhack, processSpellbookStudyOccupation } from '../js/cmd.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';
import { vision_reset } from '../js/vision.js';
import { GameDisplay } from '../js/game_display.js';
import { HeadlessTerminal } from '../js/terminal.js';

function setup(knowledge = null, studied = 0) {
    resetGame(); resetInputState(); initRng(41);
    game.moves = 10; game.context = {}; game.flags = {}; game._startup_role = 'Knight';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30,
        uen: 100, uenmax: 100, uhunger: 900, ulevel: 10, umovement: 12,
        acurr: { a: [10, 18, 10, 10, 10, 10] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const book = { letter: 'a', cls: 'spellbook', kind: 'spellbook of healing', spellName: 'healing',
        quan: 1, blessed: true, spestudied: studied };
    game.inventory = [book];
    game._known_spells = knowledge == null ? [] : [{ name: 'healing', level: 1, knowledge }];
    game._command_mode = 'readObject'; vision_reset(); enableRngLog({ reset: true });
    return book;
}

for (const knowledge of [0, 1, 2000, 2001, 20000]) test(`C study refresh threshold at ${knowledge}`, async () => {
    setup(knowledge); await rhack('a');
    if (knowledge > 2000) {
        assert.equal(game._command_mode, 'readRepeatMore');
        assert.equal(game.context.move, 0);
    } else {
        assert.ok(game._spellbook_study_occupation);
        assert.equal(game.context.move, 1);
    }
});

for (const answer of ['y', 'n', '\x1b']) test(`refresh confirmation ${JSON.stringify(answer)} completes the read command`, async () => {
    setup(20000); await rhack('a'); await rhack('\r'); await rhack(answer);
    assert.equal(game._command_mode, null);
    assert.equal(!!game._spellbook_study_occupation, answer === 'y');
    assert.equal(game.context.move || 0, answer === 'y' ? 1 : 0);
});

for (const known of [false, true]) for (const studied of [2, 3, 4])
    test(`${known ? 'relearning' : 'learning'} spellbook used ${studied} times follows C fading threshold`, async () => {
        const book = setup(known ? 0 : null, studied);
        game._spellbook_study_occupation = { itemLetter: 'a', name: 'healing', level: 1, turns: 0 };
        await processSpellbookStudyOccupation();
        const faded = studied >= (known ? 4 : 3);
        assert.equal(book.kind === 'spellbook of blank paper', faded);
        assert.equal(game._known_spells.length, known || !faded ? 1 : 0);
        if (faded) {
            assert.ok(book.spestudied >= 0 && book.spestudied < studied);
            assert.equal(game._known_spells[0]?.knowledge || 0, 0);
            assert.match(game._pending_message, new RegExp(known ? 'too faint to be read any more' : 'too faint to read even once'));
        } else {
            assert.equal(book.spestudied, studied + 1);
            assert.equal(game._known_spells[0].knowledge, 20001);
        }
    });

for (const worn of [false, true]) test(`lenses ${worn ? 'worn' : 'carried'} use C per-occupation speed roll`, async () => {
    setup(); game.inventory.push({ cls: 'tool', kind: 'lenses', worn });
    game._spellbook_study_occupation = { itemLetter: 'a', name: 'healing', level: 1, turns: 4 };
    let seed = 1; for (;; seed++) { initRng(seed); if (rn2(2)) break; }
    initRng(seed); enableRngLog({ reset: true });
    await processSpellbookStudyOccupation();
    assert.equal(game._spellbook_study_occupation.turns, worn ? 2 : 3);
    assert.deepEqual(getRngLog().map(row => row.split('=')[0]), worn ? ['rn2(2)'] : []);
});

test('lenses can complete the last study delay in the same occupation call', async () => {
    const book = setup(); game.inventory.push({ cls: 'tool', kind: 'lenses', worn: true });
    game._spellbook_study_occupation = { itemLetter: 'a', name: 'healing', level: 1, turns: 1 };
    let seed = 1; for (;; seed++) { initRng(seed); if (rn2(2)) break; }
    initRng(seed); await processSpellbookStudyOccupation();
    assert.equal(game._spellbook_study_occupation, null);
    assert.equal(book.spestudied, 1);
});

for (const worn of [false, true]) test(`reading ability uses C intelligence index and ${worn ? 'worn' : 'carried'} lenses`, async () => {
    const book = setup(); book.blessed = false;
    game.u.acurr.a[A_INT] = 3; game.u.acurr.a[3] = 25;
    game.u.ulevel = 1; game._startup_role = 'Wizard';
    game.inventory.push({ cls: 'tool', kind: 'lenses', worn });
    await rhack('a');
    assert.equal(game._command_mode, 'readDifficultyPrompt');
    assert.match(game._pending_message, /very difficult to comprehend/);
    assert.deepEqual(getRngLog(), []);
    await rhack('n');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(book.in_use, false);
});

for (const messageWidth of [80, 200]) test(`study occupation charges C completion turn with ${messageWidth}-column messages`, async () => {
    setup(); game.nhDisplay = new GameDisplay(new HeadlessTerminal({ cols: messageWidth }));
    await rhack('a'); game._pending_time_passed = game.context.move; game.context.move = 0;
    for (let i = 0; i < 12; i++) {
        pushKey(game._message_more ? ' ' : '\x1b'); await moveloop_core();
        if (!game._spellbook_study_occupation && !game._spellbook_finish_after_topline_more
            && !game._pending_time_passed && !game._message_more) break;
    }
    assert.equal(game._spellbook_study_occupation, null);
    assert.equal(game.moves, 14, 'read command, two delay ticks, completion tick each cost one turn');
    assert.equal(game._known_spells[0].knowledge, 20000, 'completed occupation time ages KEEN+1 before next command');
});

for (const worn of [false, true]) test(`Wizard reading difficulty includes the ${worn ? 'worn' : 'carried'} lenses bonus`, async () => {
    const book = setup(); book.blessed = false;
    game.u.acurr.a[A_INT] = 9; game.u.ulevel = 1; game._startup_role = 'Wizard';
    game.inventory.push({ cls: 'tool', kind: 'lenses', worn });
    await rhack('a');
    assert.equal(game._pending_message.includes('very difficult'), !worn);
});

for (const known of [false, true]) test(`${known ? 'relearning' : 'first learning'} exercises wisdom in C order around a blocked message`, async () => {
    const book = setup(known ? 0 : null); game._pending_message = 'A'.repeat(71);
    game._spellbook_study_occupation = { item: book, itemLetter: 'a', name: 'healing', level: 1, turns: 0 };
    await processSpellbookStudyOccupation();
    assert.equal(game._known_spells[0].knowledge, known ? 0 : 20001);
    assert.equal(book.spestudied, known ? 0 : 1);
    assert.equal(getRngLog().length, 1, 'initial wisdom exercise precedes learn message');
    await rhack(' ');
    assert.equal(game._known_spells[0].knowledge, 20001);
    assert.equal(book.spestudied, 1);
    assert.equal(getRngLog().length, known ? 2 : 1, 'extra wisdom exercise applies only to relearning');
});

for (const removed of [false, true]) test(`spell study follows object identity when the book is ${removed ? 'removed' : 'relettered'}`, async () => {
    const book = setup(); await rhack('a');
    book.letter = 'b'; if (removed) game.inventory = [];
    game._spellbook_study_occupation.turns = 0;
    game._pending_message = '';
    await processSpellbookStudyOccupation();
    assert.equal(game._known_spells.length, removed ? 0 : 1);
    assert.equal(book.spestudied, removed ? 0 : 1);
});

test('twenty-seventh learned spell uses C uppercase casting letter', async () => {
    const book = setup(); game._known_spells = Array.from({ length: 26 }, (_, i) => ({ name: `prior ${i}`, knowledge: 100 }));
    game._spellbook_study_occupation = { item: book, name: 'healing', level: 1, turns: 0 };
    await processSpellbookStudyOccupation();
    assert.match(game._pending_message, /as 'A'\./);
});

for (const speed of [6, 24]) test(`study ticks once per hero action at speed ${speed}`, async () => {
    const book = setup(); game.u._monsterMove = speed;
    await rhack('a'); game._pending_time_passed = game.context.move; game.context.move = 0;
    let calls = 0;
    game._preNhgetchHook = () => { calls++; };
    pushKey('\x1b'); await moveloop_core();
    assert.equal(book.spestudied, 1);
    assert.equal(game._spellbook_study_occupation, null);
    assert.equal(calls, 1, 'no input is read between occupation ticks');
    assert.equal(game.moves, speed === 6 ? 18 : 12);
});
