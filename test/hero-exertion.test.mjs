import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { allocateHeroMovement, overexertHeroHp, processMonsterTurns } from '../js/allmain.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import * as C from '../js/const.js';

function setup() {
    resetGame();initRng(41);
    Object.assign(game,{moves:99,flags:{verbose:true},context:{},inventory:[],level:new GameMap(),
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:10,uhp:10,uhpmax:10,uen:100,uenmax:100,
            uhunger:900,umovement:0,ualign:{type:0,record:0},acurr:{a:[10,10,10,10,10,10]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    vision_reset();enableRngLog({reset:true});game.coreCtx.r=Array(200).fill(1n);game.coreCtx.n=200;
}

for(const speed of [0,3,12,13,24])for(let load=0;load<=5;load++)test(`C movement allocation speed=${speed}, load=${load}`,()=>{
    setup();game.u._monsterMove=speed;game.u.umovement=-2;
    const penalty=[0,Math.trunc(speed/4),Math.trunc(speed/2),Math.trunc(speed*3/4),Math.trunc(speed*7/8),0][load];
    assert.equal(allocateHeroMovement(load),speed-penalty);
    assert.equal(game.u.umovement,Math.max(0,speed-penalty-2));assert.deepEqual(getRngLog(),[]);
});

test('load reduction follows the hero speed bonus',()=>{
    setup();game.u.veryfast=true;
    assert.equal(allocateHeroMovement(C.HVY_ENCUMBER),6);assert.match(getRngLog()[0],/^rn2\(3\)/);
});

test('a moving rider uses steed speed before load reduction and ignores hero speed bonuses',()=>{
    setup();game.u.umoved=true;game.u.veryfast=true;game.u.usteed={data:{mmove:18}};
    assert.equal(allocateHeroMovement(C.MOD_ENCUMBER),12);
    assert.equal(getRngLog().length,1);assert.match(getRngLog()[0],/^rn2\(12\)/);
});

for(const body of ['human','canonical monster','runtime monster'])test(`exertion subtracts one active HP without damage halving: ${body}`,()=>{
    setup();game.u.halfPhysicalDamage=true;
    if(body!=='human')game.u._polyself_form={name:'newt'};
    if(body==='canonical monster'){game.u.mh=7;game.u.mhmax=10;}
    const state={};assert.equal(overexertHeroHp(state),true);
    assert.equal(body==='canonical monster'?game.u.mh:game.u.uhp,body==='canonical monster'?6:9);
    if(body==='canonical monster')assert.equal(game.u.uhp,10);
    assert.equal(game.disp.botl,true);assert.deepEqual(getRngLog(),[]);
    overexertHeroHp(state);assert.equal(body==='canonical monster'?game.u.mh:game.u.uhp,body==='canonical monster'?6:9);
});

test('exertion at one HP waits for feedback before Constitution abuse and sleep',async()=>{
    setup();game.u.uhp=1;game.nhDisplay={cols:30};game._pending_message='A previous long message.';
    const state={};assert.equal(overexertHeroHp(state),false);
    assert.equal(game.u.usleep||0,0);assert.equal(game.multi||0,0);assert.deepEqual(getRngLog(),[]);
    await rhack(' ');assert.equal(overexertHeroHp(state),true);
    assert.equal(game.u.uhp,1);assert.equal(game.u.usleep,99);assert.equal(game.multi,-10);
    assert.equal(game._wake_message,'You can move again.');assert.equal(game.u._aexe[C.A_CON],-1);
    const calls=getRngLog();overexertHeroHp(state);assert.deepEqual(getRngLog(),calls);
});

for(const [load,turn,moved,loss] of [[3,30,true,1],[3,29,true,0],[4,30,true,1],[4,20,true,1],
    [4,19,true,0],[3,30,false,0],[2,30,true,0]])test(`live turn exertion load=${load}, turn=${turn}, moved=${moved}`,async()=>{
    setup();game.moves=turn-1;game.u.umoved=moved;game.u.umovement=11;
    const quantity=load===2?23:load===3?30:36;
    game.inventory=[{cls:'weapon',kind:'long sword',quan:quantity}];
    await processMonsterTurns();assert.equal(game.moves,turn);assert.equal(game.u.uhp,10-loss);
});

test('prayer suppresses moving-load exertion',async()=>{
    setup();game.u.umoved=true;game.u.uinvulnerable=true;
    game.inventory=[{cls:'weapon',kind:'long sword',quan:36}];
    await processMonsterTurns();assert.equal(game.u.uhp,10);
});

test('saved turn exertion resumes before power without repeating regions or health regeneration',async()=>{
    setup();game.moves=99;game.u.umoved=true;game.u.umovement=11;game.u.uhp=1;game.u.uen=10;
    game.u.uprops[C.ENERGY_REGENERATION]={intrinsic:C.FROMOUTSIDE};
    game.inventory=[{cls:'weapon',kind:'long sword',quan:36}];
    game.level.regions=[{type:'gas_cloud',damage:0,ttl:5,coords:[{x:50,y:10}]}];
    game.nhDisplay={cols:30};game._pending_message='A previous long message.';game._keep_pending_message=1;
    assert.equal(await processMonsterTurns(),'defer-tail');
    assert.equal(game._turn_tail_phase,'exertion');assert.equal(game.level.regions[0].ttl,4);
    assert.equal(game.u.usleep||0,0);assert.equal(game.u.uen,10);assert.equal(game.moves,100);
    const saved=encodeSaveState(),{coreCtx,displayCtx,rng}=game;
    resetGame();restoreSaveState(saved);Object.assign(game,{coreCtx,displayCtx,rng});
    while(game._message_more)await rhack(' ');
    assert.equal(game.u.umoved,true);
    assert.equal(await processMonsterTurns(),true);
    assert.equal(game.moves,100);assert.equal(game.level.regions[0].ttl,4);
    assert.equal(game.u.uhp,1);assert.equal(game.u.usleep,100);assert.ok(game.u.uen>10);
    assert.equal(game._overexertion_turn_state,null);
});
