import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { ROOM, STONE } from '../js/const.js';
import { game, resetGame } from '../js/gstate.js';
import { MONS } from '../js/permonst.js';
import { enableRngLog, getRngLog, initRng, rn1, rn2, rnd } from '../js/rng.js';
import { castSpellDirectionalEffect } from '../js/spell.js';
import { vision_reset } from '../js/vision.js';

// C refs: zap.c:bhitm(SPE_DRAIN_LIFE), resist(), bhit(), bhito();
// makemon.c:monhp_per_lvl()/golemhp(); mondata.c:resists_drli()/defended().
// In C resist() deals HP damage itself. A surviving, unresisted target
// then loses that HP again, along with maximum HP and a monster level.
function installState(seed = 31) {
    const g = resetGame();
    initRng(seed);
    g.flags = {};
    g.context = {};
    g.moves = 1;
    g.inventory = [];
    g.u = {
        ux: 5, uy: 5, uhp: 100, uhpmax: 100, uen: 100, uenmax: 100,
        ulevel: 10, uexp: 0, uhunger: 900, uluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        abase: { a: [10, 10, 10, 10, 10, 10] },
        amax: { a: [18, 18, 18, 18, 18, 18] },
    };
    const cells = new Map();
    g.level = {
        flags: {}, monsters: [], objects: [], traps: [], rooms: [], engravings: [],
        at(x, y) {
            const key = `${x},${y}`;
            if (!cells.has(key)) cells.set(key, {
                typ: x > 0 && x < 20 && y === 5 ? ROOM : STONE,
                roomno: 0, flags: 0, doormask: 0, wall_info: 0, lit: true,
            });
            return cells.get(key);
        },
    };
    vision_reset();
    return g;
}

function makeMonster(name = 'wolf', extra = {}) {
    const species = MONS.find(row => row.name.toLowerCase() === name.toLowerCase());
    return {
        mx: 6, my: 5, mhp: 200, mhpmax: 200, m_lev: species?.lvl ?? 4,
        data: species || { name, mlevel: 4, mr: 0 }, ...extra,
    };
}

function makeDeps(overrides = {}) {
    const events = [];
    return {
        events,
        spellRoleSkillLevel: () => 2,
        movementDirection: ch => ch === 'l' ? { dx: 1, dy: 0 } : null,
        heroIsStunned: () => false,
        heroIsConfused: () => false,
        heroIsBlind: () => false,
        heroIsKnightWithQuestArtifact: () => false,
        exerciseAttribute: () => rn2(19),
        visibleMonsterForScroll: () => true,
        monsterTheName: (mon, capitalized) => `${capitalized ? 'The' : 'the'} ${mon.data.name}`,
        monsterIsVampireShifterForLifeSaving: mon => !!mon.vampshifter,
        drainItemProtectedByDrainResistance: item => !!item?.defendsDrain,
        dragonArmorSpecForItem: item => item.kind === 'black dragon scales' ? { colorName: 'black' } : null,
        BLACK_DRAGON_SCALES: 10154,
        BLACK_DRAGON_SCALE_MAIL: 10144,
        monsterResistsEffect: mon => {
            events.push(['resist', mon]);
            return rn2(110 - Math.max(1, Math.min(50, mon.m_lev))) < (mon.data.mr || 0);
        },
        revealHeroProjectileHitMimicAppearance: mon => events.push(['reveal', mon]),
        directMeleeNonlethalWakeupTail: mon => events.push(['wake', mon]),
        killMonsterFromHeroProjectileHit: async (mon, messages) => {
            events.push(['kill', mon.mhp, mon.mhpmax, mon.m_lev]);
            mon.dead = true;
            mon.mhp = 0;
            messages.push(`You kill the ${mon.data.name}!`);
        },
        drainItem: item => { events.push(['item', item]); return { drained: false }; },
        ...overrides,
    };
}

function sourceRolls(seed, { extraRoll = null, mr = true, level = 5 } = {}) {
    initRng(seed);
    enableRngLog({ reset: true });
    rn2(19); // weffects: exercise(A_WIS, TRUE)
    const range = rn1(8, 6); // bhit range
    let damage = rnd(8); // monhp_per_lvl always consumes this, even for golems
    if (extraRoll === 'adult dragon') damage = 4 + rn2(5);
    if (extraRoll === 'level zero') damage = rnd(4);
    if (extraRoll === 'fixed level') damage = 4 + rnd(4);
    if (mr) rn2(110 - Math.max(1, Math.min(50, level)));
    const trace = [...getRngLog()];
    initRng(seed);
    enableRngLog({ reset: true });
    return { damage, range, trace };
}

test('drain life applies both C damage stages, maximum HP loss, and one level loss', async () => {
    installState();
    const mon = makeMonster();
    game.level.monsters = [mon];
    const deps = makeDeps();
    const expected = sourceRolls(31);
    const result = await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
    assert.equal(mon.mhp, 200 - 2 * expected.damage);
    assert.equal(mon.mhpmax, 200 - expected.damage);
    assert.equal(mon.m_lev, 4);
    assert.deepEqual(result.messages, ['The wolf suddenly seems weaker!']);
    assert.deepEqual(getRngLog(), expected.trace);
});

test('magic resistance halves rounded-up HP damage and prevents level and maximum HP drain', async () => {
    installState();
    const mon = makeMonster('wolf', { data: { name: 'wolf', mr: 200 } });
    game.level.monsters = [mon];
    const expected = sourceRolls(31);
    const result = await castSpellDirectionalEffect({ name: 'drain life' }, 'l', makeDeps());
    assert.equal(mon.mhp, 200 - Math.ceil(expected.damage / 2));
    assert.equal(mon.mhpmax, 200);
    assert.equal(mon.m_lev, 5);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(getRngLog(), expected.trace);
});

for (const name of ['kobold zombie', 'werewolf', 'water demon', 'Death', 'black dragon']) {
    test(`${name} resists life drain before the magic-resistance roll`, async () => {
        installState();
        const mon = makeMonster(name);
        game.level.monsters = [mon];
        const expected = sourceRolls(31, {
            mr: false, level: mon.m_lev,
            extraRoll: name === 'black dragon' ? 'adult dragon' : !mon.m_lev ? 'level zero' : null,
        });
        await castSpellDirectionalEffect({ name: 'drain life' }, 'l', makeDeps());
        assert.equal(mon.mhp, 200);
        assert.equal(mon.mhpmax, 200);
        assert.deepEqual(getRngLog(), expected.trace);
    });
}

test('a vampire in bat form resists drain but an ordinary vampire bat does not', async () => {
    for (const vampshifter of [true, false]) {
        installState();
        const mon = makeMonster('vampire bat', { vampshifter });
        game.level.monsters = [mon];
        await castSpellDirectionalEffect({ name: 'drain life' }, 'l', makeDeps());
        assert.equal(mon.mhp === 200, vampshifter);
    }
});

for (const [description, item, wielded, immune] of [
    ['wielded Excalibur', { kind: 'long sword', artifact: 'Excalibur' }, true, true],
    ['carried Excalibur', { kind: 'long sword', artifact: 'Excalibur' }, false, false],
    ['worn black scales', { kind: 'black dragon scales', worn: true }, false, true],
    ['carried black scales', { kind: 'black dragon scales' }, false, false],
    ['worn black mail by object type', { otyp: 10144, owornmask: 1 }, false, true],
    ['an unrelated worn artifact', { kind: 'ring', artifact: 'fake', defendsDrain: true, worn: true }, false, false],
]) {
    test(`${description} uses C wielded-weapon and worn-dragon-armor drain protection`, async () => {
        installState();
        const mon = makeMonster('wolf', { minvent: [item], mw: wielded ? item : null });
        game.level.monsters = [mon];
        const expected = sourceRolls(31, { mr: !immune });
        await castSpellDirectionalEffect({ name: 'drain life' }, 'l', makeDeps());
        assert.equal(mon.mhp === 200, immune);
        assert.deepEqual(getRngLog(), expected.trace);
    });
}

// Fixed HP table from makemon.c:golemhp(), divided by base species level.
for (const [name, hp] of [
    ['straw golem', 20], ['paper golem', 20], ['rope golem', 30], ['gold golem', 60],
    ['leather golem', 40], ['wood golem', 50], ['flesh golem', 40], ['clay golem', 70],
    ['stone golem', 100], ['glass golem', 80], ['iron golem', 120],
]) {
    test(`${name} drains fixed species HP per level while retaining the initial d8 draw`, async () => {
        installState();
        const mon = makeMonster(name);
        game.level.monsters = [mon];
        const expected = sourceRolls(31, { level: mon.m_lev });
        const deps = makeDeps({ monsterResistsEffect: () => { rn2(110 - mon.m_lev); return false; } });
        await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
        assert.equal(mon.mhpmax, 200 - Math.trunc(hp / mon.data.lvl));
        assert.deepEqual(getRngLog(), expected.trace);
    });
}

for (const [name, extraRoll] of [['red dragon', 'adult dragon'], ['baby red dragon', null], ['Asmodeus', 'fixed level']]) {
    test(`${name} consumes the C species HP roll sequence`, async () => {
        installState();
        const mon = makeMonster(name);
        game.level.monsters = [mon];
        const expected = sourceRolls(31, { extraRoll, mr: name !== 'Asmodeus', level: mon.m_lev });
        await castSpellDirectionalEffect({ name: 'drain life' }, 'l', makeDeps());
        assert.deepEqual(getRngLog(), expected.trace);
    });
}

test('level-zero target dies even if both HP damage stages leave HP remaining', async () => {
    installState();
    const mon = makeMonster('lichen', { m_lev: 0 });
    game.level.monsters = [mon];
    const expected = sourceRolls(31, { extraRoll: 'level zero', level: 0 });
    const deps = makeDeps();
    await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
    assert.deepEqual(deps.events.find(event => event[0] === 'kill'),
        ['kill', 200 - 2 * expected.damage, 200 - expected.damage, 0]);
    assert.deepEqual(getRngLog(), expected.trace);
});

test('lethal resist damage invokes death handling before maximum HP or level changes', async () => {
    installState();
    const mon = makeMonster('wolf', { mhp: 1 });
    game.level.monsters = [mon];
    const deps = makeDeps();
    await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
    assert.equal(deps.events.filter(event => event[0] === 'kill').length, 1);
    assert.equal(mon.mhpmax, 200);
    assert.equal(mon.m_lev, 5);
    assert.equal(deps.events.some(event => event[0] === 'wake'), false);
});

test('a target saved during resist damage remains eligible for the second drain stage', async () => {
    installState();
    const mon = makeMonster('wolf', { mhp: 1 });
    game.level.monsters = [mon];
    const expected = sourceRolls(31);
    const deps = makeDeps({
        killMonsterFromHeroProjectileHit: async target => { target.mhp = 200; target.dead = false; },
    });
    await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
    assert.equal(mon.mhp, 200 - expected.damage);
    assert.equal(mon.mhpmax, 200 - expected.damage);
    assert.equal(mon.m_lev, 4);
});

test('Knight quest artifact doubles drain before the Intelligence spell bonus', async () => {
    installState();
    game.u.acurr.a[1] = 18;
    const mon = makeMonster();
    game.level.monsters = [mon];
    const expected = sourceRolls(31);
    await castSpellDirectionalEffect({ name: 'drain life' }, 'l', makeDeps({
        heroIsKnightWithQuestArtifact: () => true,
    }));
    assert.equal(mon.mhpmax, 200 - (2 * expected.damage + 1));
});

test('lateral drain visits floor piles from top to bottom and shortens range for an unaffected pile', async () => {
    installState();
    const bottom = { kind: 'food ration', ox: 6, oy: 5 };
    const top = { kind: 'long sword', cls: 'weapon', spe: 2, ox: 6, oy: 5 };
    const expected = sourceRolls(31);
    const beyond = { kind: 'long sword', ox: 5 + expected.range, oy: 5 };
    game.level.objects = [bottom, top, beyond];
    const deps = makeDeps();
    await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
    assert.deepEqual(deps.events.filter(event => event[0] === 'item').map(event => event[1]), [top, bottom]);
});

test('drain skips the punishment ball, chain, and bypass-marked floor objects', async () => {
    installState();
    const ball = { kind: 'heavy iron ball', ox: 6, oy: 5 };
    const chain = { kind: 'iron chain', ox: 6, oy: 5 };
    const bypassed = { kind: 'long sword', ox: 6, oy: 5, bypass: 1 };
    const target = { kind: 'long sword', ox: 6, oy: 5 };
    game.u.uball = ball;
    game.u.uchain = chain;
    game.context.bypasses = true;
    game.level.objects = [target, bypassed, chain, ball];
    const deps = makeDeps();
    await castSpellDirectionalEffect({ name: 'drain life' }, 'l', deps);
    assert.deepEqual(deps.events.filter(event => event[0] === 'item').map(event => event[1]), [target]);
    assert.equal(bypassed.bypass, 1);
});

test('Z cast dispatch drains real floor-item charges and a target, consuming spell energy', async () => {
    installState(41);
    game.u.ulevel = 20;
    game.u.acurr.a[1] = 18;
    game.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    game._known_spells = [{ name: 'drain life', level: 2, skill: 'attack' }];
    const mon = makeMonster('wolf', { data: { name: 'wolf', mlevel: 4, mr: 0, mmove: 12 } });
    const item = { kind: 'long sword', cls: 'weapon', glyph: ')', spe: 3, ox: 6, oy: 5 };
    game.level.monsters = [mon];
    game.level.objects = [item];
    await rhack('Z');
    assert.equal(game._command_mode, 'castSpell');
    await rhack('a');
    assert.equal(game._command_mode, 'spellDirection');
    await rhack('l');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.u.uen, 90);
    assert.equal(mon.m_lev, 4);
    assert.equal(item.spe, 2);
    assert.doesNotMatch(game._pending_message || '', /You cast drain life/);
});

test('command drain damage preserves a monster saved by its amulet and continues draining', async () => {
    installState(41);
    const amulet = { kind: 'amulet of life saving', amuletIndex: 1, worn: true };
    const mon = makeMonster('wolf', {
        mhp: 1, minvent: [amulet], data: { name: 'wolf', mlevel: 5, mr: 0, mmove: 12 },
    });
    game.level.monsters = [mon];
    game._casting_spell = { name: 'drain life', level: 2, skill: 'attack' };
    game._command_mode = 'spellDirection';
    await rhack('l');
    assert.ok(game.level.monsters.includes(mon));
    assert.equal(mon.dead, false);
    assert.equal(mon.minvent.length, 0);
    assert.equal(mon.m_lev, 4);
    assert.ok(mon.mhp > 0 && mon.mhp < 200);
    assert.equal(mon.mhp, mon.mhpmax);
});
