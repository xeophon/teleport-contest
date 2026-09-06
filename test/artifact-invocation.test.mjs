import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog, rnz, d } from '../js/rng.js';
import { ROOM, STONE, COULD_SEE, IN_SIGHT, CONFLICT, LEVITATION, INVIS, W_ARTI, DOOR, D_CLOSED, D_TRAPPED } from '../js/const.js';
import { mksobj, ARTIFACT_DEFS } from '../js/mklev.js';
import { MONS } from '../js/permonst.js';
import { rnd } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

const ARROW = 349; // Existing mklev.js object type used by mksobj.

function setup(artifact, role = 'Healer', alignment = 0) {
    resetGame();
    initRng(71);
    game.moves = 100;
    game.flags = {};
    game.context = {};
    game._startup_role = role;
    game.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 10, uhpmax: 31, uen: 10, uenmax: 50, uhunger: 900,
        acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: alignment, record: 10 } };
    const cells = Array.from({ length: 80 }, (_, x) => Array.from({ length: 21 }, (_, y) => ({
        typ: x > 0 && x < 75 && y > 0 && y < 20 ? ROOM : STONE, lit: true, roomno: 0,
    })));
    game.level = { flags: {}, monsters: [], objects: [], traps: [], rooms: [], engravings: [],
        at: (x, y) => cells[x]?.[y] };
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const item = { artifact, kind: 'quarterstaff', cls: 'weapon', letter: 'a', quan: 1, age: 0 };
    game.inventory = [item];
    return item;
}

async function invoke(letter = 'a') {
    game.context.move = 0;
    game._command_mode = 'invokeObject';
    await rhack(letter);
}

test('extended invoke command suggests actual artifact inventory letters', async () => {
    setup('The Staff of Aesculapius');
    await rhack('#');
    for (const key of 'invoke\n') await rhack(key);
    assert.equal(game._command_mode, 'invokeObject');
    assert.match(game._pending_message, /\[a or \?\*\]/);
});

for (const [hp, maximum, expected] of [[10, 31, 21], [10, 30, 20], [30, 31, 31]]) {
    test(`healing restores ceil half of ${maximum - hp} missing HP`, async () => {
        const item = setup('The Staff of Aesculapius');
        game.u.uhp = hp;
        game.u.uhpmax = maximum;
        const cooldown = rnz(100);
        initRng(71);
        await invoke();
        assert.equal(game.u.uhp, expected);
        assert.equal(game.u.uhpmax, maximum);
        assert.equal(item.age, 100 + cooldown);
        assert.equal(game.context.move, 1);
    });
}

test('healing restores monster-form HP without changing underlying HP', async () => {
    setup('The Staff of Aesculapius');
    game.u._polyself_base = { uhp: 10, uhpmax: 31 };
    game.u.mh = 5;
    game.u.mhmax = 20;
    await invoke();
    assert.equal(game.u.mh, 13);
    assert.equal(game.u.uhp, 10);
});

test('healing cures sickness and slime and reduces blindness to remaining cream', async () => {
    setup('The Staff of Aesculapius');
    Object.assign(game.u, { sick: true, _sickTimeout: 20, usick_type: 3, _sicknessCause: 'poison',
        slimed: true, _slimingTimeout: 9, blind: true, _blindTimeout: 30, ucreamed: 4,
        _statusSuffix: 'Ill Slime Blind' });
    await invoke();
    assert.equal(game.u._sickTimeout, 0);
    assert.equal(game.u.usick_type, 0);
    assert.equal(game.u.slimed, false);
    assert.equal(game.u._slimingTimeout, 0);
    assert.equal(game.u._blindTimeout, 4);
    assert.equal(game.u.ucreamed, 4);
    assert.equal(game.u.blind, true);
});

test('healing at full health still spends cooldown and reports nothing special', async () => {
    const item = setup('The Staff of Aesculapius');
    game.u.uhp = game.u.uhpmax;
    await invoke();
    assert.ok(item.age > game.moves);
    assert.equal(game._pending_message, 'You feel a surge of power, but nothing seems to happen.');
});

for (const [energy, maximum, expected] of [[0, 21, 21], [0, 23, 12], [0, 239, 120], [0, 241, 120], [9, 9, 9]]) {
    test(`energy boost follows C half/full/cap boundary ${energy}/${maximum}`, async () => {
        setup('The Mitre of Holiness', 'Priest', 1);
        game.u.uen = energy;
        game.u.uenmax = maximum;
        await invoke();
        assert.equal(game.u.uen, expected);
        assert.equal(game.u.uenmax, maximum);
    });
}

test('a tired ordinary invoke power extends cooldown without producing its effect', async () => {
    const item = setup('The Staff of Aesculapius');
    item.age = 150;
    const delay = d(3, 10);
    initRng(71);
    enableRngLog();
    await invoke();
    assert.equal(item.age, 150 + delay);
    assert.equal(game.u.uhp, 10);
    assert.match(game._pending_message, /ignoring you/);
    assert.deepEqual(getRngLog(), [`d(3,10)=${delay}`]);
});

test('invoke accepts an artifact at the exact cooldown deadline', async () => {
    const item = setup('The Staff of Aesculapius');
    item.age = game.moves;
    await invoke();
    assert.equal(game.u.uhp, 21);
    assert.ok(item.age > game.moves);
});

test('canceling artifact selection consumes neither time nor randomness', async () => {
    const item = setup('The Staff of Aesculapius');
    enableRngLog();
    await invoke('\x1b');
    assert.equal(game.context.move, 0);
    assert.equal(item.age, 0);
    assert.deepEqual(getRngLog(), []);
});

test('artifact without invocation power consumes time without cooldown', async () => {
    const item = setup('Magicbane', 'Wizard', 0);
    await invoke();
    assert.equal(game.context.move, 1);
    assert.equal(item.age, 0);
    assert.equal(game._pending_message, 'Nothing happens.');
});

test('invoke suggestion filter excludes ordinary inventory while allowing manual selection', async () => {
    setup('The Staff of Aesculapius');
    game.inventory.push({ kind: 'dagger', letter: 'b', cls: 'weapon' });
    await rhack('#');
    for (const key of 'invoke\n') await rhack(key);
    assert.match(game._pending_message, /\[a or \?\*\]/);
    await rhack('b');
    assert.equal(game._pending_message, 'Nothing happens.');
    assert.equal(game.context.move, 1);
});

for (const [name, role, align, property, flag] of [
    ['The Sceptre of Might', 'Caveman', 1, CONFLICT, 'conflict'],
    ['The Orb of Detection', 'Archeologist', 1, INVIS, 'invisible'],
    ['The Heart of Ahriman', 'Barbarian', 0, LEVITATION, 'levitating'],
]) {
    test(`${name} toggles its property and starts cooldown only on deactivation`, async () => {
        const item = setup(name, role, align);
        enableRngLog();
        await invoke();
        assert.equal(game.u[flag], true);
        assert.ok(game.u.uprops[property].extrinsic & W_ARTI);
        assert.equal(item.age, 0);
        assert.deepEqual(getRngLog(), []);
        await invoke();
        assert.equal(game.u[flag], false);
        assert.equal(game.u.uprops[property].extrinsic & W_ARTI, 0);
        assert.ok(item.age > game.moves);
        const age = item.age;
        await invoke();
        assert.equal(game.u[flag], false);
        assert.ok(item.age > age);
        assert.match(game._pending_message, /ignoring you/);
    });
    test(`${name} preserves an independent intrinsic when toggled off`, async () => {
        setup(name, role, align);
        game.u[flag] = true;
        game.u.uprops = { [property]: { intrinsic: 1, extrinsic: 0 } };
        await invoke();
        await invoke();
        assert.equal(game.u[flag], true);
        assert.equal(game.u.uprops[property].intrinsic, 1);
        assert.equal(game._pending_message, 'You feel a surge of power, but nothing seems to happen.');
    });
}

for (const blessing of ['blessed', 'uncursed', 'cursed']) {
    test(`Diana creates source-initialized ${blessing} arrows with matching blessing and knowledge`, async () => {
        const item = setup('The Longbow of Diana', 'Ranger', -1);
        item.blessed = blessing === 'blessed';
        item.cursed = blessing === 'cursed';
        item.bknown = true;
        rnz(100);
        const expected = mksobj(ARROW, true, false);
        if (item.blessed) { expected.spe = Math.max(0, expected.spe || 0); expected.quan += rnd(10); }
        else if (item.cursed) expected.spe = Math.min(0, expected.spe || 0);
        else expected.quan += rnd(5);
        initRng(71);
        await invoke();
        const arrows = game.inventory.find(obj => obj.otyp === ARROW);
        assert.ok(arrows);
        assert.equal(arrows.quan, expected.quan);
        assert.equal(arrows.spe, expected.spe);
        assert.equal(arrows.blessed, item.blessed);
        assert.equal(arrows.cursed, item.cursed);
        assert.equal(arrows.bknown, true);
        assert.equal(arrows.oeroded, 0);
        assert.equal(arrows.oeroded2, 0);
    });
}

test('card charging cancellation refunds cooldown and action', async () => {
    const card = setup('The Platinum Yendorian Express Card', 'Tourist');
    await invoke();
    assert.equal(game._command_mode, 'invokeCharge');
    assert.ok(card.age > game.moves);
    await rhack('\x1b');
    assert.equal(card.age, 0);
    assert.equal(game.context.move, 0);
});

test('blessed tourist card uses the real wand charging path', async () => {
    setup('The Platinum Yendorian Express Card', 'Tourist').blessed = true;
    const wand = { kind: 'wand of wishing', actualKind: 'wand of wishing', cls: 'wand', letter: 'b', spe: 0, recharged: 0 };
    game.inventory.push(wand);
    await invoke();
    await rhack('b');
    assert.equal(wand.spe, 1); // NetHack 5.0 lowered the wishing recharge limit to one.
    assert.equal(wand.recharged, 1);
    assert.equal(game.context.move, 1);
});

test('key cancellation refunds cooldown, but declining a discovered door trap costs a turn', async () => {
    const key = setup('The Master Key of Thievery', 'Rogue', -1);
    await invoke();
    await rhack('\x1b');
    assert.equal(key.age, 0);
    assert.equal(game.context.move, 0);
    const door = game.level.at(6, 5);
    Object.assign(door, { typ: DOOR, doormask: D_CLOSED | D_TRAPPED });
    await invoke();
    await rhack('l');
    assert.equal(game._command_mode, 'untrapDoorDisarmConfirm');
    await rhack('n');
    assert.ok(key.age > game.moves); // C trap.c:6068 returns 1 after discovering the trap.
    assert.ok(door.doormask & D_TRAPPED);
    assert.equal(game._artifact_untrap, null);
});

test('quitting the initial nested box check refunds key cooldown', async () => {
    const key = setup('The Master Key of Thievery', 'Rogue', -1);
    game.level.objects.push({ kind: 'chest', cls: 'tool', ox: 5, oy: 5, otrapped: true });
    await invoke();
    await rhack('.');
    assert.equal(game._command_mode, 'untrapBoxConfirm');
    await rhack('q');
    assert.equal(key.age, 0);
    assert.equal(game.context.move, 0);
    assert.equal(game._artifact_untrap, null);
});

test('invoked cursed key forces successful untrap and keeps cooldown', async () => {
    const key = setup('The Master Key of Thievery', 'Rogue', -1);
    key.cursed = true;
    const door = game.level.at(6, 5);
    Object.assign(door, { typ: DOOR, doormask: D_CLOSED | D_TRAPPED });
    await invoke();
    await rhack('l');
    assert.equal(game._command_mode, 'untrapDoorDisarmConfirm');
    await rhack('y');
    assert.equal(door.doormask & D_TRAPPED, 0);
    assert.ok(key.age > game.moves);
    assert.equal(game.context.move, 1);
    assert.equal(game._artifact_untrap, null);
});

test('canonical numeric artifact identity reaches the same healing power', async () => {
    const item = setup('The Staff of Aesculapius');
    item.oartifact = ARTIFACT_DEFS.findIndex(row => row.name === item.artifact) + 1;
    delete item.artifact;
    await invoke();
    assert.equal(game.u.uhp, 21);
    assert.ok(item.age > game.moves);
});

test('Demonbane banishes visible demons and imps with their complete inventory', async () => {
    setup('Demonbane', 'Priest', 1);
    game.dungeons = [{ dname: 'The Dungeons of Doom', num_dunlevs: 25 },
        { dname: 'Gehennom', num_dunlevs: 20, depth_start: 26 }];
    const monsters = ['vrock', 'imp', 'goblin', 'Nalzok'].map((name, index) => ({
        data: MONS.find(row => row.name === name), mx: 6 + index, my: 5, mhp: 30,
        minvent: [{ kind: 'dagger' }], mtame: 5, mpeaceful: 1, msleeping: 1,
    }));
    game.level.monsters = monsters;
    await invoke();
    assert.deepEqual(game.migrating_mons, monsters.slice(0, 2));
    assert.deepEqual(game.level.monsters, monsters.slice(2));
    for (const mon of game.migrating_mons) {
        assert.equal(mon.mux, 1);
        assert.ok(mon.muy >= 0 && mon.muy < 20);
        assert.equal(mon.mx, 0);
        assert.equal(mon.minvent.length, 1);
        assert.equal(mon.mtame, 0);
        assert.equal(mon.mpeaceful, 0);
        assert.equal(mon.msleeping, 0);
    }
    assert.equal(game._pending_message, 'The demons disappear in a cloud of brimstone!');
});

test('Demonbane ignores demons outside line of sight', async () => {
    setup('Demonbane', 'Priest', 1);
    game.dungeons = [{ dname: 'The Dungeons of Doom' }, { dname: 'Gehennom', num_dunlevs: 20 }];
    const mon = { data: MONS.find(row => row.name === 'vrock'), mx: 8, my: 5, mhp: 30, mpeaceful: 1 };
    game.level.monsters = [mon];
    game.viz_array[5][8] = 0;
    await invoke();
    assert.ok(game.level.monsters.includes(mon));
    assert.equal(mon.mpeaceful, 1);
    assert.equal(game.migrating_mons?.length || 0, 0);
});

test('Demonbane relocates demons within Gehennom instead of migrating them', async () => {
    setup('Demonbane', 'Priest', 1);
    game.dungeons = [{ dname: 'Gehennom', num_dunlevs: 20, depth_start: 26 }];
    const mon = { data: MONS.find(row => row.name === 'vrock'), mx: 8, my: 5, mhp: 30, minvent: [] };
    game.level.monsters = [mon];
    await invoke();
    assert.ok(game.level.monsters.includes(mon));
    assert.equal(game.migrating_mons?.length || 0, 0);
    assert.notDeepEqual([mon.mx, mon.my], [8, 5]);
});

test('Eye portal menu lists only reached non-tutorial dungeons and cancellation keeps cooldown', async () => {
    const eye = setup('The Eye of the Aethiopica', 'Wizard');
    game.tutorial_dnum = 3;
    game.dungeons = [
        { dname: 'Doom', depth_start: 1, entry_lev: 1, dunlev_ureached: 10 },
        { dname: 'Mines', depth_start: 3, entry_lev: 1, dunlev_ureached: 4 },
        { dname: 'Unreached', depth_start: 20, entry_lev: 1, dunlev_ureached: 0 },
        { dname: 'Tutorial', depth_start: 1, entry_lev: 1, dunlev_ureached: 2 },
    ];
    await invoke();
    assert.equal(game._command_mode, 'invokePortal');
    assert.deepEqual(game._artifact_portal_choices.map(row => row.dnum), [0, 1]);
    await rhack('\x1b');
    assert.ok(eye.age > game.moves);
    assert.equal(game.context.move, 1);
    assert.equal(game._pending_message, 'You feel a surge of power, but nothing seems to happen.');
});

for (const depth of [1, 10]) {
    test(`Eye portal chooses ${depth === 1 ? 'entry' : 'deepest reached'} level from current depth ${depth}`, async () => {
        setup('The Eye of the Aethiopica', 'Wizard');
        game.u.uz.dlevel = depth;
        game.dungeons = [
            { dname: 'Doom', depth_start: 1, entry_lev: 1, dunlev_ureached: 10 },
            { dname: 'Mines', depth_start: 3, entry_lev: 1, dunlev_ureached: 4 },
        ];
        await invoke();
        await rhack('b');
        assert.deepEqual(game._deferred_level_goto?.targetLevel, { dnum: 1, dlevel: depth === 1 ? 1 : 4 });
        assert.match(game._pending_message, /shimmering sphere/);
    });
}

test('Eye refuses a portal while carrying the Amulet', async () => {
    setup('The Eye of the Aethiopica', 'Wizard');
    game.u.uhave = { amulet: true };
    game.dungeons = [
        { dname: 'Doom', depth_start: 1, entry_lev: 1, dunlev_ureached: 10 },
        { dname: 'Mines', depth_start: 3, entry_lev: 1, dunlev_ureached: 4 },
    ];
    await invoke();
    await rhack('b');
    assert.equal(game._deferred_level_goto, undefined);
    assert.equal(game._pending_message, 'You feel very disoriented for a moment.');
});
