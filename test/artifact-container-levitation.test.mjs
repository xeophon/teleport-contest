import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { artifactDefinitionForName } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STONE, POOL, LEVITATION, W_ARTI, W_RINGL, SHOPBASE, ROOMOFFSET } from '../js/const.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { beginBurn } from '../js/burn.js';
import { BURN_OBJECT, peekTimer } from '../js/timeout.js';
import { freezeObjectInIcebox, removedFromIcebox } from '../js/ice.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKey, resetInputState } from '../js/input.js';

async function setup(ice = false, sale = false) {
    resetGame(); initRng(31); game.moves = 100; game.flags = { verbose: true }; game.context = {};
    game._startup_role = 'Barbarian'; game._startup_align = 'neutral';
    game.u = { ux:10, uy:10, uz:{dnum:0,dlevel:1}, uhp:100, uhpmax:100, uen:30, uenmax:30,
        ulevel:10, uhunger:900, acurr:{a:[12,12,12,12,12,12]}, ualign:{type:0,record:10} };
    game.level = new GameMap();
    for(let x=1;x<79;x++) for(let y=0;y<21;y++) Object.assign(game.level.at(x,y),{typ:ROOM,lit:true});
    const def=artifactDefinitionForName('The Heart of Ahriman');
    const item={id:1,artifact:def.name,cls:def.cls,kind:def.base,otyp:def.otyp,glyph:def.glyph,letter:'a',quan:1,age:0};
    const box={id:2,otyp:ice?216:215,cls:'tool',kind:ice?'ice box':'large box',quan:1,ox:10,oy:10,contents:[]};
    game.inventory=[item]; game.level.objects=[box]; vision_reset();
    game._command_mode='invokeObject'; await rhack('a');
    let shkp;
    if(sale) {
        shkp={isshk:true,shoproom:ROOMOFFSET,shoptype:SHOPBASE,shknam:'Izchak',mx:12,my:10,shk:{x:12,y:10},bill:[],billct:0,
            m_id:11,minvent:[{cls:'coin',otyp:466,glyph:'$',quan:10000}]};
        game.level.rooms=[{rtype:SHOPBASE,resident:shkp}]; game.level.monsters=[shkp];
        for(let x=1;x<79;x++) for(let y=0;y<21;y++) game.level.at(x,y).roomno=ROOMOFFSET;
    }
    return {item,box,shkp};
}
async function stash(box,key='a') {
    const ice=box.kind==='ice box';
    game[ice?'_icebox_put_container':'_container_put_container']=box;
    game._command_mode=ice?'iceBoxStashObject':'containerStashObject';
    game._pending_message=''; game._message_more=0; await rhack(key);
}

for(const ice of [false,true]) {
    test(`${ice?'ice box':'floor box'} detaches Heart before landing and insertion`,async()=>{
        const {item,box}=await setup(ice); enableRngLog({reset:true});
        await stash(box);
        assert.equal(game.u.uprops[LEVITATION].extrinsic&W_ARTI,0);
        assert.equal(game.u.levitating,false);
        assert.equal(box.contents[0],item);
        assert.match(game._pending_message,/float gently.*You put/s);
        assert.equal(getRngLog().filter(line=>line.startsWith('rnz(100)')).length,1);
        if(ice) {assert.ok(item.age<0); const stored=item.age; game.moves+=10; removedFromIcebox(item); assert.equal(item.age,110-stored);}
        else assert.ok(item.age>100);
    });
    test(`${ice?'ice box':'floor box'} waits for water escape before inserting Heart`,async()=>{
        const {item,box}=await setup(ice); game.level.at(10,10).typ=POOL;
        await stash(box);
        assert.equal(game._command_mode,'waterCrawlMore');
        assert.equal(game.inventory.includes(item),false); assert.equal(box.contents.length,0);
        restoreSaveState(encodeSaveState());
        const after=game._artifact_float_continuation.after;
        const restored=game.level.objects.find(obj=>obj.id===2);
        assert.equal(after.object.id,1); assert.equal(after.container,restored);
        for(let i=0;i<12&&game._artifact_float_continuation;i++) await rhack(' ');
        assert.equal(restored.contents[0],after.object);
        assert.deepEqual([restored.ox,restored.oy],[10,10]);
        assert.notDeepEqual([game.u.ux,game.u.uy],[10,10]);
        assert.equal(game.context.move,1);
    });
    test(`${ice?'ice box':'floor box'} offers sale only after Heart source loss`,async()=>{
        const {item,box}=await setup(ice,true);
        const blade={id:3,letter:'c',cls:'weapon',kind:'dagger',otyp:29,glyph:')',quan:1}; game.inventory.push(blade);
        game[ice?'_icebox_put_container':'_container_put_container']=box;
        game[ice?'_icebox_put_entries':'_container_put_entries']=[item,blade].map(object=>({item:object,letter:object.letter,amount:1}));
        game[ice?'_icebox_put_selected':'_container_put_selected']=['a','c'];
        game._command_mode=ice?'iceBoxPutObjects':'containerPutObjects'; game._pending_message=''; game._message_more=0;
        await rhack('\r');
        while(game._command_mode==='containerSaleMore')await rhack(' ');
        assert.equal(game._command_mode,'shopSaleConfirm');
        assert.equal(game._shop_sale_pending.after.object,item);
        assert.equal(box.contents.length,0);
        assert.equal(game.inventory.includes(blade),true);
        assert.ok(item.age>100,'Heart sale precedes ice age conversion');
        await rhack('n');
        while(game._command_mode==='containerSaleMore')await rhack(' ');
        assert.equal(game._shop_sale_pending.after.object,blade);
        assert.equal(game.inventory.includes(blade),false); assert.equal(box.contents[0],item);
        assert.equal(game.u.levitating,false);
        const age=item.age; while(game._message_more) await rhack(' ');
        await rhack('n');
        assert.equal(box.contents[0],blade); assert.equal(blade.no_charge,true);
        assert.equal(item.age,age,'continuing the sale does not repeat Heart cooldown or freeze');
    });
}

for(const kind of ['oil lamp','magic lamp','brass lantern','tallow candle','wax candle','potion of oil']) test(`container insertion snuffs ${kind} after detachment`,async()=>{
    const {box}=await setup(false); game.inventory=[];
    const obj={letter:'c',id:3,kind,cls:kind==='potion of oil'?'potion':'tool',quan:1,age:200,spe:1};
    game.inventory.push(obj); beginBurn(obj); const expires=peekTimer(BURN_OBJECT,obj);
    game.moves+=5;
    const result=await shop.putInventoryObjectIntoContainer(box,obj);
    assert.equal(result.moved,true); assert.equal(obj.lamplit,false);
    assert.equal(peekTimer(BURN_OBJECT,obj),0);
    if(expires) assert.equal(obj.age,195);
    assert.match(result.messages.join(' '),/goes out|flame is extinguished/);
});

for(const ice of [false,true]) {
    for(const source of ['inactive','ring','intrinsic']) test(`${ice?'ice box':'box'} preserves ${source} levitation state`,async()=>{
        const {item,box}=await setup(ice);
        if(source==='inactive') {game.u.uprops[LEVITATION].extrinsic=0; game.u.levitating=false; item._invokedProperty=null;}
        if(source==='ring') game.inventory.push({letter:'c',cls:'ring',kind:'ring of levitation',worn:true,owornmask:W_RINGL,quan:1});
        if(source==='intrinsic') game.u.uprops[LEVITATION].intrinsic=0x01000000;
        enableRngLog({reset:true});
        const result=await shop.putInventoryObjectIntoContainer(box,item);
        assert.equal(result.moved,true); assert.equal(game.u.levitating,source!=='inactive');
        assert.doesNotMatch(result.message,/float gently/);
        assert.equal(getRngLog().filter(line=>line.startsWith('rnz(100)')).length,source==='inactive'?0:1);
    });
    for(const amulet of [false,true]) test(`${ice?'ice box':'box'} finishes after drowning ${amulet?'life saving':'wizard refusal'}`,async()=>{
        const {item,box}=await setup(ice); game.flags.debug=!amulet;
        if(amulet) game.inventory.push({letter:'c',cls:'amulet',kind:'amulet of life saving',amuletIndex:1,worn:true,quan:1});
        for(let x=1;x<79;x++)for(let y=0;y<21;y++)game.level.at(x,y).typ=STONE;
        game.level.at(10,10).typ=POOL;game.level.at(20,10).typ=ROOM;
        await stash(box);
        assert.equal(game._command_mode,amulet?'lifeSavingMore':'deathDieMore');
        assert.equal(game.inventory.includes(item),false);assert.equal(box.contents.length,0);
        await rhack(' ');if(!amulet)await rhack('n');
        assert.equal(game._artifact_float_continuation,null);assert.equal(box.contents[0],item);
    });
}

for(const answer of ['y','n','a','q']) test(`container sale answer ${answer} resumes the selection without another detachment`,async()=>{
    const {box,shkp}=await setup(false,true); game.inventory=[];
    const first={id:3,letter:'c',cls:'weapon',kind:'dagger',otyp:29,glyph:')',quan:3};
    const last={id:4,letter:'d',cls:'weapon',kind:'dagger',otyp:29,glyph:')',quan:1,spe:1};
    game.inventory=[first,last];
    game._container_put_container=box;game._container_put_entries=[{item:first,letter:'c',amount:1},{item:last,letter:'d',amount:1}];
    game._container_put_selected=['c','d'];game._command_mode='containerPutObjects';game._pending_message='';game._message_more=0;
    await rhack('\r');
    assert.equal(game._command_mode,'shopSaleConfirm'); assert.equal(first.quan,2);assert.equal(box.contents.length,0);
    const split=game._shop_sale_pending.after.object;
    assert.notEqual(split,first);assert.equal(split.quan,1);
    const before=getRngLog();await rhack('x');assert.deepEqual(getRngLog(),before);
    restoreSaveState(encodeSaveState());
    const restoredFirst=game.inventory.find(obj=>obj.id===3),restoredBox=game.level.objects.find(obj=>obj.id===2);
    while(game._message_more)await rhack(' ');
    await rhack(answer);
    if(answer==='y'||answer==='n'){
        while(game._command_mode==='containerSaleMore')await rhack(' ');
        assert.equal(game._command_mode,'shopSaleConfirm');
        while(game._message_more)await rhack(' ');
        await rhack('n');
    }
    assert.equal(restoredFirst.quan,2);assert.equal(restoredBox.contents.length,2);
    assert.equal(game._shop_sale_pending,null);assert.equal(game._command_mode,null);assert.equal(game.context.move,1);
    const sold=restoredBox.contents.find(obj=>obj.id!==4);
    assert.equal(!!sold.no_charge,answer==='n'||answer==='q');
    const second=restoredBox.contents.find(obj=>obj.id===4);
    assert.equal(!!second.no_charge,answer!=='a');
});

test('moveloop charges one floor-box transfer turn across water cursor input',async()=>{
    const {item,box}=await setup(false);resetInputState();
    Object.assign(game.u,{ulevel:12,teleportation:true,teleportControl:true,umovement:12});game.level.at(10,10).typ=POOL;
    game.level.regions=[{type:'gas_cloud',damage:0,ttl:5,coords:[{x:50,y:10}]}];
    game._container_put_container=box;game._command_mode='containerStashObject';game._pending_message='';game._message_more=0;
    pushKey('a');await moveloop_core();assert.equal(game.moves,100);assert.equal(box.contents.length,0);
    while(game._message_more)await rhack(' ');
    pushKey('l');await moveloop_core();assert.equal(game.moves,100);
    pushKey('.');await moveloop_core();assert.equal(box.contents[0],item);
    while(game._message_more)await rhack(' ');
    pushKey('\x1b');await moveloop_core();assert.equal(game.moves,101);assert.equal(game.level.regions[0].ttl,4);
    resetInputState();
});

test('blind container snuff still cancels fuel timeout without visible feedback',async()=>{
    const {box}=await setup(false);game.u.blind=true;
    const obj={id:3,letter:'c',kind:'wax candle',otyp:371,cls:'tool',quan:2,age:100};game.inventory=[obj];beginBurn(obj);
    const result=await shop.putInventoryObjectIntoContainer(box,obj);
    assert.equal(obj.lamplit,false);assert.equal(peekTimer(BURN_OBJECT,obj),0);
    assert.doesNotMatch(result.message,/flame.*extinguished/);
});

for(const [kind,otyp,relative] of [['oil lamp',227,true],['brass lantern',226,true],['tallow candle',370,true],
    ['wax candle',371,true],['potion of oil',252,true],['candelabrum of invocation',10076,true],
    ['magic lamp',228,false],['dagger',29,false]]) test(`ice-box age conversion respects ${kind} source age type`,async()=>{
    await setup(true);
    const obj={kind,otyp,age:130};freezeObjectInIcebox(obj);
    assert.equal(obj.age,relative?130:-30);
    game.moves=200;removedFromIcebox(obj);
    assert.equal(obj.age,relative?130:230);
});

test('unpaid candle snuff precedes returning its bill and uses shop ownership',async()=>{
    const {box,shkp}=await setup(false,true);
    const candle={id:3,letter:'c',kind:'wax candle',otyp:371,cls:'tool',quan:2,age:100};game.inventory=[candle];
    shop.addObjectToShopBill(shkp,candle,40);beginBurn(candle);
    const result=await shop.putInventoryObjectIntoContainer(box,candle);
    assert.match(result.message,/Izchak's candles' flames are extinguished/);
    assert.equal(candle.unpaid,false);assert.equal(shkp.billct,0);assert.equal(candle.lamplit,false);
});

for(const cash of [0,2]) test(`${cash?'cash acceptance asks separately for':'credit acceptance continues later'} credit sales`,async()=>{
    const {box,shkp}=await setup(false,true);shkp.minvent=cash?[{cls:'coin',otyp:466,quan:cash}]:[];
    const first={id:3,letter:'c',cls:'weapon',kind:'dagger',otyp:29,glyph:')',quan:1};
    const last={id:4,letter:'d',cls:'weapon',kind:'dagger',otyp:29,glyph:')',quan:1,spe:1};game.inventory=[first,last];
    game._container_put_container=box;game._container_put_entries=[first,last].map(item=>({item,letter:item.letter,amount:1}));
    game._container_put_selected=['c','d'];game._command_mode='containerPutObjects';game._pending_message='';game._message_more=0;
    await rhack('\r');while(game._message_more)await rhack(' ');await rhack('a');
    if(cash){
        while(game._command_mode==='containerSaleMore')await rhack(' ');
        assert.equal(game._command_mode,'shopSaleConfirm');assert.equal(game._shop_sale_pending.credit,true);
        assert.equal(box.contents.length,1);while(game._message_more)await rhack(' ');await rhack('y');
    }
    assert.equal(game._command_mode,null);assert.equal(box.contents.length,2);assert.ok(shkp.credit>0);
});
