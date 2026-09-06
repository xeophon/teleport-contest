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

function setup() {
    resetGame(); initRng(71);
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
    const item = { _c_otyp: type.id, cls, actualKind: type.name, kind: type.name, letter,
        quan: 1, id: game.inventory.length + 1, known: false, dknown: true, bknown: false,
        rknown: false, cknown: false, lknown: false, ...fields };
    game.inventory.push(item);
    return item;
}

async function command(text = '#wizidentify\n') {
    for (const ch of text) await rhack(ch.charCodeAt(0));
}

async function finish() {
    for (let i = 0; game._command_mode === 'wizardIdentifyMore' && i < 20; i++) await rhack(' ');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
}

test('wizard identify on empty inventory returns the C empty message', async () => {
    setup(); await command();
    assert.equal(game._pending_message, 'You are not carrying anything.');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
});

for (const keys of ['#wizidentify\n', '\t', 'x']) test(`wizard identify entry ${JSON.stringify(keys)} reveals without changing knowledge`, async () => {
    setup(); game.keyBindings = { x: 'wizidentify' };
    const item = add('WAN_WISHING', 'a', { spe: 2, blessed: true, appearance: 'glass' });
    const before = structuredClone(item);
    await command(keys);
    assert.equal(game._command_mode, 'wizardIdentify');
    assert.ok(game._overlay_lines.some(row => row[2].includes('wand of wishing (0:2)')));
    assert.deepEqual(item, before);
    assert.deepEqual(getRngLog(), []);
    await rhack('\x1b');
    assert.deepEqual(item, before);
    assert.equal(game._wizard_identify, null);
});

for (const accept of [false, true]) test(`selecting and ${accept ? 'accepting' : 'cancelling'} one item preserves all other knowledge`, async () => {
    setup(); const a = add('POT_GAIN_ABILITY', 'a'); const b = add('SCR_GENOCIDE', 'b');
    await command(); await rhack('a');
    assert.equal(a.known, false); assert.equal(b.known, false);
    assert.ok(game._overlay_lines.some(row => row[2].startsWith('a + ')));
    await rhack(accept ? '\n' : '\x1b'); await finish();
    assert.equal(a.known, accept); assert.equal(b.known, false);
    assert.equal(getRngLog().filter(call => call.startsWith('rn2(19)')).length, accept ? 1 : 0);
    if (accept) assert.equal(objectIsFullyIdentified(a), true);
});

for (const selector of ['_', '\t', ',']) test(`C all-items selector ${JSON.stringify(selector)} identifies every item only after acceptance`, async () => {
    setup(); const first = add('POT_GAIN_ABILITY', 'a'); const second = add('SCR_GENOCIDE', 'b');
    await command(); await rhack(selector);
    assert.equal(first.known, false); assert.equal(second.known, false);
    assert.deepEqual(getRngLog(), []);
    await rhack('\n'); await finish();
    assert.equal(objectIsFullyIdentified(first), true);
    assert.equal(objectIsFullyIdentified(second), true);
    assert.equal(getRngLog().filter(call => call.startsWith('rn2(19)')).length, 2);
    await command();
    assert.ok(game._overlay_lines.some(row => row[2] === '(all items are permanently identified already)'));
});

test('class accelerators select every matching object', async () => {
    setup(); const potion = add('POT_GAIN_ABILITY', 'a'); const scroll = add('SCR_GENOCIDE', 'b');
    const other = add('POT_HEALING', 'c');
    await command(); await rhack('!'); await rhack('\n'); await finish();
    assert.equal(objectIsFullyIdentified(potion), true); assert.equal(objectIsFullyIdentified(other), true);
    assert.equal(scroll.known, false);
});

test('toggling a selection twice and accepting performs no identification', async () => {
    setup(); const item = add('POT_GAIN_ABILITY', 'a');
    await command(); await rhack('a'); await rhack('a'); await rhack('\n');
    assert.equal(item.known, false); assert.deepEqual(getRngLog(), []);
    assert.equal(game._command_mode, null);
});

test('save and restore retain selection and inventory identity', async () => {
    setup(); add('SCR_GENOCIDE', 'a'); add('POT_GAIN_ABILITY', 'b');
    await command(); await rhack('b');
    const saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    assert.equal(game._wizard_identify.items[1], game.inventory[1]);
    await rhack('\n'); await finish();
    assert.equal(game.inventory[0].known, false);
    assert.equal(objectIsFullyIdentified(game.inventory[1]), true);
});

test('partly identified charged objects, containers and artifacts remain selectable', async () => {
    setup(); const common = { known: true, bknown: true, dknown: true, rknown: true };
    const wand = add('WAN_WISHING', 'a', { ...common, known: false });
    const box = add('CHEST', 'b', { ...common, cknown: false, lknown: false });
    const artifact = add('LONG_SWORD', 'c', { ...common, artifact: 'Excalibur' });
    game._known_object_types = game.inventory.map(item => item._c_otyp);
    await command(); assert.equal(game._wizard_identify.items.length, 3);
    await rhack('_'); await rhack('\n'); await finish();
    assert.equal(objectIsFullyIdentified(wand), true); assert.equal(objectIsFullyIdentified(box), true);
    assert.equal(objectIsFullyIdentified(artifact), true);
    assert.equal(box.cknown, true); assert.equal(box.lknown, true);
    assert.ok(game._identified_artifacts.includes('Excalibur'));
    assert.match(artifact.line, /^c - the .*Excalibur/);
    assert.deepEqual(getRngLog(), [], 'known types give no repeat Wisdom credit');
});

test('identification feedback suspends the remaining inventory loop', async () => {
    setup(); add('POT_GAIN_ABILITY', 'a'); add('SCR_GENOCIDE', 'b'); const third = add('WAN_WISHING', 'c');
    await command(); await rhack('_'); await rhack('\n');
    assert.equal(game._command_mode, 'wizardIdentifyMore');
    assert.equal(third.known, false, 'the third identify call follows the second prinv return');
    const calls = getRngLog(); await rhack('x'); assert.deepEqual(getRngLog(), calls);
    const saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    await finish();
    assert.equal(game.inventory.every(objectIsFullyIdentified), true);
    assert.equal(getRngLog().filter(call => call.startsWith('rn2(19)')).length, 3);
});

test('coins never create a wizard identification choice', async () => {
    setup(); add('GOLD_PIECE', '$'); add('LONG_SWORD', 'a');
    await command();
    assert.deepEqual(game._wizard_identify.items.map(item => item.letter), ['a']);
});

for (const mode of [0, 1, 2]) test(`C menuinvertmode ${mode} applies to the special all entry only for bulk changes`, async () => {
    setup(); game.iflags = { menuinvertmode: mode };
    add('POT_GAIN_ABILITY', 'a'); add('SCR_GENOCIDE', 'b');
    await command(); await rhack(',');
    assert.equal(game._wizard_identify.selected.includes('_'), mode === 0);
    assert.ok(['a', 'b'].every(letter => game._wizard_identify.selected.includes(letter)));
    await rhack('-');
    assert.deepEqual(game._wizard_identify.selected, []);
    await rhack('_'); await rhack('@');
    assert.equal(game._wizard_identify.selected.includes('_'), mode === 2);
    assert.ok(['a', 'b'].every(letter => game._wizard_identify.selected.includes(letter)));
});

test('wizard pages keep lowercase inventory letters before uppercase and page selection survives a save', async () => {
    setup();
    const letters = 'abcdefghijklmnopqrstuvwxyzAB';
    for (const letter of [...letters].reverse()) add('WAN_WISHING', letter);
    await command();
    assert.deepEqual(game._wizard_identify.pageLetters, ['_', ...letters.slice(0, 20)]);
    await rhack('.');
    assert.deepEqual(game._wizard_identify.selected, [...letters.slice(0, 20)]);
    await rhack('>');
    assert.deepEqual(game._wizard_identify.pageLetters, [...letters.slice(20)]);
    await rhack('A');
    const saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
    await rhack('\n'); await finish();
    assert.equal(game.inventory.filter(objectIsFullyIdentified).length, 21);
    assert.equal(game.inventory.find(item => item.letter === 'A').known, true);
    assert.equal(game.inventory.find(item => item.letter === 'B').known, false);
});

for (const sortpack of [false, true]) test(`wizard sortpack=${sortpack} controls headings and permanent identification order`, async () => {
    setup(); game.flags.sortpack = sortpack;
    add('WAN_WISHING', 'A'); add('POT_GAIN_ABILITY', 'b'); add('SCR_GENOCIDE', 'a');
    await command();
    assert.equal(game._overlay_lines.some(row => row[2] === 'Scrolls'), sortpack);
    assert.deepEqual(game._wizard_identify.menuOrder.map(item => item.letter), ['a', 'b', 'A']);
    await rhack(','); await rhack('\n');
    assert.equal(game._command_mode, 'wizardIdentifyMore');
    assert.equal(game.inventory[0].known, false, 'menu order identifies the wand last');
    await finish();
});

test('the special all entry identifies in inventory chain order', async () => {
    setup(); add('SCR_STINKING_CLOUD', 'A'); add('POT_GAIN_ABILITY', 'b'); add('SCR_GENOCIDE', 'a');
    await command(); await rhack('_'); await rhack('\n');
    assert.equal(game.inventory[2].known, false);
    await finish();
});
