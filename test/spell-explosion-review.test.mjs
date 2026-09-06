import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { GameDisplay } from '../js/game_display.js';
import { HeadlessTerminal } from '../js/terminal.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { ROOM, P_BASIC, COULD_SEE, IN_SIGHT } from '../js/const.js';
import { PM_WEREWOLF } from '../js/permonst.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(cols = 50) {
    const g = resetGame(); initRng(42); enableRngLog();
    Object.assign(g, { flags: { verbose: true }, context: {}, moves: 100, inventory: [],
        level: new GameMap(), _startup_role: 'Barbarian', _startup_race: 'human',
        nhDisplay: new GameDisplay(new HeadlessTerminal({ cols })),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 1000, uhpmax: 1000, uhppeak: 1000, uen: 100, uenmax: 100, uhunger: 900,
            acurr: { a: [14, 14, 14, 14, 14, 14] }, abase: { a: [14, 14, 14, 14, 14, 14] },
            amax: { a: [18, 18, 18, 18, 18, 18] }, ualign: { type: 0, record: 0 } } });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) Object.assign(g.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    g._command_mode = 'spellDirection'; g._casting_spell = { name: 'fireball', skillLevel: P_BASIC };
    const rolls = [...Array(6).fill(0n), 1n, ...Array(20).fill(0n)];
    g.coreCtx.r = rolls.reverse(); g.coreCtx.n = rolls.length;
    return g;
}

test('fireball confusion vapor waits for its own More before the duration roll or status mutation', async () => {
    const g = setup();
    const potion = { id: 10, letter: 'p', cls: 'potion', kind: 'potion of confusion', actualKind: 'confusion', quan: 1 };
    g.inventory.push(potion);
    await rhack('.');
    for (let i = 0; i < 60 && !String(g._topline_after_more || '').includes('somewhat dizzy')
        && !g._queued_messages_after_more?.some(m => m.text?.includes('somewhat dizzy')); i++) await rhack(' ');
    assert.match(`${g._topline_after_more || ''} ${JSON.stringify(g._queued_messages_after_more || [])}`, /somewhat dizzy/);
    assert.equal(g.u._confusionTimeout || 0, 0, 'potion.c:2027–2032 displays dizziness before rnd(5) and make_confused');
    assert.equal(getRngLog().some(row => row.startsWith('rnd(5)=')), false);
    assert.ok(g.inventory.includes(potion));
    for (let i = 0; i < 60 && (g._player_spell_continuation || g._message_more); i++) await rhack(' ');
    assert.equal(g.u._confusionTimeout, 1);
    assert.equal(getRngLog().filter(row => row.startsWith('rnd(5)=')).length, 1);
});

test('fireball defers lycanthropic unholy water until other selected stacks are consumed', async () => {
    const g = setup(800); g.u.ulycn = PM_WEREWOLF;
    const water = { id: 10, letter: 'p', cls: 'potion', kind: 'potion of water', actualKind: 'water', cursed: true, quan: 1 };
    const scroll = { id: 11, letter: 's', cls: 'scroll', kind: 'scroll of identify', quan: 1 };
    g.inventory.push(water, scroll);
    // Six self-fireball dice produce 12, selecting both stacks. Other rolls
    // stay zero so both objects are destroyed and the water triggers you_were.
    const rolls = [...Array(6).fill(1n), 1n, ...Array(20).fill(0n)]; g.coreCtx.r = rolls.reverse(); g.coreCtx.n = rolls.length;
    await rhack('.');
    for (let i = 0; i < 100 && (g._player_spell_continuation || g._message_more); i++) await rhack(' ');
    const text = g._pending_message || '';
    assert.ok(text.indexOf('scroll') >= 0 && text.indexOf('water') >= 0, text);
    assert.ok(text.indexOf('scroll') < text.indexOf('water'), 'zap.c:6060–6090 burns ordinary selected stacks before form-changing water');
    assert.equal(g.inventory.includes(water), false); assert.equal(g.inventory.includes(scroll), false);
});

for (const [name, feedback, field] of [
    ['booze', 'somewhat dizzy', '_confusionTimeout'],
    ['paralysis', 'holding you', null],
    ['sleeping', 'rather tired', null],
    ['speed', 'more flexible', '_veryfastTimeout'],
    ['blindness', 'suddenly gets dark', '_blindTimeout']])
    test(`saved ${name} vapor feedback precedes the duration and effect`, async () => {
        let g = setup();
        const potion = { id: 10, letter: 'p', cls: 'potion', kind: `potion of ${name}`, quan: 1 };
        g.inventory.push(potion); await rhack('.');
        for (let i = 0; i < 30 && !String(g._topline_after_more || '').includes(feedback); i++) await rhack(' ');
        assert.match(g._topline_after_more, new RegExp(feedback));
        assert.equal(field ? g.u[field] || 0 : g.multi || 0, 0);
        assert.equal(getRngLog().filter(row => row.startsWith('rnd(5)=')).length, 0);
        assert.equal(potion.in_use, true);
        const { coreCtx, displayCtx, rng, nhDisplay } = g, saved = encodeSaveState();
        resetGame(); restoreSaveState(saved); g = game; Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
        for (let i = 0; i < 60 && (g._player_spell_continuation || g._message_more); i++) await rhack(' ');
        assert.equal(field ? g.u[field] : g.multi, field ? 1 : -1);
        assert.equal(getRngLog().filter(row => row.startsWith('rnd(5)=')).length, 1);
        assert.equal(g.u.usleep || 0, 0, 'potion vapor uses nomul without setting the fall_asleep timestamp');
        assert.equal(g.inventory.length, 0);
    });

for (const [name, expectedHuman, expectedMonster] of [['sickness', 50, 44], ['full healing', 53, 52]])
    test(`${name} vapor uses the canonical polymorph HP pool`, async () => {
        const g = setup(800);
        Object.assign(g.u, { _polyself_form: { name: 'red dragon' }, mh: 50, mhmax: 100, uhp: 50, uhpmax: 100 });
        g.inventory.push({ id: 10, letter: 'p', cls: 'potion', kind: `potion of ${name}`, quan: 1 });
        await rhack('.');
        for (let i = 0; i < 60 && (g._player_spell_continuation || g._message_more); i++) await rhack(' ');
        assert.equal(g.u.uhp, expectedHuman); assert.equal(g.u.mh, expectedMonster);
    });
