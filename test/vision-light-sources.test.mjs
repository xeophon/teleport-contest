import assert from 'node:assert/strict';
import test from 'node:test';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { init_vision_globals, vision_reset, vision_recalc, cansee, couldsee } from '../js/vision.js';
import { ROOM, STONE, TEMP_LIT, W_ARM } from '../js/const.js';
import { MONS, PM_GOLD_DRAGON, PM_YELLOW_LIGHT } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function darkLevel() {
    const g = resetGame();
    g.level = new GameMap();
    for (let x = 1; x < 80; x++)
        for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    g.u = { ux: 30, uy: 10, uz: { dnum: 0, dlevel: 1 } };
    g.inventory = [];
    g.flags = {};
    initRng(27);
    enableRngLog();
    init_vision_globals();
    return g;
}

function recalc(g, control = 0) {
    vision_reset();
    vision_recalc(control);
    return (x, y) => !!(g.viz_array[y]?.[x] & TEMP_LIT);
}

test('floor lamp uses the C circle table and leaves permanent room lighting unchanged', () => {
    const g = darkLevel();
    g.level.objects.push({ otyp: 227, lamplit: true, ox: 45, oy: 10 });
    const lit = recalc(g);
    // vision.c circle_data for radius 3: horizontal extents [3,3,2,1].
    for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
            const expected = Math.abs(dy) <= 3 && Math.abs(dx) <= [3, 3, 2, 1][Math.abs(dy)];
            assert.equal(lit(45 + dx, 10 + dy), expected, `${dx},${dy}`);
            assert.equal(g.level.at(45 + dx, 10 + dy).lit, false);
        }
    }
    assert.equal(cansee(48, 10), true);
    assert.equal(cansee(49, 10), false);
    assert.deepEqual(getRngLog(), []);
});

test('inventory lamps follow the hero and clear the old light on recalculation', () => {
    const g = darkLevel();
    g.inventory.push({ otyp: 228, lamplit: true, ox: 60, oy: 10 });
    let lit = recalc(g);
    assert.equal(lit(33, 10), true);
    assert.equal(lit(60, 10), false);
    g.u.ux = 40;
    lit = recalc(g);
    assert.equal(lit(30, 10), false);
    assert.equal(lit(43, 10), true);
});

test('monster-carried lamps follow their owner rather than stale object coordinates', () => {
    const g = darkLevel();
    const mon = { mx: 45, my: 10, minvent: [{ otyp: 226, lamplit: true, ox: 2, oy: 2 }] };
    g.level.monsters.push(mon);
    assert.equal(recalc(g)(48, 10), true);
    mon.mx = 55;
    const lit = recalc(g);
    assert.equal(lit(48, 10), false);
    assert.equal(lit(58, 10), true);
});

test('contained and buried lights do not illuminate the map', () => {
    const g = darkLevel();
    g.inventory.push({ contents: [{ otyp: 227, lamplit: true }] });
    g.level.objects.push({ ox: 45, oy: 10, cobj: [{ otyp: 227, lamplit: true }] });
    g.level.buriedobjlist.push({ otyp: 227, lamplit: true, ox: 55, oy: 10 });
    g.level.monsters.push({ mx: 60, my: 10, minvent: [{ contents: [{ otyp: 227, lamplit: true }] }] });
    recalc(g);
    assert.ok(g.viz_array.every(row => row.every(value => !(value & TEMP_LIT))));
});

test('extinguishing an object removes temporary light', () => {
    const g = darkLevel();
    const lamp = { kind: 'oil lamp', lamplit: true, burning: true, ox: 45, oy: 10 };
    g.level.objects.push(lamp);
    assert.equal(recalc(g)(48, 10), true);
    lamp.lamplit = lamp.burning = false;
    assert.equal(recalc(g)(48, 10), false);
});

for (const [quan, radius] of [[1, 2], [3, 2], [4, 3], [8, 3], [9, 4], [225, 15]]) {
    test(`candle stack ${quan} uses source radius ${radius}`, () => {
        const g = darkLevel();
        g.level.objects.push({ otyp: 370, lamplit: true, quan, ox: 45, oy: 10 });
        const lit = recalc(g);
        assert.equal(lit(45 + radius, 10), true);
        assert.equal(lit(46 + radius, 10), false);
    });
}

for (const [spe, radius] of [[1, 2], [3, 2], [4, 3], [6, 3], [7, 4]]) {
    test(`candelabrum with ${spe} candles uses source radius ${radius}`, () => {
        const g = darkLevel();
        g.level.objects.push({ otyp: 10076, lamplit: true, spe, ox: 45, oy: 10 });
        const lit = recalc(g);
        assert.equal(lit(45 + radius, 10), true);
        assert.equal(lit(46 + radius, 10), false);
    });
}

for (const [state, radius] of [[{ cursed: true }, 1], [{}, 2], [{ blessed: true }, 3]]) {
    test(`active Sunsword light uses blessing radius ${radius}`, () => {
        const g = darkLevel();
        g.level.objects.push({ artifact: 'Sunsword', lamplit: true, ...state, ox: 45, oy: 10 });
        const lit = recalc(g);
        assert.equal(lit(45 + radius, 10), true);
        assert.equal(lit(46 + radius, 10), false);
    });
}

test('active worn gold mail is brighter than scales; embedded scales have radius one', () => {
    const g = darkLevel();
    const armor = { otyp: 10140, lamplit: true, blessed: true, owornmask: W_ARM };
    g.inventory.push(armor);
    assert.equal(recalc(g)(34, 10), true);
    armor.otyp = 10149;
    assert.equal(recalc(g)(34, 10), false);
    assert.equal(recalc(g)(33, 10), true);
    g.u.uskin = armor;
    assert.equal(recalc(g)(32, 10), false);
});

test('lit oil potions retain the source radius one', () => {
    const g = darkLevel();
    g.level.objects.push({ otyp: 252, burning: true, litRadius: 1, ox: 45, oy: 10 });
    const lit = recalc(g);
    assert.equal(lit(46, 11), true);
    assert.equal(lit(47, 10), false);
});

test('nonhero source light uses clear_path in every quadrant and lights blocking endpoints', () => {
    const g = darkLevel();
    g.level.objects.push({ otyp: 227, lamplit: true, ox: 45, oy: 10 });
    for (const [dx, dy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) g.level.at(45 + dx, 10 + dy).typ = STONE;
    const lit = recalc(g);
    for (const [dx, dy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
        assert.equal(lit(45 + dx, 10 + dy), true);
        assert.equal(lit(45 + dx * 2, 10 + dy * 2), false);
    }
});

test('hero light uses the existing COULD_SEE bitmap', () => {
    const g = darkLevel();
    g.inventory.push({ otyp: 227, lamplit: true });
    for (let y = 0; y < 21; y++) g.level.at(31, y).typ = STONE;
    const lit = recalc(g);
    assert.equal(couldsee(32, 10), false);
    assert.equal(lit(32, 10), false);
    assert.equal(lit(27, 10), true);
});

test('hero polymorph form emits the source monster light', () => {
    const g = darkLevel();
    g.u._polyself_form = MONS[PM_GOLD_DRAGON];
    const lit = recalc(g);
    assert.equal(lit(31, 11), true);
    assert.equal(lit(32, 10), false);
});

test('a steed light source uses hero coordinates even outside the level monster list', () => {
    const g = darkLevel();
    g.u.usteed = { data: MONS[PM_GOLD_DRAGON], mx: 55, my: 10 };
    const lit = recalc(g);
    assert.equal(lit(31, 10), true);
    assert.equal(lit(55, 10), false);
});

test('gold scales require worn armor state and active light', () => {
    const g = darkLevel();
    const armor = { otyp: 10149, blessed: true, lamplit: true };
    g.inventory.push(armor);
    assert.equal(recalc(g)(33, 10), false);
    armor.owornmask = W_ARM;
    assert.equal(recalc(g)(33, 10), true);
    armor.lamplit = false;
    assert.equal(recalc(g)(33, 10), false);
});

test('buried, dead and migrating monsters do not keep a visible light source', () => {
    const g = darkLevel();
    g.level.monsters.push(
        { data: MONS[PM_YELLOW_LIGHT], mx: 45, my: 10, mburied: true },
        { data: MONS[PM_YELLOW_LIGHT], mx: 50, my: 10, dead: true },
        { data: MONS[PM_YELLOW_LIGHT], mx: 0, my: 10 },
    );
    const lit = recalc(g);
    assert.equal(lit(45, 10), false);
    assert.equal(lit(50, 10), false);
    assert.equal(lit(1, 10), false);
});

test('object light on a buried carrier follows get_obj_location rather than get_mon_location', () => {
    const g = darkLevel();
    // zap.c:OBJ_MINVENT checks only the carrier's mx; species light uses
    // get_mon_location, which separately rejects a buried monster.
    g.level.monsters.push({ data: MONS[PM_YELLOW_LIGHT], mx: 45, my: 10, mburied: true,
        minvent: [{ otyp: 227, lamplit: true }] });
    assert.equal(recalc(g)(48, 10), true);
});

for (const mode of ['blind', 'refresh', 'rogue']) {
    test(`${mode} vision follows the C light-source call ordering`, () => {
        const g = darkLevel();
        g.level.monsters.push({ data: MONS[PM_YELLOW_LIGHT], mx: 45, my: 10 });
        g.inventory.push({ otyp: 227, lamplit: true });
        if (mode === 'blind') g.u.blind = true;
        if (mode === 'rogue') g.level.flags.rogue_level = true;
        recalc(g, mode === 'refresh' ? 2 : 0);
        // Blind jumps past do_light_sources; refresh and Rogue still run it.
        assert.equal(!!(g.viz_array[10][45] & TEMP_LIT), mode !== 'blind');
        if (mode === 'refresh') {
            assert.equal(couldsee(45, 10), false);
            assert.equal(cansee(45, 10), false);
        }
    });
}
