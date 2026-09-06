import assert from 'node:assert/strict';
import test from 'node:test';
import { clearBypasses } from '../js/worn.js';

// worn.c clears all live object chains at the end of askchain or a polymorph
// beam, including objects moved into nested containers by the current action.
test('clear_bypasses visits live ownership, bill/deleted chains and floating punishment', () => {
    const g = {
        context: { bypasses: true },
        inventory: [{ bypass: 1, contents: [{ bypass: 1, cobj: [{ bypass: 1 }] }] }],
        level: { objects: [{ bypass: 1 }], buriedobjlist: [{ bypass: 1 }],
            monsters: [{ mhp: 4, minvent: [{ bypass: 1, contents: [{ bypass: 1 }] }] }] },
        migrating_objs: [{ bypass: 1 }], migrating_mons: [{ minvent: [{ bypass: 1 }] }],
        billobjs: [{ bypass: 1, contents: [{ bypass: 1 }] }], objs_deleted: [{ bypass: 1 }],
        mydogs: [{ minvent: [{ bypass: 1 }] }],
        u: { uball: { bypass: 1 }, uchain: { bypass: 1 } },
    };
    clearBypasses(g);
    assert.equal(JSON.stringify(g).includes('"bypass":1'), false);
    assert.equal(g.context.bypasses, false);
});

test('clear_bypasses leaves dead monsters and saved levels untouched', () => {
    const dead = { mhp: 0, minvent: [{ bypass: 1 }] }, saved = { objects: [{ bypass: 1 }] };
    const g = { context: { bypasses: true }, level: { monsters: [dead] }, _saved_levels: new Map([[2, saved]]) };
    clearBypasses(g);
    assert.equal(dead.minvent[0].bypass, 1); assert.equal(saved.objects[0].bypass, 1);
});

test('clear_bypasses resets only live current-level long-worm polymorph markers', () => {
    const make = () => ({ mhp: 4, data: { name: 'long worm' }, mextra: { mcorpsenm: 116 } });
    const live = make(), dead = { ...make(), mhp: 0 }, migrating = make();
    const other = { ...make(), data: { name: 'purple worm' } };
    clearBypasses({ context: {}, level: { monsters: [live, dead, other] }, migrating_mons: [migrating] });
    assert.equal(live.mextra.mcorpsenm, -1);
    for (const mon of [dead, other, migrating]) assert.equal(mon.mextra.mcorpsenm, 116);
});
