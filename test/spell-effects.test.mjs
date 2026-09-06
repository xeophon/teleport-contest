import test from 'node:test';
import assert from 'node:assert/strict';

import { game, resetGame } from '../js/gstate.js';
import { enableRngLog, getRngLog, initRng, rn2 } from '../js/rng.js';
import { ROOM } from '../js/const.js';
import {
    castSpellDirectionalEffect,
    castSpellNodirEffect,
    spellCastNeedsDirection,
} from '../js/spell.js';

// Mirror of cmd.js:exerciseAttribute() RNG shape on a fresh hero
// (abs(_aexe) < 50, so the rn2(19)/rn2(2) roll always happens).
function makeDeps(overrides = {}) {
    const calls = {
        exercise: [], healHero: [], tame: [], identify: [], resists: [],
        markDetected: [], clairvoyance: [], foodDetect: null,
    };
    const deps = {
        spellRoleSkillLevel: () => 2, // P_BASIC: pseudo stays unblessed
        exerciseAttribute: (attr, inc) => {
            calls.exercise.push([attr, inc]);
            if (inc) rn2(19);
            else rn2(2);
        },
        healHero: (...args) => { calls.healHero.push(args); return ''; },
        say: () => true,
        waiting: () => false,
        damageHero: () => ({}),
        stopHeroOccupation: () => {},
        maybeHalfPhysicalDamage: x => x,
        heroHasAntimagic: () => false,
        heroHasSleepResistance: () => false,
        heroIsStunned: () => false,
        heroIsConfused: () => false,
        heroIsHallucinating: () => false,
        heroIsBlind: () => false,
        movementDirection: ch => ({
            l: { dx: 1, dy: 0 }, h: { dx: -1, dy: 0 },
            j: { dx: 0, dy: 1 }, k: { dx: 0, dy: -1 },
        })[ch] || null,
        syncHeroSpeedState: () => {},
        visibleMonsterForScroll: () => true,
        monsterResistsEffect: (mon, alev) => {
            calls.resists.push(alev);
            rn2(Math.max(1, 100 + alev - 1)); // C resist() roll; never resists
            return false;
        },
        monsterResistsSleepEffect: () => false,
        monsterResistsMagm: () => false,
        monsterReflectionSource: () => null,
        monsterTheName: (mon, cap) => `${cap ? 'The' : 'the'} ${mon?.data?.name || 'monster'}`,
        monsterPossessiveName: mon => `the ${mon?.data?.name || 'monster'}'s`,
        recordMonsterReflectionDiscovery: () => {},
        clearMonsterTrack: () => {},
        wakeupMonster: () => {},
        abuseDog: () => {},
        sleptMonster: () => {},
        killMonsterFromHeroProjectileHit: (mon, msgs) => { mon.mhp = -1; mon.dead = true; msgs.push(`You kill the ${mon.data.name}!`); },
        directMeleeNonlethalWakeupTail: mon => { mon.msleeping = 0; },
        monsterHurtle: () => {},
        spellDoorlock: () => '',
        floorStatueAt: () => null,
        activateStatueTrap: async () => '',
        breakStatueObject: () => false,
        statueStrikeBreakResult: () => ({ message: '' }),
        releaseHeroHold: () => {},
        heroIsPunished: () => false,
        unpunishHero: () => {},
        openHeroHoldingTrap: () => false,
        closeHeroHoldingTrap: () => false,
        openHeroFallingTrap: () => false,
        openMonsterHoldingTrap: () => false,
        closeMonsterHoldingTrap: () => false,
        boxlockInventory: lock => [lock ? 'Klunk!' : 'Klick!'],
        unturnDeadHeroInventory: async () => [],
        addHeroStun: () => {},
        heroWearsHardHelmet: () => false,
        dropRockAt: () => {},
        zapDigDownwardResult: async () => ({ message: 'You dig a hole.', more: false }),
        polymorphSelfZapResult: () => ({ message: '' }),
        polymorphSpellDirection: async () => false,
        stoneToFleshInventoryEffect: async () => ({ messages: [] }),
        stoneToFleshFloorEffect: async () => ({ messages: [] }),
        heroHasDrainResistance: () => false,
        heroIsKnightWithQuestArtifact: () => false,
        loseExperienceLevel: () => {},
        cancelMonster: () => {},
        cancelHeroSelf: () => {},
        monsterIsUndead: mon => !!mon?.data?.undead,
        monsterIsRider: () => false,
        lightScrollLitroom: (on, item, msgs) => msgs.push('A lit field surrounds you!'),
        collectDetectedObjects: () => ({ here: [], remote: [] }),
        markDetectedObjects: entries => calls.markDetected.push(entries),
        isGoldObject: () => false,
        foodDetectionScrollEffect: item => {
            calls.foodDetect = item;
            return { message: 'Your nose tingles and you smell food.', more: false };
        },
        removeCurseFeelingMessage: () => 'You feel like someone is helping you.',
        removeCurseActiveTarget: item => !!(item.worn || item.wielded),
        normalizeUncursedWaterPotion: () => {},
        costlyUncurseWater: () => '',
        refreshInventoryLineAfterBucChange: () => {},
        breakBuriedBallChain: () => false,
        tameMonsterWithScroll: (mon, pseudo) => { calls.tame.push([mon, pseudo]); return 1; },
        addHeroConfusion: () => {},
        clearHeroConfusion: () => {},
        addHeroStatusSuffix: () => {},
        heroIsSick: () => false,
        heroIsVomiting: () => false,
        clearHeroSickness: () => {},
        clearHeroVomiting: () => {},
        heroIsSlimed: () => false,
        clearHeroSlime: () => {},
        unfixableTroubleCount: () => 0,
        heroBlockedInvisByMummyWrapping: () => false,
        mummyWrappingName: () => 'mummy wrapping',
        heroBlocksInvis: () => false,
        rolePetTypeName: () => 'kitten',
        rndmonstAdj: () => null,
        heroBlocksClairvoyance: () => false,
        clairvoyanceMapEffect: blessed => calls.clairvoyance.push(blessed),
        heroProtectionAtmosphere: () => 'air',
        magicMappingSpellEffect: () => ({ messages: ['A map coalesces in your mind!'] }),
        unidentifiedInventoryItems: () => (game.inventory || []).filter(i => !i.identified),
        identifyInventoryItem: item => { item.identified = true; calls.identify.push(item); },
    };
    Object.assign(deps, overrides);
    deps.calls = calls;
    return deps;
}

function installGame(seed = 1, { ulevel = 1 } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = {};
    g.inventory = [];
    g.context = {};
    g.moves = 1;
    g.u = {
        ux: 5, uy: 5, uhp: 20, uhpmax: 30, uen: 50, uenmax: 50,
        ulevel, uac: 10, uhunger: 900, uluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        abase: { a: [10, 10, 10, 10, 10, 10] },
        amax: { a: [18, 18, 18, 18, 18, 18] },
    };
    g.level = {
        monsters: [], objects: [], traps: [], flags: {},
        at: () => ({ typ: ROOM, flags: 0, doormask: 0, wall_info: 0 }),
    };
    return g;
}

function rngTrace() {
    return [...getRngLog()];
}

function lichen(x, y, extra = {}) {
    return { mx: x, my: y, mhp: 10, mhpmax: 10, data: { name: 'lichen', ac: 10, mmove: 1 }, ...extra };
}

test('spell direction classification matches C objects.h oc_dir', () => {
    for (const name of ['healing', 'extra healing', 'force bolt', 'knock', 'slow monster',
        'wizard lock', 'turn undead', 'polymorph', 'teleport away', 'cancellation',
        'stone to flesh', 'dig', 'magic missile', 'sleep'])
        assert.equal(spellCastNeedsDirection({ name }), true, name);
    for (const name of ['light', 'detect monsters', 'detect unseen', 'detect food',
        'detect treasure', 'remove curse', 'identify', 'charm monster', 'confuse monster',
        'create monster', 'haste self', 'levitation', 'restore ability', 'invisibility',
        'cure blindness', 'cure sickness', 'create familiar', 'clairvoyance', 'protection',
        'magic mapping', 'jumping'])
        assert.equal(spellCastNeedsDirection({ name }), false, name);
});

test('healing self-cast heals d(6,4) with C zapyourself RNG order', async () => {
    installGame(7);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellDirectionalEffect({ name: 'healing' }, '.', deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['d(6,4)']);
    assert.equal(deps.calls.healHero.length, 1);
    assert.equal(deps.calls.healHero[0][0] >= 6, true);
    assert.deepEqual(deps.calls.healHero[0][2], { cureBlind: false });
    assert.deepEqual(result.messages, ['You feel better.']);
});

test('extra healing self-cast uses d(6,8) and much-better message', async () => {
    installGame(7);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellDirectionalEffect({ name: 'extra healing' }, '.', deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['d(6,8)']);
    assert.deepEqual(deps.calls.healHero[0][2], { cureBlind: true });
    assert.deepEqual(result.messages, ['You feel much better.']);
});

test('skilled healing self-cast keeps d(6,4) but widens the blind cure', async () => {
    installGame(7);
    const deps = makeDeps({ spellRoleSkillLevel: () => 3 }); // P_SKILLED
    enableRngLog({ reset: true });
    await castSpellDirectionalEffect({ name: 'healing' }, '.', deps);
    // C: blessed pseudo still rolls d(6,4); only extra healing rolls d(6,8).
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['d(6,4)']);
    assert.deepEqual(deps.calls.healHero[0][2], { cureBlind: true });
});

test('force bolt self-cast: bash message, d(2,12), A_STR exercise after damage', async () => {
    installGame(3);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellDirectionalEffect({ name: 'force bolt' }, '.', deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['d(2,12)', 'rn2(2)']);
    assert.deepEqual(result.messages, ['You bash yourself!']);
    assert.deepEqual(deps.calls.exercise, [[0, false]]); // A_STR, decrease
});

test('ESC at the direction prompt releases energy and zaps self like C getdir cancel', async () => {
    installGame(7);
    const deps = makeDeps();
    const result = await castSpellDirectionalEffect({ name: 'healing' }, '\x1b', deps);
    assert.equal(result.released, true);
    assert.equal(deps.calls.healHero.length, 1); // self-zap healing happened
    assert.deepEqual(result.messages, ['You feel better.']);
});

test('stunned hero direction is randomized through C confdir before weffects exercise', async () => {
    installGame(11);
    const deps = makeDeps({ heroIsStunned: () => true });
    enableRngLog({ reset: true });
    await castSpellDirectionalEffect({ name: 'force bolt' }, 'l', deps);
    const trace = rngTrace().map(e => e.split('=')[0]);
    // confdir rn2(8), then weffects exercise rn2(19), then bhit range rn1(8,6)
    assert.deepEqual(trace.slice(0, 3), ['rn2(8)', 'rn2(19)', 'rn2(8)']);
});

test('force bolt beam: weffects exercise, rn1(8,6) range, hit roll and damage', async () => {
    installGame(13);
    game.level.monsters = [lichen(6, 5)];
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellDirectionalEffect({ name: 'force bolt' }, 'l', deps);
    const trace = rngTrace().map(e => e.split('=')[0]);
    assert.deepEqual(trace.slice(0, 5), ['rn2(19)', 'rn2(8)', 'rnd(20)', 'd(2,12)', 'rn2(100)']);
    assert.ok(result.messages.some(m => m.startsWith('The spell hits the lichen')));
    assert.ok(deps.calls.resists.length >= 1);
    assert.equal(deps.calls.resists[0], 1); // C resist(): alev = u.ulevel for spells
});

test('magic missile ray: rn1(7,7) range, zap_hit, d(nd,6) damage', async () => {
    installGame(17, { ulevel: 1 });
    game.level.monsters = [lichen(6, 5)];
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellDirectionalEffect({ name: 'magic missile' }, 'l', deps);
    const trace = rngTrace().map(e => e.split('=')[0]);
    assert.deepEqual(trace.slice(0, 4), ['rn2(19)', 'rn2(7)', 'rn2(20)', 'd(1,6)']);
    assert.ok(result.messages.some(m => m.startsWith('The magic missile hits the lichen')));
});

test('sleep ray puts monster to sleep with d(nd,25) before the resist roll', async () => {
    installGame(19, { ulevel: 1 });
    const mon = lichen(6, 5, { mcanmove: true, mfrozen: 0 });
    game.level.monsters = [mon];
    const deps = makeDeps();
    enableRngLog({ reset: true });
    await castSpellDirectionalEffect({ name: 'sleep' }, 'l', deps);
    const trace = rngTrace().map(e => e.split('=')[0]);
    assert.deepEqual(trace.slice(0, 5), ['rn2(19)', 'rn2(7)', 'rn2(20)', 'd(1,25)', 'rn2(100)']);
    assert.equal(mon.mcanmove, false);
    assert.ok((mon.mfrozen || 0) > 0);
});

test('dig beam consumes rn1(18,8) digdepth like C zap_dig', async () => {
    installGame(23);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    await castSpellDirectionalEffect({ name: 'dig' }, 'l', deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)', 'rn2(18)']);
});

test('turn undead beam damages and flees undead monsters (rnd(8) then resist)', async () => {
    installGame(29);
    const mon = lichen(6, 5, { data: { name: 'kobold zombie', ac: 10, undead: true } });
    game.level.monsters = [mon];
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellDirectionalEffect({ name: 'turn undead' }, 'l', deps);
    const trace = rngTrace().map(e => e.split('=')[0]);
    assert.deepEqual(trace.slice(0, 5), ['rn2(19)', 'rn2(8)', 'rnd(8)', 'rn2(100)'].slice(0, 4));
    assert.equal(mon.mflee, 1);
    assert.ok(result.messages.includes('The kobold zombie turns to flee.'));
});

test('self turn undead shudders when hero is not undead', async () => {
    installGame(31);
    const deps = makeDeps();
    const result = await castSpellDirectionalEffect({ name: 'turn undead' }, '.', deps);
    assert.deepEqual(result.messages, ['You shudder in dread.']);
});

test('haste self: rn1(10,100) duration then A_DEX exercise, no seffects exercise', async () => {
    installGame(37);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'haste self' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(10)', 'rn2(19)']);
    assert.deepEqual(result.messages, ['You are suddenly moving much faster.']);
    assert.ok((game.u._veryfastTimeout || 0) >= 100);
});

test('levitation spell floats up with rn1(140,10) timeout', async () => {
    installGame(41);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'levitation' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(140)']);
    assert.deepEqual(result.messages, ['You start to float up.']);
    assert.equal(game.u.levitation, true);
    assert.ok((game.u._levitationTimeout || 0) >= 10);
});

test('skilled levitation uses the blessed rn1(50,250) duration', async () => {
    installGame(41);
    const deps = makeDeps({ spellRoleSkillLevel: () => 3 });
    enableRngLog({ reset: true });
    await castSpellNodirEffect({ name: 'levitation' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(50)']);
    assert.equal(game.u._levitationAtWill, 1);
});

test('invisibility spell: Gee message and d(6,100)+100 timeout when unskilled', async () => {
    installGame(43);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'invisibility' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['d(6,100)']);
    assert.deepEqual(result.messages, ['Gee!  All of a sudden, you can\'t see yourself.']);
    assert.equal(game.u.invisible, true);
    assert.ok((game.u._invisTimeout || 0) >= 100);
});

test('identify spell consumes seffects exercise before the cval rolls', async () => {
    installGame(47);
    game.inventory = [{ line: 'a - a scroll labeled FOO', identified: false }];
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'identify' }, deps);
    const trace = rngTrace().map(e => e.split('=')[0]);
    assert.deepEqual(trace.slice(0, 2), ['rn2(19)', 'rn2(5)']);
    assert.equal(deps.calls.identify.length, 1);
    assert.equal(game.inventory[0].identified, true);
    assert.ok((result.identifiedItems || []).length === 1);
});

test('identify spell with empty inventory says so', async () => {
    installGame(47);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'identify' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)']); // seffects exercise only
    assert.deepEqual(result.messages, ["You're not carrying anything to be identified."]);
});

test('remove curse spell un-curses only active equipment when unskilled', async () => {
    installGame(53);
    const worn = { kind: 'leather armor', worn: true, cursed: true };
    const loose = { kind: 'dagger', cursed: true };
    game.inventory = [worn, loose];
    const deps = makeDeps();
    const result = await castSpellNodirEffect({ name: 'remove curse' }, deps);
    assert.equal(worn.cursed, false);
    assert.equal(loose.cursed, true);
    assert.deepEqual(result.messages[0], 'You feel like someone is helping you.');
});

test('skilled remove curse acts like a blessed scroll and un-curses everything', async () => {
    installGame(53);
    const worn = { kind: 'leather armor', worn: true, cursed: true };
    const loose = { kind: 'dagger', cursed: true };
    game.inventory = [worn, loose];
    const deps = makeDeps({ spellRoleSkillLevel: () => 3 });
    await castSpellNodirEffect({ name: 'remove curse' }, deps);
    assert.equal(worn.cursed, false);
    assert.equal(loose.cursed, false);
});

test('detect monsters spell senses monsters and asks for the browse-more flow', async () => {
    installGame(59);
    game.level.monsters = [lichen(9, 5)];
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'detect monsters' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)']); // detect.c tail exercise
    assert.deepEqual(result.messages, ['You sense the presence of monsters.']);
    assert.equal(result.detectMonstersMore, true);
    assert.equal(game._detect_monsters_display, 1);
});

test('skilled detect monsters grants the rn1(40,21) detection timeout first', async () => {
    installGame(61);
    game.level.monsters = [lichen(9, 5)];
    const deps = makeDeps({ spellRoleSkillLevel: () => 3 });
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'detect monsters' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(40)', 'rn2(19)']);
    assert.ok((game.u._detectMonstersTimeout || 0) >= 21);
    // C: blessed detection is persistent — plain display, no browse_map flow.
    assert.equal(result.detectMonstersMore, undefined);
    assert.equal(result.more, true);
});

test('detect monsters with no monsters feels threatened without exercise', async () => {
    installGame(61);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'detect monsters' }, deps);
    assert.deepEqual(rngTrace(), []);
    assert.deepEqual(result.messages, ['You feel threatened.']);
});

test('detect treasure maps remote objects and exercises wisdom', async () => {
    installGame(67);
    const deps = makeDeps({
        collectDetectedObjects: () => ({ here: [], remote: [{ target: {}, x: 3, y: 3 }] }),
    });
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'detect treasure' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)']);
    assert.deepEqual(result.messages, ['You detect the presence of objects.']);
    assert.equal(deps.calls.markDetected.length, 1);
});

test('detect food spell routes through the shared scroll detection effect', async () => {
    installGame(71);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'detect food' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)']); // seffects exercise
    assert.deepEqual(deps.calls.foodDetect, { blessed: false, cursed: false });
    assert.deepEqual(result.messages, ['Your nose tingles and you smell food.']);
});

test('charm monster spell tames radius-1 monsters via the scroll taming path', async () => {
    installGame(73);
    const near = lichen(6, 5);
    const far = lichen(20, 5);
    game.level.monsters = [near, far];
    const deps = makeDeps();
    const result = await castSpellNodirEffect({ name: 'charm monster' }, deps);
    assert.equal(deps.calls.tame.length, 1);
    assert.deepEqual(deps.calls.tame[0][1], { blessed: false, cursed: false });
    assert.deepEqual(result.messages, ['The neighborhood is friendlier.']);
});

test('confuse monster spell starts the red glow with scroll-like RNG but spell increment', async () => {
    installGame(79);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'confuse monster' }, deps);
    // seffects exercise, then incr rnd(2)
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)', 'rnd(2)']);
    assert.deepEqual(result.messages, ['Your hands begin to glow red.']);
    assert.ok((game.u.umconf || 0) >= 1);
});

test('cure blindness routes through healup(0,0,FALSE,TRUE)', async () => {
    installGame(83);
    const deps = makeDeps();
    deps.healHero = (amount, extra, options) => {
        assert.deepEqual([amount, extra, options], [0, 0, { cureBlind: true }]);
        return 'You can see again.';
    };
    const result = await castSpellNodirEffect({ name: 'cure blindness' }, deps);
    assert.deepEqual(result.messages, ['You can see again.']);
});

test('cure sickness reports not-ill when nothing was wrong', async () => {
    installGame(89);
    const deps = makeDeps();
    const result = await castSpellNodirEffect({ name: 'cure sickness' }, deps);
    assert.deepEqual(result.messages, ['You are not ill.']);
});

test('protection spell grants C cast_protection gain with no RNG', async () => {
    installGame(97);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'protection' }, deps);
    assert.deepEqual(rngTrace(), []);
    assert.equal(game.u.uspellprot, 1);
    assert.equal(game.u.uac, 9);
    assert.deepEqual(result.messages, ['The air around you begins to shimmer with a golden haze.']);
});

test('clairvoyance maps the vicinity without a message', async () => {
    installGame(101);
    const deps = makeDeps();
    const result = await castSpellNodirEffect({ name: 'clairvoyance' }, deps);
    assert.deepEqual(deps.calls.clairvoyance, [false]);
    assert.deepEqual(result.messages, []);
});

test('light spell routes through the shared litroom effect', async () => {
    installGame(103);
    const deps = makeDeps();
    enableRngLog({ reset: true });
    const result = await castSpellNodirEffect({ name: 'light' }, deps);
    assert.deepEqual(rngTrace().map(e => e.split('=')[0]), ['rn2(19)']); // weffects exercise
    assert.deepEqual(result.messages, ['A lit field surrounds you!']);
});

test('jumping spell asks cmd.js to drive the jump cursor at C jump(max(skill,1))', async () => {
    installGame(107);
    const deps = makeDeps({ spellRoleSkillLevel: () => 1 });
    const result = await castSpellNodirEffect({ name: 'jumping' }, deps);
    assert.equal(result.startJump, 1);
});

test('unhandled spells fall back to the generic cast message', async () => {
    installGame(109);
    const deps = makeDeps();
    const result = await castSpellNodirEffect({ name: 'cause fear' }, deps);
    assert.equal(result.castFallback, true);
});
