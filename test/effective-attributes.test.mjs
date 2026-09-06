import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { currentHeroAttribute, currentHeroStrength } from '../js/attrib.js';
import { rhack, heroCarryCapacity, adjustHeroAttribute } from '../js/cmd.js';
import { setArmorWorn, changeArmorBonuses } from '../js/do_wear.js';
import { digAbon, digDbon, shopWallDamageCost } from '../js/dig.js';
import { restoreLifeSavedBody } from '../js/end.js';
import { spellDamageBonus } from '../js/spell.js';
import { resistConflict } from '../js/mhitm.js';
import { GameDisplay } from '../js/game_display.js';
import { initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { MONS, PM_AMOROUS_DEMON } from '../js/permonst.js';
import * as C from '../js/const.js';

function setup() {
    resetGame();initRng(73);
    Object.assign(game,{moves:100,flags:{verbose:true},context:{},inventory:[],level:new GameMap(),
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:10,uhp:1000,uhpmax:1000,uhunger:900,
            acurr:{a:[10,10,10,10,10,10]},abon:{a:[0,0,0,0,0,0]},atemp:{a:[0,0,0,0,0,0]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    vision_reset();game.viz_array=Array.from({length:21},()=>Array(80).fill(C.COULD_SEE|C.IN_SIGHT));
}

for(let attr=0;attr<C.A_MAX;attr++)for(const [base,bonus,temp,expected] of [[10,5,-3,12],[3,-8,-2,3],[25,200,0,attr===C.A_STR?125:25]])
    test(`effective attribute ${attr} combines ${base}, ${bonus}, ${temp} before source clamping`,()=>{
        setup();game.u.acurr.a[attr]=base;game.u.abon.a[attr]=bonus;game.u.atemp.a[attr]=temp;
        assert.equal(currentHeroAttribute(attr),expected);assert.equal(game.u.acurr.a[attr],base);
    });

for(const str of [3,18,19,49,50,93,99,100,118,119,121,122,125])test(`carrying and shop damage compress exceptional Strength ${str}`,()=>{
    setup();game.u.acurr.a[C.A_STR]=str;
    const compressed=str<=18?str:str<=121?19+Math.trunc(str/50):str-100;
    assert.equal(currentHeroStrength(),compressed);assert.equal(shopWallDamageCost(),10*compressed);
    assert.equal(heroCarryCapacity(),Math.min(1000,25*(compressed+10)+50));
});

test('power gloves preserve base losses and temporary modifiers through a saved removal',()=>{
    setup();game.u.acurr.a[C.A_STR]=12;game.u.atemp.a[C.A_STR]=-2;
    const gloves={id:1,kind:'gauntlets of power',cls:'armor',letter:'a',spe:0};game.inventory.push(gloves);
    setArmorWorn(gloves,true);changeArmorBonuses(gloves,true);
    assert.equal(currentHeroAttribute(C.A_STR),125);assert.equal(game.u.acurr.a[C.A_STR],12);
    adjustHeroAttribute(C.A_STR,-3);assert.equal(game.u.acurr.a[C.A_STR],9);
    restoreSaveState(encodeSaveState());const saved=game.inventory[0];
    changeArmorBonuses(saved,false);setArmorWorn(saved,false);
    assert.equal(game.u.acurr.a[C.A_STR],9);assert.equal(currentHeroAttribute(C.A_STR),7);
});

for(const form of [{name:'wood nymph'},{mlet:'n'},{name:'incubus'},{pm:PM_AMOROUS_DEMON}])
    test(`nymph/amorous form Charisma override: ${JSON.stringify(form)}`,()=>{
        setup();game.u._polyself_form=form;game.u.acurr.a[C.A_CHA]=3;
        assert.equal(currentHeroAttribute(C.A_CHA),18);assert.equal(game.u.acurr.a[C.A_CHA],3);
    });

test('a dunce cap overrides combined Intelligence and Wisdom, including values below six',()=>{
    setup();const cap={kind:'dunce cap',cls:'armor',worn:true};game.inventory.push(cap);game.u.acurr.a[C.A_INT]=3;
    game.u.abon.a[C.A_WIS]=20;assert.equal(currentHeroAttribute(C.A_INT),6);assert.equal(currentHeroAttribute(C.A_WIS),6);
    cap.worn=false;assert.equal(currentHeroAttribute(C.A_INT),3);assert.equal(currentHeroAttribute(C.A_WIS),25);
});

test('Ogresmasher uses primary weapon identity and its Constitution affects life saving',()=>{
    setup();const weapon={artifact:'Ogresmasher',kind:'war hammer',cls:'weapon'};game.inventory.push(weapon);
    game.u.uswapwep=weapon;assert.equal(currentHeroAttribute(C.A_CON),10);
    game.u.uwep=weapon;assert.equal(currentHeroAttribute(C.A_CON),25);
    restoreLifeSavedBody();assert.equal(game.u.uhp,170);assert.equal(game.u.acurr.a[C.A_CON],10);
});

test('attribute bonuses and losses affect digging attack and damage formulas',()=>{
    setup();game.u.abon.a[C.A_STR]=8;game.u.abon.a[C.A_DEX]=7;game.u.atemp.a[C.A_DEX]=-2;
    assert.equal(digAbon(),2);assert.equal(digDbon(),2);
    game.u._polyself_form={name:'stone golem'};assert.equal(digDbon(),0);
});

for(const [intelligence,bonus,damage] of [[10,8,11],[10,15,13],[10,-7,7]])test(`spell damage reads effective Intelligence ${intelligence}+${bonus}`,()=>{
    setup();game.u.ulevel=14;game.u.acurr.a[C.A_INT]=intelligence;game.u.abon.a[C.A_INT]=bonus;
    assert.equal(spellDamageBonus(10),damage);
});

for(const [wis,dex,bonus,hitBon] of [[25,3,0,-3],[3,10,15,11]])test(`ray accuracy uses Dexterity ${dex}+${bonus}, independently of Wisdom ${wis}`,async()=>{
    setup();game.u.acurr.a[C.A_WIS]=wis;game.u.acurr.a[C.A_DEX]=dex;game.u.abon.a[C.A_DEX]=bonus;
    game.nhDisplay={cols:35};game.level.at(11,10).typ=C.STONE;
    game._command_mode='spellDirection';game._casting_spell={name:'magic missile',skillLevel:C.P_BASIC};
    await rhack('l');assert.equal(game._player_spell_continuation?.state.hitBon,hitBon);
});

test('conflict uses effective Charisma when calculating a monster resistance threshold',()=>{
    setup();game.u.ulevel=1;game.u.abon.a[C.A_CHA]=8;
    const mon={data:MONS.find(mon=>mon.name==='wolf')};game.coreCtx.r=[9n];game.coreCtx.n=1;
    assert.equal(resistConflict(mon),false);
});

for(const [sides,flight,expected] of [[0,false,550],[C.LEFT_SIDE,false,450],[C.BOTH_SIDES,false,350],[C.BOTH_SIDES,true,550]])
    test(`carrying capacity respects wounded sides ${sides} and flight ${flight}`,()=>{
        setup();game.u.uprops[C.WOUNDED_LEGS]={intrinsic:20,extrinsic:sides};
        game.u.uprops[C.FLYING]={intrinsic:flight?C.FROMOUTSIDE:0,extrinsic:0};
        assert.equal(heroCarryCapacity(),expected);
    });

test('zero-weight forms scale capacity by size and both wounds retain minimum one',()=>{
    setup();game.u._polyself_form={name:'fog cloud',cwt:0,msize:2};
    assert.equal(heroCarryCapacity(),550);
    game.u.acurr.a[C.A_STR]=3;game.u.acurr.a[C.A_CON]=3;
    game.u.uprops[C.WOUNDED_LEGS]={intrinsic:20,extrinsic:C.BOTH_SIDES};assert.equal(heroCarryCapacity(),1);
});

test('strong mounts and levitation supply full capacity while delayed levitation boots do not',()=>{
    setup();game.u.usteed={data:MONS.find(mon=>mon.name==='horse')};assert.equal(heroCarryCapacity(),1000);
    game.u.usteed=null;game.u.uprops[C.LEVITATION]={intrinsic:0,extrinsic:C.W_ARMF,blocked:0};
    game._armor_wear_occupation={kind:'levitation boots',turns:1};assert.equal(heroCarryCapacity(),550);
    game._armor_wear_occupation=null;assert.equal(heroCarryCapacity(),1000);
    game.u.uprops[C.LEVITATION].blocked=C.I_SPECIAL;assert.equal(heroCarryCapacity(),1000);
});

test('status display combines armor bonuses and temporary loss without changing base values',()=>{
    setup();game.u.abon.a[C.A_INT]=8;game.u.atemp.a[C.A_INT]=-3;
    const rows=GameDisplay.prototype.renderStatus.call({putstr(){},clearRow(){}});
    assert.match(rows[0],/In:15/);assert.equal(game.u.acurr.a[C.A_INT],10);
});
