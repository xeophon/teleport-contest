import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { ROOM } from '../js/const.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';

// C ref: objnam.c rnd_otyp_by_namedesc (objnam.c:3455-3528) — every wish
// that resolves through readobjnam's namedesc lookup consumes
// rn2(oc_prob + 1) per matching object; these tests pin the JS wish tables
// to the C objects.h names/probabilities and to C's doname output.

const SKELETON_KEY = 220;
const BELL = 358;
const ORCISH_DAGGER = 10020;
const ELVEN_DAGGER = 10123;
const ATHAME = 10094;
const BUGLE = 10052;
const CREDIT_CARD = 10129;
const SILVER_DAGGER = 10219;
const LEATHER_DRUM = 10220;
const POT_WATER = 253;

function testCell(typ = ROOM) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0 };
}

function installWishState(seed = 1, { debug = true } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = { debug };
    g.inventory = [];
    g._goldCount = 0;
    g.context = {};
    g.u = {
        ux: 1,
        uy: 1,
        ublesscnt: 0,
        uluck: 0,
        moreluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    const heroCell = testCell();
    g.level = {
        flags: { nfountains: 0, nsinks: 0 },
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
        engravings: [],
        meltIceTimers: [],
        at: (x, y) => x === g.u.ux && y === g.u.uy ? heroCell : testCell(),
    };
    return g;
}

function beginWishDirectly() {
    game._wish_text = '';
    game._wish_tries = 0;
    game._command_mode = 'wizardWish';
}

async function submitWish(text) {
    for (const ch of text) await rhack(ch.charCodeAt(0));
    await rhack('\n');
}

async function wishFor(text, seed = 1) {
    installWishState(seed);
    enableRngLog({ reset: true });
    beginWishDirectly();
    await submitWish(text);
    return { item: game.inventory[game.inventory.length - 1], log: [...getRngLog()] };
}

// C ref: objects.h — names rnd_otyp_by_namedesc matches exactly once, so the
// first PRNG draw of the wish is rn2(oc_prob + 1) (objnam.c:3517-3522).
test('wished weapon and tool names resolve with C namedesc bounds', async () => {
    for (const [wish, bound, otyp, kind, actualKind] of [
        ['silver dagger', 4, SILVER_DAGGER, 'silver dagger', 'silver dagger'],
        ['elven dagger', 11, ELVEN_DAGGER, 'runed dagger', 'elven dagger'],
        ['orcish dagger', 13, ORCISH_DAGGER, 'crude dagger', 'orcish dagger'],
        ['athame', 1, ATHAME, 'athame', 'athame'],
        ['stiletto', 6, 10109, 'stiletto', 'stiletto'],
        ['bugle', 5, BUGLE, 'bugle', 'bugle'],
        ['leather drum', 5, LEATHER_DRUM, 'drum', 'leather drum'],
        ['skeleton key', 81, SKELETON_KEY, 'key', 'skeleton key'],
        ['credit card', 16, CREDIT_CARD, 'credit card', 'credit card'],
        ['bell', 3, BELL, 'bell', 'bell'],
    ]) {
        const result = await wishFor(wish);
        assert.match(result.log[0], new RegExp(`^rn2\\(${bound}\\)=`), `${wish} namedesc roll`);
        assert.equal(result.item.otyp, otyp, wish);
        assert.equal(result.item.kind, kind, wish);
        assert.equal(result.item.actualKind, actualKind, wish);
        assert.equal(game._command_mode, null, `${wish} should not retry`);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

// C ref: objnam.c doname — shuffled-appearance tools show their description
// until discovered (objects.h TOOL("leather drum", "drum"), TOOL("skeleton
// key", "key")); NoDes tools show their true name. The message-line form
// (prinv) appends a period; the inventory line itself does not.
test('wished tools land with C appearance names', async () => {
    for (const [wish, line] of [
        ['leather drum', /^[a-z] - a drum$/],
        ['bugle', /^[a-z] - a bugle$/],
        ['skeleton key', /^[a-z] - a key$/],
        ['credit card', /^[a-z] - a credit card$/],
        ['elven dagger', /^[a-z] - a runed dagger$/],
        ['orcish dagger', /^[a-z] - a crude dagger$/],
        ['silver dagger', /^[a-z] - a silver dagger$/],
    ]) {
        const result = await wishFor(wish);
        assert.match(result.item.line, line, wish);
        assert.match(game._pending_message, new RegExp(`${line.source.slice(0, -1)}\\.$`), wish);
    }
});

// C ref: objects.h TOOL descriptions for whistles/flutes — the tool-regex
// wish path must also pay the namedesc roll (oc_prob + 1).
test('wished whistle and flute names consume C namedesc rolls', async () => {
    for (const [wish, bound, kind, actualKind] of [
        ['saddle', 6, 'saddle', 'saddle'],
        ['tin whistle', 101, 'whistle', 'tin whistle'],
        ['magic whistle', 31, 'whistle', 'magic whistle'],
        ['wooden flute', 5, 'flute', 'wooden flute'],
    ]) {
        const result = await wishFor(wish);
        assert.match(result.log[0], new RegExp(`^rn2\\(${bound}\\)=`), `${wish} namedesc roll`);
        assert.equal(result.item.kind, kind, wish);
        assert.equal(result.item.actualKind, actualKind, wish);
    }
});

// C ref: objnam.c:4749 — "potion of water" resolves via
// rnd_otyp_by_namedesc("water", ...) which matches POT_WATER uniquely and
// rolls rn2(80 + 1). Plain "[un]holy water" goes through adjective parsing
// (objnam.c:3997-4002) leaving "water" for the same rn2(81); only
// "potion of [un]holy water" takes the objnam.c:4489 shortcut with no roll.
test('water wishes consume the C namedesc roll only when not potion-of-[un]holy', async () => {
    const water = await wishFor('potion of water');
    assert.match(water.log[0], /^rn2\(81\)=/, 'plain water namedesc roll');
    assert.equal(water.item.otyp, POT_WATER);

    const blessed = await wishFor('blessed potion of water');
    assert.match(blessed.log[0], /^rn2\(81\)=/, 'blessed water namedesc roll');
    assert.equal(blessed.item.blessed, true);

    for (const [wish, rolls] of [
        ['holy water', true], ['unholy water', true],
        ['potion of holy water', false], ['potion of unholy water', false],
    ]) {
        const result = await wishFor(wish);
        assert.equal(result.log.some(entry => entry.startsWith('rn2(81)=')), rolls, wish);
        assert.equal(result.item.otyp, POT_WATER, wish);
        assert.equal(result.item.blessed, !wish.includes('unholy'), wish);
        assert.equal(result.item.cursed, wish.includes('unholy'), wish);
    }
});

// C ref: objnam.c doname POTION_CLASS — an unrecognized water potion shows
// its fixed "clear" appearance; the [un]holy water name requires a known
// type plus known BUC state.
test('wished water displays as clear potion until the type is known', async () => {
    const plain = await wishFor('potion of water');
    assert.match(plain.item.line, /^[a-z] - a clear potion$/);
    assert.doesNotMatch(plain.item.line, /holy water|potion of water/);

    const blessed = await wishFor('blessed potion of water');
    assert.equal(blessed.item.blessed, true);
    assert.match(blessed.item.line, /^[a-z] - a clear potion$/);

    installWishState();
    game._discoveries = [{ section: 'Potions', name: 'potion of water' }];
    enableRngLog({ reset: true });
    beginWishDirectly();
    await submitWish('potion of water');
    const known = game.inventory[game.inventory.length - 1];
    assert.match(known.line, /potion of water/);
});

// C ref: objnam.c doname/xname — multi-quantity wished potions pluralize
// their appearance name ("2 orange potions").
test('wished potion stacks pluralize their appearance name', async () => {
    installWishState();
    game._object_descriptions = {
        potions: Array.from({ length: 25 }, (_, i) => ({ description: `appearance ${i}` })),
    };
    game._object_descriptions.potions[12] = { description: 'orange' };
    enableRngLog({ reset: true });
    beginWishDirectly();
    await submitWish('2 potions of gain level');
    const item = game.inventory[game.inventory.length - 1];
    assert.equal(item.quan, 2);
    assert.equal(item.kind, 'orange potion');
    assert.match(item.line, /^[a-z] - 2 orange potions$/);
    assert.match(game._pending_message, /2 orange potions\.$/);
});

// C ref: objnam.c rnd_otyp_by_namedesc — bare appearance wishes match every
// object sharing the description, so the roll is rn2(sum(oc_prob + 1)).
test('bare appearance wishes roll rn2 over all matching objects', async () => {
    for (const [wish, bound, kind, actualKinds] of [
        ['drum', 8, 'drum', ['leather drum', 'drum of earthquake']],
        ['harp', 8, 'harp', ['wooden harp', 'magic harp']],
        ['key', 81, 'key', ['skeleton key']],
    ]) {
        const result = await wishFor(wish);
        assert.match(result.log[0], new RegExp(`^rn2\\(${bound}\\)=`), `${wish} namedesc roll`);
        assert.equal(result.item.kind, kind, wish);
        assert.ok(actualKinds.includes(result.item.actualKind), `${wish}: ${result.item.actualKind}`);
    }
});

// C ref: invent.c hold_another_object -> addinv -> merged — a wished
// type-known potion merges into a matching stack, and the knowledge gap is
// discovered "by comparing them" (invent.c:862-941), with the prinv landing
// line showing the wished-for quantity of the combined stack.
test('wished potion merges into an existing stack with comparison discovery', async () => {
    installWishState();
    game._object_descriptions = {
        potions: Array.from({ length: 25 }, (_, i) => ({ description: `appearance ${i}` })),
    };
    game._object_descriptions.potions[20] = { description: 'pink' };
    game.inventory.push({
        cls: 'potion', glyph: '!', letter: 'h', quan: 1, owt: 20,
        potionIndex: 20, kind: 'booze', actualKind: 'potion of booze',
        blessed: false, cursed: false, bknown: true,
        line: 'h - an uncursed potion of booze',
    });
    enableRngLog({ reset: true });
    beginWishDirectly();
    await submitWish('uncursed potion of booze');

    assert.equal(game.inventory.length, 1, 'wished booze should merge, not add a stack');
    const stack = game.inventory[0];
    assert.equal(stack.letter, 'h');
    assert.equal(stack.quan, 2);
    assert.equal(stack.kind, 'booze');
    assert.equal(stack.bknown, true);
    assert.equal(game._pending_message, 'You learn more about your items by comparing them.');
    assert.equal(game._command_mode, 'heldWishMore');
    assert.equal(game.u.ublesscnt || 0, 0, 'divine notice waits until inventory feedback returns');
    await rhack(' ');
    assert.equal(game._pending_message, 'h - an uncursed pink potion (2 in total).');
    assert.ok(game.u.ublesscnt >= 50);
});

// C ref: invent.c mergable — stacks with different BUC states never merge.
test('wished potion with different BUC state does not merge', async () => {
    installWishState();
    game._object_descriptions = {
        potions: Array.from({ length: 25 }, (_, i) => ({ description: `appearance ${i}` })),
    };
    game._object_descriptions.potions[20] = { description: 'pink' };
    game.inventory.push({
        cls: 'potion', glyph: '!', letter: 'h', quan: 1, owt: 20,
        potionIndex: 20, kind: 'booze', actualKind: 'potion of booze',
        blessed: false, cursed: false, bknown: true,
        line: 'h - an uncursed potion of booze',
    });
    enableRngLog({ reset: true });
    beginWishDirectly();
    await submitWish('blessed potion of booze');

    assert.equal(game.inventory.length, 2, 'blessed wish must not merge into the uncursed stack');
    assert.equal(game._pending_message.includes('comparing'), false);
});
