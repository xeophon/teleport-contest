import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, A_STR, STRAT_WAITFORU, STRAT_APPEARMSG } from '../js/const.js';
import { initRng, rn2, rnd, rn1, enableRngLog, getRngLog } from '../js/rng.js';
import { rhack, processSpellbookStudyOccupation } from '../js/cmd.js';
import { resetInputState } from '../js/input.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { monsterByRndName } from '../js/mklev.js';
import { hasAggravatables } from '../js/wizard.js';

function setup(effect, state = {}) {
    resetGame(); resetInputState();
    let seed = 1;
    for (;; seed++) { initRng(seed); if (rn2(7) === effect) break; }
    initRng(seed); enableRngLog({ reset: true });
    game.moves = 10; game.context = {}; game.flags = { verbose: true };
    game._startup_role = 'Knight';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100,
        ulevel: 10, umovement: 12, uhunger: 900, acurr: { a: [18, 18, 18, 18, 18, 18] }, ...state };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const book = { letter: 'a', cls: 'spellbook', kind: 'spellbook of finger of death',
        spellName: 'finger of death', cursed: true, known: true, quan: 1 };
    game.inventory = [book]; game._command_mode = 'readObject';
    vision_reset();
    return { book, seed };
}

for (const half of [false, true]) test(`exploding spellbook ${half ? 'halves' : 'retains'} physical damage`, async () => {
    const { seed } = setup(6, { halfPhysicalDamage: half });
    rn2(7); const amount = 2 * rnd(10) + 5;
    initRng(seed); await rhack('a');
    assert.equal(game.u.uhp, 100 - (half ? Math.ceil(amount / 2) : amount));
    assert.equal(game.inventory.some(item => item.cls === 'spellbook'), false);
});

for (const resistant of [false, true]) test(`contact-poison spellbook ${resistant ? 'resisted' : 'unresisted'} loss is silent and does not exercise strength`, async () => {
    const { seed } = setup(5, { poisonResistance: resistant });
    rn2(7); const loss = rn1(resistant ? 2 : 4, resistant ? 1 : 3);
    const damage = rnd(resistant ? 6 : 10);
    initRng(seed); enableRngLog({ reset: true }); await rhack('a');
    assert.equal(game.u.acurr.a[A_STR], 18 - loss);
    assert.equal(game.u.uhp, 100 - damage);
    assert.doesNotMatch(game._pending_message, /feel weaker/);
    assert.ok(!getRngLog().some(row => row.startsWith('rn2(19)')));
});

for (const strength of [3, 4, 5]) test(`contact poison at strength ${strength} converts excess loss into C HP and maximum-HP damage`, async () => {
    const { seed } = setup(5); game.u.acurr.a[A_STR] = strength;
    rn2(7); const loss = rn1(4, 3); const direct = rnd(10);
    let excess = 0; for (let n = strength - loss; n < 3; n++) excess += rn1(4, 3);
    initRng(seed); await rhack('a');
    assert.equal(game.u.acurr.a[A_STR], Math.max(3, strength - loss));
    assert.equal(game.u.uhp, 100 - direct - excess);
    assert.equal(game.u.uhpmax, 100 - excess);
});

test('fixed abilities prevent contact-poison attribute loss, not its HP damage', async () => {
    const { seed } = setup(5, { fixedAbilities: true });
    rn2(7); rn1(4, 3); const damage = rnd(10);
    initRng(seed); await rhack('a');
    assert.equal(game.u.acurr.a[A_STR], 18);
    assert.equal(game.u.uhp, 100 - damage);
});

for (const effect of [5, 6]) test(`cursed spellbook effect ${effect} damages current polymorph HP`, async () => {
    setup(effect, { _polyself_form: { name: 'human' }, mh: 80, mhmax: 80 });
    await rhack('a');
    assert.equal(game.u.uhp, 100);
    assert.ok(game.u.mh < 80);
});

for (const effect of [5, 6]) for (const saving of [false, true])
test(`lethal book effect ${effect} ${saving ? 'uses life saving' : 'enters death'} before reading cleanup`, async () => {
    const { book } = setup(effect, { uhp: 1 });
    if (saving) game.inventory.push({ letter: 'b', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
    await rhack('a');
    assert.equal(game._command_mode, saving ? 'lifeSavingMore' : 'deathDieMore');
    assert.ok(game._spellbook_backfire, 'the caller remains suspended inside its C damage effect');
    assert.ok(game.inventory.includes(book), 'book cleanup waits for damage/death to return');
});

for (const state of ['ordinary', 'already blind', 'Eyes of the Overworld', 'blindfold'])
test(`book blindness preserves C sensory sources: ${state}`, async () => {
    setup(2, { blind: state === 'already blind' || state === 'blindfold' });
    if (state === 'already blind') game.u._blindTimeout = 1;
    if (state === 'Eyes of the Overworld') game.inventory.push({ kind: 'lenses', artifact: 'The Eyes of the Overworld', worn: true });
    if (state === 'blindfold') game.inventory.push({ kind: 'blindfold', worn: true });
    const book = game.inventory[0];
    game._discoveries = [{ section: 'Spellbooks', name: book.kind }];
    game._spellbook_study_occupation = { item: book, name: book.spellName, level: 7, turns: 0 };
    for (let seed = 1; ; seed++) {
        initRng(seed); rn2(19);
        if (rn2(7) === 2) { initRng(seed); break; }
    }
    await processSpellbookStudyOccupation();
    assert.ok(game.u._blindTimeout >= 250);
    assert.equal(game.u.blind, state !== 'Eyes of the Overworld');
    if (state === 'Eyes of the Overworld') assert.match(game._pending_message, /vision seems to dim/);
    if (state === 'blindfold') assert.match(game._pending_message, /eyes momentarily twitch/);
});

for (const greased of [false, true]) test(`contact poison on ${greased ? 'greased' : 'bare'} metal gloves follows C erosion`, async () => {
    setup(5);
    const gloves = { letter: 'b', cls: 'armor', kind: 'gauntlets of power', worn: true, greased };
    game.inventory.push(gloves); await rhack('a');
    assert.equal(gloves.oeroded2 || 0, greased ? 0 : 1);
    assert.equal(gloves.bknown || false, false, 'erosion does not reveal blessing');
    assert.equal(game.u.uhp, 100);
    if (greased) assert.match(game._pending_message, /protected by the layer of grease/);
});

test('book gold theft clears the quiver while preserving gold inside a bag', async () => {
    setup(3); const gold = { letter: '$', cls: 'coin', quan: 40, quivered: true };
    const bag = { letter: 'b', cls: 'tool', kind: 'sack', cobj: [{ cls: 'coin', quan: 17 }] };
    game.inventory.push(gold, bag); game.u.uquiver = gold; game._goldCount = 40;
    await rhack('a');
    assert.equal(game.u.uquiver, null);
    assert.equal(game._goldCount, 0);
    assert.equal(bag.cobj[0].quan, 17);
});

for (const effect of [5, 6]) for (const rescue of ['amulet', 'wizard'])
test(`saved book effect ${effect} resumes after ${rescue} without rerolling the backfire`, async () => {
    setup(effect, { uhp: 1 });
    if (rescue === 'wizard') game.flags.debug = true;
    else game.inventory.push({ letter: 'b', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
    await rhack('a');
    const saved = encodeSaveState(); resetGame(); restoreSaveState(saved); initRng(1);
    const book = game._spellbook_backfire.item;
    assert.ok(game.inventory.includes(book));
    enableRngLog({ reset: true });
    await rhack(' ');
    if (rescue === 'wizard') { assert.equal(game._command_mode, 'wizardDieConfirm'); await rhack('n'); }
    assert.equal(game._spellbook_backfire, null);
    assert.ok(!getRngLog().some(row => row.startsWith('rn2(7)')));
    assert.equal(game.u.uhp, game.u.uhpmax);
    if (effect === 6) assert.ok(!game.inventory.includes(book));
    assert.ok(game._helpless_time > 0);
});

test('minimum-strength poison resumes both damage calls after wizard refusal', async () => {
    setup(5, { uhp: 1 }); game.flags.debug = true; game.u.acurr.a[A_STR] = 3;
    await rhack('a');
    const { damage, extraDamage } = game._spellbook_backfire;
    assert.equal(game._spellbook_backfire.phase, 'afterStrengthDamage');
    await rhack(' '); await rhack('n');
    assert.equal(game.u.uhpmax, 100 - extraDamage);
    assert.equal(game.u.uhp, 100 - extraDamage - damage);
    assert.equal(game._spellbook_backfire, null);
});

test('poison strength loss resets prior strength exercise only when the attribute changes', async () => {
    setup(5); game.u._aexe = [20, 0, 0, 0, 0, 0];
    await rhack('a');
    assert.equal(game.u._aexe[A_STR], 0);
});

test('minimum-strength poison never raises an already subminimum maximum HP', async () => {
    setup(5, { uhp: 100, uhpmax: 5, ulevel: 10 }); game.u.acurr.a[A_STR] = 3;
    await rhack('a');
    assert.equal(game.u.uhpmax, 5);
});

test('poison which destroys a monster body preserves the restored human strength and maximum HP', async () => {
    setup(5, { _polyself_form: monsterByRndName('wood golem'), mh: 1, mhmax: 30,
        _polyself_base: { uhp: 90, uhpmax: 100, attributes: [18, 18, 18, 18, 18, 18] } });
    game.u.acurr.a[A_STR] = 3;
    await rhack('a');
    assert.equal(game.u._polyself_form, null);
    assert.equal(game.u.uhpmax, 100);
    assert.ok(game.u.uhp < 90);
});

test('book aggravation respects the Wizard tower boundary, dead monsters and waiting strategies', async () => {
    setup(1);
    game.level.flags.wizard_tower_level = true;
    game.level.wizardTowerBounds = { lx: 5, hx: 15, ly: 5, hy: 15 };
    const inside = { mx: 9, my: 9, mhp: 10, msleeping: 1, mcanmove: 1,
        mstrategy: STRAT_WAITFORU | STRAT_APPEARMSG };
    const outside = { ...inside, mx: 20 };
    const dead = { ...inside, mhp: 0 };
    game.level.monsters = [inside, outside, dead];
    assert.equal(hasAggravatables(outside), false);
    await rhack('a');
    assert.equal(inside.msleeping, 0); assert.equal(inside.mstrategy, 0);
    assert.equal(outside.msleeping, 1); assert.equal(dead.msleeping, 1);
    assert.equal(hasAggravatables(inside), false);
});
