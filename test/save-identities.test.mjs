import assert from 'node:assert/strict';
import test from 'node:test';

import { GameMap } from '../js/game.js';
import { game, resetGame } from '../js/gstate.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

// C ref: restore.c restgamestate()/getlev() restore worn objects, punishment,
// occupation objects, the steed, and the monster holding the hero by identity.
test('saving punishment preserves the floor ball and chain in either field order', () => {
    for (const heroFirst of [true, false]) {
        resetGame();
        const ball = { id: 11, kind: 'heavy iron ball', ox: 10, oy: 10 };
        const chain = { id: 12, kind: 'iron chain', ox: 11, oy: 10 };
        const level = new GameMap();
        level.objects.push(ball, chain);
        const hero = { uball: ball, uchain: chain };
        Object.assign(game, heroFirst ? { u: hero, level } : { level, u: hero });

        restoreSaveState(encodeSaveState());

        assert.deepEqual(game.level.objects.map(obj => obj?.id), [11, 12]);
        assert.equal(game.u.uball, game.level.objects[0]);
        assert.equal(game.u.uchain, game.level.objects[1]);
        game.u.uball.ox = 15;
        assert.equal(game.level.objects[0].ox, 15);
        assert.ok(game.level instanceof GameMap);
    }
});

test('saving a meal and container preserves occupation and container object links', () => {
    resetGame();
    const food = { id: 20, kind: 'food ration', oeaten: 100 };
    const chest = { id: 21, kind: 'chest', contents: [food] };
    food.ocontainer = chest;
    game.inventory = [chest];
    game.context = { victual: { piece: food } };
    game._open_container = chest;

    restoreSaveState(encodeSaveState());

    const restoredChest = game.inventory[0];
    const restoredFood = restoredChest.contents[0];
    assert.equal(game._open_container, restoredChest);
    assert.equal(game.context.victual.piece, restoredFood);
    assert.equal(restoredFood.ocontainer, restoredChest);
    game.context.victual.piece.oeaten -= 10;
    assert.equal(restoredChest.contents[0].oeaten, 90);
});

test('saving a mounted or held hero retains the exact monster despite identical coordinates', () => {
    resetGame();
    const species = { name: 'pony' };
    const other = { m_id: 30, mx: 10, my: 10, data: species };
    const steed = { m_id: 31, mx: 10, my: 10, data: species };
    const holder = { m_id: 32, mx: 11, my: 10, data: { name: 'owlbear' } };
    game.u = { usteed: steed, ustuck: holder };
    game.level = new GameMap();
    game.level.monsters.push(other, steed, holder);

    restoreSaveState(encodeSaveState());

    assert.deepEqual(game.level.monsters.map(mon => mon?.m_id), [30, 31, 32]);
    assert.equal(game.u.usteed, game.level.monsters[1]);
    assert.equal(game.u.ustuck, game.level.monsters[2]);
    assert.equal(game.level.monsters[0].data, game.u.usteed.data);
});

test('saving visited levels preserves map values and migrating object references', () => {
    resetGame();
    game.level = new GameMap();
    const otherLevel = new GameMap();
    const rock = { id: 40, kind: 'rock' };
    const migration = [rock];
    game._impact_drop_migrations = new Map([['0:2', migration]]);
    game._saved_levels = new Map([['0:2', { level: otherLevel, moves: 123 }]]);
    game.context = { migratingObject: rock, rememberedLevel: otherLevel };

    restoreSaveState(encodeSaveState());

    assert.ok(game._saved_levels instanceof Map);
    assert.ok(game._saved_levels.get('0:2').level instanceof GameMap);
    assert.equal(game.context.rememberedLevel, game._saved_levels.get('0:2').level);
    assert.equal(game.context.migratingObject, game._impact_drop_migrations.get('0:2')[0]);
    assert.equal(game._saved_levels.get('0:2').moves, 123);
});
