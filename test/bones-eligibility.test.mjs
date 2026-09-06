import assert from 'node:assert/strict';
import test from 'node:test';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import { init_dungeons_rng } from '../js/dungeon.js';
import { getbones } from '../js/mklev.js';
import { initRng, rn2, enableRngLog, getRngLog } from '../js/rng.js';
import { encodeBonesLevel } from '../js/save.js';
import { InMemoryStorage, vfsWriteFile } from '../js/storage.js';

function install({ dlevel = 5, dungeon = {}, special = null, branch = null, flags = {} } = {}) {
    const g = resetGame();
    g.flags = flags;
    g.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel }, ulevel: 10 };
    g.level = new GameMap();
    g.stairs = null;
    g.inventory = [];
    g.dungeons = [{ name: 'Test dungeon', boneid: 'D', num_dunlevs: 10, ...dungeon }];
    g.specialLevels = special ? [{ dnum: 0, dlevel, ...special }] : [];
    g.branches = branch ? [branch] : [];
    g.mockStorage = new InMemoryStorage();
    const content = encodeBonesLevel();
    vfsWriteFile(`/bones/0:${dlevel}`, content);
    const read = g.mockStorage.getItem.bind(g.mockStorage);
    let reads = 0;
    g.mockStorage.getItem = key => { reads++; return read(key); };
    for (let seed = 1; seed < 100; seed++) {
        initRng(seed);
        if (!rn2(3)) { initRng(seed); break; }
    }
    enableRngLog();
    return { g, readCount: () => reads };
}

// bones.c:641-649 calls rn2(3) before no_bones_level, then avoids even
// opening the file when dungeon topology or special-level metadata rejects it.
for (const [name, config] of [
    ['dungeon with bones disabled', { dungeon: { boneid: '' } }],
    ['special level with bones disabled', { special: { name: 'medusa', boneid: '' } }],
    ['special level with omitted boneid', { special: { name: 'wizard1' } }],
    ['bottom level', { dlevel: 10 }],
    ['branch at end1 above level one', { branch: { end1: { dnum: 0, dlevel: 5 }, end2: { dnum: 1, dlevel: 1 } } }],
    ['branch at end2 above level one', { branch: { end1: { dnum: 1, dlevel: 1 }, end2: { dnum: 0, dlevel: 5 } } }],
    ['invocation level in hellish dungeon', { dlevel: 9, dungeon: { flags: { hellish: true } } }],
]) {
    test(`bones rejects ${name} before reading its file`, async () => {
        const { g, readCount } = install(config);
        const before = g.level;
        assert.equal(await getbones(), false);
        assert.equal(g.level, before);
        assert.equal(readCount(), 0);
        assert.deepEqual(getRngLog(), ['rn2(3)=0']);
    });
}

for (const [name, config] of [
    ['ordinary interior level', {}],
    ['eligible special level', { special: { name: 'oracle', boneid: 'O' } }],
    ['branch entrance at level one', { dlevel: 1, branch: { end1: { dnum: 2, dlevel: 5 }, end2: { dnum: 0, dlevel: 1 } } }],
    ['penultimate level outside hell', { dlevel: 9 }],
    ['branch at a different depth', { branch: { end1: { dnum: 0, dlevel: 6 }, end2: { dnum: 1, dlevel: 1 } } }],
    ['branch at a different dungeon', { branch: { end1: { dnum: 1, dlevel: 5 }, end2: { dnum: 2, dlevel: 1 } } }],
]) {
    test(`bones accepts ${name}`, async () => {
        const { readCount } = install(config);
        assert.equal(await getbones(), true);
        assert.ok(readCount() > 0);
        assert.equal(getRngLog()[0], 'rn2(3)=0');
    });
}

for (const flags of [{ bones: false }, { explore: true }]) {
    test(`bones mode gate precedes even the discovery roll: ${JSON.stringify(flags)}`, async () => {
        const { readCount } = install({ flags });
        assert.equal(await getbones(), false);
        assert.equal(readCount(), 0);
        assert.deepEqual(getRngLog(), []);
    });
}

test('initialized topology retains every source bonetag and hellish classification', () => {
    const g = resetGame();
    initRng(42);
    g.flags = {};
    init_dungeons_rng();
    assert.deepEqual(Object.fromEntries(g.dungeons.map(d => [d.name, d.boneid])), {
        'The Dungeons of Doom': 'D', Gehennom: 'G', 'The Gnomish Mines': 'M',
        'The Quest': 'Q', Sokoban: '', 'Fort Ludios': 'K', "Vlad's Tower": 'T',
        'The Elemental Planes': 'E', 'The Tutorial': '',
    });
    const enabled = { rogue: 'R', oracle: 'O', bigrm: 'B', valley: 'V', juiblex: 'J', baalz: 'B',
        asmodeus: 'A', wizard2: 'X', wizard3: 'Y', orcus: 'O', fakewiz1: 'F', fakewiz2: 'G',
        minetn: 'T', 'x-loca': 'L', knox: 'K' };
    for (const level of g.specialLevels) assert.equal(level.boneid, enabled[level.name] || '', level.name);
    assert.equal(g.dungeons.find(d => d.name === 'Gehennom').flags.hellish, true);
    assert.equal(g.dungeons.find(d => d.name === 'The Dungeons of Doom').flags.hellish, false);
});
