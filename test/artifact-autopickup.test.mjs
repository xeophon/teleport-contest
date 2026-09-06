import { WOUNDED_LEGS, LEFT_SIDE } from '../js/const.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { artifactDefinitionForName } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, PIT, HOLE, STATUE_TRAP, LOST_THROWN, LOST_DROPPED, LOST_STOLEN, LOST_EXPLODING } from '../js/const.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { autopickTestObject } from '../js/pickup.js';
import { MONS, PM_BLUE_JELLY } from '../js/permonst.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';

async function setup() {
    resetGame(); initRng(31); game.moves = 100; game.flags = { verbose: true, pickup: true }; game.context = {};
    game._autopickup = true; game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
    game.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 10 }];
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 2 }, uhp: 100, uhpmax: 100,
        ulevel: 10, uhunger: 900, acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: 0, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    const def = artifactDefinitionForName('The Heart of Ahriman');
    const heart = { id: 1, artifact: def.name, cls: def.cls, kind: def.base, otyp: def.otyp,
        glyph: def.glyph, letter: 'a', quan: 1, age: 0 };
    game.inventory = [heart]; vision_reset(); await invoke();
    return heart;
}
async function invoke() {
    game._command_mode = 'invokeObject'; game._pending_message = ''; game._message_more = 0;
    await rhack('a');
}
function floorItem(overrides = {}) {
    const obj = { id: 2, otyp: 10023, cls: 'weapon', kind: 'dagger', glyph: ')',
        quan: 1, ox: 10, oy: 10, known: true, dknown: true, ...overrides };
    game.level.objects.push(obj); return obj;
}
function restoreCommandState() {
    const { coreCtx, displayCtx, rng } = game;
    restoreSaveState(encodeSaveState()); Object.assign(game, { coreCtx, displayCtx, rng });
}

test('ending levitation picks up the exact floor object after landing', async () => {
    await setup(); const obj = floorItem(); await invoke();
    assert.ok(game.inventory.includes(obj)); assert.ok(!game.level.objects.includes(obj));
    assert.match(game._pending_message, /float gently.*dagger/s);
    assert.equal(obj.pickup_prev, 1); assert.equal(obj.how_lost, 0);
    assert.equal(game.context.move, 1);
});

test('automatic pickup processes the entire pile in floor-chain order', async () => {
    await setup(); const lower = floorItem(), upper = floorItem({ id: 3, kind: 'apple', cls: 'food', glyph: '%', otyp: 131 });
    await invoke();
    assert.ok(game.inventory.includes(upper)); assert.ok(game.inventory.includes(lower));
    assert.equal(upper.letter, 'b'); assert.equal(lower.letter, 'c');
});

for (const [loss, allowed] of [[0, true], [LOST_THROWN, true], [LOST_STOLEN, true], [LOST_DROPPED, false], [LOST_EXPLODING, false]]) {
    test(`automatic pickup follows source how_lost ${loss}`, async () => {
        await setup(); const obj = floorItem({ how_lost: loss }); await invoke();
        assert.equal(game.inventory.includes(obj), allowed);
    });
}

for (const loss of [LOST_THROWN, LOST_STOLEN]) for (const enabled of [false, true]) {
    test(`lost ${loss} pickup override ${enabled ? 'precedes' : 'defers to'} class filters`, async () => {
        await setup(); game._autopickup_types = '$';
        game.flags[loss === LOST_THROWN ? 'pickup_thrown' : 'pickup_stolen'] = enabled;
        const obj = floorItem({ how_lost: loss }); await invoke();
        assert.equal(game.inventory.includes(obj), enabled);
    });
}

test('disabling dropped-item exclusion permits pickup by class', async () => {
    await setup(); game.flags.dropped_nopick = false; const obj = floorItem({ how_lost: LOST_DROPPED });
    await invoke(); assert.ok(game.inventory.includes(obj));
});

test('gold obeys the class filter alongside ordinary objects', async () => {
    await setup(); game._autopickup_types = ')';
    const gold = floorItem({ cls: 'coin', glyph: '$', kind: 'gold piece', quan: 25, otyp: 11 });
    const dagger = floorItem({ id: 3 }); await invoke();
    assert.ok(game.level.objects.includes(gold)); assert.ok(game.inventory.includes(dagger));
    assert.equal(game._goldCount || 0, 0);
});

test('disabled automatic pickup still describes the remaining object', async () => {
    await setup(); game.flags.pickup = game._autopickup = false; const obj = floorItem();
    await invoke(); assert.ok(game.level.objects.includes(obj));
    assert.match(game._pending_message, /float gently.*You see here a dagger/s);
});

test('dropping the active Heart marks it dropped before landing pickup', async () => {
    const heart = await setup(); const obj = floorItem();
    game._command_mode = 'dropObject'; game._pending_message = ''; game._message_more = 0;
    await rhack('a');
    assert.ok(game.level.objects.includes(heart)); assert.equal(heart.how_lost, LOST_DROPPED);
    assert.ok(game.inventory.includes(obj)); assert.equal(heart.age, 0);
});

for (const answer of ['y', 'n', 'q']) test(`saved landing pickup burden answer ${answer} completes the artifact command once`, async () => {
    await setup(); game.u.acurr.a = [3, 3, 10, 10, 3, 10];
    game.u.uprops ??= []; game.u.uprops[WOUNDED_LEGS] = { intrinsic: 100, extrinsic: LEFT_SIDE };
    const later = floorItem({ id: 3, cls: 'scroll', glyph: '?', otyp: 293, kind: 'scroll of blank paper', scrollIndex: 21 });
    const heavy = floorItem({ id: 4, cls: 'food', glyph: '%', kind: 'food ration', otyp: 143, quan: 11 });
    enableRngLog({ reset: true }); await invoke();
    assert.equal(game._command_mode, 'pickupListBurdenConfirm');
    assert.equal(game.context.move, 0); assert.ok(game._artifact_float_continuation);
    const rolls = getRngLog().length; await rhack('x'); assert.equal(getRngLog().length, rolls);
    restoreCommandState(); await rhack(answer);
    assert.equal(game.inventory.some(obj => obj.id === heavy.id), answer === 'y');
    assert.equal(game.inventory.some(obj => obj.id === later.id), answer !== 'q');
    if (answer === 'q') {
        assert.equal(game._command_mode, 'pickupLookMore');
        await rhack(' ');
    }
    assert.equal(game._artifact_float_continuation, null); assert.equal(game.context.move, 1);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnz(100)')).length, 1);
});

test('a pit traps the landing hero before automatic pickup', async () => {
    await setup(); const obj = floorItem(); game.level.traps.push({ tx: 10, ty: 10, ttyp: PIT });
    await invoke(); assert.ok(game.u.utrap > 0); assert.ok(game.inventory.includes(obj));
    assert.match(game._pending_message, /fall into a pit.*dagger/s);
});

test('a deferred fall through a hole does not pick up the departing level pile', async () => {
    await setup(); const obj = floorItem(); game.level.traps.push({ tx: 10, ty: 10, ttyp: HOLE });
    await invoke(); assert.ok(!game.inventory.includes(obj));
    assert.ok(game._deferred_level_goto);
});

for (const recovery of ['amulet', 'wizard']) test(`fatal pickup aborts the pile after saved ${recovery} survival`, async () => {
    await setup(); const later = floorItem();
    const corpse = floorItem({ id: 3, otyp: 'corpse', cls: 'food', glyph: '%', kind: 'cockatrice corpse',
        corpsenm: { name: 'cockatrice' } });
    if (recovery === 'amulet') game.inventory.push({ id: 4, letter: 'd', cls: 'amulet',
        kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    else game.flags.debug = true;
    await invoke();
    assert.equal(game._command_mode, recovery === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
    assert.equal(game._floor_pickup_menu_pending.deathPending, true);
    restoreCommandState(); await rhack(' '); if (recovery === 'wizard') await rhack('n');
    assert.ok(!game.inventory.some(obj => [corpse.id, later.id].includes(obj.id)));
    // check_here must finish its remaining-pile menu before returning to float_down.
    while (game._message_more && game._command_mode !== 'pickupLookMore') await rhack(' ');
    assert.equal(game._command_mode, 'pickupLookMore'); assert.equal(game.context.move, 0);
    await rhack(' '); assert.equal(game._artifact_float_continuation, null);
    assert.equal(game.context.move, 1);
});

test('unknown scare scroll names its type before the next landing pickup', async () => {
    await setup(); const later = floorItem();
    game._object_descriptions = { scrolls: ['', '', '', 'TRYME TEST'] };
    const scroll = floorItem({ id: 3, otyp: 275, cls: 'scroll', glyph: '?', kind: 'scroll labeled TRYME TEST',
        actualKind: 'scroll of scare monster', scrollIndex: 3, cursed: true, known: false, bknown: false });
    await invoke(); assert.equal(game._command_mode, 'callScrollAfterMore');
    assert.ok(game.level.objects.includes(later)); assert.ok(game.level.objects.includes(scroll));
    restoreCommandState(); await rhack(' '); assert.equal(game._command_mode, 'callScrollText');
    await rhack('\x1b');
    assert.equal(game._artifact_float_continuation, null); assert.equal(game.context.move, 1);
    assert.ok(game.inventory.some(obj => obj.id === later.id));
    assert.ok(!game.level.objects.some(obj => obj.id === scroll.id));
});

for (const count of [1, 2, 4, 5]) test(`remaining ${count}-object pile follows source pile_limit`, async () => {
    await setup(); game.flags.pickup = false;
    for (let i = 0; i < count; i++) floorItem({ id: 2 + i });
    await invoke();
    if (count > 1 && count < 5) {
        assert.ok(game._artifact_float_continuation); assert.equal(game.context.move, 0);
        while (game._message_more && game._command_mode !== 'pickupLookMore') await rhack(' ');
        assert.equal(game._command_mode, 'pickupLookMore');
        assert.equal(game._overlay_lines.filter(row => row[2] === 'a dagger').length, count);
        restoreCommandState(); await rhack('\x1b');
        assert.equal(game._artifact_float_continuation, null); assert.equal(game.context.move, 1);
    } else assert.equal(game._artifact_float_continuation, null);
});

test('an excluded corpse still petrifies a blind hero checking the floor', async () => {
    await setup(); game.u.blind = true; game.flags.pickup = false;
    floorItem({ otyp: 'corpse', cls: 'food', glyph: '%', kind: 'cockatrice corpse', corpsenm: { name: 'cockatrice' } });
    game.inventory.push({ id: 4, letter: 'd', cls: 'amulet', kind: 'amulet of life saving',
        amuletIndex: 1, worn: true, quan: 1 });
    await invoke(); assert.equal(game._command_mode, 'lifeSavingMore');
    assert.match(game._death_cause, /touching.*corpse bare-handed/);
    restoreCommandState(); await rhack(' ');
    assert.equal(game._artifact_float_continuation, null); assert.equal(game.context.move, 1);
});

for (const [label, obj, options, expected] of [
    ['shop ownership overrides a thrown item', { how_lost: LOST_THROWN }, { costly: true }, false],
    ['shop ownership overrides a grab exception', {}, { costly: true, exceptions: [{ pattern: '.', grab: true }] }, false],
    ['free shop goods may be picked up', { no_charge: true }, { costly: true }, true],
    ['throw priority precedes exclusion exceptions', { how_lost: LOST_THROWN }, { types: '$', exceptions: [{ pattern: '.', grab: false }] }, true],
    ['dropped priority precedes grab exceptions', { how_lost: LOST_DROPPED }, { exceptions: [{ pattern: '.', grab: true }] }, false],
    ['exploding always rejects', { how_lost: LOST_EXPLODING }, { dropped: false }, false],
    ['first matching exception wins', {}, { types: ')', exceptions: [{ pattern: 'dagger', grab: false }, { pattern: '.', grab: true }] }, false],
    ['grab exceptions override class', {}, { types: '$', exceptions: [{ pattern: 'dagger', grab: true }] }, true],
    ['nonmatching exceptions preserve class', {}, { types: ')', exceptions: [{ pattern: 'apple', grab: false }] }, true],
]) test(`C autopick_testobj: ${label}`, () => {
    assert.equal(autopickTestObject({ glyph: ')', ...obj }, { name: 'a dagger', ...options }), expected);
});

test('canonical no-take form leaves the pile and reports its limitation', async () => {
    await setup(); game.u._polyself_form = MONS[PM_BLUE_JELLY];
    const obj = floorItem(); await invoke();
    assert.ok(game.level.objects.includes(obj));
    assert.match(game._pending_message, /see here.*physically incapable/s);
});

test('the attached chain is neither selected nor counted by check_here', async () => {
    await setup(); const chain = floorItem({ cls: 'chain', glyph: '_', kind: 'iron chain' });
    game.u.uchain = chain;
    await invoke(); assert.ok(game.level.objects.includes(chain));
    assert.doesNotMatch(game._pending_message, /see here|iron chain/);
});

test('saved pickup response spends the movement cost of its new heavy load', async () => {
    await setup(); resetInputState(); game.u.acurr.a = [3, 3, 10, 10, 3, 10];
    game.u.uprops ??= []; game.u.uprops[WOUNDED_LEGS] = { intrinsic: 100, extrinsic: LEFT_SIDE }; game.u.umovement = 12;
    floorItem({ cls: 'food', glyph: '%', kind: 'food ration', otyp: 143, quan: 11 });
    game.level.regions = [{ type: 'gas_cloud', damage: 0, ttl: 5, coords: [{ x: 50, y: 10 }] }];
    game._command_mode = 'invokeObject'; game._pending_message = ''; game._message_more = 0;
    pushKey('a'); await moveloop_core();
    assert.equal(game.moves, 100); assert.equal(game._command_mode, 'pickupListBurdenConfirm');
    restoreCommandState(); pushKey('y'); await moveloop_core();
    assert.equal(game._artifact_float_continuation, null);
    while (game._message_more) await rhack(' ');
    pushKey('\x1b'); await moveloop_core();
    // Heavy load grants three movement points per turn: one action costs four turns.
    assert.equal(game.moves, 104); assert.equal(game.level.regions[0].ttl, 1);
});
