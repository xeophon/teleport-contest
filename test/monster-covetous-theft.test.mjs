import assert from 'node:assert/strict';
import test from 'node:test';
import { resetGame } from '../js/gstate.js';
import { GameMap } from '../js/game.js';
import { monsterByRndName, artifactDefinitionForName, ARTIFACT_DEFS, AMULET_OF_YENDOR } from '../js/mklev.js';
import { stealamulet, stealamuletStripOrder } from '../js/steal.js';
import { runMonsterAttackTurn, rhack } from '../js/cmd.js';
import { supportsMonsterAttackSlots } from '../js/mhitu.js';
import { processMonsterTurns } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';
import { ROOM, COULD_SEE, IN_SIGHT, W_ARM, W_ARMC, W_ARMU, W_ARMG, W_ARMH, W_RINGL,
    W_WEP, W_SWAPWEP, W_TOOL, BLINDED, LEVITATION, W_ARTI, PIT } from '../js/const.js';
import { encodeSaveState, restoreSaveState } from '../js/save.js';

function setup(name = 'Wizard of Yendor', width = 800) {
    const g = resetGame(); initRng(42); enableRngLog();
    Object.assign(g, { flags: {}, context: {}, inventory: [], moves: 100,
        level: new GameMap(), nhDisplay: { cols: width },
        u: { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 10,
            uhp: 200, uhpmax: 200, uac: 10, uhunger: 800,
            acurr: { a: [14, 14, 14, 14, 14, 14] } } });
    for (let x = 1; x < 80; x++) for (let y = 0; y < 21; y++) g.level.at(x, y).typ = ROOM;
    vision_reset(); g.viz_array = Array.from({ length: 21 }, () => Array(80).fill(COULD_SEE | IN_SIGHT));
    const mon = { data: monsterByRndName(name) || { name }, m_id: 50, mx: 11, my: 10, mux: 10, muy: 10,
        m_lev: 20, mhp: 100, mhpmax: 100, mcansee: true, mcanmove: true, minvent: [], movement: 12,
        mcan: true, iswiz: name === 'Wizard of Yendor' };
    g.level.monsters.push(mon); g.coreCtx.r = Array(500).fill(0n); g.coreCtx.n = 500;
    return { g, mon };
}
async function drain(g) {
    for (let i = 0; i < 80 && (g._monster_attack_continuation || g._message_more
        || g._queued_messages_after_more?.length); i++) {
        if (g._command_mode) break;
        await rhack(' ');
    }
}
function quest(name, extra = {}) {
    const def = artifactDefinitionForName(name);
    return { id: 10, letter: 'a', artifact: name, cls: def.cls, kind: def.base, otyp: def.otyp,
        glyph: def.glyph, quan: 1, known: true, dknown: true, ...extra };
}

for (const numeric of [false, true]) test(`C any_quest_artifact chooses other-role artifact before Amulet: numeric=${numeric}`, () => {
    const { g, mon } = setup();
    const artifact = quest('The Orb of Fate');
    if (numeric) { delete artifact.artifact; artifact.oartifact = ARTIFACT_DEFS.findIndex(def => def.name === 'The Orb of Fate') + 1; }
    const amulet = { otyp: AMULET_OF_YENDOR, kind: 'Amulet of Yendor', quan: 1 };
    g.inventory = [amulet, artifact]; g.u.uhave = { amulet: true };
    assert.equal(stealamulet(mon).target, artifact); assert.deepEqual(getRngLog(), []);
});

test('Wizard cannot mistake a fake Amulet for the real one despite identical display names', () => {
    const { g, mon } = setup();
    const fake = { otyp: 15, kind: 'Amulet of Yendor', actualKind: 'cheap plastic imitation of the Amulet of Yendor', fakeAmuletOfYendor: true };
    const real = { otyp: AMULET_OF_YENDOR, kind: 'Amulet of Yendor', realAmuletOfYendor: true };
    g.inventory = [fake, real]; g.u.uhave = { amulet: true };
    assert.equal(stealamulet(mon).target, real); assert.deepEqual(getRngLog(), []);
    mon.iswiz = false;
    assert.equal(stealamulet(mon).target, fake); assert.match(getRngLog()[0], /^rnd\(2\)=/);
});

test('a personal item name cannot impersonate the Book of the Dead', () => {
    const { g, mon } = setup();
    const fake = { cls: 'spellbook', kind: 'spellbook of healing', name: 'Book of the Dead' };
    const real = { cls: 'spellbook', otyp: 10097 };
    g.inventory = [fake, real]; g.u.uhave = { book: true };
    assert.equal(stealamulet(mon).target, real); assert.deepEqual(getRngLog(), []);
});

test('source stripping respects canonical slots and disarms the second weapon first', () => {
    const { g } = setup();
    const ring = { owornmask: W_RINGL }, gloves = { owornmask: W_ARMG },
        primary = { owornmask: W_WEP }, alternate = { owornmask: W_SWAPWEP };
    g.inventory = [ring, gloves, primary, alternate]; g.u.twoweap = true;
    Object.assign(g.u, { uleft: ring, uarmg: gloves, uwep: primary, uswapwep: alternate });
    assert.deepEqual(stealamuletStripOrder(g.inventory, ring), [alternate, primary, gloves, ring]);
});

test('source canonical shirt target removes cloak then suit without relying on item text', () => {
    const { g } = setup();
    const shirt = { owornmask: W_ARMU }, cloak = { owornmask: W_ARMC }, suit = { owornmask: W_ARM };
    g.inventory = [shirt, cloak, suit];
    assert.deepEqual(stealamuletStripOrder(g.inventory, shirt), [cloak, suit, shirt]);
});

for (const name of ['Wizard of Yendor', 'Minion of Huhetotl', 'Thoth Amon', 'Master Kaen', 'Nalzok', 'Dark One'])
    test(`${name} canonical special-object attack uses the live slot driver`, async () => {
        const { g, mon } = setup(name); g.level.flags.noteleport = true;
        const artifact = quest('The Orb of Fate'); g.inventory = [artifact];
        assert.equal(supportsMonsterAttackSlots(mon), true);
        await processMonsterTurns(); await drain(g);
        assert.equal(g.inventory.includes(artifact), false); assert.ok(mon.minvent.includes(artifact));
        assert.match(g._pending_message, /steals/); assert.ok(g.u.uhp < 200);
        assert.equal(g._monster_attack_continuation, null);
    });

test('cancelled Wizard still steals then teleports before its next ranged spell is rejected', async () => {
    const { g, mon } = setup(); const artifact = quest('The Orb of Fate'); g.inventory = [artifact];
    await runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g.inventory.includes(artifact), false); assert.equal(mon.minvent[0], artifact);
    assert.deepEqual([mon.mx, mon.my], [1, 0]); assert.equal(g.u.uhp, 198);
    assert.deepEqual(getRngLog().map(line => line.split('=')[0]),
        ['rnd(20)', 'd(2,12)', 'rn2(20)', 'rnd(79)', 'rn2(21)', 'rn2(3)', 'rn2(6)']);
});

test('a worn quest weapon is unwielded even when cursed, and retains its object identity', async () => {
    const { g, mon } = setup(); g.level.flags.noteleport = true;
    const weapon = quest('The Staff of Aesculapius', { wielded: true, cursed: true, owornmask: W_WEP });
    g.inventory = [weapon]; g.u.uwep = weapon;
    await runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g.u.uwep, null); assert.equal(weapon.owornmask, 0); assert.equal(weapon.wielded, false);
    assert.equal(mon.minvent[0], weapon); assert.equal(weapon.cursed, true);
    assert.match(g._pending_message, /disarms.*steals/s);
});

test('saved More resumes stripping a worn quest helmet before transferring ownership', async () => {
    const { g, mon } = setup('Wizard of Yendor', 55); g.level.flags.noteleport = true;
    const helm = quest('The Mitre of Holiness', { worn: true, owornmask: W_ARMH });
    g.inventory = [helm]; g.u.uarmh = helm; g._pending_message = 'The previous message fills the top line.';
    await runMonsterAttackTurn(mon); assert.equal(g.inventory[0], helm); assert.equal(mon.minvent.length, 0);
    const { coreCtx, displayCtx, rng, nhDisplay } = g;
    restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay }); await drain(g);
    const thief = g.level.monsters[0];
    assert.equal(g.inventory.length, 0); assert.equal(thief.minvent[0].artifact, 'The Mitre of Holiness');
    assert.equal(g.u.uarmh, null); assert.equal(thief.minvent[0].owornmask, 0);
    assert.equal(getRngLog().filter(line => line.startsWith('rnd(20)=')).length, 1);
});

for (const rescue of ['amulet', 'wizard']) test(`Heart theft waits for saved ${rescue} landing death before pickup and contact damage`, async () => {
    const { g, mon } = setup(); g.level.flags.noteleport = true; g.u.uhp = 1; g.flags.debug = rescue === 'wizard';
    const heart = quest('The Heart of Ahriman'); g.inventory = [heart];
    if (rescue === 'amulet') g.inventory.push({ id: 20, cls: 'amulet', kind: 'amulet of life saving', amuletIndex: 1, worn: true, quan: 1 });
    g.u.levitating = true; g.u.uprops = { [LEVITATION]: { intrinsic: 0, extrinsic: W_ARTI } };
    g.level.traps.push({ tx: 10, ty: 10, ttyp: PIT });
    await runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g._command_mode, rescue === 'amulet' ? 'lifeSavingMore' : 'deathDieMore');
    assert.equal(g.inventory.includes(heart), false, 'freeinv precedes the levitation-loss landing');
    assert.equal(mon.minvent.includes(heart), false, 'mpickobj follows the landing');
    assert.equal(g._artifact_float_continuation.after.type, 'monsterTheft');
    const { coreCtx, displayCtx, rng, nhDisplay } = g;
    restoreSaveState(encodeSaveState()); Object.assign(g, { coreCtx, displayCtx, rng, nhDisplay });
    await rhack(' '); if (rescue === 'wizard') await rhack('n'); await drain(g);
    assert.equal(g.level.monsters[0].minvent[0].artifact, 'The Heart of Ahriman');
    assert.equal(g._monster_attack_continuation, null); assert.equal(g._artifact_float_continuation, null);
    assert.equal(getRngLog().filter(line => line.startsWith('d(2,12)=')).length, 1);
    assert.ok(g.u.uhp > 0);
});

for (const timeout of [0, 15]) test(`stealing the worn Eyes applies Blindf_off with underlying blindness ${timeout}`, async () => {
    const { g, mon } = setup(); g.level.flags.noteleport = true;
    const eyes = quest('The Eyes of the Overworld', { worn: true, owornmask: W_TOOL });
    g.inventory = [eyes]; g.u.ublindf = eyes; g.u.blind = false; g.u._blindTimeout = timeout;
    g.u.uprops = { [BLINDED]: { intrinsic: timeout, extrinsic: 0, blocked: W_TOOL } };
    await runMonsterAttackTurn(mon); await drain(g);
    assert.equal(g.u.blind, !!timeout); assert.equal(g.u._blindTimeout, timeout);
    assert.equal(g.u.uprops[BLINDED].blocked, 0);
    assert.equal(g.u.ublindf, null); assert.equal(mon.minvent[0], eyes);
    assert.match(g._pending_message, /You were wearing/);
    assert.equal(g._pending_message.includes("You can't see anything now!"), !!timeout);
});
