import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { newgame, moveloop_core } from '../js/allmain.js';
import { initRng } from '../js/rng.js';
import { resetInputState, pushKeys } from '../js/input.js';
import { rhack, castKnownSpellByName } from '../js/cmd.js';
import { GameMap } from '../js/game.js';
import { vision_reset } from '../js/vision.js';
import { initializeSkills, useSkill, canAdvanceSkill, couldAdvanceSkill, peakedSkill,
    advanceSkill, addWeaponSkill, loseWeaponSkill, drainWeaponSkill, skillSlotsRequired,
    unrestrictWeaponSkill, objectWeaponSkill, skillName, spellSkillType, ROLE_SKILL_LIMITS, skillMenuEntries, skillAdvanceTip } from '../js/skills.js';
import { enableRngLog, getRngLog } from '../js/rng.js';
import { readFileSync } from 'node:fs';
import * as C from '../js/const.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';
import { P_BARE_HANDED_COMBAT, P_LONG_SWORD, P_RIDING, P_HEALING_SPELL,
    P_ATTACK_SPELL, P_ENCHANTMENT_SPELL, P_QUARTERSTAFF, P_WHIP, P_PICK_AXE,
    P_SLING, P_BASIC, P_UNSKILLED, P_EXPERT, P_GRAND_MASTER } from '../js/const.js';

async function startup(role) {
    resetGame(); resetInputState(); initRng(73);
    Object.assign(game,{moves:1,context:{},flags:{legacy:false,bones:false},preferred_pet:'n',
        _startup_role:role,_startup_race:'human',_startup_gender:'male',
        _startup_align:role==='Knight'?'lawful':'neutral',u:{},inventory:[]});
    await newgame();
}

for (const [role,expected] of [
    ['Knight',[[P_LONG_SWORD,P_BASIC,P_EXPERT],[P_RIDING,P_BASIC,P_EXPERT],[P_BARE_HANDED_COMBAT,P_UNSKILLED,P_EXPERT]]],
    ['Monk',[[P_BARE_HANDED_COMBAT,P_BASIC,P_GRAND_MASTER],[P_HEALING_SPELL,P_BASIC,P_EXPERT]]],
    ['Wizard',[[P_QUARTERSTAFF,P_BASIC,P_EXPERT],[P_ATTACK_SPELL,P_BASIC,P_EXPERT],[P_ENCHANTMENT_SPELL,P_BASIC,3]]],
    ['Archeologist',[[P_WHIP,P_BASIC,P_EXPERT],[P_PICK_AXE,P_BASIC,P_EXPERT],[P_SLING,P_UNSKILLED,3]]],
]) test(`${role} actual newgame initializes current skills, limits and accumulated practice`,async()=>{
    await startup(role);
    assert.equal(game.u.weapon_skills?.length,38);
    for(const [skill,level,max] of expected)
        assert.deepEqual(game.u.weapon_skills[skill],{skill:level,max_skill:max,advance:20*(level-1)**2});
    assert.equal(game.u.weapon_slots,0); assert.equal(game.u.skills_advanced,0);
});

function state(role='Wizard',inventory=[]) {
    resetGame(); initRng(41); enableRngLog();
    Object.assign(game,{_startup_role:role,urole:{name:{m:role}},u:{ulevel:1},context:{},flags:{},inventory});
    initializeSkills(role); return game.u;
}

for(const [tag,role] of Object.entries({A:'Archeologist',B:'Barbarian',C:'Caveman',H:'Healer',K:'Knight',
    Mon:'Monk',P:'Priest',R:'Rogue',Ran:'Ranger',S:'Samurai',T:'Tourist',V:'Valkyrie',W:'Wizard'}))
    test(`${role} maxima match every assigned entry in the original role table`,()=>{
        const source=readFileSync(new URL('../nethack-c/upstream/src/u_init.c',import.meta.url),'utf8');
        const body=source.match(new RegExp(`Skill_${tag}\\[\\] = \\{([\\s\\S]*?)\\n\\};`))[1];
        const expected=[...body.matchAll(/\{ (P_\w+), (P_\w+) \}/g)].map(m=>[C[m[1]],C[m[2]]]);
        assert.deepEqual(ROLE_SKILL_LIMITS[role],expected);
    });

test('carried ammunition cannot grant launcher skill, while darts and weapon-tools can train',()=>{
    state('Archeologist',[{cls:'gem',kind:'touchstone'},{cls:'weapon',kind:'arrow'},{cls:'weapon',kind:'crossbow bolt'},
        {cls:'weapon',kind:'dart'},{cls:'tool',kind:'pick-axe'},{cls:'tool',kind:'grappling hook'},{cls:'tool',kind:'tin opener'}]);
    const skills=game.u.weapon_skills;
    assert.equal(skills[C.P_SLING].skill,C.P_UNSKILLED); assert.equal(skills[C.P_BOW].skill,0);
    assert.equal(skills[C.P_CROSSBOW].skill,0); assert.equal(skills[C.P_DART].skill,C.P_BASIC);
    assert.equal(skills[C.P_PICK_AXE].skill,C.P_BASIC); assert.equal(skills[C.P_FLAIL].max_skill,C.P_BASIC);
    assert.equal(objectWeaponSkill({cls:'tool',kind:'tin opener'}),0);
});

test('pauper retains role potential but resets starting skills and gets two unused slots',()=>{
    state('Knight'); game.u.uroleplay={pauper:true};
    initializeSkills('Knight',[{cls:'weapon',kind:'long sword'}]);
    assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].skill,C.P_UNSKILLED);
    assert.equal(game.u.weapon_skills[C.P_LONG_SWORD].max_skill,C.P_EXPERT);
    assert.equal(game.u.weapon_skills[C.P_RIDING].advance,0); assert.equal(game.u.weapon_slots,2);
});

for(const [skill,phrase] of [[C.P_DAGGER,'weapon'],[C.P_ATTACK_SPELL,'spell casting'],[C.P_BARE_HANDED_COMBAT,'fighting']])
    test(`practice announces the first eligible ${phrase} threshold exactly once`,()=>{
        const u=state(); Object.assign(u.weapon_skills[skill],{skill:1,max_skill:4,advance:19}); u.weapon_slots=1;
        assert.equal(useSkill(skill,1),`You feel more confident in your ${phrase} skills.`);
        assert.equal(u.weapon_skills[skill].advance,20); assert.equal(useSkill(skill,1),'');
    });

test('practice remains accumulated and silent without slots, then level slots announce eligibility',()=>{
    const u=state(); useSkill(C.P_ATTACK_SPELL,60);
    assert.equal(u.weapon_skills[C.P_ATTACK_SPELL].advance,80);
    assert.equal(canAdvanceSkill(C.P_ATTACK_SPELL),false); assert.equal(couldAdvanceSkill(C.P_ATTACK_SPELL),true);
    assert.equal(addWeaponSkill(1),'You feel more confident in your skills.');
    assert.equal(addWeaponSkill(1),''); assert.equal(canAdvanceSkill(C.P_ATTACK_SPELL),true);
});

test('restricted and no-skill practice are inert; unsigned-short practice wraps as C does',()=>{
    const u=state(); assert.equal(useSkill(C.P_TWO_WEAPON_COMBAT,100),''); assert.equal(useSkill(C.P_NONE,10),'');
    assert.equal(u.weapon_skills[C.P_TWO_WEAPON_COMBAT].advance,0);
    u.weapon_skills[C.P_DAGGER].advance=65535; useSkill(C.P_DAGGER,2);
    assert.equal(u.weapon_skills[C.P_DAGGER].advance,1);
    unrestrictWeaponSkill(C.P_TWO_WEAPON_COMBAT);
    assert.deepEqual(u.weapon_skills[C.P_TWO_WEAPON_COMBAT],{skill:1,max_skill:2,advance:0});
});

for(const skill of [C.P_DAGGER,C.P_TWO_WEAPON_COMBAT,C.P_BARE_HANDED_COMBAT,C.P_ATTACK_SPELL,C.P_RIDING])
    test(`slot prices for ${skill} follow the C weapon versus spell/fighting formula`,()=>{
        const u=state(); for(let level=1;level<=5;level++) {
            u.weapon_skills[skill].skill=level;
            assert.equal(skillSlotsRequired(skill),skill<=C.P_LAST_WEAPON||skill===C.P_TWO_WEAPON_COMBAT?level:Math.trunc((level+1)/2));
        }
    });

test('wizard speedy advancement bypasses training and slots but never restriction, cap or sixty advances',()=>{
    const u=state(); game.flags.debug=true;
    assert.equal(canAdvanceSkill(C.P_DAGGER,true),true); assert.equal(canAdvanceSkill(C.P_TWO_WEAPON_COMBAT,true),false);
    u.weapon_skills[C.P_DAGGER].skill=C.P_EXPERT; assert.equal(canAdvanceSkill(C.P_DAGGER,true),false);
    u.skills_advanced=60; assert.equal(canAdvanceSkill(C.P_ATTACK_SPELL,true),false);
    u.skills_advanced=0; game.flags.debug=false; assert.equal(canAdvanceSkill(C.P_ATTACK_SPELL,true),false);
});

test('advancement uses accumulated practice and records exact reversible slot costs',()=>{
    const u=state(); u.weapon_slots=8; u.weapon_skills[C.P_DAGGER].advance=180;
    assert.match(advanceSkill(C.P_DAGGER),/more skilled/); assert.equal(u.weapon_slots,7);
    advanceSkill(C.P_DAGGER); assert.equal(u.weapon_slots,5);
    assert.match(advanceSkill(C.P_DAGGER),/most skilled/); assert.equal(u.weapon_slots,2);
    assert.equal(u.weapon_skills[C.P_DAGGER].advance,180); assert.deepEqual(u.skill_record,[1,1,1]);
    loseWeaponSkill(3); assert.equal(u.weapon_skills[C.P_DAGGER].skill,C.P_SKILLED);
    assert.equal(u.weapon_slots,2); assert.equal(u.skills_advanced,2); assert.equal(u.weapon_skills[C.P_DAGGER].advance,180);
});

test('skill drain chooses history entries and rerolls practice only above the new threshold',()=>{
    const u=state(); u.weapon_slots=5; u.weapon_skills[C.P_DAGGER].advance=180;
    advanceSkill(C.P_DAGGER); advanceSkill(C.P_DAGGER); advanceSkill(C.P_ATTACK_SPELL);
    u.weapon_skills[C.P_ATTACK_SPELL].advance=20;
    game.coreCtx.r=[7n,0n,2n]; game.coreCtx.n=3; enableRngLog();
    const messages=drainWeaponSkill(2);
    assert.deepEqual(messages,['You forget some of your training in dagger.','You forget some of your training in attack spells.']);
    assert.equal(u.weapon_skills[C.P_DAGGER].advance,27); assert.equal(u.weapon_skills[C.P_ATTACK_SPELL].advance,20);
    assert.equal(u.weapon_slots,4); assert.equal(u.skills_advanced,1);
    assert.deepEqual(getRngLog(),['rn2(3)=2','rn2(2)=0','rn2(60)=7']);
});

test('peaked marks maximum skill only after enough practice for a hypothetical next step',()=>{
    const u=state(); const record=u.weapon_skills[C.P_BARE_HANDED_COMBAT];
    record.skill=C.P_BASIC; record.advance=79;
    assert.equal(peakedSkill(C.P_BARE_HANDED_COMBAT),false); record.advance=80;
    assert.equal(peakedSkill(C.P_BARE_HANDED_COMBAT),true); assert.equal(couldAdvanceSkill(C.P_BARE_HANDED_COMBAT),false);
});

test('names distinguish martial roles and clerical spell category',()=>{
    state('Monk'); assert.equal(skillName(C.P_BARE_HANDED_COMBAT),'martial arts');
    assert.equal(spellSkillType('clerical'),C.P_CLERIC_SPELL); assert.equal(spellSkillType('matter spells'),C.P_MATTER_SPELL);
    state('Knight'); assert.equal(skillName(C.P_BARE_HANDED_COMBAT),'bare handed combat');
});

test('skill history, practice and remaining slots survive a save for later draining',()=>{
    const u=state(); u.weapon_slots=3; advanceSkill(C.P_DAGGER); useSkill(C.P_DAGGER,99);
    const snapshot=encodeSaveState(); restoreSaveState(snapshot);
    assert.equal(game.u.weapon_slots,2); assert.equal(game.u.weapon_skills[C.P_DAGGER].advance,99);
    assert.equal(game.u.skills_advanced,1); loseWeaponSkill(3); assert.equal(game.u.weapon_skills[C.P_DAGGER].skill,1);
});

test('normal enhance selects a practiced spell, spends one slot and reveals the next wizard books',async()=>{
    await startup('Wizard'); game.flags.debug=false; game.u.weapon_slots=1;
    assert.ok(!game._discoveries.some(item=>item.name==='spellbook of cone of cold'));
    game.u.weapon_skills[C.P_ATTACK_SPELL].advance=80;
    for(const key of '#enhance\n') await rhack(key);
    assert.ok(game._overlay_lines.some(row=>/Pick a skill to advance/.test(row[2])));
    await rhack('a'); assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].skill,C.P_SKILLED);
    assert.equal(game.u.weapon_slots,0); assert.equal(game.context.move,0);
    assert.match(game._pending_message,/more skilled in attack spells/);
    assert.ok(game._discoveries.some(item=>item.name==='spellbook of cone of cold'));
});

function casting(name,level,category,extra={}) {
    state(); resetInputState(); game.moves=100;
    Object.assign(game.u,{ux:10,uy:10,uz:{dnum:0,dlevel:1},uhp:100,uhpmax:100,uen:500,uenmax:500,
        uhunger:900,ulevel:30,uac:100,acurr:{a:[18,25,18,18,18,18]},...extra});
    game._known_spells=[{name,level,skill:category,knowledge:20000}];
    game._spell_success_chance_override=100;
    game.level=new GameMap();
    for(let x=1;x<79;x++)for(let y=0;y<21;y++)Object.assign(game.level.at(x,y),{typ:C.ROOM,lit:true});
    vision_reset(); game.viz_array=Array.from({length:21},()=>Array(80).fill(C.COULD_SEE|C.IN_SIGHT));
}

async function finishCasting() {
    for(let i=0;i<40&&(game._message_more||game._player_spell_continuation||game._command_mode);i++)
        await rhack(game._command_mode==='wizardDieConfirm'?'n':' ');
}

test('normal immediate spell awards its level only after the direction effect completes',async()=>{
    casting('healing',1,'healing',{uhp:10});
    await castKnownSpellByName('healing');
    assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,0);
    assert.equal(game._command_mode,'spellDirection');
    await rhack('.'); await finishCasting();
    assert.ok(game.u.uhp>10); assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,1);
    await rhack('i'); assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,1);
});

test('direct known nodir spell completes practice without an outer input command',async()=>{
    casting('cure blindness',2,'healing',{blind:true});
    await castKnownSpellByName('cure blindness'); await finishCasting();
    assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,2);
});

test('a cancelled controlled teleport still trains after its saved target prompt',async()=>{
    casting('teleport away',6,'escape',{teleportControl:true});
    game.coreCtx.r=[0n]; game.coreCtx.n=1; // successful rnd(100), then ordinary RNG
    await castKnownSpellByName('teleport away'); await rhack('.');
    assert.equal(game._command_mode,'teleportCursor');
    assert.equal(game.u.weapon_skills[C.P_ESCAPE_SPELL].advance,0);
    const saved=encodeSaveState(); restoreSaveState(saved);
    await rhack('\x1b'); await finishCasting();
    assert.equal(game.u.weapon_skills[C.P_ESCAPE_SPELL].advance,6);
});

for(const rescue of ['amulet','wizard'])test(`saved reflected ray trains once after ${rescue} revival and traversal`,async()=>{
    casting('magic missile',2,'attack',{uhp:1}); game.level.at(11,10).typ=C.STONE;
    game.flags.debug=rescue==='wizard';
    if(rescue==='amulet')game.inventory.push({letter:'a',cls:'amulet',kind:'amulet of life saving',worn:true,quan:1});
    await castKnownSpellByName('magic missile'); await rhack('l');
    assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].advance,20);
    assert.equal(game._player_spell_continuation.kind,'heroRay');
    const saved=encodeSaveState(); restoreSaveState(saved);
    await finishCasting();
    assert.ok(game.u.uhp>0); assert.equal(game._player_spell_continuation,null);
    assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].advance,22);
    assert.equal(game.context.move,1);
    await rhack('i'); assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].advance,22);
});

test('forced wizard casting and artifact storms never award normal spell practice',async()=>{
    casting('healing',1,'healing'); game.flags.debug=true;
    for(const key of '#wizcast\nk.')await rhack(key);
    await finishCasting(); assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].advance,20);
    casting('fireball',4,'attack');
    game.inventory=[{letter:'a',cls:'weapon',kind:'long sword',artifact:'Fire Brand',quan:1,age:0}];
    game._command_mode='invokeObject'; await rhack('a');
    assert.equal(game._command_mode,'spellExplosionTarget');
    assert.equal(game._casting_spell.force,true);
    await rhack('\x1b'); await finishCasting();
    assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].advance,20);
});

test('failed casting neither creates pending practice nor trains its discipline',async()=>{
    casting('healing',1,'healing',{_confusionTimeout:10});
    await castKnownSpellByName('healing'); await finishCasting();
    assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,0);
    assert.ok(!game._player_spell_practice);
});

test('a known spell completes practice within its actual movement-loop action',async()=>{
    casting('healing',1,'healing',{uhp:10,umovement:12}); const before=game.moves;
    pushKeys([... 'Za.']);
    for(;;) {
        try { await moveloop_core(); }
        catch(error) { if(error.message.includes('Input queue empty'))break; throw error; }
    }
    assert.equal(game.moves,before+1); assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,1,
        JSON.stringify({mode:game._command_mode,message:game._pending_message,practice:game._player_spell_practice,spell:game._casting_spell}));
    assert.ok(!game._player_spell_practice);
});

test('confidence is published after the spell effect, then its source tip is shown only once',async()=>{
    casting('healing',1,'healing',{uhp:10}); game.u.weapon_slots=1;
    game.u.weapon_skills[C.P_HEALING_SPELL].advance=19;
    await castKnownSpellByName('healing'); await rhack('.');
    assert.equal(game.u.weapon_skills[C.P_HEALING_SPELL].advance,20);
    assert.match(game._pending_message,/better/);
    const queued=[game._topline_after_more,game._queued_message_after_more,...(game._queued_messages_after_more||[]).map(message=>message.text)].filter(Boolean).join('  ');
    assert.match(queued,/confident/); assert.match(queued,/Tip: use the #enhance/);
    assert.equal(game.context.tips&1,1); assert.equal(skillAdvanceTip(),'');
});

test('disabled tips do not consume the once-only enhancement tip bit',()=>{
    state(); game.flags.tips=false; assert.equal(skillAdvanceTip(),''); assert.equal(game.context.tips||0,0);
    game.flags.tips=true; assert.match(skillAdvanceTip(),/^\(Tip:/); assert.equal(skillAdvanceTip(),'');
});

test('enhance separates unavailable slots from skills trained beyond their maximum',()=>{
    state(); game.u.weapon_skills[C.P_ATTACK_SPELL].advance=80;
    game.u.weapon_skills[C.P_BARE_HANDED_COMBAT].skill=C.P_BASIC;
    game.u.weapon_skills[C.P_BARE_HANDED_COMBAT].advance=80;
    let menu=skillMenuEntries(); assert.equal(menu.available,0);
    assert.match(menu.entries.find(row=>row.text.includes('"*"')).text,/when you're more experienced/);
    assert.ok(menu.entries.some(row=>/\*\s+attack spells/.test(row.text)));
    assert.ok(menu.entries.some(row=>/#\s+bare handed combat/.test(row.text)));
    game.u.ulevel=30; menu=skillMenuEntries();
    assert.match(menu.entries.find(row=>row.text.includes('"*"')).text,/if skill slots become available/);
});

test('saved wizard speedy enhancement spends negative slots and loops until cancelled',async()=>{
    await startup('Wizard'); game.flags.debug=true;
    for(const key of '#enhance\ny')await rhack(key);
    const skill=game._skill_menu.choices.a, before=game.u.weapon_skills[skill].skill;
    const price=skillSlotsRequired(skill); const saved=encodeSaveState(); restoreSaveState(saved);
    await rhack('a'); assert.equal(game.u.weapon_skills[skill].skill,before+1);
    assert.equal(game.u.weapon_slots,-price); assert.equal(game.u.skills_advanced,1);
    assert.equal(game.context.move,0); await rhack(' ');
    assert.equal(game._command_mode,'enhance'); await rhack('\x1b');
    assert.equal(game._command_mode,null); assert.equal(game.context.move,0);
});

test('published chain lightning completes its normal discipline practice',async()=>{
    casting('chain lightning',2,'attack');
    await castKnownSpellByName('chain lightning'); await finishCasting();
    assert.equal(game.u.weapon_skills[C.P_ATTACK_SPELL].advance,22);
});
