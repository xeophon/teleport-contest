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
