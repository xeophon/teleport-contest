import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { hasWoundedLegs, setWoundedLegs } from '../js/do.js';
import { currentHeroAttribute } from '../js/attrib.js';
import { beginHeroLegHealing, finishHeroLegHealing, heroCarryCapacity, encumberMsg, rhack, __steedTestHooks } from '../js/cmd.js';
import { processMonsterTurns, moveloop_core } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { beginBurn } from '../js/burn.js';
import { digFumblingResult } from '../js/dig.js';
import { vision_reset } from '../js/vision.js';
import { resetInputState, pushKey } from '../js/input.js';
import * as C from '../js/const.js';

function setup() {
    resetGame(); resetInputState(); initRng(41);
    Object.assign(game,{moves:99,flags:{verbose:true},context:{},inventory:[],level:new GameMap(),
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:10,uhp:100,uhpmax:100,uen:100,uenmax:100,
            uhunger:900,umovement:0,ualign:{type:0,record:0},acurr:{a:[10,10,10,10,10,10]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    vision_reset(); enableRngLog({reset:true});
}

for(const dex of [3,10,25])for(const mounted of [false,true])test(`wounded legs use one temporary Dexterity penalty: base=${dex}, mounted=${mounted}`,()=>{
    setup();game.u.acurr.a[C.A_DEX]=dex;
    if(mounted)game.u.usteed={data:{name:'horse'}};
    setWoundedLegs(C.LEFT_SIDE,30);setWoundedLegs(C.RIGHT_SIDE,10);setWoundedLegs(C.RIGHT_SIDE,50);
    assert.equal(game.u.acurr.a[C.A_DEX],dex);assert.equal(game.u.atemp.a[C.A_DEX],-1);
    assert.equal(currentHeroAttribute(C.A_DEX),Math.max(3,dex-1));
    assert.deepEqual(game.u.uprops[C.WOUNDED_LEGS],{intrinsic:50,extrinsic:C.BOTH_SIDES});
    assert.equal(game.u._woundedLegSide,'');assert.equal(game.u._woundedLegTurns,50);
    assert.equal(game.disp.botl,true);assert.deepEqual(getRngLog(),[]);
});

for(const [oldTime,newTime,expected] of [[80,5,80],[5,80,80],[5,C.TIMEOUT+100,C.TIMEOUT]])test(`wound timeout retains unrelated intrinsic bits (${oldTime}, ${newTime})`,()=>{
    setup();setWoundedLegs(C.LEFT_SIDE,oldTime);game.u.uprops[C.WOUNDED_LEGS].intrinsic|=C.FROMOUTSIDE;
    setWoundedLegs(C.RIGHT_SIDE,newTime);
    assert.equal(game.u.uprops[C.WOUNDED_LEGS].intrinsic,C.FROMOUTSIDE|expected);
    assert.equal(game.u.atemp.a[C.A_DEX],-1);
});

for(const how of [0,1,2])for(const mounted of [false,true])test(`leg healing message and load phases: how=${how}, mounted=${mounted}`,()=>{
    setup();if(mounted)game.u.usteed={data:{name:'horse'}};
    setWoundedLegs(C.BOTH_SIDES,50);game.u.atemp.a[C.A_DEX]--;
    assert.equal(beginHeroLegHealing(how),!mounted&&how!==2?'Your legs feel better.':'');
    assert.equal(game.u.atemp.a[C.A_DEX],-1);assert.equal(hasWoundedLegs(),true);
    assert.equal(finishHeroLegHealing(how),'');assert.equal(hasWoundedLegs(),false);
    assert.equal(game.u.acurr.a[C.A_DEX],10);
});

for(const sides of [C.LEFT_SIDE,C.RIGHT_SIDE,C.BOTH_SIDES])test(`wounded side ${sides} controls body-part messages and capacity`,()=>{
    setup();setWoundedLegs(sides,50);
    const side=sides===C.LEFT_SIDE?'left ':sides===C.RIGHT_SIDE?'right ':'';
    assert.equal(__steedTestHooks.heroLegsInNoShapeMessage('kicking'),`Your ${side}${side?'leg is':'legs are'} in no shape for kicking.`);
    assert.equal(heroCarryCapacity(),sides===C.BOTH_SIDES?350:450);
    game.u._polyself_form={name:'horse'};
    assert.equal(beginHeroLegHealing(),sides===C.BOTH_SIDES?'Your rear legs feel better.':'Your rear leg feels better.');
});

test('leg healing recomputes actual load instead of clearing a burden unconditionally',()=>{
    setup();game.inventory=[{cls:'weapon',kind:'long sword',quan:20}];
    encumberMsg();setWoundedLegs(C.BOTH_SIDES,30);encumberMsg();
    assert.equal(game._encumbrance_level,3);
    beginHeroLegHealing();assert.equal(finishHeroLegHealing(),'Your movements are only slowed slightly by your load.');
    assert.equal(game._encumbrance_level,1);assert.match(game.u._statusSuffix,/Burdened/);
});

test('fumbling with a welded pick wounds the right leg with the source temporary penalty',()=>{
    setup();game.u.fumbling=true;game.coreCtx.r=[0n,0n,0n];game.coreCtx.n=3;
    const result=digFumblingResult({kind:'pick-axe',cursed:true,wielded:true});
    assert.match(result.message,/bounces and hits you/);
    assert.equal(game.u.uprops[C.WOUNDED_LEGS].extrinsic,C.RIGHT_SIDE);
    assert.equal(game.u._woundedLegTurns,6);assert.equal(game.u.atemp.a[C.A_DEX],-1);
    assert.equal(game.u.acurr.a[C.A_DEX],10);
});

for(const sides of [C.LEFT_SIDE,C.BOTH_SIDES])for(const mounted of [false,true])test(`timeout heals side ${sides}, mounted=${mounted}, without changing base Dexterity`,async()=>{
    setup();if(mounted)game.u.usteed={data:{name:'horse'},mtame:10};setWoundedLegs(sides,1);
    await processMonsterTurns();
    assert.equal(hasWoundedLegs(),false);assert.equal(game.u.atemp.a[C.A_DEX],0);
    assert.equal(game.u.acurr.a[C.A_DEX],10);assert.equal(game.moves,100);
    const message=[game._pending_message,game._topline_after_more].join(' ');
    if(mounted)assert.doesNotMatch(message,/feel.*better/);
    else assert.match(message,sides===C.BOTH_SIDES?/Your legs feel better/:/Your leg feels better/);
});

test('prayer invulnerability postpones wound expiry',async()=>{
    setup();setWoundedLegs(C.LEFT_SIDE,1);game.u.uinvulnerable=true;
    await processMonsterTurns();assert.equal(game.u.uprops[C.WOUNDED_LEGS].intrinsic,1);
    assert.equal(game.u.atemp.a[C.A_DEX],-1);
});

for(const mounted of [false,true])test(`stoning's limb stage heals only the hero's legs, mounted=${mounted}`,async()=>{
    setup();setWoundedLegs(C.BOTH_SIDES,30);game.u._stonedTimeout=3;
    if(mounted)game.u.usteed={data:{name:'horse'},mtame:10};
    await processMonsterTurns();
    assert.equal(hasWoundedLegs(),mounted);assert.equal(game.u.atemp.a[C.A_DEX],mounted?-1:0);
    assert.doesNotMatch([game._pending_message,game._topline_after_more].join(' '),/feel.*better/);
    assert.equal(game.u.acurr.a[C.A_DEX],10);
});

test('the live loop resumes wound healing without spending a second turn',async()=>{
    setup();setWoundedLegs(C.BOTH_SIDES,1);game.nhDisplay={cols:30};
    game._pending_message='A message already on screen.';game._keep_pending_message=1;
    game.level.regions=[{type:'gas_cloud',damage:0,ttl:5,coords:[{x:50,y:10}]}];
    assert.equal(await processMonsterTurns(),'defer-tail');
    while(game._message_more)await rhack(' ');
    game.nhDisplay=null;game._pending_time_passed=1;
    pushKey('\x1b');await moveloop_core();
    assert.equal(hasWoundedLegs(),false);assert.equal(game.moves,100);
    assert.equal(game.level.regions[0].ttl,4);assert.equal(game.u.atemp.a[C.A_DEX],0);
    assert.equal(game._pending_time_passed,0);
});

test('saved healing message suspends wound clearing, object timers and regions until it returns',async()=>{
    setup();setWoundedLegs(C.BOTH_SIDES,1);game.nhDisplay={cols:30};
    game._pending_message='A message already on screen.';game._keep_pending_message=1;
    const lamp={otyp:227,kind:'oil lamp',age:1,quan:1,letter:'a',cls:'tool'};
    game.inventory=[lamp];beginBurn(lamp);
    game.level.regions=[{type:'gas_cloud',damage:0,ttl:5,coords:[{x:50,y:10}]}];
    assert.equal(await processMonsterTurns(),'defer-tail');
    assert.equal(game._turn_tail_phase,'legs');assert.equal(game.moves,100);
    assert.equal(game.u.atemp.a[C.A_DEX],0);assert.equal(hasWoundedLegs(),true);
    assert.equal(lamp.lamplit,true);assert.equal(game.level.regions[0].ttl,5);
    const saved=encodeSaveState(),{coreCtx,displayCtx,rng}=game;
    resetGame();restoreSaveState(saved);Object.assign(game,{coreCtx,displayCtx,rng});
    await rhack(' ');
    if(game._message_more)await rhack(' ');
    game._pending_message='';game._message_more=0;
    await processMonsterTurns();
    assert.equal(game.moves,100);assert.equal(hasWoundedLegs(),false);
    assert.equal(game.u.atemp.a[C.A_DEX],0);assert.equal(game.inventory[0].lamplit,false);
    assert.equal(game.level.regions[0].ttl,4);
});
