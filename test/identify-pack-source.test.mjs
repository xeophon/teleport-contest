import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { ROOM } from '../js/const.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { objectIsFullyIdentified } from '../js/object_knowledge.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(seed = 2) {
    resetGame(); initRng(seed);
    Object.assign(game, { moves: 100, flags: { debug: true }, context: {}, inventory: [], level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10, uhp: 100, uhpmax: 100,
            acurr: { a: [12, 12, 12, 12, 12, 12] }, uprops: [], uhunger: 900 } });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); enableRngLog({ reset: true });
}
function add(symbol, letter, fields = {}) {
    const type = OBJECT_DATA.find(type => type.symbol === symbol);
    const cls = ['', '', 'weapon', 'armor', 'ring', 'amulet', 'tool', 'food', 'potion',
        'scroll', 'spellbook', 'wand', 'coin', 'gem', 'rock', 'ball', 'chain', 'venom'][type.class];
    const item = { _c_otyp: type.id, cls, kind: type.name, actualKind: type.name, letter,
        quan: 1, known: false, dknown: true, bknown: false, rknown: false, ...fields };
    game.inventory.push(item); return item;
}
async function read(fields = {}) {
    const scroll = add('SCR_IDENTIFY', 'z', { scrollIndex: 13, known: true, cursed: true, ...fields });
    await rhack('r'); await rhack('z'); return scroll;
}
async function dismiss() {
    for (let i = 0; game._command_mode === 'wizardIdentifyMore' && i < 20; i++) await rhack(' ');
}

for (const cancel of [true, false]) test(`ordinary identification ${cancel ? 'cancels' : 'honors the chosen item'} instead of taking the first item`, async () => {
    setup(); const first = add('POT_GAIN_ABILITY', 'a'), second = add('WAN_WISHING', 'b');
    const scroll = await read();
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(first.known, false); assert.equal(second.known, false);
    await dismiss(); assert.equal(game._command_mode, 'wizardIdentify');
    assert.equal(game.context.move, 0);
    assert.ok(game._overlay_lines.some(row => row[2] === 'What would you like to identify first?'));
    await rhack('b'); await rhack(cancel ? '\x1b' : '\n'); await dismiss();
    assert.equal(game._command_mode, null); assert.equal(game.context.move, 1);
    assert.equal(first.known, false); assert.equal(second.known, !cancel);
});

test('ordinary selection never reveals the wizard override or its special all entry', async () => {
    setup(); add('WAN_WISHING', 'a', { known: false, appearance: 'glass' }); add('POT_GAIN_ABILITY', 'b');
    await read(); await dismiss();
    assert.ok(game._overlay_lines.some(row => row[2] === 'a - a glass wand'));
    assert.ok(!game._overlay_lines.some(row => row[2].startsWith('_ ')));
    await rhack('_'); assert.deepEqual(game._identification.selected, []);
});

test('excess selections are truncated to the limit in menu order', async () => {
    setup(); const wand = add('WAN_WISHING', 'a'), scroll = add('SCR_GENOCIDE', 'b'), potion = add('POT_GAIN_ABILITY', 'c');
    await read(); await dismiss(); await rhack(','); await rhack('\n'); await dismiss();
    assert.equal(objectIsFullyIdentified(scroll), true);
    assert.equal(wand.known, false); assert.equal(potion.known, false);
    assert.equal(game.context.move, 1);
});

test('selecting fewer than the limit asks next and retains the remaining allowance', async () => {
    setup(2); const first = add('LONG_SWORD', 'a'), second = add('DAGGER', 'b'); add('ARROW', 'c');
    await read({ blessed: true, cursed: false }); await dismiss();
    assert.equal(game._identification.limit, 2);
    await rhack('a'); await rhack('\n'); await dismiss();
    assert.equal(first.known, true); assert.equal(second.known, false);
    assert.ok(game._overlay_lines.some(row => row[2] === 'What would you like to identify next?'));
    await rhack('b'); await rhack('\n'); await dismiss();
    assert.equal(second.known, true); assert.equal(game._command_mode, null);
});

test('empty selections get four retries and then the C failure message', async () => {
    setup(); add('LONG_SWORD', 'a'); add('DAGGER', 'b'); await read(); await dismiss();
    for (let i = 0; i < 4; i++) {
        await rhack('\n');
        assert.equal(game._pending_message, 'Choose an item; use ESC to decline.');
        await dismiss(); assert.equal(game._command_mode, 'wizardIdentify');
    }
    await rhack('\n');
    assert.equal(game._pending_message, "That's enough tries!");
    assert.equal(game._command_mode, null); assert.equal(game.context.move, 1);
    assert.equal(game.inventory.every(item => item.known === false), true);
});

test('saving a selection retains the consumed scroll and live item identities', async () => {
    setup(); add('LONG_SWORD', 'a'); add('DAGGER', 'b'); await read(); await dismiss(); await rhack('b');
    const saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    assert.equal(game._identification.menuOrder[1], game.inventory[1]);
    assert.equal(game.inventory.length, 2);
    await rhack('\n'); await dismiss();
    assert.equal(game.inventory[1].known, true); assert.equal(game.inventory[0].known, false);
});

for (const symbol of ['CHEST', 'STATUE', 'TIN', 'EGG', 'LONG_SWORD'])
    test(`ordinary identify includes partly known ${symbol}`, async () => {
        setup(); const item = add(symbol, 'a', { known: true, bknown: true, rknown: false, cknown: false, lknown: false });
        // Tin and egg need another unknown dimension; contents don't gate their predicate.
        if (symbol === 'TIN' || symbol === 'EGG') item.known = false;
        await read(); await dismiss();
        assert.equal(objectIsFullyIdentified(item), true);
        assert.equal(game._command_mode, null);
        if (['CHEST', 'STATUE', 'TIN'].includes(symbol)) assert.equal(item.cknown, true);
    });

test('identify-all suspends before later objects and ignores non-More keys', async () => {
    setup(5); add('SCR_STINKING_CLOUD', 'a'); add('POT_GAIN_ABILITY', 'b'); const third = add('WAN_WISHING', 'c');
    await read({ blessed: true, cursed: false });
    assert.equal(game._command_mode, 'wizardIdentifyMore');
    assert.equal(third.known, false);
    const calls = getRngLog(); await rhack('x'); assert.deepEqual(getRngLog(), calls);
    await dismiss();
    assert.equal(game.inventory.every(objectIsFullyIdentified), true);
    assert.equal(getRngLog().filter(call => call.startsWith('rn2(19)')).length, 4);
});

test('an already identified inventory reports all while an empty one reports nothing else', async () => {
    setup(); add('GOLD_PIECE', '$'); await read(); await dismiss();
    assert.match(game._pending_message, /You have already identified all of your possessions\./);
    setup(); await read();
    assert.match(game._pending_message, /You're not carrying anything else to be identified\./);
});

for (const fields of [{ known: false }, { known: true, confused: true }])
    test(`cursed or confused reading only identifies the scroll: ${JSON.stringify(fields)}`, async () => {
        setup(); const target = add('POT_GAIN_ABILITY', 'a');
        game.u._statusSuffix = fields.confused ? 'Conf' : '';
        await read({ known: fields.known });
        assert.match(game._pending_message, /You identify this as an identify scroll\./);
        assert.equal(target.known, false);
        assert.equal(game._identification, undefined);
    });

for (const [uluck, moreluck, expected] of [[0, 1, 2], [1, -1, 1], [-1, 2, 2]])
    test(`blessed identify combines ordinary luck ${uluck} and stone luck ${moreluck}`, async () => {
        setup(11); Object.assign(game.u, { uluck, moreluck });
        for (const letter of 'abc') add('LONG_SWORD', letter);
        await read({ blessed: true, cursed: false }); await dismiss();
        assert.equal(game._identification.limit, expected);
    });

test('the identify spell delegates selection to the same saved menu', async () => {
    setup(2);
    for (const letter of 'abcdefghij') add('LONG_SWORD', letter);
    for (const ch of '#wizcast\n') await rhack(ch.charCodeAt(0));
    const spell = game._spell_menu_spells.find(spell => spell.name === 'identify');
    if (spell.menuRow >= 23) await rhack('>');
    await rhack(spell.letter); await dismiss();
    assert.equal(game._command_mode, 'wizardIdentify');
    assert.equal(game._identification.ordinary, true);
    assert.equal(game.inventory.every(item => item.known === false), true);
    await rhack('j'); await rhack('\n'); await dismiss();
    assert.equal(objectIsFullyIdentified(game.inventory.at(-1)), true);
});
