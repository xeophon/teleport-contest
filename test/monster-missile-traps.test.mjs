import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, STONE, ARROW_TRAP, DART_TRAP, W_ARM, COULD_SEE, IN_SIGHT } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { monsterByRndName } from '../js/mklev.js';
import { processMonsterTurns, __allmainTestHooks as hooks } from '../js/allmain.js';
import { vision_reset } from '../js/vision.js';
import { pushKey, resetInputState } from '../js/input.js';

function setup({ pet = false, type = ARROW_TRAP, visible = true } = {}) {
    resetGame(); initRng(1); enableRngLog(); resetInputState(); pushKey('\x1b');
    game.moves = 100; game.context = {}; game.flags = {};
    game.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 100, uhpmax: 100, uhunger: 900, umovement: 12,
        acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.inventory = []; game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: y === 5 && x >= 5 && x <= 8 ? ROOM : STONE, lit: true });
    const trap = { ttyp: type, tx: 6, ty: 5, tseen: false, once: false };
    const mon = { m_id: 70, mx: 7, my: 5, mux: 5, muy: 5, mhp: 20, mhpmax: 20,
        m_lev: 1, movement: 12, mcanmove: true, mcansee: true, msleeping: 0,
        mpeaceful: pet, mtame: pet ? 10 : 0, pet, data: monsterByRndName('goblin'), minvent: [] };
    if (pet) mon.mextra = { edog: { apport: 3, hungrytime: 2000, whistletime: 0, ogoal: { x: 0, y: 0 } } };
    game.level.monsters = [mon]; game.level.traps = [trap];
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    if (visible) for (let x = 5; x <= 8; x++) game.viz_array[5][x] = COULD_SEE | IN_SIGHT;
    return { mon, trap };
}

for (const pet of [false, true]) {
    test(`${pet ? 'pet' : 'ordinary monster'} movement activates an arrow trap`, async () => {
        const { mon, trap } = setup({ pet });
        await processMonsterTurns();
        assert.deepEqual([mon.mx, mon.my], [6, 5]);
        assert.equal(trap.once, true);
        assert.equal(trap.tseen, true);
        assert.ok(mon.knownTraps.includes(ARROW_TRAP));
        assert.match(game._pending_message, /(?:hit|almost hit) by an arrow/);
        assert.ok(getRngLog().some(call => call.startsWith('rnd(20)')));
    });
}

test('an unseen arrow trap still generates its missile and changes trap state', async () => {
    const { trap } = setup({ visible: false });
    await processMonsterTurns();
    assert.equal(trap.once, true);
    assert.equal(trap.tseen, false);
    assert.ok(getRngLog().some(call => call.startsWith('rnd(20)')));
    assert.doesNotMatch(game._pending_message || '', /arrow/);
});

test('monster dart traps use worn armor and life saving before ordinary death cleanup', async () => {
    const { mon } = setup({ type: DART_TRAP }); mon.mhp = 1;
    mon.minvent = [
        { id: 81, kind: 'leather armor', cls: 'armor', spe: 15, owornmask: W_ARM, worn: true, quan: 1 },
        { id: 82, kind: 'amulet of life saving', cls: 'amulet', worn: true, amuletIndex: 1, quan: 1 },
    ];
    await processMonsterTurns();
    assert.equal(game.level.monsters.includes(mon), true);
    assert.ok(mon.mhp >= 10);
    assert.equal(mon.minvent.some(item => item.id === 82), false);
    assert.equal(game.level.objects.some(item => item.id === 81), false);
});

test('fresh C oracle: cursed-book paralysis includes the unseen jackal arrow trap', () => {
    const path = fileURLToPath(new URL('./fixtures/oracles/cursed-book-arrow-trap.session.json', import.meta.url));
    const child = spawnSync(process.execPath, ['frozen/ps_test_runner.mjs', `--worker-session=${path}`],
        { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    assert.equal(child.status, 0, child.stderr);
    const marker = '__RESULT_ONE__';
    const result = JSON.parse(child.stdout.slice(child.stdout.lastIndexOf(marker) + marker.length));
    assert.equal(result.metrics.screens.matched, result.metrics.screens.total);
    assert.equal(result.metrics.rngCalls.matched, result.metrics.rngCalls.total);
    assert.equal(result.passed, true);
});

function forceRng(values) {
    game.coreCtx.r = values.map(BigInt).reverse();
    game.coreCtx.n = values.length;
    enableRngLog({ reset: true });
}

for (const type of [ARROW_TRAP, DART_TRAP]) {
    test(`t_missile normalizes generated ${type === ARROW_TRAP ? 'arrow' : 'dart'} quantity, weight, and poison`, () => {
        const { mon, trap } = setup({ type }); mon.mx = 6;
        game.moves = 1;
        forceRng([0, 5, 1, 1, 1, 0, ...(type === DART_TRAP ? [1] : []), 0]);
        hooks.monsterMissileTrapEffectForTest(mon, trap);
        const obj = game.level.objects[0];
        assert.equal(obj.quan, 1); assert.equal(obj.owt, 1);
        assert.equal(obj.opoisoned, false); // mksobj's random poison is always cleared by t_missile.
        assert.deepEqual([obj.ox, obj.oy], [6, 5]);
        assert.equal(obj.otyp, type === ARROW_TRAP ? 349 : 353);
        assert.deepEqual(getRngLog(), ['rnd(2)=1', 'rn2(6)=5', 'rn2(11)=1', 'rn2(10)=1',
            'rn2(10)=1', 'rn2(100)=0', ...(type === DART_TRAP ? ['rn2(6)=1'] : []), 'rnd(20)=1']);
    });
}

test('missed trap arrows stack without shipping, floor effects, or a new object copy', () => {
    const { mon, trap } = setup(); mon.mx = 6; game.moves = 1;
    forceRng([0, 0, 1, 1, 1, 1, 0]);
    hooks.monsterMissileTrapEffectForTest(mon, trap);
    const first = game.level.objects[0];
    trap.tseen = false; mon.knownTraps = []; mon.mtrapseen = 0;
    forceRng([0, 0, 1, 1, 1, 1, 0]);
    hooks.monsterMissileTrapEffectForTest(mon, trap);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0], first);
    assert.equal(first.quan, 2); assert.equal(first.owt, 2);
});

test('a known projectile trap can be avoided before missile generation', () => {
    const { mon, trap } = setup(); mon.mx = 6; mon.knownTraps = [ARROW_TRAP];
    forceRng([1]);
    hooks.monsterMissileTrapEffectForTest(mon, trap);
    assert.equal(trap.once, false);
    assert.deepEqual(getRngLog(), ['rn2(4)=1']);
});

test('an exhausted known-visible projectile trap disappears before missile generation', () => {
    const { mon, trap } = setup(); mon.mx = 6; trap.once = trap.tseen = true;
    forceRng([0]);
    hooks.monsterMissileTrapEffectForTest(mon, trap);
    assert.equal(game.level.traps.includes(trap), false);
    assert.deepEqual(getRngLog(), ['rn2(15)=0']);
    assert.match(game._pending_message, /triggers a trap but nothing happens/);
});

test('a flying monster skips projectile traps before known-trap evasion', () => {
    const { mon, trap } = setup(); mon.mx = 6; mon.flyer = true; mon.knownTraps = [ARROW_TRAP];
    forceRng([]);
    hooks.monsterMissileTrapEffectForTest(mon, trap);
    assert.equal(trap.once, false); assert.deepEqual(getRngLog(), []);
});

for (const type of [ARROW_TRAP, DART_TRAP]) {
    test(`${type === ARROW_TRAP ? 'arrow' : 'dart'} fatal hit drops the real monster inventory without hero XP`, () => {
        const { mon, trap } = setup({ type }); mon.mx = 6; mon.mhp = 1; game.moves = 1;
        const carried = { id: 991, kind: 'emerald', cls: 'gem', quan: 1 };
        mon.minvent = [carried];
        forceRng([0, 0, 1, 1, 1, 1, ...(type === DART_TRAP ? [0] : []), 19, 0, 1]);
        hooks.monsterMissileTrapEffectForTest(mon, trap);
        assert.equal(game.level.monsters.includes(mon), false);
        assert.equal(mon.mhp, 0); assert.equal(mon.dead, true);
        assert.equal(game.level.objects.includes(carried), true);
        assert.deepEqual([carried.ox, carried.oy], [6, 5]);
        assert.equal(game.u.uexp || 0, 0);
        assert.equal(game.level.objects.some(obj => obj.otyp === (type === ARROW_TRAP ? 349 : 353)), false);
    });
}
