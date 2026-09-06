import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { regenerateHeroHealth, regenerateHeroPower, processMonsterTurns } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import * as C from '../js/const.js';

function setup(values=[0]) {
    resetGame();initRng(41);
    Object.assign(game,{moves:100,flags:{verbose:true},context:{},inventory:[],level:new GameMap(),_startup_role:'Wizard',
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:10,uhp:10,uhpmax:100,uen:10,uenmax:100,
            uhunger:900,umovement:0,ualign:{type:0,record:0},acurr:{a:[10,10,10,10,10,10]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    vision_reset();enableRngLog({reset:true});
    game.coreCtx.r=values.map(BigInt).reverse();game.coreCtx.n=values.length;
}

for(const wtcap of [0,1,2,3,4,5])for(const moved of [false,true])test(`human natural healing load=${wtcap}, moved=${moved}`,()=>{
    setup();game.u.umoved=moved;
    const allowed=wtcap<C.MOD_ENCUMBER||!moved;
    assert.equal(regenerateHeroHealth(wtcap),false);
    assert.equal(game.u.uhp,allowed?11:10);
    assert.equal(getRngLog().filter(line=>line.startsWith('rn2(100)')).length,allowed?1:0);
});

for(const [regen,sleepy,asleep,roll,expected] of [[true,false,false,99,11],[false,true,true,99,12],
    [true,true,true,99,12],[true,true,true,0,13],[false,true,false,99,10],[false,false,true,99,10]])
    test(`human regeneration sources regen=${regen}, Sleepy=${sleepy}, asleep=${asleep}, roll=${roll}`,()=>{
        setup([roll]);game.u.umoved=true;game.u.usleep=asleep?90:0;
        game.u.uprops[C.REGENERATION]={intrinsic:regen?C.FROMOUTSIDE:0};
        game.u.uprops[C.SLEEPY]={intrinsic:sleepy?30:0};
        regenerateHeroHealth(C.HVY_ENCUMBER);assert.equal(game.u.uhp,expected);
        assert.equal(getRngLog().length,regen||sleepy&&asleep?1:0);
    });

for(const canonical of [false,true])for(const [turn,moved,load,regen,sleepy,heal] of [
    [100,false,0,false,false,1],[101,false,0,false,false,0],[100,true,2,false,false,0],
    [100,false,2,false,false,1],[101,true,5,true,false,1],[101,true,5,false,true,1]])
    test(`monster regeneration canonical=${canonical}, turn=${turn}, moved=${moved}, load=${load}, regen=${regen}, sleepy=${sleepy}`,()=>{
        setup();game.moves=turn;game.u._polyself_form={name:'newt'};
        game.u.umoved=moved;game.u.usleep=sleepy?90:0;
        game.u.uprops[C.REGENERATION]={extrinsic:regen?C.W_RINGL:0};game.u.uprops[C.SLEEPY]={intrinsic:sleepy?30:0};
        if(canonical){game.u.mh=10;game.u.mhmax=100;game.u.uhp=7;game.u.uhpmax=50;}
        regenerateHeroHealth(load);assert.equal(canonical?game.u.mh:game.u.uhp,10+heal);
        if(canonical)assert.equal(game.u.uhp,7);
        assert.deepEqual(getRngLog(),[]);
    });

for(const [hp,rolls,half,turn,regen,loss] of [[10,[9,0],false,101,false,1],
    [10,[9,0],true,101,false,0],[10,[9,0],true,100,false,1],[10,[0,7],false,100,false,0],
    [1,[],false,100,false,0],[10,[],false,100,true,0]])
    test(`eel dehydration HP=${hp}, rolls=${rolls}, half=${half}, turn=${turn}, regen=${regen}`,()=>{
        setup(rolls);game.moves=turn;game.u._polyself_form={name:'giant eel'};
        game.u.mh=hp;game.u.mhmax=10;game.u.uprops[C.HALF_PHDAM]={intrinsic:half?C.FROMOUTSIDE:0};
        game.u.uprops[C.REGENERATION]={intrinsic:regen?C.FROMOUTSIDE:0};
        regenerateHeroHealth(0);assert.equal(game.u.mh,hp-loss);assert.equal(game.u.uhp,10);
        assert.equal(getRngLog().length,rolls.length);
    });

for(const protection of ['pool','water level','intrinsic breathing','extrinsic breathing'])test(`eel out-of-water branch is bypassed by ${protection}`,()=>{
    setup();game.u._polyself_form={name:'giant eel'};game.u.mh=9;game.u.mhmax=10;
    if(protection==='pool')game.level.at(10,10).typ=C.POOL;
    if(protection==='water level')game.water_level={dnum:0,dlevel:1};
    if(protection.includes('intrinsic'))game.u.uprops[C.MAGICAL_BREATHING]={intrinsic:C.FROMOUTSIDE};
    if(protection.includes('extrinsic'))game.u.uprops[C.MAGICAL_BREATHING]={extrinsic:C.W_AMUL};
    assert.equal(regenerateHeroHealth(0),true);assert.equal(game.u.mh,10);assert.deepEqual(getRngLog(),[]);
});

test('full monster HP never heals the inactive human body',()=>{
    setup();game.u._polyself_form={name:'newt'};game.u.mh=game.u.mhmax=10;
    assert.equal(regenerateHeroHealth(0),false);assert.equal(game.u.uhp,10);assert.deepEqual(getRngLog(),[]);
});

test('an eel below a raised drawbridge still occupies its underlying moat',()=>{
    setup();game.u._polyself_form={name:'giant eel'};game.u.mh=9;game.u.mhmax=10;
    Object.assign(game.level.at(10,10),{typ:C.DRAWBRIDGE_UP,drawbridgemask:C.DB_MOAT});
    assert.equal(regenerateHeroHealth(0),true);assert.equal(game.u.mh,10);assert.deepEqual(getRngLog(),[]);
});

test('the ordinary turn loop regenerates monster HP without changing inactive human HP',async()=>{
    setup(Array(500).fill(1));game.moves=99;game.u._polyself_form={name:'newt'};
    game.u.mh=9;game.u.mhmax=10;game.u.uen=game.u.uenmax;
    await processMonsterTurns();assert.equal(game.moves,100);assert.equal(game.u.mh,10);
    assert.equal(game.u.uhp,10);assert.equal(getRngLog().some(line=>line.startsWith('rn2(100)')),false);
});

for(const [con,bonus,roll,heal] of [[10,5,24,1],[10,5,25,0],[3,-10,12,1],[3,-10,13,0]])test(`healing chance uses effective Constitution ${con}+${bonus} with roll ${roll}`,()=>{
    setup([roll]);game.u.acurr.a[C.A_CON]=con;game.u.abon={a:[0,0,0,0,bonus,0]};
    regenerateHeroHealth(0);assert.equal(game.u.uhp,10+heal);
});

for(const [role,turn,load,property,heals] of [['Wizard',14,0,false,true],['Wizard',13,0,false,false],
    ['Knight',18,0,false,true],['Knight',14,0,false,false],['Wizard',14,2,false,false],['Wizard',13,5,true,true]])
    test(`power regeneration role=${role}, turn=${turn}, load=${load}, intrinsic=${property}`,()=>{
        setup();game._startup_role=role;game.moves=turn;
        game.u.uprops[C.ENERGY_REGENERATION]={intrinsic:property?C.FROMOUTSIDE:0};
        regenerateHeroPower(load);assert.equal(game.u.uen,heals?11:10);assert.equal(getRngLog().length,heals?1:0);
    });

for(const source of ['none','intrinsic','extrinsic'])test(`power's magical breathing bonus uses ${source} source`,()=>{
    setup();game.moves=14;game.u.uprops[C.MAGICAL_BREATHING]={[source]:source==='extrinsic'?C.W_AMUL:C.FROMOUTSIDE};
    regenerateHeroPower(0);
    assert.match(getRngLog()[0],new RegExp(`^rn2\\(${source==='extrinsic'?4:2}\\)`));
});

test('regeneration clamps at full health and marks the status for display',()=>{
    setup();game.u.uhp=99;game.u.usleep=90;game.u.uprops[C.SLEEPY]={intrinsic:30};
    assert.equal(regenerateHeroHealth(0),true);assert.equal(game.u.uhp,100);assert.equal(game.disp.botl,true);
});

test('prayer blocks HP regeneration while power still uses unencumbered timing',async()=>{
    setup(Array(500).fill(1));game.moves=13;game.u.uinvulnerable=true;
    game.inventory=[{kind:'long sword',cls:'weapon',quan:100}];
    await processMonsterTurns();assert.equal(game.u.uhp,10);assert.ok(game.u.uen>10);
    assert.equal(getRngLog().some(line=>line.startsWith('rn2(100)')),false);
});
