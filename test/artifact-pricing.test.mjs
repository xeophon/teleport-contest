import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { ARTIFACT_DEFS, artifactDefinitionForName } from '../js/mklev.js';
import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { ROOM, SHOPBASE, ROOMOFFSET, LEVITATION, W_ARTI } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

// Costs are C artilist data, excluding the obsolete #if 0 Elf artifact.
const source=fs.readFileSync(new URL('../nethack-c/upstream/include/artilist.h',import.meta.url),'utf8')
    .replace(/\/\*[\s\S]*?\*\//g,'').replace(/#if 0\b[\s\S]*?#endif/g,'');
const costs=[...source.matchAll(/A\("([^"\n]+)"[\s\S]*?,\s*(\d+)L,\s*[A-Z_]+,\s*[A-Z_]+\)/g)]
    .map(match=>[match[1],Number(match[2])]);
function setup(name='The Heart of Ahriman') {
    resetGame();initRng(31);game.moves=100;game.flags={verbose:true};game.context={};
    game._startup_role='Barbarian';game._startup_align='neutral';
    game.u={ux:10,uy:10,uz:{dnum:0,dlevel:1},uhp:100,uhpmax:100,uen:30,uenmax:30,ulevel:10,uhunger:900,
        acurr:{a:[12,12,12,12,12,12]},ualign:{type:0,record:10}};
    const shkp={isshk:true,shoproom:ROOMOFFSET,shoptype:SHOPBASE,shknam:'Izchak',mx:12,my:10,shk:{x:12,y:10},bill:[],billct:0,
        m_id:1,minvent:[{cls:'coin',otyp:466,glyph:'$',quan:20000}]};
    game.level=new GameMap();
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:ROOM,lit:true,roomno:ROOMOFFSET});
    game.level.rooms=[{rtype:SHOPBASE,resident:shkp}];game.level.monsters=[shkp];
    const def=artifactDefinitionForName(name);
    const item={id:1,artifact:name,cls:def.cls,kind:def.base,otyp:def.otyp,glyph:def.glyph,letter:'a',quan:1,age:0,known:true,dknown:true};
    game.inventory=[item];vision_reset();return{item,shkp};
}

test('artifact table includes exactly the enabled C artifact names',()=>{
    assert.equal(costs.length,33);assert.deepEqual(ARTIFACT_DEFS.map(def=>def.name),costs.map(([name])=>name));
});
for(const [name,cost] of costs) test(`${name} uses its C artifact cost for both canonical identities`,()=>{
    const {item,shkp}=setup(name);const definition=artifactDefinitionForName(name);
    assert.equal(definition.cost,cost);assert.equal(shop.shopBaseCost(item),cost);
    assert.equal(shop.shopItemPrice(item),cost*4);
    assert.equal(shop.shopSaleOffer(item,shkp),Math.round(Math.trunc(cost/4)/2));
    delete item.artifact;item.oartifact=ARTIFACT_DEFS.indexOf(definition)+1;
    assert.equal(shop.shopBaseCost(item),cost);assert.equal(shop.shopItemPrice(item),cost*4);
});

for(const [name,spe,expectedSale,expectedBuy] of [['Excalibur',3,515,16120],['Excalibur',-3,500,16000],['The Mitre of Holiness',2,260,8080]])
    test(`${name} enchantment ${spe} applies after the artifact purchase divisor`,()=>{
        const {item,shkp}=setup(name);item.spe=spe;
        assert.equal(shop.shopSaleOffer(item,shkp),expectedSale);assert.equal(shop.shopItemPrice(item),expectedBuy);
    });
for(const [cha,expected] of [[5,20000],[6,15000],[7,15000],[8,13332],[10,13332],[11,10000],[15,10000],[16,7500],[18,6668],[19,5000]])
    test(`Heart shop charge rounds before artifact markup at charisma ${cha}`,()=>{
        const {item}=setup();game.u.acurr.a[5]=cha;assert.equal(shop.shopItemPrice(item),expected);
    });

test('artifact surcharge applies after combined identification and clothing fractions',()=>{
    const {item,shkp}=setup('Sunsword');item.id=4;item.dknown=false;
    game.inventory.push({kind:'dunce cap',cls:'armor',worn:true,quan:1});shkp.surcharge=true;
    assert.equal(shop.shopItemPrice(item),14224);
});

test('artifact sale uses low-level tourist divisor and unknown non-gem discount',()=>{
    const {item,shkp}=setup('Excalibur');game._startup_role='Tourist';game.u.ulevel=14;
    item.dknown=false;shkp.m_id=4;assert.equal(shop.shopSaleOffer(item,shkp),250);
    game.u.ulevel=15;assert.equal(shop.shopSaleOffer(item,shkp),375);
});

test('unknown Heart stone is excluded from the non-gem sale discount',()=>{
    const {item,shkp}=setup();item.dknown=false;shkp.m_id=4;
    assert.equal(shop.shopSaleOffer(item,shkp),313);
    game.inventory.push({kind:'dunce cap',cls:'armor',worn:true,quan:1});assert.equal(shop.shopSaleOffer(item,shkp),208);
});

for(const ice of [false,true]) test(`Heart ${ice?'ice-box':'floor-box'} sale quotes artifact value after landing`,async()=>{
    const {item,shkp}=setup();game._command_mode='invokeObject';await rhack('a');
    const box={id:2,kind:ice?'ice box':'large box',otyp:ice?216:215,cls:'tool',ox:10,oy:10,quan:1,contents:[]};game.level.objects=[box];
    game[ice?'_icebox_put_container':'_container_put_container']=box;game._command_mode=ice?'iceBoxStashObject':'containerStashObject';
    game._pending_message='';game._message_more=0;enableRngLog({reset:true});await rhack('a');
    assert.equal(game.u.uprops[LEVITATION].extrinsic&W_ARTI,0);assert.equal(game.inventory.includes(item),false);
    assert.equal(box.contents.length,0);assert.ok(item.age>100);const age=item.age;
    while(game._command_mode==='containerSaleMore')await rhack(' ');
    assert.equal(game._command_mode,'shopSaleConfirm');assert.equal(game._shop_sale_pending.offer,313);
    assert.match(game._pending_message,/offers 313 gold pieces/);await rhack('y');
    assert.equal(box.contents[0],item);assert.equal(game._goldCount,313);assert.equal(shop.shopkeeperCash(shkp),19687);
    assert.equal(item.age,ice?100-age:age);assert.equal(getRngLog().filter(line=>line.startsWith('rnz(100)')).length,1);
});
