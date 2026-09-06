import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog, d, rn2, rnd } from '../js/rng.js';
import { MONS, PM_WEREWOLF } from '../js/permonst.js';
import { ROOM, STAIRS, W_WEP, W_ARMH } from '../js/const.js';
import { vision_reset } from '../js/vision.js';

function setup(artifact, options = {}) {
    resetGame(); initRng(71);
    game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = options.role || 'Knight';
    game._startup_align = options.startAlign || 'lawful';
    game._startup_race = options.race || 'human';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
        uhp: 200, uhpmax: 200, uen: 10, uenmax: 50, uhunger: 900,
        acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: options.align ?? 1, record: 10 },
        ...options.hero };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const item = { id: 1, artifact, kind: 'long sword', cls: 'weapon', letter: 'a', quan: 1, age: 0,
        ...options.item };
    game.inventory = [item]; vision_reset();
    return item;
}

async function use(mode = 'wieldObject') {
    game._command_mode = mode;
    await rhack('a');
}

for (const antimagic of [false, true]) {
    test(`self-willed artifact blast uses ${antimagic ? 2 : 4}d10 and still permits compatible class`, async () => {
        const item = setup('Stormbringer', { hero: { antimagic } });
        const damage = d(antimagic ? 2 : 4, 10);
        initRng(71); enableRngLog({ reset: true });
        await use();
        assert.equal(game.u.uhp, 200 - damage);
        assert.equal(item.wielded, true);
        assert.match(game._pending_message, /blasted by Stormbringer's power/);
        assert.equal(game.context.move, 1);
        assert.ok(getRngLog().some(entry => entry.startsWith(`d(${antimagic ? 2 : 4},10)`)));
    });
}

for (let seed = 1; seed <= 8; seed++) {
    test(`non-self-willed alignment blast branch for independent seed ${seed}`, async () => {
        const item = setup('Mjollnir');
        initRng(seed);
        const blasted = rn2(4) === 0;
        const damage = blasted ? d(4, 4) : 0;
        initRng(seed); enableRngLog({ reset: true });
        await use();
        assert.equal(game.u.uhp, 200 - damage);
        assert.equal(item.wielded, true);
        assert.equal(/blasted/.test(game._pending_message), blasted);
    });
}

test('hack_artifacts removes Excalibur role restriction for a lawful non-Knight', async () => {
    const item = setup('Excalibur', { role: 'Wizard' });
    enableRngLog({ reset: true });
    await use();
    assert.equal(game.u.uhp, 200);
    assert.equal(item.wielded, true);
    assert.deepEqual(getRngLog(), []);
});

test('quest artifact alignment uses original hero alignment after hack_artifacts', async () => {
    setup('The Mitre of Holiness', { role: 'Priest', startAlign: 'chaotic', align: -1 });
    await use('invokeObject');
    assert.equal(game.u.uhp, 200);
    assert.equal(game.u.uen, 30);
    assert.doesNotMatch(game._pending_message, /blasted/);
});

test('carried artifact refusal says beyond control and leaves cooldown untouched', async () => {
    const item = setup('The Orb of Detection', { align: 0 });
    await use('invokeObject');
    assert.match(game._pending_message, /Orb of Detection is beyond your control!/);
    assert.doesNotMatch(game._pending_message, /evades your grasp/);
    assert.equal(item.age, 0);
    assert.equal(game.u.invisible || false, false);
    assert.equal(game.context.move, 1);
});

for (const kind of ['Sting', 'Orcrist']) {
    test(`${kind} refuses an orc hero through bane matching even without alignment restriction`, async () => {
        const item = setup(kind, { race: 'orc', align: -1, startAlign: 'chaotic' });
        await use();
        assert.equal(!!item.wielded, false);
        assert.ok(game.u.uhp < 200);
        assert.match(game._pending_message, /can't handle/);
    });
}

test('polymorphed base orc no longer matches the artifact racial bane', async () => {
    const item = setup('Sting', { race: 'orc', hero: { _polyself_form: MONS.find(mon => mon.name === 'kitten') } });
    enableRngLog({ reset: true });
    await use();
    assert.equal(item.wielded, true);
    assert.equal(game.u.uhp, 200);
    assert.deepEqual(getRngLog(), []);
});

test('Werebane deals silver plus bane damage once and halves only the silver component', async () => {
    const item = setup('Werebane', { hero: { ulycn: PM_WEREWOLF, halfPhysicalDamage: true },
        item: { kind: 'silver saber', material: 'silver' } });
    const blasted = rn2(4) === 0;
    const damage = blasted ? d(4, 4) + Math.ceil(rnd(10) / 2) : Math.ceil(rnd(10) / 2) + rnd(10);
    initRng(71); enableRngLog({ reset: true });
    await use();
    assert.equal(game.u.uhp, 200 - damage);
    assert.equal(!!item.wielded, false);
    assert.match(game._pending_message, /can't handle/);
});

test('invoking ordinary silver object in a silver-hating form applies retouch damage', async () => {
    const item = setup(undefined, { hero: { ulycn: PM_WEREWOLF },
        item: { kind: 'silver saber', material: 'silver' } });
    const damage = rnd(10); initRng(71);
    await use('invokeObject');
    assert.equal(game.u.uhp, 200 - damage);
    assert.equal(item.age, 0);
    assert.match(game._pending_message, /can't handle/);
    assert.doesNotMatch(game._pending_message, /Nothing happens/);
});

test('retouch refusal unwields an active Sunsword and ends its light', async () => {
    const item = setup('Sunsword', { hero: { _polyself_form: MONS.find(mon => mon.name === 'skeleton'), mh: 200, mhmax: 200 },
        item: { wielded: true, owornmask: W_WEP, lamplit: true, burning: true } });
    game.u.uwep = item;
    await use('invokeObject');
    assert.equal(item.wielded, false);
    assert.equal(item.lamplit, false);
    assert.equal(game.u.uwep, null);
    assert.equal(game.inventory.includes(item), true);
    assert.equal(item.age, 0);
    assert.match(game._pending_message, /can't handle.*anymore/);
});

test('artifact blast damages polymorph HP without changing underlying HP', async () => {
    const item = setup('Stormbringer', { hero: { _polyself_form: MONS.find(mon => mon.name === 'kitten'), mh: 100, mhmax: 100 } });
    const damage = d(4, 10); initRng(71);
    await use();
    assert.equal(game.u.mh, 100 - damage);
    assert.equal(game.u.uhp, 200);
    assert.equal(item.wielded, true);
});

for (const mode of ['wieldObject', 'invokeObject']) for (const amulet of [true, false]) {
    test(`${mode} resumes after ${amulet ? 'life saving' : 'wizard refusal'} without repeating the artifact blast`, async () => {
        const item = setup('The Mitre of Holiness', { role: 'Priest', align: 0, hero: { uhp: 1 } });
        game.flags.debug = !amulet;
        if (amulet) game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1,
            worn: true, letter: 'b', quan: 1 });
        enableRngLog({ reset: true });
        await use(mode);
        assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
        assert.equal(game._message_more, 1, 'damage prompts must display the continuation marker');
        assert.equal(game.context.move, 0, 'a suspended touch must not complete the command turn');
        assert.equal(item.age, 0);
        assert.equal(!!item.wielded, false);
        assert.equal(game.u.uen, 10);
        const suspendedLog = getRngLog();
        await rhack('x');
        assert.deepEqual(getRngLog(), suspendedLog, 'unrelated prompt keys consume no RNG');
        await rhack(' ');
        if (!amulet) {
            assert.equal(game._command_mode, 'wizardDieConfirm');
            const confirmLog = getRngLog();
            await rhack('x');
            assert.deepEqual(getRngLog(), confirmLog);
            await rhack('n');
        }
        assert.equal(game._artifact_touch_state, null);
        assert.equal(game._artifact_retouch_command, null);
        assert.equal(game._artifact_retouch_result, null);
        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.equal(getRngLog().filter(entry => entry.startsWith('d(4,10)')).length, 1);
        assert.ok(game.u.uhp > 0);
        if (mode === 'wieldObject') assert.equal(item.wielded, true);
        else {
            assert.equal(game.u.uen, 30);
            assert.ok(item.age > game.moves);
        }
    });
}

for (const amulet of [true, false]) {
    test(`silver handling refusal continues removal after ${amulet ? 'life saving' : 'wizard refusal'}`, async () => {
        const item = setup(undefined, { hero: { ulycn: PM_WEREWOLF, uhp: 1 },
            item: { kind: 'silver saber', material: 'silver', wielded: true, owornmask: W_WEP } });
        game.u.uwep = item; game.flags.debug = !amulet;
        if (amulet) game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1,
            worn: true, letter: 'b', quan: 1 });
        enableRngLog({ reset: true });
        await use('invokeObject');
        assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
        assert.equal(item.wielded, true, 'C remove_worn_item follows the return from losehp');
        assert.equal(game.u.uwep, item);
        assert.equal(game._death_cause, 'handling a silver saber');
        await rhack(' ');
        if (!amulet) await rhack('n');
        assert.equal(game._artifact_touch_state, null);
        assert.equal(game._artifact_retouch_command, null);
        assert.equal(item.wielded, false);
        assert.equal(item.owornmask, 0);
        assert.equal(game.u.uwep, null);
        assert.ok(game.inventory.includes(item));
        assert.doesNotMatch(game._pending_message, /Nothing happens/);
        assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(10)')).length, 1);
    });
}

test('accepted wizard death cannot resume the invocation or award its effect', async () => {
    const item = setup('The Mitre of Holiness', { role: 'Priest', align: 0, hero: { uhp: 1 } });
    game.flags.debug = true;
    await use('invokeObject');
    await rhack(' ');
    assert.equal(game._command_mode, 'wizardDieConfirm');
    await rhack('y');
    assert.equal(game.u.uhp, 0);
    assert.equal(game.u.uen, 10);
    assert.equal(item.age, 0);
    assert.notEqual(game._command_mode, 'invokeObject');
});

test('blast that ends an undead polymorph rechecks the human form before bane refusal', async () => {
    const item = setup('Sunsword', { hero: { _polyself_form: MONS.find(mon => mon.name === 'skeleton'),
        _polyself_base: { uhp: 200, uhpmax: 200 }, mh: 1, mhmax: 1 } });
    initRng(5); // Independent RNG branch: non-self-willed touch blasts on rn2(4) == 0.
    assert.equal(rn2(4), 0); initRng(5);
    await use();
    assert.equal(game.u._polyself_form, null);
    assert.ok(game.u.uhp > 0);
    assert.equal(item.wielded, true);
    assert.doesNotMatch(game._pending_message, /can't handle/);
});

for (const [artifact, role, startAlign, align] of [
    ['Mjollnir', 'Valkyrie', 'lawful', 1], ['Cleaver', 'Barbarian', 'chaotic', -1],
    ['Magicbane', 'Wizard', 'chaotic', -1], ['Snickersnee', 'Samurai', 'neutral', 0],
]) test(`hack_artifacts applies original alignment to the ${role} gift ${artifact}`, async () => {
    const item = setup(artifact, { role, startAlign, align });
    enableRngLog({ reset: true });
    await use();
    assert.equal(item.wielded, true);
    assert.equal(game.u.uhp, 200);
    assert.deepEqual(getRngLog(), [], 'a matching gift alignment needs no hostile-touch roll');
});

for (const [name, hatesSilver] of [['skeleton', false], ['tengu', false], ['imp', true], ['shade', true]]) {
    test(`silver handling uses the C species predicate for ${name}`, async () => {
        const item = setup(undefined, { hero: { _polyself_form: MONS.find(mon => mon.name === name), mh: 100, mhmax: 100 },
            item: { kind: 'silver saber', material: 'silver' } });
        enableRngLog({ reset: true });
        await use();
        assert.equal(!!item.wielded, !hatesSilver);
        assert.equal(game.u.mh < 100, hatesSilver);
        if (!hatesSilver) assert.deepEqual(getRngLog(), []);
    });
}

test('negative alignment record triggers a blast even when artifact alignment matches', async () => {
    setup('Excalibur', { hero: { ualign: { type: 1, record: -1 } } });
    await use();
    assert.ok(game.u.uhp < 200);
    assert.match(game._pending_message, /blasted/);
});

test('numeric artifact identity receives the same touch damage and refusal', async () => {
    const item = setup(undefined, { race: 'orc', item: { oartifact: 7 } }); // C ART_STING
    await use();
    assert.equal(!!item.wielded, false);
    assert.ok(game.u.uhp < 200);
    assert.match(game._pending_message, /can't handle Sting/);
});

test('a cursed quest helm is removed immediately when retouch refuses it', async () => {
    const item = setup('The Mitre of Holiness', { align: -1, item: {
        cls: 'armor', kind: 'helm of brilliance', worn: true, cursed: true, spe: 0, owornmask: W_ARMH,
    } });
    game.u.uarmh = item;
    game._armor_wear_occupation = { itemLetter: 'a', turns: 5, action: 'wear' };
    await use('invokeObject');
    assert.equal(item.worn, false);
    assert.equal(game.u.uarmh, null);
    assert.equal(game._armor_wear_occupation, null);
    assert.equal(game.inventory.includes(item), true);
    assert.match(game._pending_message, /beyond your control/);
    assert.doesNotMatch(game._pending_message, /It is cursed|You were wearing/);
});

for (const position of ['invocation', 'stairs', 'elsewhere']) {
    test(`Bell of Opening silver exception at ${position}`, async () => {
        const item = setup(undefined, { hero: { ulycn: PM_WEREWOLF },
            item: { kind: 'Bell of Opening', cls: 'tool', material: 'silver' } });
        game.level.invocationPosition = { x: position === 'elsewhere' ? 11 : 10, y: 10 };
        if (position === 'stairs') game.level.at(10, 10).typ = STAIRS;
        enableRngLog({ reset: true });
        await use();
        assert.equal(!!item.wielded, position === 'invocation');
        assert.equal(game.u.uhp < 200, position !== 'invocation');
        if (position === 'invocation') assert.deepEqual(getRngLog(), []);
    });
}
