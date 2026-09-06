import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack } from '../js/cmd.js';
import { COULD_SEE, IN_SIGHT, ROOM, STONE } from '../js/const.js';
import { game, resetGame } from '../js/gstate.js';
import { MONS } from '../js/permonst.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { WERE_SPECIES } from '../js/were.js';

function installState(seed = 41) {
    resetGame();
    initRng(seed);
    game.flags = {};
    game.context = {};
    game.moves = 1;
    game.inventory = [];
    game.u = {
        ux: 5, uy: 5, uz: { dnum: 0, dlevel: 1 }, uhp: 1000, uhpmax: 1000,
        uen: 100, uenmax: 100, ulevel: 10, uexp: 0, uhunger: 900, uluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        abase: { a: [10, 10, 10, 10, 10, 10] },
        amax: { a: [18, 18, 18, 18, 18, 18] },
        ualign: { type: 0, record: 0 },
    };
    const cells = Array.from({ length: 80 }, (_, x) => Array.from({ length: 21 }, (_, y) => ({
        typ: x > 0 && x < 75 && y === 5 ? ROOM : STONE,
        roomno: 0, flags: 0, doormask: 0, wall_info: 0, lit: true,
    })));
    game.level = { flags: {}, monsters: [], objects: [], traps: [], rooms: [], engravings: [],
        at: (x, y) => cells[x]?.[y] };
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
}

function monster(name = 'wolf', props = {}) {
    const species = MONS.find(row => row.name.toLowerCase() === name.toLowerCase());
    const mon = { m_id: 101, mx: 6, my: 5, mhp: 200, mhpmax: 200,
        m_lev: species.lvl, mcanmove: true, mcansee: true, minvent: [],
        data: { ...species, mlevel: species.lvl, mac: species.ac, glyph: species.sym }, ...props };
    game.level.monsters.push(mon);
    return mon;
}

async function cast(name, direction = 'l') {
    game._casting_spell = { name, level: 2, skill: 'attack' };
    game._command_mode = 'spellDirection';
    await rhack(direction);
}

// zap.c:resist completes death before bhitm resumes, including life saving.
for (const [spell, species] of [['force bolt', 'wolf'], ['turn undead', 'kobold zombie'], ['healing', 'Pestilence']]) {
    test(`${spell} runs the shared monster death pipeline after lethal resist damage`, async () => {
        installState();
        const mon = monster(species, { mhp: 1, mr: 0, mac: 20 });
        const gold = { kind: 'gold piece', cls: 'coin', glyph: '$', quan: 7 };
        mon.minvent.push(gold);
        await cast(spell);
        assert.equal(mon.dead, true);
        assert.ok(!game.level.monsters.includes(mon));
        assert.ok(game.level.objects.includes(gold), 'inventory is dropped by death handling');
    });
}

for (const spell of ['force bolt', 'turn undead']) {
    test(`${spell} retains a monster revived by its worn life-saving amulet`, async () => {
        installState();
        const mon = monster('vampire bat', { mhp: 1, mac: 20, vampshifter: spell === 'turn undead' });
        mon.minvent.push({ kind: 'amulet of life saving', cls: 'amulet', amuletIndex: 1, worn: true });
        await cast(spell);
        assert.ok(game.level.monsters.includes(mon));
        assert.equal(mon.dead, false);
        assert.equal(mon.minvent.length, 0);
        assert.ok(mon.mhp > 0);
    });
}

// zap.c:cancel_monst sets mcan and normal_shape; invisibility and cooldown
// are independent state and the target's inventory is not self-cancelled.
for (const resist of [false, true]) {
    test(`cancellation ${resist ? 'resistance preserves' : 'sets'} mcan without clearing invisibility or cooldown`, async () => {
        installState();
        const mon = monster(resist ? 'gnomish wizard' : 'wolf', { minvis: true, mspec_used: 17 });
        if (resist) {
            game.coreCtx.r = [0n, 0n, 0n]; game.coreCtx.n = 3;
        }
        const wand = { cls: 'wand', kind: 'wand of digging', spe: 4, blessed: true };
        mon.minvent.push(wand);
        await cast('cancellation');
        assert.equal(Boolean(mon.mcan), !resist);
        assert.equal(mon.minvis, true);
        assert.equal(mon.mspec_used, 17);
        assert.equal(wand.spe, 4);
        assert.equal(wand.blessed, true);
    });
}

test('cancellation kills a clay golem after erasing its writing', async () => {
    installState();
    const mon = monster('clay golem', { mr: 0 });
    await cast('cancellation');
    assert.equal(mon.mcan, 1);
    assert.equal(mon.dead, true);
    assert.match(game._pending_message, /writing vanishes/);
});

test('cancellation returns a shapeshifter to its base form and disables further shifting', async () => {
    installState();
    const mon = monster('wolf', { cham: 'chameleon', mr: 0 });
    await cast('cancellation');
    assert.equal(mon.data.name, 'chameleon');
    assert.equal(mon.cham, -1);
    assert.equal(mon.mcan, 1);
});

test('lateral stone-to-flesh transforms a stone golem and a floor boulder', async () => {
    installState();
    const mon = monster('stone golem');
    game.level.objects.push({ kind: 'boulder', otyp: 474, cls: 'rock', glyph: '`', ox: 7, oy: 5, quan: 1 });
    await cast('stone to flesh');
    assert.equal(mon.data.name, 'flesh golem');
    assert.ok(game.level.objects.some(item => /meat/.test(item.kind)));
    assert.doesNotMatch(game._pending_message, /You cast stone to flesh/);
});

for (const [species, immune] of [['wolf', false], ['kobold zombie', true], ['water demon', true], ['iron golem', true], ['gray dragon', true]]) {
    test(`finger of death ${immune ? 'spares' : 'kills'} ${species}`, async () => {
        installState();
        const mon = monster(species, { mac: 30 });
        await cast('finger of death');
        assert.equal(Boolean(mon.dead), !immune);
        if (immune) assert.equal(mon.mhp, 200);
    });
}

test('Death absorbs a death spell, heals, and increases maximum HP', async () => {
    installState();
    const mon = monster('Death', { mhp: 20, mhpmax: 100, mac: 30 });
    await cast('finger of death');
    assert.equal(mon.mhpmax, 150);
    assert.equal(mon.mhp, 150);
});

test('a cold spell damages a living target and spares a cold-resistant species', async () => {
    for (const [name, immune] of [['wolf', false], ['white dragon', true]]) {
        installState();
        const mon = monster(name, { mac: 30 });
        await cast('cone of cold');
        assert.equal(mon.mhp === 200, immune);
        assert.doesNotMatch(game._pending_message || '', /You cast cone of cold/);
    }
});

test('hostile Erinys responds to a harmful spell by waking monsters across the level', async () => {
    installState();
    monster('erinys', { mr: 0, mpeaceful: false });
    const sleeper = monster('wolf', { mx: 40, msleeping: 1 });
    await cast('slow monster');
    assert.equal(sleeper.msleeping, 0);
});

// mon.c:normal_shape calls new_were even when cham is NON_PM.
test('cancellation restores a werewolf beast to human form', async () => {
    installState();
    const beast = WERE_SPECIES.get('werewolf').beast;
    const mon = monster('werewolf', { data: { ...beast }, mr: 0 });
    await cast('cancellation');
    assert.equal(mon.wereHuman, true);
    assert.equal(mon.mcan, 1);
});

for (const protection of ['none', 'blind', 'stoneResistance', 'reflecting', 'cancelled', 'monsterBlind']) {
    test(`Medusa's immediate-spell response respects ${protection}`, async () => {
        installState();
        const mon = monster('Medusa', { mr: 0 });
        if (['blind', 'stoneResistance', 'reflecting'].includes(protection)) game.u[protection] = true;
        if (protection === 'cancelled') mon.mcan = 1;
        if (protection === 'monsterBlind') mon.mcansee = false;
        await cast('slow monster');
        assert.equal(game.u.uhp === 0, protection === 'none');
        assert.equal(Boolean(mon.dead), protection === 'reflecting');
        if (protection === 'reflecting')
            assert.ok(game.level.objects.some(item => /statue/i.test(item.kind || '')));
    });
}

test('Medusa response consumes hero life saving and enters the shared revival flow', async () => {
    installState();
    monster('Medusa', { mr: 0 });
    const amulet = { kind: 'amulet of life saving', cls: 'amulet', worn: true, letter: 'a' };
    game.inventory.push(amulet);
    await cast('slow monster');
    assert.ok(!game.inventory.includes(amulet));
    assert.ok(game._life_saving_clear_stoning);
    assert.ok(game._queued_messages_after_more.some(entry => entry.lifeSaving));
    await rhack(' ');
    assert.equal(game._command_mode, 'lifeSavingMore');
});

test('a death ray can kill two targets and preserves a life-saved target', async () => {
    installState();
    const first = monster('wolf', { mac: 30 });
    const second = monster('wolf', { m_id: 102, mx: 7, mac: 30 });
    await cast('finger of death');
    assert.equal(first.dead, true);
    assert.equal(second.dead, true);
    installState();
    const saved = monster('wolf', { mac: 30 });
    saved.minvent.push({ kind: 'amulet of life saving', cls: 'amulet', amuletIndex: 1, worn: true });
    await cast('finger of death');
    assert.equal(saved.dead, false);
    assert.ok(saved.mhp > 0);
    assert.equal(saved.minvent.length, 0);
});

for (const distance of [1, 2]) {
    test(`a deaf hero's spell ${distance === 1 ? 'does' : 'does not'} trigger a shrieker at distance ${distance}`, async () => {
        installState();
        game.u._deafTimeout = 10;
        monster('shrieker', { mx: 5 + distance, mr: 0 });
        const sleeper = monster('wolf', { mx: 40, msleeping: 1 });
        await cast('slow monster');
        assert.equal(sleeper.msleeping, distance === 1 ? 0 : 1);
        assert.doesNotMatch(game._pending_message || '', /shrieks/);
    });
}
