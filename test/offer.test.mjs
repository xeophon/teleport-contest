import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import {
    ALTAR, AM_SHRINE, AM_SANCTUM, Align2amask, A_CHAOTIC, A_LAWFUL,
    A_NEUTRAL, A_NONE, ROOM,
} from '../js/const.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import {
    altarAlignAt, heroOnAltar, isHighAltarAt, offerAmulet, offerCorpse,
    sacrificeValue,
} from '../js/offer.js';

const CORPSE = 471;
const A_WIS = 2;

function testCell(typ = ROOM) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0 };
}

// Hero standing on an altar of `altarAlign` (use null for plain floor).
function installOfferState(seed = 1, {
    align = A_LAWFUL, altarAlign = A_LAWFUL, role = 'Knight', moves = 100,
    ulevel = 1, uluck = 0, ublesscnt = 0, ugangr = 0, record = 0,
    highaltar = false, shrine = false,
} = {}) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.flags = {};
    g.inventory = [];
    g._goldCount = 0;
    g.context = {};
    g.moves = moves;
    g._startup_role = role;
    g._startup_race = 'human';
    g.u = {
        ux: 1,
        uy: 1,
        ulevel,
        uluck,
        moreluck: 0,
        ublesscnt,
        ugangr,
        ualign: { type: align, record },
        acurr: { a: [10, 10, 10, 10, 10, 10] },
        uconduct: {},
    };
    const heroCell = testCell(altarAlign === null ? ROOM : ALTAR);
    if (altarAlign !== null) {
        heroCell.altarmask = Align2amask(altarAlign)
            | (highaltar ? AM_SANCTUM : 0) | (shrine ? AM_SHRINE : 0);
        heroCell.flags = heroCell.altarmask;
    }
    g.level = {
        flags: {},
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
        engravings: [],
        at: (x, y) => x === g.u.ux && y === g.u.uy ? heroCell : testCell(),
    };
    return g;
}

function corpseItem(name, { difficulty = 1, age = null, letter = 'a', extra = {} } = {}) {
    return {
        letter,
        cls: 'food',
        otyp: CORPSE,
        quan: 1,
        corpsenm: { name, difficulty },
        age: age ?? (game.moves || 1),
        ...extra,
    };
}

function addInventoryCorpse(name, options = {}) {
    const item = corpseItem(name, options);
    game.inventory.push(item);
    return item;
}

async function typeOffer() {
    await rhack('#');
    for (const ch of 'offer') await rhack(ch);
    await rhack('\n');
}

function pendingMessage() {
    return game._pending_message || '';
}

test('heroOnAltar and altar alignment helpers mirror C macros', () => {
    installOfferState(1, { altarAlign: A_CHAOTIC, highaltar: true });
    assert.equal(heroOnAltar(), true);
    assert.equal(altarAlignAt(1, 1), A_CHAOTIC);
    assert.equal(isHighAltarAt(1, 1), true);
    assert.equal(altarAlignAt(0, 0), A_NONE); // no altar off-square
    installOfferState(1, { altarAlign: null });
    assert.equal(heroOnAltar(), false);
});

test('sacrifice_value follows C difficulty+1 with 50-move freshness window', () => {
    installOfferState(1);
    game.moves = 100;
    assert.equal(sacrificeValue(corpseItem('warg', { difficulty: 8, age: 60 })), 9);
    assert.equal(sacrificeValue(corpseItem('warg', { difficulty: 8, age: 50 })), 9); // moves <= age+50
    assert.equal(sacrificeValue(corpseItem('warg', { difficulty: 8, age: 49 })), 0); // too old
    // acid blobs never go stale
    assert.equal(sacrificeValue(corpseItem('acid blob', { difficulty: 2, age: 1 })), 3);
    // partly eaten corpses scale by eaten_stat()
    assert.equal(sacrificeValue(corpseItem('warg', {
        difficulty: 8, age: 100, extra: { oeaten: 100, corpsenm: { name: 'warg', difficulty: 8, cnutrit: 200 } },
    })), 4);
});

test('#offer away from an altar keeps the stub message and costs no time', async () => {
    installOfferState(1, { altarAlign: null });
    addInventoryCorpse('lichen');
    await typeOffer();
    assert.equal(pendingMessage(), 'You are not on an altar.');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(game.inventory.length, 1);
    assert.equal(getRngLog().length, 0);
});

test('#offer while confused on an altar is too impaired', async () => {
    installOfferState(1);
    game.u._statusSuffix = ' Conf';
    addInventoryCorpse('lichen');
    await typeOffer();
    assert.equal(pendingMessage(), 'You are too impaired to perform the rite.');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(game.inventory.length, 1);
});

test('#offer on an altar with nothing suitable says so', async () => {
    installOfferState(1);
    await typeOffer();
    assert.equal(pendingMessage(), "You don't have anything to sacrifice.");
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
});

test('coaligned inventory corpse is consumed with clover feedback', async () => {
    installOfferState(7, { ulevel: 1 });
    addInventoryCorpse('warg', { difficulty: 8 });
    await typeOffer();
    assert.match(pendingMessage(), /What do you want to sacrifice\? \[a or \?\*\]/);
    assert.equal(game._command_mode, 'offerObject');
    await rhack('a');
    assert.equal(pendingMessage(),
        'Your sacrifice is consumed in a flash of light!  You glimpse a four-leaf clover at your feet.');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uluck, 1); // value 9 -> trunc(9*10/48)=1
    assert.equal(game.u.uconduct.gnostic, 1);
    // C order: consume_offering exercise(A_WIS) rn2(19); ulevel 1 skips bestow gate
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['rn2(19)']);
});

test('neutral and chaotic heroes get plume of smoke / burst of flame', async () => {
    for (const [align, text] of [
        [A_NEUTRAL, 'Your sacrifice is consumed in a plume of smoke!'],
        [A_CHAOTIC, 'Your sacrifice is consumed in a burst of flame!'],
    ]) {
        installOfferState(7, { align, altarAlign: align, ulevel: 1 });
        addInventoryCorpse('lichen', { difficulty: 1 });
        await typeOffer();
        await rhack('a');
        assert.equal(pendingMessage(), text); // value 2 -> no luck change, no clover
        assert.equal(game.context.move, 1);
    }
});

test('blind lawful hero only notices the sacrifice disappearing', async () => {
    installOfferState(7, { ulevel: 1 });
    game.u.blind = true;
    addInventoryCorpse('warg', { difficulty: 8 });
    await typeOffer();
    await rhack('a');
    assert.equal(pendingMessage(),
        'Your sacrifice disappears!  You think something brushed your foot.');
    assert.equal(game.u.uluck, 1);
});

test('hallucinating consume runs rn2(3) before the exercise roll', async () => {
    installOfferState(7, { ulevel: 1 });
    game.u.hallucinating = true;
    addInventoryCorpse('warg', { difficulty: 8 });
    await typeOffer();
    await rhack('a');
    const log = getRngLog().map(entry => entry.split('=')[0]);
    assert.deepEqual(log.slice(0, 2), ['rn2(3)', 'rn2(19)']);
    assert.match(pendingMessage(), /Your sacrifice (sprouts wings|puffs up|collapses into a cloud)/);
});

test('floor corpse prompt sacrifices directly from the ground', async () => {
    installOfferState(7, { ulevel: 1 });
    const floorCorpse = corpseItem('warg', { difficulty: 8 });
    floorCorpse.ox = 1;
    floorCorpse.oy = 1;
    game.level.objects.push(floorCorpse);
    await typeOffer();
    assert.equal(pendingMessage(), 'There is a warg corpse here; sacrifice it? [ynq] (n)');
    assert.equal(game._command_mode, 'offerFloorObject');
    await rhack('y');
    assert.match(pendingMessage(), /Your sacrifice is consumed in a flash of light!/);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.context.move, 1);
});

test('declining the floor corpse falls through to the inventory prompt', async () => {
    installOfferState(7, { ulevel: 1 });
    const floorCorpse = corpseItem('lichen', { difficulty: 1 });
    floorCorpse.ox = 1;
    floorCorpse.oy = 1;
    game.level.objects.push(floorCorpse);
    addInventoryCorpse('warg', { difficulty: 8 });
    await typeOffer();
    await rhack('n');
    assert.match(pendingMessage(), /What do you want to sacrifice\? \[a or \?\*\]/);
    assert.equal(game._command_mode, 'offerObject');
    await rhack('a');
    assert.match(pendingMessage(), /consumed in a flash of light/);
    assert.equal(game.level.objects.length, 1); // floor corpse untouched
});

test('declining the floor corpse with empty pack reports nothing else', async () => {
    installOfferState(7, { ulevel: 1 });
    const floorCorpse = corpseItem('lichen', { difficulty: 1 });
    floorCorpse.ox = 1;
    floorCorpse.oy = 1;
    game.level.objects.push(floorCorpse);
    await typeOffer();
    await rhack('n');
    assert.equal(pendingMessage(), "You don't have anything else to sacrifice.");
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
});

test('aborting the floor prompt with q uses no time', async () => {
    installOfferState(7, { ulevel: 1 });
    const floorCorpse = corpseItem('lichen', { difficulty: 1 });
    floorCorpse.ox = 1;
    floorCorpse.oy = 1;
    game.level.objects.push(floorCorpse);
    await typeOffer();
    await rhack('q');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(game.level.objects.length, 1);
});

test('non-corpse food cannot be sacrificed', async () => {
    installOfferState(7, { ulevel: 1 });
    game.inventory.push({ letter: 'a', cls: 'food', kind: 'food ration', quan: 1 });
    await typeOffer();
    await rhack('a');
    assert.equal(pendingMessage(), "You can't sacrifice that!");
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(game.inventory.length, 1);
    assert.equal(getRngLog().length, 0);
});

test('escape at the sacrifice prompt aborts silently', async () => {
    installOfferState(7, { ulevel: 1 });
    addInventoryCorpse('lichen');
    await typeOffer();
    await rhack('\x1b');
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(game.inventory.length, 1);
});

test('too-old corpse does nothing and is not consumed', async () => {
    installOfferState(7, { ulevel: 1 });
    game.moves = 500;
    addInventoryCorpse('warg', { difficulty: 8, age: 100 });
    await typeOffer();
    await rhack('a');
    assert.equal(pendingMessage(), 'Nothing happens.');
    assert.equal(game.inventory.length, 1);
    assert.equal(game.context.move, 1); // C returns ECMD_TIME
    assert.equal(getRngLog().length, 0); // value check precedes every roll
});

test('angry god is gradually mollified by valuable corpses', () => {
    installOfferState(7, { ugangr: 3, uluck: -2, ulevel: 1 });
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    // value 9, lawful: reduction trunc(9*3/24)=1
    assert.equal(game.u.ugangr, 2);
    assert.equal(game.u.uluck, -1); // change_luck(1) while still angry
    assert.deepEqual(result.messages, [
        'Your sacrifice is consumed in a flash of light!',
        'Lugh seems slightly mollified.',
    ]);
    assert.equal(result.consumed, true);
});

test('fully mollifying the god resets negative luck to zero', () => {
    installOfferState(7, { ugangr: 1, uluck: -3, ulevel: 1 });
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.ugangr, 0);
    assert.equal(game.u.uluck, 0);
    assert.deepEqual(result.messages, [
        'Your sacrifice is consumed in a flash of light!',
        'Lugh seems mollified.',
    ]);
});

test('cheap sacrifices do not appease an angry god', () => {
    installOfferState(7, { ugangr: 5, ulevel: 1 });
    const result = offerCorpse(corpseItem('newt', { difficulty: 1 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.ugangr, 5); // trunc(2*3/24)=0
    assert.deepEqual(result.messages, [
        'Your sacrifice is consumed in a flash of light!',
        'You have a feeling of inadequacy.',
    ]);
});

test('negative alignment record is partially absolved', () => {
    installOfferState(7, { record: -5, ulevel: 1 });
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.ualign.record, 0); // min(9, 24, 5) restored
    assert.deepEqual(result.messages, [
        'Your sacrifice is consumed in a flash of light!',
        'You feel partially absolved.',
    ]);
});

test('sacrifices burn down ublesscnt with C chaotic/lawful multipliers', () => {
    installOfferState(7, { ublesscnt: 200, uluck: -1, ulevel: 1 });
    let result = offerCorpse(corpseItem('wolf', { difficulty: 4 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.ublesscnt, 138); // value 5: trunc(5*300/24)=62
    assert.deepEqual(result.messages.at(-1), 'You have a hopeful feeling.');
    assert.equal(game.u.uluck, 0);

    installOfferState(7, { align: A_CHAOTIC, altarAlign: A_CHAOTIC, ublesscnt: 300, ulevel: 1 });
    result = offerCorpse(corpseItem('wolf', { difficulty: 4 }), { altaralign: A_CHAOTIC });
    assert.equal(game.u.ublesscnt, 196); // value 5: trunc(5*500/24)=104
});

test('emptying ublesscnt gives reconciliation and clears negative luck', () => {
    installOfferState(7, { ublesscnt: 100, uluck: -2, ulevel: 1 });
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.ublesscnt, 0); // trunc(9*300/24)=112 >= 100
    assert.equal(game.u.uluck, 0);
    assert.deepEqual(result.messages.at(-1), 'You have a feeling of reconciliation.');
});

test('level 3+ heroes pay C\'s bestow gate roll before luck gains', () => {
    // seed 1: rn2(6)=2 -> no gift; normal luck path with the gate roll logged
    installOfferState(1, { ulevel: 5, record: 4 });
    let result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['rn2(19)', 'rn2(6)']);
    assert.equal(game.u.uluck, 1);
    assert.equal(result.deferred.length, 0);

    // seed 2: rn2(6)=0 -> C would bestow an artifact (deferred slice); no luck gain
    installOfferState(2, { ulevel: 5, record: 4 });
    result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['rn2(19)', 'rn2(6)']);
    assert.equal(game.u.uluck, 0);
    assert.deepEqual(result.deferred, ['bestow_artifact']);
});

test('luck gains are capped by the sacrifice value', () => {
    installOfferState(7, { ulevel: 1, uluck: 0 });
    offerCorpse(corpseItem('lichen', { difficulty: 1 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.uluck, 0); // value 2: trunc(2*10/48)=0
    installOfferState(7, { ulevel: 1, uluck: 3 });
    const result = offerCorpse(corpseItem('lichen', { difficulty: 1 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.uluck, 3); // orig_luck 3 > value 2 -> no increase, no clover
    assert.equal(result.messages.length, 1);
});

test('undead corpses are worth +1 to non-chaotics only', () => {
    // difficulty 13: lawful value 15 -> +3 luck; chaotic value 14 -> +2 luck
    installOfferState(7, { ulevel: 1 });
    offerCorpse(corpseItem('giant zombie', { difficulty: 13 }), { altaralign: A_LAWFUL });
    assert.equal(game.u.uluck, 3);
    installOfferState(7, { align: A_CHAOTIC, altarAlign: A_CHAOTIC, ulevel: 1 });
    offerCorpse(corpseItem('giant zombie', { difficulty: 13 }), { altaralign: A_CHAOTIC });
    assert.equal(game.u.uluck, 2);
    // wraith keeps the bonus for chaotics who broke vegetarian conduct
    installOfferState(7, { align: A_CHAOTIC, altarAlign: A_CHAOTIC, ulevel: 1 });
    game.u.uconduct.unvegetarian = 1;
    offerCorpse(corpseItem('wraith', { difficulty: 13 }), { altaralign: A_CHAOTIC });
    assert.equal(game.u.uluck, 3);
});

test('sacrificing a unicorn of the altar\'s own alignment is an insult', () => {
    installOfferState(7, { ulevel: 1 });
    const result = offerCorpse(
        corpseItem('white unicorn', { difficulty: 6, extra: { corpsenm: { name: 'white unicorn', difficulty: 6, maligntyp: 4 } } }),
        { altaralign: A_LAWFUL },
    );
    assert.equal(result.messages[0], 'Such an action is an insult to law!');
    assert.equal(game.u.acurr.a[A_WIS], 9); // adjattrib(A_WIS, -1)
    assert.equal(result.consumed, false);
    assert.equal(game.u.ugangr, 1); // gods_upset on a coaligned altar
    assert.deepEqual(result.deferred, ['angrygods']);
    assert.equal(getRngLog().length, 0); // insult precedes consume_offering
});

test('sacrificing a cross-aligned unicorn on your own altar is very good', () => {
    installOfferState(7, { ulevel: 1, record: 0 });
    const result = offerCorpse(
        corpseItem('black unicorn', { extra: { corpsenm: { name: 'black unicorn', difficulty: 6, maligntyp: -4 } } }),
        { altaralign: A_LAWFUL },
    );
    assert.equal(game.u.ualign.record, 5); // adjalign(5)
    assert.equal(result.messages[0], 'You feel appropriately lawful.');
    assert.equal(result.messages[1], 'Your sacrifice is consumed in a flash of light!');
    assert.equal(game.u.uluck, 2); // value 7+3=10 -> trunc(10*10/48)=2
});

test('thoroughly aligned heroes get the right-path unicorn feedback', () => {
    installOfferState(7, { ulevel: 1, record: 15, moves: 100 }); // ALIGNLIM = 10
    const result = offerCorpse(
        corpseItem('black unicorn', { extra: { corpsenm: { name: 'black unicorn', difficulty: 6, maligntyp: -4 } } }),
        { altaralign: A_LAWFUL },
    );
    assert.equal(result.messages[0], 'You feel you are thoroughly on the right path.');
});

test('sacrificing your own unicorn to a hostile altar converts you', () => {
    installOfferState(7, { align: A_LAWFUL, record: 0, ulevel: 1 });
    const result = offerCorpse(
        corpseItem('white unicorn', { extra: { corpsenm: { name: 'white unicorn', difficulty: 6, maligntyp: 4 } } }),
        { altaralign: A_CHAOTIC },
    );
    assert.deepEqual(result.messages, [
        'You have a strong feeling that Lugh is angry...',
        'Your sacrifice is consumed in a flash of light!', // hero still lawful here
        'Manannan Mac Lir accepts your allegiance.',
        'You have a sudden sense of a new direction.',
    ]);
    assert.equal(game.u.ualign.type, A_CHAOTIC);
    assert.equal(game.u.ualign.record, 0);
    assert.equal(game.u.uluck, -3);
    assert.equal(game.u.ublesscnt, 300);
    assert.equal(result.consumed, true);
    // conversion branch: only the consume exercise roll
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['rn2(19)']);
});

test('sacrificing a former pet angers the god without consumption', () => {
    installOfferState(7, { record: 5, ulevel: 1 });
    const result = offerCorpse(
        corpseItem('kitten', { difficulty: 3, extra: { omonst: { mtame: 10 } } }),
        { altaralign: A_LAWFUL },
    );
    assert.deepEqual(result.messages, ['So this is how you repay loyalty?']);
    assert.equal(game.u.ualign.record, 2); // adjalign(-3)
    assert.equal(game.u.ugangr, 1); // gods_upset, coaligned
    assert.equal(result.consumed, false);
    assert.deepEqual(result.deferred, ['angrygods']);
    assert.equal(game.u.uconduct.gnostic, 1);
});

test('same-race sacrifice is detected and deferred (demon summoning slice)', () => {
    installOfferState(7, { ulevel: 1 });
    const result = offerCorpse(corpseItem('human', { difficulty: 3 }), { altaralign: A_LAWFUL });
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.deferred, ['sacrifice_your_race']);
    assert.equal(result.consumed, false);
    assert.equal(game.u.uconduct.gnostic, 1);
    assert.equal(getRngLog().length, 0);
});

test('cross-aligned sacrifice converts the altar on a lucky roll', () => {
    // seed 1: rn2(8+5)=11 > 5 -> conversion
    installOfferState(1, { ulevel: 5, record: 0 });
    const cell = game.level.at(1, 1);
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_NEUTRAL });
    assert.deepEqual(result.messages, [
        'Your sacrifice is consumed in a flash of light!',
        'You sense a conflict between Lugh and Brigit.',
        'You feel the power of Lugh increase.',
        'The altar glows white.',
    ]);
    assert.equal(cell.altarmask, Align2amask(A_LAWFUL));
    assert.equal(cell.flags, Align2amask(A_LAWFUL));
    assert.equal(game.u.uluck, 1);
    assert.equal(result.newsym, true);
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]),
        ['rn2(19)', 'rn2(13)', 'rn2(19)', 'rnl(5)']);
});

test('failed cross-aligned sacrifice weakens your god instead', () => {
    // seed 3: rn2(8+5)=1 <= 5 -> failure
    installOfferState(3, { ulevel: 5, record: 0 });
    const cell = game.level.at(1, 1);
    const oldMask = cell.altarmask;
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_NEUTRAL });
    assert.deepEqual(result.messages, [
        'Your sacrifice is consumed in a flash of light!',
        'You sense a conflict between Lugh and Brigit.',
        'Unluckily, you feel the power of Lugh decrease.',
    ]);
    assert.equal(cell.altarmask, oldMask);
    assert.equal(game.u.uluck, -1);
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]),
        ['rn2(19)', 'rn2(13)', 'rn2(2)', 'rnl(5)']);
});

test('shrine altars keep their shrine bit when converted', () => {
    installOfferState(1, { ulevel: 5, record: 0, shrine: true, altarAlign: A_NEUTRAL });
    const cell = game.level.at(1, 1);
    offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_NEUTRAL });
    assert.equal(cell.altarmask, Align2amask(A_LAWFUL) | AM_SHRINE);
});

test('angry god plus prior conversion rejects the sacrifice', () => {
    installOfferState(7, {
        align: A_CHAOTIC, record: -1, ulevel: 1, uluck: 0,
    });
    game.u._ualignbase_current = A_CHAOTIC;
    game.u._ualignbase_original = A_LAWFUL;
    const result = offerCorpse(corpseItem('warg', { difficulty: 8 }), { altaralign: A_LAWFUL });
    assert.equal(result.messages[0], 'Lugh rejects your sacrifice!');
    assert.match(result.messages[1], /^The voice of Lugh (booms out|thunders|rings out|booms): "Suffer, infidel!"$/);
    assert.equal(game.u.ugangr, 3);
    assert.equal(game.u.ualign.record, -6); // adjalign(-5)
    assert.equal(game.u.uluck, -5);
    assert.equal(game.u.acurr.a[A_WIS], 8); // adjattrib(A_WIS, -2)
    assert.equal(result.consumed, false);
    assert.deepEqual(result.deferred, ['angrygods']);
    assert.deepEqual(getRngLog().map(entry => entry.split('=')[0]), ['rn2(4)']);
});

test('negative-valued offering on a cross-aligned high altar desecrates it', () => {
    installOfferState(7, { ulevel: 1, highaltar: true, altarAlign: A_CHAOTIC });
    const result = offerCorpse(
        corpseItem('black unicorn', { extra: { corpsenm: { name: 'black unicorn', difficulty: 6, maligntyp: -4 } } }),
        { highaltar: true, altaralign: A_CHAOTIC },
    );
    // unicorn of the altar's alignment -> insult -> desecrate path
    assert.equal(result.messages[0], 'Such an action is an insult to chaos!');
    assert.equal(result.messages[1], 'You feel the air around you grow charged...');
    assert.equal(result.messages[2], 'Suddenly, you realize that Manannan Mac Lir has noticed you...');
    assert.match(result.messages[3], /^The voice of Manannan Mac Lir .*: "So, mortal!  You dare desecrate my High Temple!"$/);
    assert.deepEqual(result.deferred, ['god_zaps_you']);
});

test('offering the Amulet too soon only gives feedback', () => {
    installOfferState(7, { ulevel: 1 });
    const amulet = { letter: 'a', cls: 'amulet', kind: 'amulet of yendor', realAmuletOfYendor: true, quan: 1 };
    const result = offerAmulet(amulet, { highaltar: false, altaralign: A_LAWFUL });
    assert.deepEqual(result.messages, ['You feel an urge to return to the surface.']);
    assert.equal(result.consumed, false);
    assert.equal(result.timeUsed, true);
    // cross-aligned altar: ashamed
    installOfferState(7, { ulevel: 1 });
    const other = offerAmulet({ ...amulet }, { highaltar: false, altaralign: A_CHAOTIC });
    assert.deepEqual(other.messages, ['You feel ashamed.']);
});

test('fake amulet first offer teaches the mistake and costs 1 luck', () => {
    installOfferState(7, { ulevel: 1, uluck: 2 });
    const fake = { letter: 'a', cls: 'amulet', kind: 'cheap plastic imitation of the amulet of yendor', quan: 1 };
    const result = offerAmulet(fake, { highaltar: true, altaralign: A_LAWFUL });
    assert.deepEqual(result.messages, [
        'You hear a nearby thunderclap.',
        'You realize you have made a mistake.',
    ]);
    assert.equal(fake.known, true);
    assert.equal(game.u.uluck, 1);
    assert.equal(result.consumed, false);
});

test('amulet offering through the command flow uses a turn and keeps the amulet', async () => {
    installOfferState(7, { ulevel: 1 });
    game.inventory.push({ letter: 'a', cls: 'amulet', kind: 'amulet of yendor', realAmuletOfYendor: true, quan: 1 });
    await typeOffer();
    await rhack('a');
    assert.equal(pendingMessage(), 'You feel an urge to return to the surface.');
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 1);
});
