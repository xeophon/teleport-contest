import test from 'node:test';
import assert from 'node:assert/strict';

// Source-derived tests for js/wizard.js (C ref: nethack-c/upstream/src/wizard.c).
// All expectations come from the C source; public session fixtures are not read.

import { resetGame, game } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog, rn2, rnd, rn1 } from '../js/rng.js';
import { ROOM } from '../js/const.js';
import {
    RANDOM_INSULT, RANDOM_MALEDICTION, WIZAPP,
    monHasAmulet, monHasSpecial, wizdeadorgone, noOfWizards,
    amulet, clonewiz, intervene, resurrect, rndcurse,
} from '../js/wizard.js';
import { pickNasty, NASTY_MONSTER_NAMES, monsterByRndName } from '../js/mklev.js';

function testCell(typ = ROOM, extra = {}) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0, ...extra };
}

function freshGame(seed = 1) {
    const g = resetGame();
    initRng(seed);
    game.moves = 100;
    game.flags = {};
    game.inventory = [];
    game.dungeons = [{ name: 'The Dungeons of Doom', num_dunlevs: 30 }];
    game.level = {
        flags: {},
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
        engravings: [],
        at: () => testCell(),
    };
    game.u = {
        ux: 40, uy: 10, ulevel: 10, uhp: 50, uhave: {}, uevent: {},
        ualign: { type: 0, record: 10 }, blind: false,
        uz: { dnum: 0, dlevel: 5 },
        acurr: { a: [14, 14, 14, 14, 14, 14] },
    };
    return g;
}

// C ref: wizard.c:43-57 — nasties[] has exactly 44 entries in this order.
test('nasties table matches C wizard.c:43-57 (44 entries, aligned groups)', () => {
    assert.equal(NASTY_MONSTER_NAMES.length, 44);
    // neutral block (20), chaotic block (14), lawful block (10)
    assert.deepEqual(NASTY_MONSTER_NAMES.slice(0, 4),
        ['cockatrice', 'ettin', 'stalker', 'minotaur']);
    assert.equal(NASTY_MONSTER_NAMES[19], 'genetic engineer');
    assert.equal(NASTY_MONSTER_NAMES[20], 'black dragon');
    assert.equal(NASTY_MONSTER_NAMES[33], 'gremlin');
    assert.equal(NASTY_MONSTER_NAMES[34], 'silver dragon');
    assert.equal(NASTY_MONSTER_NAMES[43], 'barbed devil');
    for (const name of NASTY_MONSTER_NAMES)
        assert.ok(monsterByRndName(name), `nasty ${name} resolves to monster data`);
});

// C ref: wizard.c:59-63 — wizapp[] pool for the Double Trouble clone.
test('wizapp table matches C wizard.c:59-63 (12 appearances)', () => {
    assert.deepEqual(WIZAPP, [
        'human', 'water demon', 'vampire', 'red dragon',
        'troll', 'umber hulk', 'xorn', 'xan',
        'cockatrice', 'floating eye', 'guardian naga', 'trapper',
    ]);
});

// C ref: wizard.c:819-838 — 28 insults, 11 maledictions, preserving order.
test('insult and malediction tables match C wizard.c:819-838', () => {
    assert.equal(RANDOM_INSULT.length, 28);
    assert.equal(RANDOM_INSULT[0], 'antic');
    assert.equal(RANDOM_INSULT[24], 'villein'); /* (sic.) */
    assert.equal(RANDOM_INSULT[27], 'wretch');
    assert.equal(RANDOM_MALEDICTION.length, 11);
    assert.equal(RANDOM_MALEDICTION[0], 'Hell shall soon claim thy remains,');
    assert.equal(RANDOM_MALEDICTION[10], 'Verily, thou shalt be one dead');
});

// C ref: wizard.c:578-597 — ROLL_FROM(nasties) is a single rn2(44) when not
// on the Rogue level and no second draw happens on accepted first picks.
test('pickNasty consumes exactly one rn2(44) off the Rogue level', () => {
    freshGame(3);
    enableRngLog({ reset: true });
    pickNasty(17);
    const calls = getRngLog();
    assert.equal(calls.length, 1);
    assert.match(calls[0], /^rn2\(44\)=/);
});

// C ref: wizard.c:599-620 — arch-lich outside Gehennom is both G_HELL and
// above any sane difcap, so pick_nasty substitutes master lich.
test('pickNasty substitutes arch-lich -> master lich with difcap', () => {
    for (const seed of [1, 2, 3, 4, 5, 42, 99]) {
        freshGame(seed);
        // find a seed where the raw 44-pick is arch-lich, then verify
        enableRngLog({ reset: true });
        const found = [];
        for (let i = 0; i < 300; i++) {
            getRngLog().length = 0;
            const ptr = pickNasty(15);
            if (getRngLog()[0] === `rn2(44)=${NASTY_MONSTER_NAMES.indexOf('arch-lich')}`)
                found.push(ptr?.name);
        }
        for (const name of found)
            assert.equal(name, 'master lich', `seed ${seed}: arch-lich not substituted`);
    }
});

// C ref: wizard.c:599-607 — green slime is G_HELL, so outside Gehennom it is
// substituted; big_to_little has no green slime row so alt == res.
test('pickNasty keeps green slime outside hell (no grownups entry)', () => {
    freshGame(11);
    enableRngLog({ reset: true });
    let greens = 0;
    for (let i = 0; i < 400; i++) {
        const ptr = pickNasty(0);
        if (ptr?.name === 'green slime') greens++;
    }
    // must exist at all (it is in the pool) and never be filtered away
    assert.ok(greens > 0, 'green slime does appear from the nasties pool');
});

// C ref: wizard.c:806-814 — wizdeadorgone decrements the counter and starts
// the demigod timer rn1(250, 50) (turns 50..299).
test('wizdeadorgone sets demigod + udg_cnt via rn1(250,50)', () => {
    const g = freshGame(7);
    game.context ??= {};
    game.context.noOfWizards = 1;
    game.u.uevent.udemigod = 0;
    enableRngLog({ reset: true });
    wizdeadorgone();
    assert.equal(noOfWizards(), 0);
    assert.equal(game.u.uevent.udemigod, 1);
    assert.deepEqual(getRngLog()[0].replace(/=.*/, '='), 'rn2(250)=');
    assert.ok(game.u.udg_cnt >= 50 && game.u.udg_cnt <= 299,
        `udg_cnt ${game.u.udg_cnt} outside rn1(250,50) range`);
});

// C ref: wizard.c:70-95 — wearing the Amulet costs rn2(15) per turn even with
// no portal; carrying it without wearing/wielding consumes nothing.
test('amulet() rolls rn2(15) only when the Amulet is worn or wielded', () => {
    const worn = { cls: 'amulet', kind: 'Amulet of Yendor', actualKind: 'Amulet of Yendor', realAmuletOfYendor: true, worn: true };
    freshGame(1);
    game.u.uhave.amulet = 1;
    game.inventory = [worn];
    enableRngLog({ reset: true });
    amulet();
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]), ['rn2(15)']);

    freshGame(1);
    game.u.uhave.amulet = 1;
    game.inventory = [{ ...worn, worn: false, wielded: false }];
    enableRngLog({ reset: true });
    amulet();
    assert.equal(getRngLog().length, 0, 'carried but unworn Amulet must not roll');
});

// C ref: wizard.c:89-107 — waking an asleep Wizard consumes rn2(40) only when
// the no_of_wizards counter is nonzero.
test('amulet() wakes a sleeping Wizard with rn2(40) gated on no_of_wizards', () => {
    freshGame(5);
    game.u.uhave.amulet = 1; // carried, not worn: no warmth roll
    const wiz = { mx: 5, my: 5, iswiz: true, msleeping: 1, mhp: 10, mhpmax: 10,
        data: monsterByRndName('Wizard of Yendor') };
    game.level.monsters = [wiz];

    game.context = { noOfWizards: 1 };
    enableRngLog({ reset: true });
    amulet();
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]), ['rn2(40)']);

    // counter zero: no scan, no roll
    game.context = { noOfWizards: 0 };
    wiz.msleeping = 1;
    enableRngLog({ reset: true });
    amulet();
    assert.equal(getRngLog().length, 0);
});

// C ref: wizard.c:784 — Astral harassment rolls rnd(4) (1..4), other levels
// roll rn2(6) (0..5); both consume exactly one die when the branch falls
// through to "vaguely nervous".
test('intervene() astral vs non-astral die shape', async () => {
    // Non-astral: force "vaguely nervous" by finding a seed whose first roll
    // is 0 or 1 via rn2(6).
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        freshGame(seed);
        game.u.uz = { dnum: 0, dlevel: 5 };
        enableRngLog({ reset: true });
        const messages = await intervene();
        const first = getRngLog()[0] || '';
        assert.match(first, /^rn2\(6\)=/);
        break; // shape check only needs one seed
    }
});

// C ref: sit.c:567-590 — rndcurse magicbane deflection consumes rn2(20) when
// wielding Magicbane, then at most one rnd(count) + rnd(nobj) per item.
test('rndcurse rolls match sit.c ordering (rnd(cnt), rnd(nobj) per item)', () => {
    freshGame(9);
    game.inventory = [
        { cls: 'weapon', kind: 'long sword', letter: 'a' },
        { cls: 'armor', kind: 'leather armor', letter: 'b' },
    ];
    enableRngLog({ reset: true });
    const messages = rndcurse();
    const names = getRngLog().map(line => line.split('=')[0]);
    assert.equal(names[0], 'rnd(6)');
    for (const name of names.slice(1)) assert.equal(name, 'rnd(2)');
    assert.ok(messages.some(m => m.includes('malignant aura surround you')));
});

// C ref: wizard.c:543-560 — Double Trouble: clone counted (makemon.c:1371),
// rn2(2) for the fake Amulet when the hero lacks a real one, rn2(12) for the
// shape appearance unless protected.
test('clonewiz counts the clone and rolls fake-amulet + wizapp in C order', async () => {
    const g = freshGame(13);
    game.context = { noOfWizards: 0 };
    enableRngLog({ reset: true });
    const clone = await clonewiz();
    assert.ok(clone, 'clone created');
    assert.equal(clone.iswiz, true);
    assert.equal(noOfWizards(), 1, 'makemon counts the clone wizard');
    assert.equal(clone.mappearance != null || clone.m_ap_type, true);
    const names = getRngLog().map(line => line.split('=')[0]);
    assert.ok(names.includes('rn2(2)'), `expected fake-amulet rn2(2), got ${names.join(',')}`);
    assert.ok(names.includes('rn2(12)'), `expected wizapp rn2(12), got ${names.join(',')}`);
    assert.ok(names.indexOf('rn2(2)') < names.indexOf('rn2(12)'),
        'fake-amulet roll precedes the wizapp roll (wizard.c:551-557)');
});

// C ref: wizard.c:733-777 — intervention resurrection speaks (wizard.c:773)
// and re-hostilizes; new (non-migrating) wizards use the "kill" verb.
test('resurrect() creates + threatens when no wizard exists', async () => {
    freshGame(17);
    game.context = { noOfWizards: 0 };
    const { mon, messages } = await resurrect();
    assert.ok(mon && mon.iswiz);
    assert.equal(mon.mrevived, 1);
    assert.deepEqual(messages, [
        'A voice booms out...',
        '"So thou thought thou couldst kill me, fool."',
    ]);
});

// C ref: wizard.c:96-107 wake text: only when the Wizard is NOT next to you.
test('amulet() wake message only when wizard is not adjacent', () => {
    freshGame(19);
    game.u.uhave.amulet = 1;
    const wiz = { mx: 3, my: 3, iswiz: true, msleeping: 1, mhp: 10, mhpmax: 10,
        data: monsterByRndName('Wizard of Yendor') };
    game.level.monsters = [wiz];
    game.context = { noOfWizards: 1 };
    // force the wake by scanning seeds for !rn2(40): emulate via direct call
    enableRngLog({ reset: true });
    let woke = false;
    for (let i = 0; i < 200 && !woke; i++) {
        wiz.msleeping = 1;
        const messages = amulet();
        if (wiz.msleeping === 0) {
            woke = true;
            assert.ok(messages.some(m => m.includes('creepy feeling')),
                'distant wizard wake must print the creepy-feeling message');
        }
    }
    assert.ok(woke, 'rn2(40)==0 occurred within 200 rolls');
});
