import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev, recordArtifactExistence, artifactExists, __mklevTestHooks } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STAIRS, ALTAR, THRONE, MAGIC_PORTAL, COURT, TEMPLE, W_ARM, STRAT_CLOSE, STRAT_APPEARMSG } from '../js/const.js';
import { parseQuestLua } from '../tools/quest-lua-parser.mjs';
import { MONS } from '../js/permonst.js';
import { beginBurn } from '../js/burn.js';
import { startTimer, peekTimer, TIMER_OBJECT, ROT_ORGANIC } from '../js/timeout.js';

function setup(role, seed=19) {
    const g=resetGame();initRng(seed);enableRngLog();
    Object.assign(g,{moves:100,flags:{bones:false},inventory:[],_startup_role:role,urole:{name:{m:role}},
        dungeons:[{name:'The Quest',num_dunlevs:6,depth_start:10}],specialLevels:[{name:'x-strt',dnum:0,dlevel:1}],quest_dnum:0,
        branches:[{type:'portal',end1:{dnum:1,dlevel:12},end2:{dnum:0,dlevel:1}}],
        u:{ux:40,uy:10,ulevel:20,uhave:{},uz:{dnum:0,dlevel:1},ualign:{type:0,record:10},ualignbase:[0,0]},level:new GameMap()});
    return g;
}

const starts=[
    ['Caveman','Cav','Shaman Karnov','neanderthal',35,2,[['leather armor',5],['club',5]]],
    ['Healer','Hea','Hippocrates','attendant',37,10,[['silver dagger',5]]],
    ['Samurai','Sam','Lord Sato','roshi',20,4,[['splint mail',5],['katana',4]]],
];
for(const [role,prefix,leader,guardian,lx,ly,equipment] of starts) {
    test(`${role} start dispatch gives its leader exactly the source inventory and eight equipped guardians`,async()=>{
        for(const seed of [1,19,731]) {
            const g=setup(role,seed);await mklev();
            const mon=g.level.monsters.find(m=>m.data.name===leader);assert.ok(mon);
            assert.equal(mon.mpeaceful,1);assert.equal(mon.mstrategy&(STRAT_CLOSE|STRAT_APPEARMSG),STRAT_CLOSE|STRAT_APPEARMSG);
            assert.deepEqual(mon.minvent.map(o=>[o.actualKind||o.kind,o.spe]).sort(),[...equipment].sort());
            for(const obj of mon.minvent) {
                assert.equal(obj.ocarry,mon);assert.ok(!g.level.objects.includes(obj));
                if(obj.cls==='armor')assert.ok(obj.owornmask&W_ARM);
                if(role==='Samurai'){assert.equal(obj.oerodeproof,true);assert.equal(!!obj.cursed,false);}
            }
            const guards=g.level.monsters.filter(m=>m.data.name===guardian);assert.equal(guards.length,8);
            for(const guard of guards){assert.equal(guard.mpeaceful,1);assert.equal(guard.data.guardian,true);}
            if(role==='Caveman')for(const guard of guards)assert.ok(guard.minvent.some(o=>o.kind==='club')&&guard.minvent.some(o=>o.kind==='leather armor'&&o.owornmask&W_ARM));
            if(role==='Samurai')for(const guard of guards)assert.ok(guard.minvent.some(o=>['long sword','short sword'].includes(o.kind)));
            const portal=g.level.traps.find(t=>t.ttyp===MAGIC_PORTAL);assert.ok(portal);assert.deepEqual(portal.dst,{dnum:1,dlevel:12});
            assert.ok(g.level.dnstair);assert.equal(g.level.flags.noteleport,true);assert.equal(g.level.flags.hardfloor,true);
            if(role==='Caveman'){assert.equal(g.level.monsters.filter(m=>m.data.name==='bugbear').length,12);assert.equal(g.level.rooms.filter(r=>r.rtype===TEMPLE).length,1);}
            if(role==='Healer')assert.equal(g.level.monsters.filter(m=>m.data.name==='rabid rat').length,10);
            if(role==='Samurai'){assert.equal(g.level.monsters.filter(m=>m.data.name==='ninja').length,9);assert.equal(g.level.rooms.filter(r=>r.rtype===COURT).length,1);}
        }
    });
    test(`${prefix} start preserves every source floor and its fixed branch geometry after reflections`,async()=>{
        const source=await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-strt.lua`,import.meta.url),'utf8');
        const rows=/des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
        for(const seed of [1,19,731]) {
            const g=setup(role,seed);await mklev();const mon=g.level.monsters.find(m=>m.data.name===leader);assert.ok(mon);
            let best=Infinity;
            for(const dx of [-1,1])for(const dy of [-1,1]) {
                let misses=0;
                for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++) {
                    if(!'.\\'.includes(rows[y][x]))continue;
                    const typ=g.level.at(mon.mx+dx*(x-lx),mon.my+dy*(y-ly))?.typ;
                    if(!(rows[y][x]==='\\'?[THRONE]:[ROOM,STAIRS,ALTAR]).includes(typ))misses++;
                }
                const portal=g.level.traps.find(t=>t.ttyp===MAGIC_PORTAL);
                const px=lx+(portal.tx-mon.mx)*dx,py=ly+(portal.ty-mon.my)*dy;
                if(role==='Caveman'&&(px!==71||py!==9))misses++;
                if(role==='Healer'&&(px!==4||py!==12))misses++;
                if(role==='Samurai'&&(px<62||px>70||py<12||py>17))misses++;
                best=Math.min(best,misses);
            }
            assert.equal(best,0);
        }
    });
}

async function execute(source,role='Caveman',seed=19,extra={}) {
    const g=setup(role,seed);Object.assign(g,extra);
    for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
    const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
    await __mklevTestHooks.questFillerOperations(parseQuestLua(source),state);
    return {g,state,log:[...getRngLog()]};
}

test('custom inventory keeps all makemon RNG then checks each discarded default object before its callback',async()=>{
    const plain=await execute('des.monster({id="Shaman Karnov",coord={10,10}})');
    const defaults=plain.g.level.monsters[0].minvent;assert.ok(defaults.length);
    const custom=await execute('des.monster({id="Shaman Karnov",coord={10,10},inventory=function() end})');
    assert.deepEqual(custom.log.slice(0,plain.log.length),plain.log);
    assert.deepEqual(custom.log.slice(plain.log.length).map(e=>e.split('=')[0]),defaults.map(()=>'rn2(100)'));
    assert.deepEqual(custom.g.level.monsters[0].minvent,[]);
});

test('custom inventory objects still select floor coordinates before creation and are equipped after the callback',async()=>{
    const empty=await execute('des.monster({id="Shaman Karnov",coord={10,10},inventory=function() end})');
    const custom=await execute('des.monster({id="Shaman Karnov",coord={10,10},inventory=function() des.object({id="leather armor",spe=5}) end})');
    assert.deepEqual(custom.log.slice(0,empty.log.length),empty.log);
    assert.deepEqual(custom.log.slice(empty.log.length,empty.log.length+2).map(e=>e.split('=')[0]),['rn2(79)','rn2(21)']);
    const mon=custom.g.level.monsters[0];assert.equal(mon.minvent.length,1);assert.ok(mon.minvent[0].owornmask&W_ARM);
});

test('keep_default_invent retains generated equipment and an extinct unique still executes its inventory callback on the floor',async()=>{
    const plain=await execute('des.monster({id="Shaman Karnov",coord={10,10}})');
    const keep=await execute('des.monster({id="Shaman Karnov",coord={10,10},keep_default_invent=true,inventory=function() des.object({id="club",spe=5}) end})');
    assert.deepEqual(keep.log.slice(0,plain.log.length),plain.log);assert.equal(keep.g.level.monsters[0].minvent.length,plain.g.level.monsters[0].minvent.length+1);
    const gone=await execute('des.monster({id="Shaman Karnov",coord={10,10},inventory=function() des.object({id="club",spe=5}) end})','Caveman',19,{_extinct_monsters:['Shaman Karnov']});
    assert.equal(gone.g.level.monsters.length,0);assert.equal(gone.g.level.objects.length,1);assert.equal(gone.g.level.objects[0].kind,'club');
});

test('custom nemesis inventory rescues the Bell before discarding other defaults',async()=>{
    const result=await execute('des.monster({id="Chromatic Dragon",coord={10,10},inventory=function() des.object({id="club",spe=5}) end})');
    const mon=result.g.level.monsters[0];assert.deepEqual(mon.minvent.map(o=>o.kind),['club']);
    const bell=result.g.level.objects.find(o=>o.kind==='Bell of Opening');assert.ok(bell);assert.deepEqual([bell.ox,bell.oy],[mon.mx,mon.my]);assert.ok(!bell.ocarry);
});

test('discarding default inventory releases worn light, stops nested object timers and rescues the current quest artifact',()=>{
    const g=setup('Caveman');
    const armor={otyp:10140,cls:'armor',kind:'gold dragon scale mail',quan:1,owornmask:W_ARM};
    const quest={otyp:10033,cls:'weapon',kind:'mace',artifact:'The Sceptre of Might',quan:1};
    const sword={otyp:10033,cls:'weapon',kind:'long sword',artifact:'Excalibur',quan:1};
    const child={otyp:7,cls:'food',kind:'food ration',quan:1};
    const chest={otyp:12,cls:'tool',kind:'chest',contents:[child],quan:1};
    const mon={data:MONS.find(m=>m.name==='Shaman Karnov'),mx:10,my:10,minvent:[armor,quest,sword,chest],misc_worn_check:W_ARM};
    for(const obj of mon.minvent)obj.ocarry=mon;
    for(const name of [quest.artifact,sword.artifact])recordArtifactExistence(name);
    beginBurn(armor);startTimer(20,TIMER_OBJECT,ROT_ORGANIC,child);assert.equal(armor.lamplit,true);
    __mklevTestHooks.discardQuestMonsterInventory(mon);
    assert.deepEqual(mon.minvent,[]);assert.equal(mon.misc_worn_check,0);assert.equal(armor.lamplit,false);
    assert.equal(peekTimer(ROT_ORGANIC,child),0);assert.equal(artifactExists('Excalibur'),false);assert.equal(artifactExists(quest.artifact),true);
    assert.deepEqual(g.level.objects,[quest]);assert.deepEqual([quest.ox,quest.oy],[10,10]);assert.equal(quest.owornmask,0);
});

test('keep_default_invent=false without a callback discards equipment using the same source path',async()=>{
    const custom=await execute('des.monster({id="Shaman Karnov",coord={10,10},inventory=function() end})');
    const none=await execute('des.monster({id="Shaman Karnov",coord={10,10},keep_default_invent=false})');
    assert.deepEqual(none.log,custom.log);assert.deepEqual(none.g.level.monsters[0].minvent,[]);
});

test('discarded containers traverse distinct cobj and contents chains without processing shared children twice',()=>{
    const g=setup('Caveman');
    const shared={otyp:7,cls:'food',kind:'food ration',quan:1};
    const inner={otyp:7,cls:'food',kind:'apple',quan:1};
    const artifact={otyp:10033,cls:'weapon',kind:'long sword',artifact:'Excalibur',quan:1,cobj:[inner]};
    const chest={otyp:12,cls:'tool',kind:'chest',quan:1,contents:[shared],cobj:[artifact,shared]};
    const mon={data:MONS.find(m=>m.name==='Shaman Karnov'),mx:10,my:10,minvent:[chest]};
    recordArtifactExistence('Excalibur');
    for(const obj of [shared,inner,artifact])startTimer(20,TIMER_OBJECT,ROT_ORGANIC,obj);
    __mklevTestHooks.discardQuestMonsterInventory(mon);
    assert.equal(artifactExists('Excalibur'),false);assert.deepEqual(g.timers,[]);
    for(const obj of [shared,inner,artifact])assert.equal(obj.timed,0);
});
