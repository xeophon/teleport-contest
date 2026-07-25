import assert from 'node:assert/strict';
import test from 'node:test';

import { levByName } from '../js/cmd.js';
import { resetGame } from '../js/gstate.js';

// C refs: src/dungeon.c:2098 lev_by_name, src/dungeon.c:2087
// dlev_in_current_branch, src/dungeon.c:311 find_branch (pd == NULL),
// src/dungeon.c:2652 find_mapseen_by_str, src/teleport.c:1248 (caller).
//
// The fabricated dungeon layout below mimics the real topology: oracle,
// medusa and castle live in the main dungeon (dnum 0, depth_start 1),
// valley is the top of Gehennom (dnum 1), minetn is in the Mines (dnum 2)
// and Vlad's Tower (dnum 6) branches up out of Gehennom.

function installDungeonState({ dnum = 0, dlevel = 1, wizard = true } = {}) {
    const g = resetGame();
    g.flags = { debug: wizard };
    g.u = { uz: { dnum, dlevel } };
    g.dungeons = [
        { name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 29 },
        { name: 'Gehennom', depth_start: 26, num_dunlevs: 22 },
        { name: 'The Gnomish Mines', depth_start: 2, num_dunlevs: 9 },
        { name: 'The Quest', depth_start: 10, num_dunlevs: 6 },
        { name: 'Sokoban', depth_start: 5, num_dunlevs: 4 },
        { name: 'Fort Ludios', depth_start: 18, num_dunlevs: 1 },
        { name: "Vlad's Tower", depth_start: 34, num_dunlevs: 3 },
        { name: 'The Elemental Planes', depth_start: 44, num_dunlevs: 6 },
    ];
    g.specialLevels = [
        { name: 'oracle', dnum: 0, dlevel: 8 },
        { name: 'medusa', dnum: 0, dlevel: 24 },
        { name: 'castle', dnum: 0, dlevel: 29 },
        { name: 'valley', dnum: 1, dlevel: 1 },
        { name: 'minetn', dnum: 2, dlevel: 3 },
        { name: 'soko1', dnum: 4, dlevel: 4 },
        { name: 'tower1', dnum: 6, dlevel: 1 },
    ];
    g.branches = [
        { end1: { dnum: 0, dlevel: 2 }, end2: { dnum: 2, dlevel: 1 }, end1_up: true },
        { end1: { dnum: 1, dlevel: 9 }, end2: { dnum: 6, dlevel: 1 }, end1_up: true },
    ];
    g.tower_dnum = 6;
    g._saved_levels = new Map();
    g._level_annotations = new Map();
    return g;
}

test('special level names resolve within the current branch', () => {
    installDungeonState();
    assert.equal(levByName('oracle'), 8);
    assert.equal(levByName('castle'), 29);
    assert.equal(levByName('medusa'), 24);
});

test('name matching is case-insensitive and strips "the "/" level"', () => {
    installDungeonState();
    assert.equal(levByName('ORACLE'), 8);
    assert.equal(levByName('the oracle'), 8);
    assert.equal(levByName('oracle level'), 8);
    assert.equal(levByName('the oracle level'), 8);
    assert.equal(levByName('The Castle Level'), 29);
});

test('delphi is an alias for the oracle level', () => {
    installDungeonState();
    assert.equal(levByName('delphi'), 8);
    assert.equal(levByName('Delphi'), 8);
});

test('gehennom/hell resolve to the valley of the dead', () => {
    installDungeonState();
    assert.equal(levByName('valley'), 26);
    assert.equal(levByName('gehennom'), 26);
    assert.equal(levByName('hell'), 26);
});

test('main dungeon <-> gehennom name ports are allowed', () => {
    // from the main dungeon into gehennom
    installDungeonState({ dnum: 0, dlevel: 1 });
    assert.equal(levByName('valley'), 26);
    // from gehennom back into the main dungeon
    installDungeonState({ dnum: 1, dlevel: 1 });
    assert.equal(levByName('castle'), 29);
    assert.equal(levByName('medusa'), 24);
});

test('cross-branch special level names are rejected', () => {
    installDungeonState({ dnum: 0, dlevel: 1 });
    assert.equal(levByName('minetn'), 0);
    assert.equal(levByName('soko1'), 0);
    assert.equal(levByName('tower1'), 0);
    // ...but they resolve from inside their own branch
    installDungeonState({ dnum: 2, dlevel: 2 });
    assert.equal(levByName('minetn'), 4);
    installDungeonState({ dnum: 6, dlevel: 2 });
    assert.equal(levByName('tower1'), 34);
});

test('gehennom/hell from inside Vlad\'s tower branches " to Vlad\'s tower"', () => {
    installDungeonState({ dnum: 6, dlevel: 2 });
    assert.equal(levByName('gehennom'), 34);
    assert.equal(levByName('hell'), 34);
});

test('branch names resolve to the near end of the branch', () => {
    // "The Gnomish Mines" matches with or without the leading "The"
    installDungeonState({ dnum: 0, dlevel: 1 });
    assert.equal(levByName('gnomish mines'), 2);
    assert.equal(levByName('the gnomish mines'), 2);
    // from Gehennom, "Vlad's Tower" resolves to the gehennom-side end
    installDungeonState({ dnum: 1, dlevel: 5 });
    assert.equal(levByName("vlad's tower"), 34);
    // "<branch> to Xyzzy" wording
    installDungeonState({ dnum: 6, dlevel: 2 });
    assert.equal(levByName('stairs to vlad\'s tower'), 34);
    // from inside the mines, its own branch name resolves to the mines entry
    installDungeonState({ dnum: 2, dlevel: 3 });
    assert.equal(levByName('gnomish mines'), 2);
    // cross-branch branch names are still rejected
    installDungeonState({ dnum: 2, dlevel: 1 });
    assert.equal(levByName("vlad's tower"), 0);
    installDungeonState({ dnum: 0, dlevel: 1 });
    assert.equal(levByName("vlad's tower"), 0);
});

test('unrecognized names and numeric input do not resolve', () => {
    installDungeonState();
    assert.equal(levByName('nowhere'), 0);
    assert.equal(levByName('the mines'), 0); // "the " stripped, "mines" is not a branch name
    assert.equal(levByName('level'), 0);
    assert.equal(levByName(''), 0);
    assert.equal(levByName('8'), 0); // numbers are the caller's atoi() fallback
    assert.equal(levByName('-3'), 0);
});

test('custom level annotations are matched first', () => {
    const g = installDungeonState({ dnum: 0, dlevel: 1 });
    g._level_annotations.set('0:5', 'fountain paradise');
    assert.equal(levByName('fountain paradise'), 5);
    assert.equal(levByName('Fountain Paradise'), 5);
    // an annotation shadows a real level name (mapseen lookup comes first)
    g._level_annotations.set('0:5', 'oracle');
    assert.equal(levByName('oracle'), 5);
});

test('non-wizard name ports require the level to be visited', () => {
    installDungeonState({ dnum: 0, dlevel: 1, wizard: false });
    assert.equal(levByName('oracle'), 0); // never visited
    const g = installDungeonState({ dnum: 0, dlevel: 1, wizard: false });
    g._saved_levels.set('0:8', {});
    assert.equal(levByName('oracle'), 8);
    // standing on the level counts as visited
    installDungeonState({ dnum: 0, dlevel: 8, wizard: false });
    assert.equal(levByName('oracle'), 8);
});

test('non-wizard branch name ports require both ends to be visited', () => {
    const g = installDungeonState({ dnum: 0, dlevel: 1, wizard: false });
    g._saved_levels.set('0:2', {});
    assert.equal(levByName('gnomish mines'), 0); // far end not seen
    g._saved_levels.set('2:1', {});
    assert.equal(levByName('gnomish mines'), 2);
});
