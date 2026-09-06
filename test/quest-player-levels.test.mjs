import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { mklev, __mklevTestHooks } from '../js/mklev.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, STAIRS, ALTAR, IRONBARS, SQKY_BOARD } from '../js/const.js';

const WEAPON_CLASS = 1, ARMOR_CLASS = 2, GEM_CLASS = 14, TOOL_CLASS = 12;

async function build(role, stage, seed = 1) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { moves: 100, flags: { bones: false }, inventory: [], _startup_role: role,
        urole: { name: { m: role } }, dungeons: [{ name: 'The Quest', num_dunlevs: 6, depth_start: 10 }],
        specialLevels: [{ name: `x-${stage}`, dnum: 0, dlevel: stage === 'goal' ? 6 : 3 }], quest_dnum: 0,
        u: { ux: 40, uy: 10, ulevel: 20, uhave: {}, uz: { dnum: 0, dlevel: stage === 'goal' ? 6 : 3 },
            ualign: { type: 0, record: 10 }, ualignbase: [0, 0] }, level: new GameMap() });
    await mklev(); return g;
}

for (const [role, stage, count] of [['Samurai', 'goal', 5], ['Samurai', 'loca', 6]]) {
    test(`${role} ${stage} dispatch creates ${count} equipped player monsters with individual levels`, async () => {
        for (const seed of [1, 19, 731]) {
            const g = await build(role, stage, seed);
            const players = g.level.monsters.filter(mon => mon.data.name === 'samurai');
            assert.equal(players.length, count);
            assert.ok(new Set(players.map(mon => mon.m_lev)).size > 1);
            for (const mon of players) {
                assert.ok(mon.m_lev >= 1 && mon.m_lev <= 16);
                assert.ok(mon.mhp >= 30 + mon.m_lev && mon.mhp <= 30 + 10 * mon.m_lev);
                assert.equal(mon.mhp, mon.mhpmax);
                assert.equal(mon.mpeaceful, 0);
                assert.ok(mon.minvent.some(obj => obj.cls === 'weapon'));
                assert.ok(mon.minvent.filter(obj => ['potion', 'wand', 'scroll', 'amulet'].includes(obj.cls)).length >= 3);
                assert.ok(!mon.minvent.some(obj => /fake amulet/i.test(obj.kind || '')));
            }
        }
    });
}

test('Wizard goal keeps the named captive player monsters peaceful and Newt asleep', async () => {
    for (const seed of [1, 19, 731]) {
        const g = await build('Wizard', 'goal', seed);
        const pug = g.level.monsters.find(mon => mon.givenName === 'Pug');
        const newt = g.level.monsters.find(mon => mon.givenName === 'Newt');
        assert.ok(pug && newt);
        assert.equal(pug.data.name, 'rogue'); assert.equal(newt.data.name, 'wizard');
        for (const mon of [pug, newt]) {
            assert.equal(mon.mpeaceful, 1);
            assert.ok(mon.m_lev >= 1 && mon.m_lev <= 16);
            assert.ok(mon.minvent.some(obj => obj.cls === 'weapon'));
        }
        assert.equal(newt.msleeping, 1);
        const boss = g.level.monsters.find(mon => mon.data.name === 'Dark One');
        const prize = g.level.objects.find(obj => obj.artifact === 'The Eye of the Aethiopica');
        assert.deepEqual([prize.ox, prize.oy], [boss.mx, boss.my]);
        assert.equal(g.level.at(prize.ox, prize.oy).typ, ALTAR);
        assert.ok(boss.minvent.some(obj => obj.kind === 'Bell of Opening'));
    }
});

test('Samurai goal retains the artifact, three central alarm boards and one opening in each ring', async () => {
    for (const seed of [1, 19, 731]) {
        const g = await build('Samurai', 'goal', seed);
        const boss = g.level.monsters.find(mon => mon.data.name === 'Ashikaga Takauji');
        const prize = g.level.objects.find(obj => obj.artifact === 'The Tsurugi of Muramasa');
        assert.ok(boss && prize);
        assert.deepEqual([prize.ox, prize.oy], [boss.mx, boss.my]);
        assert.ok(boss.minvent.some(obj => obj.kind === 'Bell of Opening'));
        const around = (dx, dy) => g.level.at(boss.mx + dx, boss.my + dy).typ;
        for (const points of [[[0,4],[8,0],[0,-4],[-8,0]], [[0,-6],[13,0],[0,6],[-13,0]], [[0,-8],[0,8]]])
            assert.equal(points.filter(([dx,dy]) => around(dx,dy) === ROOM).length, 1);
        assert.equal(g.level.traps.filter(t => t.ttyp === SQKY_BOARD && Math.abs(t.tx-boss.mx) <= 2 && Math.abs(t.ty-boss.my) <= 1).length, 3);
        assert.equal(Math.abs(g.level.upstair.x - boss.mx), 20);
        assert.equal(Math.abs(g.level.upstair.y - boss.my), 1);
    }
});

test('Samurai locate stocks eight gems, armors, weapons and tools at the source coordinates', async () => {
    for (const seed of [1, 19, 731]) {
        const g = await build('Samurai', 'loca', seed);
        const up = g.level.upstair, down = g.level.dnstair;
        assert.ok(up && down);
        const dx = Math.sign(down.x - up.x), dy = Math.sign(down.y - up.y);
        for (const [lx, ly, oclass] of [[25,5,GEM_CLASS], [40,5,ARMOR_CLASS], [27,13,WEAPON_CLASS], [37,13,TOOL_CLASS]]) {
            for (let x = lx; x <= lx+3; x++) for (let y = ly; y <= ly+1; y++) {
                const objects = g.level.objects.filter(obj => obj.ox === up.x + dx * (x-10) && obj.oy === up.y + dy * (y-10));
                assert.ok(objects.some(obj => obj.otyp === oclass || ({armor: ARMOR_CLASS, weapon: WEAPON_CLASS, tool: TOOL_CLASS, gem: GEM_CLASS})[obj.cls] === oclass));
            }
        }
    }
});

test('Samurai quest ninjas receive missiles and a melee weapon through makemon', async () => {
    for (const stage of ['loca', 'goal']) {
        const g = await build('Samurai', stage, 19);
        const ninjas = g.level.monsters.filter(mon => mon.data.name === 'ninja');
        assert.equal(ninjas.length, stage === 'loca' ? 8 : 5);
        for (const mon of ninjas) {
            assert.ok(mon.minvent.some(obj => ['shuriken', 'dart'].includes(obj.actualKind || obj.kind)));
            assert.ok(mon.minvent.some(obj => ['short sword', 'axe'].includes(obj.actualKind || obj.kind)));
        }
    }
});

for (const [role, stage, prefix] of [['Samurai','goal','Sam'], ['Samurai','loca','Sam'], ['Wizard','goal','Wiz']]) {
    test(`${prefix}-${stage} preserves the source floor geometry through actual dispatch`, async () => {
        const source = await readFile(new URL(`../nethack-c/upstream/dat/${prefix}-${stage}.lua`, import.meta.url), 'utf8');
        const rows = /des\.map\(\[\[\n([\s\S]*?)\n\]\]\)/.exec(source)[1].split('\n');
        for (const seed of [1,19,731]) {
            const g = await build(role, stage, seed);
            let anchor, sx, sy;
            if (stage === 'loca') { anchor = g.level.upstair; sx = 10; sy = 10; }
            else {
                const mon = g.level.monsters.find(mon => mon.data.name === (role === 'Wizard' ? 'Dark One' : 'Ashikaga Takauji'));
                assert.ok(mon); anchor = {x: mon.mx,y: mon.my}; sx = role === 'Wizard' ? 16 : 22; sy = role === 'Wizard' ? 11 : 10;
            }
            let fewest = Infinity;
            for (const dx of [-1,1]) for (const dy of [-1,1]) {
                let misses = 0;
                for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
                    if (rows[y][x] !== '.' && rows[y][x] !== 'F') continue;
                    const typ = g.level.at(anchor.x + dx*(x-sx), anchor.y + dy*(y-sy))?.typ;
                    if (!(rows[y][x] === 'F' ? [IRONBARS] : [ROOM, STAIRS, ALTAR]).includes(typ)) misses++;
                }
                fewest = Math.min(fewest, misses);
            }
            assert.equal(fewest, 0);
        }
    });
}
