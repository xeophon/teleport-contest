import assert from 'node:assert/strict';
import test from 'node:test';
import { dressMonster } from '../js/worn.js';
import { __mklevTestHooks } from '../js/mklev.js';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import * as pm from '../js/permonst.js';
import { W_AMUL, W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMF, W_ARMU, W_WEP } from '../js/const.js';
import { initRng, enableRngLog, getRngLog, rn2 } from '../js/rng.js';

const gear = (kind, fields={}) => ({kind,cls:kind.startsWith('amulet')?'amulet':'armor',quan:1,...fields});
const monster = (name, inventory, fields={}) => ({data:pm.MONS.find(row=>row.name===name),minvent:inventory,...fields});

test('creation wearing chooses best AC including enchantment and erosion, retaining first tied item', () => {
    const armor=[gear('chain mail',{spe:2,oeroded:3}),gear('leather armor',{spe:3}),gear('ring mail',{spe:2})];
    const mon=monster('knight',armor); dressMonster(mon);
    assert.equal(armor[1].owornmask,W_ARM); assert.equal(armor[0].owornmask,undefined); assert.equal(armor[2].owornmask,undefined);
});

test('creation wearing keeps cursed armor and an existing life-saving amulet', () => {
    const armor=[gear('leather armor',{spe:-3,cursed:true,owornmask:W_ARM}),gear('plate mail',{spe:5}),
        gear('amulet of life saving',{owornmask:W_AMUL}),gear('amulet of reflection')];
    const mon=monster('knight',armor,{misc_worn_check:W_ARM|W_AMUL}); dressMonster(mon);
    assert.equal(armor[0].owornmask,W_ARM); assert.equal(armor[1].owornmask,undefined);
    assert.equal(armor[2].owornmask,W_AMUL); assert.equal(armor[3].owornmask,undefined);
});

test('speed boots preference applies only when permanent speed is not already fast', () => {
    for (const permspeed of [0,'fast',2]) {
        const armor=[gear('high boots',{spe:5}),gear('speed boots')];
        const mon=monster('knight',armor,{permspeed}); dressMonster(mon);
        assert.equal(armor[permspeed===0?1:0].owornmask,W_ARMF); assert.equal(mon.mspeed,permspeed||'fast');
    }
});

test('creation puts shirt on before suit but cannot insert a shirt under an existing suit', () => {
    for(const alreadyWorn of [false,true]) {
        const armor=[gear('T-shirt'),gear('chain mail',{owornmask:alreadyWorn?W_ARM:0})];
        const mon=monster('knight',armor,{misc_worn_check:alreadyWorn?W_ARM:0}); dressMonster(mon);
        assert.equal(armor[0].owornmask,alreadyWorn?undefined:W_ARMU); assert.equal(armor[1].owornmask,W_ARM);
    }
});

test('horned humanoids choose flimsy helmets and priests reject alignment-changing helmets', () => {
    const armor=[gear('helm of brilliance',{spe:7}),gear('elven leather helm')];
    dressMonster(monster('horned devil',armor)); assert.equal(armor[1].owornmask,W_ARMH); assert.equal(armor[0].owornmask,undefined);
    const priestArmor=[gear('helm of opposite alignment',{spe:7}),gear('helmet')];
    dressMonster(monster('aligned cleric',priestArmor,{ispriest:true})); assert.equal(priestArmor[1].owornmask,W_ARMH);
});

test('small-race exception allows hobbit elven armor and large humanoids only wear mummy cloaks', () => {
    const armor=[gear('plate mail',{spe:7}),gear('elven mithril-coat'),gear('robe')];
    dressMonster(monster('hobbit',armor)); assert.equal(armor[1].owornmask,W_ARM); assert.equal(armor[2].owornmask,W_ARMC);
    const cloaks=[gear('cloak of protection',{spe:7}),gear('mummy wrapping')];
    dressMonster(monster('hill giant',cloaks)); assert.equal(cloaks[1].owornmask,W_ARMC); assert.equal(cloaks[0].owornmask,undefined);
});

test('wielded two-handed swords and polearms block shields, carried weapons do not', () => {
    for(const kind of ['two-handed sword','quarterstaff','halberd','lucern hammer']) for(const wielded of [false,true]) {
        const weapon={kind,cls:'weapon',owornmask:wielded?W_WEP:0}; const shield=gear('shield of reflection');
        dressMonster(monster('knight',[weapon,shield],{mw:wielded?weapon:null}));
        assert.equal(shield.owornmask,wielded?undefined:W_ARMS);
    }
});

test('wearing propagates resistances, invisibility and wrapping blocks without random draws', () => {
    resetGame(); initRng(19); enableRngLog();
    const armor=[gear('red dragon scale mail'),gear('alchemy smock')]; const mon=monster('knight',armor); dressMonster(mon);
    assert.equal(mon.mextrinsics,pm.MR_FIRE|pm.MR_POISON|pm.MR_ACID);
    const invisible=monster('knight',[gear('cloak of invisibility')]); dressMonster(invisible); assert.equal(invisible.minvis,true);
    const wrapped=monster('knight',[gear('mummy wrapping')],{perminvis:true}); dressMonster(wrapped); assert.equal(wrapped.minvis,false);
    assert.deepEqual(getRngLog(),[]);
});

test('endgame armor constructor uses C proof/curse/bless and enchantment rolls without ordinary initialization', () => {
    const outcomes=new Set();
    for(let seed=1;seed<=100;seed++) {
        const g=resetGame(); Object.assign(g,{moves:100,level:new GameMap()}); initRng(seed); enableRngLog();
        const mon=monster('knight',[]); __mklevTestHooks.mplayerArmor(mon,'plate mail'); const obj=mon.minvent[0];
        const rolls=getRngLog(); let i=0;
        const take=(range,type='rn2')=>{ assert.ok(rolls[i].startsWith(`${type}(${range})=`),rolls[i]); return Number(rolls[i++].split('=')[1]); };
        take(2,'rnd'); // next_ident() is shared by all object constructors.
        const proof=take(3)===0,curse=take(3)===0,bless=take(3)===0;
        const spe=take(10)?(take(3)?take(5):take(4)+4):-take(3,'rnd');
        assert.equal(!!obj.oerodeproof,proof); assert.equal(!!obj.cursed,curse&&!bless); assert.equal(!!obj.blessed,bless);
        assert.equal(obj.spe,spe); assert.equal(i,rolls.length); outcomes.add(Math.sign(spe));
    }
    assert.deepEqual(outcomes,new Set([-1,0,1]));
});

test('monster offensive supplies use earth scroll only with a hard worn helmet or safe body', () => {
    let seed;
    for(seed=1;seed<1000;seed++) { initRng(seed); if(rn2(35)!==0&&rn2(13)===0) break; }
    for(const [name,helm,worn,expected] of [['knight','helmet',true,290],['knight','helmet',false,300],
        ['knight','elven leather helm',true,300],['xorn',null,false,290]]) {
        const mon=monster(name,helm?[gear(helm,{owornmask:worn?W_ARMH:0})]:[]);
        initRng(seed); const result=__mklevTestHooks.rnd_offensive_item(mon.data,mon);
        assert.equal(result,expected,`${name}/${helm}/${worn}`);
    }
});
