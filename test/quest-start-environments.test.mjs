import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev, place_lregion, __mklevTestHooks } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STONE, STAIRS, ALTAR, THRONE, TREE, GRAVE, ICE, POOL, LAVAPOOL, FOUNTAIN, MAGIC_PORTAL, FIRE_TRAP, PIT, LR_BRANCH, W_ARMU, W_ARMF, W_ARMC, F_LOOTED, TREE_SWARM, xdir, ydir, DIR_180 } from '../js/const.js';
import { parseQuestLua } from '../tools/quest-lua-parser.mjs';

function setup(role,seed=19) {
    const g=resetGame();initRng(seed);enableRngLog();
    Object.assign(g,{moves:100,flags:{bones:false},inventory:[],_startup_role:role,urole:{name:{m:role}},
        dungeons:[{name:'The Quest',num_dunlevs:6,depth_start:10}],specialLevels:[{name:'x-strt',dnum:0,dlevel:1}],quest_dnum:0,
        branches:[{type:'portal',end1:{dnum:1,dlevel:12},end2:{dnum:0,dlevel:1}}],
        u:{ux:40,uy:10,ulevel:20,uhave:{},uz:{dnum:0,dlevel:1},ualign:{type:0,record:10},ualignbase:[0,0]},level:new GameMap()});
    return g;
}

const starts=[['Monk','Mon','Grand Master','abbot',28,10,8,[['robe',6,W_ARMC]]],
    ['Tourist','Tou','Twoflower','guide',64,3,11,[['low boots',3,W_ARMF],['Hawaiian shirt',3,W_ARMU]]],
    ['Valkyrie','Val','Norn','warrior',35,10,8,[['banded mail',5,0],['long sword',4,0]]]];
for(const [role,prefix,leader,guardian,lx,ly,count,gear] of starts) {
    test(`${role} start dispatch equips its leader and guards and creates the source environment`,async()=>{
        for(const seed of [1,19,731]) {
            const g=setup(role,seed);await mklev();const mon=g.level.monsters.find(m=>m.data.name===leader);assert.ok(mon);
            assert.deepEqual(mon.minvent.map(o=>[o.actualKind||o.kind,o.spe]).sort(),gear.map(([name,spe])=>[name,spe]).sort());
            for(const [name,,mask] of gear)if(mask)assert.ok(mon.minvent.find(o=>(o.actualKind||o.kind)===name).owornmask&mask);
            assert.equal(g.level.monsters.filter(m=>m.data.name===guardian&&m.mpeaceful).length,count);
            assert.ok(g.level.dnstair);assert.ok(g.level.traps.some(t=>t.ttyp===MAGIC_PORTAL));
            if(role==='Monk') {
                assert.equal(g.level.monsters.filter(m=>m.data.name==='earth elemental').length,8);
                assert.equal(g.level.monsters.filter(m=>m.data.name==='xorn').length,4);
                const dx=Math.sign(g.level.dnstair.x-mon.mx),dy=Math.sign(mon.my-g.level.dnstair.y);
                const tin=g.level.objects.find(o=>o.kind==='tin'&&o.spe===1&&o.ox===mon.mx+dx&&o.oy===mon.my-dy);assert.equal(tin.quan,2);
                const ration=g.level.objects.find(o=>o.kind==='food ration'&&o.ox===mon.mx+18*dx&&o.oy===mon.my-6*dy);assert.equal(ration.quan,4);assert.equal(ration.owt,80);
            }
            if(role==='Tourist') {
                assert.ok(g.level.monsters.filter(m=>m.data.name==='giant spider').length>=12);
                assert.ok(g.level.monsters.filter(m=>m.data.name==='forest centaur').length>=8);
                assert.equal(g.level.monsters.filter(m=>m.data.name==='kraken').length,2);
            }
            if(role==='Valkyrie') {
                // Norn is huge; worn.c permits no ordinary body armor for her.
                assert.ok(mon.minvent.every(obj=>!obj.owornmask));
                assert.equal(g.level.traps.filter(t=>t.ttyp===FIRE_TRAP).length,6);
                assert.equal(g.level.monsters.filter(m=>m.data.name==='fire ant').length,10);
                assert.equal(g.level.monsters.filter(m=>m.data.name==='fire giant').length,2);
                assert.equal(g.level.flags.nfountains,1);
            }
        }
    });
    test(`${prefix} start keeps source terrain and entrance coordinates after reflection`,async()=>{
        const source=await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-strt.lua`,import.meta.url),'utf8');
        const rows=/des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
        for(const seed of [1,19,731]) {
            const g=setup(role,seed);await mklev();const mon=g.level.monsters.find(m=>m.data.name===leader);assert.ok(mon);
            let best=Infinity;
            for(const dx of [-1,1])for(const dy of [-1,1]) {
                let misses=0;
                for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++) {
                    if(!'.\\{'.includes(rows[y][x]))continue;
                    const typ=g.level.at(mon.mx+dx*(x-lx),mon.my+dy*(y-ly))?.typ;
                    const allowed=rows[y][x]==='\\'?[THRONE]:rows[y][x]==='{'?[FOUNTAIN]:[ROOM,STAIRS,ALTAR];
                    if(role==='Monk'&&(x<=10||x>=65))allowed.push(TREE);
                    if(role==='Tourist'&&x>=14&&x<=20&&y>=1&&y<=3)allowed.push(GRAVE);
                    if(!allowed.includes(typ))misses++;
                }
                const portal=g.level.traps.find(t=>t.ttyp===MAGIC_PORTAL);
                const point={Monk:[5,4],Tourist:[68,14],Valkyrie:[66,17]}[role];
                if(portal.tx!==mon.mx+dx*(point[0]-lx)||portal.ty!==mon.my+dy*(point[1]-ly))misses++;
                best=Math.min(best,misses);
            }
            assert.equal(best,0);
        }
    });
}

test('Valkyrie pre-map pools preserve sixteen source coordinate draws and water rings before map overlay',async()=>{
    const source=await readFile(new URL('../nethack-c/upstream/dat/Val-strt.lua',import.meta.url),'utf8');
    const operations=parseQuestLua(source);const g=setup('Valkyrie');
    const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
    await __mklevTestHooks.questFillerOperations(operations.slice(0,2),state);
    assert.equal(g.level.at(1,20).typ,STONE);assert.equal(g.level.at(2,20).typ,ICE);
    assert.equal(g.level.at(78,20).typ,ICE);assert.equal(g.level.at(79,20).typ,STONE);
    assert.equal(g.level.at(2,20).icedpool||0,0);
    await __mklevTestHooks.questFillerOperations(operations.slice(2,operations.findIndex(op=>op[0]==='map')),state);
    assert.deepEqual(getRngLog().slice(0,33).map(e=>e.split('=')[0]),['rn2(2)',...Array.from({length:16},()=>['rn2(79)','rn2(21)']).flat()]);
    const lava=state.variables.get('pools'),water=lava.grow('all').subtract(lava);assert.ok(lava.numpoints()>=13);
    lava.iterate((x,y)=>{if(x>0)assert.equal(g.level.at(x,y).typ,LAVAPOOL);});
    water.iterate((x,y)=>{if(x>0)assert.equal(g.level.at(x,y).typ,POOL);});
});

test('des.feature preserves existing furniture and applies only explicit feature flags',async()=>{
    const g=setup('Valkyrie');for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
    const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
    g.level.at(11,10).typ=ALTAR;
    await __mklevTestHooks.questFillerOperations(parseQuestLua('des.feature("fountain",10,10) des.feature({type="fountain",coord={12,10},looted=true}) des.feature({type="tree",coord={13,10},swarm=true,looted=false})'),state);
    assert.equal(g.level.at(11,10).typ,ALTAR);assert.equal(g.level.at(13,10).typ,FOUNTAIN);assert.ok(g.level.at(13,10).flags&F_LOOTED);
    assert.equal(g.level.at(14,10).typ,TREE);assert.equal(g.level.at(14,10).flags,TREE_SWARM);
});

test('a fixed quest entrance clears an obstructing pit and reciprocal links before placing its portal',()=>{
    const g=setup('Monk');g.level.at(10,10).typ=ROOM;
    const direction=xdir.findIndex((dx,index)=>dx===1&&ydir[index]===0);
    const pit={tx:10,ty:10,ttyp:PIT,conjoined:1<<direction};
    const neighbor={tx:11,ty:10,ttyp:PIT,conjoined:1<<DIR_180(direction)};
    const mon={mx:10,my:10,mtrapped:1};g.level.monsters=[mon];g.level.traps=[pit,neighbor];
    place_lregion(10,10,10,10,0,0,0,0,LR_BRANCH,null);
    assert.equal(mon.mtrapped,0);assert.equal(neighbor.conjoined,0);
    assert.equal(g.level.traps.some(t=>t===pit),false);assert.ok(g.level.traps.some(t=>t.tx===10&&t.ty===10&&t.ttyp===MAGIC_PORTAL));
    assert.deepEqual(getRngLog().map(e=>e.split('=')[0]),['rn2(1)','rn2(1)']);
});

test('a fixed quest entrance preserves an undestroyable existing portal and refuses an altar square',()=>{
    for(const altar of [false,true]) {
        const g=setup('Monk');g.level.at(10,10).typ=altar?ALTAR:ROOM;
        const portal={tx:10,ty:10,ttyp:MAGIC_PORTAL,dst:{dnum:3,dlevel:2}};
        if(!altar)g.level.traps=[portal];
        place_lregion(10,10,10,10,0,0,0,0,LR_BRANCH,null);
        assert.deepEqual(g.level.traps,altar?[]:[portal]);assert.ok(!g.made_branch);
    }
});

test('named food objects use source unit weights after an explicit stack quantity',async()=>{
    const source=await readFile(new URL('../nethack-c/upstream/include/objects.h',import.meta.url),'utf8');
    const weights=new Map([...source.matchAll(/FOOD\("([^"]+)",\s*\d+,\s*\d+,\s*(\d+)/g)].map(m=>[m[1],Number(m[2])]));
    for(const name of ['food ration','melon','enormous meatball','cream pie','lembas wafer']) {
        const g=setup('Monk');g.level.at(11,10).typ=ROOM;
        const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
        await __mklevTestHooks.questFillerOperations([['object',{id:name,coord:[10,10],quantity:3}]],state);
        assert.equal(g.level.objects.length,1);assert.equal(g.level.objects[0].quan,3);assert.equal(g.level.objects[0].owt,weights.get(name)*3);
    }
});
