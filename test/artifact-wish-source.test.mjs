import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, pickupObjectName } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { ROOM, ANTIMAGIC, A_WIS } from '../js/const.js';
import { MONS, PM_WEREWOLF } from '../js/permonst.js';

function setup(hero = {}) {
    resetGame(); initRng(41);
    Object.assign(game, { moves: 100, flags: { debug: true, verbose: true }, context: {}, inventory: [],
        _startup_role: 'Knight', _startup_align: 'lawful', _startup_race: 'human', level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10, uhp: 200, uhpmax: 200,
            uen: 100, uenmax: 100, uhunger: 900, umovement: 0, ublesscnt: 0,
            acurr: { a: [18, 18, 18, 18, 18, 18] }, ualign: { type: 1, record: 10 }, uprops: [], ...hero } });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset(); enableRngLog({ reset: true });
}

async function wish(text) {
    await rhack('\x17');
    for (const ch of text + '\n') await rhack(ch.charCodeAt(0));
}

async function dismissWish() {
    const messages = [game._pending_message];
    for (let i = 0; /WishMore$/.test(game._command_mode) && i < 20; i++) {
        await rhack(' ');
        messages.push(game._pending_message);
    }
    assert.equal(game._command_mode, null);
    return messages.join('  ');
}

for (const antimagic of [false, true]) {
    test(`wished Stormbringer blasts before inventory feedback with antimagic=${antimagic}`, async () => {
        setup();
        if (antimagic) game.u.uprops[ANTIMAGIC] = { intrinsic: 1 };
        await wish('uncursed +0 Stormbringer');
        assert.ok(game.u.uhp < 200);
        assert.match(game._pending_message, /blasted by the runed broadsword named Stormbringer's power!/);
        assert.equal(game._command_mode, 'heldWishMore');
        assert.equal(game.inventory[0].artifact, 'Stormbringer');
        assert.equal(game.level.objects.length, 0);
        assert.equal(game.u.ublesscnt, 0, 'the wish has not returned before prinv feedback');
        assert.equal(getRngLog().filter(call => call.startsWith(`d(${antimagic ? 2 : 4},10)`)).length, 1);
        const damage = 200 - game.u.uhp;
        await dismissWish();
        assert.equal(game.u.uhp, 200 - damage);
        assert.ok(game.u.ublesscnt >= 50);
        assert.equal(game.u.uconduct.wishes, 1);
        assert.equal(game.u.uconduct.wisharti, 1);
        assert.equal(game.flags.verbose, true);
    });
}

for (const restore of [false, true]) {
    test(`a refused wished quest artifact remains on the floor through its message, restored=${restore}`, async () => {
        setup({ ualign: { type: 0, record: 10 } });
        await wish('The Orb of Detection');
        assert.equal(game._command_mode, 'artifactWishMore');
        assert.equal(game.inventory.length, 0);
        assert.equal(game.level.objects.length, 1);
        assert.equal(game._wish_object.item, game.level.objects[0]);
        assert.equal(game.u.ublesscnt, 0);
        const calls = getRngLog().length;
        const hp = game.u.uhp;
        if (restore) {
            const saved = encodeSaveState(), { coreCtx, displayCtx, rng } = game;
            resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
        }
        const original = game.level.objects[0];
        await rhack('x');
        assert.equal(getRngLog().length, calls);
        assert.equal(game.u.uhp, hp);
        const message = await dismissWish();
        assert.match(message, /The glass orb named the Orb of Detection evades your grasp!/);
        assert.doesNotMatch(message, /Oops!|beyond your control|can't handle/);
        assert.equal(game.level.objects[0], original);
        assert.equal(game.inventory.length, 0);
        assert.equal(game._wish_object, null);
        assert.ok(game.u.ublesscnt >= 50);
        assert.equal(getRngLog().filter(call => call.startsWith('d(4,10)')).length, 1);
    });
}

for (const artifact of ['Sting', 'Orcrist', 'Werebane']) {
    test(`wishing ${artifact} permits a racial bane without retouch handling`, async () => {
        setup(artifact === 'Werebane' ? { ulycn: PM_WEREWOLF } : {});
        if (artifact !== 'Werebane') game._startup_race = 'orc';
        await wish(artifact);
        const message = await dismissWish();
        assert.equal(game.inventory[0].artifact, artifact);
        assert.doesNotMatch(message, /can't handle/);
        assert.equal(game.level.objects.length, 0);
    });
}

for (const lifeSaving of [false, true]) {
    test(`wished artifact resumes from ${lifeSaving ? 'life saving' : 'wizard refusal'} with the same floor object`, async () => {
        setup({ uhp: 1 });
        if (lifeSaving) game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1,
            worn: true, letter: 'a', quan: 1 });
        await wish('Stormbringer');
        assert.equal(game._command_mode, 'artifactWishMore');
        assert.doesNotMatch(game._pending_message, /You die/);
        await rhack(' ');
        assert.equal(game._command_mode, lifeSaving ? 'lifeSavingMore' : 'deathDieMore');
        const original = game.level.objects[0];
        assert.equal(original.artifact, 'Stormbringer');
        assert.ok(!game.inventory.includes(original));
        assert.equal(game._wish_object.item, original);
        assert.equal(game.u.ublesscnt, 0);
        assert.equal(game.u._aexe?.[A_WIS] || 0, 0);
        const calls = getRngLog().length;
        await rhack('x');
        assert.equal(getRngLog().length, calls);
        await rhack(' ');
        if (!lifeSaving) await rhack('n');
        await dismissWish();
        assert.equal(game.inventory.find(item => item.artifact === 'Stormbringer'), original);
        assert.equal(game.level.objects.length, 0);
        assert.equal(game._wish_object, null);
        assert.equal(getRngLog().filter(call => call.startsWith('d(4,10)')).length, 1);
        assert.ok(game.u.uhp > 0);
        assert.ok(game.u.ublesscnt >= 50);
    });
}

test('losing polymorph form during wish contact drops an otherwise permitted artifact', async () => {
    setup({ _polyself_form: MONS.find(mon => mon.name === 'kitten'), mh: 1, mhmax: 10 });
    await wish('Stormbringer');
    const message = await dismissWish();
    assert.match(message, /You return to human form!/);
    assert.match(message, /Oops!.*Stormbringer drops to the floor!/);
    assert.equal(game.u._polyself_form, null);
    assert.equal(game.u.uhp, 200);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects[0].artifact, 'Stormbringer');
    assert.equal(getRngLog().filter(call => call.startsWith('d(4,10)')).length, 1);
});

test('escape dismisses wish contact feedback without skipping the remaining holding effects', async () => {
    setup({ ualign: { type: 0, record: 10 } });
    await wish('The Orb of Detection');
    assert.equal(game._command_mode, 'artifactWishMore');
    await rhack('\x1b');
    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects[0].artifact, 'The Orb of Detection');
    assert.ok(game.u.ublesscnt >= 50);
    assert.equal(game.flags.verbose, true);
});

for (const [name, description] of [
    ['Stormbringer', 'runed broadsword'], ['Orcrist', 'runed broadsword'], ['Sting', 'runed dagger'],
    ['Grimtooth', 'crude dagger'], ['Cleaver', 'double-headed axe'], ['Snickersnee', 'samurai sword'],
    ['The Tsurugi of Muramasa', 'long samurai sword'], ['The Orb of Detection', 'glass orb'],
    ['The Orb of Fate', 'glass orb'], ['The Heart of Ahriman', 'gray stone'],
    ['The Magic Mirror of Merlin', 'looking glass'], ['The Eyes of the Overworld', 'pair of lenses'],
    ['The Master Key of Thievery', 'key'], ['The Mitre of Holiness', 'crystal helmet'],
    ['The Eye of the Aethiopica', 'circular amulet'],
]) {
    test(`unidentified artifact ${name} retains its C base description`, async () => {
        setup(); await wish(name); await dismissWish();
        const item = [...game.inventory, ...game.level.objects].find(item => item.artifact === name);
        assert.equal(pickupObjectName(item), `${description} named ${name.replace(/^The /, 'the ')}`);
        assert.equal(item.known, false);
    });
}

for (const [name, description] of [['Stormbringer', 'runed broadsword'],
    ['The Orb of Detection', 'glass orb'], ['The Eye of the Aethiopica', 'amulet']]) {
    test(`blind artifact wish ${name} does not disclose its instance name`, async () => {
        setup({ blind: true }); await wish(name); await dismissWish();
        const item = [...game.inventory, ...game.level.objects].find(item => item.artifact === name);
        assert.equal(item.dknown, false);
        assert.equal(pickupObjectName(item), description);
    });
}

test('artifact blast possessives follow C s_suffix for a name ending in s', async () => {
    setup(); await wish('The Mitre of Holiness');
    assert.match(game._pending_message, /the Mitre of Holiness' power!/);
    assert.doesNotMatch(game._pending_message, /Holiness's/);
    await dismissWish();
});
