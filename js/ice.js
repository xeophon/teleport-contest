import { game } from './gstate.js';
import {
    BEAR_TRAP, DB_FLOOR, DB_ICE, DB_MOAT, DB_UNDER, DRAWBRIDGE_DOWN,
    DRAWBRIDGE_UP, ICED_POOL, ICE, IN_SIGHT, IS_POOL, Is_waterlevel,
    LANDMINE, MAGIC_PORTAL, MOAT, POOL, ROOM, VIBRATING_SQUARE,
} from './const.js';
import { rn2 } from './rng.js';
import { newsym } from './display.js';
import { vision_recalc } from './vision.js';

const BOULDER = 465;
const CORPSE = 471;
const LAND_MINE = 10160;
const BEARTRAP = 10161;

const ICE_MELT_MESSAGE = 'The ice crackles and melts.';
const BOULDER_SETTLES_MESSAGE = 'A boulder settles...';
const ROT_ICE_ADJUSTMENT = 2;

export function isIceAt(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return loc.typ === ICE
        || (loc.typ === DRAWBRIDGE_UP && ((loc.flags || 0) & DB_UNDER) === DB_ICE);
}

function heroAt(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

function visibleAt(x, y) {
    return !game.u?.blind && !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
}

function removeMeltTimers(loc, x, y) {
    delete loc.meltIceTurn;
    delete loc.meltIceTimeout;
    delete loc.meltIceAwayTurn;
    if (game.level?.meltIceTimers)
        game.level.meltIceTimers = game.level.meltIceTimers.filter(timer => timer.x !== x || timer.y !== y);
}

function isCorpseObject(obj) {
    return obj?.otyp === CORPSE || obj?.otyp === 'corpse';
}

function corpseOnIce(obj) {
    return !!(obj?.onIce || obj?.on_ice);
}

function setCorpseOnIce(obj, value) {
    obj.onIce = !!value;
    obj.on_ice = value ? 1 : 0;
}

function objectTimerKey(obj) {
    if (obj?.rotAwayTurn) return 'rotAwayTurn';
    if (obj?.reviveTurn) return 'reviveTurn';
    return null;
}

function adjustCorpseIceTimer(obj, x, y, { onLevel = true } = {}) {
    if (!isCorpseObject(obj)) return;
    const key = objectTimerKey(obj);
    if (!key) return;

    const moves = game.moves || 0;
    const nowOnIce = onLevel && isIceAt(x, y);
    const wasOnIce = corpseOnIce(obj);
    let tleft = Math.trunc((obj[key] || 0) - moves);
    if (tleft <= 0) return;

    const ageElapsed = Math.trunc(moves - (obj.age ?? moves));
    if (nowOnIce && !wasOnIce) {
        setCorpseOnIce(obj, true);
        obj[key] = moves + (tleft * ROT_ICE_ADJUSTMENT);
        obj.age = moves - (ageElapsed * ROT_ICE_ADJUSTMENT);
    } else if (wasOnIce && !nowOnIce) {
        setCorpseOnIce(obj, false);
        obj[key] = moves + Math.trunc(tleft / ROT_ICE_ADJUSTMENT);
        obj.age = (obj.age ?? moves) + Math.trunc(ageElapsed * (ROT_ICE_ADJUSTMENT - 1) / ROT_ICE_ADJUSTMENT);
    }
}

export function objectIceEffect(obj, x = obj?.ox, y = obj?.oy, options = {}) {
    if (x == null || y == null) return;
    adjustCorpseIceTimer(obj, x, y, options);
}

export function objIceEffectsAt(x, y, { doBuried = false } = {}) {
    const lvl = game.level;
    if (!lvl) return;
    const seen = new Set();
    for (const obj of lvl.objects || []) {
        if (obj?.ox !== x || obj?.oy !== y || obj.buried) continue;
        seen.add(obj);
        objectIceEffect(obj, x, y);
    }
    if (!doBuried) return;
    for (const obj of lvl.buriedobjlist || []) {
        if (obj?.ox !== x || obj?.oy !== y || seen.has(obj)) continue;
        seen.add(obj);
        objectIceEffect(obj, x, y);
    }
    for (const obj of lvl.objects || []) {
        if (obj?.ox !== x || obj?.oy !== y || !obj.buried || seen.has(obj)) continue;
        objectIceEffect(obj, x, y);
    }
}

function applyTrapIceEffects(x, y) {
    const trap = (game.level?.traps || []).find(item => item.tx === x && item.ty === y);
    if (!trap) return;
    const mon = (game.level?.monsters || []).find(candidate => candidate.mx === x && candidate.my === y);
    if (mon) mon.mtrapped = 0;
    if (trap.ttyp === BEAR_TRAP || trap.ttyp === LANDMINE) {
        const object = trap.ttyp === LANDMINE
            ? { otyp: LAND_MINE, cls: 'tool', glyph: '(', kind: 'land mine', actualKind: 'land mine' }
            : { otyp: BEARTRAP, cls: 'tool', glyph: '(', kind: 'beartrap', actualKind: 'beartrap' };
        game.level.objects ??= [];
        game.level.objects.push({ ...object, ox: x, oy: y, buried: false, hidden: false });
    }
    if (trap.ttyp !== MAGIC_PORTAL && trap.ttyp !== VIBRATING_SQUARE)
        game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
}

function unearthObjectsAt(x, y) {
    const lvl = game.level;
    if (!lvl) return;
    const unearthed = [];
    if (lvl.buriedobjlist?.length) {
        const buried = [];
        for (const obj of lvl.buriedobjlist) {
            if (obj?.ox === x && obj?.oy === y) unearthed.push(obj);
            else buried.push(obj);
        }
        lvl.buriedobjlist = buried;
    }
    lvl.objects ??= [];
    for (const obj of unearthed) {
        obj.buried = false;
        obj.hidden = false;
        obj.ox = x;
        obj.oy = y;
        if (!lvl.objects.includes(obj)) lvl.objects.push(obj);
        objectIceEffect(obj, x, y);
    }
    for (const obj of lvl.objects) {
        if (obj?.ox !== x || obj?.oy !== y || !obj.buried) continue;
        obj.buried = false;
        obj.hidden = false;
        objectIceEffect(obj, x, y);
    }
    if (lvl.engravings) lvl.engravings = lvl.engravings.filter(engr => engr.x !== x || engr.y !== y);
}

function boulderAt(x, y) {
    return (game.level?.objects || []).find(obj =>
        !obj.buried && !obj.hidden && obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
}

function removeObject(obj) {
    if (!game.level?.objects) return;
    game.level.objects = game.level.objects.filter(item => item !== obj);
}

function buryObjectsAt(x, y) {
    const lvl = game.level;
    if (!lvl?.objects?.length) return;
    lvl.buriedobjlist ??= [];
    const remaining = [];
    for (const obj of lvl.objects) {
        if (obj.ox === x && obj.oy === y && !obj.transientProjectile) {
            obj.buried = true;
            obj.hidden = true;
            lvl.buriedobjlist.push(obj);
        } else {
            remaining.push(obj);
        }
    }
    lvl.objects = remaining;
}

function waterbodyName(loc) {
    if (loc?.typ === MOAT || loc?.typ === DRAWBRIDGE_UP) return 'moat';
    return 'pool of water';
}

function isLiquidPoolLocation(loc) {
    if (!loc) return false;
    if (loc.typ === DRAWBRIDGE_UP) return ((loc.flags || 0) & DB_UNDER) === DB_MOAT;
    return IS_POOL(loc.typ);
}

function settleBouldersAt(x, y) {
    const messages = [];
    let loc = game.level?.at(x, y);
    while (isLiquidPoolLocation(loc)) {
        const boulder = boulderAt(x, y);
        if (!boulder) break;
        const visible = visibleAt(x, y);
        if (visible) messages.push(BOULDER_SETTLES_MESSAGE);
        removeObject(boulder);
        const fills = !Is_waterlevel(game.u?.uz) && rn2(10) !== 0;
        const what = waterbodyName(loc);
        if (fills) {
            if (loc.typ === DRAWBRIDGE_UP) loc.flags = ((loc.flags || 0) & ~DB_UNDER) | DB_FLOOR;
            else {
                loc.typ = ROOM;
                loc.flags = 0;
            }
            game.level.traps = (game.level?.traps || []).filter(trap => trap.tx !== x || trap.ty !== y);
            buryObjectsAt(x, y);
            newsym(x, y);
        }
        if (visible) {
            messages.push(`There is a large splash as the boulder ${fills ? 'fills' : 'falls into'} the ${what}.`);
        } else if (!game.u?._deafTimeout && !(game.u?._statusSuffix || '').includes('Deaf')) {
            messages.push('You hear a splash.');
        }
        loc = game.level?.at(x, y);
    }
    return messages;
}

export function meltIceAt(x, y, { message = ICE_MELT_MESSAGE } = {}) {
    const loc = game.level?.at(x, y);
    if (!loc || !isIceAt(x, y)) return { melted: false, messages: [], becameLiquid: false };

    if (loc.typ === DRAWBRIDGE_UP || loc.typ === DRAWBRIDGE_DOWN) {
        loc.flags = ((loc.flags || 0) & ~DB_UNDER) | DB_MOAT;
    } else {
        loc.typ = (loc.flags || loc.icedpool) === ICED_POOL ? POOL : MOAT;
        loc.flags = 0;
        delete loc.icedpool;
    }
    removeMeltTimers(loc, x, y);
    applyTrapIceEffects(x, y);
    objIceEffectsAt(x, y, { doBuried: false });
    unearthObjectsAt(x, y);
    if (game.u?.underwater || game.u?.uunderwater) vision_recalc(1);
    newsym(x, y);

    const messages = [];
    if (visibleAt(x, y) || heroAt(x, y)) messages.push(message);
    messages.push(...settleBouldersAt(x, y));
    const finalLoc = game.level?.at(x, y);
    return { melted: true, messages, becameLiquid: isLiquidPoolLocation(finalLoc) };
}
