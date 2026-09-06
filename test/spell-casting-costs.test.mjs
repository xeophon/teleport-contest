import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, A_INT, A_STR, A_CON, A_CHA, A_WIS } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { rhack, currentHeroAttribute, loseExperienceLevel } from '../js/cmd.js';
import { vision_reset } from '../js/vision.js';

function setup(role = 'Wizard', intelligence = 14, changes = {}) {
    resetGame(); initRng(41);
    game.moves = 10; game.context = {}; game.flags = {}; game._startup_role = role;
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 30, uhpmax: 30,
        uen: 100, uenmax: 100, uenpeak: 100, uhunger: 900, ulevel: 10,
        acurr: { a: [10, intelligence, 10, 10, 10, 10] }, ...changes };
    game.level = new GameMap(); game.inventory = [];
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game._spell_menu_spells = [{ letter: 'a', name: 'force bolt', level: 3, successChance: 0 }];
    game._known_spells = [{ name: 'force bolt', knowledge: 20000 }];
    game._command_mode = 'castSpell'; vision_reset(); enableRngLog({ reset: true });
}

for (const role of ['Wizard', 'Knight']) for (const intelligence of [3, 14, 15, 16, 17, 18, 25])
    test(`${role} Int ${intelligence} pays C nutrition even on casting failure`, async () => {
        setup(role, intelligence);
        await rhack('a');
        const cost = role !== 'Wizard' || intelligence < 15 ? 30 : intelligence === 15 ? 15 : intelligence === 16 ? 7 : 0;
        assert.equal(game.u.uhunger, 900 - cost);
        assert.equal(game.u.uen, 93);
        assert.equal(game.context.move, 1);
        assert.deepEqual(getRngLog().map(row => row.split('=')[0]), ['rnd(100)']);
    });

test('confusion pays casting nutrition but skips the success draw', async () => {
    setup('Knight', 14, { confused: true, _statusSuffix: ' Conf' });
    await rhack('a');
    assert.equal(game.u.uhunger, 870);
    assert.equal(game.u.uen, 93);
    assert.deepEqual(getRngLog(), []);
});

test('casting stops nutrition loss at three', async () => {
    setup('Knight', 14, { uhunger: 11 });
    await rhack('a');
    assert.equal(game.u.uhunger, 3);
});

test('detect food neither requires nor drains nutrition', async () => {
    setup('Knight', 14, { uhunger: -100 });
    game._spell_menu_spells[0].name = 'detect food';
    await rhack('a');
    assert.equal(game.u.uhunger, -100);
    assert.equal(game.u.uen, 93);
});

for (const weight of [1374, 1375]) test(`casting capacity boundary at weight ${weight}`, async () => {
    setup('Knight', 14, { uhave: { amulet: true } });
    game.inventory.push({ kind: 'test load', owt: weight, quan: 1 });
    await rhack('a');
    if (weight === 1375) {
        assert.equal(game.u.uen, 100);
        assert.equal(game.u.uhunger, 900);
        assert.match(game._pending_message, /concentration falters while carrying so much stuff/);
        assert.deepEqual(getRngLog(), []);
    } else assert.equal(game.u.uhunger, 870);
    assert.equal(game.context.move, 1);
});

for (const [energy, max, peak, suffix] of [[4, 10, 20, ''], [4, 4, 10, ' yet'], [4, 4, 15, ' anymore']])
    test(`insufficient energy uses C peak comparison (${energy}/${max}, peak ${peak})`, async () => {
        setup('Knight', 14, { uen: energy, uenmax: max, uenpeak: peak });
        await rhack('a');
        assert.equal(game._pending_message, `You don't have enough energy to cast that spell${suffix}.`);
        assert.equal(game.u.uhunger, 900);
        assert.equal(game.context.move, 0);
        assert.deepEqual(getRngLog(), []);
    });

for (const variant of ['bonus', 'temporary', 'dunce']) test(`casting nutrition uses effective intelligence (${variant})`, async () => {
    setup('Wizard', 17);
    if (variant === 'dunce') game.inventory.push({ kind: 'dunce cap', cls: 'armor', worn: true });
    else game.u[variant === 'bonus' ? 'abon' : 'atemp'] = { a: [0, -1, 0, 0, 0, 0] };
    await rhack('a');
    assert.equal(game.u.uhunger, variant === 'dunce' ? 870 : 893);
});

test('the strength gate uses temporary attribute loss before checking capacity', async () => {
    setup(); game.u.acurr.a[A_STR] = 4; game.u.atemp = { a: [-1, 0, 0, 0, 0, 0] };
    game.inventory.push({ kind: 'test load', quan: 1, owt: 3000 });
    await rhack('a');
    assert.match(game._pending_message, /lack the strength/);
    assert.equal(game.context.move, 0);
    assert.equal(game.u.uhunger, 900);
    assert.deepEqual(getRngLog(), []);
});

for (const [role, before, after, message] of [['Knight', 175, 145, 'beginning to feel hungry'],
    ['Knight', 160, 130, 'feel hungry'], ['Knight', 80, 50, 'beginning to feel weak'],
    ['Knight', 70, 40, 'feel weak'], ['Wizard', 80, 50, 'Wizard needs food, badly!'],
    ['Valkyrie', 80, 50, 'Valkyrie needs food, badly!']])
    test(`${role} casting hunger transition ${before} to ${after} updates state before failure`, async () => {
        setup(role, 14, { uhunger: before });
        await rhack('a');
        assert.equal(game.u.uhunger, after);
        assert.equal(game.u.uhs, after > 50 ? 2 : 3);
        assert.match(game._pending_message, new RegExp(`${message.replace('!', '\\!')}.*fail to cast`));
        assert.match(game.u._statusSuffix, after > 50 ? /Hungry/ : /Weak/);
        assert.equal(game.u.atemp?.a?.[A_STR] || 0, after > 50 ? 0 : -1);
    });

test('rock-throwing forms exclude boulders from the casting load', async () => {
    setup('Wizard', 14, { _polyself_form: { name: 'stone giant', strong: true, mlet: 'H' } });
    game.inventory = [{ kind: 'boulder', otyp: 470, owt: 6000, quan: 2 }];
    await rhack('a');
    assert.equal(game.u.uhunger, 870);
    assert.match(game._pending_message, /fail to cast/);
});

for (const [attribute, raw, expected] of [[A_STR, 118, 118], [A_STR, 126, 125],
    [A_STR, 2, 3], [A_INT, 30, 25], [A_WIS, 1, 3]]) test(`effective attribute ${attribute} clamps ${raw} to ${expected}`, () => {
    setup(); game.u.acurr.a[attribute] = raw;
    assert.equal(currentHeroAttribute(attribute), expected);
});

for (const [kind, attribute, expected] of [['gauntlets of power', A_STR, 125], ['dunce cap', A_INT, 6],
    ['dunce cap', A_WIS, 6]]) test(`${kind} overrides attribute ${attribute} only while worn`, () => {
    setup(); game.inventory = [{ cls: 'armor', kind, worn: true }];
    assert.equal(currentHeroAttribute(attribute), expected);
    game.inventory[0].worn = false;
    assert.equal(currentHeroAttribute(attribute), attribute === A_INT ? 14 : 10);
});

test('nymph form raises charisma and wielded Ogresmasher raises constitution', () => {
    setup(); game.u._polyself_form = { name: 'water nymph' };
    assert.equal(currentHeroAttribute(A_CHA), 18);
    game.inventory = [{ artifact: 'Ogresmasher', wielded: true }];
    assert.equal(currentHeroAttribute(A_CON), 25);
    game.inventory[0].wielded = false;
    assert.equal(currentHeroAttribute(A_CON), 10);
});

test('experience gain records peak energy and level loss preserves that peak', async () => {
    setup('Wizard', 14, { uen: 5, uenmax: 5, uenpeak: 5 });
    game.urole = { name: { m: 'Wizard' } };
    game.flags.debug = true; game._command_mode = null;
    await rhack('#'); for (const ch of 'levelchange') await rhack(ch.charCodeAt(0)); await rhack('\r');
    await rhack(49); await rhack(49); await rhack('\r');
    assert.equal(game.u.ulevel, 11);
    assert.ok(game.u.uenmax > 5);
    assert.equal(game.u.uenpeak, game.u.uenmax);
    const peak = game.u.uenpeak;
    loseExperienceLevel();
    assert.equal(game.u.uenpeak, peak);
});
