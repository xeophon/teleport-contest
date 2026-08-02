import test from 'node:test';
import assert from 'node:assert/strict';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev } from '../js/mklev.js';
import { init_dungeons_rng } from '../js/dungeon.js';
import { initRng } from '../js/rng.js';
import { COLNO, ROWNO, MOAT, DRAWBRIDGE_UP, BURN } from '../js/const.js';

const CHEST_OTYP = 215;            // C ref: mklev.js local CHEST
const SCR_SCARE_MONSTER = 279;     // C ref: mklev.js local SCR_SCARE_MONSTER

async function buildCastle(seed) {
    const g = resetGame();
    initRng(seed);
    init_dungeons_rng();
    const special = g.specialLevels.find(level => level.name === 'castle');
    g.moves = 100;
    g.flags = {};
    g.inventory = [];
    g.in_mklev = true;
    g.u = {
        ux: 40, uy: 10, ulevel: 25,
        uz: { dnum: special.dnum, dlevel: special.dlevel },
        uhave: {}, ualign: { type: 0, record: 10 },
    };
    g.level = new GameMap();
    await mklev();
    return g;
}

// C refs: dat/castle.lua:141-152 — the wand-of-wishing chest, its burned-in
// "Elbereth" engraving and the cursed scare-monster scroll all share one
// of the four tower squares (place:rndcoord).  The engraving starts
// unrevealed (sp_lev.c lspo_engraving default) and is only painted once
// mapped (display.c:313 map_engraving, invoked for all engravings by
// wizcmds.c:190 wiz_map) or when the hero reads the square.
test('castle tower square carries unrevealed Elbereth engraving', async () => {
    for (const seed of [1, 7, 9012]) {
        const g = await buildCastle(seed);
        const scrolls = (g.level.objects || []).filter(obj =>
            obj.otyp === SCR_SCARE_MONSTER && obj.cursed);
        assert.equal(scrolls.length, 1,
            `seed ${seed}: exactly one cursed scare-monster scroll on castle`);
        const { ox, oy } = scrolls[0];

        const chest = (g.level.objects || []).find(obj =>
            obj.otyp === CHEST_OTYP && obj.ox === ox && obj.oy === oy);
        assert.ok(chest, `seed ${seed}: wishing chest missing at tower ${ox},${oy}`);
        assert.equal(chest.olocked, true);
        assert.equal(chest.otrapped, false);

        const engr = (g.level.engravings || []).find(e => e.x === ox && e.y === oy);
        assert.ok(engr, `seed ${seed}: no Elbereth engraving at tower ${ox},${oy}`);
        assert.equal(engr.text, 'Elbereth');
        assert.equal(engr.type, BURN);
        assert.equal(engr.erevealed, false,
            `seed ${seed}: tower engraving must start unrevealed`);

        // dat/castle.lua has exactly one des.engraving call.
        assert.equal((g.level.engravings || []).length, 1,
            `seed ${seed}: castle should have exactly one scripted engraving`);
    }
});

// C ref: dat/castle.lua:85 des.drawbridge({ dir = "east", state = "closed",
// x=05,y=08 }) + mklev.c create_drawbridge — the moat is MOAT terrain and
// the bridge head sits in it as DRAWBRIDGE_UP before any flip.
test('castle keeps moat and a closed drawbridge somewhere on the lattice', async () => {
    const g = await buildCastle(9012);
    let moat = 0, bridgeHeads = 0;
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const typ = g.level.at(x, y)?.typ;
            if (typ === MOAT) moat++;
            if (typ === DRAWBRIDGE_UP) bridgeHeads++;
        }
    assert.ok(moat > 0, 'castle moat missing');
    assert.ok(bridgeHeads > 0, 'castle drawbridge missing');
});
