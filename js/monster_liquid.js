import { game } from './gstate.js';
import { DB_MOAT, DB_UNDER, DRAWBRIDGE_UP, IN_SIGHT, IS_POOL, Is_waterlevel } from './const.js';
import { newsym } from './display.js';
import { dropMonsterInventory, mkcorpstat } from './mklev.js';
import { rn2 } from './rng.js';
import { CLR_BROWN } from './terminal.js';

const CORPSE = 471;

function monsterVisibleAt(mon, x, y) {
    return !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT)
        && !mon?.minvis && !mon?.mundetected;
}

function monsterCanStayAbovePool(mon) {
    const data = mon?.data || {};
    return (data.inAir || data.flyer || data.floater) && !Is_waterlevel(game.u?.uz);
}

function monsterCantDrown(mon) {
    const data = mon?.data || {};
    return !!(data.swimmer || data.amphibious || data.breathless || data.nonliving);
}

function isPostMeltLiquid(loc) {
    if (!loc) return false;
    if (loc.typ === DRAWBRIDGE_UP) return ((loc.flags || 0) & DB_UNDER) === DB_MOAT;
    return IS_POOL(loc.typ);
}

function removeLiquidKilledMonster(mon, recordKill = null, awardExperience = false) {
    const data = mon.data || {};
    const corpseData = data.corpse || data;
    const corpseChance = 2 + ((data.genoFreq ?? 1) < 2 ? 1 : 0) + (data.verysmall ? 1 : 0);
    const corpseRoll = rn2(corpseChance);
    dropMonsterInventory(mon);
    if (!corpseRoll && corpseData && !corpseData.noCorpse) {
        const corpse = mkcorpstat(CORPSE, mon, corpseData, mon.mx, mon.my, 8);
        Object.assign(corpse, {
            otyp: 'corpse',
            glyph: '%',
            color: corpseData.color ?? data.color ?? CLR_BROWN,
            corpsenm: corpseData,
            oldCorpse: !!data.corpse,
        });
    }
    recordKill?.(mon, awardExperience);
    const loc = game.level?.at(mon.mx, mon.my);
    if (loc?.map_invisible) {
        loc.map_invisible = false;
        loc.remembered_glyph = null;
    }
    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
    mon.movement = 0;
    mon.dead = true;
    newsym(mon.mx, mon.my);
}

export function applyMeltedIceMonsterLiquidEffects(x, y, {
    heroCaused = false,
    recordKill = null,
} = {}) {
    const loc = game.level?.at(x, y);
    if (!isPostMeltLiquid(loc)) return [];
    const mon = (game.level?.monsters || []).find(candidate =>
        candidate.mx === x && candidate.my === y && (candidate.mhp == null || candidate.mhp > 0));
    if (!mon || monsterCanStayAbovePool(mon) || monsterCantDrown(mon)) return [];

    const messages = [];
    if (monsterVisibleAt(mon, x, y)) {
        const name = mon.data?.name || 'creature';
        messages.push(heroCaused ? `You drown the ${name}.` : `The ${name} drowns.`);
    }
    removeLiquidKilledMonster(mon, recordKill, heroCaused);
    return messages;
}
