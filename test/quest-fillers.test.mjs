import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { QUEST_FILLERS } from '../js/quest_filler_data.js';
import { STONE, ROOM, STAIRS, DOOR, SDOOR, TREE, POOL, ICE, LAVAPOOL, IS_POOL } from '../js/const.js';

async function buildFiller(role, suffix, seed = 1) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.moves = 100;
    g.flags = { bones: false };
    g.inventory = [];
    g._startup_role = role;
    g.urole = { name: { m: role } };
    g.dungeons = [{ name: 'The Quest', num_dunlevs: 6, depth_start: 10 }];
    g.specialLevels = [{ name: 'x-loca', dnum: 0, dlevel: 3 }];
    g.quest_dnum = 0;
    g.u = { ux: 40, uy: 10, ulevel: 20, uhave: {},
        uz: { dnum: 0, dlevel: suffix === 'a' ? 2 : 4 }, ualign: { type: 0, record: 10 } };
    g.level = new GameMap();
    await mklev();
    return g;
}

test('quest filler data regenerates exactly from upstream declarative Lua', () => {
    execFileSync(process.execPath, ['tools/generate-quest-fillers.mjs', '--check'], { cwd: new URL('..', import.meta.url) });
});

for (const [role, fillers] of Object.entries(QUEST_FILLERS)) {
    for (const [suffix, program] of Object.entries(fillers)) {
        test(`${program.source} dispatch preserves required source inhabitants and stairs`, async () => {
            const source = await readFile(new URL(`../nethack-c/upstream/dat/${program.source}`, import.meta.url), 'utf8');
            const required = new Map();
            for (const match of source.matchAll(/des\.monster\(\s*(?:\{\s*id\s*=\s*)?"([^"]+)"/g)) {
                if (match[1].length > 1) required.set(match[1], (required.get(match[1]) || 0) + 1);
            }
            const roomCount = [...source.matchAll(/des\.room\(/g)].length;
            const observed = new Map();
            for (const seed of [1, 19, 731]) {
                const g = await buildFiller(role, suffix, seed);
                assert.ok(g.level.upstair && g.level.dnstair);
                assert.notDeepEqual(g.level.upstair, g.level.dnstair);
                for (const [name, count] of required) {
                    const actual = g.level.monsters.filter(mon => mon.data?.name === name).length;
                    observed.set(name, Math.max(observed.get(name) || 0, actual));
                    // sp_lev.c:lspo_room skips contents when create_room
                    // cannot place a room. Completed layouts retain all calls.
                    if (!roomCount || g.level.nroom === roomCount)
                        assert.ok(actual >= count, `${program.source} seed ${seed} requires ${count} ${name}`);
                }
                const objects = [...source.matchAll(/des\.object\(\)/g)].length;
                if (!roomCount || g.level.nroom === roomCount)
                    assert.ok(g.level.objects.length >= objects, `${program.source} creates ${objects} objects`);
                if (roomCount) assert.ok(g.level.nroom > 0 && g.level.nroom <= roomCount);
                const bg = /style\s*=\s*"mines"[^}]*bg\s*=\s*"([^"]+)"/.exec(source)?.[1];
                const typ = { T: TREE, P: POOL, I: ICE, L: LAVAPOOL }[bg];
                if (typ) assert.ok(g.level.locations.some(column => column.some(loc => loc.typ === typ)), `source terrain ${bg}`);
                assert.equal(g.in_mklev, false);
            }
            for (const [name, count] of required)
                assert.ok(observed.get(name) >= count, `${program.source} must populate ${count} ${name} on a completed layout`);
        });
    }
}

test('Samurai lower filler keeps the fixed Lua map geometry', async () => {
    const source = await readFile(new URL('../nethack-c/upstream/dat/Sam-filb.lua', import.meta.url), 'utf8');
    const rows = /des\.map\(\[\[\n([\s\S]+?)\n\]\]\)/.exec(source)[1].split('\n');
    const g = await buildFiller('Samurai', 'b');
    // sp_lev.c:lspo_map centers the 60x16 map at odd coordinates (11,3).
    for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
            const typ = g.level.at(11 + x, 3 + y).typ;
            if (rows[y][x] === '.') assert.ok([ROOM, STAIRS].includes(typ), `${x},${y} is floor`);
            if ('+S'.includes(rows[y][x])) assert.ok([DOOR, SDOOR].includes(typ), `${x},${y} is a door`);
            if (rows[y][x] === ' ') assert.equal(typ, STONE, `${x},${y} is stone`);
        }
    }
});

for (const suffix of ['a', 'b']) {
    test(`Healer filler ${suffix} places water-loving eels in source pools`, async () => {
        const g = await buildFiller('Healer', suffix);
        const eels = g.level.monsters.filter(mon => /eel$/.test(mon.data.name));
        assert.ok(eels.length >= (suffix === 'a' ? 3 : 7));
        for (const mon of eels) assert.ok(IS_POOL(g.level.at(mon.mx, mon.my).typ), mon.data.name);
    });
}

for (const [role, expected] of [
    ['Caveman', ['rn2(3)', 'rn2(2)', 'rn2(2)', 'rn2(2)']],
    ['Healer', ['rn2(3)', 'rn2(2)', 'rn2(2)', 'rn2(77)']],
    ['Monk', ['rn2(3)', 'rn2(2)', 'rn2(100)']],
]) {
    test(`${role} initialization follows C shuffle, light, and layout RNG order`, async () => {
        await buildFiller(role, 'a');
        assert.deepEqual(getRngLog().slice(0, expected.length).map(entry => entry.split('=')[0]), expected);
    });
}

test('quest layout and population are deterministic and vary with the live seed', async () => {
    const snapshots = [];
    for (const seed of [19, 19, 731]) {
        const g = await buildFiller('Ranger', 'a', seed);
        snapshots.push({ terrain: g.level.locations.map(col => col.map(loc => loc.typ)),
            monsters: g.level.monsters.map(mon => [mon.data.name, mon.mx, mon.my]), rng: [...getRngLog()] });
    }
    assert.deepEqual(snapshots[0], snapshots[1]);
    assert.notDeepEqual(snapshots[0].terrain, snapshots[2].terrain);
});
