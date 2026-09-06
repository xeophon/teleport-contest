import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { artifactDefinitionForName } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STONE, POOL, LAVAPOOL, PIT, HOLE, TRAPDOOR, STATUE_TRAP, W_WEP, W_SWAPWEP } from '../js/const.js';
import { MONS, PM_COCKATRICE } from '../js/permonst.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

async function setup({ sokoban = false, trapType = STATUE_TRAP } = {}) {
    resetGame(); initRng(31); game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
    game.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 10 }];
    if (sokoban) game.sokoban_dnum = 0;
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 2 }, uhp: 100, uhpmax: 100,
        ulevel: 10, uhunger: 900, acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: 0, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const def = artifactDefinitionForName('The Heart of Ahriman');
    const heart = { id: 1, artifact: def.name, cls: def.cls, kind: def.base, otyp: def.otyp,
        glyph: def.glyph, letter: 'a', quan: 1, age: 0 };
    game.inventory = [heart]; vision_reset();
    await invoke();
    const trap = { tx: 10, ty: 10, ttyp: trapType };
    game.level.traps.push(trap);
    return { heart, trap };
}

async function invoke() {
    game._command_mode = 'invokeObject'; game._pending_message = ''; game._message_more = 0;
    await rhack('a');
}

function restoreCommandState() {
    // The real restore caller retains the separately initialized RNG contexts.
    const { coreCtx, displayCtx, rng } = game;
    restoreSaveState(encodeSaveState());
    Object.assign(game, { coreCtx, displayCtx, rng });
}

function wieldCorpse({ alternate = false, numeric = false } = {}) {
    const corpse = { id: alternate ? 3 : 2, letter: alternate ? 'c' : 'b', otyp: 'corpse',
        cls: 'food', kind: numeric ? 'corpse' : 'cockatrice corpse', quan: 1,
        corpsenm: numeric ? PM_COCKATRICE : MONS[PM_COCKATRICE],
        owornmask: alternate ? W_SWAPWEP : W_WEP };
    game.inventory.push(corpse);
    game.u[alternate ? 'uswapwep' : 'uwep'] = corpse;
    return corpse;
}

for (const type of [HOLE, TRAPDOOR]) for (const blocked of ['hard floor', 'bottom', 'invocation']) {
    test(`float_down skips ${type === HOLE ? 'hole' : 'trapdoor'} before revelation on ${blocked}`, async () => {
        const { trap } = await setup({ trapType: type });
        if (blocked === 'hard floor') game.level.flags.hardfloor = true;
        if (blocked === 'bottom') game.u.uz.dlevel = 10;
        if (blocked === 'invocation') {
            game.dungeons[0].name = 'Gehennom'; game.u.uz.dlevel = 9;
        }
        enableRngLog({ reset: true });
        await invoke();
        assert.equal(!!trap.tseen, false);
        assert.equal(game._deferred_level_goto ?? null, null);
        assert.equal(getRngLog().some(entry => entry.startsWith('rn2(5)')), false,
            'eligibility is checked before dotrap escape randomness');
        assert.match(game._pending_message, /float gently/);
    });
}

for (const hallucinating of [false, true]) test(`Sokoban wind fall${hallucinating ? ' while hallucinating' : ''} precedes trap activation`, async () => {
    await setup({ sokoban: true }); game.u.hallucinating = hallucinating;
    enableRngLog({ reset: true }); await invoke();
    assert.ok(game.u.uhp >= 98 && game.u.uhp <= 99);
    assert.match(game._pending_message, hallucinating ? /Bummer!  You've crashed/ : /You fall over/);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(2)')).length, 1);
    assert.doesNotMatch(game._pending_message, /float gently/);
});

test('Sokoban wind damage does not receive half-physical reduction', async () => {
    await setup({ sokoban: true }); game.u.halfPhysicalDamage = true;
    initRng(1); enableRngLog({ reset: true }); await invoke();
    const rolled = Number(getRngLog().find(entry => entry.startsWith('rnd(2)'))?.match(/=\s*(\d+)/)?.[1]);
    assert.equal(game.u.uhp, 100 - rolled);
});

for (const recovery of ['amulet', 'wizard']) test(`lethal wind fall resumes through saved ${recovery} prompt before selftouch`, async () => {
    await setup({ sokoban: true }); game.u.uhp = 1;
    if (recovery === 'amulet') game.inventory.push({ id: 4, letter: 'd', cls: 'amulet',
        kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    else game.flags.debug = true;
    enableRngLog({ reset: true }); await invoke();
    assert.equal(game._command_mode, recovery === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
    assert.equal(game._death_cause, 'dangerous winds');
    assert.equal(game.context.move, 0);
    restoreCommandState();
    const before = getRngLog().filter(entry => entry.startsWith('rnd(2)')).length;
    await rhack(' '); if (recovery === 'wizard') await rhack('n');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(game.context.move, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(2)')).length, before);
});

for (const gloves of [false, true]) test(`Sokoban selftouch with${gloves ? '' : 'out'} gloves petrifies before the trap`, async () => {
    await setup({ sokoban: true }); const corpse = wieldCorpse({ numeric: true });
    if (gloves) game.inventory.push({ letter: 'd', cls: 'armor', kind: 'leather gloves', worn: true });
    game.inventory.push({ id: 4, letter: 'e', cls: 'amulet', kind: 'amulet of life saving',
        amuletIndex: 1, worn: true, quan: 1 });
    await invoke();
    assert.equal(game._command_mode, 'lifeSavingMore');
    assert.match(game._pending_message, /As you fall, you touch the cockatrice corpse.*turn to stone/s);
    await rhack(' ');
    assert.equal(game.u.uwep, gloves ? corpse : null);
    assert.equal(corpse.owornmask, gloves ? W_WEP : 0);
    assert.equal(game.inventory.includes(corpse), true);
    assert.equal(game._artifact_float_continuation, null);
});

for (const resistant of [false, true]) test(`Sokoban secondary corpse requires active dual wielding${resistant ? ' and respects resistance' : ''}`, async () => {
    await setup({ sokoban: true }); wieldCorpse({ alternate: true }); game.u.stoneResistance = resistant;
    await invoke(); assert.notEqual(game._command_mode, 'deathDieMore');
    game.u.twoweap = true; game.inventory[0].age = 0; await invoke(); await invoke();
    assert.equal(game._command_mode === 'deathDieMore', !resistant);
});

for (const species of ['floating eye', 'red dragon']) test(`ending levitation on a ${species} uses the saddle landing message`, async () => {
    await setup(); game.u.usteed = { data: MONS.find(mon => mon.name === species), mhp: 80 };
    await invoke(); assert.match(game._pending_message, /settle more firmly in the saddle/);
    assert.doesNotMatch(game._pending_message, /now flying|float gently/);
});

for (const resistant of [false, true]) test(`Sokoban primary corpse ${resistant ? 'resistance' : 'wizard survival'} preserves source weapon cleanup`, async () => {
    await setup({ sokoban: true });
    const corpse = wieldCorpse(); game.flags.debug = true; game.u.stoneResistance = resistant;
    await invoke();
    if (resistant) {
        assert.equal(game.u.uwep, corpse);
        assert.equal(game._command_mode, null);
    } else {
        assert.equal(game._command_mode, 'deathDieMore');
        restoreCommandState();
        await rhack(' '); await rhack('n');
        assert.equal(game.u.uwep, null);
        assert.equal(game.inventory.find(obj => obj.id === corpse.id).owornmask, 0);
    }
    assert.equal(game._artifact_float_continuation, null);
});

test('Sokoban selftouch transforms a golem before instant petrification', async () => {
    await setup({ sokoban: true }); const corpse = wieldCorpse({ numeric: true });
    game.u._polyself_form = { ...MONS.find(mon => mon.name === 'flesh golem'), glyph: "'", mlet: "'" };
    game.u._polyself_base = { uhp: 100, uhpmax: 100 }; game.u.mh = game.u.mhmax = 100;
    await invoke();
    assert.equal(game.u._polyself_form?.name, 'stone golem');
    assert.equal(game.u.uwep, corpse);
    assert.doesNotMatch(game._pending_message, /You turn to stone\.\.\./);
    assert.equal(game._artifact_float_continuation, null);
});

test('a genocided stone golem cannot rescue a falling flesh golem', async () => {
    await setup({ sokoban: true }); wieldCorpse({ numeric: true });
    game.u._polyself_form = { ...MONS.find(mon => mon.name === 'flesh golem'), glyph: "'", mlet: "'" };
    game.u.mh = game.u.mhmax = 100; game._genocided_monsters = ['stone golem'];
    await invoke();
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game._death_bones_body, 'statue');
});

test('Sokoban without a trap has no wind damage or selftouch', async () => {
    await setup({ sokoban: true }); wieldCorpse(); game.level.traps = [];
    enableRngLog({ reset: true }); await invoke();
    assert.equal(game.u.uhp, 100);
    assert.match(game._pending_message, /float gently/);
    assert.equal(getRngLog().some(entry => entry.startsWith('rnd(2)')), false);
});

function ridingPony() {
    const steed = { id: 5, data: MONS.find(mon => mon.name === 'pony'), mhp: 40, mhpmax: 40,
        mx: game.u.ux, my: game.u.uy, mtame: 10, pet: true, minvent: [] };
    game.u.usteed = steed; game.u.ugallop = 20;
    return steed;
}

test('Sokoban fall dismounts before selftouch and leaves the steed at the former position', async () => {
    await setup({ sokoban: true }); const steed = ridingPony();
    enableRngLog({ reset: true }); await invoke();
    assert.equal(game.u.usteed, null); assert.equal(game.u.ugallop, 0);
    assert.ok(game.level.monsters.includes(steed));
    assert.deepEqual([steed.mx, steed.my], [10, 10]);
    assert.notDeepEqual([game.u.ux, game.u.uy], [10, 10]);
    assert.match(game._pending_message, /You fall over.*fall off of the pony/s);
    assert.ok(game.u._woundedLegTurns >= 5 && game.u._woundedLegTurns <= 9);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(10)')).length, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(5)')).length, 2,
        'one choice among five landing squares, then one wounded-leg duration');
});

for (const recovery of ['amulet', 'wizard']) test(`mounted riding damage resumes after saved ${recovery} before wounded legs`, async () => {
    await setup({ sokoban: true }); ridingPony(); game.u.uhp = 3;
    if (recovery === 'amulet') game.inventory.push({ letter: 'c', cls: 'amulet',
        kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    else game.flags.debug = true;
    enableRngLog({ reset: true }); await invoke();
    assert.equal(game._command_mode, recovery === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
    assert.equal(game._death_cause, 'riding accident');
    assert.ok(game.u.usteed); assert.equal(game.u._woundedLegTurns || 0, 0);
    restoreCommandState();
    await rhack(' '); if (recovery === 'wizard') await rhack('n');
    assert.equal(game.u.usteed, null); assert.ok(game.u._woundedLegTurns > 0);
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(10)')).length, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rn2(5)')).length, 2,
        'one choice among five landing squares, then one wounded-leg duration');
});

test('Sokoban dismount completes before a wielded corpse petrifies the rider', async () => {
    await setup({ sokoban: true }); const steed = ridingPony(); wieldCorpse();
    await invoke();
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.u.usteed, null); assert.ok(game.level.monsters.includes(steed));
    assert.match(game._pending_message, /fall off.*As you fall, you touch.*turn to stone/s);
});

for (const lifeSaving of [false, true]) test(`nested saddle float-down avoids duplicate Sokoban wind${lifeSaving ? ' after trap life saving' : ''}`, async () => {
    await setup({ sokoban: true }); ridingPony();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x, y).typ = STONE;
    game.level.at(10, 10).typ = game.level.at(11, 10).typ = ROOM;
    game.level.traps.push({ tx: 11, ty: 10, ttyp: PIT });
    if (lifeSaving) {
        game.u.uhp = 18; // This seed deals 1 wind, 14 riding, then 4 pit damage.
        game.inventory.push({ letter: 'e', cls: 'amulet', kind: 'amulet of life saving',
            amuletIndex: 1, worn: true, quan: 1 });
    }
    enableRngLog({ reset: true }); await invoke();
    if (lifeSaving) {
        assert.equal(game._command_mode, 'lifeSavingMore');
        assert.equal(game._death_cause, 'fell into a pit');
        restoreCommandState(); await rhack(' ');
    }
    assert.deepEqual([game.u.ux, game.u.uy], [11, 10]);
    assert.equal(game.u.usteed, null);
    assert.ok(game.u.utrap > 0);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(2)')).length, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(6)')).length, 1);
    assert.equal(game._artifact_float_continuation, null);
});

for (const terrain of [POOL, LAVAPOOL]) test(`a flying steed prevents liquid effects during artifact landing on terrain ${terrain}`, async () => {
    await setup(); game.u.usteed = { data: MONS.find(mon => mon.name === 'red dragon'), mhp: 80 };
    game.level.at(10, 10).typ = terrain;
    await invoke();
    assert.equal(game.u.uhp, 100);
    assert.equal(game._water_continuation ?? null, null);
    assert.equal(game._artifact_float_continuation, null);
    assert.match(game._pending_message, /settle more firmly in the saddle/);
    assert.doesNotMatch(game._pending_message, /fall into|burn|drown/);
});
