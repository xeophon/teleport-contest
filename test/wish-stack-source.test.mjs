import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { ROOM, W_QUIVER, W_WEP } from '../js/const.js';
import { ROT_CORPSE, peekTimer } from '../js/timeout.js';

function setup() {
    resetGame();initRng(41);
    Object.assign(game,{moves:100,flags:{debug:true,verbose:true},context:{},inventory:[],level:new GameMap(),
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:10,uhp:100,uhpmax:100,uen:100,uenmax:100,
            uhunger:900,umovement:0,ublesscnt:0,acurr:{a:[18,18,18,18,18,18]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:ROOM,lit:true});
    vision_reset();
}

async function wish(text, {wizard=false}={}) {
    if(wizard)await rhack('\x17');
    else {
        // The ordinary makewish prompt, as entered by a wand or lamp.
        game._command_mode='wizardWish';game._wish_text='';game._wish_move_cost=1;
    }
    for(const ch of text+'\n')await rhack(ch.charCodeAt(0));
    const messages=[game._pending_message];
    for(let i=0;game._command_mode?.endsWith('WishMore')&&i<10;i++){
        await rhack(' ');messages.push(game._pending_message);
    }
    return messages;
}

// invent.c:addinv_core0 and mergable apply to every mergeable class.
for(const kind of ['dart','arrow','shuriken','boomerang','dagger','spear','knife','stiletto','athame',
    'diamond','rock','food ration','pancake','kelp frond','lump of royal jelly','scroll of identify',
    'potion of healing','tallow candle','lichen corpse'])
    test(`repeated wished ${kind} merges into the existing object`,async()=>{
        setup();await wish(`uncursed +0 ${kind}`);
        const original=game.inventory[0];assert.ok(original,kind);const weight=original.owt;
        const messages=await wish(`uncursed +0 ${kind}`);
        assert.equal(game.inventory.length,1);assert.equal(game.inventory[0],original);
        assert.equal(original.quan,2);assert.equal(original.owt,weight*2);
        assert.equal(original.pickup_prev,1);assert.match(messages.at(-1),/\(2 in total\)\./);
    });

for(const key of ['nomerge','unpaid','obroken','otrapped','greased','lamplit','odiluted','omonst','omid'])
    test(`C potion merging rejects different ${key}`,async()=>{
        setup();await wish('uncursed potion of healing');
        game.inventory[0][key]=true;
        await wish('uncursed potion of healing');assert.equal(game.inventory.length,2);
    });

for(const [state,field] of [[{blind:true},'dknown'],[{blind:true},'known'],[{blind:true},'bknown'],
    [{hallucinating:true},'known'],[{hallucinating:true},'bknown']])
    test(`impaired C merging preserves ${field} knowledge: ${JSON.stringify(state)}`,async()=>{
        setup();await wish('uncursed potion of healing');
        const original=game.inventory[0];original[field]=true;Object.assign(game.u,state);
        await wish('uncursed potion of healing');assert.equal(game.inventory.length,2);
    });

test('a wished stack merges with quivered ammunition before an eligible wielded stack',async()=>{
    setup();await wish('uncursed +0 dart');
    const primary=game.inventory[0];primary.wielded=true;primary.owornmask=W_WEP;game.u.uwep=primary;
    const quiver={...primary,id:90,letter:'b',wielded:false,quivered:true,owornmask:W_QUIVER};
    game.inventory.push(quiver);game.u.uquiver=quiver;
    await wish('uncursed +0 dart');
    assert.equal(game.inventory.length,2);assert.equal(primary.quan,1);assert.equal(quiver.quan,2);
    assert.equal(game.u.uquiver,quiver);assert.equal(game.u.uwep,primary);
});

test('wished ammunition can merge into the primary weapon without losing its worn slot',async()=>{
    setup();await wish('uncursed +0 dart');
    const original=game.inventory[0];original.wielded=true;original.owornmask=W_WEP;game.u.uwep=original;
    await wish('uncursed +0 dart');
    assert.equal(game.inventory.length,1);assert.equal(original.quan,2);
    assert.equal(original.owornmask,W_WEP);assert.equal(game.u.uwep,original);
});

test('a new anonymous object inherits its merge target name',async()=>{
    setup();await wish('uncursed +0 dagger named Needle');
    const original=game.inventory[0];await wish('uncursed +0 dagger');
    assert.equal(game.inventory.length,1);assert.equal(original.quan,2);
    assert.match(original.line,/named Needle/);
});

test('an incoming name is copied into an anonymous merge target',async()=>{
    setup();await wish('uncursed +0 dagger');
    const original=game.inventory[0];await wish('uncursed +0 dagger named Needle');
    assert.equal(game.inventory.length,1);assert.equal(original.quan,2);
    assert.match(original.line,/named Needle/);
});

test('distinct instance names prevent otherwise compatible wishes from merging',async()=>{
    setup();await wish('uncursed +0 dagger named Needle');await wish('uncursed +0 dagger named Fang');
    assert.equal(game.inventory.length,2);
});

test('C merged ages use the quantity weighted integer average',async()=>{
    setup();await wish('uncursed 3 food rations');const original=game.inventory[0];
    original.age=20;game.moves=100;await wish('uncursed food ration');
    assert.equal(game.inventory.length,1);assert.equal(original.quan,4);assert.equal(original.age,40);
});

test('wizard wishes suppress verbose totals and restore the option afterward',async()=>{
    setup();await wish('uncursed +0 dart',{wizard:true});
    const messages=await wish('uncursed +0 dart',{wizard:true});
    assert.equal(game.flags.verbose,true);assert.equal(game.inventory[0].quan,2);
    assert.ok(messages.every(message=>!message.includes('in total')));
});

for(const [name,count] of [['arrows',2],['throwing stars',2],['boomerangs',2],['5 bows',1],['5 long swords',1]])
    test(`C weapon wish quantity: ${name}`,async()=>{
        setup();await wish(`uncursed +0 ${name}`);
        assert.equal(game.inventory.length,1);assert.equal(game.inventory[0].quan,count);
    });

test('a rejected merge leaves the primary stack wielded and the split child unworn',async()=>{
    setup();game.flags.pickup_burden='unencumbered';await wish('uncursed +0 dart');
    const primary=game.inventory[0];primary.wielded=true;primary.owornmask=W_WEP;game.u.uwep=primary;
    game.inventory.push({letter:'b',cls:'tool',kind:'anchor',owt:949,quan:1});
    await wish('uncursed +0 2 darts');
    assert.equal(primary.quan,1);assert.equal(primary.owornmask,W_WEP);assert.equal(game.u.uwep,primary);
    assert.equal(game.inventory.length,2);assert.equal(game.level.objects.length,1);
    const split=game.level.objects[0];assert.equal(split.quan,2);assert.equal(split.owornmask,0);
    assert.equal(split.pickup_prev,0);assert.equal(split.wielded,false);
});

test('a successful merge does not consume another inventory letter',async()=>{
    setup();await wish('uncursed +0 dart');const original=game.inventory[0];
    for(const letter of 'bcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
        game.inventory.push({letter,cls:'tool',kind:'key',quan:1});
    await wish('uncursed +0 dart');assert.equal(game.inventory.length,52);assert.equal(original.quan,2);
    assert.equal(game.level.objects.length,0);
});

test('merging a wished corpse keeps the original decay timer and cancels the new timer',async()=>{
    setup();await wish('uncursed newt corpse');const original=game.inventory[0];
    const deadline=peekTimer(ROT_CORPSE,original);assert.ok(deadline>game.moves);
    await wish('uncursed newt corpse');
    assert.equal(game.inventory.length,1);assert.equal(original.quan,2);
    assert.equal(peekTimer(ROT_CORPSE,original),deadline);
    assert.equal(game.timers.filter(timer=>timer.func===ROT_CORPSE).length,1);
});
