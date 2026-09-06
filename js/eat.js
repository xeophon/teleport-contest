// eat.c: tin contents, variety selection and the details used by xname.
import { rn2 } from './rng.js';
import { MONS, is_rider, vegetarian } from './permonst.js';

export const TIN_VARIETY_TEXTS = [
    'rotten', 'homemade', 'soup made from', 'french fried', 'pickled',
    'boiled', 'smoked', 'dried', 'deep fried', 'szechuan', 'broiled',
    'stir fried', 'sauteed', 'candied', 'pureed',
];

// eat.c:set_tin_variety stores preparation in spe; cknown controls whether
// the player can see it. Health food shops retain vegetarian contents.
export function setTinVariety(item, force = -2) {
    const monster = typeof item.corpsenm === 'number' ? MONS[item.corpsenm]
        : MONS.find(mon => mon.name === item.corpsenm?.name);
    if (force === -1 || force === -3 && (!monster || !vegetarian(monster))) {
        item.corpsenm = -1;
        item.spe = 1;
        return;
    }
    let variety;
    if (force === -3) {
        variety = tinVariety(item, false);
        if (variety < 0 || variety >= 16) variety = 0;
        while (variety === 0 && !item.cursed || ![1, 2, 4, 5, 6, 7, 9, 13, 14].includes(variety))
            variety = rn2(TIN_VARIETY_TEXTS.length);
    } else if (force >= 0 && force < TIN_VARIETY_TEXTS.length) variety = force;
    else {
        variety = rn2(TIN_VARIETY_TEXTS.length);
        if (variety === 0 && monster && (['lizard', 'lichen', 'acid blob'].includes(monster.name) || is_rider(monster))) variety = 1;
    }
    item.spe = -(variety + 1);
}

export function tinVariety(item, display = false) {
    let variety;
    if (item.spe === 1) variety = -1;
    else if (item.cursed) variety = 0;
    else if (item.spe < 0) variety = -item.spe - 1;
    else variety = rn2(TIN_VARIETY_TEXTS.length);
    if (!display && variety === 1 && !item.blessed && !rn2(7)) variety = 0;
    const monster = typeof item.corpsenm === 'number' ? MONS[item.corpsenm]
        : MONS.find(mon => mon.name === item.corpsenm?.name);
    if (variety === 0 && monster && (['lizard', 'lichen', 'acid blob'].includes(monster.name) || is_rider(monster))) variety = 1;
    return variety;
}

export function tinDetails(item, name = 'tin', override = false) {
    const variety = tinVariety(item, true);
    if (variety === -1) return name + ' of spinach';
    if (item.corpsenm == null || item.corpsenm === -1) return 'empty tin';
    const monster = typeof item.corpsenm === 'number' ? MONS[item.corpsenm]
        : MONS.find(mon => mon.name === item.corpsenm.name);
    const species = monster?.name || item.corpsenm.name;
    let result = name + ' of ';
    if ((item.cknown || override) && item.spe < 0) {
        const description = TIN_VARIETY_TEXTS[variety];
        result = variety < 2 ? description + ' ' + result : result + description + ' ';
    }
    return result + species + (monster && vegetarian(monster) ? '' : ' meat');
}
