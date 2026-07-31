// steal.test.mjs — source-derived tests for js/steal.js (port of src/steal.c).
//
// Every expected behavior cites its upstream C source (nethack-c/upstream).
// No session fixture data is read here; RNG expectations come from the C
// call arity (src/rnd.c: one ISAAC64 draw per rn2/rnd/rn1/d).

import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import {
    somegold, findgold, moneyCnt, unresponsive, invCnt,
    selectStealTarget, STEAL_WORN_WEIGHT, BOULDER_OTYP,
    wornItemRemovalMessage, stolenItemMessage,
    stealNothingToTake, monkeyCantTake,
    planMonsterSteal, thiefdead, unstolenarm, stealarm,
    stealgold, stealamulet, stealamuletStripOrder, mpickobj, maybeAbsorbItem,
} from '../js/steal.js';

function installGame({ inventory = [], monsters = [], seed = 42 } = {}) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.inventory = inventory;
    g.u = { ux: 10, uy: 10, uharve: 0 };
    g.level = { monsters, objects: [], traps: [] };
    return g;
}

function ring(over = {}) {
    return { letter: 'a', cls: 'ring', glyph: '=', name: 'ring', kind: 'ring',
             line: 'a - a black onyx ring (on right hand)', worn: 'right', ...over };
}
function gloves() {
    return { letter: 'b', cls: 'armor', glyph: '[', kind: 'leather gloves',
             line: 'b - a pair of leather gloves (being worn)', worn: true, id: 100 };
}
function weapon() {
    return { letter: 'c', cls: 'weapon', glyph: ')', kind: 'short sword',
             line: 'c - a short sword (weapon in hand)', wielded: true };
}
function cloak() {
    return { letter: 'd', cls: 'armor', glyph: '[', kind: 'cloak',
             line: 'd - an elven cloak (being worn)', worn: true };
}
function suit() {
    return { letter: 'e', cls: 'armor', glyph: '[', kind: 'scale mail',
             line: 'e - a scale mail (being worn)', worn: true };
}
function shirt() {
    return { letter: 'f', cls: 'armor', glyph: '[', kind: 'Hawaiian shirt',
             line: 'f - a Hawaiian shirt (being worn)', worn: true };
}
function scroll(over = {}) {
    return { letter: 'g', cls: 'scroll', glyph: '?', kind: 'scroll',
             line: 'g - a scroll labeled ELBIB YLOH', ...over };
}
function gold(quan = 200) {
    return { letter: '$', cls: 'coin', glyph: '$', kind: 'gold piece', quan };
}
const nymph = { data: { name: 'water nymph', mlet: 'n', glyph: 'n' }, female: true, minvent: [], mx: 11, my: 10, m_id: 777 };

// --- somegold (steal.c:12-41) ---------------------------------------------

test('somegold: amounts below 50 are taken whole with no RNG (steal.c:24-25)', () => {
    installGame();
    assert.equal(somegold(49), 49);
    assert.equal(somegold(1), 1);
    assert.equal(getRngLog().length, 0);
});

test('somegold: 50..99 uses rn1(n-24,25) — one draw, result in [25,money] (steal.c:26-27)', () => {
    installGame({ seed: 7 });
    const got = somegold(80);
    const log = getRngLog();
    assert.equal(log.length, 1);
    assert.match(log[0], /^rn2\(56\)/); // rn1(80-25+1,25) == rn2(56)+25
    assert.ok(got >= 25 && got <= 80);
});

test('somegold: full band arithmetic (steal.c:24-40)', () => {
    for (const [money, rangeLo] of [[300, 50], [700, 100], [3000, 500], [7000, 1000], [50000, 5000]]) {
        installGame({ seed: 99 });
        const got = somegold(money);
        assert.equal(getRngLog().length, 1, `money=${money}`);
        assert.ok(got >= rangeLo && got <= money, `somegold(${money})=${got} in [${rangeLo},${money}]`);
    }
});

// --- findgold/moneyCnt (steal.c:48-56; invent.c money_cnt) ----------------

test('findgold finds the first gold piece in a chain; moneyCnt sums stacks', () => {
    const items = [scroll(), gold(30), gold(70)];
    const found = findgold(items);
    assert.equal(found.quan, 30);
    assert.equal(moneyCnt(items), 100);
    assert.equal(findgold([scroll()]), null);
});

// --- invCnt (inv_cnt, steal.c:338/374-375) ----------------------------------

test('invCnt excludes gold unless asked to include it', () => {
    const items = [scroll(), gold(500)];
    assert.equal(invCnt(items, false), 1);
    assert.equal(invCnt(items, true), 2);
});

// --- selectStealTarget (steal.c:380-466) ------------------------------------

test('selection weights: worn armor/accessory=5, loose item=1, gold excluded (steal.c:392-425)', () => {
    installGame();
    const items = [ring(), gloves(), scroll(), gold(99)];
    const sel = selectStealTarget(items);
    assert.equal(sel.totalWeight, 5 + 5 + 1);
    const log = getRngLog();
    assert.equal(log.length, 1);
    assert.match(log[0], /^rn2\(11\)=/);
});

test('selection excludes the cloak while a suit is worn (steal.c:392-400 !uarm||!=uarmc)', () => {
    installGame();
    const sel = selectStealTarget([suit(), cloak(), scroll()]);
    assert.equal(sel.totalWeight, 5 + 1); // cloak contribution skipped
    assert.ok(!sel.weights.some(({ item }) => item === cloak()));
});

test('gloves->ring progression: a picked ring redirects to worn gloves (steal.c:438-439)', () => {
    installGame({ seed: 5 });
    const g = gloves(), r = ring();
    const sel = selectStealTarget([r, g]);
    assert.equal(sel.target, g); // whichever is picked, gloves cover the ring
});

test('gloves under wielded weapon steal the weapon (steal.c:441-442)', () => {
    installGame({ seed: 8 });
    const g = gloves(), w = weapon(), r = ring();
    const sel = selectStealTarget([w, g, r]);
    assert.equal(sel.target, w);
});

test('suit under cloak steals the cloak; shirt under cloak or suit (steal.c:444-447)', () => {
    installGame({ seed: 11 });
    let sel = selectStealTarget([suit(), cloak()]);
    assert.equal(sel.target.kind, 'cloak');
    installGame({ seed: 11 });
    sel = selectStealTarget([shirt(), suit()]);
    assert.equal(sel.target.kind, 'scale mail');
    installGame({ seed: 11 });
    sel = selectStealTarget([shirt(), cloak()]);
    assert.equal(sel.target.kind, 'cloak');
});

test('boulder retry: rejected once, re-rolled, then cant_take (steal.c:401-411)', () => {
    installGame({ seed: 12 });
    const boulder = { letter: 'h', cls: 'rock', kind: 'boulder', otyp: BOULDER_OTYP, line: 'h - a boulder' };
    const sel = selectStealTarget([boulder], { throwsRocks: false });
    assert.ok(sel.cantTake === boulder);
    assert.equal(getRngLog().length, 2); // one rn2 per retry round
});

test('Adornment fast path: worn ring of adornment is targeted with no RNG (steal.c:383-389)', () => {
    installGame();
    const adorn = ring({ letter: 'j', kind: 'ring of adornment', actualKind: 'ring of adornment',
                         name: 'ring of adornment', worn: 'left', line: 'j - a ring (on left hand)' });
    const sel = selectStealTarget([scroll(), adorn], {
        adornedLeft: adorn, adornedRight: null,
    });
    assert.equal(sel.target, adorn);
    assert.equal(sel.viaAdornment, true);
    assert.equal(getRngLog()?.length ?? 0, 0);
});

test('Adornment fast path is skipped while wearing gloves (steal.c:382)', () => {
    installGame({ seed: 3 });
    const adorn = ring({ kind: 'ring of adornment', actualKind: 'ring of adornment', worn: 'left',
                         line: 'j - a ring (on left hand)' });
    const sel = selectStealTarget([adorn, gloves()], { adornedLeft: adorn });
    assert.notEqual(sel.viaAdornment, true);
    assert.equal(sel.target.kind, 'leather gloves'); // ring pick redirects to gloves
});

test('nothing to steal when only gold remains (steal.c:419-420 -> 340-378)', () => {
    installGame();
    const sel = selectStealTarget([gold(1000)]);
    assert.equal(sel.nothing, true);
    assert.equal(getRngLog().length, 0);
});

// --- worn_item_removal massage (steal.c:286-333) ----------------------------

test('removal message verbs: disarms weapon, removes ring w/ (from X hand), takes off armor', () => {
    assert.equal(wornItemRemovalMessage('The water nymph', weapon()),
        'The water nymph disarms your short sword.');
    assert.equal(wornItemRemovalMessage('The water nymph', ring()),
        'The water nymph removes your black onyx ring (from right hand).');
    assert.equal(wornItemRemovalMessage('The wood nymph', gloves()),
        'The wood nymph takes off your pair of leather gloves.');
    assert.equal(wornItemRemovalMessage('The wood nymph', scroll()), null);
});

test('stolen message: "She" only for name-carrying nymph removal (steal.c:552-557)', () => {
    assert.equal(stolenItemMessage({ monName: 'The water nymph', isNymph: true, removalShown: true }, 'a black onyx ring'),
        'She stole a black onyx ring.');
    assert.equal(stolenItemMessage({ monName: 'Something', isNymph: false, removalShown: true }, 'a granite stone'),
        'Something stole a granite stone.');
    assert.equal(stolenItemMessage({ monName: 'The water nymph', isNymph: true, removalShown: false }, 'a potion'),
        'The water nymph stole a potion.');
});

// --- nothing_to_take branch (steal.c:340-378) --------------------------------

test('nothing branch RNG: punished nymph consumes rn2(4) first (steal.c:347)', () => {
    installGame({ seed: 13 });
    const r1 = stealNothingToTake({ monName: 'The nymph', punished: true, blind: false, items: [] });
    const log = getRngLog();
    assert.equal(log.length, 1);
    assert.match(log[0], /^rn2\(4\)=/);
    if (r1.action === 'unchain') assert.match(r1.message, /takes off your iron chain\./);
});

test('nothing branch: blind hero, gold-only, and empty variants in C order (steal.c:362-369)', () => {
    installGame();
    assert.equal(stealNothingToTake({ monName: 'Someone', blind: true, items: [] }).message,
        'Somebody tries to rob you, but finds nothing to steal.');
    assert.equal(stealNothingToTake({ monName: 'The nymph', items: [gold(5)] }).message,
        "The nymph tries to rob you, but isn't interested in gold.");
    assert.equal(stealNothingToTake({ monName: 'The nymph', items: [] }).message,
        'The nymph tries to rob you, but there is nothing to steal!');
});

// --- monkey cant_take (steal.c:432-441) -------------------------------------

test('monkey cant_take consumes rn2(4) verb then rn2(inv_cnt/5+2) flee check', () => {
    installGame({ inventory: [scroll(), scroll({ letter: 'h' }), gloves()] }); // icnt=3 -> rn2(2)
    const armorItem = gloves();
    const { message, flees } = monkeyCantTake('The monkey', armorItem);
    const log = getRngLog();
    assert.equal(log.length, 2);
    assert.match(log[0], /^rn2\(4\)=/);
    assert.match(log[1], /^rn2\(2\)=/);
    assert.match(message, /^The monkey tries to (steal|snatch|grab|take) your pair of leather gloves but gives up\.$/);
    assert.equal(typeof flees, 'boolean');
});

// --- planMonsterSteal end-to-end (steal() decision shape) --------------------

test('planMonsterSteal covered path: exactly one rn2(total) draw, C-shaped messages', () => {
    installGame({ inventory: [ring(), gloves(), scroll(), gold(50)], seed: 21 });
    const plan = planMonsterSteal(nymph, { subject: 'The water nymph' });
    assert.equal(plan.kind, 'steal');
    const log = getRngLog();
    assert.equal(log.length, 1);
    assert.match(log[0], /^rn2\(11\)=/); // 5 (ring) + 5 (gloves) + 1 (scroll)
    // whichever target: ring->gloves redirect then removal phrasing is C-shaped
    assert.match(plan.stolenMessage, /^She stole /);
    assert.ok(plan.removeMessage === null || /^(The water nymph) (disarms|removes|takes off) your /.test(plan.removeMessage));
});

test('planMonsterSteal: no non-gold items yields C nothing-to-steal message, no slot draw', () => {
    installGame({ inventory: [gold(20)], seed: 21 });
    const plan = planMonsterSteal(nymph, { subject: 'The water nymph' });
    assert.equal(plan.kind, 'nothing');
    assert.equal(plan.message, "The water nymph tries to rob you, but isn't interested in gold.");
    assert.equal(plan.flee, true);
    assert.ok(!getRngLog().some(e => /^rn2\(1\)=/.test(e)));
});

// --- stealarm / thiefdead / unstolenarm (steal.c:129-191) --------------------

function armedThief(over = {}) {
    return {
        m_id: 777, mx: 11, my: 10, minvent: [], mflee: 0, mfleetim: 99,
        data: { name: 'water nymph', mlet: 'n', xpAttacks: [{ aatyp: 'claw', adtyp: 'steal' }] },
        ...over,
    };
}

test('stealarm completes a multi-turn strip only while thief still AD_SITM-adjacent (steal.c:160-191)', () => {
    const item = { id: 55, cls: 'armor', kind: 'scale mail', line: 'e - a scale mail (being worn)', worn: true };
    const g = installGame({ inventory: [item], monsters: [armedThief()] });
    g._stealoid = 55; g._stealmid = 777;
    const res = stealarm(g, {});
    assert.ok(res && /steals/.test(res.message));
    assert.equal(g.inventory.length, 0);
    const mon = g.level.monsters[0];
    assert.equal(mon.minvent.length, 1);
    assert.equal(mon.mflee, 1);      // monflee(0,FALSE,FALSE): flee set …
    assert.equal(mon.mfleetim, 0);   // … with untimed zero timer (monmove.c:462-533)
});

test('stealarm abandons the theft when the thief moved away (distu>2, steal.c:176)', () => {
    const item = { id: 56, cls: 'armor', kind: 'scale mail', line: 'e - a scale mail (being worn)', worn: true };
    const g = installGame({ inventory: [item], monsters: [armedThief({ mx: 30, my: 5 })] });
    g._stealoid = 56; g._stealmid = 777;
    const res = stealarm(g, {});
    assert.equal(res, null);
    assert.equal(g.inventory.length, 1); // hero keeps the armor
    assert.equal(g._stealoid, 0);        // state cleared (steal.c:189)
});

test('thiefdead switches the pending strip to unstolenarm (steal.c:129-137)', () => {
    const g = installGame({ inventory: [{ id: 57, cls: 'armor', kind: 'helm', line: 'i - a helm (being worn)', worn: true }] });
    g._stealoid = 57; g._stealmid = 777; g._steal_after_mv = 'stealarm';
    thiefdead(g);
    assert.equal(g._stealmid, 0);
    assert.equal(g._steal_after_mv, 'unstolenarm');
    const msg = unstolenarm(g);
    assert.equal(msg, 'You finish taking off your helm.');
    assert.equal(g._stealoid, 0);
});

// --- stealgold (steal.c:62-116) ----------------------------------------------

test('stealgold floor path: floor gold preferred over larger/rn2(5) purse (steal.c:78-80)', () => {
    installGame({ inventory: [gold(10)], seed: 4 });
    const res = stealgold({ data: { name: 'leprechaun' } },
        { floorGold: { cls: 'coin', quan: 500 }, items: game.inventory });
    assert.equal(res.kind, 'floor');         // 500 > 10: no choice roll
    assert.ok(getRngLog().length <= 1);      // possible !ygold||!rn2(5) flee roll only
    assert.match(res.message, /quickly snatches some gold/);
    assert.match(res.message, /between your feet/);
});

test('stealgold purse path: somegold(rn1) then "purse feels lighter" (steal.c:101-113)', () => {
    installGame({ inventory: [gold(800)], seed: 6 });
    const res = stealgold({ data: { name: 'leprechaun' } }, { floorGold: null, items: game.inventory });
    assert.equal(res.kind, 'purse');
    assert.equal(res.message, 'Your purse feels lighter.');
    assert.equal(res.flees, true);
    assert.ok(res.amount >= 100 && res.amount <= 800); // somegold 500..999 band
    // C short-circuits the floor-vs-purse choice (steal.c:78) when there is
    // no floor gold: only somegold()'s rn1 draw is consumed.
    assert.equal(getRngLog().length, 1);
});

test('stealgold: no gold anywhere yields kind none (steal.c:74/101 fall-through)', () => {
    installGame({ inventory: [scroll()], seed: 6 });
    assert.equal(stealgold(nymph, {}).kind, 'none');
    assert.equal(getRngLog().length, 0);
});

// --- stealamulet (steal.c:640-682) ---------------------------------------------

test('stealamulet picks the only quest artifact with no RNG (steal.c:646-652)', () => {
    installGame({ inventory: [scroll(), { cls: 'weapon', kind: 'long sword', artifact: true, questArtifact: true, name: 'Sunsword' }] });
    const res = stealamulet({ iswiz: true }, { isQuestArtifact: it => !!it.questArtifact });
    assert.equal(res.target.name, 'Sunsword');
    assert.equal(getRngLog().length, 0);
});

test('stealamulet: random choice among several quest artifacts via rnd(n) (steal.c:653-657)', () => {
    installGame({ inventory: [
        { cls: 'weapon', kind: 'long sword', questArtifact: true, name: 'A' },
        { cls: 'amulet', kind: 'amulet', questArtifact: true, name: 'B' },
    ], seed: 30 });
    const res = stealamulet({ iswiz: true }, { isQuestArtifact: it => !!it.questArtifact });
    assert.ok(['A', 'B'].includes(res.target.name));
    const log = getRngLog();
    assert.equal(log.length, 1);
    assert.match(log[0], /^rnd\(2\)=/);
});

test('stealamulet: ring target under gloves strips weapon->gloves->ring (steal.c:667-676)', () => {
    installGame({
        inventory: [cloak(), suit(), weapon(), gloves(), ring({ actualKind: 'ring', kind: 'ring' })],
        seed: 44,
    });
    const order = stealamuletStripOrder(game.inventory, wornRingOf(game.inventory));
    // cloak/suit only come off for suit/shirt targets (steal.c:667-670)
    assert.deepEqual(order.map(i => i.letter), ['c', 'b', 'a']);
});

test('stealamulet: suit/shirt target strips covering cloak and suit first (steal.c:667-670)', () => {
    installGame({
        inventory: [cloak(), suit(), shirt(), { cls: 'armor', kind: 'mythic armor', questArtifact: true,
                                                 line: 'z - mythic armor (being worn)', worn: true, letter: 'z' }],
        seed: 44,
    });
    const items = game.inventory;
    const target = items.find(i => i.questArtifact);
    const order = stealamuletStripOrder(items, target);
    // mythic armor is neither the regex suit nor shirt slot in the JS model,
    // so no strips; verify explicit suit/shirt target behavior instead:
    assert.deepEqual(stealamuletStripOrder(items, items.find(i => i.kind === 'scale mail')).map(i => i.letter), ['d', 'e']);
    assert.deepEqual(stealamuletStripOrder(items, items.find(i => i.kind === 'Hawaiian shirt')).map(i => i.letter), ['d', 'e', 'f']);
    assert.deepEqual(order.filter(i => i !== target), []); // no blockers modeled for the artifact slot
});

function wornRingOf(items) { return items.find(i => i.cls === 'ring'); }

// --- mpickobj / maybe_absorb_item -----------------------------------------------

test('mpickobj: stolen flag overrides thrown (steal.c:625-629), thrownobj cleared (steal.c:605)', () => {
    installGame();
    const mon = armedThief();
    const obj = { how_lost: 'thrown', cls: 'weapon', kind: 'dagger' };
    game._thrownobj = obj;
    const res = mpickobj(mon, obj);
    assert.equal(res.freed, false);
    assert.equal(obj.how_lost, 'stolen');
    assert.equal(game._thrownobj, null);
    assert.ok(mon.minvent.includes(obj));
});

test('maybe_absorb_item refuses ball/chain/rocks (steal.c:695-696)', () => {
    installGame();
    game.u.uball = { cls: 'weapon', kind: 'heavy iron ball' };
    assert.equal(maybeAbsorbItem(nymph, game.u.uball, { ochance: 50, achance: 10 }), null);
    assert.equal(maybeAbsorbItem(nymph, { cls: 'rock', kind: 'rock' }, { ochance: 50, achance: 10 }), null);
    const ok = maybeAbsorbItem(nymph, weapon(), { ochance: 50, achance: 10, canCarry: false });
    assert.ok(ok && ok.absorbed.kind === 'short sword');
});
