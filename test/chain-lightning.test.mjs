import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { rhack, castKnownSpellByName, monsterResistsElectricity } from '../js/cmd.js';
import { resumeChainLightning } from '../js/chain_lightning.js';
import { spellDamageBonus } from '../js/spell.js';
import { monsterByRndName } from '../js/mklev.js';
import { ROOM, STONE, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP,
    DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, COULD_SEE, IN_SIGHT, W_ARM, W_RINGL } from '../js/const.js';
import { initRng, enableRngLog, getRngLog, enableDisplayRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { startTimer, TIMER_OBJECT, ROT_ORGANIC } from '../js/timeout.js';
import { moveloop_core } from '../js/allmain.js';
import { pushKeys, resetInputState } from '../js/input.js';

function setup() {
    resetGame(); initRng(41); enableRngLog(); enableDisplayRngLog(false);
    Object.assign(game, { moves: 10, flags: { debug: true }, context: {}, inventory: [],
        _startup_role: 'Wizard', nhDisplay: { cols: 800 }, level: new GameMap(),
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 100, uhpmax: 100, uen: 100, uenmax: 100, uhunger: 900,
            ualign: { type: 0, record: 0 }, acurr: { a: [10, 10, 10, 10, 10, 10] } } });
    for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
    vision_reset();
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
}

function monster(name = 'wolf', props = {}) {
    const data = monsterByRndName(name);
    const mon = { data, m_id: 100 + game.level.monsters.length, mx: 11, my: 10,
        m_lev: data.mlevel, mhp: 200, mhpmax: 200, mcanmove: true, mcansee: true,
        minvent: [], ...props };
    game.level.monsters.push(mon); return mon;
}

async function cast() {
    // Force casting still executes the ordinary spelleffects entry and its
    // pseudo-object/exercise, without a failure roll obscuring the zap tests.
    for (const ch of '#wizcast\n|t') await rhack(ch);
}

function rolls(values) {
    game.coreCtx.r = [...values, ...Array(1000).fill(1)].map(BigInt).reverse();
    game.coreCtx.n = game.coreCtx.r.length; enableRngLog();
}

function queueDeps(events = []) {
    return { heroIsBlind: () => false, heroIsHallucinating: () => false,
        monsterResistsElectricity, spellDamageBonus,
        monsterElectricInventoryDamage: (mon, state) => { events.push(['items', mon.m_id, state.original]); return true; },
        heroIsKnightWithQuestArtifact: () => false,
        monsterResistsEffect: mon => { events.push(['hit', mon.m_id]); return false; },
        visibleMonsterForScroll: () => true,
        chainMonsterName: mon => `the ${mon.data.name}`,
        chainWakeup: mon => { mon.msleeping = 0; },
        say: message => { events.push(['message', message]); return true; },
        waiting: () => false };
}

async function settle() {
    for (let i = 0; i < 80 && (game._player_spell_continuation || game._message_more || game._queued_messages_after_more?.length); i++)
        await rhack(game._command_mode === 'wizardDieConfirm' ? 'n' : ' ');
    assert.equal(game._player_spell_continuation ?? null, null,
        JSON.stringify({mode:game._command_mode,more:game._message_more,topline:game._topline_after_more,
            message:game._pending_message,queue:game._queued_messages_after_more,phase:game._player_spell_continuation?.state?.phase}));
}

function saveRestore() {
    const saved = encodeSaveState(); const { coreCtx, displayCtx, rng } = game;
    resetGame(); restoreSaveState(saved); Object.assign(game, { coreCtx, displayCtx, rng });
}

test('chain lightning reaches hostile monsters without direction or hit rolls', async () => {
    setup(); const mon = monster(); await cast();
    assert.ok(mon.mhp < 200); assert.equal(game.u.uen, 99);
    assert.match(game._pending_message, /You shock the wolf/);
    assert.ok(!getRngLog().some(line => /^rn2\(20\)|^rnd\(10\)/.test(line)));
});

test('swallowed chain lightning consumes its Hallu display draw before doing nothing', async () => {
    setup(); const mon = monster('purple worm'); game.u.uswallow = 1; game.u.ustuck = mon;
    game.u.hallucinating = true; enableDisplayRngLog();
    await cast(); assert.equal(mon.mhp, 200); assert.equal(game.u.uen, 100);
    assert.equal(getRngLog().filter(line => line.startsWith('~drn2(6)')).length, 1);
    assert.ok(!getRngLog().some(line => /^d\(2,6\)/.test(line)));
    assert.doesNotMatch(game._pending_message || '', /You cast chain lightning/);
    enableDisplayRngLog(false);
});

test('peaceful creatures block a corridor and are never woken or charged for', async () => {
    setup(); for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
        game.level.at(x, y).typ = y === 10 ? ROOM : STONE;
    const peaceful = monster('wolf', { mpeaceful: true, msleeping: 1 });
    const behind = monster('wolf', { mx: 12 }); await cast();
    assert.equal(peaceful.mhp, 200); assert.equal(peaceful.msleeping, 1);
    assert.equal(behind.mhp, 200); assert.equal(game.u.uen, 100);
    assert.doesNotMatch(game._pending_message || '', /You cast chain lightning/);
});

for (const [typ, mask, reaches] of [[ROOM, 0, true], [POOL, 0, true], [MOAT, 0, true],
    [LAVAPOOL, 0, true], [DRAWBRIDGE_UP, 0, true], [WATER, 0, false],
    [LAVAWALL, 0, false], [STONE, 0, false], [DOOR, D_ISOPEN, true],
    [DOOR, D_CLOSED, false], [DOOR, D_LOCKED, false]])
    test(`chain terrain ${typ}/${mask} ${reaches ? 'conducts' : 'grounds'} the zap`, async () => {
        setup(); const mon = monster(); Object.assign(game.level.at(11, 10), { typ, doormask: mask });
        await cast(); assert.equal(mon.mhp < 200, reaches);
        assert.equal(game.u.uen, reaches ? 99 : 100);
    });

for (const [name, item, immune] of [['blue dragon', null, true], ['baby blue dragon', null, true],
    ['wolf', { kind: 'blue dragon scales', cls: 'armor', owornmask: W_ARM }, true],
    ['wolf', { kind: 'blue dragon scales', cls: 'armor' }, false],
    ['wolf', { kind: 'ring of shock resistance', cls: 'ring', owornmask: W_RINGL }, true]])
    test(`${name} electrical resistance observes worn equipment ${JSON.stringify(item)}`, async () => {
        setup(); const mon = monster(name); if (item) mon.minvent.push(item);
        await cast(); assert.equal(mon.mhp === 200, immune);
        assert.equal(game.u.uen, immune ? 100 : 99);
        assert.match(game._pending_message, immune ? /resists/ : /You shock/);
    });

test('chain wakeup reveals hiders and stops eating without angering peaceful witnesses', async () => {
    setup(); const mon = monster('wolf', { msleeping: 1, mundetected: 1, meating: 9 });
    const witness = monster('gnome', { mx: 13, mpeaceful: true });
    await cast(); assert.equal(mon.msleeping, 0); assert.equal(mon.mundetected, 0);
    assert.equal(mon.meating, 0); assert.equal(witness.mpeaceful, true);
});

test('chaining still propagates without taking energy below zero', async () => {
    setup(); game.u.uen = 0; const first = monster(); const second = monster('wolf', { mx: 14 });
    await cast(); assert.ok(first.mhp < 200); assert.ok(second.mhp < 200); assert.equal(game.u.uen, 0);
});

test('queue visits W,NW,N,NE,E,SE,S,SW once before any next-wave target', async () => {
    setup(); const coords = [[9,10],[9,9],[10,9],[11,9],[11,10],[11,11],[10,11],[9,11],[8,10]];
    const mons = coords.map(([mx,my]) => monster('wolf', { mx, my }));
    const events = [], state = {}; rolls(Array(100).fill(1));
    await resumeChainLightning(state, queueDeps(events));
    assert.deepEqual(events.filter(event => event[0] === 'hit').map(event => event[1]), mons.map(mon => mon.m_id));
    assert.equal(new Set(state.queue.map(zap => `${zap.x},${zap.y}`)).size, state.queue.length);
    assert.equal(game.u.uen, 91);
});

test('100 queued squares cap a dense field, including power charges after the cap', async () => {
    setup(); for (let x=1; x<79; x++) for (let y=0; y<21; y++) if (x!==10 || y!==10)
        monster('wolf', { mx:x, my:y });
    const state = {}, events = []; rolls(Array(1000).fill(1));
    await resumeChainLightning(state, queueDeps(events));
    assert.equal(state.queue.length, 100); assert.equal(state.head, 100);
    assert.equal(events.filter(event => event[0]==='hit').length, 100);
    assert.equal(game.u.uen, 0);
});

test('a monster three diagonal steps away is reachable through zero-strength side branches', async () => {
    setup(); monster('wolf', { mx: 11, my: 10 });
    const side = monster('wolf', { mx: 13, my: 11 });
    const state = {}; rolls(Array(100).fill(1)); await resumeChainLightning(state, queueDeps());
    assert.ok(side.mhp < 200);
    assert.equal(state.queue.find(zap => zap.x===13 && zap.y===11).strength, 3);
});

test('empty space can reach distance two but cannot appear as a zero-strength last square', async () => {
    setup(); const state = {}; await resumeChainLightning(state, queueDeps());
    assert.equal(state.queue.length, 16);
    assert.deepEqual(state.queue.map(zap=>zap.strength), [...Array(8).fill(2),...Array(8).fill(1)]);
    assert.equal(game.u.uen, 100); assert.deepEqual(getRngLog(), []);
});

test('one worm can be hit at multiple occupied squares, with fresh target lookup per queue pop', async () => {
    setup(); const mon = monster('long worm', { wormSegments: [{x:10,y:9},{x:9,y:10}] });
    const events=[]; rolls(Array(100).fill(1)); await resumeChainLightning({}, queueDeps(events));
    assert.equal(events.filter(event=>event[0]==='hit').length,3); assert.equal(mon.mhp,188);
    assert.equal(game.u.uen,97);
});

for (const [intelligence, level, bonus] of [[9,10,-3],[13,10,0],[18,4,0],[18,5,1],[24,14,2],[25,13,2],[25,14,3]])
    test(`2d6 spell bonus at INT${intelligence}/level${level} precedes all inventory rolls`, async () => {
        setup(); game.u.acurr.a[1]=intelligence; game.u.ulevel=level;
        const mon=monster(), events=[]; rolls([3,3,0,4]);
        await resumeChainLightning({},queueDeps(events));
        assert.equal(mon.mhp,200-(8+bonus)); assert.deepEqual(events[0],['items',mon.m_id,8+bonus]);
        assert.deepEqual(getRngLog(),['d(2,6)=8','rn2(3)=0']);
    });

test('zhitm floors half damage after Knight bonus and inventory damage, without hit or blindness rolls', async () => {
    setup(); const mon=monster(), D=queueDeps();
    D.heroIsKnightWithQuestArtifact=()=>true;
    D.monsterElectricInventoryDamage=(_mon,state)=>{state.damage=2; return true;};
    D.monsterResistsEffect=()=>true; rolls([0,1,0]);
    await resumeChainLightning({},D); assert.equal(mon.mhp,195);
    setup(); const odd=monster(); const half=queueDeps(); half.monsterResistsEffect=()=>true;
    rolls([0,1,1]); await resumeChainLightning({},half); assert.equal(odd.mhp,199);
    assert.equal(odd.mblinded,undefined);
});

test('an immune target still rolls its 2d6 and inventory gate, with no MR or power charge', async () => {
    setup(); const mon=monster('blue dragon'), events=[]; rolls([2,4,0]);
    await resumeChainLightning({},queueDeps(events));
    assert.equal(mon.mhp,200); assert.equal(game.u.uen,100);
    assert.deepEqual(events.filter(e=>e[0]==='items'),[['items',mon.m_id,8]]);
    assert.equal(events.filter(e=>e[0]==='hit').length,0);
    assert.deepEqual(getRngLog(),['d(2,6)=8','rn2(3)=0']);
});

for (const matching of [false,true]) test(`unseen target mapping uses ${matching?'matching':'stale'} bhitpos instead of current square`, async () => {
    setup(); const mon=monster(); game.bhitpos=matching?{x:11,y:10}:{x:2,y:2};
    const D=queueDeps(); D.visibleMonsterForScroll=()=>false; rolls([1,1,1]);
    await resumeChainLightning({},D);
    assert.equal(game.notonhead,!matching); assert.equal(!!game.level.at(11,10).map_invisible,matching);
});

test('live electrical wand destruction rolls damage before quantity and cancels the consumed timer', async () => {
    setup(); const mon=monster(); const wand={id:77,cls:'wand',kind:'wand of digging',wandIndex:16,quan:1,where:3};
    mon.minvent.push(wand); startTimer(100,TIMER_OBJECT,ROT_ORGANIC,wand);
    rolls([1,1,3,3,0,4,6,0,99]); await cast();
    assert.equal(mon.mhp,185); assert.equal(mon.minvent.length,0); assert.equal(wand.timed,0);
    assert.equal(game.timers.length,0); assert.match(game._pending_message,/wand.*breaks apart and explodes/);
    assert.deepEqual(getRngLog().slice(2),['d(2,6)=8','rn2(3)=0','rn2(5)=4','rnd(10)=7','rn2(3)=0','rn2(105)=99']);
});

test('charged monster rings retain the upstream recharge TODO without quantity rolls', async () => {
    setup(); const mon=monster(); const ring={cls:'ring',kind:'ring of protection',quan:1,spe:2};
    mon.minvent.push(ring); rolls([1,1,3,3,0,4,1,99]); await cast();
    assert.equal(ring.spe,2); assert.ok(mon.minvent.includes(ring)); assert.equal(mon.mhp,192);
    assert.deepEqual(getRngLog().slice(2),['d(2,6)=8','rn2(3)=0','rn2(5)=4','rn2(3)=1','rn2(105)=99']);
});

test('item destruction More retains the item and RNG position across save/restore', async () => {
    setup(); game.nhDisplay.cols=55; monster('wolf',{mx:9}); const mon=monster();
    const wand={id:77,cls:'wand',kind:'wand of digging',quan:1,where:3}; mon.minvent.push(wand);
    rolls([1,1,1,1,1,99,3,3,0,4,6,0,99]); await cast();
    assert.ok(game._player_spell_continuation); assert.ok(mon.minvent.includes(wand));
    assert.equal(mon.mhp,200); const n=getRngLog().length;
    saveRestore(); await settle(); const restored=game.level.monsters.find(m=>m.m_id===mon.m_id);
    assert.equal(restored.minvent.length,0); assert.equal(restored.mhp,185);
    assert.equal(getRngLog().length,n+1); assert.equal(game.u.uen,98);
});

test('monster life saving completes before saved chain propagation and does not stop its stored strength', async () => {
    setup(); game.nhDisplay.cols=60; const mon=monster('wolf',{mhp:1});
    mon.minvent.push({kind:'amulet of life saving',cls:'amulet',amuletIndex:1,worn:true});
    const next=monster('wolf',{mx:14}); rolls([1,1,3,3,1,99]); await cast();
    assert.ok(game._player_spell_continuation); saveRestore(); await settle();
    const revived=game.level.monsters.find(m=>m.m_id===mon.m_id);
    assert.ok(revived.mhp>0); assert.equal(revived.dead,false); assert.equal(revived.minvent.length,0);
    assert.ok(game.level.monsters.find(m=>m.m_id===next.m_id).mhp<200); assert.equal(game.u.uen,98);
    assert.equal(game.u.uconduct.killer,1);
});

for (const save of [false,true]) test(`gas spore death suspends chain before hero life saving${save?' across a save':''}`, async () => {
    setup(); game.u.uhp=1; game.u.uhpmax=50; game.nhDisplay.cols=70;
    const spore=monster('gas spore',{mx:9,mhp:1}); const next=monster('wolf',{mx:12});
    game.inventory.push({id:99,kind:'amulet of life saving',cls:'amulet',amuletIndex:1,worn:true,invlet:'a'});
    rolls([1,1,3,3,1,99]); await cast();
    assert.ok(game._player_spell_continuation); assert.equal(next.mhp,200);
    if(save) saveRestore(); await settle();
    assert.ok(!game.level.monsters.some(mon=>mon.m_id===spore.m_id));
    assert.ok(game.level.monsters.find(mon=>mon.m_id===next.m_id).mhp<200);
    assert.ok(game.u.uhp>0); assert.ok(!game.inventory.some(obj=>obj.id===99));
    assert.equal(game.u.uen,98); assert.equal(game.u.uconduct.killer,1);
});

test('gas spore wizard death refusal resumes the original chain without repeating its killing hit', async () => {
    setup(); game.u.uhp=1; game.nhDisplay.cols=70;
    monster('gas spore',{mx:9,mhp:1}); const next=monster('wolf',{mx:12});
    rolls([1,1,3,3,1,99]); await cast(); await settle();
    assert.ok(game.u.uhp>0); assert.ok(next.mhp<200); assert.equal(game.u.uconduct.killer,1);
    assert.equal(getRngLog().filter(line=>line.startsWith('d(2,6)')).length,2);
});

test('canonical magical resistance halves a surviving target after the electrical inventory gate', async () => {
    setup(); const mon=monster('gnomish wizard'); rolls([1,1,3,3,1,0]);
    await cast(); assert.equal(mon.mhp,196);
    assert.deepEqual(getRngLog().slice(2),['d(2,6)=8','rn2(3)=1','rn2(107)=0']);
});

for (const metallic of [false,true]) test(`monster ring destruction checks the hero's ${metallic?'metal':'leather'} gloves`, async () => {
    setup(); const mon=monster();
    const ring={cls:'ring',kind:'ring of regeneration',quan:1,owornmask:W_RINGL}; mon.minvent.push(ring);
    game.inventory.push({cls:'armor',kind:metallic?'gauntlets of power':'leather gloves',worn:true});
    rolls([1,1,3,3,0,4,0,99]); await cast();
    assert.equal(mon.minvent.includes(ring),!metallic);
    assert.equal(getRngLog().filter(line=>line.startsWith('rn2(3)')).length,metallic?2:1);
});

test('artifacts, lightning wands, shock rings and an in-use last item are excluded before selection', async () => {
    setup(); const mon=monster();
    const items=[{cls:'wand',kind:'wand of digging',artifact:'an artifact'},
        {cls:'wand',kind:'wand of lightning',wandIndex:24},{cls:'ring',kind:'ring of shock resistance'},
        {cls:'wand',kind:'wand of digging',in_use:true,quan:1}];
    mon.minvent.push(...items); rolls([1,1,3,3,0,4,99]); await cast();
    assert.deepEqual(mon.minvent,items); assert.equal(mon.mhp,192);
    assert.deepEqual(getRngLog().slice(2),['d(2,6)=8','rn2(3)=0','rn2(5)=4','rn2(105)=99']);
});

test('ordinary known chain lightning spends spell energy before its per-monster charges', async () => {
    setup(); game._known_spells=[{name:'chain lightning',level:2,skill:'attack',knowledge:20000}];
    game._spell_success_chance_override=100; game.u.acurr.a[1]=25; game.u.ulevel=30;
    const mon=monster(); rolls(Array(100).fill(0));
    assert.equal(await castKnownSpellByName('chain lightning'),true); await settle();
    assert.ok(mon.mhp<200); assert.equal(game.u.uen,89); assert.equal(game.context.move,1);
    assert.equal(game._command_mode,null); assert.ok(!game._overlay_lines);
});

test('the live movement loop completes a forced chain cast as one hero action', async () => {
    setup(); delete game.nhDisplay; game.u.umovement=12; resetInputState();
    const mon=monster('wolf',{movement:0,msleeping:1,mfrozen:100,mcanmove:false});
    const moves=game.moves; pushKeys([... '#wizcast\n|t']);
    for (;;) {
        try { await moveloop_core(); }
        catch (error) { if (error.message.includes('Input queue empty')) break; throw error; }
    }
    assert.ok(mon.mhp<200); assert.equal(game.u.uen,99); assert.equal(game.moves,moves+1);
    assert.equal(game._command_mode,null);
});
