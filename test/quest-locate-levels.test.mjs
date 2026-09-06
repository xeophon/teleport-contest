import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ALTAR, AM_SHRINE, ROOM, TEMPLE, ICE, ICED_POOL, IS_POOL, W_NONDIGGABLE, MAGIC_TRAP, ANTI_MAGIC } from '../js/const.js';

async function buildLocate(role, seed = 1) {
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
        uz: { dnum: 0, dlevel: 3 }, ualign: { type: 0, record: 10 }, ualignbase: [0, 0] };
    g.level = new GameMap();
    await mklev();
    return g;
}

const locates = { Ranger: 'Ran', Rogue: 'Rog', Valkyrie: 'Val', Caveman: 'Cav', Healer: 'Hea', Knight: 'Kni' };
for (const [role, prefix] of Object.entries(locates)) {
    test(`${prefix}-loca creates source population, objects, and both stairs through mklev`, async () => {
        const source = await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-loca.lua`, import.meta.url), 'utf8');
        const required = new Map();
        for (const match of source.matchAll(/des\.monster\(\s*(?:\{\s*id\s*=\s*)?"([^"]+)"/g))
            if (match[1].length > 1) required.set(match[1], (required.get(match[1]) || 0) + 1);
        for (const seed of [1, 19, 731]) {
            const g = await buildLocate(role, seed);
            for (const [name, count] of required)
                assert.ok(g.level.monsters.filter(mon => mon.data.name === name || mon.chamBase === name).length >= count, `${prefix} seed ${seed} requires ${count} ${name}`);
            assert.ok(g.level.objects.length >= [...source.matchAll(/des\.object\(/g)].length);
            assert.ok(g.level.upstair && g.level.dnstair);
            assert.notDeepEqual(g.level.upstair, g.level.dnstair);
            assert.equal(!!g.level.flags.hardfloor, source.includes('"hardfloor"'));
            assert.equal(g.in_mklev, false);
        }
    });
}

test('Ranger locate puts the sleeping wumpus on the downstairs', async () => {
    const g = await buildLocate('Ranger');
    const wumpus = g.level.monsters.find(mon => mon.data.name === 'wumpus');
    assert.deepEqual([wumpus?.mx, wumpus?.my], [g.level.dnstair.x, g.level.dnstair.y]);
    assert.equal(wumpus.msleeping, 1);
    assert.deepEqual([Math.abs(g.level.dnstair.x - g.level.upstair.x), Math.abs(g.level.dnstair.y - g.level.upstair.y)], [2, 13]);
});

test('Valkyrie locate keeps off-map upstairs, unflipped coordinates, and pool-backed ice', async () => {
    const g = await buildLocate('Valkyrie');
    assert.deepEqual(g.level.upstair, { x: 69, y: 19 });
    assert.deepEqual(g.level.dnstair, { x: 41, y: 11 });
    assert.ok(g.level.locations.flat().some(loc => loc.typ === ICE && loc.icedpool === ICED_POOL));
    assert.deepEqual(getRngLog().slice(0, 4).map(entry => entry.split('=')[0]), ['rn2(3)', 'rn2(2)', 'rn2(2)', 'rn2(77)']);
});

test('Caveman locate builds the irregular lit chamber and opens all invisible boundaries', async () => {
    const g = await buildLocate('Caveman');
    const room = g.level.rooms.find(room => room.irregular);
    assert.ok(room);
    assert.equal(room.rlit, 1);
    const source = await readFile(new URL('../nethack-c/upstream/dat/Cav-loca.lua', import.meta.url), 'utf8');
    const rows = /des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
    const dx = Math.sign(g.level.dnstair.x - g.level.upstair.x);
    const dy = Math.sign(g.level.dnstair.y - g.level.upstair.y);
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== 'B') continue;
        const loc = g.level.at(g.level.upstair.x + dx * (x - 4), g.level.upstair.y + dy * (y - 3));
        assert.equal(loc.typ, ROOM, `boundary ${x},${y} becomes floor after region creation`);
    }
});

for (const [role, alignment] of [['Healer', -1], ['Knight', 0]]) {
    test(`${role} locate shrine creates a living aligned priest attached to its temple`, async () => {
        const g = await buildLocate(role);
        const temple = g.level.rooms.find(room => room.rtype === TEMPLE);
        assert.ok(temple);
        assert.equal(g.level.flags.has_temple, true);
        const priests = g.level.monsters.filter(mon => mon.ispriest);
        assert.equal(priests.length, 1);
        const priest = priests[0];
        assert.equal(priest.shrine.align, alignment);
        const altar = g.level.at(priest.shrine.x, priest.shrine.y);
        assert.equal(altar.typ, ALTAR);
        assert.ok(altar.flags & AM_SHRINE);
        assert.equal(priest.mpeaceful, 1);
        assert.equal(priest.msleeping, 0);
        assert.ok(priest.minvent.filter(obj => obj.cls === 'spellbook').length >= 2);
    });
}

test('Knight locate places its fixed magic trap perimeter before random inhabitants', async () => {
    const g = await buildLocate('Knight');
    const source = await readFile(new URL('../nethack-c/upstream/dat/Kni-loca.lua', import.meta.url), 'utf8');
    const dx = Math.sign(g.level.upstair.x - g.level.dnstair.x);
    const dy = Math.sign(g.level.dnstair.y - g.level.upstair.y);
    for (const [, sx, sy] of source.matchAll(/des\.trap\("magic",(\d+),(\d+)\)/g)) {
        const x = g.level.dnstair.x + dx * (+sx - 18), y = g.level.upstair.y + dy * +sy;
        const trap = g.level.traps.find(trap => trap.tx === x && trap.ty === y);
        // mktrap rejects the transparent map cells that remain swamp water;
        // subsequent random anti-magic traps may replace an existing trap.
        if (IS_POOL(g.level.at(x, y).typ)) assert.equal(trap, undefined);
        else assert.ok([MAGIC_TRAP, ANTI_MAGIC].includes(trap?.ttyp), `trap at source ${sx},${sy}`);
    }
    assert.equal(g.level.traps.filter(trap => trap.ttyp === ANTI_MAGIC).length, 7);
    for (const trap of g.level.traps) assert.ok(!IS_POOL(g.level.at(trap.tx, trap.ty).typ));
});

test('Rogue locate supplies a cursed teleport scroll in its otherwise sealed chamber', async () => {
    const g = await buildLocate('Rogue');
    const scroll = g.level.objects.find(obj => obj.otyp === 287 && obj.cursed);
    assert.ok(scroll);
    assert.equal(scroll.spe, 0);
    assert.ok(g.level.locations.flat().some(loc => loc.wall_info & W_NONDIGGABLE));
});
