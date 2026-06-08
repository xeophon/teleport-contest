import assert from 'node:assert/strict';
import test from 'node:test';

import { GameMap } from '../js/game.js';
import { game, resetGame } from '../js/gstate.js';
import { NethackGame } from '../js/jsmain.js';
import {
    encodeBonesLevel,
    encodeSaveState,
    restoreSaveState,
    restoredPolymorphedGenocideWelcomeMessage,
} from '../js/save.js';
import { InMemoryStorage } from '../js/storage.js';

test('bones restore identity count treats death-cleanup thrown objects as ordinary floor objects', () => {
    resetGame();
    game.plname = 'Elara';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 } };
    game.inventory = [];
    game.stairs = null;
    game.level = new GameMap();
    game.level.objects = [
        { id: 10, kind: 'arrow', quan: 1, ox: 10, oy: 10, _deathCleanupThrownObject: true },
        { id: 11, kind: 'arrow', quan: 1, ox: 11, oy: 10, transientProjectile: true },
        { id: 12, kind: 'rock', quan: 1, ox: 12, oy: 10 },
    ];
    game.level.buriedobjlist = [{ id: 13, kind: 'rock', quan: 1 }];
    game.level.monsters = [];

    const bones = JSON.parse(encodeBonesLevel());

    assert.equal(bones.restoreIdentityCount, 5);
});

test('bones encoding force-places object from active launch drop spot', () => {
    resetGame();
    game.plname = 'Elara';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 } };
    game.inventory = [];
    game.stairs = null;
    game.level = new GameMap();
    const boulder = { id: 20, otyp: 465, kind: 'boulder', quan: 1, ox: 6, oy: 3, otrapped: 1 };
    game.level.objects = [];
    game.level.buriedobjlist = [];
    game.level.monsters = [];
    game._launch_drop_spot = { obj: boulder, x: 4, y: 3 };

    const bones = JSON.parse(encodeBonesLevel());
    const bonesBoulder = bones.level.objects.find(obj => obj.id === boulder.id);

    assert.equal(bonesBoulder.ox, 4);
    assert.equal(bonesBoulder.oy, 3);
    assert.equal(bonesBoulder.otrapped, 0);
    assert.equal(game.level.objects.includes(boulder), true);
    assert.equal(game._launch_drop_spot, undefined);
    assert.equal(bones.restoreIdentityCount, 1);
});

test('restore welcome reports still dead inside for saved polymorphed base genocide', () => {
    resetGame();
    game.plname = 'Elara';
    game.flags = {};
    game._startup_role = 'Wizard';
    game.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    game._startup_race = 'dwarf';
    game.urace = { adj: 'dwarven', noun: 'dwarf' };
    game._genocided_monsters = ['dwarf'];
    game.u = {
        uhp: -1,
        uhpmax: 20,
        mh: 4,
        mhmax: 4,
        _polyself_form: { name: 'newt', mlet: ':', glyph: ':' },
    };

    const saved = encodeSaveState();
    resetGame();
    restoreSaveState(saved);

    assert.equal(
        restoredPolymorphedGenocideWelcomeMessage(),
        "You're back, but you still feel dead inside.",
    );
    assert.equal(game.u.uhp, -1);
    assert.equal(game.u.mh, 4);
});

test('restored polymorphed base genocide replaces normal welcome-back line', async () => {
    resetGame();
    game.plname = 'Elara';
    game._savefile = 'save/Elara.e';
    game.flags = { legacy: true };
    game._startup_role = 'Wizard';
    game.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    game._startup_race = 'dwarf';
    game.urace = { adj: 'dwarven', noun: 'dwarf' };
    game._startup_gender = 'male';
    game._startup_align = 'neutral';
    game._genocided_monsters = ['dwarf'];
    game.u = {
        ux: 10,
        uy: 10,
        uz: { dnum: 0, dlevel: 1 },
        uhp: -1,
        uhpmax: 20,
        mh: 4,
        mhmax: 4,
        _polyself_form: { name: 'newt', mlet: ':', glyph: ':' },
    };
    game.level = new GameMap();
    game.inventory = [];
    game.stairs = null;

    const storage = new InMemoryStorage();
    storage.setItem('vfs:save/Elara.e', encodeSaveState());
    const nhGame = new NethackGame({
        storage,
        seed: 1,
        datetime: '20260608120000',
        nethackrc: 'OPTIONS=name:Elara,role:Wizard,race:dwarf,gender:male,align:neutral,!tutorial',
    });

    await nhGame.start();

    assert.equal(game._pending_message, "You're back, but you still feel dead inside.");
    assert.equal(game._welcome_message, 1);
    assert.equal(game._message_more, 1);
    assert.doesNotMatch(game._pending_message, /welcome back to NetHack/);
    assert.equal(storage.getItem('vfs:save/Elara.e'), null);
});

test('restore welcome uses nonliving dead-inside adjectives', () => {
    resetGame();
    game.flags = {};
    game._startup_role = 'Wizard';
    game.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    game._startup_race = 'human';
    game.urace = { adj: 'human', noun: 'human' };
    game._genocided_monsters = ['humans'];
    game.u = { _polyself_form: { name: 'vampire', mlet: 'V', glyph: 'V' } };
    assert.equal(
        restoredPolymorphedGenocideWelcomeMessage(),
        "You're back, but you still feel condemned inside.",
    );

    game.u._polyself_form = { name: 'air vortex', mlet: 'v', glyph: 'v' };
    assert.equal(
        restoredPolymorphedGenocideWelcomeMessage(),
        "You're back, but you still feel empty inside.",
    );
});

test('restore welcome only changes when base hero is genocided while polymorphed', () => {
    resetGame();
    game.flags = {};
    game._startup_role = 'Wizard';
    game.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    game._startup_race = 'dwarf';
    game.urace = { adj: 'dwarven', noun: 'dwarf' };
    game._genocided_monsters = ['newt'];
    game.u = { _polyself_form: { name: 'newt', mlet: ':', glyph: ':' } };
    assert.equal(restoredPolymorphedGenocideWelcomeMessage(), '');

    game._genocided_monsters = ['dwarf'];
    game.u._polyself_form = null;
    assert.equal(restoredPolymorphedGenocideWelcomeMessage(), '');
});
