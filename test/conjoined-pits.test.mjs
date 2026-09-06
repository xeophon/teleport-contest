import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { conjoinedPits, digTypeOf, horizontalUndiggableResult, pickCanReach } from '../js/dig.js';
import { DIR_180, DIGTYP_BOULDER, DIGTYP_UNDIGGABLE, N_DIRS, PIT, ROOM, SPIKED_PIT, TT_PIT, xdir, ydir } from '../js/const.js';

const pick = { otyp: 10025, kind: 'pick-axe' };

function installPits(direction, heroBits = 0, targetBits = 0) {
    resetGame();
    game.u = { ux: 10, uy: 10, utrap: 5, utraptype: TT_PIT };
    game.level = new GameMap();
    const heroPit = { tx: 10, ty: 10, ttyp: PIT, tseen: true, conjoined: heroBits };
    const targetPit = { tx: 10 + xdir[direction], ty: 10 + ydir[direction], ttyp: SPIKED_PIT, tseen: true, conjoined: targetBits };
    game.level.traps.push(heroPit, targetPit);
    game.level.at(targetPit.tx, targetPit.ty).typ = ROOM;
    return { heroPit, targetPit };
}

// C ref: trap.c conjoined_pits() requires matching direction bits in both pits.
test('a pick reaches across exactly reciprocal pit connections in all eight directions', () => {
    for (let direction = 0; direction < N_DIRS; direction++) {
        const { targetPit } = installPits(direction, 1 << direction, 1 << DIR_180(direction));
        assert.equal(pickCanReach(pick, targetPit.tx, targetPit.ty), true);
        targetPit.conjoined = 1 << direction;
        assert.equal(pickCanReach(pick, targetPit.tx, targetPit.ty), false);
        targetPit.conjoined = 0;
        assert.equal(pickCanReach(pick, targetPit.tx, targetPit.ty), false);
    }
});

// C ref: dig.c use_pick_axe2() connects the pits before reporting cleared debris.
test('clearing pit debris opens the reciprocal edge and enables subsequent boulder digging', () => {
    for (let direction = 0; direction < N_DIRS; direction++) {
        const oldHeroBits = 1 << ((direction + 1) % N_DIRS);
        const oldTargetBits = 1 << ((DIR_180(direction) + 1) % N_DIRS);
        const { heroPit, targetPit } = installPits(direction, oldHeroBits, oldTargetBits);
        const { tx: x, ty: y } = targetPit;

        assert.equal(horizontalUndiggableResult(pick, x, y).message,
            'You clear some debris from between the pits.');
        assert.equal(heroPit.conjoined, oldHeroBits | (1 << direction));
        assert.equal(targetPit.conjoined, oldTargetBits | (1 << DIR_180(direction)));
        assert.equal(horizontalUndiggableResult(pick, x, y).message,
            'You swing your pick-axe, but the rubble has no place to go.');

        game.level.objects.push({ otyp: 465, kind: 'boulder', ox: x, oy: y });
        assert.equal(digTypeOf(pick, x, y), DIGTYP_BOULDER);
        heroPit.conjoined = oldHeroBits;
        assert.equal(digTypeOf(pick, x, y), DIGTYP_UNDIGGABLE);
    }
});

test('flying does not let a hero trapped in a pit reach across disconnected pits', () => {
    const { targetPit } = installPits(4, 1, 1);
    game.u.flying = true;
    assert.equal(pickCanReach(pick, targetPit.tx, targetPit.ty), false);
    game.u.utrap = 0;
    assert.equal(pickCanReach(pick, targetPit.tx, targetPit.ty), true);
});

test('pit connections require two actual pits at valid, different map locations', () => {
    const { heroPit, targetPit } = installPits(4, 1 << 4, 1);
    assert.equal(conjoinedPits(targetPit, heroPit), true);
    assert.equal(conjoinedPits(heroPit, heroPit), false);
    assert.equal(conjoinedPits(targetPit, null), false);
    assert.equal(conjoinedPits({ ...targetPit, ttyp: ROOM }, heroPit), false);
    assert.equal(conjoinedPits({ ...targetPit, tx: 0 }, heroPit), false);
});
