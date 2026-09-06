import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { MONS } from '../js/permonst.js';
import { doname, corpseName, erosionWords } from '../js/objnam.js';
import { W_WEP, W_SWAPWEP, W_QUIVER, W_ARM, W_ARMG, W_AMUL, W_RINGL, W_RINGR, W_TOOL, W_SADDLE, W_BALL, W_CHAIN } from '../js/const.js';

function object(symbol, fields = {}, typeKnown = true) {
    const type = OBJECT_DATA.find(type => type.symbol === symbol);
    if (typeKnown) {
        game._known_object_types ??= [];
        if (!game._known_object_types.includes(type.id)) game._known_object_types.push(type.id);
    }
    return { _c_otyp: type.id, quan: 1, spe: 0, corpsenm: -1,
        known: true, dknown: true, bknown: true, ...fields };
}

// objnam.c:doname_base, all class arms and the shared qualifier ordering.
const rows = [
    ['LONG_SWORD', {}, 'a +0 long sword'],
    ['LONG_SWORD', { known: false }, 'an uncursed long sword'],
    ['LONG_SWORD', { bknown: false, cursed: true }, 'a +0 long sword'],
    ['LONG_SWORD', { cursed: true, spe: -3, greased: true, oeroded: 2 }, 'a cursed greased very rusty -3 long sword'],
    ['ARROW', { blessed: true, spe: 2, quan: 8, opoisoned: true, oeroded2: 3 }, '8 blessed poisoned thoroughly corroded +2 arrows'],
    ['LEATHER_ARMOR', { spe: 1, oeroded: 1, oeroded2: 2, rknown: true, oerodeproof: true }, 'an uncursed burnt very rotted fireproof +1 leather armor'],
    ['PLATE_MAIL', { owornmask: W_ARM }, 'an uncursed +0 plate mail (being worn)'],
    ['PICK_AXE', { owornmask: W_WEP }, 'a +0 pick-axe (weapon in right hand)'],
    ['UNICORN_HORN', { owornmask: W_WEP }, 'a +0 unicorn horn (weapon in hands)'],
    ['QUARTERSTAFF', { owornmask: W_WEP }, 'a +0 quarterstaff (weapon in hands)'],
    ['AKLYS', { owornmask: W_WEP }, 'a +0 aklys (tethered to right hand)'],
    ['DART', { owornmask: W_WEP, quan: 1 }, 'a +0 dart (wielded)'],
    ['APPLE', { owornmask: W_WEP }, 'an uncursed apple (wielded)'],
    ['WAN_NOTHING', { spe: 3, owornmask: W_WEP }, 'a wand of nothing (0:3) (wielded)'],
    ['DAGGER', { owornmask: W_SWAPWEP, quan: 2 }, '2 +0 daggers (alternate weapons; not wielded)'],
    ['ARROW', { owornmask: W_QUIVER }, 'a +0 arrow (in quiver)'],
    ['CROSSBOW_BOLT', { owornmask: W_QUIVER }, 'a +0 crossbow bolt (in quiver pouch)'],
    ['DAGGER', { owornmask: W_QUIVER }, 'a +0 dagger (at the ready)'],
    ['RUBY', { owornmask: W_QUIVER }, 'an uncursed ruby (in quiver pouch)'],
    ['FOOD_RATION', { owornmask: W_QUIVER }, 'an uncursed food ration (at the ready)'],
    ['GOLD_PIECE', { quan: 10, cursed: true }, '10 gold pieces'],
    ['AMULET_OF_REFLECTION', { owornmask: W_AMUL }, 'an uncursed amulet of reflection (being worn)'],
    ['RIN_GAIN_STRENGTH', { spe: -2, owornmask: W_RINGL }, 'an uncursed -2 ring of gain strength (on left hand)'],
    ['RIN_LEVITATION', { spe: 2, owornmask: W_RINGR }, 'an uncursed ring of levitation (on right hand)'],
    ['RIN_GAIN_STRENGTH', { spe: 5, known: false }, 'an uncursed ring of gain strength'],
    ['MEAT_RING', { oeaten: 1, owornmask: W_RINGR }, 'an uncursed partly eaten meat ring (on right hand)'],
    ['WAN_WISHING', { recharged: 2, spe: -1 }, 'a wand of wishing (2:-1)'],
    ['WAN_WISHING', { known: false, spe: 2 }, 'an uncursed wand of wishing'],
    ['MAGIC_MARKER', { recharged: 1, spe: 45 }, 'a magic marker (1:45)'],
    ['TINNING_KIT', { spe: 30, blessed: true }, 'a blessed tinning kit (0:30)'],
    ['BLINDFOLD', { owornmask: W_TOOL }, 'an uncursed blindfold (being worn)'],
    ['SADDLE', { owornmask: W_SADDLE }, 'an uncursed saddle (being worn)'],
    ['BAG_OF_HOLDING', { contents: [{}], cknown: false }, 'an uncursed bag of holding'],
    ['BAG_OF_HOLDING', { contents: [{ quan: 9 }, {}], cknown: true }, 'an uncursed bag of holding containing 2 items'],
    ['SACK', { contents: [], cknown: true }, 'an empty uncursed sack'],
    ['CHEST', { contents: [{}], cknown: true, lknown: true, olocked: true, otrapped: true, tknown: true, greased: true }, 'an uncursed trapped locked greased chest containing 1 item'],
    ['LARGE_BOX', { lknown: true, obroken: true, olocked: true }, 'an uncursed broken large box'],
    ['LARGE_BOX', { lknown: true }, 'an uncursed unlocked large box'],
    ['BAG_OF_TRICKS', { known: false, cknown: true }, 'an empty uncursed bag of tricks'],
    ['BAG_OF_TRICKS', { cknown: true }, 'a bag of tricks (0:0)'],
    ['HORN_OF_PLENTY', { known: false, cknown: true }, 'an empty uncursed horn of plenty'],
    ['POT_WATER', { blessed: true }, 'a potion of holy water'],
    ['POT_WATER', {}, 'an uncursed potion of water'],
    ['POT_HEALING', { quan: 3, odiluted: true, blessed: true }, '3 blessed diluted potions of healing'],
    ['POT_OIL', { lamplit: true }, 'an uncursed potion of oil (lit)'],
    ['OIL_LAMP', { lamplit: true, spe: 3 }, 'an uncursed oil lamp (lit)'],
    ['MAGIC_LAMP', { spe: 1 }, 'an uncursed magic lamp'],
    ['TALLOW_CANDLE', { age: 400 }, 'an uncursed tallow candle'],
    ['WAX_CANDLE', { age: 1 }, 'an uncursed partly used wax candle'],
    ['CANDELABRUM_OF_INVOCATION', { spe: 1 }, 'the uncursed Candelabrum of Invocation (1 of 7 candle attached)'],
    ['CANDELABRUM_OF_INVOCATION', { spe: 7, lamplit: true }, 'the uncursed Candelabrum of Invocation (7 of 7 candles, lit)'],
    ['IRON_CHAIN', { oeroded: 1, owornmask: W_CHAIN }, 'an uncursed rusty iron chain (attached to you)'],
    ['HEAVY_IRON_BALL', { oeroded2: 2, owornmask: W_BALL }, 'an uncursed very corroded heavy iron ball (chained to you)'],
    ['SCR_MAIL', {}, 'a scroll of mail'],
    ['SPE_BOOK_OF_THE_DEAD', {}, 'the uncursed Book of the Dead'],
    ['FAKE_AMULET_OF_YENDOR', { known: false }, 'the Amulet of Yendor'],
    ['FAKE_AMULET_OF_YENDOR', {}, 'a cheap plastic imitation of the Amulet of Yendor'],
    ['AMULET_OF_YENDOR', {}, 'the Amulet of Yendor'],
];
for (const [symbol, fields, expected] of rows) test(`doname ${symbol} ${JSON.stringify(fields)}`, () => {
    resetGame(); assert.equal(doname(object(symbol, fields), { blind: true }), expected);
});

for (const [symbol, material, expected] of [
    ['LONG_SWORD', 11, 'very rusty thoroughly corroded rustproof '],
    ['LONG_SWORD', 13, 'very burnt thoroughly corroded corrodeproof '],
    ['LEATHER_ARMOR', 7, 'very burnt thoroughly rotted fireproof '],
    ['LEATHER_ARMOR', 19, 'very cracked thoroughly rotted tempered '],
    ['RED_DRAGON_SCALES', 10, 'very burnt thoroughly rotted rotproof '],
    ['CRYSKNIFE', 20, 'fixed '],
    ['SILVER_SABER', 14, ''],
]) test(`C erosion priority for ${symbol} material ${material}`, () => {
    resetGame(); assert.equal(erosionWords(object(symbol, { material, oeroded: 2, oeroded2: 3, rknown: true, oerodeproof: true })), expected);
});

for (const [species, adjective, flags, expected] of [
    ['ogre', '', { article: true }, 'an ogre corpse'],
    ['Medusa', 'cursed partly eaten ', { article: true }, "Medusa's cursed partly eaten corpse"],
    ['Wizard of Yendor', 'uncursed ', { article: true }, "the Wizard of Yendor's uncursed corpse"],
    ['Wizard of Yendor', '', { noPrefix: true }, "Wizard of Yendor's corpse"],
    ['Oracle', '', { article: true }, "the Oracle's corpse"],
    ['high cleric', '', { article: true }, 'a high cleric corpse'],
    ['newt', '2 ', { article: true }, '2 newt corpse'],
    ['newt', '', { thePrefix: true }, 'the newt corpse'],
]) test(`corpse_xname ${species} ${adjective} ${JSON.stringify(flags)}`, () => {
    resetGame(); const corpsenm = MONS.findIndex(mon => mon.name === species);
    assert.notEqual(corpsenm, -1);
    assert.equal(corpseName(object('CORPSE', { corpsenm }), adjective, flags), expected);
});

test('corpse adjectives and stack counts retain C possessive ordering', () => {
    resetGame(); const corpse = object('CORPSE', { corpsenm: MONS.findIndex(mon => mon.name === 'Medusa'), oeaten: 1 });
    assert.equal(doname(corpse), "Medusa's uncursed partly eaten corpse");
    corpse.quan = 2;
    assert.equal(doname(corpse), "Medusa's 2 uncursed partly eaten corpses");
});

test('override cannot reveal an unseen box trap, but ordinary observation can', () => {
    resetGame(); const box = object('CHEST', { dknown: false, otrapped: true, tknown: true });
    assert.equal(doname(box, { override: true, blind: true }), 'an empty uncursed unlocked chest');
    assert.equal(box.dknown, false);
    assert.equal(doname(box, { override: true }), 'an empty uncursed trapped unlocked chest');
    assert.equal(box.dknown, true);
});

test('vague quantity depends on observation, even when the type is known', () => {
    resetGame(); const potion = object('POT_HEALING', { quan: 8, dknown: false, bknown: false });
    assert.equal(doname(potion, { blind: true }, { vagueQuantity: true }), 'some potions');
    assert.equal(doname(potion, {}, { vagueQuantity: true }), '8 potions of healing');
});

test('implicit uncursed option overrides Priest and charge suppression', () => {
    resetGame(); const wand = object('WAN_WISHING', { spe: 3 });
    assert.equal(doname(wand, { role: 'Priest' }), 'a wand of wishing (0:3)');
    assert.equal(doname(wand, { role: 'Priest', implicitUncursed: false }), 'an uncursed wand of wishing (0:3)');
    assert.equal(doname(object('APPLE'), { role: 'Priest' }), 'an apple');
});

test('dual wielding distinguishes hands even for nonweapons and ammo', () => {
    resetGame(); const item = object('APPLE', { owornmask: W_WEP });
    assert.equal(doname(item, { twoWeapon: true, primaryWeapon: item, leftHanded: true, hand: 'claw' }), 'an uncursed apple (wielded in left claw)');
    item.owornmask = W_SWAPWEP;
    assert.equal(doname(item, { twoWeapon: true, leftHanded: true, hand: 'claw' }), 'an uncursed apple (wielded in right claw)');
    item.owornmask = W_WEP;
    assert.equal(doname(item, { mergingToWielded: true }), 'an uncursed apple');
});

test('armor donning, doffing, embedded skin, slippery gloves and emitted light', () => {
    resetGame(); const armor = object('LEATHER_GLOVES', { owornmask: W_ARMG, lamplit: true });
    assert.equal(doname(armor, { glib: true, doffing: () => true, donning: () => true, artifactLight: () => 'dimly' }), 'an uncursed +0 pair of leather gloves (being doffed; slippery, dimly lit)');
    assert.equal(doname(armor, { donning: () => true, blind: true }), 'an uncursed +0 pair of leather gloves (being donned)');
    assert.equal(doname(armor, { skin: armor }), 'an uncursed +0 pair of leather gloves (embedded in your skin)');
});

test('warning glow takes precedence over weapon light and requires sight', () => {
    resetGame(); const sword = object('LONG_SWORD', { owornmask: W_WEP, lamplit: true });
    const D = { weaponWarning: () => 'glimmering blue', artifactLight: () => 'brightly' };
    assert.equal(doname(sword, D), 'a +0 long sword (weapon in right hand, glimmering blue)');
    assert.equal(doname(sword, { ...D, blind: true }), 'a +0 long sword (weapon in right hand)');
});

test('candle formatting adds the outstanding burn timer to remaining fuel', () => {
    resetGame(); const candle = object('WAX_CANDLE', { age: 100, lamplit: true });
    assert.equal(doname(candle, { moves: 1000, burnDeadline: () => 1300 }), 'an uncursed wax candle (lit)');
    assert.equal(doname(candle, { moves: 1001, burnDeadline: () => 1300 }), 'an uncursed partly used wax candle (lit)');
});

test('leash naming finds its monster and clears a dangling monster id', () => {
    resetGame(); const leash = object('LEASH', { leashmon: 9 });
    assert.equal(doname(leash, { leashedMonster: id => id === 9 && 'Fido' }), 'an uncursed leash (attached to Fido)');
    assert.equal(doname(leash, { leashedMonster: () => null }), 'an uncursed leash');
    assert.equal(leash.leashmon, 0);
});

test('egg recognition uses species knowledge independently of instance knowledge', () => {
    resetGame(); const egg = object('EGG', { known: false, spe: 1, corpsenm: MONS.findIndex(mon => mon.name === 'cockatrice') });
    assert.equal(doname(egg), 'an uncursed egg');
    assert.equal(doname(egg, { knownEgg: species => species === egg.corpsenm }), 'an uncursed cockatrice egg (laid by you)');
});

test('price suppression does not invoke shop callbacks while restoring', () => {
    resetGame(); const item = object('APPLE', { owt: 2 }); let calls = 0;
    const D = { wizard: true, wizweight: true, priceSuffix: (actual, floor) => {
        assert.equal(actual, item); calls++; return floor ? ' (for sale, 7 zorkmids)' : ' (unpaid, 1 zorkmid)';
    } };
    assert.equal(doname(item, D), 'an uncursed apple (unpaid, 1 zorkmid) (2 aum)');
    assert.equal(doname(item, D, { withPrice: true }), 'an uncursed apple (for sale, 7 zorkmids, 2 aum)');
    for (const state of [{ suppressPrice: true }, { restoring: true }])
        assert.equal(doname(item, { ...D, ...state }, { withPrice: true }), 'an uncursed apple (2 aum)');
    assert.equal(calls, 2);
});
