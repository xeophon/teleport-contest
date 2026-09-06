import assert from 'node:assert/strict';
import test from 'node:test';
import * as command from '../js/cmd.js';
import { MONS, AT_CLAW, AD_PHYS } from '../js/permonst.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { COULD_SEE, IN_SIGHT, ROOM, STONE, W_ARM, W_AMUL, W_WEP } from '../js/const.js';
import { vision_reset } from '../js/vision.js';
import { mkobj } from '../js/mklev.js';

function setup() {
    resetGame();
    initRng(41);
    game.flags = {};
    game.context = {};
    game.moves = 1;
    game.inventory = [];
    game.u = { ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 },
        uhp: 100, uhpmax: 100, ulevel: 20, uexp: 0, urexp: 0, uhunger: 900,
        acurr: { a: [10, 10, 10, 10, 10, 10] }, ualign: { type: 0, record: 0 } };
    const cells = Array.from({ length: 80 }, (_, x) => Array.from({ length: 21 }, (_, y) => ({
        typ: x > 0 && x < 75 && y === 5 ? ROOM : STONE, lit: true, roomno: 0,
    })));
    game.level = { flags: {}, monsters: [], objects: [], traps: [], rooms: [], engravings: [],
        at: (x, y) => cells[x]?.[y] };
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
}

function monster(name, changes = {}) {
    const data = MONS.find(row => row.name === name);
    assert.ok(data, `canonical species ${name}`);
    return { data, m_lev: data.lvl, mhp: 1, mhpmax: 100, mx: 6, my: 5,
        mcanmove: true, mcansee: true, minvent: [], ...changes };
}

// C exper.c:85-140, calculated from the checked-in monster table. These
// fixtures use numeric C attack/damage codes and include empty AT_NONE slots.
const speciesXp = [
    ['newt', 1],
    ['wolf', 26],
    ['little dog', 8], // 1+2², speed 18 adds 3
    ['floating eye', 7], // passive paralysis adds its level
    ['goblin', 6], // one weapon attack adds 5
    ['wraith', 90], // 1+6² + touch3 + drain50
    ['clay golem', 183], // 1+11² + heavy attack11 + level>8 bonus50
    ['minotaur', 414], // 226 + speed3 + two heavy attacks30 + nasty105 + 50
    ['arch-lich', 815], // 626+AC26+touch3+magic10+cold50+spell25+heavy25+50
    ['Angel', 415], // 197+AC22+two weapons10+magic10+magic damage28+nasty98+50
    ['mail daemon', 1], // C MAIL_STRUCTURES overrides all computed bonuses
];
for (const [name, expected] of speciesXp) {
    test(`C experience arithmetic for canonical ${name}`, () => {
        setup();
        assert.equal(command.monsterExperienceValue(monster(name), 1), expected);
    });
}

for (const [name, expected] of [['giant eel', 50], ['electric eel', 101]]) {
    for (const amphibious of [false, true]) {
        test(`${name} drowning attack XP with amphibious=${amphibious}`, () => {
            setup();
            game.u.amphibious = amphibious;
            assert.equal(command.monsterExperienceValue(monster(name), 1), expected + (amphibious ? 0 : 1000));
        });
    }
}

test('level-nine bonus uses current monster level rather than species level', () => {
    setup();
    assert.equal(command.monsterExperienceValue(monster('wolf', { m_lev: 8 })), 65);
    assert.equal(command.monsterExperienceValue(monster('wolf', { m_lev: 9 })), 132);
});

// exper.c:145-164 discounts ceil-half each step. Odd 151 makes downward
// rounding visible, and both sides of every source threshold are covered.
const repeatedKills = [[1, 151], [20, 151], [21, 76], [40, 76], [41, 38],
    [80, 38], [81, 19], [120, 19], [121, 10], [180, 10], [181, 5],
    [240, 5], [241, 3], [255, 3]];
for (const flag of ['mrevived', 'mcloned']) {
    for (const [count, expected] of repeatedKills) {
        test(`${flag} uses C repeated-kill discount at kill ${count}`, () => {
            setup();
            assert.equal(command.monsterExperienceValue(monster('wolf', { m_lev: 10, [flag]: true }), count), expected);
        });
    }
}

test('ordinary monsters never receive the repeated-kill discount', () => {
    setup();
    assert.equal(command.monsterExperienceValue(monster('wolf', { m_lev: 10 }), 255), 151);
});

test('experience uses worn armor enchantment and greatest erosion in find_mac', () => {
    setup();
    const mon = monster('goblin');
    const plate = { kind: 'plate mail', cls: 'armor', owornmask: W_ARM, spe: 2, oeroded: 1, oeroded2: 0 };
    mon.minvent.push(plate);
    assert.equal(command.monsterExperienceValue(mon), 11); // AC 10-(7+2-1)=2 adds 5
    plate.oeroded2 = 3;
    assert.equal(command.monsterExperienceValue(mon), 6); // AC4 adds nothing
    plate.owornmask = 0;
    plate.oeroded2 = 0;
    assert.equal(command.monsterExperienceValue(mon), 6); // carried armor adds nothing
});

test('recordVanquished includes this kill in score-discount count and counts it once', () => {
    setup();
    game._vanquished_counts = { wolf: 20 };
    const mon = monster('wolf', { m_lev: 10, mrevived: true });
    command.recordVanquished(mon);
    assert.equal(game._vanquished_counts.wolf, 21);
    assert.equal(game.u.urexp, 4 * 76);
    command.recordVanquished(mon);
    assert.equal(game._vanquished_counts.wolf, 21);
    assert.equal(game.u.urexp, 4 * 76);
});

test('recordVanquished can count a kill without awarding score', () => {
    setup();
    const mon = monster('wolf');
    command.recordVanquished(mon, false);
    assert.equal(game._vanquished_counts.wolf, 1);
    assert.equal(game.u.urexp, 0);
});

test('a force-bolt kill uses the same repeated-kill XP for live experience and score', async () => {
    setup();
    game._vanquished_counts = { wolf: 20 };
    const mon = monster('wolf', { m_lev: 10, mrevived: true, mr: 0, mac: 20 });
    game.level.monsters.push(mon);
    game._casting_spell = { name: 'force bolt', level: 1, skill: 'attack' };
    game._command_mode = 'spellDirection';
    await command.rhack('l');
    assert.equal(mon.dead, true);
    assert.equal(game._vanquished_counts.wolf, 21);
    assert.equal(game.u.uexp, 76);
    assert.equal(game.u.urexp, 4 * 76);
});

test('a force-bolt kill computes natural-AC XP after dropping armor as C xkilled does', async () => {
    setup();
    const plate = { kind: 'plate mail', cls: 'armor', owornmask: W_ARM, worn: true,
        spe: 2, oeroded: 1, quan: 1 };
    const mon = monster('goblin', { mr: 0, mac: 20, minvent: [plate] });
    game.level.monsters.push(mon);
    game._casting_spell = { name: 'force bolt', level: 1, skill: 'attack' };
    game._command_mode = 'spellDirection';
    await command.rhack('l');
    assert.equal(mon.dead, true);
    assert.ok(game.level.objects.includes(plate));
    // mon.c:xkilled -> mondead/m_detach -> relobj precedes experience.
    assert.equal(game.u.uexp, 6);
    assert.equal(game.u.urexp, 24);
});

test('breathlessness alone does not remove the eel drowning-attack bonus', () => {
    setup();
    game.u.breathless = true;
    game.u._polyself_form = MONS.find(row => row.name === 'xorn');
    assert.equal(command.monsterExperienceValue(monster('giant eel')), 1050);
});

// C exper.c:98-99 uses strict comparisons at NORMAL_SPEED and 1.5 times it.
for (const [speed, bonus] of [[12, 0], [13, 3], [18, 3], [19, 5], [24, 5]]) {
    test(`speed ${speed} awards exactly ${bonus} extra experience`, () => {
        setup();
        const mon = { data: { name: 'speed boundary fixture', ac: 10, mmove: speed,
            attacks: [], m1: 0, m2: 0 }, m_lev: 4, minvent: [] };
        assert.equal(command.monsterExperienceValue(mon), 17 + bonus);
    });
}

for (const [dice, sides, bonus] of [[1, 23, 0], [1, 24, 4], [4, 6, 4]]) {
    test(`physical damage ${dice}d${sides} applies the C heavy-damage threshold`, () => {
        setup();
        const mon = { data: { name: 'damage boundary fixture', ac: 10, mmove: 12,
            attacks: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: dice, damd: sides }],
            m1: 0, m2: 0 }, m_lev: 4, minvent: [] };
        assert.equal(command.monsterExperienceValue(mon), 17 + bonus);
    });
}

for (const [slot, expected] of [[0, 1050], [W_WEP, 1050], [W_AMUL, 50]]) {
    test(`magical-breathing amulet only prevents drowning XP in its worn slot ${slot}`, () => {
        setup();
        game.inventory = [{ kind: 'amulet of magical breathing', cls: 'amulet', owornmask: slot }];
        assert.equal(command.monsterExperienceValue(monster('giant eel')), expected);
    });
}

test('an enchanted wielded weapon does not count as worn armor for experience', () => {
    setup();
    const mon = monster('goblin', {
        minvent: [{ kind: 'dagger', cls: 'weapon', owornmask: W_WEP, spe: 9 }],
    });
    // Runtime monWieldItem sets W_WEP without adding it to misc_worn_check.
    assert.equal(command.monsterExperienceValue(mon), 6);
});

test('putting on a generated magical-breathing amulet removes the eel drowning XP bonus', async () => {
    setup();
    let amulet;
    for (let count = 0; count < 1000; count++) {
        const candidate = mkobj(15, false); // C objclass.h: AMULET_CLASS
        if (candidate.amuletIndex === 8) { amulet = candidate; break; }
    }
    assert.ok(amulet, 'generated magical-breathing amulet');
    assert.equal(amulet.kind, undefined);
    assert.equal(amulet.actualKind, undefined);
    amulet.letter = 'a';
    game.inventory = [amulet];
    assert.equal(command.monsterExperienceValue(monster('giant eel')), 1050);

    await command.rhack('P');
    assert.equal(game._command_mode, 'putOnObject');
    await command.rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(amulet.worn, true);
    assert.match(amulet.line, /\(being worn\)/);
    assert.equal(command.monsterExperienceValue(monster('giant eel')), 50);
});
