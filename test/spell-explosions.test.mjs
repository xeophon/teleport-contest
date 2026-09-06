import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack, __shopBillingTestHooks } from '../js/cmd.js';
import { mkobj } from '../js/mklev.js';
import { game, resetGame } from '../js/gstate.js';
import { COULD_SEE, IN_SIGHT, ROOM, STONE, P_ATTACK_SPELL, P_SKILLED, WEB, POOL, ICE, DOOR, D_CLOSED, D_NODOOR, M_SEEN_FIRE, M_SEEN_COLD, MSLOW } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { d, rn2, initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { sensesTelepathically } from '../js/display.js';

function setup(seed = 41) {
    resetGame();
    initRng(seed);
    game.flags = { verbose: true };
    game.context = {};
    game.moves = 1;
    game.inventory = [];
    game._startup_role = 'Wizard';
    game.u = { ux: 5, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 1000, uhpmax: 1000,
        uen: 100, uenmax: 100, ulevel: 10, uexp: 0, uhunger: 900, uluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] }, abase: { a: [10, 10, 10, 10, 10, 10] },
        amax: { a: [18, 18, 18, 18, 18, 18] }, ualign: { type: 0, record: 0 } };
    const cells = Array.from({ length: 80 }, (_, x) => Array.from({ length: 21 }, () => ({
        typ: x > 0 && x < 79 ? ROOM : STONE, lit: true, roomno: 0, flags: 0, doormask: 0,
    })));
    game.level = { flags: {}, objects: [], monsters: [], traps: [], rooms: [], engravings: [], at: (x, y) => cells[x]?.[y] };
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    enableRngLog();
}

function monster(name = 'wolf', x = 10, y = 10, extra = {}) {
    const data = MONS.find(row => row.name === name);
    const mon = { data, mx: x, my: y, m_lev: data.lvl, mhp: 1000, mhpmax: 1000,
        mcanmove: true, mcansee: true, minvent: [], ...extra };
    game.level.monsters.push(mon);
    return mon;
}

async function directional(name, key = 'l') {
    game._casting_spell = { name, level: 4, category: 'attack' };
    game._command_mode = 'spellDirection';
    await rhack(key);
}

async function beginSkilled(name) {
    game.u.weapon_skills = { [P_ATTACK_SPELL]: { skill: P_SKILLED } };
    game._spell_menu_spells = [{ name, letter: 'a', level: 4, category: 'attack', successChance: 100 }];
    game._command_mode = 'castSpell';
    await rhack('a');
}

test('basic fireball stops at a monster and explodes over adjacent squares without to-hit rolls', async () => {
    setup();
    const target = monster();
    const adjacent = monster('wolf', 11, 11);
    const outside = monster('wolf', 12, 10);
    rn2(7);
    const expected = d(12, 6); // zap.c:5027: fixed twelve dice, independent of hero level.
    initRng(41);
    await directional('fireball');
    assert.equal(target.mhp, 1000 - expected);
    assert.equal(adjacent.mhp, 1000 - expected);
    assert.equal(outside.mhp, 1000);
    assert.ok(!getRngLog().some(row => row.startsWith('rn2(20)=')));
});

test('self fireball applies six dice with the C Wizard retributive-strike reduction only to hero', async () => {
    setup();
    const adjacent = monster('wolf', 6, 10);
    const expected = d(6, 6); // zapyourself uses WAND_CLASS; explode divides Wizard damage by five.
    initRng(41);
    await directional('fireball', '.');
    assert.equal(adjacent.mhp, 1000 - expected);
    assert.equal(game.u.uhp, 1000 - Math.trunc(expected / 5));
});

test('self cold uses twelve dice even with half physical damage', async () => {
    setup();
    game.u.halfPhysicalDamage = true;
    const expected = d(12, 6);
    initRng(41);
    await directional('cone of cold', '.');
    assert.equal(game.u.uhp, 1000 - expected);
    assert.match(game._pending_message, /imitate a popsicle/);
});

test('vertical fireball traverses one ray step at the hero and then explodes', async () => {
    setup();
    const adjacent = monster('wolf', 6, 10);
    await directional('fireball', '>');
    const damage = getRngLog().find(row => row.startsWith('d(12,6)='));
    assert.ok(damage);
    assert.equal(adjacent.mhp, 1000 - Number(damage.split('=')[1]));
    assert.ok(getRngLog().some(row => row.startsWith('rn2(7)=')), 'C draws range before setting vertical range to one');
});

test('swallowed fireball hits only the engulfer as a ray, with no range or explosion dice', async () => {
    setup();
    const engulfer = monster('purple worm', 5, 10);
    const outside = monster('wolf', 6, 10);
    game.u.uswallow = 1;
    game.u.ustuck = engulfer;
    await directional('fireball');
    assert.ok(engulfer.mhp < 1000);
    assert.equal(outside.mhp, 1000);
    assert.equal(game.u.uhp, 1000);
    assert.ok(getRngLog().some(row => row.startsWith('d(6,6)=')));
    assert.ok(!getRngLog().some(row => row.startsWith('rn2(7)=') || row.startsWith('d(12,6)=')));
});

for (const name of ['fireball', 'cone of cold']) {
    test(`skilled ${name} uses a position prompt and C repeated explosions with a final scatter draw`, async () => {
        setup();
        await beginSkilled(name);
        assert.equal(game._command_mode, 'spellExplosionTarget');
        assert.match(game._pending_message, /Where do you want to cast the spell/);
        assert.equal(game.u.uen, 80);
        for (let i = 0; i < 5; i++) await rhack('l');
        enableRngLog();
        await rhack('.');
        const log = getRngLog();
        const count = Number(log.find(row => row.startsWith('rnd(8)=')).split('=')[1]) + 1;
        assert.equal((game._pending_message.match(/Boom!/g) || []).length, count);
        assert.equal(log.filter(row => row.startsWith('rnd(3)=')).length, 2 * count);
        assert.equal(game.u.uen, 80, 'target input does not charge again');
        assert.equal(game.context.move, 1);
    });
}

test('canceling a skilled explosion uses paid energy and time without any blast RNG', async () => {
    setup();
    await beginSkilled('fireball');
    assert.equal(game._command_mode, 'spellExplosionTarget');
    enableRngLog();
    await rhack('\x1b');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.u.uen, 80);
    assert.deepEqual(getRngLog(), []);
});

test('fireball explosion burns webs and evaporates pools in its area', async () => {
    setup();
    monster();
    game.level.traps.push({ tx: 10, ty: 11, ttyp: WEB });
    game.level.at(9, 9).typ = POOL;
    await directional('fireball');
    assert.ok(!game.level.traps.some(trap => trap.ttyp === WEB));
    assert.equal(game.level.at(9, 9).typ, ROOM);
});

test('skilled cold freezes terrain in every blast area', async () => {
    setup();
    game.level.at(10, 10).typ = POOL;
    await beginSkilled('cone of cold');
    assert.equal(game._command_mode, 'spellExplosionTarget');
    for (let i = 0; i < 5; i++) await rhack('l');
    await rhack('.');
    assert.equal(game.level.at(10, 10).typ, ICE);
});

test('fireball resistance masks use canonical species, opposite resistance doubles damage, and reflection does not redirect blasts', async () => {
    setup();
    const immune = monster('hell hound', 10, 10);
    const vulnerable = monster('frost giant', 10, 11, { mr: 0 });
    const reflected = monster('wolf', 11, 10, { reflecting: true });
    await directional('fireball');
    const damage = Number(getRngLog().find(row => row.startsWith('d(12,6)=')).split('=')[1]);
    assert.equal(immune.mhp, 1000);
    assert.equal(vulnerable.mhp, 1000 - 2 * damage);
    assert.equal(reflected.mhp, 1000 - damage);
});

test('resistant iron and flesh golems receive their healing and slowing side effects', async () => {
    setup();
    const iron = monster('iron golem', 10, 10, { mhp: 500 });
    const flesh = monster('flesh golem', 11, 10, { mspeed: 0, permspeed: 0 });
    await directional('fireball');
    const damage = Number(getRngLog().find(row => row.startsWith('d(12,6)=')).split('=')[1]);
    assert.equal(iron.mhp, 500 + damage);
    assert.equal(flesh.mhp, 1000);
    assert.equal(flesh.mspeed, MSLOW);
});

test('a killed swallowed target releases the hero; life saving keeps the engulfer attached', async () => {
    for (const saved of [false, true]) {
        setup();
        const mon = monster('purple worm', 5, 10, { mhp: 1, mr: 0, mspec_used: 0 });
        if (saved) mon.minvent.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true });
        game.u.uswallow = 1;
        game.u.uswldtim = 8;
        game.u.ustuck = mon;
        await directional('cone of cold');
        assert.equal(Boolean(mon.dead), !saved);
        assert.equal(Boolean(game.u.uswallow), saved);
        assert.equal(game.u.ustuck, saved ? mon : null);
        assert.equal(game.u.uswldtim, saved ? 8 : 0);
        assert.equal(mon.mx, 5, 'dead engulfer is not expelled into an adjacent square');
        assert.equal(mon.my, 10, 'dead engulfer stays at its death location');
        if (saved) assert.equal(mon.minvent.length, 0);
        else assert.ok(!game.level.objects.some(obj => obj.corpsenm), 'killing from inside prevents a corpse');
    }
});

test('fire death suppresses a paper-golem corpse while still dropping its ordinary inventory', async () => {
    setup();
    const gold = { cls: 'coin', kind: 'gold piece', quan: 7 };
    const mon = monster('paper golem', 10, 10, { mhp: 1, minvent: [gold] });
    await directional('fireball');
    assert.equal(mon.dead, true);
    assert.ok(game.level.objects.includes(gold));
    assert.ok(!game.level.objects.some(obj => /blank paper|blank scroll/.test(obj.kind || '')));
    assert.ok(!getRngLog().some(row => row.startsWith('rn2(6)=')), 'XKILL_NOCORPSE skips the treasure roll too');
});

test('elemental self damage uses monster-form HP and rehumanizes without killing the hero', async () => {
    setup();
    game.u._polyself_form = MONS.find(row => row.name === 'wolf');
    game.u.mh = 1;
    game.u.mhmax = 20;
    await directional('cone of cold', '.');
    assert.equal(game.u.uhp, 1000);
    assert.equal(game.u._polyself_form, null);
    assert.ok(!game._death_cause);
});

test('self elemental resistance is observed by monsters and does not skip inventory damage rolls', async () => {
    for (const [name, field, bit] of [['fireball', 'fireResistance', M_SEEN_FIRE], ['cone of cold', 'coldResistance', M_SEEN_COLD]]) {
        setup();
        const witness = monster('wolf', 20, 10);
        game.u[field] = true;
        await directional(name, '.');
        assert.equal(game.u.uhp, 1000);
        assert.equal(witness.m_seenres & bit, bit);
        assert.ok(getRngLog().some(row => row.startsWith('rn2(5)=')));
    }
});

test('skilled target range rejection occurs before burst RNG and retains the energy cost', async () => {
    setup();
    await beginSkilled('fireball');
    await rhack('L');
    for (let i = 0; i < 3; i++) await rhack('l');
    enableRngLog();
    await rhack('.');
    assert.equal(game._pending_message, 'The spell dissipates over the distance!');
    assert.deepEqual(getRngLog(), []);
    assert.equal(game.u.uen, 80);
});

test('skilled casting in water fails after paying energy but before target or burst RNG', async () => {
    setup();
    game.u.uinwater = 1;
    await beginSkilled('cone of cold');
    assert.equal(game._command_mode, null);
    assert.equal(game.u.uen, 80);
    assert.equal(game._pending_message, "You're joking!  In this weather?");
    assert.ok(!getRngLog().some(row => row.startsWith('rnd(8)=')));
});

test('fireball ends before a solid obstacle and destroys adjacent closed doors', async () => {
    setup();
    game.level.at(10, 10).typ = STONE;
    const door = game.level.at(9, 11);
    door.typ = DOOR;
    door.doormask = D_CLOSED;
    const outside = monster('wolf', 11, 10);
    await directional('fireball');
    assert.equal(door.doormask, D_NODOOR);
    assert.equal(outside.mhp, 1000);
});

test('life saving between skilled cold explosions restores HP before the remaining explosions', async () => {
    setup();
    game.u.uhp = 1;
    game.u.uhpmax = 200;
    game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', worn: true });
    await beginSkilled('cone of cold');
    enableRngLog();
    await rhack('.');
    const count = Number(getRngLog().find(row => row.startsWith('rnd(8)=')).split('=')[1]) + 1;
    assert.equal((game._pending_message.match(/Boom!/g) || []).length, count);
    assert.equal(game._command_mode, 'lifeSavingMore');
    const survivedHp = game.u.uhp;
    assert.ok(survivedHp > 0 && survivedHp < 100);
    await rhack(' ');
    assert.equal(game.u.uhp, survivedHp, 'dismissing life-saving text cannot erase later blast damage');
});

test('hero explosion ignites cursed lamps before destroy_items selects inventory', async () => {
    setup();
    game.u.fireResistance = true;
    const lamp = { cls: 'tool', kind: 'oil lamp', age: 1000, spe: 1, cursed: true, quan: 1 };
    game.inventory.push(lamp);
    await directional('fireball', '.');
    const log = getRngLog();
    const ignition = log.findIndex(row => row.startsWith('rn2(2)='));
    const selection = log.findLastIndex(row => row.startsWith('rn2(5)='));
    assert.ok(ignition >= 0, 'catch_lit tests a cursed lamp');
    assert.ok(ignition < selection, 'explode.c:ignite_items precedes destroy_items damage-limit roll');
});

test('fire-resistant monster takes no HP damage from its burning scroll stack', async () => {
    setup();
    const scroll = { cls: 'scroll', kind: 'scroll of identify', quan: 100 };
    const mon = monster('hell hound', 10, 10, { minvent: [scroll] });
    await directional('fireball');
    assert.ok(scroll.quan < 100, 'inventory burns despite fire resistance');
    assert.equal(mon.mhp, 1000, 'burning paper is fire damage, unlike exploding potions');
});

for (const level of [0, 1, 10, 20]) {
    test(`C savelife raises low maximum HP to max(level,10) at level ${level}`, async () => {
        setup();
        Object.assign(game.u, { uhp: 1, uhpmax: 5, uhppeak: 5, ulevel: level });
        game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', worn: true });
        await directional('cone of cold', '.');
        assert.equal(game._command_mode, 'lifeSavingMore');
        assert.equal(game.u.ulevel, Math.max(level, 1));
        assert.equal(game.u.uhpmax, Math.max(level, 10));
        assert.equal(game.u.uhp, Math.max(level, 10));
        assert.equal(game.u.uhppeak, Math.max(level, 10));
    });
}

test('a generated unidentified life-saving amulet works after the real put-on command', async () => {
    setup();
    let amulet;
    for (let i = 0; i < 1000; i++) {
        const item = mkobj(15, false); // objclass.h: AMULET_CLASS
        if (item.amuletIndex === 1) { amulet = item; break; }
    }
    assert.ok(amulet);
    assert.equal(amulet.kind, undefined);
    Object.assign(amulet, { letter: 'a', cursed: false });
    game.inventory.push(amulet);
    await rhack('P');
    await rhack('a');
    assert.equal(amulet.worn, true);
    game.u.uhp = 1;
    await directional('cone of cold', '.');
    assert.equal(game._command_mode, 'lifeSavingMore');
    assert.equal(game.u.uhp, 90, 'Con 10 falls to 9 before calculating 50+10*(Con/2)');
    assert.ok(!game.inventory.includes(amulet));
    assert.ok(game._discoveries.some(row => row.name === 'amulet of life saving' && row.known));
});

test('life saving revives an Unchanging monster form and clears only the intrinsic property', async () => {
    setup();
    const form = MONS.find(row => row.name === 'wolf');
    Object.assign(game.u, { _polyself_form: form, mh: 1, mhmax: 200, unchanging: true });
    game.inventory.push({ cls: 'amulet', amuletIndex: 1, worn: true });
    await directional('cone of cold', '.');
    assert.equal(game._command_mode, 'lifeSavingMore');
    assert.equal(game.u._polyself_form, form);
    assert.equal(game.u.mh, 90);
    assert.equal(game.u.uhp, 90);
    assert.equal(game.u.unchanging, false);
    await rhack(' ');
    assert.equal(game.u.mh, 90);
    assert.equal(game.u.uhp, 90);
});

test('an unidentified worn Unchanging amulet prevents rehumanization through fatal elemental damage', async () => {
    setup();
    const form = MONS.find(row => row.name === 'wolf');
    Object.assign(game.u, { _polyself_form: form, mh: 1, mhmax: 20 });
    game.inventory.push({ cls: 'amulet', amuletIndex: 6, worn: true });
    await directional('cone of cold', '.');
    assert.equal(game.u._polyself_form, form);
    assert.equal(game.u.mh, 0);
    assert.equal(game._death_cause, 'killed while stuck in creature form');
});

test('ordinary deferred life saving applies the post-Con healing cap and minimum maximum HP', async () => {
    for (const maxHp of [5, 200]) {
        setup();
        Object.assign(game.u, { uhp: 0, uhpmax: maxHp, unchanging: true });
        game._life_saving_refresh_con = 1;
        game._command_mode = 'lifeSavingMore';
        await rhack(' ');
        assert.equal(game.u.acurr.a[4], 9);
        assert.equal(game.u.uhpmax, Math.max(10, maxHp));
        assert.equal(game.u.uhp, Math.min(Math.max(10, maxHp), 90));
        assert.equal(game.u.unchanging, false);
    }
});

test('wizard refusal restores low base HP and monster HP while keeping worn Unchanging', async () => {
    setup();
    game.flags.debug = true;
    const form = MONS.find(row => row.name === 'wolf');
    const amulet = { cls: 'amulet', amuletIndex: 6, worn: true };
    game.inventory.push(amulet);
    Object.assign(game.u, { uhp: 0, uhpmax: 5, _polyself_form: form, mh: 0, mhmax: 200, unchanging: true });
    game._command_mode = 'wizardDieConfirm';
    await rhack('n');
    assert.equal(game.u.uhpmax, 10);
    assert.equal(game.u.uhp, 10);
    assert.equal(game.u.mh, 100);
    assert.equal(game.u.unchanging, false);
    assert.equal(amulet.worn, true);
    game.u.mh = 1;
    await directional('cone of cold', '.');
    assert.equal(game.u._polyself_form, form, 'extrinsic Unchanging remains active');
});

test('polymorph fire resistance shields HP from burning paper while the scrolls still burn', async () => {
    setup();
    game.u._polyself_form = MONS.find(row => row.name === 'hell hound');
    game.u.mh = game.u.mhmax = 100;
    const scroll = { cls: 'scroll', kind: 'scroll of identify', quan: 100 };
    game.inventory.push(scroll);
    await directional('fireball', '.');
    assert.ok(scroll.quan < 100);
    assert.equal(game.u.mh, 100);
});

test('worn fire resistance shields burning-paper damage even when inventory protection fails', () => {
    let witnessedDestruction = false;
    for (let seed = 1; seed <= 100 && !witnessedDestruction; seed++) {
        setup(seed);
        game.inventory.push({ cls: 'ring', kind: 'ring of fire resistance', worn: true });
        for (let i = 0; i < 20; i++)
            game.inventory.push({ cls: 'scroll', kind: 'scroll of identify', quan: 100 });
        const result = __shopBillingTestHooks.fireDamageInventoryForTest(100, true);
        witnessedDestruction = game.inventory.some(item => item.cls === 'scroll' && item.quan < 100);
        assert.equal(result.damage, 0);
    }
    assert.ok(witnessedDestruction, 'exercise the 1% inventory-protection failure');
});

for (const [label, hero, species, litSight, accepted] of [
    ['blind intrinsic telepathy', { blind: true, telepathy: true }, 'wolf', 0, true],
    ['mindless target with blind telepathy', { blind: true, telepathy: true }, 'acid blob', 0, false],
    ['sighted intrinsic telepathy', { telepathy: true }, 'wolf', 0, false],
    ['monster detection', { detectMonsters: true }, 'acid blob', 0, true],
    ['matching species warning', { warnOfMonsterSpecies: 'wolf' }, 'wolf', 0, true],
    ['different species warning', { warnOfMonsterSpecies: 'wolf' }, 'acid blob', 0, false],
    ['generic danger warning', { warning: true }, 'wolf', 0, false],
    ['unlit square without infravision', {}, 'wolf', COULD_SEE, false],
    ['warm target in infravision', { infravision: true }, 'wolf', COULD_SEE, true],
    ['cold target in infravision', { infravision: true }, 'lizard', COULD_SEE, false],
]) {
    test(`skilled spell targeting honors C canspotmon: ${label}`, async () => {
        setup();
        Object.assign(game.u, hero);
        const mon = monster(species, 8, 10);
        await beginSkilled('cone of cold');
        game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(litSight));
        for (let step = 0; step < 3; step++) await rhack('l');
        enableRngLog();
        await rhack('.');
        if (accepted) {
            assert.ok(mon.mhp < 1000);
            assert.ok(getRngLog().some(row => row.startsWith('rnd(8)=')));
            assert.doesNotMatch(game._pending_message, /fails to lock/);
        } else {
            assert.equal(mon.mhp, 1000);
            assert.equal(game._pending_message, 'Your mind fails to lock onto that location!');
            assert.deepEqual(getRngLog(), []);
        }
    });
}

test('generated ESP amulet enables unseen skilled targeting only while worn', async () => {
    setup();
    let amulet;
    for (let i = 0; i < 1000; i++) {
        const item = mkobj(15, false);
        if (item.amuletIndex === 0) { amulet = item; break; }
    }
    assert.ok(amulet);
    assert.equal(amulet.kind, undefined);
    amulet.letter = 'a';
    game.inventory.push(amulet);
    const mon = monster('wolf', 8, 10, { minvis: true, mundetected: true });
    assert.equal(sensesTelepathically(mon), false);
    await rhack('P');
    await rhack('a');
    assert.equal(sensesTelepathically(mon), true);
    await beginSkilled('fireball');
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    for (let step = 0; step < 3; step++) await rhack('l');
    await rhack('.');
    assert.ok(mon.mhp < 1000);
});

test('telepathy checks canonical mindlessness and the squared range boundary', () => {
    setup();
    game.inventory.push({ cls: 'amulet', amuletIndex: 0, worn: true });
    const minded = monster('wolf', 13, 10);
    const mindless = monster('acid blob', 6, 10);
    assert.equal(sensesTelepathically(minded), true, 'one source permits squared distance 64');
    minded.mx = 14;
    assert.equal(sensesTelepathically(minded), false);
    assert.equal(sensesTelepathically(mindless), false);
    game.u.blind = true;
    assert.equal(sensesTelepathically(minded), true, 'blind telepathy has no distance limit');
    assert.equal(sensesTelepathically(mindless), false);
});

test('telepathy rejects canonical mindless species even without a legacy mindless boolean', () => {
    setup();
    game.u.blind = game.u.telepathy = true;
    for (const name of ['acid blob', 'brown mold', 'gas spore', 'stone golem']) {
        const mon = monster(name, 8, 10);
        assert.equal(mon.data.mindless, undefined);
        assert.equal(sensesTelepathically(mon), false, name);
    }
});

test('seeing a long-worm segment permits targeting its unseen head', async () => {
    setup();
    const mon = monster('long worm', 8, 10, { wormno: 1, wormSegments: [{ x: 6, y: 10 }, { x: 7, y: 10 }] });
    await beginSkilled('cone of cold');
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    game.viz_array[10][6] = COULD_SEE | IN_SIGHT;
    for (let step = 0; step < 3; step++) await rhack('l');
    await rhack('.');
    assert.ok(mon.mhp < 1000);
    assert.doesNotMatch(game._pending_message, /fails to lock/);
});

test('sensed target behind an obstacle is accepted but spell walk_path still stops at the obstacle', async () => {
    setup();
    game.u.detectMonsters = true;
    const mon = monster('wolf', 8, 10);
    game.level.at(7, 10).typ = STONE;
    await beginSkilled('cone of cold');
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    for (let step = 0; step < 3; step++) await rhack('l');
    enableRngLog();
    await rhack('.');
    assert.ok(getRngLog().some(row => row.startsWith('rnd(8)=')));
    assert.equal(mon.mhp, 1000);
    assert.ok(game.u.uhp < 1000, 'center moves to square six, adjacent to the hero');
});
