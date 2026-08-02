// steed-kick.test.mjs — behavioral tests for the steed.c port slice
// (sessions-extra/seed9161-wiz-steed coverage):
//   * use_saddle() apply-a-saddle roll/order (steed.c:36-141)
//   * put_saddle_on_mon() inventory/worn-state bookkeeping (steed.c:144-163)
//   * can_saddle() class/shape gating (steed.c:27-33)
//   * kick_steed() tameness decrement + gallop rn1(20,30) (steed.c:433-448)
//   * legs_in_no_shape() wording (do.c:2408-2425)
import assert from 'node:assert/strict';
import test from 'node:test';

import { __steedTestHooks as steed } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { COULD_SEE, IN_SIGHT, W_SADDLE, ROOM } from '../js/const.js';

function testCell(typ = ROOM) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0 };
}

function makePony(x = 11, y = 10) {
    return {
        mx: x, my: y, mhp: 6, mhpmax: 6, m_lev: 2,
        pet: true, mtame: 5, mpeaceful: 1,
        msleeping: 0, mfrozen: 0, meating: 0,
        mextra: { edog: { apport: 9, hungrytime: 1001, dropdist: 10000, whistletime: 0 } },
        data: { name: 'pony', mlet: 'u', mlevel: 3, mmove: 16, ac: 6 },
    };
}

function saddleItem(letter = 'o') {
    return {
        letter, otyp: 12, kind: 'saddle', actualKind: 'saddle', cls: 'tool',
        quan: 1, singular: 'saddle', worn: false, owornmask: 0,
        line: `${letter} - a saddle`,
    };
}

function installState(seed = 1, { mounted = false } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = {};
    g.context = { move: 0 };
    g.moves = 1;
    g.urole = { name: { m: 'Wizard', f: 'Wizard' } };
    g._startup_role = 'Wizard';
    g.u = {
        ux: 10, uy: 10,
        uz: { dnum: 0, dlevel: 1 },
        ublesscnt: 0, uluck: 0, moreluck: 0,
        uhp: 12, uhpmax: 12, uen: 6, uenmax: 6, ulevel: 1,
        acurr: { a: [9, 18, 11, 15, 13, 9] },
        ualign: { type: 0, record: 0 },
    };
    const pony = makePony();
    g.level = {
        flags: {}, rooms: [],
        monsters: [pony], objects: [], traps: [], engravings: [],
        at: () => testCell(),
    };
    vision_reset();
    // light hero + pony squares (IN_SIGHT for canspotmon-ish visibility)
    g.viz_array = [];
    g.viz_array[10] = [];
    g.viz_array[10][10] = COULD_SEE | IN_SIGHT;
    g.viz_array[10][11] = COULD_SEE | IN_SIGHT;
    if (mounted) g.u.usteed = pony;
    g.inventory = [saddleItem()];
    g._pet_food_scan_inventory = g.inventory;
    return g;
}

const logNames = () => getRngLog().map(e => String(e).replace(/\s*@\s.*$/, '').split('=')[0]);

// Drive heroUseSaddle repeatedly until a seed gives the requested outcome.
// chance for this fixture: Dex 15 + Cha 9/2 + 2*5 tame + level 1 * 20
// (wizard riding is Basic, no penalty) => 49, so rolls < 49 succeed.
async function seedWithOutcome(successWanted) {
    for (let seed = 1; seed < 20000; seed++) {
        installState(seed);
        enableRngLog();
        await steed.heroUseSaddle(game.inventory[0], 1, 0); // east onto pony
        const msg = game._pending_message;
        if (successWanted && /You put the saddle on the pony\./.test(msg)) return seed;
        if (!successWanted && /The pony resists!/.test(msg)) return seed;
    }
    throw new Error('no seed found for outcome');
}

test('use_saddle success removes saddle from invent and wears it on the pet (steed.c:123-140)', async () => {
    const seed = await seedWithOutcome(true);
    installState(seed);
    const saddle = game.inventory[0];
    const pony = game.level.monsters[0];
    enableRngLog();
    await steed.heroUseSaddle(saddle, 1, 0);
    assert.equal(game._pending_message, 'You put the saddle on the pony.');
    assert.equal(game.context.move, 1);
    assert.ok(!game.inventory.includes(saddle));
    assert.ok(pony.minvent.includes(saddle));
    assert.equal(saddle.owornmask, W_SADDLE);
    assert.ok(pony.saddled);
    assert.ok((pony.misc_worn_check & W_SADDLE) !== 0);
    // hero invent alias shared with the pet food scanner (dogmove.c invent walk)
    assert.equal(game._pet_food_scan_inventory, game.inventory);
});

test('use_saddle resist keeps the saddle in the hero inventory (steed.c:137)', async () => {
    const seed = await seedWithOutcome(false);
    installState(seed);
    const saddle = game.inventory[0];
    const pony = game.level.monsters[0];
    enableRngLog();
    await steed.heroUseSaddle(saddle, 1, 0);
    assert.equal(game._pending_message, 'The pony resists!');
    assert.ok(game.inventory.includes(saddle));
    assert.ok(!pony.minvent);
});

test('use_saddle refuses wrong targets without consuming RNG (steed.c:55-89)', async () => {
    installState(42);
    enableRngLog();
    // saddle the hero's own square
    await steed.heroUseSaddle(game.inventory[0], 0, 0);
    assert.equal(game._pending_message, 'Saddle yourself?  Very funny...');
    assert.equal(game.context.move, 0);
    assert.equal(getRngLog().length, 0);
    // empty square
    await steed.heroUseSaddle(game.inventory[0], -1, 0);
    assert.equal(game._pending_message, 'I see nobody there.');
    assert.equal(game.context.move, 1);
    // unsaddlable creature (a kitten-sized monster class outside the list)
    const pony = game.level.monsters[0];
    pony.data = { name: 'grid bug', mlet: 'x', mlevel: 0 };
    game._pending_message = '';
    await steed.heroUseSaddle(game.inventory[0], 1, 0);
    assert.equal(game._pending_message, "You can't saddle such a creature.");
    assert.equal(getRngLog().length, 0);
});

test('kick_steed gallop: tameness-- then either buck or rn1(20,30) (steed.c:433-448)', async () => {
    // find a seed whose first rnd(20) is low enough that ulevel+mtame-1 clears it
    for (let seed = 1; seed < 20000; seed++) {
        installState(seed, { mounted: true });
        const pony = game.level.monsters[0];
        pony.mtame = 8;
        game.inventory = [];
        enableRngLog();
        await steed.kickSteed();
        const names = logNames();
        if (names[0] === 'rnd(20)' && names[1] === 'rn2(20)' && /gallops!/.test(game._pending_message)) {
            assert.equal(pony.mtame, 7);
            assert.equal(game._pending_message, 'You kick the pony.  The pony gallops!');
            assert.ok(game.u.ugallop >= 30 && game.u.ugallop <= 49);
            assert.equal(game.context.move, 1);
            return;
        }
    }
    throw new Error('no gallop seed found');
});

test('legs_in_no_shape message wording (do.c:2408-2425)', () => {
    installState(7);
    game.u._woundedLegTurns = 5;
    game.u._woundedLegSide = '';
    assert.equal(steed.heroLegsInNoShapeMessage('riding'), 'Your legs are in no shape for riding.');
    game.u._woundedLegSide = 'left';
    assert.equal(steed.heroLegsInNoShapeMessage('riding'), 'Your left leg is in no shape for riding.');
});
