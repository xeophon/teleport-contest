import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev, makemon, putSaddleOnMonster, __mklevTestHooks } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STAIRS, ALTAR, THRONE, IRONBARS, MAGIC_PORTAL, W_SADDLE, M_AP_FURNITURE, NO_MINVENT } from '../js/const.js';
import { monsterGlyph } from '../js/display.js';
import { parseQuestLua } from '../tools/quest-lua-parser.mjs';
import { MONS, PM_WARHORSE } from '../js/permonst.js';
import { canSaddle } from '../js/mondata.js';
import { DEFSYMS } from '../js/defsym.js';

function setup(role,seed=19) {
    const g=resetGame();initRng(seed);enableRngLog();
    Object.assign(g,{moves:100,flags:{bones:false},inventory:[],_startup_role:role,urole:{name:{m:role}},
        dungeons:[{name:'The Quest',num_dunlevs:6,depth_start:10}],specialLevels:[{name:'x-strt',dnum:0,dlevel:1}],quest_dnum:0,
        branches:[{type:'portal',end1:{dnum:1,dlevel:12},end2:{dnum:0,dlevel:1}}],
        u:{ux:40,uy:10,ulevel:20,uhave:{},uz:{dnum:0,dlevel:1},ualign:{type:0,record:10},ualignbase:[0,0]},level:new GameMap()});
    return g;
}

for(const [role,prefix,leader,guardian,lx,ly,count] of [['Knight','Kni','King Arthur','page',9,7,6],['Ranger','Ran','Orion','hunter',20,10,8],['Rogue','Rog','Master of Thieves','thug',36,11,9]]) {
    test(`${role} start dispatch creates the source leader, guards and special inhabitants`,async()=>{
        for(const seed of [1,19,731]) {
            const g=setup(role,seed);await mklev();const mon=g.level.monsters.find(m=>m.data.name===leader);assert.ok(mon);
            assert.equal(mon.mpeaceful,1);assert.equal(g.level.monsters.filter(m=>m.data.name===guardian&&m.mpeaceful).length,count);
            assert.ok(g.level.dnstair);assert.ok(g.level.traps.some(t=>t.ttyp===MAGIC_PORTAL));
            if(role==='Knight') {
                const sword=mon.minvent.find(o=>o.artifact==='Excalibur');assert.ok(sword);assert.equal(sword.spe,4);assert.equal(sword.blessed,true);
                assert.equal(g.level.monsters.filter(m=>m.data.name==='knight'&&m.mpeaceful).length,4);
                assert.equal(g.level.monsters.filter(m=>m.data.name==='quasit').length,12);
                const horses=g.level.monsters.filter(m=>m.data.name==='warhorse');assert.ok(horses.length>=2&&horses.length<=4);
                for(const horse of horses) {
                    assert.equal(horse.mpeaceful,1);assert.ok(horse.minvent.length<=1);
                    for(const saddle of horse.minvent){assert.equal(saddle.kind,'saddle');assert.equal(saddle.owornmask,W_SADDLE);assert.equal(saddle.leashmon,horse.m_id);assert.equal(saddle.ocarry,horse);}
                }
            }
            if(role==='Ranger') {
                const arrows=mon.minvent.find(o=>o.actualKind==='ya');assert.ok(arrows);assert.equal(arrows.quan,50);assert.equal(arrows.spe,4);assert.equal(arrows.owt,50);
                assert.ok(mon.minvent.some(o=>o.actualKind==='yumi'&&o.spe===4));
                assert.equal(g.level.monsters.filter(m=>m.data.name==='forest centaur').length,18);
                assert.ok(g.level.monsters.some(m=>m.data.name==='minotaur'&&m.msleeping));
            }
            if(role==='Rogue') {
                assert.equal(g.level.flags.nommap,true);
                const daggers=mon.minvent.find(o=>(o.actualKind||o.kind)==='dagger');assert.ok(daggers.quan>=2&&daggers.quan<=8);assert.equal(daggers.spe,2);assert.equal(daggers.cursed,false);assert.equal(daggers.owt,10*daggers.quan);
                const mimics=g.level.monsters.filter(m=>/^(giant|large|small) mimic$/.test(m.data.name));assert.equal(mimics.length,3);
                for(const mimic of mimics){assert.equal(mimic.m_ap_type,M_AP_FURNITURE);assert.equal(mimic.mappearance,26);assert.equal(monsterGlyph(mimic).ch,'>');assert.equal(g.level.at(mimic.mx,mimic.my).typ,ROOM);}
            }
        }
    });
    test(`${prefix} start keeps the source map geometry with its selected stairs and portal`,async()=>{
        const source=await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-strt.lua`,import.meta.url),'utf8');
        const map=parseQuestLua(source).find(op=>op[0]==='map')[1];const rows=(typeof map==='string'?map:map.map).split('\n');
        for(const seed of [1,19,731]) {
            const g=setup(role,seed);await mklev();const mon=g.level.monsters.find(m=>m.data.name===leader);assert.ok(mon);
            let best=Infinity;
            for(const dx of [-1,1])for(const dy of [-1,1]) {
                let misses=0;
                for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++) {
                    if(!'.\\F'.includes(rows[y][x]))continue;
                    const typ=g.level.at(mon.mx+dx*(x-lx),mon.my+dy*(y-ly))?.typ;
                    const allowed=rows[y][x]==='\\'?[THRONE]:rows[y][x]==='F'?[IRONBARS]:[ROOM,STAIRS,ALTAR];
                    if(!allowed.includes(typ))misses++;
                }
                if(role==='Rogue') {
                    const exits=[[33,0],[0,12],[25,20],[75,5]].map(([x,y])=>[mon.mx+dx*(x-lx),mon.my+dy*(y-ly)]);
                    const stairs=g.level.dnstair;const mimics=g.level.monsters.filter(m=>m.m_ap_type===M_AP_FURNITURE);
                    for(const [x,y] of exits)if(!(stairs.x===x&&stairs.y===y)&&!mimics.some(m=>m.mx===x&&m.my===y))misses++;
                }
                best=Math.min(best,misses);
            }
            assert.equal(best,0);
        }
    });
}

test('Ranger map table uses initialized left alignment, preserves unoverlaid terrain and consumes no alignment RNG',async()=>{
    const source=await readFile(new URL('../nethack-c/upstream/dat/Ran-strt.lua',import.meta.url),'utf8');const ops=parseQuestLua(source);
    const g=setup('Ranger');const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
    const mapIndex=ops.findIndex(op=>op[0]==='map');await __mklevTestHooks.questFillerOperations(ops.slice(0,mapIndex),state);
    const outside=g.level.at(60,10).typ;const offset=getRngLog().length;await __mklevTestHooks.questFillerOperations([ops[mapIndex]],state);
    assert.deepEqual(state.area,{lx:1,ly:0,hx:41,hy:20});assert.equal(g.level.at(60,10).typ,outside);assert.equal(getRngLog().length,offset);
});

test('explicit furniture mimic appearance follows makemon RNG and respects shapechanger protection',async()=>{
    const run=async(appearance,protection=false)=>{
        const g=setup('Rogue');g.u.protectionFromShapeChangers=protection;
        for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
        const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
        await __mklevTestHooks.questFillerOperations([['monster',{id:'giant mimic',coord:[10,10],...(appearance?{appear_as:'ter:staircase down'}:{})}]],state);
        return {mon:g.level.monsters[0],log:[...getRngLog()]};
    };
    const plain=await run(false),forced=await run(true);assert.deepEqual(forced.log,plain.log);assert.equal(forced.mon.mappearance,26);assert.equal(monsterGlyph(forced.mon).ch,'>');
    const protectedMon=await run(true,true);assert.notEqual(protectedMon.mon.mappearance,26);
});

test('warhorse inventory callbacks wear a selected saddle and leave unsaddleable inventory objects unworn',async()=>{
    for(const species of ['warhorse','human']) {
        const g=setup('Knight');for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
        const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
        await __mklevTestHooks.questFillerOperations(parseQuestLua(`des.monster({id="${species}",coord={10,10},inventory=function() des.object("saddle") end})`),state);
        const mon=g.level.monsters[0],saddle=mon.minvent[0];assert.equal(saddle.kind,'saddle');assert.equal(saddle.ocarry,mon);
        assert.equal(saddle.owornmask||0,species==='warhorse'?W_SADDLE:0);assert.equal(saddle.owt,150);
    }
});

test('ordinary domestic monsters can receive the source one-percent default saddle',async()=>{
    let saddled=0;
    for(let seed=1;seed<=400;seed++) {
        const g=setup('Knight',seed);for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
        const mon=await makemon(__mklevTestHooks.questMonsterData(MONS[PM_WARHORSE]),10,10,0);const saddle=(mon.minvent||[]).find(o=>o.kind==='saddle');
        if(saddle){
            saddled++;assert.equal(saddle.owornmask,W_SADDLE);assert.equal(saddle.leashmon,mon.m_id);assert.equal(saddle.known,true);
            // The saddle only adds next_ident's rnd(2) after the existing
            // one-percent draw; it does not choose another random tool type.
            assert.equal(getRngLog().at(-2),'rn2(100)=0');assert.match(getRngLog().at(-1),/^rnd\(2\)=/);
            const log=[...getRngLog()];assert.equal(putSaddleOnMonster(mon),false);
            assert.equal(mon.minvent.filter(o=>o.kind==='saddle').length,1);assert.deepEqual(getRngLog(),log);
            __mklevTestHooks.discardQuestMonsterInventory(mon);
            assert.equal(mon.saddled,false);assert.equal(mon.minvent.length,0);assert.equal(mon.misc_worn_check,0);
        }
    }
    assert.ok(saddled>0&&saddled<20);
});

test('NO_MINVENT skips the domestic saddle roll used by ordinary makemon',async()=>{
    for(let seed=1;seed<=50;seed++) {
        const g=setup('Knight',seed);for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
        const mon=await makemon(__mklevTestHooks.questMonsterData(MONS[PM_WARHORSE]),10,10,NO_MINVENT);
        assert.equal((mon.minvent||[]).length,0);assert.equal(getRngLog().some(call=>call.startsWith('rn2(100)')),false);
        const log=[...getRngLog()];assert.equal(putSaddleOnMonster(mon),true);assert.deepEqual(getRngLog().slice(0,-1),log);assert.match(getRngLog().at(-1),/^rnd\(2\)=/);
        assert.equal(mon.minvent[0].leashmon,mon.m_id);assert.equal(mon.minvent[0].ocarry,mon);
    }
});

test('saddle anatomy shares all six source classes and rejects humanoid or small forms',()=>{
    const saddlable=['rothe','pony','ki-rin','couatl','forest centaur','red dragon','jabberwock'];
    for(const name of saddlable){assert.equal(canSaddle(name),true,name);assert.equal(canSaddle(__mklevTestHooks.questMonsterData(MONS.find(mon=>mon.name===name))),true,name);}
    for(const name of ['Angel','kobold','human','air elemental','ghost'])assert.equal(canSaddle(name),false,name);
});

test('furniture disguises use the shared complete source symbol table and first matching explanation',async()=>{
    assert.equal(DEFSYMS.length,105);
    for(const explanation of ['wall','open door','staircase down','opulent throne','water']) {
        const g=setup('Rogue');for(let x=1;x<80;x++)for(let y=0;y<21;y++)g.level.at(x,y).typ=ROOM;
        const state={area:{lx:1,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
        await __mklevTestHooks.questFillerOperations([['monster',{id:'giant mimic',coord:[10,10],appear_as:`ter:${explanation}`}]],state);
        const mon=g.level.monsters[0],index=DEFSYMS.findIndex(symbol=>symbol.explanation===explanation);
        assert.equal(mon.mappearance,index);assert.deepEqual(monsterGlyph(mon),{ch:DEFSYMS[index].ch,color:DEFSYMS[index].color,dec:false});
    }
});
