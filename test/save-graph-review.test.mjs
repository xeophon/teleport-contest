import assert from 'node:assert/strict';
import test from 'node:test';

import { GameMap } from '../js/game.js';
import { game, resetGame } from '../js/gstate.js';
import { encodeBonesLevel, encodeSaveState, restoreBonesLevel, restoreSaveState } from '../js/save.js';
import { HOLE, MAGIC_PORTAL, PIT } from '../js/const.js';
import { PM_ARCHEOLOGIST, PM_ORACLE, SPECIAL_PM } from '../js/permonst.js';

test('save round trips Maps with object keys and cycles through their values', () => {
    resetGame();
    const item = { id: 31, kind: 'dagger' };
    const owner = { m_id: 12, minvent: [item], mw: item };
    const owners = new Map([[item, owner]]);
    item.ocarry = owner;
    owner.index = owners;
    owners.set(owners, owners);
    game.owners = owners;
    game.owner = owner;
    game.item = item;

    restoreSaveState(encodeSaveState());

    assert.ok(game.owners instanceof Map);
    assert.equal(game.owners.get(game.item), game.owner);
    assert.equal(game.owners.get(game.owners), game.owners);
    assert.equal(game.owner.index, game.owners);
    assert.equal(game.owner.mw, game.owner.minvent[0]);
    assert.equal(game.owner.mw.ocarry, game.owner);
});

test('save root backreferences retain the stable exported game object', () => {
    resetGame();
    const originalGame = game;
    game.moves = 12;
    game.self = game;
    game.context = { owner: game };
    game.index = new Map([[game, game]]);

    restoreSaveState(encodeSaveState());

    assert.equal(game, originalGame);
    assert.equal(game.self, game);
    assert.equal(game.context.owner, game);
    assert.equal(game.index.get(game), game);
    game.moves = 13;
    assert.equal(game.context.owner.moves, 13);
});

test('save keeps equal objects distinct while retaining real aliases', () => {
    resetGame();
    const first = { kind: 'dagger', quan: 1, spe: 0 };
    const second = { ...first };
    game.inventory = [first, second];
    game.u = { uwep: first, uswapwep: second };

    restoreSaveState(encodeSaveState());

    assert.notEqual(game.inventory[0], game.inventory[1]);
    assert.equal(game.u.uwep, game.inventory[0]);
    assert.equal(game.u.uswapwep, game.inventory[1]);
    game.u.uwep.spe = 1;
    assert.equal(game.u.uswapwep.spe, 0);
});

test('save retains aliases through numeric and escaped property names', () => {
    resetGame();
    const item = { id: 52 };
    game.context = { 'a/b~c': { '': [item] } };
    game.inventory = [item];
    game._saved_levels = new Map([['0:2', { objects: game.inventory }]]);

    restoreSaveState(encodeSaveState());

    assert.equal(game.context['a/b~c'][''][0], game.inventory[0]);
    assert.equal(game._saved_levels.get('0:2').objects, game.inventory);
});

// C: bones.c savebones() strips pet status; restore.c getlev() restores
// wielded-object and inventory-owner pointers to the objects it loaded.
test('bones keeps monster equipment linked while sanitizing an isolated clone', () => {
    resetGame();
    const weapon = { id: 71, kind: 'dagger' };
    const pet = { m_id: 72, mtame: 10, pet: true, mpeaceful: 1, mlstmv: 24, minvent: [weapon], mw: weapon };
    weapon.ocarry = pet;
    game.level = new GameMap();
    game.level.monsters = [pet];
    game.inventory = [];
    game.stairs = null;
    game.plname = 'Alice';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 } };

    const bones = encodeBonesLevel();

    assert.equal(pet.mtame, 10);
    assert.equal(pet.mpeaceful, 1);
    assert.equal(pet.mlstmv, 24);
    assert.equal(pet.mw.ocarry, pet);
    resetGame();
    game.plname = 'Bob';
    assert.equal(restoreBonesLevel(bones), true);
    const restored = game.level.monsters[0];
    assert.equal(restored.mtame, 0);
    assert.equal(restored.mpeaceful, 0);
    assert.equal(restored.mlstmv, 0);
    assert.equal(restored.mw, restored.minvent[0]);
    assert.equal(restored.mw.ocarry, restored);
    assert.equal(game._bones_restore_identity_count, 2);
    assert.equal(game._bones_familiar, false);
});

test('bones retains container parent links when dropping inventory', () => {
    resetGame();
    const chest = { id: 81, kind: 'chest', contents: [] };
    const food = { id: 82, kind: 'food ration', ocontainer: chest };
    chest.contents.push(food);
    game.level = new GameMap();
    game.inventory = [chest];
    game.stairs = null;
    game.plname = 'Alice';
    game.u = { ux: 10, uy: 11, uz: { dnum: 0, dlevel: 1 } };

    const bones = encodeBonesLevel();
    assert.equal(chest.ox, undefined);
    resetGame();
    restoreBonesLevel(bones);

    const restored = game.level.objects[0];
    assert.deepEqual([restored.ox, restored.oy], [10, 11]);
    assert.equal(restored.contents[0].ocontainer, restored);
    assert.equal(game._bones_restore_identity_count, 2);
});

// C: bones.c resetobjs() recurses into containers and strips the old hero's
// observations from floor, buried, monster-carried, and dropped inventory.
test('bones removes the previous hero\'s object knowledge and ordinary names', () => {
    resetGame();
    const knowledge = {
        cls: 'weapon', kind: 'dagger named my remembered dagger', known: true, dknown: true, bknown: true, rknown: true,
        lknown: true, cknown: true, tknown: true, invlet: 'a',
        oname: 'my remembered dagger', no_charge: true, how_lost: 4,
        letter: 'a', line: 'a - a blessed +3 dagger named my remembered dagger',
        _wish_object_name: 'my remembered dagger', oextra: { oname: 'my remembered dagger' },
    };
    game.level = new GameMap();
    game.level.objects = [{ ...knowledge, id: 91 }];
    game.level.buriedobjlist = [{ ...knowledge, id: 92 }];
    game.level.monsters = [{ m_id: 93, minvent: [{ ...knowledge, id: 94 }] }];
    game.inventory = [{ id: 95, kind: 'chest', contents: [{ ...knowledge, id: 96 }] }];
    game.stairs = null;
    game.plname = 'Alice';
    game.u = { ux: 10, uy: 11, uz: { dnum: 0, dlevel: 1 } };

    const bones = encodeBonesLevel();
    assert.equal(game.level.objects[0].dknown, true);
    resetGame();
    restoreBonesLevel(bones);

    for (const item of [
        game.level.objects[0], game.level.buriedobjlist[0],
        game.level.monsters[0].minvent[0], game.level.objects[1].contents[0],
    ]) {
        for (const field of ['known', 'dknown', 'bknown', 'rknown', 'lknown', 'cknown', 'tknown', 'invlet', 'oname', 'no_charge', 'how_lost', 'letter', 'line', '_wish_object_name'])
            assert.equal(Boolean(item[field]), false, `object ${item.id}: ${field}`);
        assert.equal(item.oextra.oname, undefined);
        assert.equal(item.kind, 'dagger');
    }
});

test('bones preserves C name exceptions without treating every unique corpse as special', () => {
    resetGame();
    const objects = [
        { kind: 'long sword', artifact: 'Excalibur', oname: 'Excalibur' },
        { kind: 'long sword', oartifact: 1, oname: 'Excalibur' },
        { otyp: 472, kind: 'statue', oname: 'Alice' },
        { kind: 'novel', oname: 'The Colour of Magic' },
        { otyp: 471, corpsenm: PM_ARCHEOLOGIST, oname: 'Alice' },
        { otyp: 471, corpsenm: { name: 'archeologist' }, oname: 'Alice' },
        { otyp: 471, corpsenm: SPECIAL_PM, oname: 'Tail' },
        { otyp: 471, corpsenm: PM_ORACLE, oname: 'Oracle' },
        { otyp: 471, corpsenm: { name: 'Oracle', unique: true }, oname: 'Oracle' },
    ];
    game.level = new GameMap();
    game.level.objects = objects;
    game.stairs = null;

    restoreBonesLevel(encodeBonesLevel());

    assert.deepEqual(game.level.objects.slice(0, 7).map(obj => obj.oname),
        objects.slice(0, 7).map(obj => obj.oname));
    assert.equal(game.level.objects[7].oname, undefined);
    assert.equal(game.level.objects[8].oname, undefined);
});

test('bones clears known only for object types that use the C per-object knowledge bit', () => {
    resetGame();
    const usesKnown = [
        { cls: 'weapon' }, { cls: 'armor' }, { cls: 'wand' }, { otyp: 10 },
        { cls: 'ring', kind: 'ring of protection' }, { otyp: 3, ringRoll: 1 },
        { kind: 'magic marker' }, { kind: 'pick-axe' }, { kind: 'tin' },
        { otyp: 10004, kind: 'tin of newt meat' }, { otyp: 10001 },
        { kind: 'novel' }, { kind: 'Amulet of Yendor' },
    ];
    const doesNotUseKnown = [
        { cls: 'potion', kind: 'potion of healing' },
        { cls: 'scroll', kind: 'scroll of teleportation' },
        { cls: 'spellbook', kind: 'spellbook of force bolt' },
        { cls: 'amulet', kind: 'amulet of life saving' },
        { cls: 'ring', kind: 'ring of levitation', ringRoll: 11 },
        { cls: 'tool', kind: 'magic lamp' }, { cls: 'food', kind: 'food ration' },
    ];
    game.level = new GameMap();
    game.level.objects = [...usesKnown, ...doesNotUseKnown].map(obj => ({ ...obj, known: true }));
    game.stairs = null;

    restoreBonesLevel(encodeBonesLevel());

    assert.deepEqual(game.level.objects.map(obj => obj.known),
        [...usesKnown.map(() => false), ...doesNotUseKnown.map(() => true)]);
});

test('bones removes objects consumed during death and counts surviving nested contents', () => {
    resetGame();
    game.level = new GameMap();
    game.level.objects = [
        { id: 101, kind: 'potion', in_use: true },
        { id: 102, kind: 'chest', cobj: [{ id: 103, in_use: true }, { id: 104, kind: 'rock' }] },
    ];
    game.inventory = [{ id: 105, kind: 'scroll', in_use: true }];
    game.stairs = null;

    restoreBonesLevel(encodeBonesLevel());

    assert.deepEqual(game.level.objects.map(obj => obj.id), [102]);
    assert.deepEqual(game.level.objects[0].cobj.map(obj => obj.id), [104]);
    assert.equal(game._bones_restore_identity_count, 2);
});

test('bones resets trap ownership and hero observations while preserving monster trap knowledge', () => {
    resetGame();
    game.level = new GameMap();
    const traps = [PIT, HOLE, MAGIC_PORTAL].map(ttyp => ({ ttyp, tseen: true, madeby_u: true }));
    const monster = { m_id: 111, seen_resistance: 255, mtrapseen: 7, mpeaceful: 1 };
    game.level.traps = traps;
    game.level.monsters = [monster];
    game._bones_ghost = { m_id: 112, seen_resistance: 255, mtrapseen: 3, mpeaceful: 0 };
    game.stairs = null;

    const bones = encodeBonesLevel();
    assert.equal(monster.seen_resistance, 255);
    assert.ok(traps.every(trap => trap.madeby_u));
    restoreBonesLevel(bones);

    assert.deepEqual(game.level.traps.map(trap => trap.tseen), [false, true, false]);
    assert.ok(game.level.traps.every(trap => trap.madeby_u === false));
    assert.deepEqual(game.level.monsters.map(mon => mon.seen_resistance), [0, 0]);
    assert.deepEqual(game.level.monsters.map(mon => mon.mtrapseen), [7, 3]);
    assert.deepEqual(game.level.monsters.map(mon => mon.mpeaceful), [1, 0]);
});
