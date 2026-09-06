import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { mdamagem, monWieldItem, setMhitmHooks } from '../js/mhitm.js';
import { rhack } from '../js/cmd.js';
import { AT_TUCH, AD_STCK } from '../js/permonst.js';
import { W_ARM, W_ARMC, W_ARMH, W_AMUL, W_RINGL, W_WEP,
    NEED_HTH_WEAPON, NEED_WEAPON, NO_WEAPON_WANTED } from '../js/const.js';

function install(seed = 1) {
    resetGame();
    initRng(seed);
    enableRngLog();
    game.level = { monsters: [], objects: [], traps: [] };
    game.inventory = [];
    game.flags = { debug: true };
    game.context = {};
    game.u = { ux: 10, uy: 10, uhp: 50, uhpmax: 50, ulevel: 1,
        uz: { dnum: 0, dlevel: 1 }, acurr: { a: [10, 10, 10, 10, 10, 10] },
        ualign: { type: 0, record: 0 } };
    setMhitmHooks({ pline: null, vis: null, cansee: null, canseemon: null,
        canspotmon: null, Monnam: null, mon_nam: null });
}

// mhitu.c:1089-1145 takes the greatest worn armor MC, then adds one
// Protection bonus (two for guarding), capped at three. Innate priest
// and minion Protection supplies a minimum of one rather than stacking.
for (const [label, species, inventory, mc] of [
    ['bare goblin', 'goblin', [], 0],
    ['carried robe', 'goblin', [{ cls: 'armor', kind: 'robe' }], 0],
    ['worn leather', 'goblin', [{ cls: 'armor', kind: 'leather armor', owornmask: W_ARM }], 1],
    ['worn robe', 'goblin', [{ cls: 'armor', kind: 'robe', owornmask: W_ARMC }], 2],
    ['armor does not add', 'goblin', [{ cls: 'armor', kind: 'robe', owornmask: W_ARMC },
        { cls: 'armor', kind: 'plate mail', owornmask: W_ARM }], 2],
    ['cornuthaum', 'goblin', [{ cls: 'armor', kind: 'cornuthaum', owornmask: W_ARMH }], 1],
    ['protection cloak', 'goblin', [{ cls: 'armor', kind: 'tattered cape', actualKind: 'cloak of protection', owornmask: W_ARMC }], 3],
    ['protection ring', 'goblin', [{ cls: 'ring', kind: 'ring of protection', owornmask: W_RINGL, spe: -2 }], 1],
    ['guarding amulet', 'goblin', [{ cls: 'amulet', kind: 'amulet of guarding', owornmask: W_AMUL }], 2],
    ['unidentified guarding amulet', 'goblin', [{ cls: 'amulet', amuletIndex: 9, owornmask: W_AMUL }], 2],
    ['guarding caps robe at three', 'goblin', [{ cls: 'amulet', kind: 'amulet of guarding', owornmask: W_AMUL },
        { cls: 'armor', kind: 'robe', owornmask: W_ARMC }], 3],
    ['high cleric', 'high cleric', [], 1],
    ['high cleric with robe', 'high cleric', [{ cls: 'armor', kind: 'robe', owornmask: W_ARMC }], 3],
    ['aligned cleric', 'aligned cleric', [], 1],
    ['Angel', 'Angel', [], 1],
    ['Angel with robe', 'Angel', [{ cls: 'armor', kind: 'robe', owornmask: W_ARMC }], 2],
    ['carried Mitre', 'goblin', [{ cls: 'armor', kind: 'helm of brilliance', artifact: 'The Mitre of Holiness' }], 0],
    ['worn Mitre', 'goblin', [{ cls: 'armor', kind: 'helm of brilliance', artifact: 'The Mitre of Holiness', owornmask: W_ARMH }], 1],
    ['wielded Tsurugi', 'goblin', [{ cls: 'weapon', kind: 'tsurugi', artifact: 'The Tsurugi of Muramasa', owornmask: W_WEP }], 1],
]) {
    test(`monster magic cancellation: ${label}`, () => {
        for (let seed = 1; seed <= 20; seed++) {
            install(seed);
            const attacker = { data: { name: 'python' }, mx: 8, my: 10 };
            const defender = { data: { name: species }, mx: 9, my: 10,
                mhp: 50, mhpmax: 50, minvent: inventory };
            game.level.monsters = [attacker, defender];
            mdamagem(attacker, defender, { aatyp: AT_TUCH, adtyp: AD_STCK, damn: 2, damd: 1 });
            const rolls = getRngLog().filter(entry => entry.startsWith('rn2(10)='));
            assert.equal(rolls.length, 1);
            const negated = Number(rolls[0].split('=')[1]) < 3 * mc;
            assert.equal(defender.mhp, negated ? 50 : 48, `seed ${seed}, MC ${mc}`);
        }
    });
}

test('hero enlightenment recognizes cornuthaum magic cancellation', async () => {
    install();
    game.inventory = [{ cls: 'armor', kind: 'cornuthaum', worn: true, letter: 'a' }];
    await rhack('\x18');
    const rows = [...(game._attributes_page_2 || []), ...(game._attributes_page_3 || [])];
    assert.ok(rows.some(([, , text]) => text.includes('You are warded.')));
});

// weapon.c:853-873 refuses a switch when wield.c:mwelded() is true,
// spends that attack, and stops repeated attempts until weapon_check resets.
for (const visible of [true, false]) {
    test(`a cursed wielded weapon prevents a switch, visible ${visible}`, () => {
        install();
        setMhitmHooks({ canseemon: () => visible });
        const dagger = { kind: 'dagger', cls: 'weapon', cursed: true, owornmask: W_WEP };
        const sword = { kind: 'long sword', cls: 'weapon' };
        const attacker = { data: { name: 'goblin' }, mw: dagger, minvent: [dagger, sword], weapon_check: NEED_HTH_WEAPON };
        assert.equal(monWieldItem(attacker), 1);
        assert.equal(attacker.mw, dagger);
        assert.equal(attacker.weapon_check, NO_WEAPON_WANTED);
        assert.equal(!!dagger.bknown, visible);
        assert.equal(monWieldItem(attacker), 0);
        assert.equal(attacker.mw, dagger);
        assert.deepEqual(getRngLog(), []);
    });
}

test('switching weapons clears the old wield slot and marks the new weapon', () => {
    install();
    const dagger = { kind: 'dagger', cls: 'weapon', owornmask: W_WEP, wielded: true };
    const sword = { kind: 'long sword', cls: 'weapon', cursed: true };
    const attacker = { data: { name: 'goblin' }, mw: dagger, minvent: [dagger, sword], weapon_check: NEED_HTH_WEAPON };
    assert.equal(monWieldItem(attacker), 1);
    assert.equal(attacker.mw, sword);
    assert.equal(dagger.owornmask & W_WEP, 0);
    assert.equal(!!dagger.wielded, false);
    assert.equal(sword.owornmask, W_WEP);
    assert.equal(sword.bknown, true);
    assert.equal(attacker.weapon_check, NEED_WEAPON);
});

test('a cursed carried weapon does not weld before it is wielded', () => {
    install();
    const dagger = { kind: 'dagger', cls: 'weapon', cursed: true };
    const sword = { kind: 'long sword', cls: 'weapon' };
    const attacker = { data: { name: 'goblin' }, minvent: [dagger, sword], weapon_check: NEED_HTH_WEAPON };
    assert.equal(monWieldItem(attacker), 1);
    assert.equal(attacker.mw, sword);
    assert.equal(sword.owornmask, W_WEP);
});

test('no available weapon leaves NEED_WEAPON for a later inventory change', () => {
    install();
    const attacker = { data: { name: 'goblin' }, minvent: [], weapon_check: NEED_HTH_WEAPON };
    assert.equal(monWieldItem(attacker), 0);
    assert.equal(attacker.weapon_check, NEED_WEAPON);
});
