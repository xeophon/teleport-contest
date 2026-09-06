import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM } from '../js/const.js';
import { initRng, rn2, rnd, enableRngLog, getRngLog } from '../js/rng.js';
import { rhack, processSpellbookStudyOccupation } from '../js/cmd.js';
import { processMonsterTurns } from '../js/allmain.js';
import { vision_reset } from '../js/vision.js';

function setup(changes = {}) {
    resetGame(); initRng(41);
    game.moves = 1; game.flags = { debug: true }; game.context = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30, ulevel: 1,
        uhunger: 900, acurr: { a: [10, 10, 10, 10, 10, 10] }, ...changes };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.inventory = [];
    game._known_spells = [{ name: 'healing', level: 1, skill: 'healing', knowledge: 2 }];
    vision_reset();
}

for (const [state, turns] of [[{}, 1], [{ uinvulnerable: true }, 1], [{ _monsterMove: 6 }, 2]]) {
    test(`spell memory ages on each full turn (${JSON.stringify(state)})`, async () => {
        setup(state);
        await processMonsterTurns();
        assert.equal(game._known_spells[0].knowledge, 2 - turns);
    });
}

test('expired spell memory stays at zero and remains in the spell menu', async () => {
    setup(); game._known_spells[0].knowledge = 0;
    await processMonsterTurns();
    assert.equal(game._known_spells[0].knowledge, 0);
    game._pending_message = ''; game._message_more = 0;
    await rhack('Z');
    assert.ok(game._overlay_lines.some(row => String(row[2]).includes('(gone)')));
});

for (const refreshing of [false, true]) test(`${refreshing ? 'relearning' : 'learning'} a book sets C KEEN+1 spell memory`, async () => {
    setup();
    if (!refreshing) game._known_spells = [];
    const book = { letter: 'a', cls: 'spellbook', kind: 'spellbook of healing', spellName: 'healing', quan: 1 };
    game.inventory = [book];
    game._spellbook_study_occupation = { itemLetter: 'a', name: 'healing', level: 1, skill: 'healing', turns: 0 };
    await processSpellbookStudyOccupation();
    assert.equal(game._known_spells[0].knowledge, 20001);
    game._pending_message = ''; game._message_more = 0;
    await processMonsterTurns();
    assert.equal(game._known_spells[0].knowledge, 20000);
});

for (let branch = 0; branch < 10; branch++) test(`forgotten spell backfire branch ${branch} precedes hunger and strength checks`, async () => {
    let seed = 1;
    for (;; seed++) { initRng(seed); if (rn2(10) === branch) break; }
    initRng(seed); rn2(10); const energyLost = rnd(10);
    setup({ uen: 30, uhunger: 0, _confusionTimeout: 7, acurr: { a: [2, 10, 10, 10, 10, 10] } });
    game._known_spells[0].knowledge = 0;
    game._spell_menu_spells = [{ letter: 'a', name: 'healing', level: 2, successChance: 100 }];
    game._command_mode = 'castSpell';
    initRng(seed); enableRngLog({ reset: true });
    await rhack('a');
    const confusion = branch < 4 ? 9 : branch < 7 ? 6 : branch < 9 ? 3 : 0;
    assert.equal(game.u._confusionTimeout, 7 + confusion);
    assert.equal(game.u._stunTimeout || 0, 9 - confusion);
    assert.equal(game.u.uen, 30 - energyLost);
    assert.equal(game.context.move, 1);
    assert.equal(game._command_mode, null);
    assert.deepEqual(getRngLog().map(row => row.split('=')[0]), ['rn2(10)', 'rnd(10)']);
});

for (const [knowledge, warning] of [[100, 'strain to recall'], [500, 'difficulty remembering'],
    [1000, 'growing faint'], [2000, 'gradually fading']]) test(`spell memory ${knowledge} warns before an energy refusal`, async () => {
    setup({ uen: 0, uenmax: 30 });
    game._known_spells[0].knowledge = knowledge;
    await rhack('Z'); await rhack('a');
    const messages = [game._pending_message, ...(game._queued_messages_after_more || []).map(entry => entry.text)].join('  ');
    assert.match(messages, new RegExp(warning));
    assert.match(messages, /don't have enough energy/);
    assert.equal(game.context.move, 0);
});

test('amnesia preserves spell slots while zeroing a selected memory', async () => {
    // The first losespells draw chooses the only spell; all other amnesia
    // effects follow it and cannot change the retained casting letter.
    let seed = 1;
    for (;; seed++) { initRng(seed); rn2(19); if (rn2(2) === 1) break; }
    setup(); initRng(seed);
    const spell = game._known_spells[0];
    game.inventory = [{ letter: 'a', cls: 'scroll', kind: 'scroll of amnesia', actualKind: 'amnesia', quan: 1, scrollIndex: 15, known: true }];
    await rhack('r'); await rhack('a');
    assert.deepEqual(game._known_spells, [spell]);
    assert.equal(spell.knowledge, 0);
});
