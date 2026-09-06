import test from 'node:test';
import assert from 'node:assert/strict';
import * as cmd from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { ROOM, STONE, POOL, WATER, DOOR, D_ISOPEN, COULD_SEE, IN_SIGHT } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog, rn2 } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

const POT_ACID = 238, SCR_BLANK_PAPER = 293;

function setup(seed = 41) {
    resetGame();
    initRng(seed);
    game.flags = { verbose: true };
    game.context = {};
    game.moves = 1;
    game.inventory = [];
    game._startup_role = 'Wizard';
    game.u = { ux: 10, uy: 10, ux0: 9, uy0: 10, dx: 1, dy: 0,
        uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30, uen: 100, uenmax: 100,
        ulevel: 10, uhunger: 900, uluck: -10, acurr: { a: [10, 10, 10, 10, 10, 10] },
        abase: { a: [10, 10, 10, 10, 10, 10] }, amax: { a: [18, 18, 18, 18, 18, 18] },
        ualign: { type: 0, record: 0 } };
    const cells = Array.from({ length: 80 }, () => Array.from({ length: 21 }, () =>
        ({ typ: STONE, flags: 0, lit: true, seenv: 255, roomno: 0, doormask: 0 })));
    cells[10][10].typ = POOL;
    game.level = { flags: {}, objects: [], monsters: [], traps: [], rooms: [], engravings: [], at: (x, y) => cells[x]?.[y] };
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    enableRngLog();
}

test('ordinary forced water entry damages inventory before crawling out', async () => {
    setup();
    game.u.ux = 9;
    game.level.at(9, 10).typ = ROOM;
    game.inventory.push({ letter: 'a', cls: 'scroll', glyph: '?', kind: 'scroll of identify', quan: 1 });
    await cmd.rhack('m');
    await cmd.rhack('l');
    assert.equal(game.inventory[0].otyp, SCR_BLANK_PAPER);
    assert.match(game._pending_message, /crawl out/);
});

for (const property of ['flying', 'levitating', 'waterWalking']) {
    test(`melted ice does not wet a hero protected by ${property}`, async () => {
        setup();
        game.u[property] = true;
        const potion = { letter: 'a', cls: 'potion', otyp: POT_ACID, kind: 'potion of acid', quan: 1 };
        game.inventory.push(potion);
        const result = await cmd.afterMeltHeroSpotEffects(10, 10);
        assert.deepEqual(result.messages, []);
        assert.deepEqual(game.inventory, [potion]);
        assert.equal(getRngLog().length, 0);
    });
}

test('swimming prevents drowning but not inventory damage or leash release', async () => {
    setup();
    game.u.swimming = true;
    const scroll = { letter: 'a', cls: 'scroll', glyph: '?', kind: 'scroll of identify', quan: 1, dknown: true, spe: 4 };
    const acid = { letter: 'b', cls: 'potion', glyph: '!', otyp: POT_ACID, kind: 'potion of acid', quan: 2 };
    const leash = { letter: 'c', kind: 'leash', cls: 'tool', leashmon: 17, quan: 1 };
    game.inventory.push(scroll, acid, leash);
    game.level.monsters.push({ m_id: 17, mx: 9, my: 10, data: MONS.find(row => row.name === 'dog'), mleashed: true });
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(scroll.otyp, SCR_BLANK_PAPER);
    assert.equal(scroll.dknown, false);
    assert.equal(scroll.spe, 0);
    assert.ok(!game.inventory.includes(acid));
    assert.equal(leash.leashmon, 0);
    assert.equal(game.level.monsters[0].mleashed, false);
    assert.equal(game.u.uinwater, 1);
    assert.equal(game.u.uhp, 30);
    assert.match(result.messages.join('  '), /fall into the pool of water\./);
    assert.ok(!result.messages.some(message => /sink|touch bottom|aren't drowning/.test(message)));
    assert.ok(result.messages.findIndex(message => /explode/.test(message)) < result.messages.findIndex(message => /leash/.test(message)));
});

test('canonical amphibious form enters water and touches bottom', async () => {
    setup();
    game.u._polyself_form = MONS.find(row => row.name === 'giant eel');
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(game.u.uinwater, 1);
    assert.ok(result.messages.includes("But you aren't drowning."));
    assert.ok(result.messages.includes('You touch bottom.'));
    assert.equal(getRngLog().length, 0);
});

test('crawl escape shuffles all eight directions before finding a safe orthogonal destination', async () => {
    setup();
    game.level.at(11, 10).typ = ROOM;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.deepEqual([game.u.ux, game.u.uy], [11, 10]);
    assert.equal(game.u.uinwater || 0, 0);
    assert.equal(result.relocated, true);
    assert.deepEqual(getRngLog().slice(0, 8).map(row => row.match(/^rn2\((\d+)\)/)?.[1]), ['8', '7', '6', '5', '4', '3', '2', '1']);
    assert.ok(result.messages.includes('Pheew!  That was close.'));
});

test('crawl cannot escape diagonally through an open doorway', async () => {
    setup();
    Object.assign(game.level.at(11, 11), { typ: DOOR, doormask: D_ISOPEN });
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(result.fatal, true);
    assert.equal(game.u.uhp, 0);
    assert.match(result.messages.join('  '), /You drown\./);
    assert.equal(game._death_cause, 'drowned in a pool of water');
});

test('water walls submerge a water-walking hero', async () => {
    setup();
    game.level.at(10, 10).typ = WATER;
    game.u.waterWalking = true;
    const result = await cmd.heroWaterLandingEffects();
    assert.equal(result.fatal, true);
    assert.equal(result.messages[0], 'You plunge into the wall of water!');
    assert.ok(!result.messages.some(message => /sink like/.test(message)));
});

test('already submerged swimmers take periodic water damage only on one of five rolls', async () => {
    setup();
    game.u.swimming = true;
    game.u.uinwater = 1;
    game.level.at(9, 10).typ = POOL;
    const expected = rn2(5);
    assert.notEqual(expected, 0, 'test seed must exercise the no-damage branch');
    initRng(41);
    const scroll = { letter: 'a', cls: 'scroll', kind: 'scroll of identify', quan: 1 };
    game.inventory.push(scroll);
    const result = await cmd.heroWaterLandingEffects();
    assert.equal(scroll.kind, 'scroll of identify');
    assert.deepEqual(result.messages, []);
    assert.equal(getRngLog().length, 1);
});

test('gaining levitation while submerged exits water without inventory rolls', async () => {
    setup();
    game.u.uinwater = game.u.underwater = 1;
    game.u.levitating = true;
    const result = await cmd.heroWaterLandingEffects();
    assert.equal(game.u.uinwater, 0);
    assert.equal(game.u.underwater, false);
    assert.deepEqual(result.messages, ['You pop out of the water like a cork!']);
    assert.equal(getRngLog().length, 0);
});

test('life saving resumes the drowning rescue after the message prompt', async () => {
    setup();
    game.level.at(20, 10).typ = ROOM;
    const amulet = { letter: 'a', cls: 'amulet', glyph: '"', amuletIndex: 1, worn: true, quan: 1 };
    game.inventory.push(amulet);
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(result.lifeSaving, true);
    assert.equal(result.pending, true);
    assert.equal(game._water_continuation?.phase, 'afterDeath');
    assert.ok(!game.inventory.includes(amulet));
    cmd.applyLifeSavingOrFatalCommandMode(result);
    await cmd.rhack(' ');
    assert.deepEqual([game.u.ux, game.u.uy], [20, 10]);
    assert.equal(game.u.uinwater, 0);
    assert.equal(game.u.uhp, 30);
    assert.equal(game._water_continuation, null);
    assert.match(game._pending_message, /You find yourself/);
});

test('controlled teleport suspends before crawling and resumes after an actual cursor choice', async () => {
    setup();
    game.u.teleportation = game.u.teleportControl = true;
    game.level.at(20, 10).typ = ROOM;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(result.pending, true);
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game._water_continuation.phase, 'afterTeleport');
    assert.equal(game.u.uen, 70);
    assert.equal(getRngLog().length, 0);
    for (let i = 0; i < 10; i++) await cmd.rhack('l');
    await cmd.rhack('.');
    assert.deepEqual([game.u.ux, game.u.uy], [20, 10]);
    assert.equal(game.u.uhunger, 800);
    assert.equal(game._water_continuation, null);
    assert.equal(game._command_mode, null);
});

test('aborting controlled teleport still costs hunger and then crawls out', async () => {
    setup();
    game.u.teleportation = game.u.teleportControl = true;
    game.level.at(11, 10).typ = ROOM;
    await cmd.afterMeltHeroSpotEffects(10, 10);
    await cmd.rhack('\x1b');
    assert.deepEqual([game.u.ux, game.u.uy], [11, 10]);
    assert.equal(game.u.uhunger, 800);
    assert.equal(game._water_continuation, null);
    assert.match(game._pending_message, /Pheew/);
});

test('paralysis prevents crawl attempts and their shuffle draws', async () => {
    setup();
    game.multi = -3;
    game.level.at(11, 10).typ = ROOM;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(result.fatal, true);
    assert.equal(getRngLog().length, 0);
});

test('excess carried weight is shed before the crawl message, while cursed loadstone is retained', async () => {
    setup();
    game.level.at(11, 10).typ = ROOM;
    const stone = { letter: 'a', cls: 'gem', kind: 'loadstone', cursed: true, quan: 1, owt: 500 };
    const weapon = { letter: 'b', cls: 'gem', glyph: '*', kind: 'rock', quan: 80, owt: 800 };
    game.inventory.push(stone, weapon);
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.deepEqual(game.inventory, [stone]);
    assert.deepEqual([game.u.ux, game.u.uy], [11, 10]);
    assert.ok(game.level.objects.some(obj => obj.kind === 'rock' && obj.ox === 10 && obj.oy === 10));
    assert.match(result.messages.join('  '), /dump some of your gear/);
});

test('a welded weapon cannot be shed to crawl out of water', async () => {
    setup();
    game.level.at(11, 10).typ = ROOM;
    game.u.acurr.a[0] = game.u.acurr.a[4] = 3;
    const weapon = { letter: 'a', cls: 'weapon', glyph: ')', kind: 'long sword', quan: 1, owt: 40,
        cursed: true, wielded: true, oerodeproof: true };
    game.inventory.push(weapon, { letter: 'b', cls: 'gem', kind: 'loadstone', cursed: true, quan: 1, owt: 500 });
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(result.fatal, true);
    assert.ok(game.inventory.includes(weapon));
    assert.match(result.messages.join('  '), /But in vain/);
});

test('waterproof containers protect their contents before per-object luck rolls', () => {
    setup();
    const acid = { cls: 'potion', glyph: '!', otyp: POT_ACID, quan: 1 };
    const sack = { letter: 'a', cls: 'tool', kind: 'oilskin sack', contents: [acid], quan: 1 };
    game.inventory.push(sack);
    const messages = cmd.waterDamageHeroInventory();
    assert.deepEqual(sack.contents, [acid]);
    assert.equal(getRngLog().length, 0);
    assert.match(messages.join('  '), /cannot get into/);
    assert.equal(sack.known, true);
});

test('ordinary container flooding destroys contained acid and preserves the container', () => {
    setup();
    const acid = { cls: 'potion', glyph: '!', otyp: POT_ACID, quan: 1 };
    const sack = { letter: 'a', cls: 'tool', kind: 'sack', contents: [acid], quan: 1 };
    game.inventory.push(sack);
    const messages = cmd.waterDamageHeroInventory();
    assert.deepEqual(sack.contents, []);
    assert.deepEqual(game.inventory, [sack]);
    assert.match(messages.join('  '), /Some water gets into your sack!  A potion explodes!/);
});

test('diluted potions turn into plain water and forget the former appearance', () => {
    setup();
    const potion = { letter: 'a', cls: 'potion', kind: 'potion of healing', potionIndex: 15, quan: 1,
        odiluted: 1, blessed: true, dknown: true };
    game.inventory.push(potion);
    cmd.waterDamageHeroInventory();
    assert.equal(potion.otyp, 253);
    assert.equal(potion.blessed, false);
    assert.equal(potion.dknown, false);
    assert.equal(potion.odiluted, false);
    assert.equal(potion.potionIndex, null);
});

test('iron golem rust uses its monster HP pool and reduces maximum HP before damage', async () => {
    setup();
    game.u._polyself_form = MONS.find(row => row.name === 'iron golem');
    game.u.mh = game.u.mhmax = 30;
    game.u.halfPhysicalDamage = true;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    const roll = Number(getRngLog().find(row => row.startsWith('d(2,6)=')).split('=')[1]);
    assert.equal(game.u.mh, 30 - Math.ceil(roll / 2));
    assert.equal(game.u.mhmax, 30 - Math.ceil(roll / 2));
    assert.equal(game.u.uhp, 30);
    assert.ok(result.messages.includes('You rust!'));
    assert.equal(game.u.uinwater, 1);
});

test('a flying steed keeps its rider and inventory above melted ice', async () => {
    setup();
    const steed = { data: MONS.find(row => row.name === 'red dragon'), mx: 10, my: 10, mhp: 50, mhpmax: 50 };
    game.u.usteed = steed;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(game.u.usteed, steed);
    assert.deepEqual(result.messages, []);
    assert.equal(getRngLog().length, 0);
});

test('a grounded steed drowns before the rider enters water and crawls out', async () => {
    setup();
    game.level.at(11, 10).typ = ROOM;
    const steed = { data: MONS.find(row => row.name === 'horse'), mx: 10, my: 10, mhp: 25, mhpmax: 25,
        m_lev: 5, minvent: [], mtame: 10, mpeaceful: true, pet: true, mcansee: true, mcanmove: true };
    game.u.usteed = steed;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(game.u.usteed, null);
    assert.equal(steed.dead, true);
    assert.ok(!game.level.monsters.includes(steed));
    assert.deepEqual([game.u.ux, game.u.uy], [11, 10]);
    const text = result.messages.join('  ');
    assert.match(text, /horse falls into the water/);
    assert.ok(text.indexOf('horse falls') < text.indexOf('You fall into'));
    assert.doesNotMatch(text, /dungeon on a horse with no name/);
    // mon.c:xkilled: tame -15 and peaceful neutral malign -9;
    // steed.c:730 then imposes its additional -1.
    assert.equal(game.u.ualign.record, -25);
});

test('a life-saved steed remains in water while its rider lands on the reserved dry square', async () => {
    setup();
    game.level.at(11, 10).typ = ROOM;
    const amulet = { cls: 'amulet', amuletIndex: 1, kind: 'amulet of life saving', worn: true, quan: 1 };
    const steed = { data: MONS.find(row => row.name === 'horse'), mx: 10, my: 10, mhp: 25, mhpmax: 25,
        m_lev: 5, minvent: [amulet], mtame: 10, mpeaceful: true, pet: true, mcansee: true, mcanmove: true };
    game.u.usteed = steed;
    const result = await cmd.afterMeltHeroSpotEffects(10, 10);
    assert.equal(game.u.usteed, null);
    assert.equal(steed.dead, false);
    assert.ok(game.level.monsters.includes(steed));
    assert.ok(!steed.minvent.includes(amulet));
    assert.deepEqual([game.u.ux, game.u.uy], [11, 10]);
    assert.equal(game.u.uinwater || 0, 0);
    assert.ok(!result.messages.some(message => /You fall into/.test(message)));
});
