import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { artifactDefinitionForName } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STONE, POOL, LAVAPOOL, LEVITATION, W_ARTI, W_ART, W_RINGL, I_SPECIAL, TIMEOUT,
    PIT, STATUE_TRAP, TT_PIT, TT_BEARTRAP } from '../js/const.js';
import { vision_reset } from '../js/vision.js';
import { MONS } from '../js/permonst.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup() {
    resetGame(); initRng(31); game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
    game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, uhp: 100, uhpmax: 100, uen: 30, uenmax: 30,
        ulevel: 10, uhunger: 900, acurr: { a: [12, 12, 12, 12, 12, 12] }, ualign: { type: 0, record: 10 } };
    game.level = new GameMap();
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) Object.assign(game.level.at(x,y), { typ: ROOM, lit: true });
    const def = artifactDefinitionForName('The Heart of Ahriman');
    const item = { id: 1, artifact: def.name, cls: def.cls, kind: def.base, otyp: def.otyp,
        glyph: def.glyph, letter: 'a', quan: 1, age: 0 };
    game.inventory = [item]; vision_reset();
    return item;
}
async function command(mode, key = 'a') {
    game._command_mode = mode; game._pending_message = ''; game._message_more = 0;
    await rhack(key);
}

for (const operation of ['dropObject', 'invokeObject']) {
    test(`${operation} ends sole-source levitation with source-specific cooldown`, async () => {
        const item = setup(); await command('invokeObject');
        enableRngLog({ reset: true });
        await command(operation);
        assert.equal(game.u.levitating, false);
        assert.equal(game.u.uprops[LEVITATION].extrinsic & (W_ARTI | W_ART), 0);
        assert.equal(item._invokedProperty, null);
        assert.equal(item.age > game.moves, operation === 'invokeObject');
        if (operation === 'dropObject') {
            assert.ok(game.level.objects.includes(item));
            assert.deepEqual(getRngLog(), []);
            assert.match(game._pending_message, /Heart of Ahriman.*hits the floor.*float gently/);
        } else assert.match(game._pending_message, /float gently to the floor/);
        assert.equal(game.context.move, 1);
    });
}

for (const source of ['ring', 'intrinsic']) {
    test(`dropping Heart preserves ${source} levitation and uses ordinary cooldown`, async () => {
        const item = setup();
        if (source === 'ring') game.inventory.push({ id: 2, letter: 'b', cls: 'ring', kind: 'ring of levitation', worn: true, owornmask: W_RINGL, quan: 1 });
        else game.u.uprops = { [LEVITATION]: { intrinsic: 0x01000000, extrinsic: 0 } };
        await command('invokeObject');
        await command('dropObject');
        assert.equal(game.u.levitating, true);
        assert.equal(game.u.uprops[LEVITATION].extrinsic & W_ARTI, 0);
        assert.ok(item.age > game.moves);
        assert.doesNotMatch(game._pending_message, /float gently/);
    });
}

test('Heart drop finesse clears timed levitation too without starting cooldown', async () => {
    const item = setup(); await command('invokeObject');
    game.u.uprops[LEVITATION].intrinsic = I_SPECIAL | 7;
    game.u._levitationTimeout = 7;
    await command('dropObject');
    assert.equal(game.u.uprops[LEVITATION].intrinsic & (I_SPECIAL | TIMEOUT), 0);
    assert.equal(game.u._levitationTimeout, 0);
    assert.equal(game.u.levitating, false);
    assert.equal(item.age, 0);
});

for (const operation of ['dropObject', 'invokeObject']) test(`${operation} water landing waits through crawl messages and resumes once`, async () => {
    const item = setup(); await command('invokeObject');
    game.level.at(10,10).typ = POOL;
    await command(operation);
    assert.equal(game._command_mode, 'waterCrawlMore');
    assert.equal(game.context.move, 0);
    assert.ok(game._artifact_float_continuation);
    if (operation === 'dropObject') {
        assert.ok(game.level.objects.includes(item));
        assert.deepEqual([item.ox,item.oy], [10,10], 'Heart lands before the hero crawls elsewhere');
    }
    const log = getRngLog();
    await rhack('x'); assert.deepEqual(getRngLog(), log);
    for (let i = 0; i < 10 && game._artifact_float_continuation; i++) await rhack(' ');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(game._water_continuation, null);
    assert.notDeepEqual([game.u.ux,game.u.uy], [10,10]);
    assert.equal(game.context.move, 1);
    assert.equal(item.age > 100, operation === 'invokeObject');
});

for (const amulet of [true, false]) test(`Heart landing resumes after ${amulet ? 'life saving' : 'wizard refusal'} without moving the artifact`, async () => {
    const item = setup(); await command('invokeObject');
    game.flags.debug = !amulet;
    if (amulet) game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, letter: 'b', worn: true, quan: 1 });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++) game.level.at(x,y).typ = STONE;
    game.level.at(10,10).typ = POOL; game.level.at(20,10).typ = ROOM;
    await command('dropObject');
    assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
    assert.ok(game.level.objects.includes(item));
    await rhack(' ');
    if (!amulet) { assert.equal(game._command_mode, 'wizardDieConfirm'); await rhack('n'); }
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(game._water_continuation, null);
    assert.equal(item.age, 0);
    assert.deepEqual([item.ox,item.oy], [10,10]);
    assert.ok(game.u.uhp > 0);
});

test('ending levitation while swallowed does not trigger the trap beneath the engulfer', async () => {
    setup(); await command('invokeObject');
    game.u.uswallow = true; game.u.ustuck = { data: { name: 'purple worm' }, mx:10, my:10, mhp:100 };
    game.level.traps.push({ tx:10, ty:10, ttyp:PIT });
    await command('invokeObject');
    assert.equal(game.u.utrap || 0, 0);
    assert.match(game._pending_message, /float down, but you are still swallowed/);
});

test('blocked levitation ends with feedback but no landing trap', async () => {
    setup(); await command('invokeObject');
    Object.assign(game.u, { BLevitation: I_SPECIAL, utrap: 3, utraptype: TT_BEARTRAP });
    game.level.traps.push({ tx:10, ty:10, ttyp:PIT });
    await command('invokeObject');
    assert.equal(game.u.utrap, 3);
    assert.equal(game.u.utraptype, TT_BEARTRAP);
    assert.match(game._pending_message, /no longer trying to float up from the trap's jaws/);
});

test('float_down skips statue traps', async () => {
    setup(); await command('invokeObject');
    const trap = { tx:10, ty:10, ttyp:STATUE_TRAP }; game.level.traps.push(trap);
    enableRngLog({ reset: true });
    await command('invokeObject');
    assert.ok(game.level.traps.includes(trap));
    assert.equal(game.level.monsters.length, 0);
    assert.doesNotMatch(game._pending_message, /statue/);
});

test('float_down does not retrigger a trap the hero already occupies', async () => {
    setup(); await command('invokeObject');
    Object.assign(game.u, { utrap: 3, utraptype: TT_PIT });
    game.level.traps.push({ tx:10, ty:10, ttyp:PIT });
    await command('invokeObject');
    assert.equal(game.u.utrap, 3);
    assert.equal(game.u.uhp, 100);
});

for (const amulet of [true, false]) test(`landing trap damage resumes after ${amulet ? 'life saving' : 'wizard refusal'} exactly once`, async () => {
    const item = setup(); await command('invokeObject');
    game.u.uhp = 1; game.flags.debug = !amulet;
    if (amulet) game.inventory.push({ cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, letter: 'b', worn: true, quan: 1 });
    game.level.traps.push({ tx:10, ty:10, ttyp:PIT });
    enableRngLog({ reset: true });
    await command('invokeObject');
    assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
    const log = getRngLog();
    await rhack('x'); assert.deepEqual(getRngLog(), log);
    await rhack(' ');
    if (!amulet) await rhack('n');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(game.context.move, 1);
    assert.ok(game.u.uhp > 0);
    assert.ok(item.age > 100);
    assert.equal(getRngLog().filter(entry => entry.startsWith('rnz(100)')).length, 1);
});

test('Heart water escape cursor resumes the same float_down operation', async () => {
    const item = setup(); await command('invokeObject');
    Object.assign(game.u, { ulevel:12, teleportation:true, teleportControl:true });
    game.level.at(10,10).typ = POOL;
    await command('dropObject');
    assert.equal(game._command_mode, 'waterTeleportCursor');
    assert.equal(game.context.move, 0);
    assert.ok(game.level.objects.includes(item));
    await rhack(' '); // Dismiss the preceding fall messages before moving the cursor.
    await rhack('l'); await rhack('.');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(game._water_continuation, null);
    assert.deepEqual([game.u.ux,game.u.uy], [11,10]);
    assert.deepEqual([item.ox,item.oy], [10,10]);
    assert.equal(item.age, 0);
    assert.equal(game.context.move, 1);
});

for (const amulet of [true, false]) test(`Heart lava landing completes after ${amulet ? 'life saving' : 'wizard refusal'}`, async () => {
    const item = setup(); await command('invokeObject');
    game.flags.debug = !amulet;
    if (amulet) game.inventory.push({ cls:'amulet', kind:'amulet of life saving', amuletIndex:1, letter:'b', worn:true, quan:1 });
    game.level.at(10,10).typ = LAVAPOOL;
    await command('dropObject');
    assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'lavaDeathMore');
    await rhack(' ');
    if (!amulet) { assert.equal(game._command_mode, 'wizardDieConfirm'); await rhack('n'); }
    assert.equal(game._artifact_float_continuation, null);
    assert.ok(game.u.uhp > 0);
    assert.equal(item.age, 0);
});

test('natural floating remains an independent source after Heart removal', async () => {
    const item = setup();
    game.u._polyself_form = MONS.find(mon => mon.name === 'floating eye');
    game.u.mh = game.u.mhmax = 20;
    await command('invokeObject');
    await command('dropObject');
    assert.equal(game.u.levitating, true);
    assert.ok(item.age > 100);
    assert.doesNotMatch(game._pending_message, /float gently/);
});

test('flight resumes when levitation stops blocking it', async () => {
    setup(); await command('invokeObject');
    game.u.flying = true; game.u.BFlying = I_SPECIAL;
    game.level.traps.push({ tx:10, ty:10, ttyp:PIT });
    await command('invokeObject');
    assert.equal(game.u.BFlying, 0);
    assert.equal(game.u.utrap || 0, 0);
    assert.match(game._pending_message, /stopped levitating and are now flying/);
});

test('canonical invoked source determines drop finesse without convenience flags', async () => {
    const item = setup();
    game.u.uprops = { [LEVITATION]: { intrinsic: 0, extrinsic: W_ARTI } };
    enableRngLog({ reset: true });
    await command('dropObject');
    assert.equal(item.age, 0);
    assert.equal(game.u.uprops[LEVITATION].extrinsic, 0);
    assert.deepEqual(getRngLog(), []);
});

test('moveloop spends one Heart drop turn across the water cursor continuation', async () => {
    const item = setup(); resetInputState(); await command('invokeObject');
    Object.assign(game.u, { ulevel:12, teleportation:true, teleportControl:true, umovement:12 });
    game.level.at(10,10).typ = POOL;
    game.level.regions = [{ type:'gas_cloud', damage:0, ttl:5, coords:[{x:50,y:10}] }];
    game._command_mode = 'dropObject'; game._pending_message = ''; game._message_more = 0;
    pushKey('a'); await moveloop_core();
    assert.equal(game.moves, 100);
    while (game._message_more) await rhack(' ');
    pushKey('l'); await moveloop_core();
    assert.equal(game.moves, 100);
    pushKey('.'); await moveloop_core();
    assert.equal(game._artifact_float_continuation, null);
    while (game._message_more) await rhack(' ');
    pushKey('\x1b'); await moveloop_core();
    assert.equal(game.moves, 101);
    assert.equal(game.level.regions[0].ttl, 4);
    assert.equal(item.age, 0);
});

function carriedBag() {
    const bag = { id: 2, letter: 'b', cls: 'tool', kind: 'sack', quan: 1, contents: [] };
    game.inventory.push(bag);
    game._container_letter = 'b';
    return bag;
}

test('carried bag insertion ends Heart levitation before placement and starts cooldown once', async () => {
    const item = setup(), bag = carriedBag(); await command('invokeObject');
    enableRngLog({ reset: true });
    const result = await shop.putInventoryObjectIntoBag(bag, item);
    assert.equal(game.u.levitating, false);
    assert.equal(game.u.uprops[LEVITATION].extrinsic & W_ARTI, 0);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(bag.contents[0], item);
    assert.equal(item.container, bag);
    assert.match(result.message, /float gently.*You put.*Heart of Ahriman/s);
    assert.equal(getRngLog().filter(line => line.startsWith('rnz(100)')).length, 1);
    assert.ok(item.age > 100);
});

for (const source of ['inactive', 'ring', 'timed intrinsic']) test(`bag Heart removal respects ${source} property state`, async () => {
    const item = setup(), bag = carriedBag();
    if (source !== 'inactive') await command('invokeObject');
    if (source === 'ring') game.inventory.push({ letter:'c', cls:'ring', kind:'ring of levitation', worn:true, owornmask:W_RINGL, quan:1 });
    if (source === 'timed intrinsic') {
        game.u.uprops[LEVITATION].intrinsic = I_SPECIAL | 7;
        game.u._levitationTimeout = 7;
    }
    enableRngLog({ reset:true });
    const result = await shop.putInventoryObjectIntoBag(bag, item);
    assert.equal(!!game.u.levitating, source !== 'inactive');
    assert.doesNotMatch(result.message, /float gently/);
    assert.equal(item.age > 100, source !== 'inactive');
    if (source === 'timed intrinsic') assert.equal(game.u._levitationTimeout, 7, 'ordinary freeinv does not use drop finesse');
    if (source === 'inactive') assert.deepEqual(getRngLog(), []);
});

test('bag Heart transfer detaches before a water prompt and inserts the same object after escape', async () => {
    const item = setup(), bag = carriedBag(); await command('invokeObject');
    game.level.at(10,10).typ = POOL;
    enableRngLog({ reset: true });
    await command('bagPutObject');
    assert.equal(game._command_mode, 'waterCrawlMore');
    assert.equal(game.context.move, 0);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(bag.contents.includes(item), false, 'in_container resumes after freeinv');
    assert.equal(game._artifact_float_continuation.after.object, item);
    const before = getRngLog(); await rhack('x'); assert.deepEqual(getRngLog(), before);
    for (let i = 0; i < 12 && game._artifact_float_continuation; i++) await rhack(' ');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(bag.contents[0], item);
    assert.equal(game.context.move, 1);
    assert.equal(getRngLog().filter(line => line.startsWith('rnz(100)')).length, 1);
});

for (const amulet of [true, false]) test(`bag Heart transfer continues after ${amulet ? 'life saving' : 'wizard refusal'}`, async () => {
    const item = setup(), bag = carriedBag(); await command('invokeObject');
    game.flags.debug = !amulet;
    if (amulet) game.inventory.push({ letter:'c', cls:'amulet', kind:'amulet of life saving', amuletIndex:1, worn:true, quan:1 });
    for (let x=1;x<79;x++) for(let y=0;y<21;y++) game.level.at(x,y).typ=STONE;
    game.level.at(10,10).typ=POOL; game.level.at(20,10).typ=ROOM;
    await command('bagPutObject');
    assert.equal(game._command_mode, amulet ? 'lifeSavingMore' : 'deathDieMore');
    assert.equal(bag.contents.includes(item), false);
    await rhack(' ');
    if (!amulet) await rhack('n');
    assert.equal(game._artifact_float_continuation, null);
    assert.equal(bag.contents[0], item);
    assert.ok(item.age > 100);
    assert.ok(game.u.uhp > 0);
});

test('bag selection resumes after the Heart without replaying earlier transfers or starting later ones', async () => {
    const item = setup(), bag = carriedBag(); await command('invokeObject');
    const first = { letter:'c', cls:'food', kind:'food ration', quan:1 };
    const last = { letter:'d', cls:'weapon', kind:'dagger', quan:1 };
    game.inventory.push(first, last);
    game._bag_put_entries = [first,item,last].map(object=>({item:object,letter:object.letter,amount:1}));
    game._bag_put_selected = ['c','a','d'];
    game.level.at(10,10).typ=POOL;
    await command('bagPutObject', '\r');
    assert.deepEqual(bag.contents,[first]);
    assert.equal(game.inventory.includes(last),true);
    assert.equal(game.inventory.includes(item),false);
    for(let i=0;i<12&&game._artifact_float_continuation;i++) await rhack(' ');
    assert.deepEqual(bag.contents,[last,item,first]);
    assert.equal(game._bag_put_entries,null);
    assert.equal(game._command_mode,null);
    assert.equal(game.context.move,1);
});

test('bag transfer clears canonical equipment references and masks before suspended landing', async () => {
    const item=setup(); carriedBag(); await command('invokeObject');
    item.wielded=true; item.owornmask=0x100; game.u.uwep=item;
    game.level.at(10,10).typ=POOL;
    await command('bagPutObject');
    assert.equal(game.u.uwep,null);
    assert.equal(item.owornmask,0);
    assert.equal(item.wielded,false);
    assert.equal(game._artifact_float_continuation.after.object,item);
});

test('a saved bag landing retains the detached Heart and selection identities', async () => {
    const item=setup(), bag=carriedBag(); await command('invokeObject');
    game._bag_put_entries=[{item,letter:'a',amount:1}]; game._bag_put_selected=['a'];
    game.level.at(10,10).typ=POOL;
    await command('bagPutObject','\r');
    assert.equal(bag.contents.length,0);
    restoreSaveState(encodeSaveState());
    const after=game._artifact_float_continuation.after;
    const restoredBag=game.inventory.find(obj=>obj.letter==='b');
    assert.equal(after.bag,restoredBag);
    assert.equal(after.command.entries[0].item,after.object);
    for(let i=0;i<12&&game._artifact_float_continuation;i++) await rhack(' ');
    assert.equal(restoredBag.contents[0],after.object);
    assert.equal(after.object.container,restoredBag);
    assert.equal(game.context.move,1);
});

test('moveloop spends one bag insertion turn across a water cursor', async () => {
    const item=setup(),bag=carriedBag(); resetInputState(); await command('invokeObject');
    Object.assign(game.u,{ulevel:12,teleportation:true,teleportControl:true,umovement:12});
    game.level.at(10,10).typ=POOL;
    game.level.regions=[{type:'gas_cloud',damage:0,ttl:5,coords:[{x:50,y:10}]}];
    game._command_mode='bagPutObject'; game._pending_message=''; game._message_more=0;
    pushKey('a'); await moveloop_core();
    assert.equal(game.moves,100); assert.equal(bag.contents.length,0);
    while(game._message_more) await rhack(' ');
    pushKey('l'); await moveloop_core(); assert.equal(game.moves,100);
    pushKey('.'); await moveloop_core();
    assert.equal(game._artifact_float_continuation,null);
    assert.equal(bag.contents[0],item);
    while(game._message_more) await rhack(' ');
    pushKey('\x1b'); await moveloop_core();
    assert.equal(game.moves,101);
    assert.equal(game.level.regions[0].ttl,4);
    resetInputState();
});

for(const lava of [false,true]) test(`bag insertion finishes after lethal ${lava?'lava':'pit'} landing and life saving`,async()=>{
    const item=setup(),bag=carriedBag(); await command('invokeObject');
    game.inventory.push({letter:'c',cls:'amulet',kind:'amulet of life saving',amuletIndex:1,worn:true,quan:1});
    game.u.uhp=1;
    if(lava)game.level.at(10,10).typ=LAVAPOOL;
    else game.level.traps.push({tx:10,ty:10,ttyp:PIT});
    await command('bagPutObject');
    assert.equal(game._command_mode,'lifeSavingMore');
    assert.equal(bag.contents.length,0);
    assert.equal(game.inventory.includes(item),false);
    await rhack(' ');
    assert.equal(game._artifact_float_continuation,null);
    assert.equal(bag.contents[0],item);
    assert.ok(game.u.uhp>0);
});
