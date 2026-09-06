import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, loseExperienceLevel } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { resetInputState } from '../js/input.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { ROOM, BLINDED, DEAF, SICK, VOMITING, HALLUC, HALLUC_RES, WOUNDED_LEGS, FROMOUTSIDE, W_TOOL, LEFT_SIDE, BOTH_SIDES } from '../js/const.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(name = 'full healing', buc = 0, known = true) {
    resetGame(); resetInputState(); initRng(71);
    Object.assign(game, { moves:100, context:{}, flags:{pickup:false}, level:new GameMap(), inventory:[],
        _startup_role:'Wizard', _startup_race:'human', urole:{name:{m:'Wizard'},rank:{m:'Evoker'}},
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:5,ulevelmax:5,ulevelpeak:5,uhp:1,uhpmax:100,
            uen:10,uenmax:20,uhunger:900,uac:10,umovement:12,acurr:{a:[12,12,12,12,12,12]},uprops:[]}});
    for(let x=1;x<79;x++) for(let y=0;y<21;y++) Object.assign(game.level.at(x,y),{typ:ROOM,lit:true});
    const item={id:1,letter:'a',cls:'potion',kind:'pink potion',actualKind:`potion of ${name}`,quan:1,dknown:true,blessed:buc>0,cursed:buc<0};
    game.inventory.push(item);
    if(known) game._discoveries=[{section:'Potions',name:`potion of ${name}`,known:true}];
    vision_reset(); vision_recalc(); enableRngLog({reset:true});
    // All d() dice show one; exercise rolls zero. This makes the C arithmetic independent of seeds.
    game.coreCtx={n:100,r:Array(100).fill(0n),m:[],a:0n,b:0n,c:0n}; game.rng.core=game.coreCtx;
    return item;
}
async function drink() { await rhack('q'); await rhack('a'); }
function messages() { return [game._pending_message,game._queued_message_after_more,game._topline_after_more,...(game._queued_messages_after_more||[]).map(x=>x.text)].join(' '); }

for(const name of ['healing','extra healing','full healing']) for(const buc of [-1,0,1]) {
    test(`C peffect ${name}, BCU ${buc}: amount, overflow bonus, identification and exercise`,async()=>{
        setup(name,buc); await drink();
        const count=4+2*buc;
        const amount=name==='full healing'?400:(name==='extra healing'?16:8)+count;
        const bonus=name==='full healing'?4+4*buc:name==='extra healing'?(buc>0?5:buc===0?2:0):(buc<0?0:1);
        assert.equal(game.u.uhp,Math.min(100+bonus,1+amount));
        assert.equal(game.u.uhpmax,amount+1>100?100+bonus:100);
        const dice=getRngLog().filter(x=>x.startsWith('d('));
        assert.deepEqual(dice,name==='full healing'?[]:[`d(${count},${name==='extra healing'?8:4})=${count}`]);
        assert.equal(getRngLog().filter(x=>x.startsWith('rn2(19)')).length,name==='healing'?1:2);
        assert.equal(game.inventory.length,0); assert.equal(game.context.move,1);
        assert.ok(game._discoveries.some(x=>x.name===`potion of ${name}`));
    });
    test(`C ${name}, BCU ${buc}: blind, deaf, sickness, vomiting and hallucination cure matrix`,async()=>{
        setup(name,buc);
        Object.assign(game.u,{blind:true,_blindTimeout:30,deaf:true,_deafTimeout:30,sick:true,_sickTimeout:30,
            vomiting:true,_vomitingTimeout:30,hallucinating:true,_halluTimeout:30,_statusSuffix:'Blind Deaf Ill Hallu'});
        for(const prop of [BLINDED,DEAF,SICK,VOMITING,HALLUC]) game.u.uprops[prop]={intrinsic:30,extrinsic:0};
        await drink();
        const blind=name!=='healing'||buc>=0, sick=name==='healing'?buc>0:buc>=0, hallu=name!=='healing';
        assert.equal(game.u._blindTimeout,blind?0:30); assert.equal(game.u._deafTimeout,blind?0:30);
        assert.equal(game.u._sickTimeout,sick?0:30); assert.equal(game.u._vomitingTimeout,sick?0:30);
        assert.equal(game.u._halluTimeout,hallu?0:30); assert.equal(game.u.uprops[HALLUC].intrinsic,hallu?0:30);
        if(blind) assert.ok(messages().indexOf('all cosmic again')<messages().indexOf('hear again')); 
        if(sick) assert.ok(messages().indexOf('less nauseated')<messages().indexOf('What a relief'));
    });
}
for(const name of ['healing','extra healing','full healing']) for(const canonical of [false,true]) test(`${name} changes only active polymorph HP (canonical=${canonical})`,async()=>{
    setup(name,1); const base={uhp:7,uhpmax:20,ulevel:5,uen:10,uenmax:20};
    Object.assign(game.u,{_polyself_base:base,_polyself_form:{name:'red dragon'}});
    if(canonical) Object.assign(game.u,{uhp:7,uhpmax:20,mh:99,mhmax:100}); else Object.assign(game.u,{uhp:99,uhpmax:100});
    await drink(); const bonus=name==='healing'?1:name==='extra healing'?5:8;
    assert.equal(canonical?game.u.mh:game.u.uhp,100+bonus);
    assert.equal(canonical?game.u.mhmax:game.u.uhpmax,100+bonus);
    assert.equal(base.uhp,7); assert.equal(base.uhpmax,20);
    if(canonical) {assert.equal(game.u.uhp,7);assert.equal(game.u.uhpmax,20);}
    assert.equal(getRngLog().filter(x=>x.startsWith('rn2(19)')).length,0,'polymorph suppresses physical exercise');
});
for(const name of ['extra healing','full healing']) for(const buc of [-1,0,1]) for(const mounted of [false,true]) test(`${name} leg cure BCU=${buc}, mounted=${mounted}`,async()=>{
    setup(name,buc); Object.assign(game.u,{_woundedLegTurns:50,_woundedLegSide:'both',_woundedDexPenalty:1});
    game.u.acurr.a[3]=11; game.u.uprops[WOUNDED_LEGS]={intrinsic:50,extrinsic:BOTH_SIDES};
    if(mounted) game.u.usteed={m_id:2,data:{name:'horse'}};
    await drink(); const cure=name==='extra healing'?buc>0&&!mounted:buc>0||buc===0&&!mounted;
    assert.equal(game.u._woundedLegTurns,cure?0:50); assert.equal(game.u.acurr.a[3],cure?12:11);
    assert.equal(game.u.uprops[WOUNDED_LEGS].extrinsic,cure?0:BOTH_SIDES);
    assert.equal(messages().includes('Your legs feel better.'),cure&&!mounted);
});

test('ordinary healing does not grow maximum HP on exact fill',async()=>{
    setup('healing',0); game.u.uhp=88; await drink(); assert.equal(game.u.uhp,100);assert.equal(game.u.uhpmax,100);
});
test('curing blindness preserves worn blindfold and permanent deafness sources',async()=>{
    setup(); game.u.blind=true;game.u._blindTimeout=30;game.u.deaf=true;game.u._deafTimeout=30;
    game.u.uprops[BLINDED]={intrinsic:30,extrinsic:W_TOOL};game.u.uprops[DEAF]={intrinsic:FROMOUTSIDE|30,extrinsic:0};
    game.inventory.push({id:2,letter:'b',cls:'tool',kind:'blindfold',worn:true,owornmask:W_TOOL});
    await drink(); assert.equal(game.u.blind,true);assert.equal(game.u.deaf,true);assert.equal(game.u.uprops[DEAF].intrinsic,FROMOUTSIDE);
});
test('hallucination resistance removes the timeout without falsely toggling vision',async()=>{
    setup(); game.u._halluTimeout=20;game.u.hallu=true;game.u.uprops[HALLUC]={intrinsic:20};game.u.uprops[HALLUC_RES]={extrinsic:W_TOOL};
    await drink(); assert.equal(game.u._halluTimeout,0);assert.match(messages(),/vision.*flatten/);assert.doesNotMatch(messages(),/SO boring/);
});
for(const seen of [false,true]) test(`healing discovery credits the actual type once, seen=${seen}`,async()=>{
    setup('full healing',0,false); game.inventory[0].dknown=seen; await drink();
    assert.equal(game.u.urexp||0,seen?10:0);
    assert.equal(getRngLog().filter(x=>x.startsWith('rn2(19)')).length,seen?3:2);
    assert.equal(!!game._discoveries?.some(x=>x.name==='potion of full healing'),seen);
});
for(const lost of [1,2,3,4]) test(`blessed full healing restores ceil-half of ${lost} drained levels across saved quaffs`,async()=>{
    setup('full healing',1);game.u.ulevel=10;game.u.ulevelmax=10;game.u.ulevelpeak=10;
    for(let i=0;i<lost;i++) loseExperienceLevel();
    for(let i=0;i<lost;i++) {
        if(i) {game.inventory.push({id:i+1,letter:'a',cls:'potion',actualKind:'potion of full healing',quan:1,blessed:true});game._pending_message='';game._message_more=0;game._command_mode=null;}
        await drink();
        if(i===0) {const rng=game.coreCtx;restoreSaveState(encodeSaveState());game.coreCtx=rng;game.rng={core:rng};}
    }
    assert.equal(game.u.ulevel,10-Math.floor(lost/2));assert.equal(game.u.ulevelmax,10-Math.floor(lost/2));assert.equal(game.u.ulevelpeak,10);
    assert.ok(game.u.uhpinc[10-lost]>0);assert.ok(game.u.ueninc[10-lost]>0);
});

for(const canonical of [false,true]) test(`full healing restores a lost level in both body representations (canonical=${canonical})`,async()=>{
    setup('full healing',1); game.u.ulevelmax=6;
    const base={uhp:7,uhpmax:20,ulevel:5,uen:10,uenmax:20};
    Object.assign(game.u,{_polyself_base:base,_polyself_form:{name:'red dragon'},ulevelpeak:6});
    if(canonical) Object.assign(game.u,{uhp:7,uhpmax:20,mh:50,mhmax:100});
    else Object.assign(game.u,{uhp:50,uhpmax:100});
    await drink();
    assert.equal(game.u.ulevel,6);assert.equal(game.u.ulevelmax,6);assert.equal(base.ulevel,6);
    assert.equal(canonical?game.u.mh:game.u.uhp,108);assert.equal(canonical?game.u.mhmax:game.u.uhpmax,108);
    assert.equal(base.uhp,9);assert.equal(base.uhpmax,22);assert.equal(game.u.uhppeak,22);
    if(canonical) {assert.equal(game.u.uhp,9);assert.equal(game.u.uhpmax,22);}
    assert.equal(game.u.uen,base.uen);assert.equal(game.u.uenmax,base.uenmax);
    assert.deepEqual(getRngLog().slice(0,2),['rnd(8)=1','rn2(5)=0']);
    assert.doesNotMatch(messages(),/Welcome back/,'decremented maximum determines the source welcome wording');
});
for(const name of ['healing','extra healing']) for(const buc of [-1,0,1]) test(`${name} overflow preserves exact BCU maximum bonus ${buc}`,async()=>{
    setup(name,buc);game.u.uhp=100;await drink();
    const bonus=name==='healing'?(buc<0?0:1):(buc<0?0:buc>0?5:2);
    assert.equal(game.u.uhp,100+bonus);assert.equal(game.u.uhpmax,100+bonus);
});
test('shared healing clears canonical sickness and vomiting properties',async()=>{
    setup('healing',1);game.u.sick=true;game.u.vomiting=true;
    game.u.uprops[SICK]={intrinsic:20};game.u.uprops[VOMITING]={intrinsic:30};
    await drink();assert.equal(game.u.uprops[SICK].intrinsic,0);assert.equal(game.u.uprops[VOMITING].intrinsic,0);
});

test('fresh C quaff oracle covers the three blessed healing tiers and discovery',()=>{
    const path=fileURLToPath(new URL('./fixtures/oracles/healing-quaff.session.json',import.meta.url));
    const child=spawnSync(process.execPath,['frozen/ps_test_runner.mjs',`--worker-session=${path}`],
        {cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
    assert.equal(child.status,0,child.stderr);
    const result=JSON.parse(child.stdout.split('__RESULT_ONE__').at(-1));
    assert.equal(result.passed,true,JSON.stringify(result));
    assert.deepEqual(result.metrics.screens,{matched:101,total:101});
    assert.deepEqual(result.metrics.rngCalls,{matched:2792,total:2792});
});
