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

// invent.c:ggetobj and askchain use the traditional category prompt even when
// there is only one eligible class. C's Escape repeats getlin at this boundary.
for (const style of [0, 'traditional']) test(`traditional identification category prompt (${style}) preserves chain order and category flags`, async () => {
    setup(); game.flags.menu_style = style;
    add('WAN_WISHING', 'c', { blessed: true, bknown: true, pickup_prev: true });
    add('POT_GAIN_ABILITY', 'a', { cursed: true, bknown: true });
    add('LONG_SWORD', 'b', { bknown: true });
    add('CHEST', 'd', { contents: [{ unpaid: true }] });
    await read(); await dismiss();
    assert.equal(game._command_mode, 'identifyCategory');
    assert.equal(game._pending_message, 'What kinds of thing do you want to identify? [/!)( uBUCXPaim] ');
    const calls = getRngLog();
    await rhack('\x1b');
    assert.equal(game._command_mode, 'identifyCategory');
    assert.deepEqual(getRngLog(), calls);
    assert.equal(game.context.move, 0);
});

test('traditional getlin supports editing and a first Escape clears its text', async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); add('DAGGER', 'b');
    await read(); await dismiss();
    for (const ch of '!u') await rhack(ch.charCodeAt(0));
    await rhack('\b'); assert.equal(game._identification.categoryInput, '!');
    await rhack('\x1b'); assert.equal(game._identification.categoryInput, '');
    await rhack('A'); await rhack('\x15'); assert.equal(game._identification.categoryInput, '');
    await rhack('\n'); assert.equal(game._command_mode, 'identifyQuestion');
});

test('traditional questions sort inventory letters without pack sorting', async () => {
    setup(); game.flags.menustyle = 'traditional';
    const wand = add('WAN_WISHING', 'b'), potion = add('POT_GAIN_ABILITY', 'a');
    await read(); await dismiss(); await rhack('A'); await rhack('\n');
    assert.equal(game._identification.askItem, potion);
    const calls = getRngLog(); await rhack('x'); assert.deepEqual(getRngLog(), calls);
    await rhack('n'); assert.equal(game._identification.askItem, wand);
    await rhack('Y'); await dismiss();
    assert.equal(wand.known, true); assert.equal(potion.known, false);
    assert.equal(game._command_mode, null); assert.equal(game.context.move, 1);
    assert.equal(game.inventory.every(item => item.bypass === 0), true);
    assert.equal(game.context.bypasses, false);
});

test('traditional multiple classes are visited in the order typed, including repeated-class suppression', async () => {
    setup(); game.flags.menustyle = 'traditional';
    const sword = add('LONG_SWORD', 'a'), potion = add('POT_GAIN_ABILITY', 'b'), wand = add('WAN_WISHING', 'c');
    await read({ blessed: true, cursed: false }); await dismiss();
    for (const ch of '/!/') await rhack(ch.charCodeAt(0));
    await rhack('\n'); assert.equal(game._identification.askItem, wand);
    await rhack('y'); await dismiss(); assert.equal(game._identification.askItem, potion);
    await rhack('y'); await dismiss();
    assert.equal(sword.known, false); assert.equal(potion.known, true); assert.equal(wand.known, true);
    assert.equal(game._command_mode, null);
});

for (const answer of ['q', '\x1b']) test(`traditional item ${JSON.stringify(answer)} cancels without spending more random draws`, async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); add('DAGGER', 'b');
    await read(); await dismiss(); await rhack('\n');
    const calls = getRngLog(); await rhack(answer);
    assert.equal(game._command_mode, null); assert.equal(game.context.move, 1);
    assert.deepEqual(getRngLog(), calls);
    assert.equal(game.inventory.every(item => !item.known && !item.bypass), true);
});

for (const answer of ['n', ' ', '\n', '\r']) test(`traditional ${JSON.stringify(answer)} defaults to no and repeats the category question`, async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); add('DAGGER', 'b');
    await read(); await dismiss(); await rhack('\n');
    await rhack(answer); await rhack(answer);
    assert.equal(game._pending_message, 'That was all.');
    assert.equal(game._command_mode, 'wizardIdentifyMore');
    await dismiss(); assert.equal(game._command_mode, 'identifyCategory');
    assert.equal(game._identification.limit, 1);
});

for (const category of ['a', 'A']) test(`traditional ${category} distinguishes automatic identification from per-item questions`, async () => {
    setup(); game.flags.menustyle = 'traditional'; const first = add('LONG_SWORD', 'a'); add('DAGGER', 'b');
    await read(); await dismiss(); await rhack(category); await rhack('\n'); await dismiss();
    assert.equal(first.known, category === 'a');
    assert.equal(game._command_mode, category === 'a' ? null : 'identifyQuestion');
});

test('traditional all answer applies the remaining allowance without asking about later objects', async () => {
    setup(); game.flags.menustyle = 'traditional';
    const first = add('LONG_SWORD', 'a'), second = add('DAGGER', 'b'), third = add('ARROW', 'c');
    await read({ blessed: true, cursed: false }); await dismiss(); await rhack('\n'); await rhack('a'); await dismiss();
    assert.equal(first.known, true); assert.equal(second.known, true); assert.equal(third.known, false);
    assert.equal(game._command_mode, null);
});

test('traditional unpaid, BUC, novelty, and class filters combine rather than accepting their union', async () => {
    setup(); game.flags.menustyle = 'traditional';
    add('LONG_SWORD', 'a', { blessed: true, bknown: true, unpaid: true, pickup_prev: true });
    add('POT_HEALING', 'b', { blessed: true, bknown: true, unpaid: true });
    const match = add('POT_GAIN_ABILITY', 'c', { blessed: true, bknown: true, unpaid: true, pickup_prev: true });
    add('POT_EXTRA_HEALING', 'd', { cursed: true, bknown: true, unpaid: true, pickup_prev: true });
    await read(); await dismiss();
    for (const ch of '!uBP\n') await rhack(ch.charCodeAt(0));
    assert.equal(game._identification.askItem, match);
    await rhack('y'); await dismiss(); assert.equal(match.known, true);
    assert.equal(game.inventory.filter(item => item.known).length, 1);
});

test('traditional unpaid filtering includes a paid container with nested unpaid contents', async () => {
    setup(); game.flags.menustyle = 'traditional';
    add('LONG_SWORD', 'a'); const box = add('CHEST', 'b', { contents: [{ contents: [{ unpaid: true }] }] });
    await read(); await dismiss(); await rhack('u'); await rhack('\n');
    assert.equal(game._identification.askItem, box);
    await rhack('y'); await dismiss(); assert.equal(box.known, true);
});

test('traditional Priest category counting learns BUC before filtering', async () => {
    setup(); game.flags.menustyle = 'traditional'; game._startup_role = 'Priest';
    add('GOLD_PIECE', '$', { bknown: true });
    const first = add('LONG_SWORD', 'a', { blessed: true }), second = add('DAGGER', 'b', { cursed: true });
    await read(); await dismiss();
    assert.equal(game._pending_message, 'What kinds of thing do you want to identify? [) BCaim] ');
    assert.equal(first.bknown, true); assert.equal(second.bknown, true); assert.equal(game.inventory[0].bknown, false);
});

test('traditional no applicable objects repeats after its message', async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); add('DAGGER', 'b');
    await read(); await dismiss(); await rhack('!'); await rhack('\n');
    assert.equal(game._pending_message, 'No applicable objects.');
    await dismiss(); assert.equal(game._command_mode, 'identifyCategory');
});

test('traditional invalid categories report the C error and preserve following valid categories', async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); const wand = add('WAN_WISHING', 'b');
    await read(); await dismiss();
    for (const ch of 'z/\n') await rhack(ch.charCodeAt(0));
    assert.equal(game._pending_message, "You don't have any z's.");
    await dismiss(); assert.equal(game._identification.askItem, wand);
});

for (const categories of ['m', '!Bm', 'am']) test(`traditional ${categories} switches to the whole eligible inventory menu`, async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); const wand = add('WAN_WISHING', 'b');
    await read(); await dismiss(); for (const ch of categories + '\n') await rhack(ch.charCodeAt(0));
    assert.equal(game._command_mode, 'wizardIdentify');
    assert.deepEqual(game._identification.items, game.inventory);
    await rhack('b'); await rhack('\n'); await dismiss();
    assert.equal(wand.known, true); assert.equal(game._command_mode, null);
});

test('traditional inventory preview returns to the category prompt without identifying', async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); add('DAGGER', 'b');
    const known = add('GOLD_PIECE', '$');
    await read(); await dismiss(); await rhack('i'); await rhack('\n');
    assert.equal(game._command_mode, 'identifyPreview');
    assert.equal(game._overlay_lines.some(row => row[2].startsWith('$ -')), false);
    await rhack('a'); assert.equal(game._command_mode, 'identifyCategory');
    assert.equal(game.inventory.filter(item => item !== known).every(item => !item.known), true);
});

test('traditional dynamic inventory letters count skipped items when constant letters are disabled', async () => {
    setup(); Object.assign(game.flags, { menustyle: 'traditional', invlet_constant: false });
    add('GOLD_PIECE', '$'); add('LONG_SWORD', 'x', { known: true, bknown: true, rknown: true });
    add('DAGGER', 'y'); add('WAN_WISHING', 'z');
    await read(); await dismiss(); await rhack('\n');
    assert.match(game._pending_message, /^b - /);
});

test('traditional save restores pending questions and live objects without repeating identification', async () => {
    setup(); game.flags.menustyle = 'traditional'; add('LONG_SWORD', 'a'); add('DAGGER', 'b'); add('ARROW', 'c');
    await read({ blessed: true, cursed: false }); await dismiss(); await rhack('\n'); await rhack('y');
    assert.equal(game._command_mode, 'wizardIdentifyMore');
    const calls = getRngLog(), saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    await dismiss(); assert.equal(game._identification.askItem, game.inventory[1]);
    assert.deepEqual(getRngLog(), calls);
    await rhack('y'); await dismiss();
    assert.equal(game.inventory[0].known, true); assert.equal(game.inventory[1].known, true);
    assert.equal(game.inventory[2].known, false); assert.equal(game._command_mode, null);
});

test('traditional one-item preview uses a selectable More message and survives saving', async () => {
    setup(); game.flags.menustyle = 'traditional'; game._startup_role = 'Priest';
    add('LONG_SWORD', 'a', { known: true, rknown: true }); add('DAGGER', 'b');
    await read(); await dismiss(); await rhack('i'); await rhack('\n');
    assert.equal(game._command_mode, 'identifyPreviewOne');
    assert.match(game._pending_message, /^b - /); assert.equal(game._message_more, 1);
    const calls = getRngLog(); await rhack('x'); assert.deepEqual(getRngLog(), calls);
    const saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    await rhack('b'); assert.equal(game._command_mode, 'identifyCategory');
    assert.equal(game.inventory[1].known, false); assert.equal(game.context.move, 0);
});
