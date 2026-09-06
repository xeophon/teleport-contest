import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { MONS, PM_FLESH_GOLEM, PM_STONE_GOLEM, PM_COCKATRICE, AT_BITE, AD_PHYS } from '../js/permonst.js';
import { G_GENOD, G_EXTINCT } from '../js/const.js';
import { mdamagem, setMhitmHooks, M_ATTK_AGR_DIED } from '../js/mhitm.js';

// C mon.c:poly_when_stoned and mhitm.c:mdamagem: only genocide prevents
// a non-stone golem's petrification from becoming a stone-golem polymorph.
for (const flags of [0, G_EXTINCT, G_GENOD, G_EXTINCT | G_GENOD]) {
    test(`stone-golem vitality flags ${flags} gate petrification polymorph independently of photo records`, () => {
        resetGame(); initRng(41);
        setMhitmHooks({ vis: () => false, monstone: null, polyToStone: null, monkilled: null });
        game.u = { ux: 1, uy: 1 };
        const attacker = { data: MONS[PM_FLESH_GOLEM], mx: 10, my: 10, mhp: 40, mhpmax: 40, minvent: [] };
        const defender = { data: MONS[PM_COCKATRICE], mx: 11, my: 10, mhp: 10, mhpmax: 10, minvent: [] };
        game.level = { monsters: [attacker, defender], objects: [] };
        game.mvitals = [];
        const record = { mvflags: flags, seen_close: 1, photographed: 1 };
        game.mvitals[PM_STONE_GOLEM] = record;
        const result = mdamagem(attacker, defender, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 });
        if (flags & G_GENOD) {
            assert.ok(result & M_ATTK_AGR_DIED);
            assert.equal(attacker.data.name, 'flesh golem');
            assert.ok(attacker.mhp <= 0);
        } else {
            assert.equal(result & M_ATTK_AGR_DIED, 0);
            assert.equal(attacker.data.name, 'stone golem');
            assert.ok(attacker.mhp > 0);
        }
        assert.deepEqual(record, { mvflags: flags, seen_close: 1, photographed: 1 });
    });
}
