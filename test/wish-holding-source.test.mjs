import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import * as C from '../js/const.js';

function setup() {
    resetGame();initRng(41);
    Object.assign(game,{moves:100,flags:{debug:true,verbose:true},context:{},inventory:[],level:new GameMap(),
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:10,uhp:100,uhpmax:100,uen:100,uenmax:100,
            uhunger:900,umovement:0,ublesscnt:0,acurr:{a:[10,10,10,10,10,10]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    vision_reset();enableRngLog({reset:true});
}

async function wish(text) {
    await rhack('\x17');
    for(const ch of text+'\n')await rhack(ch.charCodeAt(0));
}

for(const [amount,limit,held] of [[50000,'unencumbered',true],[60000,'unencumbered',false],
    [100000,'stressed',true],[150000,'stressed',false],[150000,'overloaded',true]])
    test(`wished gold ${amount} follows pickup_burden=${limit}`,async()=>{
        setup();game.flags.pickup_burden=limit;await wish(`${amount} gold pieces`);
        assert.equal(game._goldCount||0,held?amount:0);
        const pile=(held?game.inventory:game.level.objects).find(item=>item.glyph==='$');
        assert.equal(pile.quan,amount);assert.equal(pile.owt,Math.trunc((amount+50)/100));
        assert.equal(game.context.move,0);assert.equal(game.u.uconduct.wishes,1);
        if(!held)assert.equal(game._pending_message,`Oops!  The ${amount} gold pieces drop to the floor!`);
    });

test('an already strained hero can keep a wish which stays in the same burden tier',async()=>{
    setup();game._goldCount=110000;
    const original={id:50,letter:'$',cls:'coin',otyp:466,glyph:'$',quan:110000,owt:1100};
    game.inventory=[original];await wish('1000 gold pieces');
    assert.equal(game.inventory[0],original);assert.equal(original.quan,111000);
    assert.equal(game.level.objects.length,0);
});

test('rejected merged gold leaves the old inventory stack and drops only the wish',async()=>{
    setup();game._goldCount=110000;
    const original={id:50,letter:'$',cls:'coin',otyp:466,glyph:'$',quan:110000,owt:1100};
    game.inventory=[original];await wish('50000 gold pieces');
    assert.equal(game.inventory[0],original);assert.equal(original.quan,110000);
    assert.equal(original.owt,1100);assert.equal(game._goldCount,110000);
    const pile=game.level.objects.find(item=>item.glyph==='$');
    assert.equal(pile.quan,50000);assert.notEqual(pile.id,original.id);
});

for(const kind of ['diamond','potion of healing','gold piece'])test(`fumbling drops a wished ${kind}`,async()=>{
    setup();game.u.uprops[C.FUMBLING]={intrinsic:20};await wish(kind);
    assert.equal(game.inventory.length,0);assert.equal(game.level.objects.length,1);
    assert.match(game._pending_message,/^Oops!  The .* drops to the floor!/);
});

for(const cursed of [false,true])test(`cursed loadstone exception only affects the load gate: cursed=${cursed}`,async()=>{
    setup();game.u.acurr.a[C.A_STR]=game.u.acurr.a[C.A_CON]=3;
    await wish(`${cursed?'cursed':'uncursed'} loadstone`);
    assert.equal(game.inventory.some(item=>(item.actualKind||item.kind)==='loadstone'),cursed);
    assert.equal(game.level.objects.length,cursed?0:1);
});

test('inventory overflow rejects a cursed loadstone despite its weight exception',async()=>{
    setup();game.flags.pickup_burden='overloaded';
    game.inventory=Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',letter=>({letter,cls:'tool',kind:'key',quan:1}));
    await wish('cursed loadstone');assert.equal(game.inventory.length,52);
    assert.equal(game.level.objects.length,1);
});

test('coins can be held when all 52 object letters are occupied',async()=>{
    setup();game.inventory=Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',letter=>({letter,cls:'gem',kind:'diamond',quan:1}));
    await wish('100 gold pieces');assert.equal(game._goldCount,100);assert.equal(game.level.objects.length,0);
});

test('a dangerous wished corpse materializes on the floor without touching the bare-handed hero',async()=>{
    setup();await wish('cockatrice corpse');
    assert.equal(game.u.uhp,100);assert.equal(game.inventory.length,0);
    assert.equal(game.level.objects.length,1);assert.match(game._pending_message,/^Careful! The cockatrice corpse materializes on the floor!/);
    assert.equal(game.level.objects[0].wishedfor,false);
});

test('fumbling gold retains the incoming object id without merging and splitting',async()=>{
    setup();game._next_ident=100;game._goldCount=1000;
    const original={id:50,letter:'$',cls:'coin',otyp:466,glyph:'$',quan:1000,owt:10};
    game.inventory=[original];game.u.uprops[C.FUMBLING]={intrinsic:20};
    await wish('500 gold pieces');
    assert.deepEqual(game.inventory,[original]);assert.equal(original.quan,1000);
    assert.equal(game._goldCount,1000);assert.equal(game.level.objects[0].id,100);
    assert.equal(game.level.objects[0].quan,500);
    assert.equal(getRngLog().filter(line=>line.startsWith('rnd(2)')).length,1);
});

for(const key of [' ','\x1b'])test(`a saved wish load report precedes divine notice, dismiss=${JSON.stringify(key)}`,async()=>{
    setup();await wish('80000 gold pieces');
    assert.equal(game._command_mode,'heldWishMore');
    assert.equal(game.u.ublesscnt,0);assert.equal(game._goldCount,80000);
    assert.equal(game._encumbrance_level,1);
    const calls=getRngLog().length,saved=encodeSaveState(),{coreCtx,displayCtx,rng}=game;
    resetGame();restoreSaveState(saved);Object.assign(game,{coreCtx,displayCtx,rng});
    await rhack('z');assert.equal(game._command_mode,'heldWishMore');
    assert.equal(getRngLog().length,calls);assert.equal(game.u.ublesscnt,0);
    await rhack(key);assert.equal(game._command_mode,null);
    assert.equal(getRngLog().length,calls+1);assert.match(getRngLog().at(-1),/^rn2\(100\)=/);
    assert.ok(game.u.ublesscnt>=50&&game.u.ublesscnt<150);
    assert.equal(game._goldCount,80000);assert.equal(game.moves,100);
    if(key===' ')assert.equal(game._pending_message,'Your movements are slowed slightly because of your load.');
});

test('comparison feedback blocks a rejected potion before it leaves the inventory',async()=>{
    setup();game.flags.pickup_burden='unencumbered';
    const original={id:50,letter:'a',cls:'potion',potionIndex:20,kind:'booze',actualKind:'potion of booze',
        quan:1,owt:20,bknown:true,known:true};
    game.inventory=[original,{letter:'b',cls:'tool',kind:'anchor',quan:1,owt:530}];
    await wish('uncursed potion of booze');
    assert.equal(game._pending_message,'You learn more about your items by comparing them.');
    assert.equal(game._command_mode,'rejectedWishMore');
    assert.equal(original.quan,1);assert.equal(game.inventory.length,3);
    assert.equal(game.level.objects.length,0);assert.equal(game.u.ublesscnt,0);
    const saved=encodeSaveState(),{coreCtx,displayCtx,rng}=game;
    resetGame();restoreSaveState(saved);Object.assign(game,{coreCtx,displayCtx,rng});
    await rhack(' ');
    assert.equal(game.inventory.length,2);assert.equal(game.inventory[0].quan,1);
    assert.equal(game.level.objects.length,1);assert.equal(game.level.objects[0].quan,1);
    assert.equal(game._pending_message,'Oops!  The potion of booze drops to the floor!');
    assert.ok(game.u.ublesscnt>=50);
});

for(const [kind,launcher,ready] of [['dart',null,true],['shuriken',null,true],['boomerang',null,true],
    ['dagger',null,false],['arrow',null,false],['arrow','bow',true],['crossbow bolt','crossbow',true],
    ['rock','sling',true],['diamond','sling',true]])
    test(`hold_another_object autoquiver gate: ${kind}, launcher=${launcher}`,async()=>{
        setup();game.flags.autoquiver=true;
        if(launcher){const item={letter:'b',cls:'weapon',kind:launcher,quan:1,alternate:true};
            game.inventory=[item];game.u.uswapwep=item;}
        await wish(kind);
        const item=game.inventory.at(-1);assert.equal(!!item.quivered,ready);
        assert.equal(game.u.uquiver,ready?item:undefined);
        if(ready){assert.equal(item.owornmask,C.W_QUIVER);assert.match(game._pending_message,/\((?:in quiver(?: pouch)?|at the ready)\)/);}
    });

test('an occupied quiver is preserved when another missile is wished for',async()=>{
    setup();game.flags.autoquiver=true;
    const quiver={letter:'a',cls:'weapon',kind:'arrow',quan:1,quivered:true,owornmask:C.W_QUIVER};
    game.inventory=[quiver];game.u.uquiver=quiver;await wish('dart');
    assert.equal(game.u.uquiver,quiver);assert.equal(game.inventory.at(-1).quivered,undefined);
});
