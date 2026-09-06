import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { newgame, moveloop_core, processMonsterTurns } from '../js/allmain.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { resetInputState } from '../js/input.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { vision_reset, vision_recalc } from '../js/vision.js';
import { ROOM, W_ARM, W_ARMC, W_RINGL } from '../js/const.js';

function setup() {
    resetGame(); resetInputState(); initRng(73);
    Object.assign(game, { moves: 100, context: {}, flags: { pickup: false }, inventory: [], level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10, uhp: 100, uhpmax: 100,
            uen: 50, uenmax: 50, uhunger: 900, uac: 10, umovement: 12, acurr: { a: [12,12,12,12,12,12] } } });
    for (let x=1; x<79; x++) for (let y=0; y<21; y++) Object.assign(game.level.at(x,y), { typ: ROOM, lit: true });
    vision_reset(); vision_recalc(); enableRngLog({ reset: true });
}

async function inputBoundary() {
    try { await moveloop_core(); }
    catch (error) { if (!error.message.includes('Input queue empty')) throw error; }
}

for (const [role, expected] of [['Archeologist',9], ['Knight',3], ['Monk',4], ['Wizard',9]]) {
    for (const legacy of [false,true]) test(`${role} startup derives internal AC from inventory with legacy=${legacy}`, async()=> {
        setup(); game.level=null; game.flags={legacy,bones:false}; game.preferred_pet='n';
        game._startup_role=role; game._startup_race='human'; game._startup_gender='male';
        game._startup_align=role==='Knight'?'lawful':'neutral';
        await newgame();
        assert.equal(game.u.uac,expected);
    });
}

for (const spe of [-120,2,120]) test(`real zero-time input recomputes changed carried sources: protection ${spe}`,async()=>{
    setup(); game.u.uac=80;
    game.inventory.push({cls:'ring',kind:'ring of protection',spe,owornmask:W_RINGL});
    await inputBoundary();
    assert.equal(game.u.uac,Math.max(-99,Math.min(99,10-spe)));
    assert.equal(game.moves,100); assert.deepEqual(getRngLog(),[]);
});

for (const mode of ['wearObject','wishText','inventory']) test(`nested ${mode} input does not perform a new find_ac`,async()=>{
    setup(); game.u.uac=80; game._command_mode=mode;
    await inputBoundary(); assert.equal(game.u.uac,80); assert.equal(game.moves,100);
});

test('More inside an unfinished command preserves its earlier armor-class phase',async()=>{
    setup(); game.u.uac=80; game._pending_message='You finish your dressing maneuver.'; game._message_more=1;
    await inputBoundary(); assert.equal(game.u.uac,80);
});

for (const command of ['W','P']) test(`${command} sets worn armor before delay but postpones find_ac until action time returns`,async()=>{
    setup(); const armor={id:1,letter:'a',cls:'armor',kind:'plate mail',spe:0,quan:1,known:false}; game.inventory.push(armor);
    await rhack(command); await rhack('a');
    assert.equal(armor.owornmask,W_ARM); assert.equal(game.u.uarm,armor);
    assert.equal(game.u.uac,10); assert.equal(armor.known,false);
    game._pending_message=''; game._pending_time_passed=1; await inputBoundary();
    assert.equal(game.u.uac,3); assert.equal(game.moves,105); assert.equal(armor.chargeKnown,true);
});

test('zero-delay armor removal postpones recalculation while its off message is still inside rhack',async()=>{
    setup(); const cloak={id:1,letter:'a',cls:'armor',kind:'cloak of protection',spe:0,quan:1,worn:true,owornmask:W_ARMC};
    game.inventory.push(cloak); game.u.uarmc=cloak; game.u.uac=7;
    await rhack('T');
    assert.equal(cloak.worn,false); assert.equal(game.u.uac,7);
    game._pending_time_passed=1; await inputBoundary(); assert.equal(game.u.uac,10);
});

for (const name of ['armor-dressing','armor-startup-monk']) test(`fresh C armor timing oracle: ${name}`,()=>{
    const path=fileURLToPath(new URL(`./fixtures/oracles/${name}.session.json`,import.meta.url));
    const fixture=JSON.parse(readFileSync(path,'utf8')); assert.ok(fixture.segments[0].steps.length>1);
    const child=spawnSync(process.execPath,['frozen/ps_test_runner.mjs',`--worker-session=${path}`],
        {cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8',maxBuffer:8*1024*1024});
    assert.equal(child.status,0,child.stderr);
    const result=JSON.parse(child.stdout.split('__RESULT_ONE__').at(-1));
    assert.equal(result.metrics.screens.matched,result.metrics.screens.total);
    assert.equal(result.metrics.rngCalls.matched,result.metrics.rngCalls.total);
    assert.equal(result.passed,true);
});

for (const saved of [false,true]) test(`dressing knowledge waits for the finishing message after ${saved?'saved':'live'} More`,async()=>{
    setup(); const armor={id:1,letter:'a',cls:'armor',kind:'plate mail',spe:0,quan:1,known:false}; game.inventory.push(armor);
    await rhack('W'); await rhack('a');
    game._armor_wear_occupation.turns=1; game.u.umovement=0;
    game._pending_message='An earlier message occupies the complete first line before your dressing ends.';
    await processMonsterTurns();
    assert.equal(game._message_more,1); assert.equal(armor.known,false);
    assert.match([game._queued_message_after_more,game._topline_after_more].join(' '),/finish your dressing maneuver/);
    if(saved) restoreSaveState(encodeSaveState());
    await rhack(' ');
    assert.equal(game.inventory[0].chargeKnown,true);
    assert.match(game._pending_message,/finish your dressing maneuver/);
});

for (const spe of [-3,2]) for (const saved of [false,true]) test(`polymorph AC waits for tool release with protection ${spe} and saved=${saved}`,async()=>{
    setup(); game.flags.debug=true;
    const tool={id:1,letter:'a',cls:'tool',kind:'expensive camera',quan:1,wielded:true,line:'a - an expensive camera (weapon in hand)'};
    const ring={id:2,letter:'b',cls:'ring',kind:'ring of protection',spe,worn:'left',owornmask:W_RINGL};
    game.inventory.push(tool,ring); game.u.uac=10-spe;
    await rhack('#'); for(const ch of 'polyself') await rhack(ch); await rhack('\n');
    for(const ch of 'red dragon') await rhack(ch.charCodeAt(0)); await rhack('\n');
    assert.match(game._pending_message,/drop your tool/); assert.equal(game._message_more,1);
    assert.equal(game.u.uac,10-spe); assert.equal(game.inventory.includes(tool),true);
    if(saved) restoreSaveState(encodeSaveState());
    await rhack(' ');
    assert.equal(game.u.uac,-1-spe); assert.equal(game.inventory.some(obj=>obj.id===1),false);
});

for(const kind of ['fumble boots','helm of telepathy']) test(`dressing learns ${kind} enchantment without discovering its shuffled type`,async()=>{
    setup(); const armor={id:1,letter:'a',cls:'armor',kind,actualKind:kind,appearance:kind==='fumble boots'?'combat boots':'visored helmet',spe:-4,quan:1,known:false};
    game.inventory.push(armor);await rhack('W');await rhack('a');
    game._pending_message='';game._pending_time_passed=1;await inputBoundary();
    assert.equal(armor.chargeKnown,true);assert.equal(armor.known,false);
    game._pending_message='';game._message_more=0;game._command_mode=null;await rhack('i');
    const screen=JSON.stringify(game._overlay_lines);
    assert.match(screen,/-4/);assert.ok(screen.includes(armor.appearance));assert.ok(!screen.includes(kind));
});
