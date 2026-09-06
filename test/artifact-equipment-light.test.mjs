import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { moveloop_core } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, W_WEP, W_ARM, TEMP_LIT } from '../js/const.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { resetInputState } from '../js/input.js';

function setup(extra = {}) {
    resetGame(); initRng(73); resetInputState();
    game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Knight';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 100, uhpmax: 100, uen: 50, uenmax: 50, uhunger: 900,
        acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: 1, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: false });
    const item = { id: 1, artifact: 'Sunsword', kind: 'long sword', cls: 'weapon',
        letter: 'a', quan: 1, age: 0, ...extra };
    game.inventory = [item];
    vision_reset(); vision_recalc();
    return item;
}

async function wield(key = 'a') {
    game._pending_message = ''; game._message_more = 0;
    await rhack('w'); await rhack(key);
}

async function finishArmor() {
    game._pending_time_passed = 8;
    try { await moveloop_core(); }
    catch (error) { if (!/Input queue empty/.test(error.message)) throw error; }
    resetInputState();
    const messages = [game._pending_message || ''];
    for (let i = 0; game._message_more && i < 12; i++) {
        await rhack(' ');
        messages.push(game._pending_message || '');
    }
    return messages.join('  ');
}

for (const [buc, adverb, radius] of [
    [{ blessed: true }, 'brilliantly', 3], [{}, 'brightly', 2], [{ cursed: true }, 'dimly', 1],
]) {
    test(`wielding Sunsword starts untimed light ${adverb}`, async () => {
        const item = setup(buc);
        enableRngLog({ reset: true });
        await wield();
        assert.equal(item.lamplit, true);
        assert.equal(item.burning, true);
        assert.equal(item.timed || 0, 0);
        assert.equal(game.timers?.length || 0, 0);
        assert.equal(item.age, 0);
        assert.match(game._pending_message, new RegExp(`Sunsword begins to shine ${adverb}!`));
        assert.deepEqual(getRngLog(), []);
        vision_recalc();
        assert.ok(game.viz_array[10][10 + radius] & TEMP_LIT);
        assert.equal(game.viz_array[10][11 + radius] & TEMP_LIT, 0);
    });
}

test('numeric Sunsword identity lights on wield', async () => {
    const item = setup({ artifact: undefined, oartifact: 20 });
    await wield();
    assert.equal(item.lamplit, true);
});

test('blind hero gets Sunsword light without its visual message', async () => {
    const item = setup(); game.u.blind = true;
    await wield();
    assert.equal(item.lamplit, true);
    assert.doesNotMatch(game._pending_message, /shine/);
});

test('unwielding Sunsword ends its light and clears the primary slot', async () => {
    const item = setup({ wielded: true, lamplit: true, burning: true, owornmask: W_WEP });
    game.u.uwep = item;
    await wield('-');
    assert.equal(item.lamplit, false);
    assert.equal(item.wielded, false);
    assert.equal(item.owornmask & W_WEP, 0);
    assert.equal(game.u.uwep, null);
    assert.match(game._pending_message, /Sunsword stops shining/);
});

test('switching weapon extinguishes Sunsword', async () => {
    const item = setup({ wielded: true, lamplit: true, burning: true });
    const next = { id: 2, letter: 'b', kind: 'dagger', cls: 'weapon', quan: 1 };
    game.inventory.push(next);
    await wield('b');
    assert.equal(item.lamplit, false);
    assert.equal(next.wielded, true);
    assert.match(game._pending_message, /Sunsword stops shining/);
});

test('already wielded Sunsword is not relit or announced again', async () => {
    const item = setup({ wielded: true, lamplit: true, burning: true });
    await wield();
    assert.equal(item.lamplit, true);
    assert.equal(game._pending_message, 'You are already wielding that!');
    assert.equal(game.context.move, 0);
});

for (const toSunsword of [false, true]) {
    test(`weapon swap ${toSunsword ? 'to' : 'from'} Sunsword changes its light`, async () => {
        const item = setup({ wielded: !toSunsword, alternate: toSunsword,
            lamplit: !toSunsword, burning: !toSunsword });
        game.inventory.push({ id: 2, letter: 'b', kind: 'dagger', cls: 'weapon', quan: 1,
            wielded: toSunsword, alternate: !toSunsword });
        await rhack('x');
        assert.equal(item.lamplit, toSunsword);
    });
}

test('removing Sunsword from inventory extinguishes it without consuming its age', () => {
    const item = setup({ wielded: true, lamplit: true, burning: true, age: 450, owornmask: W_WEP });
    shop.removeInventoryItem(item);
    assert.equal(item.lamplit, false);
    assert.equal(item.age, 450);
    assert.equal(game.inventory.length, 0);
});

for (const [kind, otyp, expected] of [
    ['gold dragon scales', 10149, 'brightly'], ['gold dragon scale mail', 10140, 'brilliantly'],
]) {
    for (const putOn of ['W', 'P']) {
        test(`${putOn} lights ${kind} only after the dressing occupation`, async () => {
            const item = setup({ artifact: undefined, kind, otyp, cls: 'armor' });
            await rhack(putOn); await rhack('a');
            assert.equal(!!item.lamplit, false);
            assert.ok(game._armor_wear_occupation);
            const messages = await finishArmor();
            assert.equal(item.lamplit, true);
            assert.equal(item.timed || 0, 0);
            assert.match(messages, new RegExp(`shine ${expected}!`));
        });
    }
    test(`taking off ${kind} extinguishes it after the occupation`, async () => {
        const item = setup({ artifact: undefined, kind, otyp, cls: 'armor', worn: true,
            lamplit: true, burning: true, owornmask: W_ARM });
        await rhack('T');
        if (game._command_mode === 'takeOffObject') await rhack('a');
        assert.equal(item.lamplit, true);
        await finishArmor();
        assert.equal(item.lamplit, false);
        assert.match(game._pending_message, /stop(?:s)? shining/);
    });
}

test('removing worn gold armor ends light even after its worn flags were cleared', () => {
    const item = setup({ artifact: undefined, kind: 'gold dragon scales', otyp: 10149,
        cls: 'armor', worn: false, lamplit: true, burning: true });
    shop.removeInventoryItem(item);
    assert.equal(item.lamplit, false);
});

test('ordinary lamp survives inventory-to-floor removal lit with the same timer', () => {
    const item = setup({ artifact: undefined, kind: 'oil lamp', otyp: 227, cls: 'tool',
        lamplit: true, burning: true, age: 50, timed: 1 });
    const timer = { arg: item, func: 4, timeout: 150, kind: 3 };
    game.timers = [timer];
    shop.removeInventoryItem(item);
    assert.equal(item.lamplit, true);
    assert.equal(game.timers[0], timer);
});

test('drop command extinguishes wielded Sunsword before placing the same object on the floor', async () => {
    const item = setup({ wielded: true, lamplit: true, burning: true, otyp: 10033 });
    await rhack('d'); await rhack('a');
    assert.equal(game.inventory.includes(item), false);
    assert.equal(game.level.objects.includes(item), true);
    assert.equal(item.lamplit, false);
    assert.match(game._pending_message, /Sunsword stops shining/);
});

test('applying a pick-axe extinguishes the replaced Sunsword', async () => {
    const item = setup({ wielded: true, lamplit: true, burning: true });
    const pick = { id: 2, letter: 'b', cls: 'tool', kind: 'pick-axe', otyp: 10025, quan: 1 };
    game.inventory.push(pick);
    game._command_mode = 'applyObject'; await rhack('b');
    assert.equal(pick.wielded, true);
    assert.equal(item.lamplit, false);
    assert.match(game._pending_message, /Sunsword stops shining/);
});

test('readying the whole wielded Sunsword extinguishes it when unquipped', async () => {
    const item = setup({ wielded: true, lamplit: true, burning: true });
    await rhack('Q'); await rhack('a');
    assert.match(game._command_mode, /WieldedConfirm/);
    await rhack('y');
    assert.equal(item.lamplit, false);
    assert.equal(item.quivered, true);
});

for (const [kind, otyp, blessed, cursed, adverb] of [
    ['gold dragon scale mail', 10140, true, false, 'radiantly'],
    ['gold dragon scale mail', 10140, false, true, 'brightly'],
    ['gold dragon scales', 10149, true, false, 'brilliantly'],
    ['gold dragon scales', 10149, false, true, 'dimly'],
]) {
    test(`gold armor BCU controls ${kind} light ${adverb}`, async () => {
        const item = setup({ artifact: undefined, kind, otyp, cls: 'armor', blessed, cursed });
        await rhack('W'); await rhack('a');
        const messages = await finishArmor();
        assert.equal(item.lamplit, true);
        assert.match(messages, new RegExp(`shine ${adverb}!`));
        assert.equal(item.timed || 0, 0);
    });
}

test('blind dressing still lights gold armor while suppressing shine text', async () => {
    const item = setup({ artifact: undefined, kind: 'gold dragon scales', otyp: 10149, cls: 'armor' });
    game.u.blind = true;
    await rhack('W'); await rhack('a');
    const messages = await finishArmor();
    assert.equal(item.lamplit, true);
    assert.doesNotMatch(messages, /shine/);
});

for (const keys of [['w', '-'], ['w', 'b'], ['x']]) {
    test(`welded Sunsword stays lit when ${keys.join(' ')} cannot change weapons`, async () => {
        const item = setup({ wielded: true, lamplit: true, burning: true, cursed: true });
        const next = { id: 2, letter: 'b', kind: 'dagger', cls: 'weapon', quan: 1, alternate: true };
        game.inventory.push(next);
        enableRngLog({ reset: true });
        for (const key of keys) await rhack(key);
        assert.equal(item.lamplit, true);
        assert.equal(item.wielded, true);
        assert.equal(item.bknown, true);
        assert.equal(!!next.wielded, false);
        assert.equal(game.context.move, 0);
        assert.deepEqual(getRngLog(), []);
        assert.match(game._pending_message, /welded to your hand/);
    });
}
