import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev } from '../js/mklev.js';
import { initRng, enableRngLog } from '../js/rng.js';
import { ALTAR, A_NONE, Amask2align, ROOM, STAIRS, SDOOR, MOAT, LAVAPOOL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DB_UNDER, DB_LAVA, DB_DIR, DB_NORTH, DB_SOUTH, DBWALL, DOOR, D_NODOOR, FIRE_TRAP } from '../js/const.js';

async function buildGoal(role, seed = 1) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { moves: 100, flags: { bones: false }, inventory: [], _startup_role: role,
        urole: { name: { m: role } }, dungeons: [{ name: 'The Quest', num_dunlevs: 6, depth_start: 10 }],
        specialLevels: [{ name: 'x-goal', dnum: 0, dlevel: 6 }], quest_dnum: 0,
        u: { ux: 40, uy: 10, ulevel: 20, uhave: {}, uz: { dnum: 0, dlevel: 6 },
            ualign: { type: 0, record: 10 }, ualignbase: [0, 0] }, level: new GameMap() });
    await mklev(); return g;
}

for (const [role, prefix, nemesis, positions] of [
    ['Rogue', 'Rog', 'Master Assassin', [[38, 10]]],
    ['Monk', 'Mon', 'Master Kaen', [[14, 4], [13, 7]]],
    ['Valkyrie', 'Val', 'Lord Surtur', [[17, 8]]],
]) {
    test(`${prefix}-goal preserves all source floor, water, lava and door geometry`, async () => {
        const source = await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-goal.lua`, import.meta.url), 'utf8');
        const rows = /des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
        const expected = { '.': [ROOM, STAIRS, ALTAR], '}': [MOAT], '+': [DOOR], S: [SDOOR],
            L: [LAVAPOOL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN] };
        for (const seed of [1, 19, 731]) {
            const g = await buildGoal(role, seed);
            const boss = g.level.monsters.find(mon => mon.data.name === nemesis);
            assert.ok(boss);
            let fewest = Infinity;
            for (const [sx, sy] of positions) for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
                let mismatch = 0;
                for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
                    if (!expected[rows[y][x]]) continue;
                    const typ = g.level.at(boss.mx + dx * (x - sx), boss.my + dy * (y - sy))?.typ;
                    if (!expected[rows[y][x]].includes(typ)) mismatch++;
                }
                fewest = Math.min(fewest, mismatch);
            }
            assert.equal(fewest, 0, `${prefix} source geometry seed ${seed}`);
        }
    });
}

for (const [role, nemesis, artifact, prefix] of [
    ['Rogue', 'Master Assassin', 'The Master Key of Thievery', 'Rog'],
    ['Monk', 'Master Kaen', 'The Eyes of the Overworld', 'Mon'],
    ['Valkyrie', 'Lord Surtur', 'The Orb of Fate', 'Val'],
]) {
    test(`${prefix}-goal dispatch places its nemesis on the quest artifact`, async () => {
        for (const seed of [1, 19, 731]) {
            const g = await buildGoal(role, seed);
            const boss = g.level.monsters.find(mon => mon.data.name === nemesis);
            const prize = g.level.objects.find(obj => obj.artifact === artifact);
            assert.ok(boss && prize);
            assert.deepEqual([boss.mx, boss.my], [prize.ox, prize.oy]);
            assert.ok(boss.minvent.some(obj => obj.kind === 'Bell of Opening'));
            assert.ok(g.level.upstair);
            assert.equal(g.level.dnstair, undefined);
            assert.equal(g.in_mklev, false);
        }
    });
}

test('Monk goal shares one Lua random choice between the artifact, nemesis, and unaligned altar', async () => {
    const choices = new Set();
    for (const seed of [1, 2, 3, 19, 731]) {
        const g = await buildGoal('Monk', seed);
        const prize = g.level.objects.find(obj => obj.artifact === 'The Eyes of the Overworld');
        assert.ok(prize);
        const altar = g.level.at(prize.ox, prize.oy);
        assert.equal(altar.typ, ALTAR);
        assert.equal(Amask2align(altar.flags), A_NONE);
        const delta = [Math.abs(prize.ox - g.level.upstair.x), Math.abs(prize.oy - g.level.upstair.y)];
        assert.ok(['6,1', '7,2'].includes(delta.join(',')));
        choices.add(delta.join(','));
        assert.equal(g.level.monsters.filter(mon => mon.data.name === 'earth elemental').length, 9);
        assert.equal(g.level.monsters.filter(mon => mon.data.name === 'xorn').length, 9);
        assert.ok(g.level.traps.filter(trap => trap.ttyp === FIRE_TRAP).length >= 4);
    }
    assert.equal(choices.size, 2);
});

test('Rogue goal creates the chameleon tin and delayed upstairs inside the source levregion', async () => {
    for (const seed of [1, 19, 731]) {
        const g = await buildGoal('Rogue', seed);
        const boss = g.level.monsters.find(mon => mon.data.name === 'Master Assassin');
        const tin = g.level.objects.find(obj => obj.kind === 'tin' && obj.corpsenm?.name === 'chameleon');
        assert.ok(tin && boss);
        const dx = Math.sign(boss.mx - tin.ox), dy = Math.sign(tin.oy - boss.my);
        const sourceX = 38 + dx * (g.level.upstair.x - boss.mx);
        const sourceY = 10 + dy * (g.level.upstair.y - boss.my);
        // The inclusion is level-relative, while exclusion defaults map-relative.
        assert.ok(sourceX >= 0 && sourceX <= 14);
        assert.ok(sourceY >= 0 && sourceY <= 20);
        assert.ok(!(sourceX >= 1 && sourceX <= 4 && sourceY >= 18 && sourceY <= 20));
        assert.equal(g.level.monsters.filter(mon => mon.data.name === 'shark').length, 4);
    }
});

test('Valkyrie goal drawbridges retain lava and a portcullis pointing toward the inner fortress', async () => {
    const states = new Set();
    for (const seed of [1, 2, 3, 19, 731]) {
        const g = await buildGoal('Valkyrie', seed);
        const boss = g.level.monsters.find(mon => mon.data.name === 'Lord Surtur');
        assert.ok(boss);
        const bridges = [];
        for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) {
            const loc = g.level.at(x, y);
            if ([DRAWBRIDGE_UP, DRAWBRIDGE_DOWN].includes(loc.typ)) bridges.push({ x, y, loc });
        }
        assert.equal(bridges.length, 2);
        for (const { x, y, loc } of bridges) {
            assert.equal(x, boss.mx);
            assert.equal(Math.abs(y - boss.my), 6);
            assert.equal((loc.drawbridgemask ?? loc.flags) & DB_UNDER, DB_LAVA);
            const dir = (loc.drawbridgemask ?? loc.flags) & DB_DIR;
            assert.ok([DB_NORTH, DB_SOUTH].includes(dir));
            const portcullis = g.level.at(x, y + (dir === DB_NORTH ? -1 : 1));
            assert.equal(portcullis.typ, loc.typ === DRAWBRIDGE_UP ? DBWALL : DOOR);
            if (loc.typ === DRAWBRIDGE_DOWN) assert.equal(portcullis.doormask, D_NODOOR);
            states.add(loc.typ);
        }
        assert.equal(g.level.objects.find(obj => obj.artifact === 'The Orb of Fate').spe, 5);
    }
    assert.equal(states.size, 2);
});
