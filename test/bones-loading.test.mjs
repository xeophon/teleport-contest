import assert from 'node:assert/strict';
import test from 'node:test';

import { GameMap } from '../js/game.js';
import { game, resetGame } from '../js/gstate.js';
import { fixupRestoredBonesLevel, getbones } from '../js/mklev.js';
import { enableRngLog, getRngLog, initRng, rn2 } from '../js/rng.js';
import { encodeBonesLevel } from '../js/save.js';
import { InMemoryStorage, vfsReadFile, vfsWriteFile } from '../js/storage.js';
import { PM_WIZARD } from '../js/permonst.js';

function ghostOf(name, x, y) {
    return {
        id: 99,
        mx: x,
        my: y,
        data: {
            name: 'ghost',
            glyph: ' ',
            mlet: 'ghost',
            mlevel: 10,
            mac: -5,
            mmove: 3,
            maligntyp: -5,
            passWalls: true,
            noCorpse: true,
            undead: true,
        },
        glyph: ' ',
        m_lev: 3,
        mhp: 20,
        mhpmax: 20,
        msleeping: 1,
        mpeaceful: 0,
        female: false,
        givenName: name,
    };
}

function seedWithBonesFind() {
    for (let seed = 1; seed < 100; seed++) {
        initRng(seed);
        if (rn2(3) === 0) return seed;
    }
    throw new Error('no seed with a successful getbones rn2(3) roll');
}

test('bones load rebuilds ghost, corpse, and dropped inventory, then unlinks', async () => {
    // old hero dies on 0:1 leaving a ghost, a named corpse, and inventory
    resetGame();
    initRng(1);
    const storage = new InMemoryStorage();
    game.mockStorage = storage;
    game.plname = 'Elara';
    game.flags = {};
    game.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 }, ulevel: 3, uhpmax: 20 };
    game.inventory = [{ id: 11, kind: 'dagger', quan: 1, cursed: true }];
    game.stairs = null;
    game.level = new GameMap();
    // C bones.c preserves names on role corpses (corpsenm >= SPECIAL_PM).
    game.level.objects = [{ id: 10, kind: 'corpse', quan: 1, ox: 5, oy: 5,
        oname: 'Elara', corpsenm: { name: 'wizard', pm: PM_WIZARD } }];
    game.level.monsters = [{
        id: 20,
        mx: 8,
        my: 6,
        data: { name: 'kobold', glyph: 'k', mlet: 'k', maligntyp: -3 },
        mpeaceful: 0,
    }];
    game._bones_ghost = ghostOf('Elara', 5, 5);
    assert.equal(vfsWriteFile('/bones/0:1', encodeBonesLevel()), true);

    // new hero enters 0:1 and finds the bones
    resetGame();
    game.mockStorage = storage;
    game.plname = 'Nero';
    game.flags = {};
    game.u = { ux: 1, uy: 1, uz: { dnum: 0, dlevel: 1 }, ualign: { type: 0, record: 0 } };
    game.inventory = [];
    game.level = new GameMap();

    const seed = seedWithBonesFind();
    initRng(seed);
    enableRngLog();
    const found = await getbones();

    assert.equal(found, true);
    // C ref: bones.c getbones() — the bones file is unlinked after a normal load
    assert.equal(vfsReadFile('/bones/0:1'), null);

    const ghost = (game.level.monsters || []).find(mon => mon.data?.name === 'ghost');
    assert.ok(ghost, 'dead hero ghost is restored');
    assert.equal(ghost.givenName, 'Elara');
    assert.equal(ghost.msleeping, 1);
    assert.equal(ghost.mx, 5);
    assert.equal(ghost.my, 5);
    assert.equal(ghost.mpeaceful, 0); // ghosts are always_hostile in C

    const corpse = (game.level.objects || []).find(obj => obj.kind === 'corpse');
    assert.ok(corpse, 'dead hero corpse is restored');
    assert.equal(corpse.oname, 'Elara');
    assert.equal(corpse.ox, 5);
    assert.equal(corpse.oy, 5);

    const dagger = (game.level.objects || []).find(obj => obj.kind === 'dagger');
    assert.ok(dagger, 'dead hero inventory is dropped on the floor');
    assert.equal(dagger.ox, 5);
    assert.equal(dagger.oy, 5);
    assert.equal(dagger.cursed, true);

    assert.ok((game.level.monsters || []).some(mon => mon.data?.name === 'kobold'));

    // RNG parity: getbones roll, then one next_ident rnd(2) per restored
    // object and monster (2 objects + 2 monsters), nothing else
    const log = getRngLog();
    assert.equal(log[0], 'rn2(3)=0');
    assert.equal(log.length, 5);
    assert.ok(log.slice(1).every(entry => entry.startsWith('rnd(2)=')));
});

test('bones encoding strips tameness and peacefulness only from tame monsters', () => {
    resetGame();
    game.plname = 'Elara';
    game.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 } };
    game.inventory = [];
    game.stairs = null;
    game.level = new GameMap();
    game.level.objects = [];
    game.level.monsters = [
        { id: 1, mx: 3, my: 3, data: { name: 'kitten', glyph: 'f' }, mtame: 5, pet: true, mpeaceful: 1 },
        { id: 2, mx: 4, my: 4, data: { name: 'shopkeeper', glyph: '@' }, mtame: 0, pet: false, mpeaceful: 1, isshk: true },
    ];

    const bones = JSON.parse(encodeBonesLevel());
    const pet = bones.level.monsters.find(mon => mon.id === 1);
    const shk = bones.level.monsters.find(mon => mon.id === 2);

    // C ref: bones.c savebones() — if (mtmp->mtame) mtmp->mtame = mtmp->mpeaceful = 0
    assert.equal(pet.mtame, 0);
    assert.equal(pet.pet, false);
    assert.equal(pet.mpeaceful, 0);
    assert.equal(shk.mpeaceful, 1, 'non-tame monsters keep their saved peaceful state');
});

test('bones fixup resets non-shopkeeper peacefulness against the new hero', () => {
    resetGame();
    initRng(1);
    game.flags = {};
    game.u = { ux: 1, uy: 1, uz: { dnum: 0, dlevel: 1 }, ualign: { type: 0, record: 0 } };
    game.level = new GameMap();
    game.level.objects = [];
    game.level.monsters = [
        { id: 1, mx: 2, my: 2, data: { name: 'shopkeeper', glyph: '@', mlet: '@', maligntyp: 0 }, isshk: true, mpeaceful: 1 },
        { id: 2, mx: 3, my: 3, data: { name: 'guard', glyph: '@', mlet: '@', maligntyp: 0 }, mpeaceful: 0 },
        { id: 3, mx: 4, my: 4, data: { name: 'gray unicorn', glyph: 'u', mlet: 'u', maligntyp: 0 }, mpeaceful: 0 },
        { id: 4, mx: 5, my: 5, data: { name: 'white unicorn', glyph: 'u', mlet: 'u', maligntyp: 7 }, mpeaceful: 1 },
        ghostOf('Elara', 6, 6),
    ];

    enableRngLog();
    fixupRestoredBonesLevel();

    const byName = name => game.level.monsters.find(mon => mon.data?.name === name);
    assert.equal(byName('shopkeeper').mpeaceful, 1, 'shopkeepers keep their saved state');
    assert.equal(byName('guard').mpeaceful, 1, 'C M2_PEACEFUL monsters become peaceful');
    assert.equal(byName('gray unicorn').mpeaceful, 1, 'co-aligned unicorns are peaceful');
    assert.equal(byName('white unicorn').mpeaceful, 0, 'misaligned unicorns are not peaceful');
    assert.equal(byName('ghost').mpeaceful, 0, 'ghosts stay hostile');
    assert.deepEqual(getRngLog(), [], 'no monster here reaches peace_minded() RNG branches');
});

test('bones fixup removes genocided and extinct monsters', () => {
    resetGame();
    initRng(1);
    game.flags = {};
    game.u = { ux: 1, uy: 1, uz: { dnum: 0, dlevel: 1 }, ualign: { type: 0, record: 0 } };
    game._genocided_monsters = ['kobold'];
    game._extinct_monsters = ['Nazgul'];
    game.level = new GameMap();
    game.level.objects = [];
    game.level.monsters = [
        { id: 1, mx: 2, my: 2, data: { name: 'kobold', glyph: 'k', mlet: 'k', maligntyp: -3 }, mpeaceful: 0 },
        { id: 2, mx: 3, my: 3, data: { name: 'Nazgul', glyph: 'W', mlet: 'W', maligntyp: -17 }, mpeaceful: 0 },
        { id: 3, mx: 4, my: 4, data: { name: 'jackal', glyph: 'd', mlet: 'd', maligntyp: 0 }, mpeaceful: 0 },
        ghostOf('Elara', 5, 5),
    ];

    fixupRestoredBonesLevel();

    const names = game.level.monsters.map(mon => mon.data?.name);
    assert.deepEqual(names.sort(), ['ghost', 'jackal']);
});

test('bones fixup reverts duplicate and quest artifacts, records new ones', () => {
    resetGame();
    initRng(1);
    game.flags = {};
    game.u = { ux: 1, uy: 1, uz: { dnum: 0, dlevel: 1 }, ualign: { type: 0, record: 0 } };
    game._artifacts_exist = ['Excalibur'];
    game.level = new GameMap();
    game.level.monsters = [];
    game.level.objects = [
        { id: 1, kind: 'long sword', ox: 2, oy: 2, artifact: 'Excalibur', oname: 'Excalibur' },
        { id: 2, kind: 'crystal ball', ox: 3, oy: 3, artifact: 'The Orb of Fate', oname: 'The Orb of Fate' },
        { id: 3, kind: 'elven dagger', ox: 4, oy: 4, artifact: 'Sting', oname: 'Sting' },
        {
            id: 4,
            kind: 'bag of holding',
            ox: 5,
            oy: 5,
            contents: [{ id: 5, kind: 'runesword', artifact: 'Stormbringer', oname: 'Stormbringer' }],
        },
    ];

    fixupRestoredBonesLevel();

    const byId = id => {
        for (const obj of game.level.objects) {
            if (obj.id === id) return obj;
            const inner = (obj.contents || []).find(candidate => candidate.id === id);
            if (inner) return inner;
        }
        return null;
    };
    const excalibur = byId(1);
    assert.equal(excalibur.artifact, undefined, 'existing artifact reverts to ordinary');
    assert.equal(excalibur.oname, undefined);
    const orb = byId(2);
    assert.equal(orb.artifact, undefined, 'quest artifact reverts to ordinary');
    assert.equal(orb.oname, undefined);
    assert.equal(byId(3).artifact, 'Sting', 'new artifact survives');
    assert.equal(byId(5).artifact, 'Stormbringer', 'new artifact in a container survives');
    assert.ok(game._artifacts_exist.includes('Sting'));
    assert.ok(game._artifacts_exist.includes('Stormbringer'));
    assert.ok(game._artifacts_exist.includes('Excalibur'));
});

test('bones fixup sanitizes monster names, object names, and engravings', () => {
    resetGame();
    initRng(1);
    game.flags = {};
    game.u = { ux: 1, uy: 1, uz: { dnum: 0, dlevel: 1 }, ualign: { type: 0, record: 0 } };
    game.level = new GameMap();
    game.level.monsters = [
        { id: 1, mx: 2, my: 2, data: { name: 'jackal', glyph: 'd', mlet: 'd', maligntyp: 0 }, givenName: 'Evil\x07\x7fName', mpeaceful: 0 },
    ];
    game.level.objects = [
        { id: 1, kind: 'corpse', ox: 5, oy: 5, oname: 'Elar\x07a' },
        { id: 2, kind: 'dagger', ox: 6, oy: 6, oname: 'caf\u00e9' },
    ];
    game.level.engravings = [{ x: 5, y: 5, text: 'Rest\x07in\x7fpeace', type: 2 }];

    fixupRestoredBonesLevel();

    assert.equal(game.level.monsters[0].givenName, 'Evil..Name');
    assert.equal(game.level.objects[0].oname, 'Elar.a');
    assert.equal(game.level.objects[1].oname, 'caf_');
    assert.equal(game.level.engravings[0].text, 'Rest.in.peace');
});
