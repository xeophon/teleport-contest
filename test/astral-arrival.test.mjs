import assert from 'node:assert/strict';
import test from 'node:test';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { finalLevel } from '../js/mklev.js';
import { finishLevelTeleport } from '../js/cmd.js';
import { init_dungeons_rng } from '../js/dungeon.js';
import { MONS, PM_ANGEL, PM_ALIGNED_CLERIC } from '../js/permonst.js';
import { ROOM, W_AMUL, W_ARMS } from '../js/const.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';

function setup(seed,record=10,pets=0) {
    const g=resetGame(); initRng(seed); init_dungeons_rng();
    g.flags={verbose:false};g.context={};g.inventory=[];g.moves=100;g.level=new GameMap();g.in_mklev=false;
    g.u={ux:40,uy:10,uz:{...g.astral_level},ulevel:30,uhp:100,uhpmax:100,uhave:{},uconduct:{pets},ualign:{type:0,record},acurr:{a:[18,10,10,10,10,10]}};
    for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
    enableRngLog();return g;
}

test('final_level resets misaligned roamers, rolls player count before guardian eligibility',async()=>{
    const g=setup(7,8);const wrong={mx:4,my:4,mhp:20,mtame:10,pet:true,mpeaceful:1,isminion:1,min_align:1,data:MONS[PM_ANGEL]};
    const same={mx:5,my:4,mhp:20,mpeaceful:1,isminion:1,min_align:0,data:MONS[PM_ALIGNED_CLERIC]};g.level.monsters.push(wrong,same);
    const messages=await finalLevel();
    assert.equal(wrong.mpeaceful,0);assert.equal(wrong.mtame,0);assert.equal(wrong.pet,false);assert.equal(wrong.malign,5);
    assert.equal(same.mpeaceful,1);assert.deepEqual(messages,[]);
    const count=Number(getRngLog()[0].split('=')[1])+3;
    assert.ok(getRngLog()[0].startsWith('rn2(4)=')); assert.equal(g.level.monsters.filter(mon=>mon.givenName).length,count);
    assert.ok(getRngLog().at(-1).startsWith('rn2(2)='),'Hear_again follows player creation even for unworthy heroes');
});

for(const pets of [0,1]) test(`worthy arrival guardian preserves petless conduct (${pets} prior pets)`,async()=>{
    const g=setup(19,9,pets);const messages=await finalLevel({blind:true});
    const guardian=g.level.monsters.find(mon=>mon.isminion&&mon.data.name==='Angel');assert.ok(guardian);
    assert.equal(guardian.mpeaceful,1);assert.equal(guardian.mtame||0,pets?10:0);assert.equal(g.u.uconduct.pets,pets?2:0);
    assert.equal(guardian.min_align,0);assert.equal(guardian.renegade,false);
    assert.ok(guardian.m_lev>=15&&guardian.m_lev<=22); assert.ok(guardian.mhp>=guardian.m_lev+31&&guardian.mhp<=guardian.m_lev*10+60);
    assert.ok(guardian.minvent.some(obj=>obj.blessed&&obj.cls==='weapon'));
    assert.ok(guardian.minvent.some(obj=>(obj.owornmask&W_ARMS)&&(obj.kind==='shield of reflection'))
        ||guardian.minvent.some(obj=>(obj.owornmask&W_AMUL)&&obj.amuletIndex===7));
    assert.ok(messages.includes('You feel the presence of a friendly angel near you.'));
    assert.ok(!guardian.mextra?.edog);
});

test('conflict arrival creates 2-4 hostile coaligned renegade angels and no guardian',async()=>{
    const g=setup(73,20,1); const messages=await finalLevel({conflict:true});
    const angels=g.level.monsters.filter(mon=>mon.isminion&&mon.data.name==='Angel');
    assert.ok(angels.length>=2&&angels.length<=4);assert.ok(angels.every(mon=>!mon.mpeaceful&&!mon.mtame&&mon.renegade));
    assert.equal(g.u.uconduct.pets,1);assert.equal(messages.at(-1),'"Thy desire for conflict shall be fulfilled!"');
});

test('real first Astral level arrival creates players and guardian once, without forcing the Wizard',async()=>{
    const g=setup(7,10,1); const astral={...g.astral_level}; g.u.uz={...g.water_level}; g.u.uhave.amulet=true;
    await finishLevelTeleport(astral,{portalArrival:true,suppressMaterialize:true});
    const players=g.level.monsters.filter(mon=>mon.givenName?.includes(' the ')&&mon.minvent?.some(obj=>obj.fakeAmuletOfYendor));
    assert.ok(players.length>=3&&players.length<=6,`${players.length} players`);
    assert.ok(g.level.monsters.some(mon=>mon.isminion&&mon.mtame===10));assert.equal(g._force_endgame_wizard_after_arrival,0);
    assert.equal(g._pending_message,'A voice whispers:');
    const prior=g.level; const oldCount=players.length;
    await finishLevelTeleport(g.water_level,{portalArrival:true,suppressMaterialize:true});
    await finishLevelTeleport(astral,{portalArrival:true,suppressMaterialize:true});
    assert.equal(g.level,prior);assert.equal(g.level.monsters.filter(mon=>mon.givenName?.includes(' the ')&&mon.minvent?.some(obj=>obj.fakeAmuletOfYendor)).length,oldCount);
    assert.equal(g.u.uconduct.pets,2);
});
