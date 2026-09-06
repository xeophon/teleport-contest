import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, P_SKILLED, P_BASIC, COULD_SEE, IN_SIGHT, M_SEEN_COLD, W_WEP } from '../js/const.js';
import { MONS } from '../js/permonst.js';
import { rhack } from '../js/cmd.js';
import { moveloop_core } from '../js/allmain.js';
import { resetInputState } from '../js/input.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(extra = {}, cols = 80) {
    resetGame(); resetInputState(); initRng(41); game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Barbarian'; game.inventory = []; game._known_spells = [];
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 1000, uhpmax: 1000,
        uhppeak: 1000, uen: 100, uenmax: 100, uhunger: 900, ulevel: 10,
        acurr: { a: [10, 18, 10, 10, 10, 10] }, ...extra };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.nhDisplay = { cols };
    game._command_mode = 'spellExplosionTarget';
    game._casting_spell = { name: 'cone of cold', skillLevel: P_SKILLED };
    game._spell_explosion_target = { x: 10, y: 10 };
    vision_reset(); game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    enableRngLog({ reset: true });
}

test('live movement waits for a saved explosion before spending its cast turn', async () => {
    setup({}, 35); await rhack('.'); saveRestore(); game.nhDisplay = null;
    try { await moveloop_core(); }
    catch (error) { if (!error.message.includes('Input queue empty')) throw error; }
    assert.equal(game.moves, 100); assert.equal(game.u.uhp, 1000);
    await finish(); game._pending_time_passed = 1;
    try { await moveloop_core(); }
    catch (error) { if (!error.message.includes('Input queue empty')) throw error; }
    assert.equal(game.moves, 101); assert.ok(game.u.uhp < 1000);
});

function saveRestore() {
    const { coreCtx, displayCtx, rng, nhDisplay } = game, state = encodeSaveState();
    resetGame(); restoreSaveState(state); Object.assign(game, { coreCtx, displayCtx, rng, nhDisplay });
}

async function finish() {
    const messages = [];
    for (let i = 0; i < 200 && (game._player_spell_continuation || game._message_more || game._command_mode); i++) {
        messages.push(game._pending_message || '');
        await rhack(game._command_mode === 'wizardDieConfirm' ? 'n' : ' ');
    }
    messages.push(game._pending_message || '');
    return messages.join('\n');
}

test('a narrow explosion pauses at caught feedback before inventory selection and direct HP loss', async () => {
    setup({}, 35); await rhack('.');
    assert.equal(game.u.uhp, 1000);
    assert.ok(game._player_spell_continuation);
    assert.deepEqual(getRngLog().map(row => row.split('=')[0]), ['rnd(8)']);
    saveRestore(); await finish(); assert.ok(game.u.uhp < 1000);
});

test('invalid explosion More input preserves the saved blast and scatter RNG', async () => {
    setup({}, 35); await rhack('.');
    const count = getRngLog().length;
    await rhack('x');
    assert.equal(getRngLog().length, count); assert.equal(game.u.uhp, 1000);
    assert.equal(game.context.move, 0);
});

for (const rescue of ['amulet', 'wizard'])
    test(`skilled explosions wait for saved ${rescue} recovery before scatter and subsequent blasts`, async () => {
        setup({ uhp: 1 }); game.flags.debug = rescue === 'wizard';
        if (rescue === 'amulet') game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of life saving', worn: true, quan: 1 });
        await rhack('.');
        assert.ok(game._player_spell_continuation);
        assert.equal(getRngLog().filter(row => row.startsWith('rnd(3)')).length, 0);
        const count = Number(getRngLog().find(row => row.startsWith('rnd(8)')).split('=')[1]) + 1;
        saveRestore(); const messages = await finish();
        assert.equal(getRngLog().filter(row => row.startsWith('rnd(3)')).length, count * 2);
        assert.ok(game.u.uhp > 0 && game.u.uhp < 1000);
        assert.equal(game._player_spell_continuation, null); assert.equal(game.context.move, 1);
        assert.doesNotMatch(messages, /You die\.\.\./);
    });

test('direct explosion injury teaches resistance before its fatal feedback returns', async () => {
    setup({ uhp: 1 }, 35); game.flags.debug = true;
    const observer = { data: MONS.find(m => m.name === 'wolf'), mx: 15, my: 10, mhp: 100, m_seenres: M_SEEN_COLD };
    game.level.monsters.push(observer);
    await rhack('.');
    for (let i = 0; i < 10 && game.u.uhp > 0; i++) await rhack(' ');
    assert.ok(game._player_spell_continuation);
    assert.equal(observer.m_seenres & M_SEEN_COLD, 0);
    await finish();
});

test('an explosion damages carried potions during prayer invulnerability', async () => {
    setup({ uhp: 1, uinvulnerable: true }); initRng(1); game.flags.debug = true;
    game.inventory.push({ letter: 'p', cls: 'potion', kind: 'potion of healing', quan: 100 });
    await rhack('.');
    for (let i = 0; i < 20 && game.u.uhp > 0; i++) await rhack(' ');
    assert.ok(game.u.uhp <= 0, 'Invulnerable zeros the blast damage, but destroy_items still calls losehp');
    await finish(); assert.ok(game.u.uhp > 0);
});

for (const name of ['fireball', 'cone of cold'])
    for (const inUse of [false, true])
        test(`${name} saves a selected wielded potion stack before destruction, in_use=${inUse}`, async () => {
            setup({ coldResistance: true, fireResistance: true }, 35);
            const potion = { letter: 'p', cls: 'potion', kind: 'potion of water', quan: 100,
                in_use: inUse, owornmask: W_WEP, wielded: true };
            game.inventory.push(potion); game.u.uwep = potion;
            game._command_mode = 'spellDirection'; game._casting_spell = { name, skillLevel: P_BASIC };
            await rhack('.');
            let inventory;
            for (let i = 0; i < 20; i++) {
                inventory = game._player_spell_continuation?.state.inventory;
                if (inventory?.phase === (name === 'fireball' ? 'vapor' : 'damage')) break;
                await rhack(' ');
            }
            assert.ok(inventory?.destroyed > 0); assert.equal(potion.quan, 100);
            assert.equal(game.u.uwep, potion); const destroyed = inventory.destroyed;
            saveRestore(); await finish();
            const remaining = game.inventory.find(item => item.letter === 'p');
            assert.equal(remaining.quan, 100 - destroyed);
            assert.equal(game.u.uwep, null); assert.equal(remaining.owornmask, 0);
            assert.equal(remaining.wielded, false);
        });

test('saved self fireball feedback precedes inventory RNG and body injury', async () => {
    setup({}, 35); game._command_mode = 'spellDirection';
    game._casting_spell = { name: 'fireball', skillLevel: P_BASIC };
    await rhack('.');
    assert.equal(game.u.uhp, 1000);
    assert.deepEqual(getRngLog().map(row => row.split('=')[0]), ['d(6,6)']);
    saveRestore(); await finish(); assert.ok(game.u.uhp < 1000);
    assert.equal(getRngLog().filter(row => row.startsWith('d(6,6)')).length, 1);
});
