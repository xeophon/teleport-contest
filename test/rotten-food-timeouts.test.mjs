import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM } from '../js/const.js';
import { initRng, rn2, rnd, d, enableRngLog, getRngLog } from '../js/rng.js';
import { rhack } from '../js/cmd.js';
import { processMonsterTurns } from '../js/allmain.js';
import { vision_reset } from '../js/vision.js';

function setup(seed, changes = {}) {
    resetGame(); initRng(seed);
    game.moves = 1; game.flags = {}; game.context = {};
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30, ulevel: 1,
        uhunger: 900, acurr: { a: [10, 10, 10, 10, 10, 10] }, ...changes };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.inventory = [{ id: 1, cls: 'food', glyph: '%', kind: 'food ration', actualKind: 'food ration',
        quan: 1, cursed: true, letter: 'a', line: 'a - a food ration' }];
    vision_reset(); enableRngLog({ reset: true });
}

function seedFor(condition) {
    for (let seed = 1; seed < 1000; seed++) {
        initRng(seed);
        if (condition()) return seed;
    }
    throw new Error('C branch seed not found');
}

for (const existing of [0, 20]) test(`rotten-food unconsciousness adds its full duration to existing deafness ${existing}`, async () => {
    const seed = seedFor(() => rn2(4) && rn2(4) && !rn2(3));
    initRng(seed); rn2(4); rn2(4); rn2(3); const duration = rnd(10);
    setup(seed, { _deafTimeout: existing });
    await rhack('e'); await rhack('a');
    assert.match(game._pending_message, /world spins and goes dark/);
    assert.equal(game._helpless_time, duration);
    assert.equal(game.u._deafTimeout, existing + duration);
});

test('rotten-food blindness installs the rolled timer and expires through nh_timeout', async () => {
    const seed = seedFor(() => rn2(4) && !rn2(4));
    initRng(seed); rn2(4); rn2(4); const duration = d(2, 10);
    setup(seed, { _blindTimeout: 2 });
    await rhack('e'); await rhack('a');
    assert.equal(game.u._blindTimeout, duration + 2);
    assert.equal(game.u.blind, true);
    game._message_more = 0; game._pending_message = ''; game._process_time_with_more = 0;
    game.u._blindTimeout = 1;
    await processMonsterTurns();
    assert.equal(game.u.blind, false);
});

test('Eyes of the Overworld preserve sight while rotten food increments the latent blindness timer', async () => {
    const seed = seedFor(() => rn2(4) && !rn2(4));
    initRng(seed); rn2(4); rn2(4); const duration = d(2, 10);
    setup(seed, { _blindTimeout: 3 });
    game.inventory.push({ letter: 'b', kind: 'lenses', artifact: 'The Eyes of the Overworld', worn: true });
    await rhack('e'); await rhack('a');
    assert.equal(game.u._blindTimeout, duration + 3);
    assert.equal(game.u.blind, false);
    assert.match(game._pending_message, /vision quickly clears/);
});

for (const [state, text] of [
    [{ blind: true }, 'you slap against the floor'],
    [{ blind: true, levitating: true }, 'you lose control of yourself'],
    [{ blind: true, usteed: { data: { name: 'pony' } } }, 'you slap against the saddle'],
]) test(`blind rotten-food fainting reports ${text} after all three branch draws`, async () => {
    const seed = seedFor(() => rn2(4) && !rn2(4) && !rn2(3));
    setup(seed, state);
    await rhack('e'); await rhack('a');
    assert.match(game._pending_message, new RegExp(text));
    assert.deepEqual(getRngLog().slice(0, 3).map(row => row.split('=')[0]), ['rn2(4)', 'rn2(4)', 'rn2(3)']);
});
