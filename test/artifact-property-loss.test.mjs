import assert from 'node:assert/strict';
import test from 'node:test';
import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { artifactDefinitionForName } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog, rnz } from '../js/rng.js';
import { ROOM, CONFLICT, INVIS, LEVITATION, W_ARTI, W_RINGL } from '../js/const.js';
import { vision_reset } from '../js/vision.js';

const powers = [
    ['The Sceptre of Might', 'Caveman', 1, CONFLICT, 'conflict'],
    ['The Orb of Detection', 'Archeologist', 1, INVIS, 'invisible'],
];
function setup(name, role, align) {
    resetGame(); initRng(31);
    game.moves = 100; game.context = {}; game.flags = { verbose: true };
    game._startup_role = role; game._startup_align = align === 1 ? 'lawful' : 'neutral';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100, uen: 30, uenmax: 30,
        ulevel: 10, uhunger: 900, acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: align, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) Object.assign(game.level.at(x,y), { typ: ROOM, lit: true });
    const def = artifactDefinitionForName(name);
    const item = { id: 1, artifact: name, kind: def.base, otyp: def.otyp, cls: def.cls, glyph: def.glyph,
        letter: 'a', quan: 1, age: 0 };
    game.inventory = [item]; vision_reset();
    return item;
}
async function command(mode, key = 'a') {
    game._command_mode = mode;
    game._pending_message = ''; game._message_more = 0;
    await rhack(key);
}

for (const [name, role, align, prop, field] of powers) {
    test(`${name} dropping an active power clears its source and starts cooldown once`, async () => {
        const item = setup(name, role, align);
        await command('invokeObject');
        enableRngLog({ reset: true });
        const cooldown = rnz(100), cooldownLog = getRngLog();
        initRng(31); enableRngLog({ reset: true });
        await command('dropObject');
        assert.equal(game.u.uprops[prop].extrinsic & W_ARTI, 0);
        assert.equal(game.u[field], false);
        assert.equal(item._invokedProperty, null);
        assert.equal(item.age, 100 + cooldown);
        assert.equal(game.inventory.includes(item), false);
        assert.ok(game.level.objects.includes(item));
        assert.match(game._pending_message, field === 'conflict' ? /tension decrease/ : /body seems to unfade/);
        assert.deepEqual(getRngLog(), cooldownLog);
    });
    test(`${name} inactive loss does not turn its power on or change cooldown`, async () => {
        const item = setup(name, role, align); item.age = 270;
        enableRngLog({ reset: true });
        await command('dropObject');
        assert.equal(!!game.u[field], false);
        assert.equal(item.age, 270);
        assert.deepEqual(getRngLog(), []);
    });
    test(`${name} loss bypasses retouch even after a hostile alignment change`, async () => {
        const item = setup(name, role, align);
        await command('invokeObject');
        game.u.ualign.type = -1; game.u.ualign.record = -10;
        enableRngLog({ reset: true });
        await command('dropObject');
        assert.equal(game.u[field], false);
        assert.equal(game.u.uhp, 100);
        assert.doesNotMatch(game._pending_message, /blasted|can't handle|beyond your control/);
        assert.ok(item.age > game.moves);
        assert.equal(getRngLog().filter(entry => entry.startsWith('rnz(100)')).length, 1);
    });
    for (const source of ['intrinsic', 'ring']) test(`${name} loss preserves an independent ${source}`, async () => {
        const item = setup(name, role, align);
        if (source === 'intrinsic') game.u.uprops = { [prop]: { intrinsic: 1, extrinsic: 0 } };
        else game.inventory.push({ id: 2, letter: 'b', cls: 'ring', kind: `ring of ${field === 'invisible' ? 'invisibility' : field}`,
            worn: true, owornmask: W_RINGL, quan: 1 });
        game.u[field] = true;
        await command('invokeObject');
        await command('dropObject');
        assert.equal(game.u.uprops[prop].extrinsic & W_ARTI, 0);
        assert.equal(game.u[field], true);
        assert.ok(item.age > game.moves);
        assert.match(game._pending_message, /surge of power/);
    });
    test(`${name} canonical W_ARTI remains authoritative without the item convenience flag`, async () => {
        const item = setup(name, role, align);
        game.u[field] = true; game.u.uprops = { [prop]: { intrinsic: 0, extrinsic: W_ARTI } };
        shop.removeInventoryItem(item, 1);
        assert.equal(game.u.uprops[prop].extrinsic, 0);
        assert.equal(game.u[field], false);
        assert.ok(item.age > game.moves);
    });
    test(`${name} bag transfer turns the invoked property off`, async () => {
        const item = setup(name, role, align);
        const bag = { id: 2, letter: 'b', cls: 'tool', kind: 'sack', contents: [], quan: 1 };
        game.inventory.push(bag);
        await command('invokeObject');
        const result = await shop.putInventoryObjectIntoBag(bag, item);
        assert.equal(result.moved, true);
        assert.equal(game.u[field], false);
        assert.ok(bag.contents.includes(item));
        assert.ok(item.age > game.moves);
        assert.match(result.message, field === 'conflict' ? /tension decrease/ : /body seems to unfade/);
    });
}

test('a removed independent ring must not survive as a stale invoked baseline', async () => {
    const item = setup(...powers[0]);
    const ring = { id: 2, letter: 'b', cls: 'ring', kind: 'ring of conflict', worn: true, owornmask: W_RINGL, quan: 1 };
    game.inventory.push(ring); game.u.conflict = true;
    await command('invokeObject');
    ring.worn = false; ring.owornmask = 0;
    shop.removeInventoryItem(ring);
    await command('dropObject');
    assert.equal(game.u.conflict, false);
    assert.ok(item.age > game.moves);
});

for (const [name, role, align, prop, field] of powers) {
    for (const kind of ['large box', 'ice box']) test(`${name} ${kind} transfer reports property loss before placement`, async () => {
        const item = setup(name, role, align);
        const box = { id: 2, cls: 'tool', kind, contents: [], quan: 1, ox: 10, oy: 10 };
        game.level.objects.push(box);
        await command('invokeObject');
        const result = shop.putInventoryObjectIntoContainer(box, item);
        assert.equal(game.u[field], false);
        assert.ok(box.contents.includes(item));
        assert.match(result.message, field === 'conflict' ? /tension decrease.*You put/ : /body seems to unfade.*You put/);
    });
    for (const route of ['nymph', 'bullwhip']) test(`${name} ${route} transfer reports loss and preserves object identity`, async () => {
        const item = setup(name, role, align);
        await command('invokeObject');
        const mon = { data: { name: 'water nymph' }, mx: 11, my: 10, mhp: 12, minvent: [] };
        game.level.monsters.push(mon);
        game._pending_message = 'The monster disarms you.'; game._message_more = 1;
        game._topline_after_more = 'The monster takes your artifact.';
        if (route === 'nymph') game._nymph_steal_after_more = { mon, itemLetter: 'a', theftMessage: game._topline_after_more };
        else game._bullwhip_after_more = { mon, itemLetter: 'a', item, whereTo: 3 };
        await rhack(' ');
        assert.equal(mon.minvent[0], item);
        assert.equal(game.u[field], false);
        const messages = [game._pending_message, game._topline_after_more,
            ...(game._queued_messages_after_more || []).map(entry => entry.text)].join('  ');
        assert.match(messages, field === 'conflict' ? /tension decrease/ : /body seems to unfade/);
    });
    test(`${name} unwielding keeps its independently invoked property active`, async () => {
        const item = setup(name, role, align);
        await command('invokeObject'); item.wielded = true;
        await command('wieldObject', '-');
        assert.equal(game.u.uprops[prop].extrinsic & W_ARTI, W_ARTI);
        assert.equal(game.u[field], true);
        assert.equal(item.age, 0);
    });
}

for (const obstruction of ['blind', 'BInvis']) test(`Orb loss reports nothing special when ${obstruction}`, async () => {
    const item = setup(...powers[1]);
    await command('invokeObject'); game.u[obstruction] = true;
    await command('dropObject');
    assert.equal(game.u.invisible, false);
    assert.match(game._pending_message, /surge of power/);
    assert.doesNotMatch(game._pending_message, /unfade/);
    assert.ok(item.age > game.moves);
});
