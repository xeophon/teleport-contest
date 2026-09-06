import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { moveloop_core } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { resetInputState } from '../js/input.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { ROOM, BLINDED, DEAF, SICK, VOMITING, HALLUC, WOUNDED_LEGS, BOTH_SIDES } from '../js/const.js';

function setup({kind='full healing',blessed=false,quantity=1,width=80}={}) {
    resetGame();resetInputState();initRng(73);
    Object.assign(game,{moves:100,context:{},flags:{pickup:false},level:new GameMap(),inventory:[],
        _startup_role:'Wizard',_startup_race:'human',urole:{name:{m:'Wizard'},rank:{m:'Evoker'}},
        u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},ulevel:5,ulevelmax:5,ulevelpeak:5,uhp:1,uhpmax:100,
            uen:10,uenmax:20,uhunger:900,umovement:12,uac:10,acurr:{a:[12,12,12,12,12,12]},uprops:[]}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:ROOM,lit:true});
    const item={id:1,letter:'a',cls:'potion',kind:'pink potion',actualKind:`potion of ${kind}`,quan:quantity,dknown:true,blessed};
    game.inventory.push(item);vision_reset();vision_recalc();enableRngLog({reset:true});
    game.coreCtx={n:100,r:Array(100).fill(0n),m:[],a:0n,b:0n,c:0n};game.rng.core=game.coreCtx;
    if(width!==80) game.nhDisplay={cols:width};
    return item;
}
function troubles() {
    Object.assign(game.u,{blind:true,_blindTimeout:30,deaf:true,_deafTimeout:30,sick:true,_sickTimeout:30,
        usick_type:3,vomiting:true,_vomitingTimeout:30,hallucinating:true,_halluTimeout:30,_statusSuffix:'Blind Deaf Ill Hallu'});
    for(const prop of [BLINDED,DEAF,SICK,VOMITING,HALLUC]) game.u.uprops[prop]={intrinsic:30,extrinsic:0};
}
async function drink() {await rhack('q');await rhack('a');}
function saveRoundTrip() {const rng=game.coreCtx,display=game.nhDisplay;restoreSaveState(encodeSaveState());game.coreCtx=rng;game.rng={core:rng};game.nhDisplay=display;}
async function drain() {for(let n=0;n<20&&game._healing_potion;n++) await rhack(' ');assert.equal(game._healing_potion,null);}

for(const saved of [false,true]) test(`C cure pauses preserve different pre/post-message state (saved=${saved})`,async()=>{
    const potion=setup({width:79});troubles();await drink();
    assert.equal(game.u.uhp,104);assert.equal(game.u._blindTimeout,30);assert.equal(game.u._deafTimeout,30);
    assert.equal(game.u._vomitingTimeout,30);assert.equal(game.u._sickTimeout,30);assert.equal(game.u._halluTimeout,30);
    assert.equal(game.inventory.includes(potion),true);assert.equal(potion.in_use,true);
    assert.equal(game.context.move,0);assert.deepEqual(getRngLog(),[]);assert.equal(game._message_more,1);
    if(saved)saveRoundTrip();await rhack(' ');
    assert.equal(game.u._blindTimeout,0);assert.equal(game.u._deafTimeout,0);assert.equal(game.u._vomitingTimeout,0);
    assert.equal(game.u._sickTimeout,30);assert.equal(game.u.usick_type,3);assert.equal(game.u._halluTimeout,30);
    assert.match(game._pending_message,/cosmic again.*hear again/);assert.equal(game.context.move,0);
    if(saved)saveRoundTrip();await rhack(' ');
    assert.equal(game.u._sickTimeout,0);assert.equal(game.u.usick_type,0);assert.equal(game.u._halluTimeout,0);
    assert.equal(game.inventory.length,1);assert.equal(getRngLog().length,0,'exercise waits for hallucination message');
    if(saved)saveRoundTrip();await drain();
    assert.equal(game.inventory.length,0);assert.equal(game.context.move,1);
    assert.equal(getRngLog().filter(x=>x.startsWith('rn2(19)')).length,3);assert.equal(game.u.urexp,10);
});
for(const key of ['x','\x1b']) test(`healing More ${key==='x'?'ignores an unrelated key':'Escape suppresses later pages but completes effects'}`,async()=>{
    setup({width:79});troubles();await drink();const rng=[...getRngLog()];await rhack(key);
    if(key==='x'){assert.equal(game._message_more,1);assert.equal(game.u._blindTimeout,30);assert.deepEqual(getRngLog(),rng);}
    else {assert.equal(game._healing_potion,null);assert.equal(game._message_more,0);assert.equal(game.inventory.length,0);
        assert.equal(game.u._blindTimeout,0);assert.equal(game.u._sickTimeout,0);assert.equal(game.context.move,1);}
});
for(const saved of [false,true]) test(`Welcome blocks before restoration ceiling, ability and skill-slot changes (saved=${saved})`,async()=>{
    setup({blessed:true});game.u.ulevel=14;game.u.ulevelmax=15;game.u.ulevelpeak=15;game.u.weapon_slots=2;
    await drink();assert.equal(game._message_more,1);
    assert.match(game._pending_message,/completely healed.*more experienced/);
    assert.equal(game.u.ulevel,15);assert.equal(game.u.ulevelmax,14);assert.equal(game.u.warning,undefined);
    assert.equal(game.u.weapon_slots,2);assert.equal(game.inventory.length,1);
    const gains=[...getRngLog()];assert.equal(gains.length,1,'high-level Wizard/human HP are fixed; energy rolls once');
    if(saved)saveRoundTrip();await rhack(' ');
    assert.equal(game.u.ulevelmax,15);assert.equal(game.u.warning,true);assert.equal(game.u.weapon_slots,3);
    await drain();assert.equal(game.inventory.length,0);assert.equal(game.u.ulevel,15);
    assert.deepEqual(getRngLog().slice(0,gains.length),gains,'level rolls are not repeated');
});

test('full healing waits at more-experienced before any level-gain RNG',async()=>{
    setup({blessed:true,width:60});game.u.ulevelmax=6;game.u.deaf=true;game.u._deafTimeout=30;game.u.uprops[DEAF]={intrinsic:30};
    await drink();assert.match(game._pending_message,/completely healed.*hear again/);assert.equal(game._message_more,1);
    assert.equal(game.u.ulevel,5);assert.equal(game.u.ulevelmax,5);assert.equal(game.u._deafTimeout,0);assert.deepEqual(getRngLog(),[]);
    await drain();assert.equal(game.u.ulevel,6);assert.equal(game.u.ulevelmax,6);
});

test('sickness clears type bits before its message but clears timeout after it',async()=>{
    setup({width:65});game.u.sick=true;game.u._sickTimeout=30;game.u.usick_type=3;game.u.uprops[SICK]={intrinsic:30};
    await drink();assert.equal(game._message_more,1);assert.equal(game.u.usick_type,0);assert.equal(game.u._sickTimeout,30);
    saveRoundTrip();await drain();assert.equal(game.u._sickTimeout,0);assert.equal(game.u.uprops[SICK].intrinsic,0);
});

test('wounded-leg message precedes wound clearing and encumbrance recomputation',async()=>{
    setup({width:60});Object.assign(game.u,{_woundedLegTurns:30,_woundedLegSide:'both',_woundedDexPenalty:1});
    game.u.acurr.a[3]=11;game.u.uprops[WOUNDED_LEGS]={intrinsic:30,extrinsic:BOTH_SIDES};
    await drink();assert.equal(game._message_more,1);assert.equal(game.u.acurr.a[3],12);
    assert.equal(game.u._woundedLegTurns,30);assert.equal(game.u.uprops[WOUNDED_LEGS].intrinsic,30);
    saveRoundTrip();await drain();assert.equal(game.u._woundedLegTurns,0);assert.equal(game.u.acurr.a[3],12);
});

for(const width of [45,46]) test(`C strict message-fit boundary width ${width}`,async()=>{
    setup({kind:'healing',width});game.u.blind=true;game.u._blindTimeout=30;
    await drink();
    // "You feel better." + "You can see again." + 3 must be strictly less than CO-8.
    const fits='You feel better.'.length+'You can see again.'.length+3 < width-8;
    assert.equal(!!game._message_more,!fits);assert.equal(game.u._blindTimeout,fits?0:30);
});

test('a stack remains intact during cure pages and consumes one item at completion',async()=>{
    setup({quantity:3});troubles();await drink();assert.equal(game.inventory[0].quan,3);assert.equal(game.inventory[0].in_use,true);
    saveRoundTrip();await drain();assert.equal(game.inventory[0].quan,2);assert.equal(!!game.inventory[0].in_use,false);
});

test('live movement loop cannot spend the quaff turn during its saved cure pages',async()=>{
    setup();troubles();initRng(73);await drink();saveRoundTrip();
    try{await moveloop_core();}catch(error){if(!error.message.includes('Input queue empty'))throw error;}
    assert.equal(game.moves,100);assert.equal(game.inventory.length,1);await drain();
    game._pending_time_passed=1;
    try{await moveloop_core();}catch(error){if(!error.message.includes('Input queue empty'))throw error;}
    assert.equal(game.moves,101);
});

for(const slot of ['uwep','uswapwep','uquiver']) test(`singleton ${slot} potion is unworn before the first cure page`,async()=>{
    const item=setup({width:79});troubles();game.u[slot]=item;
    item[slot==='uwep'?'wielded':slot==='uswapwep'?'alternate':'quivered']=true;
    item.line=`a - a pink potion (${slot==='uwep'?'weapon in hand':slot==='uswapwep'?'alternate weapon; not wielded':'in quiver'})`;
    await drink();assert.equal(game.u[slot],null);assert.equal(item.wielded,false);assert.equal(item.alternate,false);assert.equal(item.quivered,false);
    assert.doesNotMatch(item.line,/weapon|quiver/);assert.equal(item.in_use,true);assert.equal(game.inventory.includes(item),true);
    saveRoundTrip();await drain();assert.equal(game.inventory.length,0);
});

test('quaffing a wielded stack splits only the opened potion and preserves the remaining weapon',async()=>{
    const original=setup({quantity:3,width:79});troubles();game.u.uwep=original;original.wielded=true;
    await drink();assert.equal(original.quan,2);assert.equal(original.wielded,true);assert.equal(game.u.uwep,original);
    assert.equal(game.inventory.length,2);const opened=game._healing_potion.item;assert.notEqual(opened,original);
    assert.equal(opened.quan,1);assert.equal(opened.wielded,false);assert.equal(opened.in_use,true);
    saveRoundTrip();await drain();assert.equal(game.inventory.length,1);assert.equal(game.inventory[0].quan,2);assert.equal(game.u.uwep,game.inventory[0]);
});

for (const kind of ['healing', 'extra healing']) test(`${kind} saves its rolled HP before the blindness message without repeating dice`, async () => {
    setup({kind, blessed: true, width: 68});
    troubles();
    await drink();
    const dice = `d(6,${kind === 'healing' ? 4 : 8})=6`;
    const hp = 1 + (kind === 'healing' ? 8 : 16) + 6;
    assert.deepEqual(getRngLog(), [dice]);
    assert.equal(game.u.uhp, hp);
    assert.equal(game.u._blindTimeout, 30);
    assert.equal(game.u._sickTimeout, 30);
    assert.equal(game._healing_potion.phase, 'blindCommit');
    assert.equal(game._message_more, 1);
    saveRoundTrip();
    await drain();
    assert.equal(game.u.uhp, hp);
    assert.equal(game.u._blindTimeout, 0);
    assert.equal(game.u._sickTimeout, 0);
    assert.equal(game.u._halluTimeout, kind === 'healing' ? 30 : 0);
    assert.deepEqual(getRngLog().filter(call => call.startsWith('d(')), [dice]);
    assert.equal(game.inventory.length, 0);
});
