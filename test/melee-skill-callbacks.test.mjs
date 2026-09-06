import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initializeSkills } from '../js/skills.js';
import { monsterByRndName } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { resetInputState } from '../js/input.js';
import * as C from '../js/const.js';

function setup({kind='long sword', role='Knight', skill=C.P_LONG_SWORD, rank=C.P_BASIC, strength=10}={}) {
    resetGame(); resetInputState(); initRng(73);
    Object.assign(game, { moves:100, context:{}, flags:{verbose:true, tips:false},
        _startup_role:role, urole:{name:{m:role}}, inventory:[], level:new GameMap(),
        u:{ux:10, uy:10, uz:{dnum:0,dlevel:1}, ulevel:1, uhp:100, uhpmax:100,
            uhunger:900, uhitinc:40, acurr:{a:[strength,12,12,14,12,12]}, uprops:[], ualign:{type:0,record:0}} });
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    initializeSkills(role);
    Object.assign(game.u.weapon_skills[skill],{skill:rank,max_skill:C.P_GRAND_MASTER,advance:0});
    const weapon=kind?{id:1,letter:'a',kind,cls:'weapon',quan:1,spe:0,wielded:true,owornmask:C.W_WEP}:null;
    if(weapon){game.inventory.push(weapon);game.u.uwep=weapon;}
    const mon={m_id:2,mx:11,my:10,mhp:100,mhpmax:100,mcanmove:true,data:monsterByRndName('goblin')};
    game.level.monsters.push(mon);vision_reset();
    game.viz_array=Array.from({length:21},()=>Array(80).fill(C.COULD_SEE|C.IN_SIGHT));
    return {weapon,mon};
}

async function strike(draws) {
    game.coreCtx.r=[...draws,...Array(60).fill(99)].map(BigInt).reverse();game.coreCtx.n=draws.length+60;
    enableRngLog({reset:true});await rhack('l');
}

for(const raw of [1,2]) test(`ordinary melee trains only above raw damage one: ${raw}`,async()=>{
    const {mon}=setup();game.u.udaminc=20;
    await strike([0,18,0,18,raw-1]);
    assert.equal(mon.mhp,100-raw-20);
    assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].advance,raw>1?1:0);
});

for(const [rank,bonus] of [[C.P_UNSKILLED,-2],[C.P_BASIC,0],[C.P_SKILLED,1],[C.P_EXPERT,2]])
    test(`ordinary melee uses trained weapon damage at rank ${rank}`,async()=>{
        const {mon}=setup({rank});await strike([0,18,0,18,2]);
        assert.equal(mon.mhp,100-Math.max(1,3+bonus));
        assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].advance,1);
    });

test('a missed ordinary melee attack grants no weapon practice',async()=>{
    const {mon}=setup();game.u.uhitinc=-100;await strike([0,18,19]);
    assert.equal(mon.mhp,100);assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].advance,0);
});

test('the source weapon hit bonus changes the hit comparison',async()=>{
    for(const rank of [C.P_UNSKILLED,C.P_EXPERT]){
        const {mon}=setup({rank});game.u.uhitinc=0;await strike([0,18,12,18,2]);
        // Base 13, minus 4 or plus 3, compared strictly against a roll of 13.
        assert.equal(mon.mhp<100,rank===C.P_EXPERT);
    }
});

test('a Monk attacks with the actual wielded weapon',async()=>{
    const {mon}=setup({kind:'dagger',role:'Monk',skill:C.P_DAGGER});await strike([0,18,0,18,1]);
    assert.equal(mon.mhp,98);assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,1);
    assert.equal(game.u.weapon_skills[C.P_BARE_HANDED_COMBAT].advance,20);
    assert.equal(getRngLog().filter(line=>line.startsWith('rnd(4)')).length,1);
});

for(const [role,bonus] of [['Wizard',3],['Monk',9]]) test(`${role} uses Grand Master bare-hand damage`,async()=>{
    const {mon}=setup({kind:null,role,skill:C.P_BARE_HANDED_COMBAT,rank:C.P_GRAND_MASTER});
    await strike([0,18,4,0,18,1]);
    assert.equal(mon.mhp,100-2-bonus);
    assert.equal(game.u.weapon_skills[C.P_BARE_HANDED_COMBAT].advance,1);
});

test('skilled double punch rolls once before hit dice and trains each successful hit',async()=>{
    const {mon}=setup({kind:null,role:'Wizard',skill:C.P_BARE_HANDED_COMBAT,rank:C.P_SKILLED});
    await strike([0,18,0,0,18,1,99,99,0,1]);
    assert.equal(getRngLog().filter(line=>line.startsWith('rnd(20)')).length,2);
    assert.equal(game.u.weapon_skills[C.P_BARE_HANDED_COMBAT].advance,2);
    assert.equal(mon.mhp,94);
});

for(const canonical of [false,true])test(`dual melee trains two-weapon combat and uses actual weapon identity (${canonical})`,async()=>{
    const {weapon,mon}=setup({rank:C.P_EXPERT,strength:18});
    const secondary={...weapon,id:3,letter:'b',wielded:false,alternate:true,owornmask:C.W_SWAPWEP};
    game.inventory.push(secondary);
    if(canonical){game.u.twoweap=true;game.u.uswapwep=secondary;}else game._twoweapon=true;
    Object.assign(game.u.weapon_skills[C.P_TWO_WEAPON_COMBAT],{skill:C.P_EXPERT,max_skill:C.P_EXPERT,advance:0});
    await strike([0,18,0,18,1,99,99,0,1]);
    assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].advance,0);
    assert.equal(game.u.weapon_skills[C.P_TWO_WEAPON_COMBAT].advance,2);
    assert.equal(mon.mhp,90,JSON.stringify(getRngLog()));
});

for(const [kind,skill] of [['bow',C.P_BOW],['dart',C.P_DART],['lance',C.P_LANCE],['halberd',C.P_POLEARMS]])
    test(`improper hand-to-hand ${kind} does not use or train its damage skill`,async()=>{
        const {weapon,mon}=setup({kind,skill,rank:C.P_EXPERT});weapon.spe=10;
        await strike([0,18,0,18,1]);
        assert.equal(mon.mhp,98);assert.equal(game.u.weapon_skills[skill].advance,0);
    });

test('a living target is not required to earn successful melee practice',async()=>{
    const {mon}=setup();mon.mhp=1;await strike([0,18,0,18,1]);
    assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].advance,1);
    assert.equal(game.level.monsters.includes(mon),false);
});

for(const [strength,bonus] of [[3,-2],[18,3],[118,9]])test(`two-handed melee applies C rounded strength bonus at ${strength}`,async()=>{
    const {mon}=setup({kind:'quarterstaff',skill:C.P_QUARTERSTAFF,strength});
    await strike([0,18,0,18,2]);assert.equal(mon.mhp,100-Math.max(1,3+bonus));
});

test('effective Strength changes damage without changing the base attribute',async()=>{
    const {mon}=setup({strength:10});game.u.abon={a:[8,0,0,0,0,0]};
    await strike([0,18,0,18,1]);assert.equal(mon.mhp,96);assert.equal(game.u.acurr.a[C.A_STR],10);
});
