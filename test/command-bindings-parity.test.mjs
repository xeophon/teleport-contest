import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNethackrc } from '../js/options.js';
import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { ROOM } from '../js/const.js';

for (const [text, code] of [
    ['x', 120], ['<space>', 32], ['<enter>', 10], ['<esc>', 27],
    ['^A', 1], ['C-a', 1], ['^-a', 1], ['^?', 127],
    ['M-a', 225], ['M-C-a', 129], ['M-^?', 255], ['160', 160], ['300', 44],
    ['\\n', 10], ['\\t', 9], ['\\b', 8], ['\\r', 13], ['\\,', 44],
    ['\\040', 40], ['\\o040', 32], ['\\x20', 32], ['\\m^A', 129],
]) {
    test(`C txt2key binding syntax ${JSON.stringify(text)}`, () => {
        const options = parseNethackrc(`BINDINGS=${text}:search`);
        assert.equal(options.keyBindings[String.fromCharCode(code)], 'search');
    });
}

test('binding lists use C right-to-left precedence, including a comma key', () => {
    const options = parseNethackrc('BIND : ,:pickup,x:search,x:wait,y:inventory\nBINDI=x:open');
    assert.deepEqual(options.keyBindings, { ',': 'pickup', x: 'open', y: 'inventory' });
});

test('invalid keys and unknown commands do not replace earlier valid bindings', () => {
    const options = parseNethackrc('BIND=x:search\nBINDINGS=x:impossible-command,12:wait,<SPACE>:wait');
    assert.deepEqual(options.keyBindings, { x: 'search' });
});

test('Object prototype names are not commands and preserve an earlier binding', () => {
    const options = parseNethackrc('BIND=x:search\nBINDINGS=x:constructor,y:__proto__,z:toString');
    assert.deepEqual(options.keyBindings, { x: 'search' });
});

function setup(bindings) {
    resetGame();
    initRng(41);
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = ROOM;
    game.u = { ux: 10, uy: 10, uhp: 30, uhpmax: 30, ulevel: 1, acurr: { a: [10, 10, 10, 10, 10, 10] } };
    game.flags = { verbose: true };
    game.context = {};
    game.inventory = [];
    game.keyBindings = parseNethackrc(bindings).keyBindings;
    vision_reset();
}

for (const [command, key] of [['open', 'o'], ['close', 'c'], ['search', 's'], ['wait', '.'], ['moveeast', 'l']]) {
    test(`bound ${command} invokes the ordinary handler without rebinding its target`, async () => {
        setup('');
        await rhack(key);
        const expected = [game._command_mode, game.context.move, game.u.ux, game.u.uy, game._pending_message];
        setup(`BINDINGS=x:${command},${key}:inventory`);
        await rhack('x');
        assert.deepEqual([game._command_mode, game.context.move, game.u.ux, game.u.uy, game._pending_message], expected);
    });
}

test('binding an extended command skips the # prompt and preserves direction input', async () => {
    setup('BINDINGS=x:untrap,h:inventory');
    await rhack('x');
    assert.equal(game._command_mode, 'untrapDirection');
    await rhack('h');
    assert.notEqual(game._command_mode, 'inventory');
});

test('nothing unbinds the original command without taking a turn', async () => {
    setup('BINDINGS=s:nothing');
    await rhack('s');
    assert.equal(game.context.move, 0);
    assert.match(game._pending_message, /Unknown command 's'/);
});

test('the default Meta key invokes its extended command', async () => {
    setup('');
    await rhack(128 + 'u'.charCodeAt(0));
    assert.equal(game._command_mode, 'untrapDirection');
});

test('repeat replays the resolved command even when its normal key has another binding', async () => {
    setup('BINDINGS=x:moveeast,l:inventory');
    await rhack('x');
    await rhack('\x01');
    assert.equal(game.u.ux, 12);
    assert.notEqual(game._command_mode, 'inventory');
});
