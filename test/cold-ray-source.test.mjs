import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, IN_SIGHT, COULD_SEE, W_ARM } from '../js/const.js';
import { MONS, MR_COLD, MR_FIRE } from '../js/permonst.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

function setup({ horn = false, raw = 19 } = {}) {
    resetGame(); initRng(17); game.flags = {}; game.context = {}; game.moves = 1;
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100,
        ulevel: 1, uhunger: 900, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.level = new GameMap(); game.level.monsters = []; game.level.objects = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(IN_SIGHT | COULD_SEE));
    const type = OBJECT_DATA.find(t => t.symbol === (horn ? 'FROST_HORN' : 'WAN_COLD'));
    const item = { _c_otyp: type.id, kind: horn ? 'frost horn' : 'cold', cls: horn ? 'tool' : 'wand',
        glyph: horn ? '(' : '/', letter: 'a', known: false, dknown: true, spe: 4 };
    game.inventory = [item]; game._zap_item = item; game._command_mode = 'zapDirection';
    const values = Array(4096).fill(BigInt(raw));
    game.coreCtx = { n: values.length, r: values, m: [], a: 0n, b: 0n, c: 0n };
    game.rng.core = game.coreCtx; enableRngLog({ reset: true });
    return item;
}

for (const horn of [false, true]) test(`C cold ${horn ? 'horn' : 'wand'} continues through a killed target`, async () => {
    setup({ horn });
    const data = MONS.find(m => m.name === 'newt');
    const first = { m_id: 1, data, mx: 11, my: 10, mhp: 1, mhpmax: 1, minvent: [] };
    const second = { m_id: 2, data, mx: 12, my: 10, mhp: 1, mhpmax: 1, minvent: [] };
    game.level.monsters = [first, second];
    await rhack('l');
    assert.equal(game.level.monsters.includes(first), false);
    assert.equal(game.level.monsters.includes(second), false, 'zap.c:dobuzz subtracts range after xkilled and keeps tracing');
    assert.equal(getRngLog().filter(line => line.startsWith('rn2(20)')).length, 2);
    assert.equal(getRngLog().some(line => line.startsWith('rn2(10)')), false);
});

for (const source of ['species', 'intrinsic', 'extrinsic']) test(`C cold ray respects ${source} resistance`, async () => {
    setup();
    const mon = { m_id: 1, data: MONS.find(m => m.name === (source === 'species' ? 'white dragon' : 'newt')),
        mx: 11, my: 10, mhp: 100, mhpmax: 100, minvent: [],
        mintrinsics: source === 'intrinsic' ? MR_COLD : 0, mextrinsics: source === 'extrinsic' ? MR_COLD : 0 };
    game.level.monsters = [mon];
    await rhack('l');
    assert.equal(mon.mhp, 100);
    assert.equal(getRngLog().some(line => line.startsWith('d(')), false, 'zhitm checks resistance before rolling damage or inventory loss');
});

test('C frost horn fire vulnerability uses the rolled number of damage dice', async () => {
    setup({ horn: true });
    const mon = { data: MONS.find(m => m.name === 'newt'), mx: 11, my: 10, mhp: 100, mhpmax: 100,
        minvent: [], mintrinsics: MR_FIRE };
    game.level.monsters = [mon];
    await rhack('l');
    assert.deepEqual(getRngLog().filter(line => line.startsWith('d(')), ['d(7,6)=14', 'd(7,3)=14']);
    assert.equal(mon.mhp, 72);
});

test('C cold ray uses worn armor when rolling to hit', async () => {
    setup({ raw: 5 });
    const mon = { data: MONS.find(m => m.name === 'newt'), mx: 11, my: 10, mhp: 100, mhpmax: 100,
        minvent: [{ kind: 'plate mail', cls: 'armor', owornmask: W_ARM, spe: 10 }] };
    game.level.monsters = [mon];
    await rhack('l');
    assert.equal(mon.mhp, 100);
    assert.ok(getRngLog().includes('rnd(9)=6'));
    assert.match(game._pending_message, /misses the newt/);
});

for (const visible of [false, true]) test(`C cold bounce announcement requires visible square: ${visible}`, async () => {
    setup();
    game.level.at(11, 9).typ = STONE;
    game.level.at(10, 9).typ = STONE;
    game.level.at(11, 10).typ = STONE;
    for (const row of game.viz_array) row.fill(COULD_SEE | (visible ? IN_SIGHT : 0));
    await rhack('u');
    assert.equal(/bounces/.test(game._pending_message || ''), visible);
    assert.ok(getRngLog().some(line => line.startsWith('rn2(10)')), 'the actual diagonal stone collision calls bounce_dir');
});
