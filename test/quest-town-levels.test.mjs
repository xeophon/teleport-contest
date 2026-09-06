import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev, __mklevTestHooks } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STAIRS, ALTAR, IRONBARS, THRONE, GRAVE, SHOPBASE, MORGUE, ZOO, TEMPLE, BARRACKS, BURN } from '../js/const.js';
import { MONS, M3_CLOSE, M3_WAITFORU } from '../js/permonst.js';
import { QUEST_ROLE_MONSTERS } from '../js/roles.js';
import { parseQuestLua } from '../tools/quest-lua-parser.mjs';

async function build(role,stage,seed=1) {
    const g=resetGame();initRng(seed);enableRngLog();
    Object.assign(g,{moves:100,flags:{bones:false},inventory:[],_startup_role:role,urole:{name:{m:role}},
        dungeons:[{name:'The Quest',num_dunlevs:6,depth_start:10}],specialLevels:[{name:`x-${stage}`,dnum:0,dlevel:stage==='goal'?6:3}],quest_dnum:0,
        u:{ux:40,uy:10,ulevel:20,uhave:{},uz:{dnum:0,dlevel:stage==='goal'?6:3},ualign:{type:0,record:10},ualignbase:[0,0]},level:new GameMap()});
    await mklev();return g;
}

test('Monk locate generates protected blessed spinach tins, both stairs, fourteen earth elementals and nine xorns',async()=>{
    for(const seed of [1,19,731]) {
        const g=await build('Monk','loca',seed);
        const tin=g.level.objects.find(obj=>obj.kind==='tin'&&obj.spe===1&&obj.blessed);
        assert.ok(tin);assert.equal(tin.quan,2);assert.equal(tin.owt,20);
        assert.ok(g.level.engravings.some(e=>e.x===tin.ox&&e.y===tin.oy&&e.type===BURN&&e.text==='Elbereth'));
        assert.ok(g.level.upstair&&g.level.dnstair);
        assert.equal(g.level.monsters.filter(m=>m.data.name==='earth elemental').length,14);
        assert.equal(g.level.monsters.filter(m=>m.data.name==='xorn').length,9);
    }
});

test('Tourist locate creates the source town rooms, shops and toilet paper beside the throne',async()=>{
    for(const seed of [1,19,731]) {
        const g=await build('Tourist','loca',seed);assert.equal(g.level.flags.hardfloor,true);
        for(const [rtype,count] of [[SHOPBASE,2],[MORGUE,1],[BARRACKS,3],[ZOO,1],[TEMPLE,1]])
            assert.equal(g.level.rooms.filter(r=>rtype===SHOPBASE?r.rtype>=SHOPBASE:r.rtype===rtype).length,count);
        const papers=g.level.objects.filter(o=>o.otyp===293);assert.ok(papers.reduce((sum,o)=>sum+o.quan,0)>=2);
        const up=g.level.upstair,down=g.level.dnstair;const dx=Math.sign(down.x-up.x),dy=Math.sign(down.y-up.y);
        assert.ok(papers.filter(o=>o.ox===up.x+dx*61&&o.oy===up.y+dy*8).reduce((sum,o)=>sum+o.quan,0)>=2);
        assert.equal(g.level.at(up.x+dx*61,up.y+dy*7).typ,THRONE);
        assert.ok(g.level.monsters.filter(m=>m.data.name==='giant spider').length>=16);
    }
});

test('Tourist goal initializes Master of Thieves as this role nemesis with the artifact, bell and source police station',async()=>{
    for(const seed of [1,19,731]) {
        const g=await build('Tourist','goal',seed);const boss=g.level.monsters.find(m=>m.data.name==='Master of Thieves');
        const prize=g.level.objects.find(o=>o.artifact==='The Platinum Yendorian Express Card');assert.ok(boss&&prize);
        assert.deepEqual([boss.mx,boss.my],[prize.ox,prize.oy]);assert.equal(boss.mpeaceful,0);
        assert.equal(boss.data.nemesis,true);assert.equal(boss.data.covetous,true);assert.equal(boss.data.alwaysPeaceful,false);
        assert.ok(boss.minvent.some(o=>o.kind==='Bell of Opening'));
        for(const [name,count] of [['Kop Kaptain',1],['Kop Lieutenant',3],['Keystone Kop',5],['prisoner',3]])
            assert.equal(g.level.monsters.filter(m=>m.data.name===name).length,count);
        assert.equal(g.level.rooms.filter(r=>r.rtype>=SHOPBASE).length,2);
    }
});

for(const [role,stage,prefix] of [['Monk','loca','Mon'],['Tourist','loca','Tou'],['Tourist','goal','Tou']])
    test(`${prefix}-${stage} actual dispatch retains every source floor, bar and throne tile`,async()=>{
        const source=await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-${stage}.lua`,import.meta.url),'utf8');
        const rows=/des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
        const morgues=[...source.matchAll(/region\s*=\s*\{([\d,\s]+)\}[^}]*type\s*=\s*"morgue"/g)].map(m=>m[1].split(',').map(Number));
        for(const seed of [1,19,731]) {
            const g=await build(role,stage,seed);let misses=Infinity;
            const ystart=rows.length===21?0:1;
            for(const dx of [-1,1])for(const dy of [-1,1]) {
                let n=0;
                for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++) {
                    if(!'.F\\'.includes(rows[y][x]))continue;
                    const px=dx===1?x+3:3+Math.max(...rows.map(row=>row.length))-1-x,py=dy===1?y+ystart:ystart+rows.length-1-y;
                    const allowed=rows[y][x]==='F'?[IRONBARS]:rows[y][x]==='\\'?[THRONE]:[ROOM,STAIRS,ALTAR];
                    if(rows[y][x]==='.'&&morgues.some(([lx,ly,hx,hy])=>x>=lx&&x<=hx&&y>=ly&&y<=hy))allowed.push(GRAVE);
                    if(!allowed.includes(g.level.at(px,py)?.typ))n++;
                }
                misses=Math.min(misses,n);
            }
            assert.equal(misses,0);
        }
    });

test('quest selection union/subtraction exclude shop floors and each random trap consumes one selected coordinate',async()=>{
    const g=resetGame();initRng(19);enableRngLog();g.level=new GameMap();g.moves=1;
    g.u={ux:1,uy:1,uz:{dnum:0,dlevel:10},ulevel:10};g.dungeons=[{name:'The Quest',num_dunlevs:6,depth_start:10}];
    for(let x=10;x<=20;x++)for(let y=4;y<=8;y++)g.level.at(x,y).typ=ROOM;
    const state={area:{lx:0,ly:0,hx:79,hy:20},map:new Set(),variables:new Map(),levregions:[]};
    const operations=parseQuestLua(`local valid=selection.area(10,4,20,8):filter_mapchar('.')
        valid=valid-(selection.area(10,4,12,8)+selection.area(18,4,20,8))
        for i=1,9 do des.trap(valid:rndcoord(1)) end`);
    await __mklevTestHooks.questFillerOperations(operations.slice(0,2),state);
    for(let i=0;i<9;i++) {
        const offset=getRngLog().length;
        await __mklevTestHooks.questFillerOperations(operations[2][5],state);
        assert.deepEqual(getRngLog().slice(offset,offset+2).map(e=>e.split('=')[0]),[`rn2(${25-i})`,'rnd(25)']);
    }
    assert.equal(g.level.traps.length,9);
    assert.ok(g.level.traps.every(t=>t.tx>=13&&t.tx<=17&&t.ty>=4&&t.ty<=8));
    assert.equal(new Set(g.level.traps.map(t=>`${t.tx},${t.ty}`)).size,9);
});

test('quest role initialization preserves canonical species and supplies each role leader, guardian and nemesis overrides',()=>{
    const original=MONS.find(row=>row.name==='Master of Thieves');const before={...original};
    for(const [role,names] of Object.entries(QUEST_ROLE_MONSTERS)) {
        const g=resetGame();g._startup_role=role;g.u={ualign:{type:1},ualignbase:[-1,-1]};
        for(const [index,name] of names.entries()) {
            const data=__mklevTestHooks.questMonsterData(MONS.find(row=>row.name===name));
            if(index<2) {assert.equal(data.alwaysPeaceful,true);assert.equal(data.maligntyp,-3);}
            if(index===0) {assert.equal(data.msound,'leader');assert.ok(data.m3&M3_CLOSE);}
            if(index===2) {assert.equal(data.nemesis,true);assert.equal(data.alwaysPeaceful,false);assert.equal(data.alwaysHostile,true);assert.ok(data.m3&M3_WAITFORU);assert.equal(data.m3&M3_CLOSE,0);}
        }
    }
    assert.deepEqual(original,before);
});
