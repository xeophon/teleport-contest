import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { findMac } from '../js/mhitm.js';
import { ARMOR_AC_BONUS, ARMOR_MAGIC_NEGATION } from '../js/armor.js';
import { W_AMUL, W_ARM, W_ARMC } from '../js/const.js';
import { resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { mkobj } from '../js/mklev.js';

test('shared armor AC and cancellation data match all 84 enabled C armor definitions', () => {
    const source = readFileSync(new URL('../nethack-c/upstream/include/objects.h', import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^#if 0[^\n]*\n[\s\S]*?^#endif[^\n]*$/gm, '');
    let count = 0;
    for (const match of source.matchAll(/^(ARMOR|HELM|CLOAK|SHIELD|GLOVES|BOOTS|DRGN_ARMR)\(("[\s\S]*?)\),/gm)) {
        const args = match[2].split(',').map(arg => arg.trim());
        const name = JSON.parse(args[0]).toLowerCase();
        // objects.h macro parameters: the AC input becomes a_ac=10-AC.
        const acIndex = ['ARMOR', 'SHIELD'].includes(match[1]) ? 10 : match[1] === 'DRGN_ARMR' ? 4 : 9;
        assert.equal(ARMOR_AC_BONUS[name], 10 - Number(args[acIndex]), name);
        assert.equal(ARMOR_MAGIC_NEGATION[name] || 0, match[1] === 'DRGN_ARMR' ? 0 : Number(args[acIndex + 1]), name);
        count++;
    }
    assert.equal(count, 84);
});

for (const [kind, bonus] of [['plate mail', 7], ['crystal plate mail', 7], ['bronze plate mail', 6],
    ['cloak of protection', 3], ['mummy wrapping', 0], ['gold dragon scale mail', 9]]) {
    test(`find_mac uses source armor data for ${kind}`, () => {
        const mon = { data: { name: 'human' }, misc_worn_check: W_ARM,
            minvent: [{ kind, cls: 'armor', owornmask: W_ARM, spe: 2, oeroded: 1, oeroded2: 3 }] };
        assert.equal(findMac(mon), 10 - (bonus + 2 - Math.min(3, bonus)));
    });
}

test('worn masks and greatest erosion decide monster armor class', () => {
    const mon = { data: { name: 'human' }, misc_worn_check: W_ARM | W_ARMC,
        minvent: [
            { kind: 'leather armor', owornmask: W_ARM, spe: 3, oeroded2: 3 },
            { kind: 'cloak of protection', owornmask: W_ARMC, spe: -2, oeroded: 1 },
            { kind: 'plate mail', spe: 9, owornmask: 0 },
        ] };
    assert.equal(findMac(mon), 7);
    mon.misc_worn_check = W_ARMC;
    assert.equal(findMac(mon), 10);
});

test('amulet of guarding grants a fixed two points regardless of erosion or enchantment', () => {
    const mon = { data: { name: 'human' }, misc_worn_check: W_AMUL,
        minvent: [{ kind: 'amulet of guarding', owornmask: W_AMUL, spe: 99, oeroded: 3 }] };
    assert.equal(findMac(mon), 8);
});

test('an unidentified generated amulet of guarding contributes its fixed monster AC bonus', () => {
    resetGame();
    initRng(41);
    let amulet;
    for (let count = 0; count < 1000; count++) {
        const candidate = mkobj(15, false); // C objclass.h: AMULET_CLASS
        if (candidate.amuletIndex === 9) { amulet = candidate; break; }
    }
    assert.ok(amulet, 'generated guarding amulet');
    assert.equal(amulet.kind, undefined);
    assert.equal(amulet.actualKind, undefined);
    assert.equal(amulet.known, false);
    const mon = { data: { name: 'human' }, misc_worn_check: W_AMUL, minvent: [amulet] };
    assert.equal(findMac(mon), 10);
    amulet.owornmask = W_AMUL;
    assert.equal(findMac(mon), 8);
});

for (const spe of [-120, 120]) {
    test(`monster armor class is capped at the C limit for enchantment ${spe}`, () => {
        const mon = { data: { name: 'human' }, misc_worn_check: W_ARM,
            minvent: [{ kind: 'leather armor', owornmask: W_ARM, spe }] };
        assert.equal(findMac(mon), spe < 0 ? 99 : -99);
    });
}
