import test from 'node:test';
import assert from 'node:assert/strict';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ROOM, POOL, PIT, W_RINGL, W_RINGR, W_WEP, W_ARTI, W_ARMF, LEVITATION, INTRINSIC,
    INVIS, SEE_INVIS, CONFLICT, STEALTH, WARNING, PROTECTION, FROMOUTSIDE, A_STR, A_CON, A_CHA } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { applyHeroElectricInventoryDamage, rhack } from '../js/cmd.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(values = [0, 0]) {
    resetGame(); initRng(1); game.moves = 100; game.context = {}; game.flags = { pickup: false };
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100,
        ulevel: 10, uhunger: 900, acurr: { a: [12, 12, 12, 12, 12, 12] } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    game.inventory = [];
    const raw = [...values, ...Array(100).fill(0)].map(BigInt);
    game.coreCtx = { n: raw.length, r: raw.reverse(), m: [], a: 0n, b: 0n, c: 0n };
    game.rng = { ...(game.rng || {}), core: game.coreCtx };
    vision_reset(); vision_recalc(); enableRngLog({ reset: true });
}
function ring(kind = 'levitation', prop = LEVITATION, overrides = {}) {
    const obj = { id: 2, letter: 'b', cls: 'ring', glyph: '=', kind: `ring of ${kind}`,
        quan: 1, worn: 'left', owornmask: W_RINGL, known: false, dknown: true, ...overrides };
    game.inventory.push(obj); game.u.uleft = obj;
    game.u.uprops ??= {}; game.u.uprops[prop] = { intrinsic: 0, extrinsic: W_RINGL };
    return obj;
}

test('electrical dust calls Ring_gone before useup and ends levitation', async () => {
    setup(); const obj = ring(); game.u.levitating = true;
    const messages = []; await applyHeroElectricInventoryDamage({ damage: 5 }, messages);
    assert.equal(game.u.uprops[LEVITATION].extrinsic, 0);
    assert.equal(game.u.uleft, null); assert.equal(game.u.levitating, false);
    assert.equal(game.inventory.includes(obj), false);
    assert.match(messages.join('  '), /turns to dust.*float gently/s);
    assert.ok(game._discoveries.some(entry => entry.name === 'ring of levitation'));
});

for (const [label, intrinsic, extrinsic] of [['intrinsic', INTRINSIC, 0], ['other ring', 0, W_RINGR],
    ['boots', 0, W_ARMF], ['invoked Heart', 0, W_ARTI]]) {
    test(`ring destruction preserves remaining ${label} levitation`, async () => {
        setup(); ring(); game.u.levitating = true;
        game.u.uprops[LEVITATION].intrinsic = intrinsic;
        game.u.uprops[LEVITATION].extrinsic |= extrinsic;
        const messages = []; await applyHeroElectricInventoryDamage({ damage: 5 }, messages);
        assert.equal(game.u.uprops[LEVITATION].extrinsic, extrinsic);
        assert.equal(game.u.uprops[LEVITATION].intrinsic, intrinsic);
        assert.equal(game.u.levitating, true); assert.doesNotMatch(messages.join(' '), /float gently/);
    });
}

for (const [kind, property] of [['conflict', CONFLICT], ['stealth', STEALTH], ['warning', WARNING],
    ['see invisible', SEE_INVIS], ['invisibility', INVIS]]) {
    test(`Ring_gone removes the worn ${kind} source bit without removing another source`, async () => {
        setup(); ring(kind, property); game.u.uprops[property].extrinsic |= W_RINGR;
        const messages = []; await applyHeroElectricInventoryDamage({ damage: 5 }, messages);
        assert.equal(game.u.uprops[property].extrinsic, W_RINGR);
        assert.equal(game.u.uleft, null);
    });
}

test('canonical ring-slot bits protect a worn ring beneath gloves', async () => {
    setup(); const obj = ring(); delete obj.worn;
    game.inventory.push({ id: 3, cls: 'armor', kind: 'leather gloves', worn: true, quan: 1 });
    await applyHeroElectricInventoryDamage({ damage: 5 }, []);
    assert.ok(game.inventory.includes(obj)); assert.equal(game.u.uprops[LEVITATION].extrinsic, W_RINGL);
    assert.deepEqual(getRngLog(), ['rn2(5)=0']);
});

for (const [kind, property, field] of [['conflict', CONFLICT, 'conflict'], ['invisibility', INVIS, 'invisible'],
    ['see invisible', SEE_INVIS, 'seeInvisible'], ['stealth', STEALTH, 'stealth'], ['levitation', LEVITATION, 'levitating']]) {
    test(`live wear and removal pair the ${kind} property and canonical hand`, async () => {
        setup(); const obj = { id: 2, letter: 'b', cls: 'ring', glyph: '=', kind: `ring of ${kind}`, quan: 1, dknown: true };
        game.inventory.push(obj);
        await rhack('P'); await rhack('b'); await rhack('r');
        assert.equal(game.u.uprops[property].extrinsic, W_RINGR);
        assert.equal(game.u.uright, obj); assert.equal(game.u[field], true);
        game._command_mode = 'takeOffObject'; game._pending_message = ''; game._message_more = 0;
        await rhack('b');
        assert.equal(game.u.uprops[property].extrinsic, 0); assert.equal(game.u[field], false);
        assert.equal(game.u.uright, null); assert.ok(game.inventory.includes(obj));
    });
}

for (const [kind, attribute] of [['gain strength', A_STR], ['gain constitution', A_CON], ['adornment', A_CHA]]) {
    test(`wear/removal and electrical destruction undo the ${kind} bonus exactly once`, async () => {
        setup([0, 0, 0]);
        const obj = { id: 2, letter: 'b', cls: 'ring', glyph: '=', kind: `ring of ${kind}`, quan: 1, spe: 2, dknown: true };
        game.inventory.push(obj);
        await rhack('P'); await rhack('b'); await rhack('r');
        assert.equal(game.u.abon.a[attribute], 2); assert.equal(game.u.acurr.a[attribute], 12);
        await applyHeroElectricInventoryDamage({ damage: 5 }, []);
        assert.equal(game.u.abon.a[attribute], 0); assert.equal(game.u.acurr.a[attribute], 12);
        assert.equal(game.u.uright, null); assert.ok(!game.inventory.includes(obj));
    });
}

for (const explodes of [false, true]) test(`worn charged ring ${explodes ? 'explosion clears' : 'recharge updates'} its bonus`, async () => {
    setup([0, 1, 6, 0]);
    const obj = { id: 2, letter: 'b', cls: 'ring', glyph: '=', kind: 'ring of increase damage',
        quan: 1, spe: explodes ? 7 : 2, dknown: true };
    game.inventory.push(obj);
    await rhack('P'); await rhack('b'); await rhack('l');
    assert.equal(game.u.udaminc, obj.spe);
    await applyHeroElectricInventoryDamage({ damage: 5 }, []);
    assert.equal(game.u.udaminc, explodes ? 0 : 3);
    assert.equal(game.inventory.includes(obj), !explodes);
    assert.equal(game.u.uleft, explodes ? null : obj);
});

function returningHammer(values) {
    setup(values); game._startup_role = 'Valkyrie'; game.u.acurr.a[0] = 125; game.u.fumbling = true;
    const hammer = { id: 1, letter: 'a', cls: 'weapon', glyph: ')', kind: 'war hammer', artifact: 'Mjollnir',
        quan: 1, wielded: true, owornmask: W_WEP };
    game.inventory.push(hammer); game.u.uwep = hammer;
    return hammer;
}
function restoreCommand() {
    const { coreCtx, displayCtx, rng } = game;
    restoreSaveState(encodeSaveState()); Object.assign(game, { coreCtx, displayCtx, rng });
}

for (const rescue of ['amulet', 'wizard']) test(`electrical levitation-ring loss resumes after saved ${rescue} landing death before destruction and arm damage`, async () => {
    returningHammer([1, 1, 2, 11, 0, 0, 0]); ring(); game.u.levitating = true;
    game.u.uhp = 1;
    game.level.traps.push({ tx: 9, ty: 10, ttyp: PIT });
    if (rescue === 'amulet') game.inventory.push({ id: 3, letter: 'c', cls: 'amulet',
        kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    else game.flags.debug = true;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game._command_mode, rescue === 'amulet' ? 'lifeSavingMore' : 'deathDieMore', JSON.stringify(getRngLog()));
    assert.ok(game._artifact_float_continuation);
    assert.ok(game.inventory.some(obj => obj.id === 2));
    assert.equal(game.u.uleft, null); assert.equal(game.u.levitating, false);
    assert.ok(!game.level.objects.some(obj => obj.id === 1));
    const dice = getRngLog().filter(entry => entry.startsWith('rnd(24)')).length;
    restoreCommand(); await rhack(' '); if (rescue === 'wizard') await rhack('n');
    assert.equal(game._artifact_float_continuation, null);
    assert.ok(!game.inventory.some(obj => obj.id === 2));
    assert.equal(game.level.objects.filter(obj => obj.id === 1).length, 1);
    assert.equal(game.u.uhp, game.u.uhpmax - 16);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(24)')).length, dice);
});

test('electrical ring loss waits for saved water escape before useup and return damage', async () => {
    returningHammer([1, 1, 2, 11, 0, 0, 0]); ring(); game.u.levitating = true;
    game.level.at(9, 10).typ = POOL;
    await rhack('t'); await rhack('a'); await rhack('l');
    assert.equal(game._command_mode, 'waterCrawlMore', JSON.stringify(getRngLog()));
    assert.ok(game.inventory.some(obj => obj.id === 2)); assert.equal(game.u.uhp, 100);
    const savedOwner = game._artifact_float_continuation.after;
    assert.equal(savedOwner.type, 'heroProjectile');
    assert.equal(savedOwner.electricState.impact.item, game.inventory.find(obj => obj.id === 2));
    restoreCommand();
    for (let i = 0; i < 10 && game._artifact_float_continuation; i++) await rhack(' ');
    assert.equal(game._artifact_float_continuation, null); assert.equal(game._water_continuation, null);
    assert.ok(!game.inventory.some(obj => obj.id === 2));
    const hammer = game.level.objects.find(obj => obj.id === 1);
    assert.deepEqual([hammer.ox, hammer.oy], [game.u.ux, game.u.uy]);
    assert.equal(game.u.uhp, 84);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnd(24)')).length, 1);
});

test('ordinary ring removal waits for saved water landing and preserves the carried ring', async () => {
    setup(); const obj = ring(); game.u.levitating = true; game.level.at(10, 10).typ = POOL;
    game._command_mode = 'takeOffObject'; await rhack('b');
    assert.equal(game._command_mode, 'waterCrawlMore'); assert.equal(game.context.move, 0);
    assert.ok(game.inventory.includes(obj)); assert.equal(game.u.uleft, null);
    restoreCommand();
    for (let i = 0; i < 10 && game._artifact_float_continuation; i++) await rhack(' ');
    assert.equal(game._artifact_float_continuation, null); assert.equal(game.context.move, 1);
    assert.ok(game.inventory.some(item => item.id === 2));
});

test('two worn rings preserve shared properties until the final hand is removed', async () => {
    setup();
    const rings = ['b', 'c'].map((letter, i) => ({ id: i + 2, letter, cls: 'ring', glyph: '=', kind: 'ring of invisibility', quan: 1 }));
    game.inventory.push(...rings);
    for (const [i, hand] of ['l', 'r'].entries()) { await rhack('P'); await rhack(rings[i].letter); await rhack(hand); }
    assert.equal(game.u.uprops[INVIS].extrinsic, W_RINGL | W_RINGR);
    game._command_mode = 'takeOffObject'; await rhack('b');
    assert.equal(game.u.invisible, true); assert.equal(game.u.uprops[INVIS].extrinsic, W_RINGR);
    game._command_mode = 'takeOffObject'; await rhack('c');
    assert.equal(game.u.invisible, false); assert.equal(game.u.uprops[INVIS].extrinsic, 0);
});

for (const action of ['wear', 'remove']) test(`terrain-blocked levitation ring ${action} gives no observable discovery`, async () => {
    setup(); const obj = ring(); game.u.BLevitation = FROMOUTSIDE;
    if (action === 'wear') {
        obj.worn = false; obj.owornmask = 0; game.u.uleft = null;
        game.u.uprops[LEVITATION].extrinsic = 0;
        await rhack('P'); await rhack('b'); await rhack('l');
    } else {
        game._command_mode = 'takeOffObject'; await rhack('b');
    }
    assert.equal(game.u.levitating, false);
    assert.ok(!game._discoveries?.some(entry => entry.name === 'ring of levitation'));
    assert.doesNotMatch(game._pending_message || '', /float|floating/);
});

for (const kind of ['increase accuracy', 'increase damage']) test(`known ${kind} type does not reveal enchantment merely by wearing it`, async () => {
    setup(); const obj = { id: 2, letter: 'b', cls: 'ring', kind: `ring of ${kind}`, quan: 1, spe: 2, dknown: true, known: false };
    game.inventory.push(obj); game._discoveries = [{ section: 'Rings', name: `ring of ${kind}` }];
    await rhack('P'); await rhack('b'); await rhack('l');
    assert.equal(obj.known, false);
    game._command_mode = 'takeOffObject'; await rhack('b');
    assert.equal(obj.known, false);
});

for (const [value, spe] of [[3, -2], [125, 2]]) test(`strength ring at the ${value} attribute limit conceals unobservable enchantment`, async () => {
    setup(); game.u.acurr.a[A_STR] = value;
    const obj = { id: 2, letter: 'b', cls: 'ring', kind: 'ring of gain strength', quan: 1, spe, dknown: true, known: false };
    game.inventory.push(obj); game._discoveries = [{ section: 'Rings', name: 'ring of gain strength' }];
    await rhack('P'); await rhack('b'); await rhack('l');
    assert.equal(game.u.abon.a[A_STR], spe); assert.equal(obj.known, false);
});

for (const kind of ['gain strength', 'protection']) test(`known ${kind} ring reveals a zero enchantment when observable`, async () => {
    setup(); const obj = { id: 2, letter: 'b', cls: 'ring', kind: `ring of ${kind}`, quan: 1, spe: 0, dknown: true, known: false };
    game.inventory.push(obj); game._discoveries = [{ section: 'Rings', name: `ring of ${kind}` }];
    await rhack('P'); await rhack('b'); await rhack('l');
    assert.equal(obj.known, true);
});

test('electrical dust removes the same protection armor bonus that wearing granted', async () => {
    setup([0, 0, 0]); game.u.uac = 5;
    game.inventory.push({ id: 3, letter: 'c', cls: 'armor', kind: 'chain mail', worn: true, quan: 1 });
    const obj = { id: 2, letter: 'b', cls: 'ring', kind: 'ring of protection', quan: 1, spe: 3, dknown: true, known: false };
    game.inventory.push(obj);
    await rhack('P'); await rhack('b'); await rhack('l');
    assert.equal(game.u.uac, 2); assert.equal(obj.known, true);
    await applyHeroElectricInventoryDamage({ damage: 5 }, []);
    assert.equal(game.u.uac, 5); assert.equal(game.u.uprops[PROTECTION].extrinsic, 0);
});
