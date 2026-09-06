import assert from 'node:assert/strict';
import test from 'node:test';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { __mklevTestHooks } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, LAVAPOOL } from '../js/const.js';
import { parseQuestLua } from '../tools/quest-lua-parser.mjs';

async function execute(source) {
    const g = resetGame();
    g.level = new GameMap();
    initRng(19); enableRngLog();
    const state = { area: { lx: 11, ly: 3, hx: 25, hy: 15 }, variables: new Map(), levregions: [], map: new Set() };
    await __mklevTestHooks.questFillerOperations(parseQuestLua(source), state);
    return { g, state, calls: getRngLog().map(entry => entry.split('=')[0]) };
}

test('nhlib random choice is evaluated once and an untaken conditional consumes no RNG', async () => {
    const { g, state, calls } = await execute(`
        local places = {{1,1},{2,2}}
        local index = math.random(1, #places)
        if percent(0) then local unused = math.random(1, 33)
        else des.terrain(places[index], ".") end
    `);
    assert.deepEqual(calls, ['rn2(2)', 'rn2(100)']);
    const [x, y] = state.variables.get('places')[state.variables.get('index') - 1];
    assert.equal(g.level.at(11 + x, 3 + y).typ, ROOM);
});

test('Lua numeric for bounds consume nh.rn2 once before the body', async () => {
    const { g, calls } = await execute(`
        for i = 1, 2 + nh.rn2(3) do des.terrain({i, 1}, ".") end
    `);
    assert.deepEqual(calls, ['rn2(3)']);
    const count = 2 + Number(getRngLog()[0].split('=')[1]);
    for (let i = 1; i <= count; i++) assert.equal(g.level.at(11 + i, 4).typ, ROOM);
    assert.notEqual(g.level.at(12 + count, 4).typ, ROOM);
});

test('selection random coordinates are removed and translated back into the current map coordinates', async () => {
    const { g, state, calls } = await execute(`
        local points = selection.area(1,1,2,2)
        local first = points:rndcoord(1)
        des.terrain(first, ".")
        local second = points:rndcoord(1)
        des.terrain(second, "L")
    `);
    assert.deepEqual(calls, ['rn2(4)', 'rn2(3)']);
    const first = state.variables.get('first'), second = state.variables.get('second');
    assert.notDeepEqual(first, second);
    assert.ok([1, 2].includes(first.x) && [1, 2].includes(first.y));
    assert.equal(g.level.at(first.x + 11, first.y + 3).typ, ROOM);
    assert.equal(g.level.at(second.x + 11, second.y + 3).typ, LAVAPOOL);
    assert.equal(state.variables.get('points').numpoints(), 2);
});
