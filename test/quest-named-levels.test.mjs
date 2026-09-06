import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev } from '../js/mklev.js';
import { MONS } from '../js/permonst.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ALTAR, AM_SHRINE, D_LOCKED, DOOR, SDOOR, ROOM, STAIRS, POOL, THRONE, IS_POOL, W_NONDIGGABLE } from '../js/const.js';
import { parseQuestLua } from '../tools/quest-lua-parser.mjs';

async function buildQuest(role, stage, seed = 1, changes = {}) {
    const g = resetGame();
    initRng(seed);
    enableRngLog();
    g.moves = 100;
    g.flags = { bones: false };
    g.inventory = [];
    g._startup_role = role;
    g.urole = { name: { m: role } };
    g.dungeons = [{ name: 'The Quest', num_dunlevs: 6, depth_start: 10 }];
    const dlevel = { strt: 1, loca: 3, goal: 6 }[stage];
    g.specialLevels = [{ name: `x-${stage}`, dnum: 0, dlevel }];
    g.quest_dnum = 0;
    g.u = { ux: 40, uy: 10, ulevel: 20, uhave: {},
        uz: { dnum: 0, dlevel }, ualign: { type: 0, record: 10 }, ualignbase: [0, 0] };
    g.level = new GameMap();
    Object.assign(g, changes);
    await mklev();
    return g;
}

const goals = [
    ['Caveman', 'Cav', 'Chromatic Dragon', 'The Sceptre of Might', [23, 10]],
    ['Healer', 'Hea', 'Cyclops', 'The Staff of Aesculapius', [20, 6]],
    ['Ranger', 'Ran', 'Scorpius', 'The Longbow of Diana', [37, 10]],
    ['Barbarian', 'Bar', 'Thoth Amon', 'The Heart of Ahriman', [63, 4]],
];

for (const [role, prefix, nemesis, artifactName, sourcePosition] of goals) {
    test(`${prefix}-goal dispatch creates its source nemesis, artifact, and inhabitants`, async () => {
        const source = await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-goal.lua`, import.meta.url), 'utf8');
        for (const seed of [1, 19, 731]) {
            const g = await buildQuest(role, 'goal', seed);
            const mon = g.level.monsters.find(m => m.data.name === nemesis);
            assert.ok(mon, `${nemesis} is required`);
            const canonical = MONS.find(row => row.name === nemesis);
            assert.equal(mon.data.glyph, canonical.sym);
            assert.equal(mon.data.mac, canonical.ac);
            assert.equal(mon.data.mr, canonical.mr);
            assert.equal(mon.data.mmove, canonical.mmove);
            assert.equal(mon.data.attacks.length, canonical.attacks.filter(a => a.aatyp || a.damn || a.damd).length);
            assert.ok(mon.minvent.some(o => o.kind === 'Bell of Opening'), 'nemesis carries the invocation bell');
            assert.equal(mon.mpeaceful, 0);
            const artifact = g.level.objects.find(o => o.artifact === artifactName);
            assert.ok(artifact, `${artifactName} is required`);
            assert.equal(artifact.blessed, true);
            assert.equal(artifact.spe, 0);
            assert.deepEqual([artifact.ox, artifact.oy], [mon.mx, mon.my]);
            assert.ok(g._artifacts_exist.includes(artifactName));
            assert.ok(g.level.upstair);
            assert.ok(!g.level.dnstair);
            assert.equal(g.in_mklev, false);
            const required = new Map();
            for (const match of source.matchAll(/des\.monster\(\s*(?:\{\s*id\s*=\s*)?"([^"]+)"/g)) {
                if (match[1].length > 1) required.set(match[1], (required.get(match[1]) || 0) + 1);
            }
            for (const [name, count] of required)
                assert.ok(g.level.monsters.filter(m => m.data.name === name).length >= count, `${count} ${name}`);
            const up = /des\.stair\("up",\s*(\d+),\s*(\d+)\)/.exec(source);
            if (up) assert.deepEqual([Math.abs(mon.mx - g.level.upstair.x), Math.abs(mon.my - g.level.upstair.y)],
                [Math.abs(sourcePosition[0] - Number(up[1])), Math.abs(sourcePosition[1] - Number(up[2]))]);
        }
    });
    test(`${prefix}-goal preserves every source floor, pool, door and throne under allowed flips`, async () => {
        const source = await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-goal.lua`, import.meta.url), 'utf8');
        const rows = /des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
        const doors = new Set([...source.matchAll(/des\.door\("[^"]+",\s*(\d+),\s*(\d+)\)/g)]
            .map(match => `${Number(match[1])},${Number(match[2])}`));
        for (const seed of [1, 19, 731]) {
            const g = await buildQuest(role, 'goal', seed);
            const mon = g.level.monsters.find(m => m.data.name === nemesis);
            const allowed = { '.': [ROOM, STAIRS, ALTAR], P: [POOL], '+': [DOOR], S: [SDOOR], '\\': [THRONE] };
            const orientations = [];
            for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
                const mismatches = [];
                for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
                    if (!allowed[rows[y][x]]) continue;
                    const loc = g.level.at(mon.mx + dx * (x - sourcePosition[0]), mon.my + dy * (y - sourcePosition[1]));
                    const expected = doors.has(`${x},${y}`) ? [rows[y][x] === 'S' ? SDOOR : DOOR] : allowed[rows[y][x]];
                    if (!expected.includes(loc?.typ)) mismatches.push([x, y, rows[y][x], loc?.typ]);
                }
                orientations.push(mismatches);
            }
            const closest = orientations.sort((a, b) => a.length - b.length)[0];
            assert.equal(closest.length, 0, `${prefix} seed ${seed} source map mismatches: ${JSON.stringify(closest.slice(0, 5))}`);
        }
    });
}

test('Caveman goal preserves its sleeping nemesis and circular source cavern', async () => {
    const g = await buildQuest('Caveman', 'goal');
    const mon = g.level.monsters.find(m => m.data.name === 'Chromatic Dragon');
    assert.equal(mon?.msleeping, 1);
    assert.equal(g.level.monsters.filter(m => m.data.name === 'shrieker').length, 3);
    assert.ok(g.level.locations.some(column => column.some(loc => loc.wall_info & W_NONDIGGABLE)));
});

test('Healer goal preserves the lightning wand and aquatic population', async () => {
    const g = await buildQuest('Healer', 'goal');
    const mon = g.level.monsters.find(m => m.data.name === 'Cyclops');
    const wand = g.level.objects.find(o => o.otyp === 311 && o.ox === mon?.mx && o.oy === mon?.my);
    assert.equal(wand?.cls, 'wand');
    assert.equal(wand?.wandIndex, 24);
    assert.equal(wand?.glyph, '/');
    for (const eel of g.level.monsters.filter(m => /eel$/.test(m.data.name)))
        assert.ok(IS_POOL(g.level.at(eel.mx, eel.my).typ));
});

test('Barbarian goal altar is unattended and noncoaligned; secret doors stay locked', async () => {
    const g = await buildQuest('Barbarian', 'goal');
    const mon = g.level.monsters.find(m => m.data.name === 'Thoth Amon');
    const altar = g.level.at(mon?.mx, mon?.my);
    assert.equal(altar?.typ, ALTAR);
    assert.ok([1, 4].includes(altar.flags));
    assert.equal(altar.flags & AM_SHRINE, 0);
    assert.equal(g.level.monsters.some(m => m.ispriest), false);
    assert.equal(g.level.locations.flat().filter(loc => [DOOR, SDOOR].includes(loc.typ) && loc.doormask === D_LOCKED).length, 2);
    assert.deepEqual(getRngLog().slice(0, 4).map(entry => entry.split('=')[0]), ['rn2(3)', 'rn2(2)', 'rn2(2)', 'rn2(2)']);
});

test('named quest programs regenerate exactly from upstream source', () => {
    execFileSync(process.execPath, ['tools/generate-quest-levels.mjs', '--check'], { cwd: new URL('..', import.meta.url) });
});

test('quest compiler preserves ordered nested tables and rejects unsupported executable Lua', () => {
    assert.deepEqual(parseQuestLua('des.object({id="bow",coord={02,10}}); des.monster("Scorpius", 2, 10)'),
        [['object', { id: 'bow', coord: [2, 10] }], ['monster', 'Scorpius', 2, 10]]);
    assert.throws(() => parseQuestLua('des.object(); os.execute("true")'), /Expected des/);
    assert.throws(() => parseQuestLua('des.object({quan=nh.rn2(4)})'), /Unsupported quest value/);
});

test('an extinct unique nemesis is omitted while its source artifact remains', async () => {
    const g = await buildQuest('Caveman', 'goal', 1, { _extinct_monsters: ['Chromatic Dragon'] });
    assert.equal(g.level.monsters.some(mon => mon.data.name === 'Chromatic Dragon'), false);
    assert.equal(g.level.monsters.filter(mon => mon.data.name === 'shrieker').length, 3);
    assert.ok(g.level.objects.some(obj => obj.artifact === 'The Sceptre of Might'));
    assert.equal(g.level.monsters.some(mon => mon.minvent?.some(obj => obj.kind === 'Bell of Opening')), false);
});

for (const field of ['_genocided_monsters', '_extinct_monsters']) {
    test(`des.monster substitutes random monsters for nonunique species in ${field}`, async () => {
        const g = await buildQuest('Caveman', 'goal', 19, { [field]: ['shrieker'] });
        assert.equal(g.level.monsters.some(mon => mon.data.name === 'shrieker'), false);
        assert.ok(g.level.monsters.length >= 4, 'three source shrieker declarations still create replacement monsters');
    });
}
