import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, currentHeroAttribute, finishArmorBonusChange } from '../js/cmd.js';
import { moveloop_core, processMonsterTurns } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { resetInputState } from '../js/input.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { GameDisplay } from '../js/game_display.js';
import { cancelArmorDressing, changeArmorBonuses } from '../js/do_wear.js';
import { ROOM, A_INT, A_WIS, A_DEX, A_CHA, FUMBLING, FROMOUTSIDE, W_ARMF, W_ARMG, TIMEOUT } from '../js/const.js';

function setup(kind, spe = 0, role = 'Wizard') {
    resetGame(); resetInputState(); initRng(73);
    Object.assign(game, { moves: 100, context: {}, flags: { pickup: false, debug: true },
        _startup_role: role, _startup_race: 'human', urole: { name: { m: role } },
        level: new GameMap(), inventory: [],
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10, uhp: 100, uhpmax: 100,
            uen: 50, uenmax: 50, uhunger: 900, uac: 10, umovement: 12, uprops: [],
            acurr: { a: [12,24,24,24,12,24] }, abon: { a: [0,0,0,0,0,0] } } });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x,y), { typ: ROOM, lit: true });
    const item = { id: 1, letter: 'a', cls: 'armor', kind, actualKind: kind, spe, quan: 1, known: false };
    game.inventory.push(item); vision_reset(); vision_recalc(); enableRngLog({ reset: true });
    return item;
}

for (const kind of ['helm of brilliance', 'gauntlets of dexterity', 'gauntlets of power'])
    test(`${kind} discovers its type once and exercises Wisdom before equipment bonuses`, () => {
        const item = setup(kind, 10); game.u.acurr.a[A_WIS] = 10;
        game.coreCtx.r = [15n]; game.coreCtx.n = 1;
        finishArmorBonusChange(item, true);
        assert.equal(game.u._aexe[A_WIS], 1, 'makeknown sees Wisdom before a brilliance bonus');
        assert.equal(getRngLog().length, 1);
        finishArmorBonusChange(item, false); finishArmorBonusChange(item, true);
        assert.equal(getRngLog().length, 1, 'known types do not exercise again on removal or rewear');
    });

async function inputBoundary() {
    try { await moveloop_core(); }
    catch (error) { if (!error.message.includes('Input queue empty')) throw error; }
}

async function finishDressing() {
    game._pending_message = ''; game._message_more = 0; game._pending_time_passed = 1;
    await inputBoundary();
    for (let n = 0; n < 12 && game._message_more; n++) await rhack(' ');
}

for (const command of ['W', 'P']) for (const [kind, attrs] of [
    ['helm of brilliance', [A_INT, A_WIS]], ['gauntlets of dexterity', [A_DEX]],
]) for (const spe of [-30, 3]) test(`${command}: ${kind} ${spe} pairs ABON without changing saturated base attributes`, async () => {
    setup(kind, spe); const base = [...game.u.acurr.a];
    await rhack(command); await rhack('a');
    assert.deepEqual(game.u.acurr.a, base);
    assert.deepEqual(game.u.abon.a, [0,0,0,0,0,0], 'setworn precedes the delayed callback');
    await finishDressing();
    for (const attr of attrs) {
        assert.equal(game.u.abon.a[attr], spe);
        assert.equal(currentHeroAttribute(attr), Math.max(3, Math.min(25, base[attr] + spe)));
    }
    assert.deepEqual(game.u.acurr.a, base);
    const core = game.coreCtx, display = game.displayCtx;
    restoreSaveState(encodeSaveState());
    game.coreCtx = core; game.displayCtx = display; game.rng = { core, display };
    await rhack('T'); await finishDressing();
    assert.deepEqual(game.u.abon.a, [0,0,0,0,0,0]);
    assert.deepEqual(game.u.acurr.a, base);
});

for (const role of ['Wizard', 'Tourist']) for (const spe of [-7, 9]) test(`${role} cornuthaum ${spe} uses role Charisma bonus independent of enchantment`, async () => {
    const item = setup('cornuthaum', spe, role);
    await rhack('W'); await rhack('a');
    assert.equal(game.u.abon.a[A_CHA], role === 'Wizard' ? 1 : -1);
    assert.equal(game.u.acurr.a[A_CHA], 24);
    assert.equal(item.known, true);
    await rhack('T');
    assert.equal(game.u.abon.a[A_CHA], 0);
    assert.equal(game.u.acurr.a[A_CHA], 24);
});

for (const saved of [false, true]) test(`brilliance callback waits for finishing-message More (saved=${saved})`, async () => {
    setup('helm of brilliance', 3);
    await rhack('W'); await rhack('a');
    game._armor_wear_occupation.turns = 1; game.u.umovement = 0;
    game._pending_message = 'An earlier message occupies the complete first line before your dressing ends.';
    await processMonsterTurns();
    assert.equal(game._message_more, 1); assert.equal(game.u.abon.a[A_INT], 0);
    if (saved) {
        const { coreCtx, displayCtx, rng } = game;
        restoreSaveState(encodeSaveState()); Object.assign(game, { coreCtx, displayCtx, rng });
    }
    await rhack(' ');
    assert.equal(game.u.abon.a[A_INT], 3); assert.equal(game.u.abon.a[A_WIS], 3);
    await rhack(' '); assert.equal(game.u.abon.a[A_INT], 3);
});

for (const kind of ['helm of brilliance', 'gauntlets of dexterity']) test(`polymorph cancels unfinished ${kind} without subtracting unapplied bonuses`, async () => {
    const item = setup(kind, 3); const base = [...game.u.acurr.a];
    await rhack('W'); await rhack('a');
    await rhack('#'); for (const key of 'polyself') await rhack(key); await rhack('\n');
    for (const key of 'wererat') await rhack(key.charCodeAt(0)); await rhack('\n');
    for (let n = 0; n < 12 && game._message_more; n++) await rhack(' ');
    assert.equal(game.inventory.includes(item), false);
    assert.equal(game._armor_wear_occupation, null);
    assert.deepEqual(game.u.abon.a, [0,0,0,0,0,0]);
    assert.equal(game.u.acurr.a[A_INT], base[A_INT]);
    assert.equal(game.u.acurr.a[A_WIS], base[A_WIS]);
    assert.equal(game.u.acurr.a[A_DEX], base[A_DEX]);
});

for (const kind of ['fumble boots', 'gauntlets of fumbling']) for (const source of ['none', 'timed', 'permanent', 'otherArmor']) {
    test(`${kind} callback respects ${source} fumbling source`, async () => {
        setup(kind);
        const mask = kind === 'fumble boots' ? W_ARMF : W_ARMG;
        const otherMask = kind === 'fumble boots' ? W_ARMG : W_ARMF;
        game.u.uprops[FUMBLING] = { intrinsic: source === 'timed' ? 100 : source === 'permanent' ? FROMOUTSIDE : 0,
            extrinsic: source === 'otherArmor' ? otherMask : 0 };
        await rhack('W'); await rhack('a');
        assert.equal(game.u.uprops[FUMBLING].extrinsic & mask, mask);
        const turns = kind === 'fumble boots' ? 2 : 1;
        await finishDressing();
        const rolls = getRngLog().filter(call => call.startsWith('rnd(20)'));
        assert.equal(rolls.length, ['permanent', 'otherArmor'].includes(source) ? 0 : 1);
        const value = game.u.uprops[FUMBLING].intrinsic;
        if (source === 'timed') assert.equal(value & TIMEOUT, 100 - (game.moves - 100) + Number(rolls[0].split('=')[1]),
            'the callback adds to the timeout after each dressing turn has decremented it');
        if (source === 'permanent') assert.equal(value, FROMOUTSIDE);
        await rhack('T'); await finishDressing();
        assert.equal(game.u.uprops[FUMBLING].extrinsic & mask, 0);
        if (source === 'otherArmor') assert.equal(game.u.uprops[FUMBLING].extrinsic, otherMask);
        else if (source === 'permanent') assert.equal(game.u.uprops[FUMBLING].intrinsic, FROMOUTSIDE);
        else assert.equal(game.u.uprops[FUMBLING].intrinsic, 0);
    });
}

for (const kind of ['helm of brilliance', 'gauntlets of dexterity']) test(`${kind} at +0 reveals enchantment but not its shuffled type`, async () => {
    const item = setup(kind);
    await rhack('W'); await rhack('a'); await finishDressing();
    assert.equal(item.chargeKnown, true); assert.equal(item.known, true);
    assert.deepEqual(game.u.abon.a, [0,0,0,0,0,0]);
});

test('status uses effective bonus attributes while preserving base and other equipment bonuses', async () => {
    setup('helm of brilliance', 3); game.u.abon.a[A_INT] = -2; game.u.abon.a[A_WIS] = -1;
    await rhack('W'); await rhack('a'); await finishDressing();
    const display = { putstr() {}, clearRow() {} };
    const [line] = GameDisplay.prototype.renderStatus.call(display);
    assert.match(line, /In:25 Wi:25/); assert.equal(game.u.acurr.a[A_INT], 24);
    await rhack('T'); await finishDressing();
    assert.equal(game.u.abon.a[A_INT], -2); assert.equal(game.u.abon.a[A_WIS], -1);
    assert.match(GameDisplay.prototype.renderStatus.call(display)[0], /In:22 Wi:23/);
});

test('an unidentified armor appearance uses its actual type for delayed callbacks', async () => {
    const item = setup('helm of brilliance', 3); item.kind = 'crystal helmet';
    await rhack('W'); await rhack('a');
    assert.equal(game._armor_wear_occupation.turns, 1); assert.equal(game.u.abon.a[A_INT], 0);
    await finishDressing(); assert.equal(game.u.abon.a[A_INT], 3);
});

test('cancel_don also cancels a callback already parked at the finishing message', async () => {
    const item = setup('helm of brilliance', 3);
    await rhack('W'); await rhack('a'); game._armor_wear_occupation.turns = 1; game.u.umovement = 0;
    game._pending_message = 'An earlier message occupies the complete first line before your dressing ends.';
    await processMonsterTurns(); assert.equal(game._armor_don_knowledge_after_more, item);
    cancelArmorDressing(item); changeArmorBonuses(item, false);
    assert.equal(game._armor_don_knowledge_after_more, null);
    assert.equal(game.u.abon.a[A_INT], 0);
    await rhack(' '); assert.equal(game.u.abon.a[A_INT], 0);
});

test('removing an object without a letter or active dressing leaves the unrelated multi state alone', () => {
    setup('helm of brilliance'); game.multi = -4; game.multi_reason = 'sleeping';
    const amulet = { cls: 'amulet', kind: 'amulet of life saving' };
    cancelArmorDressing(amulet);
    assert.equal(game.multi, -4); assert.equal(game.multi_reason, 'sleeping');
    assert.equal(amulet._armorDonPending, undefined);
});

for (const kind of ['helm of brilliance', 'gauntlets of dexterity']) for (const effect of ['enchant armor', 'destroy armor']) {
    test(`${effect} changes ${kind} bonus together with spe and leaves removal balanced`, async () => {
        const item = setup(kind, 2);
        await rhack('W'); await rhack('a'); await finishDressing();
        const cursed = effect === 'destroy armor'; item.cursed = cursed;
        game.inventory.push({ id: 2, letter: 'b', cls: 'scroll', kind: `scroll of ${effect}`,
            actualKind: `scroll of ${effect}`, scrollIndex: cursed ? 1 : 0, cursed, quan: 1, known: true });
        await rhack('r'); await rhack('b');
        for (let n = 0; n < 12 && game._message_more; n++) await rhack(' ');
        const attr = kind === 'helm of brilliance' ? A_INT : A_DEX;
        assert.notEqual(item.spe, 2);
        assert.equal(game.u.abon.a[attr], item.spe);
        assert.equal(game.u.acurr.a[attr], 24);
        item.cursed = false;
        await rhack('T'); await finishDressing();
        assert.equal(game.u.abon.a[attr], 0);
    });
}
