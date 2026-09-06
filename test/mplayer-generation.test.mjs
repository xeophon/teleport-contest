import assert from 'node:assert/strict';
import test from 'node:test';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import * as generation from '../js/mklev.js';
import { MONS, PM_ARCHEOLOGIST, PM_WIZARD } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM } from '../js/const.js';

function setup(seed) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { moves: 100, in_mklev: true, inventory: [], level: new GameMap(),
        u: { ux: 1, uy: 1, ulevel: 20, uhave: {}, uz: { dnum: 0, dlevel: 10 }, ualign: { type: 0, record: 10 } },
        dungeons: [{ name: 'The Dungeons of Doom', depth_start: 1 }] });
    for (let x=1;x<80;x++) for (let y=0;y<21;y++) g.level.at(x,y).typ=ROOM;
    return g;
}

for (const species of MONS.slice(PM_ARCHEOLOGIST, PM_WIZARD + 1)) {
    test(`${species.name} player generation retains makemon then rolls level, hit dice and unused armor choices in C order`, async () => {
        assert.equal(typeof generation.mk_mplayer, 'function');
        for (const seed of [1,19,731]) {
            setup(seed);
            const ptr = generation.__mklevTestHooks.questMonsterData(species);
            await generation.makemon(ptr, 20, 10, 0);
            const initial = [...getRngLog()];
            setup(seed);
            const mon = await generation.mk_mplayer(ptr, 20, 10);
            const calls = getRngLog();
            assert.deepEqual(calls.slice(0, initial.length), initial);
            let index = initial.length;
            const roll = (n, kind = 'rn2') => {
                assert.ok(calls[index]?.startsWith(`${kind}(${n})=`), `${species.name} seed ${seed}: wanted ${kind}(${n}), got ${calls[index]}`);
                return Number(calls[index++].split('=')[1]);
            };
            const level = roll(16, 'rnd');
            const hp = 30 + roll(`${level},10`, 'd');
            assert.equal(mon.m_lev, level); assert.equal(mon.mhp, hp); assert.equal(mon.mhpmax, hp);
            if (roll(2)) roll(582, 'rnd'); // objects.h: SPEAR through BULLWHIP probabilities
            roll(10); // ten zero-probability dragon scale mails
            if (roll(8)) roll(74, 'rnd'); // OILSKIN_CLOAK through CLOAK_OF_DISPLACEMENT
            if (roll(8)) roll(66, 'rnd'); // ELVEN_LEATHER_HELM through HELM_OF_TELEPATHY
            if (roll(8)) roll(20, 'rnd'); // ELVEN_SHIELD through SHIELD_OF_REFLECTION
            assert.equal(mon.mpeaceful, 0);
            assert.ok(mon.minvent.length >= 3);
            assert.ok(mon.minvent.every(obj => obj.otyp !== 0));
            assert.ok(!mon.givenName, 'ordinary mplayers do not receive endgame developer names');
        }
    });
}

test('ordinary mplayer construction rejects a non-player species without consuming RNG', async () => {
    assert.equal(typeof generation.mk_mplayer, 'function');
    setup(1);
    assert.equal(await generation.mk_mplayer(MONS[0], 20, 10), null);
    assert.deepEqual(getRngLog(), []);
});

test('player supplies carry usable source identities for offensive wands and monster-creation scrolls', async () => {
    setup(19);
    for (const [otyp, index] of [[307,23], [308,22], [309,20], [310,21], [311,24]]) {
        const obj = generation.mksobj(otyp, true, false);
        assert.equal(obj.cls, 'wand'); assert.equal(obj.wandIndex, index);
        assert.equal(obj.glyph, '/');
    }
    for (const [otyp, index] of [[292,6], [290,17]]) {
        const obj = generation.mksobj(otyp, true, false);
        assert.equal(obj.cls, 'scroll'); assert.equal(obj.scrollIndex, index);
        assert.equal(obj.glyph, '?');
    }
});
