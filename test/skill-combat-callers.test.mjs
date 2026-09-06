import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { rhack } from '../js/cmd.js';
import { newgame } from '../js/allmain.js';
import { resetInputState } from '../js/input.js';
import { initializeSkills, objectWeaponSkill } from '../js/skills.js';
import { vision_reset } from '../js/vision.js';
import * as C from '../js/const.js';
import * as skills from '../js/skills.js';
import { monsterByRndName, artifactDefinitionForName } from '../js/mklev.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKeys } from '../js/input.js';

function setup(role='Wizard') {
    resetGame(); resetInputState(); initRng(41);
    Object.assign(game,{moves:100,context:{},flags:{debug:true,tips:false},_startup_role:role,
        urole:{name:{m:role}},inventory:[],level:new GameMap(),u:{ux:10,uy:10,uz:{dnum:0,dlevel:1},
            ulevel:1,uhp:100,uhpmax:100,uen:100,uenmax:100,uhunger:900,ualign:{type:0,record:0},
            acurr:{a:[10,18,10,15,10,9]}}});
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    initializeSkills(role); vision_reset();
    game.viz_array=Array.from({length:21},()=>Array(80).fill(C.COULD_SEE|C.IN_SIGHT));
    enableRngLog();
}

for(const [kind,skill] of [['wakizashi',C.P_SHORT_SWORD],['ninja-to',C.P_BROAD_SWORD],
    ['nunchaku',C.P_FLAIL],['naginata',C.P_POLEARMS],['shito',C.P_KNIFE]])
    test(`Japanese ${kind} shares its underlying C weapon skill`,()=>{
        assert.equal(objectWeaponSkill({kind,cls:'weapon'}),skill);
    });

test('Samurai actual starting wakizashi grants Basic short-sword skill',async()=>{
    setup('Samurai'); Object.assign(game,{moves:1,flags:{legacy:false,bones:false},preferred_pet:'n',
        _startup_race:'human',_startup_gender:'male',_startup_align:'lawful',u:{}});
    await newgame();
    assert.equal(game.u.weapon_skills[C.P_SHORT_SWORD].skill,C.P_BASIC);
    assert.equal(game.u.weapon_skills[C.P_SHORT_SWORD].advance,20);
});

for(const [name,tame] of [['pony',10],['horse',10],['kitten',10],['wolf',5],['tiger',5],['white unicorn',5]])
    test(`tame genesis uses canonical domestic status for ${name}`,async()=>{
        setup(); for(const key of `#wizgenesis\ntame ${name}\n`)await rhack(key.charCodeAt(0));
        assert.ok(game.level.monsters[0],JSON.stringify({mode:game._command_mode,message:game._pending_message}));
        assert.equal(game.level.monsters[0].mtame,tame);
    });

test('an unskilled rider can saddle its domestic pony at the source tame-dependent threshold',async()=>{
    setup(); for(const key of '#wizgenesis\ntame pony\n')await rhack(key.charCodeAt(0));
    const pony=game.level.monsters[0]; pony.mx=11;pony.my=10;
    game.inventory=[{letter:'a',kind:'saddle',cls:'tool',quan:1}];
    game._pending_message='';game._message_more=0;game._topline_after_more='';
    game._command_mode='applySaddleDirection';game._apply_saddle_letter='a';
    // 15 Dex + 4 Cha/2 + 20 tame + 20 level - 20 Unskilled = 39.
    game.coreCtx.r=[38n];game.coreCtx.n=1;enableRngLog();await rhack('l');
    assert.match(game._pending_message,/put the saddle on the pony/);
    assert.equal(pony.minvent[0].kind,'saddle'); assert.equal(game.inventory.length,0);
    assert.deepEqual(getRngLog(),['rn2(100)=38']);
});

function combatSetup(kind, skill, { quantity=1, spe=0, launcher=null, erosion=0, damageBonus=0 }={}) {
    setup(); game.u.uhitinc=40;game.u.udaminc=damageBonus;
    const obj={id:100,kind,cls:'weapon',glyph:')',letter:'a',quan:quantity,spe,oeroded:erosion};
    game.inventory=[obj];
    if(launcher){
        const bow={id:101,kind:launcher,cls:'weapon',glyph:')',letter:'b',quan:1,wielded:true,owornmask:C.W_WEP};
        game.inventory.push(bow);game.u.uwep=bow;
    }
    Object.assign(game.u.weapon_skills[skill],{skill:C.P_BASIC,max_skill:C.P_EXPERT,advance:0});
    const mon={m_id:200,mx:11,my:10,mhp:100,mhpmax:100,mcanmove:true,data:monsterByRndName('goblin')};
    game.level.monsters.push(mon);
    return {obj,mon};
}

async function throwWithDraws(draws){
    await rhack('t');await rhack('a');
    game.coreCtx.r=draws.map(BigInt).reverse();game.coreCtx.n=draws.length;
    enableRngLog();await rhack('l');
}

// C uhitm.c:945,1059,1492: raw dmgval trains ordinary weapons above 1;
// launcher-matched ammunition trains above 0, before strength and poison.
for(const row of [
    {kind:'dagger',skill:C.P_DAGGER,raw:1,expected:0,damageBonus:20},
    {kind:'dagger',skill:C.P_DAGGER,raw:2,expected:1},
    {kind:'dart',skill:C.P_DART,raw:1,expected:0},
    {kind:'dart',skill:C.P_DART,raw:2,expected:1},
    {kind:'dagger',skill:C.P_DAGGER,raw:4,spe:-10,expected:0,damageBonus:20},
    {kind:'dagger',skill:C.P_DAGGER,raw:4,erosion:3,expected:0},
    {kind:'arrow',skill:C.P_BOW,launcher:'bow',raw:1,expected:1},
    {kind:'arrow',skill:C.P_BOW,launcher:'bow',raw:1,spe:-10,expected:0,damageBonus:20},
    {kind:'arrow',skill:C.P_BOW,launcher:null,raw:2,expected:0},
    {kind:'arrow',skill:C.P_BOW,launcher:'crossbow',raw:2,expected:0},
])test(`live throw ${row.kind}, launcher ${row.launcher||'none'}, raw ${row.raw}, spe ${row.spe||0}, erosion ${row.erosion||0} trains ${row.expected}`,async()=>{
    const {mon}=combatSetup(row.kind,row.skill,row);
    await throwWithDraws([0,row.raw-1,99,99,99]);
    assert.match([game._pending_message,game._queued_message_after_more].join(' '),/hits/);
    assert.ok(mon.mhp<100);
    if((row.spe||0)+row.raw<=0)assert.equal(mon.mhp,99,'zero raw damage skips every damage bonus before the one-point floor');
    assert.equal(game.u.weapon_skills[row.skill].advance,row.expected);
});

test('a missed projectile never practices its weapon skill',async()=>{
    combatSetup('dagger',C.P_DAGGER);game.u.uhitinc=-100;
    await throwWithDraws([19,99,99]);
    assert.match(game._pending_message,/misses/);
    assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,0);
});

for(const raw of [1,2])test(`applied glaive raw ${raw} trains the polearm category, including with two weapons enabled`,async()=>{
    const {obj,mon}=combatSetup('glaive',C.P_POLEARMS);
    mon.mx=12;obj.wielded=true;obj.owornmask=C.W_WEP;game.u.uwep=obj;game.u.twoweap=true;
    Object.assign(game.u.weapon_skills[C.P_TWO_WEAPON_COMBAT],{skill:C.P_BASIC,max_skill:C.P_EXPERT,advance:0});
    await rhack('a');await rhack('a');await rhack('l');await rhack('l');
    game.coreCtx.r=[0n,BigInt(raw-1),99n].reverse();game.coreCtx.n=3;
    await rhack('.');
    assert.match(game._pending_message,/You hit the goblin/);
    assert.equal(game.u.weapon_skills[C.P_POLEARMS].advance,raw>1?1:0);
    assert.equal(game.u.weapon_skills[C.P_TWO_WEAPON_COMBAT].advance,0);
});

test('saved confidence More after a projectile hit does not repeat practice or damage',async()=>{
    const {mon}=combatSetup('dagger',C.P_DAGGER);
    Object.assign(game.u.weapon_skills[C.P_DAGGER],{skill:C.P_UNSKILLED,advance:19});game.u.weapon_slots=1;
    await throwWithDraws([0,3,99,99,99]);
    assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,20);
    assert.match([game._pending_message,game._topline_after_more,game._queued_message_after_more].join(' '),/more confident/);
    const hp=mon.mhp,saved=encodeSaveState();resetGame();restoreSaveState(saved);
    for(let n=0;n<10&&game._message_more;n++)await rhack(' ');
    assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,20);
    assert.equal(game.level.monsters[0].mhp,hp);
});

for(const [level,hit,damage] of [[0,-4,-2],[1,-4,-2],[2,0,0],[3,2,1],[4,3,2]])
    test(`C weapon bonuses at skill level ${level}`,()=>{
        setup();game.u.weapon_skills[C.P_DAGGER].skill=level;
        assert.deepEqual(skills.weaponSkillBonuses({kind:'dagger',cls:'weapon'}),{hit,damage});
    });

for(const [level,hit,damage] of [[0,-2,0],[1,-2,0],[2,-1,0],[3,0,1],[4,0,2]])
    test(`mounted skill level ${level} contributes its source hit and damage bonuses`,()=>{
        setup();game.u.weapon_skills[C.P_DAGGER].skill=C.P_BASIC;
        game.u.weapon_skills[C.P_RIDING].skill=level;game.u.usteed={};
        assert.deepEqual(skills.weaponSkillBonuses({kind:'dagger',cls:'weapon'}),{hit,damage});
    });

test('mounted two-weapon bonuses use the lesser skill only for the actual equipped object',()=>{
    setup();const dagger={kind:'dagger',cls:'weapon'};game.u.uwep=dagger;game.u.twoweap=true;game.u.usteed={};
    game.u.weapon_skills[C.P_DAGGER].skill=C.P_SKILLED;
    game.u.weapon_skills[C.P_TWO_WEAPON_COMBAT].skill=C.P_EXPERT;
    game.u.weapon_skills[C.P_RIDING].skill=C.P_EXPERT;
    assert.deepEqual(skills.weaponSkillBonuses(dagger),{hit:-7,damage:0});
    assert.deepEqual(skills.weaponSkillBonuses({...dagger}),{hit:0,damage:3});
});

for(const [role,hit,damage] of [['Wizard',3,3],['Monk',7,9],['Samurai',7,9]])
    test(`source bare-hand Grand Master bonuses for ${role}`,()=>{
        setup(role);game.u.weapon_skills[C.P_BARE_HANDED_COMBAT].skill=C.P_GRAND_MASTER;
        assert.deepEqual(skills.weaponSkillBonuses(null),{hit,damage});
    });

function mountedSetup(){
    setup('Knight');game.u.usteed={m_id:300,mx:10,my:10,mtame:10,mhp:100,data:monsterByRndName('horse')};
    game.u.urideturns=99;game.u.weapon_skills[C.P_RIDING].advance=20;
}

test('one actual movement-loop riding step crosses the hundred-step practice boundary',async()=>{
    mountedSetup();game.u.umovement=C.NORMAL_SPEED;game.context.seer_turn=1000;
    pushKeys('l');await moveloop_core();
    assert.equal(game.u.ux,11);assert.equal(game.u.usteed.mx,11);
    assert.equal(game.u.urideturns,0);assert.equal(game.u.weapon_skills[C.P_RIDING].advance,21);
});

for(const action of ['wait','wall','attack'])test(`${action} does not exercise riding`,async()=>{
    mountedSetup();
    if(action==='wall')game.level.at(11,10).typ=C.STONE;
    if(action==='attack')game.level.monsters.push({m_id:301,mx:11,my:10,mhp:100,mhpmax:100,data:monsterByRndName('goblin')});
    await rhack(action==='wait'?'.':'l');
    assert.equal(game.u.urideturns,99);assert.equal(game.u.weapon_skills[C.P_RIDING].advance,20);
});

test('source tentative movement counts riding even when a pet refuses displacement',async()=>{
    mountedSetup();game.level.monsters.push({m_id:301,mx:11,my:10,pet:true,mpeaceful:true,mtame:10,mhp:100,data:monsterByRndName('kitten')});
    game.coreCtx.r=[0n,1n].reverse();game.coreCtx.n=2;await rhack('l');
    assert.equal(game.u.ux,10);assert.equal(game.u.usteed.mx,10);
    assert.match(game._pending_message,/in the way/);
    assert.equal(game.u.urideturns,0);assert.equal(game.u.weapon_skills[C.P_RIDING].advance,21);
});

for(const riding of [C.P_UNSKILLED,C.P_BASIC,C.P_SKILLED,C.P_EXPERT])
    test(`live mounted dagger damage includes riding level ${riding}`,async()=>{
        const {mon}=combatSetup('dagger',C.P_DAGGER);game.u.usteed={};
        game.u.weapon_skills[C.P_RIDING].skill=riding;
        await throwWithDraws([0,1,99,99]);
        assert.equal(mon.mhp,100-2-Math.max(0,riding-C.P_BASIC));
        assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,1);
    });

test('live mounted hit applies the riding penalty before the hit comparison',async()=>{
    const {mon}=combatSetup('dagger',C.P_DAGGER);game.u.usteed={};
    game.u.weapon_skills[C.P_RIDING].skill=C.P_UNSKILLED;
    game.u.uhitinc=0;game.u.acurr.a[3]=14;mon.mac=10;mon.msize=1;
    // AC10, level1, distance+2, size-1, dagger hitval+2 and throw+2: tmp15;
    // Unskilled riding reduces it to13, so a roll of14 misses.
    await throwWithDraws([13,99,99]);
    assert.match(game._pending_message,/misses/);assert.equal(mon.mhp,100);
});

test('a killed projectile target still grants its successful-hit practice',async()=>{
    const {mon}=combatSetup('dagger',C.P_DAGGER);mon.mhp=1;
    await throwWithDraws([0,2,99,99,99,99]);
    assert.equal(game.level.monsters.includes(mon),false);
    assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,1);
});

test('a live two-shot fire volley practices once per minimal-damage arrow hit',async()=>{
    const {obj,mon}=combatSetup('arrow',C.P_BOW,{launcher:'bow',quantity:2});
    obj.quivered=true;obj.owornmask=C.W_QUIVER;game.u.uquiver=obj;
    game.u.weapon_skills[C.P_BOW].skill=C.P_EXPERT;
    await rhack('f');
    while(game._message_more)await rhack(' ');
    const draws=[1,0,0,0,0,99,0,0,0,99];
    game.coreCtx.r=draws.map(BigInt).reverse();game.coreCtx.n=draws.length;enableRngLog();await rhack('l');
    assert.equal(getRngLog().filter(line=>line.startsWith('rnd(6)=')).length,2,JSON.stringify({log:getRngLog(),mode:game._command_mode,text:game._pending_message}));
    assert.equal(game.u.weapon_skills[C.P_BOW].advance,2);
    assert.equal(mon.mhp,94); // Two raw-one hits plus the Expert +2 damage each.
    assert.equal(game.inventory.includes(obj),false);
});

test('a saved Heart sling shot practices only after the levitation-loss landing resumes',async()=>{
    combatSetup('arrow',C.P_SLING,{launcher:'sling'});initRng(31);
    game._startup_role='Barbarian';game.urole.name.m='Barbarian';game._startup_align='neutral';
    const def=artifactDefinitionForName('The Heart of Ahriman');
    const heart={id:110,artifact:def.name,kind:def.base,cls:def.cls,otyp:def.otyp,glyph:def.glyph,letter:'a',quan:1,age:0};
    game.inventory[0]=heart;
    Object.assign(game.u,{ulevel:12,teleportation:true,teleportControl:true,ualign:{type:0,record:10},
        levitating:true,levitation:true,uprops:{[C.LEVITATION]:{intrinsic:0,extrinsic:C.W_ARTI}}});
    game.level.at(10,10).typ=C.POOL;game.level.monsters[0].mx=12;
    await rhack('t');await rhack('a');await rhack('l');
    assert.equal(game._command_mode,'waterTeleportCursor');
    assert.equal(game.u.weapon_skills[C.P_SLING].advance,0);
    const saved=encodeSaveState();resetGame();restoreSaveState(saved);initRng(31);
    while(game._message_more)await rhack(' ');
    await rhack('l');await rhack('.');
    assert.equal(game.u.weapon_skills[C.P_SLING].advance,1);
    const hp=game.level.monsters[0].mhp;
    while(game._message_more)await rhack(' ');
    assert.equal(game.u.weapon_skills[C.P_SLING].advance,1);
    assert.equal(game.level.monsters[0].mhp,hp);
});

for(const obstacle of ['pet','boulder'])test(`mounted ${obstacle} movement updates the mount and counts one step`,async()=>{
    mountedSetup();
    if(obstacle==='pet')game.level.monsters.push({m_id:301,mx:11,my:10,pet:true,mpeaceful:true,mtame:10,mhp:100,data:monsterByRndName('kitten')});
    else game.level.objects.push({id:302,otyp:C.BOULDER,kind:'boulder',quan:1,ox:11,oy:10});
    game.coreCtx.r=Array(10).fill(1n);game.coreCtx.n=10;await rhack('l');
    assert.equal(game.u.ux,11);assert.equal(game.u.usteed.mx,11);
    assert.equal(game.u.urideturns,0);assert.equal(game.u.weapon_skills[C.P_RIDING].advance,21);
});

test('riding confidence and tip precede the landing notice and survive More',async()=>{
    mountedSetup();game.flags.tips=true;
    Object.assign(game.u.weapon_skills[C.P_RIDING],{skill:C.P_UNSKILLED,advance:19});game.u.weapon_slots=1;
    game.level.objects.push({id:303,kind:'dagger',cls:'weapon',glyph:')',quan:1,ox:11,oy:10});
    await rhack('l');
    assert.match(game._pending_message,/more confident/);
    const frames=[game._pending_message];
    for(let n=0;n<10&&game._message_more;n++){await rhack(' ');frames.push(game._pending_message);}
    const text=frames.join('\n');assert.match(text,/Tip: use the #enhance/);assert.match(text,/You see here a dagger/);
    assert.ok(text.indexOf('more confident')<text.indexOf('Tip:'));
    assert.ok(text.indexOf('Tip:')<text.indexOf('You see here'));
    assert.equal(game.u.weapon_skills[C.P_RIDING].advance,20);
});
