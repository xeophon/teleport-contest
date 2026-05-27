import assert from 'node:assert/strict';
import test from 'node:test';

import { interruptEatingOccupation, processEatingOccupationTick } from '../js/allmain.js';
import { burnFloorObjectsByFire, earthFloorEffects, finishForceLock, processCorpseTimers, processGlobShrinkTimers, processSpellbookStudyOccupation, rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { initRng } from '../js/rng.js';
import { CANDLESHOP, DB_EAST, DB_MOAT, DBWALL, DOOR, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, HOLE, IN_SIGHT, LAVAPOOL, POOL, ROOM, ROOMOFFSET, SHOPBASE } from '../js/const.js';
import { currentFruitId, setCurrentFruitName } from '../js/fruit.js';

const BRASS_LANTERN = 226;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const POT_OIL = 252;
const CRYSTAL_BALL = 10088;
const CANDELABRUM_OF_INVOCATION = 10076;
const BELL = 358;
const POT_ACID = 238;
const INVENTORY_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SCR_SCARE_MONSTER = 279;
const LOADSTONE = 10165;
const BOULDER = 465;
const HORN_OF_PLENTY = 957;
const BAG_OF_TRICKS = 10158;
const POT_WATER = 253;
const SLIME_MOLD = 11009;
const MEAT_RING = 10164;

function installShopState() {
    const g = resetGame();
    initRng(1);
    const roomno = ROOMOFFSET;
    const shkp = {
        isshk: true,
        shoproom: roomno,
        shoptype: SHOPBASE,
        shknam: 'Izchak',
        mx: 6,
        my: 5,
        shk: { x: 6, y: 5 },
        bill: [],
        billct: 0,
        minvent: [{ cls: 'coin', otyp: 466, glyph: '$', quan: 100 }],
        m_id: 1,
    };
    g.flags = {};
    g.inventory = [];
    g._goldCount = 0;
    g.u = {
        ux: 5,
        uy: 5,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    g.level = {
        rooms: [{ rtype: SHOPBASE, resident: shkp }],
        monsters: [shkp],
        objects: [],
        at: () => ({ roomno }),
    };
    return { shkp };
}

function makeCandleShop(shkp) {
    shkp.shoptype = CANDLESHOP;
    if (game.level?.rooms?.[0]) game.level.rooms[0].rtype = CANDLESHOP;
}

function installCommandShopState() {
    const state = installShopState();
    Object.assign(game.u, {
        uhunger: 900,
        uhp: 10,
        uhpmax: 10,
        uen: 0,
        uenmax: 0,
        ulevel: 1,
        uac: 10,
    });
    return state;
}

function finishEatingOccupation() {
    while (game._eating_turns_remaining > 0) {
        processEatingOccupationTick(game);
        if (game._command_mode === 'continueEatingPrompt') {
            game._command_mode = null;
            acknowledgePendingMessage();
        }
        if (game._eating_turns_remaining > 0 && game._pending_message) {
            acknowledgePendingMessage();
        }
    }
}

function acknowledgePendingMessage() {
    game._pending_message = '';
    game._message_more = false;
    game._process_time_with_more = 0;
    game._topline_after_more = '';
}

function acknowledgeMoreForOccupation() {
    acknowledgePendingMessage();
}

function installAngryNotRobbedPayState({ gold = 0, seed = 1, player = 'Hero', customer = 'PreviousCustomer' } = {}) {
    const { shkp } = installCommandShopState();
    initRng(seed);
    game.plname = player;
    Object.assign(shkp, {
        angry: true,
        hostile: true,
        mpeaceful: 0,
        following: 1,
        robbed: 0,
        debit: 0,
        loan: 0,
        credit: 0,
        bill: [],
        billct: 0,
        customer,
    });
    const purse = gold ? goldPieces(99100, gold) : null;
    game.inventory = purse ? [purse] : [];
    game._goldCount = gold;
    return { shkp, purse };
}

function assertStillAngryNotRobbed(shkp) {
    assert.equal(shkp.angry, true);
    assert.equal(shkp.hostile, true);
    assert.equal(shkp.mpeaceful, 0);
    assert.equal(shkp.following, 1);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(shkp.bill, []);
}

function assertPacifiedNoDebt(shkp) {
    assert.equal(shkp.angry, false);
    assert.equal(shkp.hostile, false);
    assert.equal(shkp.mpeaceful, 1);
    assert.equal(shkp.following, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 0);
}

function installTraditionalPayPromptState({ gold = 100, menuStyle = 'traditional' } = {}) {
    const { shkp } = installCommandShopState();
    if (menuStyle != null) game.flags.menu_style = menuStyle;
    const ration = foodRation(9701, 'a');
    const blade = dagger(9702, 'b');
    game.inventory = [ration, blade];
    game._goldCount = gold;
    shop.addObjectToShopBill(shkp, ration, 45);
    shop.addObjectToShopBill(shkp, blade, 10);
    return { shkp, ration, blade };
}

function makeShopkeeper(id, name, x, y, overrides = {}) {
    const resident = game.level?.rooms?.[0]?.resident || {};
    return {
        isshk: true,
        shoproom: resident.shoproom ?? ROOMOFFSET,
        shoptype: resident.shoptype ?? SHOPBASE,
        shknam: name,
        mx: x,
        my: y,
        shk: { x, y },
        bill: [],
        billct: 0,
        minvent: [],
        m_id: id,
        ...overrides,
    };
}

function installNonShopFloorState() {
    const state = installCommandShopState();
    game.level.rooms = [];
    game.level.monsters = [];
    game.level.objects = [];
    game.level.flags = {};
    game.level.at = () => ({ roomno: 0, typ: ROOM });
    return state;
}

function installSeenHoleAtHero() {
    game.u.uz = { dnum: 0, dlevel: 1 };
    game.dungeons = [{ num_dunlevs: 3 }];
    game.level.flags = {};
    game.level.traps = [{ ttyp: HOLE, tx: 5, ty: 5, tseen: true }];
    return game.level.traps[0];
}

function queuedImpactDropsFor(level = { dnum: 0, dlevel: 2 }) {
    return game._impact_drop_migrations?.get(`${level.dnum}:${level.dlevel}`) || [];
}

function assertUsedUpBillForObject(shkp, obj, price) {
    const entry = shop.shopBillEntryForObject(shkp, obj);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), price);
    assert.equal(shkp.billct, 1);
    assert.equal((game._usedUpShopBills || []).some(bill =>
        String(bill.bo_id) === String(entry.bo_id) && bill.price === price), true);
}

function makeCrystalBallGazeDeterministic() {
    initRng(1);
    game.u.acurr.a[1] = 25;
    game.u.blind = false;
    game.u.hallucinating = false;
    game.u._statusSuffix = '';
    game.u._confusionTimeout = 0;
    game.flags.verbose = false;
}

function makeInstrumentApplyDeterministic(shkp) {
    initRng(1);
    Object.assign(game.u, {
        ulevel: 1,
        blind: false,
        hallucinating: false,
        stunned: false,
        _statusSuffix: '',
        _deafTimeout: 0,
        _confusionTimeout: 0,
        _stunTimeout: 0,
    });
    Object.assign(shkp, { mx: 20, my: 20, shk: { x: 20, y: 20 } });
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    game.flags.verbose = false;
}

function dagger(id, letter = 'd') {
    return {
        id,
        cls: 'weapon',
        glyph: ')',
        kind: 'dagger',
        actualKind: 'dagger',
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a dagger`,
        dknown: true,
        known: true,
    };
}

function wieldedWeapon(id, kind, letter = 'w', spe = 0) {
    return {
        id,
        cls: 'weapon',
        glyph: ')',
        kind,
        actualKind: kind,
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        wielded: true,
        known: true,
        dknown: true,
        line: `${letter} - a ${spe >= 0 ? '+' : ''}${spe} ${kind} (weapon in right hand)`,
    };
}

function wornArmor(id, kind = 'leather armor', letter = 'a', spe = 0, extra = {}) {
    return {
        id,
        cls: 'armor',
        glyph: '[',
        kind,
        actualKind: kind,
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        worn: true,
        known: true,
        dknown: true,
        line: `${letter} - a ${spe >= 0 ? '+' : ''}${spe} ${kind} (being worn)`,
        ...extra,
    };
}

function foodRation(id, letter = 'a') {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'food ration',
        actualKind: 'food ration',
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a food ration`,
    };
}

function foodRationStack(id, quan, letter = 'a') {
    return {
        ...foodRation(id, letter),
        quan,
        plural: 'food rations',
        line: `${letter} - ${quan} food rations`,
    };
}

function simpleFood(id, kind, letter = 'f', extra = {}) {
    const pluralByKind = {
        apple: 'apples',
        orange: 'oranges',
        pear: 'pears',
        melon: 'melons',
        banana: 'bananas',
        carrot: 'carrots',
        'lembas wafer': 'lembas wafers',
        'K-ration': 'K-rations',
        'C-ration': 'C-rations',
        pancake: 'pancakes',
        'cream pie': 'cream pies',
        'cram ration': 'cram rations',
        'fortune cookie': 'fortune cookies',
        'lump of royal jelly': 'lumps of royal jelly',
        meatball: 'meatballs',
        'enormous meatball': 'enormous meatballs',
        'kelp frond': 'kelp fronds',
        'sprig of wolfsbane': 'sprigs of wolfsbane',
        'clove of garlic': 'cloves of garlic',
        'eucalyptus leaf': 'eucalyptus leaves',
        'tripe ration': 'tripe rations',
    };
    const article = /^[aeiou]/i.test(kind) ? 'an' : 'a';
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind,
        actualKind: kind,
        quan: 1,
        plural: pluralByKind[kind],
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${article} ${kind}`,
        ...extra,
    };
}

function slimeMoldFood(id, letter = 's', fname = 'slime mold', fid = 1, extra = {}) {
    const plural = fname.endsWith('s') ? `${fname}es` : `${fname}s`;
    return {
        id,
        otyp: SLIME_MOLD,
        cls: 'food',
        glyph: '%',
        kind: fname,
        actualKind: 'slime mold',
        singular: fname,
        plural,
        spe: fid,
        quan: 1,
        nutrition: 250,
        owt: 5,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a ${fname}`,
        ...extra,
    };
}

function meatRingFood(id, letter = 'm', extra = {}) {
    return {
        id,
        otyp: MEAT_RING,
        cls: 'food',
        glyph: '%',
        kind: 'meat ring',
        actualKind: 'meat ring',
        singular: 'meat ring',
        plural: 'meat rings',
        quan: 1,
        nutrition: 5,
        owt: 5,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a meat ring`,
        ...extra,
    };
}

function creamPie(id, letter = 'p', quan = 1) {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'cream pie',
        actualKind: 'cream pie',
        quan,
        plural: quan > 1 ? 'cream pies' : undefined,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} cream pies` : 'a cream pie'}`,
    };
}

function chargedTool(id, kind, letter = 't', spe = 3) {
    return {
        id,
        cls: 'tool',
        glyph: '(',
        kind,
        actualKind: kind,
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a ${kind}`,
    };
}

function bellOfOpening(id, letter = 'b', spe = 3) {
    return {
        ...chargedTool(id, 'silver bell', letter, spe),
        otyp: BELL,
        actualKind: 'bell of opening',
        known: false,
        dknown: true,
        line: `${letter} - a silver bell`,
    };
}

function floorBagOfTricks(id, spe = 3, extra = {}) {
    const bag = {
        ...chargedTool(id, 'bag of tricks', 'b', spe),
        otyp: BAG_OF_TRICKS,
        known: true,
        dknown: true,
        ox: 5,
        oy: 5,
        ...extra,
    };
    delete bag.letter;
    delete bag.line;
    return bag;
}

function testObjectKind(item) {
    return String(item?.actualKind || item?.kind || '').toLowerCase()
        .replace(/^(?:blessed|uncursed|cursed) /, '');
}

function expectedUnpaidUsageFee(item, { altusage = false, chargeCount = item?.spe ?? item?.charges ?? 0 } = {}) {
    const kind = testObjectKind(item);
    let fee = shop.shopItemPrice(item, 5, 5) || 0;
    const charges = Math.max(0, Math.trunc(Number(chargeCount || 0)));
    if (kind === 'magic lamp') {
        if (!altusage) return 10;
        fee += Math.trunc(fee / 3);
    } else if (kind === 'magic marker') {
        fee = Math.trunc(fee / 2);
    } else if (!altusage && (kind === 'bag of tricks' || kind === 'horn of plenty')) {
        fee = Math.trunc(fee / 5);
    } else if (item?.cls === 'wand' || item?.glyph === '/' || kind === 'crystal ball'
        || kind === 'oil lamp' || kind === 'brass lantern' || kind === 'magic flute'
        || kind === 'magic harp' || kind === 'frost horn' || kind === 'fire horn'
        || kind === 'drum of earthquake') {
        if (charges > 1) fee = Math.trunc(fee / 4);
    } else if (item?.cls === 'spellbook' || item?.glyph === '+') {
        fee -= Math.trunc(fee / 5);
    } else if (kind === 'can of grease' || kind === 'tinning kit' || kind === 'expensive camera') {
        fee = Math.trunc(fee / 10);
    } else if (item?.cls === 'potion' && /(?:^| )oil$|potion of oil/.test(kind)) {
        fee = Math.trunc(fee / 5);
    }
    return Math.max(0, fee);
}

function scrollOfCharging(id, letter = 's', cursed = false) {
    return {
        id,
        cls: 'scroll',
        glyph: '?',
        kind: 'scroll of charging',
        actualKind: 'scroll of charging',
        scrollIndex: 19,
        cursed,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a scroll of charging`,
    };
}

function scrollOfRemoveCurse(id, letter = 's', blessed = false, cursed = false) {
    return {
        id,
        cls: 'scroll',
        glyph: '?',
        kind: 'scroll of remove curse',
        actualKind: 'scroll of remove curse',
        scrollIndex: 4,
        blessed,
        cursed,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a scroll of remove curse`,
    };
}

function scrollOfEnchantWeapon(id, letter = 's', cursed = false) {
    return {
        id,
        cls: 'scroll',
        glyph: '?',
        kind: 'scroll of enchant weapon',
        actualKind: 'scroll of enchant weapon',
        scrollIndex: 5,
        cursed,
        bknown: true,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a scroll of enchant weapon`,
    };
}

function scrollOfEnchantArmor(id, letter = 's', cursed = false) {
    return {
        id,
        cls: 'scroll',
        glyph: '?',
        kind: 'scroll of enchant armor',
        actualKind: 'scroll of enchant armor',
        scrollIndex: 0,
        cursed,
        bknown: true,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a scroll of enchant armor`,
    };
}

function scrollOfDestroyArmor(id, letter = 's', cursed = false) {
    return {
        id,
        cls: 'scroll',
        glyph: '?',
        kind: 'scroll of destroy armor',
        actualKind: 'scroll of destroy armor',
        scrollIndex: 1,
        cursed,
        bknown: true,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a scroll of destroy armor`,
    };
}

function chargeableRing(id, letter = 'r', spe = 0) {
    return {
        id,
        cls: 'ring',
        glyph: '=',
        kind: 'ring of protection',
        actualKind: 'ring of protection',
        ringRoll: 6,
        charged: true,
        known: true,
        dknown: true,
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a ring of protection`,
    };
}

function ordinaryTool(id, kind, letter = 't') {
    const tool = chargedTool(id, kind, letter, 0);
    delete tool.spe;
    return tool;
}

function sleepingMonster(name, x = 7, y = 5, data = {}) {
    return {
        mx: x,
        my: y,
        mhp: 5,
        m_lev: 1,
        mr: 0,
        msleeping: 1,
        mcanmove: false,
        mfrozen: 3,
        mpeaceful: true,
        data: { name, mlevel: 1, ...data },
    };
}

function installNoBlowButHandsForm() {
    game.u._polyself_form = {
        name: 'gas spore',
        nohands: false,
        silent: true,
        breathless: true,
        verysmall: true,
    };
}

function installStrongholdInstrumentState(tune = 'ABCDE') {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    game.castleTune = tune;
    game.u.uz = { dnum: 0, dlevel: 10 };
    game.u.uevent = {};
    game.stronghold_level = { dnum: 0, dlevel: 10 };
    const cells = new Map();
    const key = (x, y) => `${x},${y}`;
    const bridge = { typ: DRAWBRIDGE_UP, flags: DB_EAST | DB_MOAT, roomno: ROOMOFFSET };
    const wall = { typ: DBWALL, flags: 0, roomno: ROOMOFFSET };
    cells.set(key(6, 5), bridge);
    cells.set(key(7, 5), wall);
    game.level.at = (x, y) => cells.get(key(x, y)) || { typ: ROOM, roomno: ROOMOFFSET };
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    return { shkp, bridge, wall };
}

function crystalBall(id, letter = 'c', spe = 2) {
    return {
        id,
        otyp: CRYSTAL_BALL,
        cls: 'tool',
        glyph: '(',
        kind: 'crystal ball',
        actualKind: 'crystal ball',
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a crystal ball`,
        known: true,
        dknown: true,
    };
}

function candelabrum(id, letter = 'c', spe = 0) {
    return {
        id,
        otyp: CANDELABRUM_OF_INVOCATION,
        cls: 'tool',
        glyph: '(',
        kind: 'candelabrum of invocation',
        actualKind: 'candelabrum of invocation',
        quan: 1,
        spe,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a candelabrum of invocation`,
        known: true,
        dknown: true,
    };
}

function blankScroll(id, letter = 's') {
    return {
        id,
        cls: 'scroll',
        glyph: '?',
        kind: 'blank paper',
        actualKind: 'scroll of blank paper',
        scrollIndex: 21,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a scroll of blank paper`,
        known: true,
        dknown: true,
        bknown: true,
    };
}

function floorScareMonsterScroll(id, props = {}) {
    return {
        id,
        otyp: SCR_SCARE_MONSTER,
        cls: 'scroll',
        glyph: '?',
        kind: 'scroll of scare monster',
        actualKind: 'scroll of scare monster',
        scrollIndex: 3,
        quan: 1,
        spe: 0,
        blessed: false,
        cursed: false,
        ox: 5,
        oy: 5,
        known: true,
        dknown: true,
        bknown: true,
        ...props,
    };
}

function setScareScrollLabel(label = 'TRYME TEST') {
    game._object_descriptions ??= {};
    game._object_descriptions.scrolls = [...(game._object_descriptions.scrolls || [])];
    game._object_descriptions.scrolls[3] = label;
    return label;
}

function unknownLabeledScareMonsterScroll(id, props = {}) {
    const { label = 'TRYME TEST', letter = 's', ...rest } = props;
    const scrollLabel = setScareScrollLabel(label);
    return floorScareMonsterScroll(id, {
        letter,
        kind: `scroll labeled ${scrollLabel}`,
        actualKind: 'scroll of scare monster',
        known: false,
        dknown: true,
        bknown: false,
        line: `${letter} - a scroll labeled ${scrollLabel}`,
        ...rest,
    });
}

async function answerScrollTryCall(label, name = 'fear') {
    assert.equal(game._command_mode, 'callScrollAfterMore');
    assert.equal(game._call_scroll_label, label);

    await rhack(' ');
    assert.equal(game._command_mode, 'callScrollText');
    assert.match(game._pending_message, new RegExp(`Call a scroll labeled ${label}:`));

    for (const ch of name) await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game._called_scrolls?.[label], name);
    assert.equal(
        game._discoveries.some(entry =>
            entry.section === 'Scrolls'
            && entry.name === `scroll called ${name}`
            && entry.text === `scroll called ${name} (${label})`),
        true,
    );
}

function floorLoadstone(id, props = {}) {
    return {
        id,
        otyp: LOADSTONE,
        cls: 'gem',
        glyph: '*',
        kind: 'loadstone',
        actualKind: 'loadstone',
        gemDescription: 'gray stone',
        quan: 1,
        cursed: true,
        blessed: false,
        ox: 5,
        oy: 5,
        known: true,
        dknown: true,
        bknown: true,
        ...props,
    };
}

function floorBoulder(id, props = {}) {
    return {
        id,
        otyp: BOULDER,
        cls: 'rock',
        glyph: '`',
        kind: 'boulder',
        actualKind: 'boulder',
        quan: 1,
        ox: 5,
        oy: 5,
        owt: 6000,
        ...props,
    };
}

function carriedLoadstone(id, letter = 'l', props = {}) {
    const stone = floorLoadstone(id, props);
    delete stone.ox;
    delete stone.oy;
    stone.letter = letter;
    stone.line = `${letter} - a ${stone.cursed ? 'cursed ' : 'uncursed '}loadstone`;
    return stone;
}

function installThrowsRocksForm() {
    game.u._polyself_form = {
        name: 'stone giant',
        mlet: 'H',
        nohands: false,
        throwsRocks: true,
        strong: true,
        giant: true,
    };
}

function installMetallivorousForm() {
    game.u._polyself_form = {
        name: 'rock mole',
        metallivorous: true,
        nohands: false,
        verysmall: false,
    };
}

function tin(id, letter = 't', quan = 1) {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'tin',
        actualKind: 'tin',
        singular: 'tin',
        plural: 'tins',
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter || 't'} - ${quan > 1 ? `${quan} tins` : 'a tin'}`,
        corpsenm: { name: 'newt' },
        spe: -2,
        known: true,
        dknown: true,
    };
}

function corpse(id, letter = 'c', name = 'newt', nutrition = 20) {
    return {
        id,
        otyp: 'corpse',
        cls: 'food',
        glyph: '%',
        kind: `${name} corpse`,
        actualKind: `${name} corpse`,
        singular: `${name} corpse`,
        plural: `${name} corpses`,
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a ${name} corpse`,
        corpsenm: { name, cnutrit: nutrition },
        known: true,
        dknown: true,
    };
}

function egg(id, letter = 'e', quan = 1) {
    return {
        id,
        cls: 'food',
        glyph: '%',
        kind: 'egg',
        actualKind: 'egg',
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} eggs` : 'an egg'}`,
    };
}

function goldPieces(id, quan, letter = '$') {
    return {
        id,
        cls: 'coin',
        otyp: 466,
        glyph: '$',
        quan,
        letter,
        line: `${letter} - ${quan} gold piece${quan === 1 ? '' : 's'}`,
    };
}

function sack(id, letter = 'b') {
    return {
        id,
        cls: 'tool',
        otyp: 217,
        glyph: '(',
        kind: 'sack',
        actualKind: 'sack',
        quan: 1,
        letter,
        line: `${letter} - a sack`,
        cknown: true,
        contents: [],
    };
}

function bagOfHolding(id, letter = 'b') {
    return {
        ...sack(id, letter),
        otyp: 219,
        kind: 'bag of holding',
        actualKind: 'bag of holding',
        line: `${letter} - a bag of holding`,
    };
}

function cancellationWand(id, letter = 'c') {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'wand of cancellation',
        actualKind: 'wand of cancellation',
        wand: 'cancellation',
        wandIndex: 13,
        quan: 1,
        spe: 1,
        letter,
        line: `${letter} - a wand of cancellation`,
    };
}

function wishingWand(id, letter = 'w') {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'wand of wishing',
        actualKind: 'wand of wishing',
        wand: 'wishing',
        wandIndex: 4,
        quan: 1,
        spe: 1,
        letter,
        line: `${letter} - a wand of wishing`,
    };
}

function lamp(id, kind = 'oil lamp', letter = 'l', spe = 1) {
    const otyp = kind === 'brass lantern' ? BRASS_LANTERN : kind === 'magic lamp' ? MAGIC_LAMP : OIL_LAMP;
    return {
        id,
        otyp,
        cls: 'tool',
        glyph: '(',
        kind,
        actualKind: kind,
        quan: 1,
        spe,
        age: 1500,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - an ${kind}`,
    };
}

function oilPotion(id, letter = 'o', quan = 1) {
    return {
        id,
        otyp: POT_OIL,
        cls: 'potion',
        glyph: '!',
        kind: 'oil',
        actualKind: 'potion of oil',
        potionIndex: 24,
        quan,
        age: 400,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} potions of oil` : 'a potion of oil'}`,
    };
}

function waterPotion(id, letter = 'w', { blessed = false, cursed = false, bknown = false, quan = 1 } = {}) {
    return {
        id,
        otyp: POT_WATER,
        cls: 'potion',
        glyph: '!',
        kind: 'water',
        actualKind: 'potion of water',
        potionIndex: null,
        blessed,
        cursed,
        bknown,
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} potions of ${cursed ? 'unholy ' : blessed ? 'holy ' : ''}water` : `a potion of ${cursed ? 'unholy ' : blessed ? 'holy ' : ''}water`}`,
    };
}

function acidPotion(id, letter = 'a', quan = 1) {
    return {
        id,
        otyp: POT_ACID,
        cls: 'potion',
        glyph: '!',
        kind: 'acid',
        actualKind: 'potion of acid',
        potionIndex: 23,
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} potions of acid` : 'a potion of acid'}`,
    };
}

function healingPotion(id, letter = 'h', quan = 1) {
    return {
        id,
        cls: 'potion',
        glyph: '!',
        kind: 'healing',
        actualKind: 'potion of healing',
        potionIndex: 1,
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} potions of healing` : 'a potion of healing'}`,
    };
}

async function startRubCommand() {
    await rhack('#');
    await rhack('r');
    await rhack('u');
    await rhack('b');
    await rhack('\n');
}

async function invokeRub(letter) {
    await startRubCommand();

    assert.equal(game._command_mode, 'rubObject');
    assert.match(game._pending_message, /What do you want to rub\?/);

    await rhack(letter);
}

async function startRoyalJellyRub(letter = 'j') {
    await invokeRub(letter);

    assert.equal(game._command_mode, 'rubRoyalJellyTarget');
    assert.match(game._pending_message, /What do you want to rub the royal jelly on\?/);
}

async function invokeRoyalJellyRub(jellyLetter = 'j', eggLetter = 'e') {
    await startRoyalJellyRub(jellyLetter);
    await rhack(eggLetter);
}

function healingSpellbook(id, letter = 'b') {
    return {
        id,
        cls: 'spellbook',
        glyph: '+',
        kind: 'spellbook of healing',
        actualKind: 'spellbook of healing',
        spellName: 'healing',
        spell: { name: 'healing', level: 1, skill: 'healing' },
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a spellbook of healing`,
        known: false,
        bknown: true,
    };
}

function floorHealingSpellbook(id, quan = 1) {
    const book = healingSpellbook(id);
    delete book.letter;
    delete book.line;
    book.known = true;
    book.quan = quan;
    return book;
}

function shopFloorContainer(id, x = 5, y = 5) {
    return {
        id,
        cls: 'tool',
        glyph: '(',
        kind: 'large box',
        actualKind: 'large box',
        ox: x,
        oy: y,
        contents: [],
        cknown: true,
    };
}

function shopFloorIceBox(id, x = 5, y = 5) {
    return {
        id,
        cls: 'tool',
        otyp: 216,
        glyph: '(',
        kind: 'ice box',
        actualKind: 'ice box',
        ox: x,
        oy: y,
        contents: [],
        cknown: true,
    };
}

function putObjectInContainer(container, obj) {
    obj.contained = true;
    obj.container = container;
    delete obj.letter;
    delete obj.line;
    delete obj.ox;
    delete obj.oy;
    container.contents = [...(container.contents || []), obj];
    return obj;
}

function fillInventoryLetters(startId = 7000) {
    game.inventory = [...INVENTORY_LETTERS].map((letter, index) => ({
        ...dagger(startId + index, letter),
        line: `${letter} - a dagger`,
    }));
}

async function confirmSingleContainerTakeout(container, obj, letter = 'a', label = 'Comestibles') {
    game._command_mode = 'lootTakeoutObjects';
    game._loot_takeout_container = container;
    game._loot_takeout_entries = [{ item: obj, label, letter }];
    game._loot_takeout_selected = [letter];
    await rhack(' ');
}

function assertBillRowsFor(shkp, objects) {
    assert.equal(shkp.billct, objects.length);
    assert.deepEqual(
        new Set(shkp.bill.map(entry => String(entry.bo_id))),
        new Set(objects.map(obj => String(obj.id))),
    );
    for (const obj of objects) {
        const entry = shop.shopBillEntryForObject(shkp, obj);
        assert.ok(entry);
        assert.equal(obj.unpaid, true);
        assert.equal(obj.unpaidPrice, shop.shopBillEntryTotal(entry));
    }
}

test('picked shop item enters the bill before inventory display compatibility', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(1001, 'a');
    const carried = { ...floorObj, line: 'a - a food ration' };
    const result = shop.addPickedObjectToShopBill(floorObj, carried);

    assert.ok(result.price > 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shkp.bill[0].bo_id, String(carried.id));
    assert.equal(carried.unpaid, true);
    assert.match(carried.line, /unpaid, \d+ zorkmids?/);
});

test('dropping unpaid non-container merchandise in the shop returns it to the bill', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(1001, 'a');
    const carried = { ...floorObj, line: 'a - a food ration' };
    shop.addPickedObjectToShopBill(floorObj, carried);

    const returned = { ...carried, ox: 5, oy: 5 };
    assert.equal(shop.sellobjReturnUnpaidToShop(returned, 5, 5), true);
    assert.equal(shkp.billct, 0);
    assert.equal(returned.unpaid, false);
    assert.doesNotMatch(returned.line, /unpaid/);
});

test('multiple bill entries can be removed by object or saved bill id', () => {
    const { shkp } = installShopState();
    const first = foodRation(2001, 'a');
    const second = foodRation(2002, 'b');

    shop.addObjectToShopBill(shkp, first, 45);
    shop.addObjectToShopBill(shkp, second, 45);
    assert.equal(shkp.billct, 2);
    assert.equal(shkp.bill.reduce((sum, entry) => sum + shop.shopBillEntryTotal(entry), 0), 90);

    assert.equal(shop.removeObjectFromShopBill(shkp, first), true);
    assert.equal(shop.removeObjectFromShopBillById(shkp, second.id), true);
    assert.equal(shkp.billct, 0);
});

test('shop-created carried objects use the same ledger representation', () => {
    const { shkp } = installShopState();
    const hornCreated = foodRation(3001, 'c');
    const bill = shop.addObjectToShopBill(shkp, hornCreated, 45);

    assert.ok(bill);
    assert.equal(hornCreated.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, hornCreated), bill);
    assert.equal(shop.shopBillEntryTotal(bill), 45);
});

test('normal unpaid charged tool use adds debit without changing the bill row', () => {
    const { shkp } = installShopState();
    const bag = chargedTool(3051, 'bag of tricks', 'b', 3);
    game.inventory = [bag];
    shop.addObjectToShopBill(shkp, bag, 100);
    const messages = [];
    const expectedFee = Math.trunc(shop.shopItemPrice(bag, 5, 5) / 5);

    const fee = shop.checkUnpaidUsageForTest(bag, messages);

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, bag);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(bag.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('Bell of Opening uses the C unique shop price', () => {
    installShopState();
    const bell = bellOfOpening(30511, 'b', 3);

    assert.equal(shop.shopBaseCost(bell), 5000);
});

test('unpaid Bell of Opening charged use bills full live-row price', () => {
    const { shkp } = installShopState();
    const bell = bellOfOpening(30512, 'b', 3);
    game.inventory = [bell];
    const price = shop.shopItemPrice(bell, 5, 5);
    shop.addObjectToShopBill(shkp, bell, price);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(bell, messages, { chargeCount: 3 });

    assert.equal(fee, price);
    assert.equal(shkp.debit, price);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, bell);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), price);
    assert.equal(bell.unpaid, true);
    assert.match(messages[0], new RegExp(`Usage fee, ${price} zorkmids`));
});

test('zero-charge unpaid Bell of Opening use adds no usage fee', () => {
    const { shkp } = installShopState();
    const bell = bellOfOpening(30513, 'b', 0);
    game.inventory = [bell];
    const price = shop.shopItemPrice(bell, 5, 5);
    shop.addObjectToShopBill(shkp, bell, price);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(bell, messages, { chargeCount: 0 });

    assert.equal(fee, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, bell).useup, false);
    assert.equal(messages.length, 0);
});

test('applying unpaid Bell of Opening spends a charge and keeps the live bill', async () => {
    const { shkp } = installCommandShopState();
    const bell = bellOfOpening(30514, 'b', 3);
    game.inventory = [bell];
    const price = shop.shopItemPrice(bell, 5, 5);
    shop.addObjectToShopBill(shkp, bell, price);
    const expectedFee = expectedUnpaidUsageFee(bell, { chargeCount: 3 });

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\? \[b or \?\*\]/);

    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bell.spe, 2);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, bell);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), price);
    assert.equal(bell.unpaid, true);
    assert.match(game._pending_message, /You ring the silver bell/);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('charged Bell of Opening on invocation square records recent ringing after billing', async () => {
    const { shkp } = installCommandShopState();
    const bell = bellOfOpening(30515, 'b', 1);
    game.inventory = [bell];
    game.level.invocationPosition = { x: 5, y: 5 };
    game.moves = 123;
    const price = shop.shopItemPrice(bell, 5, 5);
    shop.addObjectToShopBill(shkp, bell, price);
    const expectedFee = expectedUnpaidUsageFee(bell, { chargeCount: 1 });

    await rhack('a');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bell.spe, 0);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(bell.age, 123);
    assert.equal(bell.known, true);
    assert.equal(bell.actualKind, 'bell of opening');
    assert.equal(shop.shopBillEntryForObject(shkp, bell).useup, false);
    assert.match(game._pending_message, /unsettling shrill sound/);
    assert.doesNotMatch(game._pending_message, /Nothing happens/);
});

test('zero-charge Bell of Opening on invocation square identifies without billing or priming', async () => {
    const { shkp } = installCommandShopState();
    const bell = bellOfOpening(30516, 'b', 0);
    game.inventory = [bell];
    game.level.invocationPosition = { x: 5, y: 5 };
    game.moves = 124;
    const price = shop.shopItemPrice(bell, 5, 5);
    shop.addObjectToShopBill(shkp, bell, price);

    await rhack('a');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bell.spe, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(bell.age, undefined);
    assert.equal(bell.known, true);
    assert.equal(bell.actualKind, 'bell of opening');
    assert.equal(shop.shopBillEntryForObject(shkp, bell).useup, false);
    assert.match(game._pending_message, /But it makes no sound/);
    assert.doesNotMatch(game._pending_message, /Usage fee|zorkmid/);
});

test('cursed charged Bell of Opening on invocation square bills without priming', async () => {
    const { shkp } = installCommandShopState();
    const bell = { ...bellOfOpening(30517, 'b', 1), cursed: true, blessed: false };
    game.inventory = [bell];
    game.level.invocationPosition = { x: 5, y: 5 };
    game.moves = 125;
    const price = shop.shopItemPrice(bell, 5, 5);
    shop.addObjectToShopBill(shkp, bell, price);
    const expectedFee = expectedUnpaidUsageFee(bell, { chargeCount: 1 });

    await rhack('a');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bell.spe, 0);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(bell.age ?? bell.invocationAge ?? bell._invocation_rung_turn, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, bell).useup, false);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.doesNotMatch(game._pending_message, /unsettling shrill sound/);
});

test('tipping into an unpaid unknown bag of tricks bills target before locked source checks', async () => {
    const { shkp } = installShopState();
    const source = sack(3052, 's');
    source.locked = true;
    source.olocked = true;
    const ration = putObjectInContainer(source, foodRation(3053));
    const target = { ...chargedTool(3054, 'bag', 'b', 3), actualKind: 'bag of tricks', known: false };
    game.inventory = [source, target];
    const price = shop.shopItemPrice(target, 5, 5);
    shop.addObjectToShopBill(shkp, target, price);

    const messages = await shop.tipContainerContents(source, target);

    assert.equal(target.spe, 2);
    assert.equal(shkp.debit, Math.trunc(price / 5));
    assert.equal(shop.shopBillEntryForObject(shkp, target).useup, false);
    assert.equal(target.unpaid, true);
    assert.equal(source.contents.includes(ration), true);
    assert.doesNotMatch(messages.join('  '), /locked/);
});

test('alternate unpaid horn emptying charges full use fee', () => {
    const { shkp } = installShopState();
    const horn = chargedTool(3061, 'horn of plenty', 'h', 4);
    game.inventory = [horn];
    shop.addObjectToShopBill(shkp, horn, 50);
    const messages = [];
    const expectedFee = expectedUnpaidUsageFee(horn, { altusage: true, chargeCount: 4 });

    const fee = shop.checkUnpaidUsageForTest(horn, messages, { altusage: true, chargeCount: 4 });

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, horn).useup, false);
    assert.match(messages[0], new RegExp(`Emptying that will cost you ${expectedFee} zorkmids`));
});

test('floor horn of plenty is not selected as a #tip source', async () => {
    installCommandShopState();
    const horn = { ...chargedTool(3062, 'horn of plenty', 'h', 4), otyp: HORN_OF_PLENTY };
    const carried = sack(3063, 's');
    game.level.objects = [horn];
    game.inventory = [carried];

    await rhack('#');
    for (const ch of 'tip') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, 'tipConfirm');
    assert.equal(game._tip_container_object, carried);
    assert.match(game._pending_message, /Tip a sack/);
    assert.doesNotMatch(game._pending_message, /horn of plenty/);
});

test('floor shop bag of tricks #tip charges emptying fee through a temporary bill row', async () => {
    const { shkp } = installCommandShopState();
    const bag = floorBagOfTricks(3064, 3);
    game.level.objects = [bag];
    game.inventory = [];
    const expectedFee = expectedUnpaidUsageFee(bag, { altusage: true, chargeCount: 3 });

    await rhack('#');
    for (const ch of 'tip') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, 'tipConfirm');
    assert.equal(game._tip_container_object, bag);

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bag.spe, 0);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.notEqual(bag.unpaid, true);
    assert.equal(bag.unpaidPrice, undefined);
    assert.match(game._pending_message, new RegExp(`Emptying that will cost you ${expectedFee} zorkmids`));
});

test('zero-charge floor bag of tricks #tip creates no usage debt or persistent bill row', async () => {
    const { shkp } = installShopState();
    const bag = floorBagOfTricks(3065, 0);
    game.level.objects = [bag];

    const messages = await shop.tipContainerContents(bag);

    assert.equal(bag.spe, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.notEqual(bag.unpaid, true);
    assert.equal(bag.unpaidPrice, undefined);
    assert.doesNotMatch(messages.join('  '), /Usage fee|Emptying that will cost|zorkmid/);
});

test('no-charge floor bag of tricks #tip spends charges without shop usage billing', async () => {
    const { shkp } = installShopState();
    const bag = floorBagOfTricks(3066, 2, { no_charge: true });
    game.level.objects = [bag];

    const messages = await shop.tipContainerContents(bag);

    assert.equal(bag.spe, 0);
    assert.equal(bag.no_charge, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.doesNotMatch(messages.join('  '), /Emptying that will cost|zorkmid/);
});

test('floor bag of tricks #loot bites without shop usage billing', async () => {
    const { shkp } = installCommandShopState();
    const bag = { ...chargedTool(3067, 'bag of tricks', 'b', 3), otyp: BAG_OF_TRICKS };
    game.level.objects = [bag];
    game.inventory = [];
    game.u.uhp = 100;

    await rhack('#');
    await rhack('l');
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game._floor_container_object || null, null);
    assert.match(game._pending_message, /You carefully open the bag of tricks/);
    assert.match(game._pending_message, /huge set of teeth and bites you/);
    assert.equal(bag.known, true);
    assert.ok(game.u.uhp < 100);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('cursed floor bag of tricks #loot does not lose contained shop merchandise', async () => {
    const { shkp } = installCommandShopState();
    const bag = { ...chargedTool(3068, 'bag of tricks', 'b', 3), otyp: BAG_OF_TRICKS, cursed: true, contents: [] };
    const blade = putObjectInContainer(bag, dagger(3069));
    game.level.objects = [bag];
    game.inventory = [];
    game.u.uhp = 100;

    await rhack('#');
    await rhack('l');
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bag.contents.includes(blade), true);
    assert.doesNotMatch(game._pending_message, /vanished|lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('charged instrument use follows C quarter-price rule when more than one charge remains', () => {
    const { shkp } = installShopState();
    const drum = chargedTool(3071, 'drum of earthquake', 'd', 3);
    game.inventory = [drum];
    shop.addObjectToShopBill(shkp, drum, 100);
    const expectedFee = expectedUnpaidUsageFee(drum);

    const fee = shop.checkUnpaidUsageForTest(drum, []);

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, drum).useup, false);
});

test('unpaid wand use with more than one charge follows C quarter-price rule', () => {
    const { shkp } = installShopState();
    const wand = cancellationWand(3082, 'w');
    wand.spe = 3;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const messages = [];
    const expectedFee = expectedUnpaidUsageFee(wand);

    const fee = shop.checkUnpaidUsageForTest(wand, messages);

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('unpaid wand use with one charge bills full item price', () => {
    const { shkp } = installShopState();
    const wand = cancellationWand(3083, 'w');
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const messages = [];
    const expectedFee = expectedUnpaidUsageFee(wand);

    const fee = shop.checkUnpaidUsageForTest(wand, messages);

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('unpaid wand use with no charges is not billed for usage', () => {
    const { shkp } = installShopState();
    const wand = cancellationWand(3084, 'w');
    wand.spe = 0;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const messages = [];

    const fee = shop.checkUnpaidUsageForTest(wand, messages);

    assert.equal(fee, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, true);
    assert.equal(messages.length, 0);
});

test('applying an unpaid no-effect wand bills usage before destroy billing', async () => {
    const { shkp } = installCommandShopState();
    const wand = wishingWand(30844, 'w');
    game.inventory = [wand];
    const price = shop.shopItemPrice(wand, 5, 5);
    shop.addObjectToShopBill(shkp, wand, price);
    const expectedFee = expectedUnpaidUsageFee(wand);

    await rhack('a');
    await rhack('w');

    assert.equal(game._command_mode, 'breakWandConfirm');
    assert.match(game._pending_message, /Are you really sure you want to break the wand of wishing/);

    await rhack('y');

    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), price);
    assert.equal(wand.unpaid, false);
    assert.match(game._pending_message, /Raising the wand of wishing high above your head, you break it in two!/);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /You destroy that wand of wishing, you pay for it!/);
    assert.match(game._pending_message, /But nothing else happens\.\.\./);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].price, price);
});

test('applying an unpaid no-effect wand uses pre-break charges for the usage fee', async () => {
    const { shkp } = installCommandShopState();
    const wand = wishingWand(30845, 'w');
    wand.spe = 2;
    wand.charges = 2;
    game.inventory = [wand];
    const price = shop.shopItemPrice(wand, 5, 5);
    shop.addObjectToShopBill(shkp, wand, price);
    const expectedFee = expectedUnpaidUsageFee(wand, { chargeCount: 2 });

    await rhack('a');
    await rhack('w');
    await rhack('y');

    assert.equal(expectedFee, Math.trunc(price / 4));
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), price);
    assert.equal(game.inventory.includes(wand), false);
    const usageIndex = game._pending_message.indexOf('Usage fee');
    const destroyIndex = game._pending_message.indexOf('you pay for it');
    assert.ok(usageIndex >= 0);
    assert.ok(destroyIndex > usageIndex);
});

test('applying a worn-out unpaid no-effect wand skips usage but still bills destroy', async () => {
    const { shkp } = installCommandShopState();
    const wand = wishingWand(30846, 'w');
    game.inventory = [wand];
    const price = shop.shopItemPrice(wand, 5, 5);
    shop.addObjectToShopBill(shkp, wand, price);
    wand.spe = -1;
    wand.charges = -1;

    await rhack('a');
    await rhack('w');
    await rhack('y');

    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), price);
    assert.equal(game.inventory.includes(wand), false);
    assert.doesNotMatch(game._pending_message, /Usage fee/);
    assert.match(game._pending_message, /You destroy that wand of wishing, you pay for it!/);
    assert.match(game._pending_message, /But nothing else happens\.\.\./);
});

test('applying stale field-only unpaid wand does not synthesize destroy billing', async () => {
    const { shkp } = installCommandShopState();
    const wand = wishingWand(30847, 'w');
    wand.unpaid = true;
    wand.unpaidPrice = 999;
    game.inventory = [wand];

    await rhack('a');
    await rhack('w');
    await rhack('y');

    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct || 0, 0);
    assert.equal((shkp.bill || []).length, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.doesNotMatch(game._pending_message, /Usage fee/);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
    assert.match(game._pending_message, /But nothing else happens\.\.\./);
});

test('engraving with an unpaid wand bills from the post-spend charge count', async () => {
    const { shkp } = installCommandShopState();
    const wand = cancellationWand(30841, 'w');
    wand.spe = 2;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const expectedFee = expectedUnpaidUsageFee(wand, { chargeCount: 1 });

    await rhack('E');
    await rhack('w');

    assert.equal(wand.spe, 1);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.equal(game._command_mode, 'engraveToolMore');
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(wand.unpaid, true);
});

test('engraving with the last unpaid wand charge does not add a usage fee', async () => {
    const { shkp } = installCommandShopState();
    const wand = cancellationWand(30842, 'w');
    wand.spe = 1;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);

    await rhack('E');
    await rhack('w');

    assert.equal(wand.spe, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.doesNotMatch(game._pending_message, /Usage fee/);
    assert.equal(game._command_mode, 'engraveToolMore');
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(wand.unpaid, true);
});

test('cursed unpaid wand engraving backfire preserves the used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    initRng(49);
    const wand = cancellationWand(30843, 'w');
    wand.spe = 2;
    wand.cursed = true;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const expectedFee = expectedUnpaidUsageFee(wand, { chargeCount: 1 });

    await rhack('E');
    await rhack('w');

    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /The wand of cancellation suddenly explodes!/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, false);
});

test('cursed unpaid wand backfire preserves the wand as a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    initRng(49);
    const wand = cancellationWand(3085, 'w');
    wand.cursed = true;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const expectedFee = expectedUnpaidUsageFee(wand);

    await rhack('z');
    await rhack('w');

    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /The wand of cancellation suddenly explodes!/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, false);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, entry.bo_id);
    assert.equal(game._usedUpShopBills[0].price, 100);
});

test('cursed unpaid wand of wishing backfire preserves the used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    initRng(49);
    const wand = wishingWand(3086, 'w');
    wand.cursed = true;
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);
    const expectedFee = expectedUnpaidUsageFee(wand);

    await rhack('z');
    await rhack('w');

    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /The wand of wishing suddenly explodes!/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(wand.unpaid, false);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, entry.bo_id);
    assert.equal(game._usedUpShopBills[0].price, 100);
});

test('cursed charging an unpaid wand preserves the pre-altered object as a used-up bill', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfCharging(3087, 's', true);
    const wand = cancellationWand(3088, 'w');
    wand.spe = 3;
    game.inventory = [scroll, wand];
    shop.addObjectToShopBill(shkp, wand, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game._command_mode, 'chargeObject');
    assert.match(game._pending_message, /What do you want to charge\?/);
    assert.equal(wand.spe, 3);
    assert.equal(wand.unpaid, true);

    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(wand.spe, 0);
    assert.equal(wand.charges, 0);
    assert.equal(wand.unpaid, false);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /Your wand of cancellation vibrates briefly/);
    assert.match(game._pending_message, /You uncharge that wand of cancellation, you pay for it!/);
    assert.ok(game._pending_message.indexOf('vibrates briefly') < game._pending_message.indexOf('you pay for it'));
});

test('cursed charging an unpaid crystal ball creates an uncharged used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfCharging(3089, 's', true);
    const ball = crystalBall(3090, 'c', 2);
    game.inventory = [scroll, ball];
    shop.addObjectToShopBill(shkp, ball, 100);

    await rhack('r');
    await rhack('s');
    await rhack('c');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(ball.spe, 0);
    assert.equal(ball.cursed, true);
    assert.equal(ball.blessed, false);
    assert.equal(ball.unpaid, false);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, ball), null);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.match(game._pending_message, /Your crystal ball glows black for a moment/);
    assert.match(game._pending_message, /You uncharge that crystal ball, you pay for it!/);
});

test('cursed charging an unpaid chargeable ring bills the disenchantment as used-up', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfCharging(30901, 's', true);
    const ring = chargeableRing(30902, 'r', 0);
    game.inventory = [scroll, ring];
    shop.addObjectToShopBill(shkp, ring, 120);

    await rhack('r');
    await rhack('s');
    await rhack('r');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.ok(ring.spe < 0);
    assert.equal(ring.unpaid, false);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, ring), null);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 120);
    assert.match(game._pending_message, /Your ring of protection spins counterclockwise for a moment/);
    assert.match(game._pending_message, /You disenchant that ring of protection, you pay for it!/);
});

test('cursed enchant weapon on unpaid crysknife bills pre-degraded item as used-up', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfEnchantWeapon(309021, 's', true);
    const blade = wieldedWeapon(309022, 'crysknife', 'w', 0);
    game.inventory = [scroll, blade];
    shop.addObjectToShopBill(shkp, blade, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(game.inventory.includes(blade), true);
    assert.equal(blade.kind, 'worm tooth');
    assert.equal(blade.actualKind, 'worm tooth');
    assert.equal(blade.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /Your crysknife is much duller now/);
    assert.match(game._pending_message, /You degrade that crysknife, you pay for it!/);
});

test('cursed enchant weapon on unpaid enchanted weapon bills disenchantment as used-up', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfEnchantWeapon(309023, 's', true);
    const blade = wieldedWeapon(309024, 'dagger', 'w', 2);
    game.inventory = [scroll, blade];
    shop.addObjectToShopBill(shkp, blade, 80);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(blade.spe, 1);
    assert.equal(blade.kind, 'dagger');
    assert.equal(blade.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 80);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /Your dagger glows black for a moment/);
    assert.match(game._pending_message, /You disenchant that dagger, you pay for it!/);
});

test('cursed enchant armor on unpaid worn armor bills disenchantment as used-up', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfEnchantArmor(309025, 's', true);
    const armor = wornArmor(309026, 'leather armor', 'a', 1);
    game.inventory = [scroll, armor];
    shop.addObjectToShopBill(shkp, armor, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(game.inventory.includes(armor), true);
    assert.ok(armor.spe < 1);
    assert.equal(armor.cursed, true);
    assert.equal(armor.blessed, false);
    assert.equal(armor.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, armor), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /Your leather armor glows black/);
    assert.match(game._pending_message, /You disenchant that .*leather armor, you pay for it!/);
});

test('cursed enchant armor with no enchantment loss keeps the live unpaid bill', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfEnchantArmor(309027, 's', true);
    const armor = wornArmor(309028, 'leather armor', 'a', -3, { magic: true });
    game.inventory = [scroll, armor];
    shop.addObjectToShopBill(shkp, armor, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(armor.spe, -3);
    assert.equal(armor.cursed, true);
    assert.equal(armor.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, armor)?.useup, false);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.match(game._pending_message, /Your leather armor violently glows black/);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
});

test('confused cursed enchant weapon strips unpaid proofing into a used-up bill', async () => {
    const { shkp } = installCommandShopState();
    game.u._confusionTimeout = 10;
    const scroll = scrollOfEnchantWeapon(309029, 's', true);
    const blade = wieldedWeapon(309030, 'dagger', 'w', 0);
    blade.oerodeproof = true;
    game.inventory = [scroll, blade];
    shop.addObjectToShopBill(shkp, blade, 80);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(blade.oerodeproof, false);
    assert.equal(blade.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 80);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /mottled purple glow/);
    assert.match(game._pending_message, /You degrade that .*dagger, you pay for it!/);
    assert.ok(game._pending_message.indexOf('mottled purple glow') < game._pending_message.indexOf('you pay for it'));
});

test('confused cursed enchant armor strips unpaid proofing into a used-up bill', async () => {
    const { shkp } = installCommandShopState();
    game.u._confusionTimeout = 10;
    const scroll = scrollOfEnchantArmor(309031, 's', true);
    const armor = wornArmor(309032, 'leather armor', 'a', 0, { oerodeproof: true });
    game.inventory = [scroll, armor];
    shop.addObjectToShopBill(shkp, armor, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(armor.oerodeproof, false);
    assert.equal(armor.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, armor), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /mottled black glow/);
    assert.match(game._pending_message, /You degrade that .*leather armor, you pay for it!/);
});

test('confused uncursed destroy armor strips unpaid proofing into a used-up bill', async () => {
    const { shkp } = installCommandShopState();
    game.u._confusionTimeout = 10;
    const scroll = scrollOfDestroyArmor(309033, 's', false);
    const armor = wornArmor(309034, 'leather armor', 'a', 0, { oerodeproof: true });
    game.inventory = [scroll, armor];
    shop.addObjectToShopBill(shkp, armor, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(armor.oerodeproof, false);
    assert.equal(armor.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, armor), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /glows purple/);
    assert.match(game._pending_message, /You degrade that .*leather armor, you pay for it!/);
});

test('blessed destroy armor rusts unpaid worn armor into a used-up bill', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const scroll = scrollOfDestroyArmor(309037, 's', false);
    scroll.blessed = true;
    const armor = wornArmor(309038, 'orcish helm', 'a', 0);
    game.inventory = [scroll, armor];
    shop.addObjectToShopBill(shkp, armor, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(game.inventory.includes(armor), true);
    assert.ok((armor.oeroded || 0) > 0);
    assert.equal(armor.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, armor), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /Your orcish helm rusts!/);
    assert.match(game._pending_message, /You rust that .*orcish helm, you pay for it!/);
    assert.ok(game._pending_message.indexOf('rusts!') < game._pending_message.indexOf('you pay for it'));
});

test('blessed destroy armor erosion ignores stale field-only unpaid armor', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const scroll = scrollOfDestroyArmor(309039, 's', false);
    scroll.blessed = true;
    const armor = wornArmor(309040, 'orcish helm', 'a', 0);
    armor.unpaid = true;
    armor.unpaidPrice = 100;
    game.inventory = [scroll, armor];

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(armor), true);
    assert.ok((armor.oeroded || 0) > 0);
    assert.equal(armor.unpaid, true);
    assert.equal(armor.unpaidPrice, 100);
    assert.equal(shkp.billct || 0, 0);
    assert.equal((shkp.bill || []).length, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.match(game._pending_message, /Your orcish helm rusts!/);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
});

test('confused uncursed enchant armor adds proofing without used-up billing', async () => {
    const { shkp } = installCommandShopState();
    game.u._confusionTimeout = 10;
    const scroll = scrollOfEnchantArmor(309035, 's', false);
    const armor = wornArmor(309036, 'leather armor', 'a', 0);
    game.inventory = [scroll, armor];
    shop.addObjectToShopBill(shkp, armor, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(armor.oerodeproof, true);
    assert.equal(armor.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, armor)?.useup, false);
    assert.equal(shkp.billct, 1);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
});

test('remove curse uncurses unpaid unholy water and preserves a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfRemoveCurse(30903, 's', true);
    const water = waterPotion(30904, 'w', { cursed: true });
    game.inventory = [scroll, water];
    shop.addObjectToShopBill(shkp, water, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(game.inventory.includes(water), true);
    assert.equal(water.cursed, false);
    assert.equal(water.blessed, false);
    assert.equal(water.bknown, true);
    assert.equal(water.kind, 'water');
    assert.equal(water.actualKind, 'potion of water');
    assert.equal(water.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, water), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.match(game._pending_message, /You uncurse that potion of unholy water, you pay for it!/);
});

test('unblessed remove curse does not alter inactive unpaid unholy water', async () => {
    const { shkp } = installCommandShopState();
    const scroll = scrollOfRemoveCurse(30905, 's');
    const water = waterPotion(30906, 'w', { cursed: true });
    game.inventory = [scroll, water];
    shop.addObjectToShopBill(shkp, water, 100);

    await rhack('r');
    await rhack('s');

    assert.equal(water.cursed, true);
    assert.equal(water.unpaid, true);
    assert.notEqual(shop.shopBillEntryForObject(shkp, water), null);
    assert.equal(shkp.billct, 1);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
});

test('confused remove curse raises live unpaid water bill when BUC changes', async () => {
    const { shkp } = installCommandShopState();
    game.u._confusionTimeout = 10;
    const scroll = scrollOfRemoveCurse(30907, 's', true);
    const water = waterPotion(30909, 'w', { bknown: true });
    game.inventory = [scroll, water];
    shop.addObjectToShopBill(shkp, water, 5);

    await rhack('r');
    await rhack('s');

    const entry = shop.shopBillEntryForObject(shkp, water);
    const expectedPrice = shop.shopItemPrice(water, 5, 5);
    assert.equal(game.context.move, 1);
    assert.equal(water.blessed || water.cursed, true);
    assert.equal(water.bknown, false);
    assert.equal(water.unpaid, true);
    assert.equal(entry?.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(water.unpaidPrice, expectedPrice);
    assert.equal(shkp.billct, 1);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
});

test('confused remove curse ignores stale field-only unpaid water', async () => {
    const { shkp } = installCommandShopState();
    game.u._confusionTimeout = 10;
    const scroll = scrollOfRemoveCurse(30910, 's', true);
    const water = waterPotion(30911, 'w', { bknown: true });
    water.unpaid = true;
    water.unpaidPrice = 5;
    game.inventory = [scroll, water];

    await rhack('r');
    await rhack('s');

    assert.equal(water.blessed || water.cursed, true);
    assert.equal(water.bknown, false);
    assert.equal(water.unpaid, true);
    assert.equal(water.unpaidPrice, 5);
    assert.equal(shop.shopBillEntryForObject(shkp, water), null);
    assert.equal(shkp.billct || 0, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.doesNotMatch(game._pending_message, /you pay for it/);
});

test('unpaid camera grease and tinning kit use charge one tenth price', () => {
    for (const [index, kind] of ['expensive camera', 'can of grease', 'tinning kit'].entries()) {
        const { shkp } = installShopState();
        const tool = chargedTool(3091 + index, kind, 't', 4);
        game.inventory = [tool];
        shop.addObjectToShopBill(shkp, tool, 100);
        const messages = [];
        const expectedFee = expectedUnpaidUsageFee(tool);

        const fee = shop.checkUnpaidUsageForTest(tool, messages);

        assert.equal(fee, expectedFee, kind);
        assert.equal(shkp.debit, expectedFee, kind);
        assert.equal(shkp.billct, 1, kind);
        const entry = shop.shopBillEntryForObject(shkp, tool);
        assert.ok(entry, kind);
        assert.equal(entry.useup, false, kind);
        assert.equal(shop.shopBillEntryTotal(entry), 100, kind);
        assert.equal(tool.unpaid, true, kind);
        assert.equal(messages.length, 1, kind);
        assert.match(messages[0], new RegExp(`Usage fee, ${expectedFee} zorkmids`), kind);
    }
});

test('unpaid lamp and oil usage fees follow C cost-per-charge rules', () => {
    {
        const { shkp } = installShopState();
        const item = lamp(3093, 'oil lamp', 'l', 3);
        game.inventory = [item];
        shop.addObjectToShopBill(shkp, item, 100);
        const expectedFee = expectedUnpaidUsageFee(item);
        const fee = shop.checkUnpaidUsageForTest(item, []);

        assert.equal(fee, expectedFee);
        assert.equal(shkp.debit, expectedFee);
        assert.equal(shop.shopBillEntryForObject(shkp, item).useup, false);
    }
    {
        const { shkp } = installShopState();
        const item = lamp(3094, 'oil lamp', 'l', 1);
        game.inventory = [item];
        shop.addObjectToShopBill(shkp, item, 100);
        const expectedFee = expectedUnpaidUsageFee(item);
        const fee = shop.checkUnpaidUsageForTest(item, []);

        assert.equal(fee, expectedFee);
        assert.equal(shkp.debit, expectedFee);
        assert.equal(shop.shopBillEntryForObject(shkp, item).useup, false);
    }
    {
        const { shkp } = installShopState();
        const item = lamp(3095, 'brass lantern', 'l', 3);
        game.inventory = [item];
        shop.addObjectToShopBill(shkp, item, 100);
        const expectedFee = expectedUnpaidUsageFee(item);
        const fee = shop.checkUnpaidUsageForTest(item, []);

        assert.equal(fee, expectedFee);
        assert.equal(shkp.debit, expectedFee);
        assert.equal(shop.shopBillEntryForObject(shkp, item).useup, false);
    }
    {
        const { shkp } = installShopState();
        const item = lamp(3096, 'magic lamp', 'l', 1);
        game.inventory = [item];
        shop.addObjectToShopBill(shkp, item, 90);
        const expectedFee = expectedUnpaidUsageFee(item);
        const fee = shop.checkUnpaidUsageForTest(item, []);

        assert.equal(fee, expectedFee);
        assert.equal(shkp.debit, expectedFee);
        assert.equal(shop.shopBillEntryForObject(shkp, item).useup, false);
    }
    {
        const { shkp } = installShopState();
        const item = lamp(3097, 'magic lamp', 'l', 1);
        game.inventory = [item];
        shop.addObjectToShopBill(shkp, item, 90);
        const expectedFee = expectedUnpaidUsageFee(item, { altusage: true });
        const fee = shop.checkUnpaidUsageForTest(item, [], { altusage: true });

        assert.equal(fee, expectedFee);
        assert.equal(shkp.debit, expectedFee);
        assert.equal(shop.shopBillEntryForObject(shkp, item).useup, false);
    }
    {
        const { shkp } = installShopState();
        const item = oilPotion(3098, 'o');
        game.inventory = [item];
        shop.addObjectToShopBill(shkp, item, 100);
        const messages = [];
        const expectedFee = expectedUnpaidUsageFee(item);
        const fee = shop.checkUnpaidUsageForTest(item, messages);

        assert.equal(fee, expectedFee);
        assert.equal(shkp.debit, expectedFee);
        assert.equal(shop.shopBillEntryForObject(shkp, item).useup, false);
        assert.match(messages[0], /Yendorian Fuel Tax/);
    }
});

test('unpaid carried lamp catching fire in a shop charges usage and preserves a used-up bill row', () => {
    const { shkp } = installShopState();
    const item = lamp(30981, 'oil lamp', 'l', 3);
    game.inventory = [item];
    shop.addObjectToShopBill(shkp, item, 100);
    const expectedFee = expectedUnpaidUsageFee(item);

    const result = shop.fireDamageInventoryForTest(0, true);

    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(item.unpaid, false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    assert.match(result.messages.join(' '), /catches light/);
    assert.match(result.messages.join(' '), new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(result.messages.join(' '), /in addition to the cost/);
    const entry = shop.shopBillEntryForObject(shkp, item);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(item.id)), true);
});

test('unpaid carried lamp catching fire outside a shop keeps the live bill row', () => {
    const { shkp } = installShopState();
    const item = lamp(30982, 'oil lamp', 'l', 3);
    game.inventory = [item];
    shop.addObjectToShopBill(shkp, item, 100);
    game.u.ux = 1;
    game.u.uy = 1;
    game.level.at = (x, y) => ({
        roomno: (x === 5 && y === 5) || (x === 6 && y === 5) ? ROOMOFFSET : 0,
        typ: ROOM,
    });

    const result = shop.fireDamageInventoryForTest(0, true);

    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(item.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.match(result.messages.join(' '), /catches light/);
    assert.doesNotMatch(result.messages.join(' '), /Usage fee|in addition to the cost/);
    const entry = shop.shopBillEntryForObject(shkp, item);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('unpaid spellbook study usage charges four fifths of current shop price', () => {
    const { shkp } = installShopState();
    const book = healingSpellbook(3093, 'b');
    game.inventory = [book];
    shop.addObjectToShopBill(shkp, book, 100);
    const messages = [];
    const expectedFee = expectedUnpaidUsageFee(book);

    const fee = shop.checkUnpaidUsageForTest(book, messages);

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, true);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /This is no free library/);
    assert.match(messages[0], new RegExp(`${expectedFee} zorkmids`));
});

test('completing study of an unpaid spellbook bills library usage and keeps live bill row', async () => {
    const { shkp } = installCommandShopState();
    const book = healingSpellbook(3099, 'b');
    book.blessed = true;
    game.inventory = [book];
    game.nhDisplay = { cols: 200 };
    shop.addObjectToShopBill(shkp, book, 100);
    const expectedFee = expectedUnpaidUsageFee(book);

    await rhack('r');

    assert.equal(game._command_mode, 'readObject');
    assert.match(game._pending_message, /What do you want to read\? \[b or \?\*\]/);

    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /You begin to memorize the runes\./);
    assert.ok(game._spellbook_study_occupation);
    assert.equal(shkp.debit || 0, 0);

    await processSpellbookStudyOccupation();
    await processSpellbookStudyOccupation();

    assert.equal(game._spellbook_study_occupation, null);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, true);
    assert.equal(book.known, true);
    assert.equal(game._known_spells?.some(spell => spell.name === 'healing'), true);
    assert.match(`${game._pending_message || ''} ${game._topline_after_more || ''}`, /You learn the "healing" spell\./);
    assert.match(`${game._pending_message || ''} ${game._topline_after_more || ''}`, /This is no free library/);
    assert.match(`${game._pending_message || ''} ${game._topline_after_more || ''}`, new RegExp(`${expectedFee} zorkmids`));
});

test('failed read that crumbles an unpaid spellbook preserves full used-up bill', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const book = healingSpellbook(3100, 'b');
    book.cursed = true;
    book.known = true;
    game.inventory = [book];
    shop.addObjectToShopBill(shkp, book, 100);

    await rhack('r');
    await rhack('b');

    assert.equal(game.inventory.includes(book), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, false);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(book.id)), true);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'fullyUsedUp' && debt.price === 100), true);
    assert.match(game._pending_message, /The spellbook crumbles to dust!/);
    assert.doesNotMatch(game._pending_message, /free library/);
});

test('failed read that leaves an unpaid spellbook intact does not mark it used-up', async () => {
    const { shkp } = installCommandShopState();
    initRng(2);
    const book = healingSpellbook(3101, 'b');
    book.cursed = true;
    book.known = true;
    game.inventory = [book];
    shop.addObjectToShopBill(shkp, book, 100);

    await rhack('r');
    await rhack('b');

    assert.equal(game.inventory.includes(book), true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, true);
    assert.deepEqual(game._usedUpShopBills || [], []);
    assert.doesNotMatch(game._pending_message, /crumbles to dust/);
    assert.doesNotMatch(game._pending_message, /free library/);
});

test('confused reading that tears an unpaid spellbook preserves full used-up bill', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const book = healingSpellbook(3102, 'b');
    book.blessed = true;
    book.known = true;
    game.u._confusionTimeout = 10;
    game.inventory = [book];
    shop.addObjectToShopBill(shkp, book, 100);

    await rhack('r');
    await rhack('b');

    assert.equal(game.inventory.includes(book), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, false);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(book.id)), true);
    assert.match(game._pending_message, /You accidentally tear the spellbook to pieces\./);
    assert.doesNotMatch(game._pending_message, /free library/);
});

test('carried fire destruction of an unpaid spellbook preserves full used-up bill', () => {
    const { shkp } = installShopState();
    initRng(2);
    const book = healingSpellbook(3103, 'b');
    book.known = true;
    game.inventory = [book];
    shop.addObjectToShopBill(shkp, book, 100);

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    assert.equal(game.inventory.includes(book), false);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(book.unpaid, false);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(book.id)), true);
    assert.equal(result.messages.some(message => /catches fire and burns!/.test(message)), true);
});

test('hero floor fire destruction of shop-floor spellbook leaves used-up bill row', () => {
    const { shkp } = installShopState();
    initRng(1);
    const book = floorHealingSpellbook(3104);
    game.level.objects = [book];
    const expectedPrice = shop.shopItemPrice(book, 5, 5);

    const result = burnFloorObjectsByFire(5, 5, { giveFeedback: true, heroCaused: true });

    assert.equal(result.count, 1);
    assert.equal(game.level.objects.includes(book), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, book);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.notEqual(book.unpaid, true);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(book.id)), true);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'fullyUsedUp' && debt.price === expectedPrice), true);
    assert.equal(result.messages.some(message => /burns\./.test(message)), true);
});

test('hero floor fire bills only the destroyed part of a shop-floor spellbook stack', () => {
    const { shkp } = installShopState();
    initRng(1);
    const stack = floorHealingSpellbook(3105, 2);
    game.level.objects = [stack];
    const expectedUnitPrice = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);

    const result = burnFloorObjectsByFire(5, 5, { heroCaused: true });

    assert.equal(result.count, 1);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 1);
    assert.notEqual(stack.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, stack), null);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), expectedUnitPrice);
    assert.notEqual(String(shkp.bill[0].bo_id), String(stack.id));
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(shkp.bill[0].bo_id)), true);
});

test('non-hero floor fire destroys shop-floor spellbooks without billing the hero', () => {
    const { shkp } = installShopState();
    initRng(1);
    const book = floorHealingSpellbook(3106);
    game.level.objects = [book];

    const result = burnFloorObjectsByFire(5, 5, { heroCaused: false });

    assert.equal(result.count, 1);
    assert.equal(game.level.objects.includes(book), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
});

test('hero-caused floor fire from outside the shop records robbed value', () => {
    const { shkp } = installShopState();
    initRng(1);
    const book = floorHealingSpellbook(3107);
    game.level.objects = [book];
    game.level.at = (x, y) => ({
        roomno: (x === 5 && y === 5) || (x === 6 && y === 5) ? ROOMOFFSET : 0,
    });
    game.u.ux = 1;
    game.u.uy = 1;
    const expectedPrice = shop.shopItemPrice(book, 5, 5);

    const result = burnFloorObjectsByFire(5, 5, { heroCaused: true });

    assert.equal(result.count, 1);
    assert.equal(game.level.objects.includes(book), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed, expectedPrice);
    assert.deepEqual(game._usedUpShopBills || [], []);
});

test('shop-floor lamp catching light from floor fire is not billed', () => {
    const { shkp } = installShopState();
    const item = lamp(3108, 'oil lamp', 'l', 3);
    delete item.letter;
    delete item.line;
    game.level.objects = [item];

    const result = burnFloorObjectsByFire(5, 5, { giveFeedback: true, heroCaused: true });

    assert.equal(result.count, 0);
    assert.equal(game.level.objects.includes(item), true);
    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
    assert.match(result.messages.join(' '), /catches light/);
});

test('applying an unpaid oil lamp lights it and bills usage without consuming the live bill', async () => {
    const { shkp } = installCommandShopState();
    const item = lamp(3090, 'oil lamp', 'l', 3);
    game.inventory = [item];
    shop.addObjectToShopBill(shkp, item, 100);
    const expectedFee = expectedUnpaidUsageFee(item);

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\? \[l or \?\*\]/);

    await rhack('l');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, item);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(item.unpaid, true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /Your lamp is now on\./);
    assert.doesNotMatch(game._pending_message, /rub the lamp/);

    await rhack(' ');
    await rhack('a');
    await rhack('l');

    assert.equal(item.lamplit, false);
    assert.equal(item.burning, false);
    assert.equal(shkp.debit, expectedFee);
    assert.match(game._pending_message, /Your lamp is now off\./);
});

test('applying an unpaid potion of oil charges fuel tax and keeps a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    const item = oilPotion(3092, 'o');
    game.inventory = [item];
    shop.addObjectToShopBill(shkp, item, 100);
    const expectedFee = expectedUnpaidUsageFee(item);

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\? \[o or \?\*\]/);

    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(item.known, true);
    assert.equal(item.unpaid, false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, item);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.match(game._pending_message, /You light your potion/);
    assert.match(game._pending_message, /Yendorian Fuel Tax/);
    assert.match(game._pending_message, /in addition to the cost of the potion/);
});

test('applying an unpaid cream pie to yourself bills a dummy used-up pie', async () => {
    const { shkp } = installCommandShopState();
    const pie = creamPie(3094, 'p');
    game.inventory = [pie];
    shop.addObjectToShopBill(shkp, pie, 10);

    await rhack('a');
    await rhack('p');

    assert.equal(game.inventory.includes(pie), true);
    assert.match(game._pending_message, /You immerse your face in the cream pie\./);

    await rhack(' ');

    assert.equal(game.inventory.includes(pie), false);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.notEqual(String(shkp.bill[0].bo_id), String(pie.id));
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 10);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.equal(game._usedUpShopBills[0].price, 10);
    assert.equal(shop.shopBillEntryForObject(shkp, pie), null);
});

test('applying one unpaid cream pie from a stack preserves the live residual bill', async () => {
    const { shkp } = installCommandShopState();
    const pies = creamPie(3096, 'p', 2);
    game.inventory = [pies];
    shop.addObjectToShopBill(shkp, pies, 20);

    await rhack('a');
    await rhack('p');

    assert.match(game._pending_message, /one of the cream pies/);

    await rhack(' ');

    assert.equal(game.inventory.includes(pies), true);
    assert.equal(pies.quan, 1);
    const liveEntry = shop.shopBillEntryForObject(shkp, pies);
    assert.ok(liveEntry);
    assert.equal(liveEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 10);
    const usedEntry = shkp.bill.find(entry => entry !== liveEntry);
    assert.ok(usedEntry);
    assert.equal(usedEntry.useup, true);
    assert.notEqual(String(usedEntry.bo_id), String(pies.id));
    assert.equal(shop.shopBillEntryTotal(usedEntry), 10);
    assert.equal(shkp.billct, 2);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, usedEntry.bo_id);
    assert.equal(game._usedUpShopBills[0].price, 10);
});

test('rubbing a non-wielded magic lamp first wields it without releasing the djinni', async () => {
    const { shkp } = installCommandShopState();
    const item = lamp(3100, 'magic lamp', 'l', 1);
    game.inventory = [item];
    shop.addObjectToShopBill(shkp, item, 90);

    await invokeRub('l');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(item.wielded, true);
    assert.equal(item.otyp, MAGIC_LAMP);
    assert.equal(item.spe, 1);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(game.level.monsters.length, 1);
    assert.match(game._pending_message, /You now wield a lamp\./);
});

test('rubbing a wielded unpaid magic lamp bills unusual use and converts it before djinni handling', async () => {
    const { shkp } = installCommandShopState();
    initRng(3);
    const item = lamp(3101, 'magic lamp', 'l', 1);
    item.wielded = true;
    item.line = 'l - a magic lamp (weapon in right hand)';
    game.inventory = [item];
    shop.addObjectToShopBill(shkp, item, 90);
    const expectedFee = expectedUnpaidUsageFee(item, { altusage: true });

    await invokeRub('l');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(item.otyp, OIL_LAMP);
    assert.equal(item.kind, 'oil lamp');
    assert.equal(item.actualKind, 'oil lamp');
    assert.equal(item.spe, 0);
    assert.ok(item.age >= 1000 && item.age <= 1499);
    assert.equal(item.unpaid, true);
    assert.equal(shkp.debit, expectedFee);
    const entry = shop.shopBillEntryForObject(shkp, item);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 90);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /In a cloud of smoke, a djinni emerges!|It turns out to be empty\./);
    if (/In a cloud of smoke/.test(game._pending_message))
        assert.match(game._pending_message, /I am in your debt|Thank you for freeing me|You freed me|It is about time|You disturbed me/);
});

test('rubbing wielded oil and brass lamps follows C lamp messages', async () => {
    installCommandShopState();
    const oil = lamp(3102, 'oil lamp', 'l', 1);
    oil.wielded = true;
    oil.line = 'l - an oil lamp (weapon in right hand)';
    game.inventory = [oil];

    await invokeRub('l');

    assert.equal(game.context.move, 1);
    assert.match(game._pending_message, /Nothing happens\./);

    const brass = lamp(3103, 'brass lantern', 'b', 1);
    brass.wielded = true;
    brass.line = 'b - a brass lantern (weapon in right hand)';
    game.inventory = [brass];

    await invokeRub('b');

    assert.equal(game.context.move, 1);
    assert.match(game._pending_message, /Rubbing the electric lamp is not particularly rewarding\./);
    assert.match(game._pending_message, /Anyway, nothing exciting happens\./);
});

test('rub command without a candidate reports no object to rub', async () => {
    installCommandShopState();
    game.inventory = [dagger(3104, 'd')];

    await startRubCommand();

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /You don't have anything to rub\./);
});

test('rub object prompt treats space enter and escape as cancellation', async () => {
    for (const key of [' ', '\r', '\x1b']) {
        installCommandShopState();
        const item = lamp(3105, 'oil lamp', 'l', 1);
        game.inventory = [item];

        await startRubCommand();

        assert.equal(game._command_mode, 'rubObject');
        await rhack(key);

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move || 0, 0);
        assert.match(game._pending_message, /Never mind\./);
        assert.equal(game.inventory.includes(item), true);
    }
});

test('rubbing royal jelly with no eggs uses wildcard target prompt and cancels cleanly', async () => {
    installCommandShopState();
    const jelly = simpleFood(3106, 'lump of royal jelly', 'j');
    game.inventory = [jelly];

    await invokeRub('j');

    assert.equal(game._command_mode, 'rubRoyalJellyTarget');
    assert.match(game._pending_message, /What do you want to rub the royal jelly on\? \[\*\]/);

    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move || 0, 0);
    assert.equal(game.inventory.includes(jelly), true);
    assert.match(game._pending_message, /Never mind\./);
});

test('royal jelly target prompt treats space enter and escape as cancellation', async () => {
    for (const key of [' ', '\r', '\x1b']) {
        installCommandShopState();
        const jelly = simpleFood(3107, 'lump of royal jelly', 'j');
        const target = egg(3108, 'e');
        game.inventory = [jelly, target];

        await startRoyalJellyRub('j');
        await rhack(key);

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move || 0, 0);
        assert.equal(game.inventory.includes(jelly), true);
        assert.equal(game.inventory.includes(target), true);
        assert.match(game._pending_message, /Never mind\./);
    }
});

test('canceling stacked unpaid royal jelly target keeps the live bill intact', async () => {
    const { shkp } = installCommandShopState();
    const jelly = simpleFood(3109, 'lump of royal jelly', 'j', {
        quan: 2,
        line: 'j - 2 lumps of royal jelly',
    });
    const target = egg(3110, 'e');
    game.inventory = [jelly, target];
    shop.addObjectToShopBill(shkp, jelly, 30);

    await startRoyalJellyRub('j');
    await rhack(' ');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move || 0, 0);
    assert.equal(jelly.quan, 2);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, jelly);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 30);
    assert.deepEqual(game._usedUpShopBills || [], []);
    assert.match(game._pending_message, /Never mind\./);
});

test('rubbing royal jelly prompts for an egg target', async () => {
    installCommandShopState();
    const jelly = simpleFood(3111, 'lump of royal jelly', 'j');
    const target = egg(3112, 'e');
    game.inventory = [jelly, target];

    await startRoyalJellyRub('j');

    assert.match(game._pending_message, /\[e or \?\*\]/);
});

test('uncursed royal jelly changes a killer bee egg stack and starts its hatch timer', async () => {
    installCommandShopState();
    const jelly = simpleFood(3113, 'lump of royal jelly', 'j');
    const target = egg(3114, 'e', 2);
    target.corpsenm = { name: 'killer bee', oviparous: true };
    game.inventory = [jelly, target];

    await invokeRoyalJellyRub('j', 'e');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(jelly), false);
    assert.equal(target.quan, 2);
    assert.equal(target.corpsenm.name, 'queen bee');
    assert.ok(target.eggHatchTurn > (game.moves || 0));
    assert.equal(target._egg_hatch_consumed, true);
    assert.match(game._pending_message, /You smear royal jelly all over .*eggs?\./);
    assert.match(game._pending_message, /quivers? briefly\./);
});

test('blessed royal jelly marks fertile eggs as parented but leaves generic eggs infertile', async () => {
    installCommandShopState();
    const fertileJelly = simpleFood(3115, 'lump of royal jelly', 'j', { blessed: true });
    const fertile = egg(3116, 'e');
    fertile.corpsenm = { name: 'killer bee', oviparous: true };
    game.inventory = [fertileJelly, fertile];

    await invokeRoyalJellyRub('j', 'e');

    assert.equal(fertile.spe, 2);
    assert.ok(fertile.eggHatchTurn > (game.moves || 0));
    assert.match(game._pending_message, /quivers? briefly\./);
    acknowledgePendingMessage();

    const genericJelly = simpleFood(3117, 'lump of royal jelly', 'j', { blessed: true });
    const generic = egg(3118, 'e');
    game.inventory = [genericJelly, generic];

    await invokeRoyalJellyRub('j', 'e');

    assert.equal(generic.spe, undefined);
    assert.equal(generic.eggHatchTurn, undefined);
    assert.equal(generic._egg_hatch_consumed, undefined);
    assert.match(game._pending_message, /Nothing seems to happen\./);
});

test('cursed royal jelly stops an egg hatch timer without clearing the species', async () => {
    installCommandShopState();
    const jelly = simpleFood(3119, 'lump of royal jelly', 'j', { cursed: true });
    const target = egg(3120, 'e');
    target.corpsenm = { name: 'killer bee', oviparous: true };
    target.eggHatchTurn = (game.moves || 0) + 180;
    target._egg_hatch_seq = 7;
    target._egg_hatch_consumed = true;
    game.inventory = [jelly, target];

    await invokeRoyalJellyRub('j', 'e');

    assert.equal(target.corpsenm.name, 'queen bee');
    assert.equal(target.eggHatchTurn, undefined);
    assert.equal(target._egg_hatch_seq, undefined);
    assert.equal(target._egg_hatch_consumed, undefined);
    assert.match(game._pending_message, /quivers? feebly\./);
});

test('rubbing one unpaid royal jelly from a stack preserves live and used-up bill rows', async () => {
    const { shkp } = installCommandShopState();
    const jelly = simpleFood(3121, 'lump of royal jelly', 'j', {
        quan: 2,
        line: 'j - 2 lumps of royal jelly',
    });
    const target = egg(3122, 'e');
    target.corpsenm = { name: 'killer bee', oviparous: true };
    game.inventory = [jelly, target];
    shop.addObjectToShopBill(shkp, jelly, 30);

    await invokeRoyalJellyRub('j', 'e');

    assert.equal(game.inventory.includes(jelly), true);
    assert.equal(jelly.quan, 1);
    const liveEntry = shop.shopBillEntryForObject(shkp, jelly);
    assert.ok(liveEntry);
    assert.equal(liveEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 15);
    const usedEntry = shkp.bill.find(entry => entry !== liveEntry);
    assert.ok(usedEntry);
    assert.equal(usedEntry.useup, true);
    assert.notEqual(String(usedEntry.bo_id), String(jelly.id));
    assert.equal(shop.shopBillEntryTotal(usedEntry), 15);
    assert.equal(shkp.billct, 2);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, usedEntry.bo_id);
    assert.equal(game._usedUpShopBills[0].price, 15);
});

test('applying unpaid can of grease bills usage and greases the selected object', async () => {
    const { shkp } = installCommandShopState();
    const grease = chargedTool(3094, 'can of grease', 'g', 4);
    const target = dagger(3095, 'd');
    game.inventory = [grease, target];
    shop.addObjectToShopBill(shkp, grease, 100);
    const expectedFee = expectedUnpaidUsageFee(grease);

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\?/);

    await rhack('g');

    assert.equal(game._command_mode, 'greaseObject');
    assert.equal(game._apply_grease_letter, 'g');
    assert.match(game._pending_message, /What do you want to grease\? \[- gd or \?\*\]/);
    assert.equal(grease.spe, 4);
    assert.equal(shkp.debit || 0, 0);

    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(grease.spe, 3);
    assert.equal(target.greased, true);
    assert.match(target.line, /greased/);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, grease);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(grease.unpaid, true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /You cover a dagger with a thick layer of grease/);
});

test('tipping an unpaid can of grease spills first then bills one charge', async () => {
    const { shkp } = installCommandShopState();
    const grease = chargedTool(3096, 'can of grease', 'g', 4);
    game.inventory = [grease];
    shop.addObjectToShopBill(shkp, grease, 100);
    const expectedFee = expectedUnpaidUsageFee(grease);

    await rhack('#');
    for (const ch of 'tip') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, 'tipConfirm');
    assert.match(game._pending_message, /Tip a can of grease/);
    assert.equal(grease.spe, 4);
    assert.equal(shkp.debit || 0, 0);

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(grease.spe, 3);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, grease);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(grease.unpaid, true);
    assert.match(game._pending_message, /Some grease spills onto the floor\./);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.ok(game._pending_message.indexOf('Some grease spills') < game._pending_message.indexOf('Usage fee'));
});

test('grease target selection rejects inaccessible worn equipment without spending a charge', async () => {
    const { shkp } = installCommandShopState();
    const grease = chargedTool(3096, 'can of grease', 'g', 4);
    const cloak = {
        id: 3097,
        cls: 'armor',
        glyph: '[',
        kind: 'cloak of displacement',
        actualKind: 'cloak of displacement',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'c',
        line: 'c - a +0 cloak of displacement (being worn)',
        worn: true,
    };
    const suit = {
        id: 3098,
        cls: 'armor',
        glyph: '[',
        kind: 'ring mail',
        actualKind: 'ring mail',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'r',
        line: 'r - a +0 ring mail (being worn)',
        worn: true,
    };
    game.inventory = [grease, cloak, suit];
    shop.addObjectToShopBill(shkp, grease, 100);

    await rhack('a');
    await rhack('g');

    assert.equal(game._command_mode, 'greaseObject');
    assert.match(game._pending_message, /What do you want to grease\? \[- gc or \?\*\]/);

    await rhack('r');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(grease.spe, 4);
    assert.equal(suit.greased, undefined);
    assert.equal(shkp.debit || 0, 0);
    assert.match(game._pending_message, /You need to take off your \+0 cloak of displacement to grease your \+0 ring mail\./);
});

test('applying unpaid magic marker to write a known scroll bills usage before ink is spent', async () => {
    const { shkp } = installCommandShopState();
    const marker = chargedTool(3104, 'magic marker', 'm', 20);
    const paper = blankScroll(3105, 's');
    game.inventory = [marker, paper];
    game._discoveries = [{ section: 'Scrolls', name: 'scroll of enchant weapon', known: true }];
    shop.addObjectToShopBill(shkp, marker, 100);
    const expectedFee = expectedUnpaidUsageFee(marker);

    await rhack('a');
    await rhack('m');

    assert.equal(game._command_mode, 'markerWriteObject');
    assert.equal(game._apply_marker_letter, 'm');
    assert.equal(shkp.debit || 0, 0);
    assert.match(game._pending_message, /What do you want to write on\?/);

    await rhack('s');

    assert.equal(game._command_mode, 'markerWriteText');
    assert.equal(game._marker_write_paper_letter, 's');
    assert.equal(marker.spe, 20);
    assert.equal(shkp.debit || 0, 0);
    assert.match(game._pending_message, /What type of scroll do you want to write\?/);

    for (const ch of 'enchant weapon') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(shkp.debit, expectedFee);
    assert.ok(marker.spe < 20);
    assert.equal(marker.unpaid, true);
    const entry = shop.shopBillEntryForObject(shkp, marker);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(game.inventory.includes(paper), false);
    const scroll = game.inventory.find(item => item.letter === 's');
    assert.ok(scroll);
    assert.equal(scroll.actualKind, 'scroll of enchant weapon');
    assert.equal(scroll.unpaid, undefined);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('applying a dry unpaid magic marker still charges the C flat fee for a valid write attempt', async () => {
    const { shkp } = installCommandShopState();
    const marker = chargedTool(3106, 'magic marker', 'm', 1);
    const paper = blankScroll(3107, 's');
    game.inventory = [marker, paper];
    game._discoveries = [{ section: 'Scrolls', name: 'scroll of enchant weapon', known: true }];
    shop.addObjectToShopBill(shkp, marker, 100);
    const expectedFee = expectedUnpaidUsageFee(marker);

    await rhack('a');
    await rhack('m');
    await rhack('s');
    for (const ch of 'enchant weapon') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(marker.spe, 1);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(game.inventory.includes(paper), true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /Your marker is too dry to write that!/);
});

test('applying unpaid tinning kit to a carried corpse bills usage and makes a homemade tin', async () => {
    const { shkp } = installCommandShopState();
    const kit = chargedTool(3108, 'tinning kit', 'k', 4);
    const body = corpse(3109, 'c', 'newt');
    game.inventory = [kit, body];
    shop.addObjectToShopBill(shkp, kit, 100);
    const expectedFee = expectedUnpaidUsageFee(kit);

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\?/);

    await rhack('k');

    assert.equal(game._command_mode, 'tinningObject');
    assert.equal(game._apply_tinning_kit_letter, 'k');
    assert.equal(kit.spe, 4);
    assert.equal(shkp.debit || 0, 0);
    assert.match(game._pending_message, /What do you want to tin\? \[c or \?\*\]/);

    await rhack('c');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(kit.spe, 3);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, kit);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(kit.unpaid, true);
    assert.equal(game.inventory.includes(body), false);

    const madeTin = game.inventory.find(item => item.actualKind === 'tin' && item.corpsenm?.name === 'newt');
    assert.ok(madeTin);
    assert.equal(madeTin.cls, 'food');
    assert.equal(madeTin.glyph, '%');
    assert.equal(madeTin.kind, 'tin:newt');
    assert.equal(madeTin.singular, 'homemade tin of newt meat');
    assert.equal(madeTin.plural, 'homemade tins of newt meat');
    assert.equal(madeTin.spe, -2);
    assert.equal(madeTin.quan, 1);
    assert.notEqual(madeTin.unpaid, true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /homemade tin of newt meat/);
});

test('applying unpaid tinning kit with no corpse spends no charge and adds no usage fee', async () => {
    const { shkp } = installCommandShopState();
    const kit = chargedTool(3110, 'tinning kit', 'k', 4);
    game.inventory = [kit];
    shop.addObjectToShopBill(shkp, kit, 100);

    await rhack('a');
    await rhack('k');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(kit.spe, 4);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, kit).useup, false);
    assert.equal(game.inventory.filter(item => item.actualKind === 'tin').length, 0);
    assert.match(game._pending_message, /nothing to tin/i);
});

test('applying empty unpaid tinning kit with a corpse adds no usage fee', async () => {
    const { shkp } = installCommandShopState();
    const kit = chargedTool(3111, 'tinning kit', 'k', 0);
    const body = corpse(3112, 'c', 'newt');
    game.inventory = [kit, body];
    shop.addObjectToShopBill(shkp, kit, 100);

    await rhack('a');
    await rhack('k');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(kit.spe, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(game.inventory.includes(body), true);
    assert.equal(game.inventory.filter(item => item.actualKind === 'tin').length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, kit).useup, false);
    assert.match(game._pending_message, /out of tins/);
});

test('applying unpaid crystal ball with two charges bills quarter price after look key', async () => {
    const { shkp } = installCommandShopState();
    makeCrystalBallGazeDeterministic();
    const ball = crystalBall(3113, 'c', 2);
    game.inventory = [ball];
    shop.addObjectToShopBill(shkp, ball, 100);
    const expectedFee = expectedUnpaidUsageFee(ball, { chargeCount: 2 });

    await rhack('a');

    assert.equal(game._command_mode, 'applyObject');
    assert.match(game._pending_message, /What do you want to use or apply\? \[c or \?\*\]/);

    await rhack('c');

    assert.equal(game._command_mode, 'crystalBallLook');
    assert.match(game._pending_message, /What do you look for\?/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(ball.spe, 2);

    await rhack('!');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(ball.spe, 1);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, ball);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(ball.unpaid, true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('applying unpaid crystal ball with one charge bills full price and keeps live bill', async () => {
    const { shkp } = installCommandShopState();
    makeCrystalBallGazeDeterministic();
    const ball = crystalBall(3114, 'c', 1);
    game.inventory = [ball];
    shop.addObjectToShopBill(shkp, ball, 100);
    const expectedFee = expectedUnpaidUsageFee(ball, { chargeCount: 0 });

    await rhack('a');
    await rhack('c');
    await rhack('!');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(ball.spe, 0);
    assert.equal(shkp.debit, expectedFee);
    const entry = shop.shopBillEntryForObject(shkp, ball);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(ball.unpaid, true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('canceling unpaid crystal ball look prompt spends no charge and adds no usage fee', async () => {
    const { shkp } = installCommandShopState();
    makeCrystalBallGazeDeterministic();
    const ball = crystalBall(3115, 'c', 2);
    game.inventory = [ball];
    shop.addObjectToShopBill(shkp, ball, 100);

    await rhack('a');
    await rhack('c');
    await rhack('\x1b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(ball.spe, 2);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ball).useup, false);
    assert.equal(ball.unpaid, true);
});

test('applying unpaid crystal ball while blind spends no charge and adds no usage fee', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    game.u.blind = true;
    const ball = crystalBall(3116, 'c', 2);
    game.inventory = [ball];
    shop.addObjectToShopBill(shkp, ball, 100);

    await rhack('a');
    await rhack('c');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(ball.spe, 2);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ball).useup, false);
    assert.equal(ball.unpaid, true);
    assert.match(game._pending_message, /can't see|Too bad/i);
});

test('applying unpaid magic flute and magic harp through improvise bills charged usage', async () => {
    for (const [kind, letter, spe, expectedSpe, effect] of [
        ['magic flute', 'f', 3, 2, /soft music/i],
        ['magic harp', 'h', 1, 0, /very attractive music/i],
    ]) {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        const instrument = chargedTool(3117 + expectedSpe + spe, kind, letter, spe);
        game.inventory = [instrument];
        shop.addObjectToShopBill(shkp, instrument, 100);
        const expectedDebit = expectedUnpaidUsageFee(instrument, { chargeCount: expectedSpe });

        await rhack('a');

        assert.equal(game._command_mode, 'applyObject');
        assert.match(game._pending_message, /What do you want to use or apply\?/);

        await rhack(letter);

        assert.equal(game._command_mode, 'instrumentImprovisePrompt');
        assert.match(game._pending_message, /Improvise\?/);
        assert.equal(instrument.spe, spe);
        assert.equal(shkp.debit || 0, 0);
        assert.doesNotMatch(game._pending_message, /In what direction/i);

        await rhack('y');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.equal(instrument.spe, expectedSpe);
        assert.equal(shkp.debit, expectedDebit);
        assert.equal(shkp.billct, 1);
        const entry = shop.shopBillEntryForObject(shkp, instrument);
        assert.ok(entry);
        assert.equal(entry.useup, false);
        assert.equal(shop.shopBillEntryTotal(entry), 100);
        assert.equal(instrument.unpaid, true);
        assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedDebit} zorkmids`));
        assert.match(game._pending_message, effect);
        assert.doesNotMatch(game._pending_message, /Nothing happens/i);
        assert.doesNotMatch(game._pending_message, /In what direction/i);
    }
});

test('canceling unpaid magic instrument improvise spends no charge and adds no usage fee', async () => {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    const flute = chargedTool(3140, 'magic flute', 'f', 3);
    game.inventory = [flute];
    shop.addObjectToShopBill(shkp, flute, 100);

    await rhack('a');
    await rhack('f');
    await rhack('q');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 0);
    assert.equal(flute.spe, 3);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, flute).useup, false);
    assert.equal(flute.unpaid, true);
    assert.match(game._pending_message, /Never mind/);
});

test('confused unpaid magic instrument improvisation uses mundane effect without billing', async () => {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    game.u._confusionTimeout = 5;
    game.u._statusSuffix = ' Conf';
    const flute = chargedTool(3141, 'magic flute', 'f', 3);
    game.inventory = [flute];
    shop.addObjectToShopBill(shkp, flute, 100);

    await rhack('a');
    await rhack('f');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(flute.spe, 3);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, flute).useup, false);
    assert.match(game._pending_message, /raucous noise|toots/);
});

test('applying unpaid fire horn bills before direction and keeps horn identity after ray', async () => {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    const horn = chargedTool(3142, 'fire horn', 'f', 2);
    horn.kind = 'horn';
    horn.actualKind = 'fire horn';
    horn.line = 'f - a horn';
    game.inventory = [horn];
    shop.addObjectToShopBill(shkp, horn, 100);
    const expectedFee = expectedUnpaidUsageFee(horn, { chargeCount: 2 });

    await rhack('a');
    await rhack('f');

    assert.equal(game._command_mode, 'instrumentImprovisePrompt');
    assert.match(game._pending_message, /Improvise\?/);

    await rhack('y');

    assert.equal(game._command_mode, 'zapDirection');
    assert.equal(horn.spe, 1);
    assert.equal(shkp.debit, expectedFee);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /In what direction\?/);

    await rhack(' ');
    await rhack('l');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(horn.spe, 1);
    assert.equal(horn.kind, 'fire horn');
    assert.equal(horn.actualKind, 'fire horn');
    assert.match(game._pending_message, /A bolt of fire blasts out of the horn/);
    assert.doesNotMatch(game._pending_message, /wand of fire/);
    const entry = shop.shopBillEntryForObject(shkp, horn);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
});

test('canceling unpaid frost horn direction still spends charge and bills without identifying', async () => {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    const horn = chargedTool(3143, 'frost horn', 'f', 1);
    horn.kind = 'horn';
    horn.actualKind = 'frost horn';
    horn.line = 'f - a horn';
    game.inventory = [horn];
    shop.addObjectToShopBill(shkp, horn, 100);
    const expectedFee = expectedUnpaidUsageFee(horn, { chargeCount: 0 });

    await rhack('a');
    await rhack('f');
    await rhack('y');

    assert.equal(game._command_mode, 'zapDirection');
    assert.equal(horn.spe, 0);
    assert.equal(shkp.debit, expectedFee);

    await rhack(' ');
    await rhack('\x1b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(horn.spe, 0);
    assert.equal(horn.kind, 'horn');
    assert.equal(horn.actualKind, 'frost horn');
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /horn vibrates/);
    assert.doesNotMatch(game._pending_message, /frost horn/);
});

test('confused unpaid fire horn uses tooled-horn fallback without charge or billing', async () => {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    game.u._confusionTimeout = 5;
    game.u._statusSuffix = ' Conf';
    const horn = chargedTool(3144, 'fire horn', 'f', 3);
    game.inventory = [horn];
    shop.addObjectToShopBill(shkp, horn, 100);

    await rhack('a');
    await rhack('f');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(horn.spe, 3);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, horn).useup, false);
    assert.match(game._pending_message, /raucous noise|frightful, grave sound/);
    assert.doesNotMatch(game._pending_message, /In what direction/);
});

test('ordinary non-drum instruments prompt for improvise and q cancels without time or billing', async () => {
    for (const [kind, letter] of [
        ['wooden flute', 'f'],
        ['wooden harp', 'h'],
        ['tooled horn', 't'],
        ['bugle', 'b'],
    ]) {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        const instrument = ordinaryTool(3150 + letter.charCodeAt(0), kind, letter);
        game.inventory = [instrument];
        shop.addObjectToShopBill(shkp, instrument, 60);

        await rhack('a');
        await rhack(letter);

        assert.equal(game._command_mode, 'instrumentImprovisePrompt');
        assert.match(game._pending_message, /Improvise\?/);
        assert.equal(game.context.move || 0, 0);

        await rhack('q');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move || 0, 0);
        assert.match(game._pending_message, /Never mind/);
        assert.equal(shkp.debit || 0, 0);
        assert.equal(shop.shopBillEntryForObject(shkp, instrument).useup, false);
    }
});

test('ordinary flute and harp improvise with mundane sound and no billing', async () => {
    for (const [kind, letter, sound] of [
        ['wooden flute', 'f', /wooden flute.*toots/i],
        ['wooden harp', 'h', /wooden harp.*twangs/i],
    ]) {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        const instrument = ordinaryTool(3180 + letter.charCodeAt(0), kind, letter);
        game.inventory = [instrument];
        shop.addObjectToShopBill(shkp, instrument, 60);

        await rhack('a');
        await rhack(letter);
        await rhack('y');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.match(game._pending_message, /start playing .*wooden/i);
        assert.match(game._pending_message, sound);
        assert.equal(shkp.debit || 0, 0);
        assert.equal(shop.shopBillEntryForObject(shkp, instrument).useup, false);
    }
});

test('tooled horn and bugle improvise wake appropriate monsters without billing', async () => {
    {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        const horn = ordinaryTool(3220, 'tooled horn', 't');
        const sleeper = sleepingMonster('orc');
        game.inventory = [horn];
        game.level.monsters = [shkp, sleeper];
        shop.addObjectToShopBill(shkp, horn, 60);

        await rhack('a');
        await rhack('t');
        await rhack('y');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.match(game._pending_message, /frightful, grave/i);
        assert.equal(sleeper.msleeping, 0);
        assert.equal(sleeper.mcanmove, true);
        assert.equal(sleeper.mfrozen, 0);
        assert.equal(shkp.debit || 0, 0);
    }

    {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        const bugle = ordinaryTool(3221, 'bugle', 'b');
        const soldier = sleepingMonster('soldier', 7, 5, { mlet: '@', mercenary: true });
        game.inventory = [bugle];
        game.level.monsters = [shkp, soldier];
        shop.addObjectToShopBill(shkp, bugle, 60);

        await rhack('a');
        await rhack('b');
        await rhack('y');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.match(game._pending_message, /extract a loud.*bugle/i);
        assert.equal(soldier.mpeaceful, 0);
        assert.equal(soldier.msleeping, 0);
        assert.equal(soldier.mcanmove, true);
        assert.equal(soldier.mfrozen, 0);
        assert.equal(shkp.debit || 0, 0);
    }
});

test('leather drum skips improvise prompt and wakes monsters', async () => {
    const { shkp } = installCommandShopState();
    makeInstrumentApplyDeterministic(shkp);
    const drum = ordinaryTool(3230, 'leather drum', 'd');
    const sleeper = sleepingMonster('orc');
    game.inventory = [drum];
    game.level.monsters = [shkp, sleeper];
    shop.addObjectToShopBill(shkp, drum, 60);

    await rhack('a');
    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.match(game._pending_message, /beat a .*deafening row/i);
    assert.ok(game.u._deafTimeout > 0);
    assert.equal(sleeper.msleeping, 0);
    assert.equal(sleeper.mcanmove, true);
    assert.equal(sleeper.mfrozen, 0);
    assert.equal(shkp.debit || 0, 0);
});

test('underwater blocks ordinary instruments before prompt or effect', async () => {
    for (const [kind, letter] of [
        ['wooden flute', 'f'],
        ['wooden harp', 'h'],
        ['tooled horn', 't'],
        ['bugle', 'b'],
        ['leather drum', 'd'],
    ]) {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        game.u.underwater = true;
        game.u.uunderwater = true;
        const instrument = ordinaryTool(3240 + letter.charCodeAt(0), kind, letter);
        const sleeper = sleepingMonster('orc');
        game.inventory = [instrument];
        game.level.monsters = [shkp, sleeper];
        shop.addObjectToShopBill(shkp, instrument, 60);

        await rhack('a');
        await rhack(letter);

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move || 0, 0);
        assert.match(game._pending_message, /can't play music underwater/i);
        assert.doesNotMatch(game._pending_message, /Improvise/);
        assert.equal(sleeper.msleeping, 1);
        assert.equal(shkp.debit || 0, 0);
    }
});

test('no-blow form gates flutes horns and bugles but not harp or drum', async () => {
    for (const [kind, letter, spe] of [
        ['wooden flute', 'f', undefined],
        ['magic flute', 'm', 2],
        ['tooled horn', 't', undefined],
        ['fire horn', 'r', 2],
        ['bugle', 'b', undefined],
    ]) {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        installNoBlowButHandsForm();
        const instrument = spe == null
            ? ordinaryTool(3300 + letter.charCodeAt(0), kind, letter)
            : chargedTool(3300 + letter.charCodeAt(0), kind, letter, spe);
        game.inventory = [instrument];
        shop.addObjectToShopBill(shkp, instrument, 100);

        await rhack('a');
        await rhack(letter);

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move || 0, 0);
        assert.match(game._pending_message, /incapable of playing/i);
        assert.doesNotMatch(game._pending_message, /Improvise/);
        assert.equal(instrument.spe ?? spe, spe);
        assert.equal(shkp.debit || 0, 0);
    }

    {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        installNoBlowButHandsForm();
        const harp = ordinaryTool(3400, 'wooden harp', 'h');
        game.inventory = [harp];
        shop.addObjectToShopBill(shkp, harp, 60);

        await rhack('a');
        await rhack('h');

        assert.equal(game._command_mode, 'instrumentImprovisePrompt');
        assert.match(game._pending_message, /Improvise\?/);
    }

    {
        const { shkp } = installCommandShopState();
        makeInstrumentApplyDeterministic(shkp);
        installNoBlowButHandsForm();
        const drum = ordinaryTool(3401, 'leather drum', 'd');
        game.inventory = [drum];
        shop.addObjectToShopBill(shkp, drum, 60);

        await rhack('a');
        await rhack('d');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.match(game._pending_message, /deafening row|pound on the drum/i);
    }
});

test('manual instrument tune normalizes notes and opens the stronghold drawbridge', async () => {
    const { bridge, wall } = installStrongholdInstrumentState('ABCDE');
    const flute = ordinaryTool(3450, 'wooden flute', 'f');
    game.inventory = [flute];

    await rhack('a');
    await rhack('f');
    await rhack('n');
    for (const ch of 'ahcde') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.match(game._pending_message, /extract a strange sound from the wooden flute/i);
    assert.equal(game.u.uevent.uheard_tune, 2);
    assert.equal(game.u.uevent.uopened_dbridge, 1);
    assert.equal(bridge.typ, DRAWBRIDGE_DOWN);
    assert.equal(wall.typ, DOOR);
});

test('known passtune prompt can cancel or play the castle tune', async () => {
    {
        installStrongholdInstrumentState('CDEFG');
        game.u.uevent.uheard_tune = 2;
        const harp = ordinaryTool(3451, 'wooden harp', 'h');
        game.inventory = [harp];

        await rhack('a');
        await rhack('h');
        await rhack('n');

        assert.equal(game._command_mode, 'instrumentPasstunePrompt');
        assert.match(game._pending_message, /Play the passtune\?/);

        await rhack('q');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move || 0, 0);
        assert.match(game._pending_message, /Never mind/);
    }

    {
        const { bridge, wall } = installStrongholdInstrumentState('CDEFG');
        game.u.uevent.uheard_tune = 2;
        const harp = ordinaryTool(3452, 'wooden harp', 'h');
        game.inventory = [harp];

        await rhack('a');
        await rhack('h');
        await rhack('n');
        await rhack('y');

        assert.equal(game._command_mode, null);
        assert.equal(game.context.move, 1);
        assert.equal(bridge.typ, DRAWBRIDGE_DOWN);
        assert.equal(wall.typ, DOOR);
        assert.equal(game.u.uevent.uheard_tune, 2);
    }
});

test('wrong stronghold tune gives mastermind feedback and marks tune awareness', async () => {
    installStrongholdInstrumentState('ABCDE');
    const horn = ordinaryTool(3453, 'tooled horn', 't');
    game.inventory = [horn];

    await rhack('a');
    await rhack('t');
    await rhack('n');
    for (const ch of 'aeczz') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.u.uevent.uheard_tune, 1);
    assert.match(game._pending_message, /1 tumbler click and 2 gears turn/);
});

test('unpaid charged object with no remaining charges is not billed for usage', () => {
    const { shkp } = installShopState();
    const bag = chargedTool(3081, 'bag of tricks', 'b', 0);
    game.inventory = [bag];
    shop.addObjectToShopBill(shkp, bag, 100);

    const fee = shop.checkUnpaidUsageForTest(bag, []);

    assert.equal(fee, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, bag).useup, false);
});

test('costly tin opens one carried unpaid tin from a stack', () => {
    const { shkp } = installShopState();
    const stack = tin(3091, 't', 2);
    game.inventory = [stack];
    const unitPrice = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);
    shop.addObjectToShopBill(shkp, stack, unitPrice * 2);

    const opened = shop.costlyTinForTest(stack, { floorObject: false, alterType: 'open' });

    assert.notEqual(opened, stack);
    assert.equal(game.inventory.includes(stack), true);
    assert.equal(game.inventory.includes(opened), true);
    assert.equal(stack.quan, 1);
    assert.equal(opened.quan, 1);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, unitPrice);
    assert.notEqual(opened.unpaid, true);
    assert.equal(opened.unpaidPrice, undefined);
    assert.equal(shkp.billct, 2);
    const live = shop.shopBillEntryForObject(shkp, stack);
    const used = shop.shopBillEntryForObject(shkp, opened);
    assert.ok(live);
    assert.ok(used);
    assert.equal(live.useup, false);
    assert.equal(used.useup, true);
    assert.equal(shop.shopBillEntryTotal(live), unitPrice);
    assert.equal(shop.shopBillEntryTotal(used), unitPrice);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(opened.id)), true);
});

test('costly tin opens one shop-floor tin from a stack', () => {
    const { shkp } = installShopState();
    const stack = tin(3092, undefined, 2);
    delete stack.letter;
    delete stack.line;
    game.level.objects = [stack];
    const unitPrice = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);

    const opened = shop.costlyTinForTest(stack, { floorObject: true, alterType: 'open' });

    assert.notEqual(opened, stack);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(game.level.objects.includes(opened), true);
    assert.equal(stack.quan, 1);
    assert.equal(opened.quan, 1);
    assert.equal(opened.no_charge, true);
    assert.notEqual(opened.unpaid, true);
    assert.notEqual(stack.unpaid, true);
    assert.notEqual(stack.no_charge, true);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, opened);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), unitPrice);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(opened.id)), true);
});

test('costly tin ignores no-charge shop-floor tins', () => {
    const { shkp } = installShopState();
    const floorTin = tin(3093, undefined, 2);
    delete floorTin.letter;
    delete floorTin.line;
    floorTin.no_charge = true;
    game.level.objects = [floorTin];

    const opened = shop.costlyTinForTest(floorTin, { floorObject: true, alterType: 'open' });

    assert.equal(opened, floorTin);
    assert.equal(floorTin.quan, 2);
    assert.equal(floorTin.no_charge, true);
    assert.notEqual(floorTin.unpaid, true);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
});

test('metallivorous carried meat tin skips contents prompt and eats the tin', async () => {
    installCommandShopState();
    installMetallivorousForm();
    const can = tin(30941, 't');
    can.spe = -6;
    can.corpsenm = { name: 'lichen' };
    game.inventory = [can];

    await rhack('e');
    await rhack('t');

    assert.equal(game._command_mode, null);
    assert.equal(game._tin_opened_pending || null, null);
    assert.equal(game.inventory.includes(can), false);
    assert.equal(game.u.uhunger, 955);
    assert.equal(game.context.move, 1);
    assert.match(game._pending_message, /You bite right into the metal tin\.\.\./);
    assert.match(game._pending_message, /You consume boiled lichen\./);
    assert.doesNotMatch(game._pending_message, /Eat it\?|smells like/);
});

test('metallivorous carried empty tin gives metal nutrition', async () => {
    installCommandShopState();
    installMetallivorousForm();
    const can = tin(30942, 't');
    can.spe = 0;
    can.corpsenm = null;
    can.emptyTin = true;
    can.kind = 'empty tin';
    can.singular = 'empty tin';
    can.plural = 'empty tins';
    game.inventory = [can];

    await rhack('e');
    await rhack('t');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.includes(can), false);
    assert.equal(game.u.uhunger, 905);
    assert.match(game._pending_message, /You bite right into the metal tin\.\.\./);
    assert.match(game._pending_message, /It turns out to be empty\./);
    assert.doesNotMatch(game._pending_message, /Eat it\?|smells like/);
});

test('metallivorous carried spinach tin skips prompt and adds metal nutrition', async () => {
    installCommandShopState();
    installMetallivorousForm();
    const can = tin(30943, 't');
    can.spe = 1;
    can.corpsenm = null;
    can.blessed = true;
    can.kind = 'tin:spinach';
    can.singular = 'tin of spinach';
    can.plural = 'tins of spinach';
    game.inventory = [can];

    await rhack('e');
    await rhack('t');

    assert.equal(game._command_mode, null);
    assert.equal(game._tin_opened_pending || null, null);
    assert.equal(game.inventory.includes(can), false);
    assert.equal(game.u.uhunger, 1505);
    assert.match(game._pending_message, /You bite right into the metal tin\.\.\./);
    assert.match(game._pending_message, /It contains spinach\./);
    assert.match(game._pending_message, /This makes you feel like Popeye!/);
    assert.doesNotMatch(game._pending_message, /Eat it\?|smells like/);
});

test('first bite of unpaid carried food stack splits live and used-up bill rows', () => {
    const { shkp } = installShopState();
    const stack = foodRation(3101, 'a');
    stack.quan = 2;
    stack.line = 'a - 2 food rations';
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 90);

    const touched = shop.touchFoodForBiteTest(stack, false);

    assert.notEqual(touched, stack);
    assert.equal(game.inventory.includes(touched), true);
    assert.equal(stack.quan, 1);
    assert.equal(touched.quan, 1);
    assert.equal(touched.oeaten, 800);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 45);
    assert.match(stack.line, /unpaid, 45 zorkmids/);
    assert.notEqual(touched.unpaid, true);
    assert.equal(touched.unpaidPrice, undefined);
    assert.equal(shkp.billct, 2);
    const live = shop.shopBillEntryForObject(shkp, stack);
    const bite = shop.shopBillEntryForObject(shkp, touched);
    assert.ok(live);
    assert.ok(bite);
    assert.equal(live.useup, false);
    assert.equal(bite.useup, true);
    assert.equal(shop.shopBillEntryTotal(live), 45);
    assert.equal(shop.shopBillEntryTotal(bite), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(touched.id)), true);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(entry => entry.billPortion === 'fullyUsedUp' && entry.price === 45), true);
    assert.equal(debts.some(entry => entry.billPortion === 'intact' && entry.price === 45), true);
});

test('repeated bite touch on partly eaten food does not double bill', () => {
    const { shkp } = installShopState();
    const ration = foodRation(3111, 'a');
    game.inventory = [ration];
    shop.addObjectToShopBill(shkp, ration, 45);

    const touched = shop.touchFoodForBiteTest(ration, false);
    const again = shop.touchFoodForBiteTest(touched, false);

    assert.equal(again, touched);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, touched);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal((game._usedUpShopBills || []).filter(bill => String(bill.bo_id) === String(touched.id)).length, 1);
});

test('first bite of shop-floor food stack bills only the touched unit', () => {
    const { shkp } = installShopState();
    const floor = foodRation(3121);
    floor.quan = 2;
    delete floor.letter;
    delete floor.line;
    game.level.objects = [floor];
    const expected = shop.shopItemPrice({ ...floor, quan: 1 }, 5, 5);

    const touched = shop.touchFoodForBiteTest(floor, true);

    assert.equal(touched, floor);
    assert.equal(floor.quan, 1);
    assert.equal(floor.oeaten, 800);
    assert.equal(floor.no_charge, true);
    assert.notEqual(floor.unpaid, true);
    const rest = game.level.objects.find(obj => obj !== floor && obj.kind === 'food ration');
    assert.ok(rest);
    assert.equal(rest.quan, 1);
    assert.notEqual(rest.unpaid, true);
    assert.notEqual(rest.no_charge, true);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, floor);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expected);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(floor.id)), true);
});

test('carried food ration command starts victual with one C bite', async () => {
    installCommandShopState();
    const ration = foodRation(3131, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');

    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 640);
    assert.match(ration.line, /partly eaten food ration/);
    assert.equal(game.u.uhunger, 1060);
    assert.equal(game._eating_turns_remaining, 5);
    assert.equal(game._eating_inventory_object, ration);
    assert.equal(game._eating_bite_nutrition, 160);
    assert.equal(game.context.move, 1);
});

test('carried food ration occupation removes item after later bites', async () => {
    installCommandShopState();
    const ration = foodRation(3132, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');
    finishEatingOccupation();

    assert.equal(game.inventory.includes(ration), false);
    assert.equal(game.u.uhunger, 1700);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_inventory_object, null);
    assert.equal(game._eating_bite_nutrition || 0, 0);
    assert.equal(game._pending_message, "You're finally finished.");
});

test('interrupted carried food ration resumes same victual without rebilling', async () => {
    const { shkp } = installCommandShopState();
    const ration = foodRation(31321, 'a');
    game.inventory = [ration];
    shop.addObjectToShopBill(shkp, ration, 45);

    await rhack('e');
    await rhack('a');
    processEatingOccupationTick(game);
    interruptEatingOccupation(game);

    assert.equal(game._pending_message, 'You stop eating the partly eaten food ration.');
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 480);
    assert.equal(game.u.uhunger, 1220);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_interrupted, 1);
    assert.equal(game._eating_paused_turns_remaining, 4);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(shkp.billct, 1);
    assert.equal((game._usedUpShopBills || []).filter(bill => String(bill.bo_id) === String(ration.id)).length, 1);

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'You resume your meal.');
    assert.equal(ration.oeaten, 320);
    assert.equal(game.u.uhunger, 1380);
    assert.equal(game._eating_turns_remaining, 3);
    assert.equal(game._eating_interrupted || 0, 0);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(shkp.billct, 1);

    finishEatingOccupation();

    assert.equal(game.inventory.includes(ration), false);
    assert.equal(game.u.uhunger, 1700);
    assert.equal(game._pending_message, "You're finally finished.");
});

test('interruption on carried food ration final bite finishes the meal', async () => {
    installCommandShopState();
    const ration = foodRation(31322, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');
    for (let i = 0; i < 4; i++) processEatingOccupationTick(game);
    interruptEatingOccupation(game);

    assert.equal(game.inventory.includes(ration), false);
    assert.equal(game.u.uhunger, 1700);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_interrupted || 0, 0);
    assert.doesNotMatch(game._pending_message || '', /stop eating/);
    assert.equal(game._pending_message, "You're having a hard time getting all of it down.");
    assert.equal(game._topline_after_more, "You're finally finished.");
});

test('carried food ration full warning sets finally-finished message without prompt when not satiated', async () => {
    installCommandShopState();
    const ration = foodRation(31323, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');
    for (let i = 0; i < 3; i++) processEatingOccupationTick(game);

    assert.equal(game._pending_message, "You're having a hard time getting all of it down.");
    assert.equal(game._command_mode || null, null);
    assert.equal(game._eating_canchoke, false);
    assert.equal(game._eating_fullwarn, 1);
    assert.equal(game._eating_nomovemsg, "You're finally finished.");
    assert.equal(game._eating_turns_remaining, 2);
    assert.equal(ration.oeaten, 160);

    acknowledgePendingMessage();
    finishEatingOccupation();

    assert.equal(game.inventory.includes(ration), false);
    assert.equal(game.u.uhunger, 1700);
    assert.equal(game._pending_message, "You're finally finished.");
});

test('satiated carried food ration full warning prompts and declining pauses the meal', async () => {
    installCommandShopState();
    game.u.uhunger = 1200;
    const ration = foodRation(31324, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');

    assert.equal(game._eating_canchoke, true);
    assert.equal(game.u.uhunger, 1360);
    assert.equal(game._eating_turns_remaining, 5);

    processEatingOccupationTick(game);

    assert.equal(game._pending_message, "You're having a hard time getting all of it down.  Continue eating? [yn] (n)");
    assert.equal(game._command_mode, 'continueEatingPrompt');
    assert.equal(game._eating_fullwarn, 1);
    assert.equal(game._eating_nomovemsg, "You're finally finished.");
    assert.equal(game._eating_turns_remaining, 4);
    assert.equal(ration.oeaten, 480);

    await rhack('n');

    assert.equal(game._command_mode || null, null);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_interrupted, 1);
    assert.equal(game._eating_paused_turns_remaining, 4);
    assert.equal(game._eating_canchoke, true);
    assert.equal(game._eating_fullwarn, 0);
    assert.equal(game._eating_nomovemsg || '', '');
    assert.equal(game.context.move, 0);
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 480);
    assert.equal(game.u.uhunger, 1520);
});

test('floor pancake full warning uses finally-finished message without continue prompt', async () => {
    installNonShopFloorState();
    game.u.uhunger = 1400;
    const pancake = simpleFood(31325, 'pancake');
    delete pancake.letter;
    delete pancake.line;
    game.level.objects = [pancake];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, "This pancake is delicious!  You're having a hard time getting all of it down.");
    assert.equal(game._command_mode || null, null);
    assert.equal(game._eating_canchoke, true);
    assert.equal(game._eating_fullwarn, 1);
    assert.equal(game._eating_nomovemsg, "You're finally finished.");
    assert.equal(game._eating_turns_remaining, 2);
    assert.equal(pancake.oeaten, 100);

    acknowledgePendingMessage();
    finishEatingOccupation();

    assert.equal(game.level.objects.includes(pancake), false);
    assert.equal(game.u.uhunger, 1600);
    assert.equal(game._pending_message, "You're finally finished.");
});

test('satiated carried food ration can fatally choke on first bite over 2000', async () => {
    installCommandShopState();
    game.u.uhunger = 1840;
    const ration = foodRation(31326, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'You choke over your food.  You die...');
    assert.equal(game._message_more, 1);
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.u.uhp, 0);
    assert.equal(game.u.uhunger, 2000);
    assert.equal(game._death_cause, 'choked on a food ration');
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 800);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.doesNotMatch(game._pending_message, /finally finished/);
});

test('satiated carried food ration choking life-saving resets hunger', async () => {
    installCommandShopState();
    game.u.uhunger = 1840;
    const ration = foodRation(313261, 'a');
    const amulet = {
        id: 313262,
        letter: 'b',
        cls: 'amulet',
        glyph: '"',
        kind: 'amulet of life saving',
        actualKind: 'amulet of life saving',
        quan: 1,
        worn: true,
        line: 'b - an amulet of life saving (being worn)',
    };
    game.inventory = [ration, amulet];

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'You choke over your food.  You die...  But wait...  Your medallion begins to glow!');
    assert.equal(game._command_mode, 'lifeSavingMore');
    assert.equal(game.u.uhunger, 900);
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(game.inventory.includes(amulet), false);

    await rhack(' ');

    assert.equal(game._pending_message, 'You feel much better!');
    assert.equal(game._command_mode || null, null);
    assert.equal(game.u.uhp, game.u.uhpmax);
    assert.equal(game.u.uhunger, 900);
});

test('satiated carried food ration choking recovers with magical breathing', async () => {
    installCommandShopState();
    game.u.uhunger = 1840;
    const ration = foodRation(313263, 'a');
    const amulet = {
        id: 313264,
        letter: 'b',
        cls: 'amulet',
        glyph: '"',
        kind: 'amulet of magical breathing',
        actualKind: 'amulet of magical breathing',
        quan: 1,
        worn: true,
        line: 'b - an amulet of magical breathing (being worn)',
    };
    game.inventory = [ration, amulet];

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'You stuff yourself and then vomit voluminously.');
    assert.equal(game._command_mode || null, null);
    assert.equal(game.context.move, 2);
    assert.equal(game.u.uhunger, 1000);
    assert.equal(ration.oeaten, 640);
    assert.equal(game._eating_interrupted, 1);
    assert.equal(game._eating_paused_turns_remaining, 5);
});

test('hunger property skips full warning and recovers choking to 60 hunger', async () => {
    installCommandShopState();
    game.u.uhunger = 1400;
    const warningRation = foodRation(313265, 'a');
    const ring = {
        id: 313266,
        letter: 'b',
        cls: 'ring',
        glyph: '=',
        kind: 'ring of hunger',
        actualKind: 'ring of hunger',
        quan: 1,
        worn: true,
        line: 'b - a ring of hunger (on right hand)',
    };
    game.inventory = [warningRation, ring];

    await rhack('e');
    await rhack('a');

    assert.equal(game.u.uhunger, 1560);
    assert.equal(game._eating_fullwarn || 0, 0);
    assert.equal(game._command_mode || null, null);
    assert.doesNotMatch(game._pending_message || '', /hard time/);

    installCommandShopState();
    game.u.uhunger = 1840;
    const chokingRation = foodRation(313267, 'a');
    const hungerRing = { ...ring, id: 313268 };
    game.inventory = [chokingRation, hungerRing];

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'You stuff yourself and then vomit voluminously.');
    assert.equal(game._command_mode || null, null);
    assert.equal(game.context.move, 2);
    assert.equal(game.u.uhunger, 60);
    assert.equal(chokingRation.oeaten, 640);
    assert.equal(game._eating_interrupted, 1);
    assert.equal(game._eating_paused_turns_remaining, 5);
});

test('strangulation blocks starting ordinary eating', async () => {
    installCommandShopState();
    game.u.strangled = true;
    game.inventory = [foodRation(313269, 'a')];

    await rhack('e');

    assert.equal(game._pending_message, "If you can't breathe air, how can you consume solids?");
    assert.equal(game._command_mode || null, null);
    assert.equal(game.u.uhunger, 900);
    assert.equal(game.inventory.length, 1);
});

test('strangulation blocks random carried food choking recovery after eating starts', async () => {
    installCommandShopState();
    initRng(26);
    game.u.uhunger = 1200;
    const ration = foodRation(313270, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');
    processEatingOccupationTick(game);

    assert.equal(game._command_mode, 'continueEatingPrompt');

    await rhack('y');
    acknowledgePendingMessage();
    game.u.strangled = true;
    game.u._statusSuffix = `${game.u._statusSuffix || ''} Strngl`;
    processEatingOccupationTick(game);
    processEatingOccupationTick(game);
    processEatingOccupationTick(game);

    assert.equal(game._pending_message, 'You choke over your food.  You die...');
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.u.uhp, 0);
    assert.equal(game.u.uhunger, 2000);
    assert.equal(ration.oeaten, 160);
    assert.doesNotMatch(game._pending_message, /vomit/);
});

test('satiated carried food ration over 2000 can recover by vomiting', async () => {
    installCommandShopState();
    initRng(26);
    game.u.uhunger = 1840;
    const ration = foodRation(31327, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'You stuff yourself and then vomit voluminously.');
    assert.equal(game._command_mode || null, null);
    assert.equal(game.context.move, 2);
    assert.equal(game._helpless_time, 2);
    assert.equal(game._wake_message, 'You can move again.');
    assert.equal(game.u.uhunger, 1000);
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 640);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_interrupted, 1);
    assert.equal(game._eating_paused_turns_remaining, 5);
    assert.equal(game._eating_canchoke, true);
    assert.equal(game._eating_fullwarn, 0);
});

test('accepted carried food ration full-warning prompt preserves canchoke until choking', async () => {
    installCommandShopState();
    game.u.uhunger = 1200;
    const ration = foodRation(31328, 'a');
    game.inventory = [ration];

    await rhack('e');
    await rhack('a');
    processEatingOccupationTick(game);

    assert.equal(game._command_mode, 'continueEatingPrompt');
    assert.equal(game._eating_canchoke, true);

    await rhack('y');
    acknowledgePendingMessage();
    processEatingOccupationTick(game);
    processEatingOccupationTick(game);
    processEatingOccupationTick(game);

    assert.equal(game._pending_message, 'You choke over your food.  You die...');
    assert.equal(game._message_more, 1);
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.u.uhp, 0);
    assert.equal(game.u.uhunger, 2000);
    assert.equal(game._death_cause, 'choked on a food ration');
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 160);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('floor food ration can fatally choke on first bite over 2000', async () => {
    installNonShopFloorState();
    game.u.uhunger = 1840;
    const ration = foodRation(31329);
    delete ration.letter;
    delete ration.line;
    game.level.objects = [ration];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'You choke over your food.  You die...');
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'choked on a food ration');
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(ration.oeaten, 800);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('carried food ration command splits unpaid stack before victual bites', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRation(3133, 'a');
    stack.quan = 2;
    stack.line = 'a - 2 food rations';
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 90);

    await rhack('e');
    await rhack('a');

    const touched = game._eating_inventory_object;
    assert.ok(touched);
    assert.notEqual(touched, stack);
    assert.equal(game.inventory.includes(touched), true);
    assert.equal(stack.quan, 1);
    assert.equal(touched.quan, 1);
    assert.equal(touched.oeaten, 640);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 45);
    assert.notEqual(touched.unpaid, true);
    const live = shop.shopBillEntryForObject(shkp, stack);
    const bite = shop.shopBillEntryForObject(shkp, touched);
    assert.ok(live);
    assert.ok(bite);
    assert.equal(live.useup, false);
    assert.equal(bite.useup, true);
    assert.equal(shop.shopBillEntryTotal(live), 45);
    assert.equal(shop.shopBillEntryTotal(bite), 45);
});

test('carried delayed ordinary foods use C bite timing and messages', async () => {
    const cases = [
        { kind: 'pancake', letter: 'p', firstOeaten: 100, firstHunger: 1000, turns: 2, bite: 100, finalHunger: 1100, message: 'This pancake is delicious!', conduct: 'unvegan' },
        { kind: 'lembas wafer', letter: 'l', firstOeaten: 400, firstHunger: 1300, turns: 2, bite: 400, finalHunger: 1700, message: 'This lembas wafer is delicious!', finish: "You're finally finished." },
        { kind: 'cram ration', letter: 'c', firstOeaten: 400, firstHunger: 1100, turns: 3, bite: 200, finalHunger: 1500, message: 'This cram ration is bland.', finish: "You're finally finished." },
        { kind: 'tripe ration', letter: 't', firstOeaten: 100, firstHunger: 1000, turns: 2, bite: 100, finalHunger: 1100, message: 'Yak - dog food!', conduct: 'unvegan', vegetarianConduct: true, experience: 1 },
    ];

    for (const entry of cases) {
        installCommandShopState();
        const food = simpleFood(3140 + cases.indexOf(entry), entry.kind, entry.letter);
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, entry.message, entry.kind);
        assert.equal(game.inventory.includes(food), true, entry.kind);
        assert.equal(food.oeaten, entry.firstOeaten, entry.kind);
        assert.equal(game.u.uhunger, entry.firstHunger, entry.kind);
        assert.equal(game._eating_turns_remaining, entry.turns, entry.kind);
        assert.equal(game._eating_inventory_object, food, entry.kind);
        assert.equal(game._eating_bite_nutrition, entry.bite, entry.kind);
        assert.equal(game._eating_bite_hunger, entry.bite, entry.kind);
        if (entry.conduct) assert.equal(game.u.uconduct?.[entry.conduct], 1, entry.kind);
        if (entry.vegetarianConduct) assert.equal(game.u.uconduct?.unvegetarian, 1, entry.kind);
        if (entry.experience) assert.equal(game.u.uexp, entry.experience, entry.kind);

        finishEatingOccupation();

        assert.equal(game.inventory.includes(food), false, entry.kind);
        assert.equal(game.u.uhunger, entry.finalHunger, entry.kind);
        assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
        assert.equal(game._eating_bite_hunger || 0, 0, entry.kind);
        if (entry.finish) assert.equal(game._pending_message, entry.finish, entry.kind);
        else assert.match(game._pending_message || '', new RegExp(`You finish eating the ${entry.kind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`), entry.kind);
    }
});

test('carried enormous meatball starts C delayed flesh meal', async () => {
    installCommandShopState();
    game.u.uhunger = 0;
    const food = simpleFood(31887, 'enormous meatball', 'n');
    game.inventory = [food];

    await rhack('e');
    await rhack('n');

    assert.equal(game._pending_message, 'This enormous meatball is delicious!');
    assert.equal(game.inventory.includes(food), true);
    assert.equal(food.oeaten, 1900);
    assert.equal(game.u.uhunger, 100);
    assert.equal(game._eating_turns_remaining, 20);
    assert.equal(game._eating_inventory_object, food);
    assert.equal(game._eating_bite_nutrition, 100);
    assert.equal(game._eating_bite_hunger, 100);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian, 1);
});

test('carried delayed foods use C race-adjusted hunger before victual ticks', async () => {
    const cases = [
        { race: 'orc', kind: 'lembas wafer', letter: 'l', firstOeaten: 400, firstHunger: 1200, turns: 2, bite: 400, biteHunger: 300, finalHunger: 1500, message: '!#?&* elf kibble!' },
        { race: 'elf', kind: 'lembas wafer', letter: 'l', firstOeaten: 400, firstHunger: 1400, turns: 2, bite: 400, biteHunger: 500, finalHunger: 1900, message: 'A little goes a long way.' },
        { race: 'dwarf', kind: 'cram ration', letter: 'c', firstOeaten: 400, firstHunger: 1133, turns: 3, bite: 200, biteHunger: 233, finalHunger: 1599, message: 'This cram ration is bland.' },
    ];

    for (const entry of cases) {
        installCommandShopState();
        game._startup_race = entry.race;
        game.urace = { noun: entry.race };
        const food = simpleFood(3150 + cases.indexOf(entry), entry.kind, entry.letter);
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, entry.message, entry.race);
        assert.equal(food.oeaten, entry.firstOeaten, entry.race);
        assert.equal(game.u.uhunger, entry.firstHunger, entry.race);
        assert.equal(game._eating_turns_remaining, entry.turns, entry.race);
        assert.equal(game._eating_bite_nutrition, entry.bite, entry.race);
        assert.equal(game._eating_bite_hunger, entry.biteHunger, entry.race);

        finishEatingOccupation();

        assert.equal(game.inventory.includes(food), false, entry.race);
        assert.equal(game.u.uhunger, entry.finalHunger, entry.race);
    }
});

test('cursed carried delayed foods use C rotten first bite before victual ticks', async () => {
    const cases = [
        { kind: 'food ration', letter: 'f', firstOeaten: 267, firstHunger: 1033, turns: 3, bite: 133, finalHunger: 1299 },
        { kind: 'pancake', letter: 'p', firstOeaten: null, firstHunger: 1000, turns: 0, bite: 0, finalHunger: 1000, conduct: 'unvegan' },
        { kind: 'lembas wafer', letter: 'l', race: 'orc', firstOeaten: null, firstHunger: 1200, turns: 0, bite: 0, finalHunger: 1200 },
        { kind: 'cram ration', letter: 'c', race: 'dwarf', firstOeaten: 150, firstHunger: 1075, turns: 2, bite: 150, biteHunger: 175, finalHunger: 1250 },
    ];

    for (const entry of cases) {
        installCommandShopState();
        initRng(2);
        if (entry.race) {
            game._startup_race = entry.race;
            game.urace = { noun: entry.race };
        }
        const food = simpleFood(3170 + cases.indexOf(entry), entry.kind, entry.letter, { cursed: true });
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, 'Blecch!  Rotten food!', entry.kind);
        assert.equal(game.u.uhunger, entry.firstHunger, entry.kind);
        if (entry.firstOeaten == null) {
            assert.equal(game.inventory.includes(food), false, entry.kind);
            assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
        } else {
            assert.equal(game.inventory.includes(food), true, entry.kind);
            assert.equal(food.oeaten, entry.firstOeaten, entry.kind);
            assert.equal(game._eating_turns_remaining, entry.turns, entry.kind);
            assert.equal(game._eating_bite_nutrition, entry.bite, entry.kind);
            assert.equal(game._eating_bite_hunger, entry.biteHunger || entry.bite, entry.kind);
            acknowledgeMoreForOccupation();
            finishEatingOccupation();
            assert.equal(game.inventory.includes(food), false, entry.kind);
        }
        assert.equal(game.u.uhunger, entry.finalHunger, entry.kind);
        if (entry.conduct) assert.equal(game.u.uconduct?.[entry.conduct], 1, entry.kind);
    }
});

test('old orotten carried delayed food halves before first C bite', async () => {
    installCommandShopState();
    initRng(2);
    game.moves = 100;
    const ration = foodRation(3180, 'f');
    Object.assign(ration, { age: 0, orotten: true });
    game.inventory = [ration];

    await rhack('e');
    await rhack('f');

    assert.match(game._pending_message, /^Blecch!  Rotten food!/);
    assert.equal(ration.oeaten, 267);
    assert.equal(game.u.uhunger, 1033);
    assert.equal(game._eating_turns_remaining, 3);
});

test('orotten carried delayed foods respect C nonrotting exemptions', async () => {
    const cases = [
        { kind: 'pancake', letter: 'p', rotten: true, firstOeaten: null, firstHunger: 1000, turns: 0, bite: 0, finalHunger: 1000 },
        { kind: 'lembas wafer', letter: 'l', rotten: false, firstOeaten: 400, firstHunger: 1300, turns: 2, bite: 400, finalHunger: 1700, message: 'This lembas wafer is delicious!' },
        { kind: 'cram ration', letter: 'c', rotten: false, firstOeaten: 400, firstHunger: 1100, turns: 3, bite: 200, finalHunger: 1500, message: 'This cram ration is bland.' },
    ];

    for (const entry of cases) {
        installCommandShopState();
        initRng(2);
        game.moves = 100;
        const food = simpleFood(3182 + cases.indexOf(entry), entry.kind, entry.letter, {
            age: 0,
            orotten: true,
        });
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, entry.rotten ? 'Blecch!  Rotten food!' : entry.message, entry.kind);
        assert.equal(game.u.uhunger, entry.firstHunger, entry.kind);
        if (entry.firstOeaten == null) {
            assert.equal(game.inventory.includes(food), false, entry.kind);
            assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
        } else {
            assert.equal(game.inventory.includes(food), true, entry.kind);
            assert.equal(food.oeaten, entry.firstOeaten, entry.kind);
            assert.equal(game._eating_turns_remaining, entry.turns, entry.kind);
            assert.equal(game._eating_bite_nutrition, entry.bite, entry.kind);
            finishEatingOccupation();
        }
        assert.equal(game.u.uhunger, entry.finalHunger, entry.kind);
    }
});

test('blessed stale carried delayed food uses the C age threshold', async () => {
    installCommandShopState();
    initRng(2);
    game.moves = 100;
    const blessed = foodRation(3186, 'f');
    Object.assign(blessed, { age: 60, blessed: true, orotten: true });
    game.inventory = [blessed];

    await rhack('e');
    await rhack('f');

    assert.notEqual(game._pending_message, 'Blecch!  Rotten food!');
    assert.equal(blessed.oeaten, 640);
    assert.equal(game.u.uhunger, 1060);
    assert.equal(game._eating_turns_remaining, 5);

    installCommandShopState();
    initRng(2);
    game.moves = 100;
    const uncursed = foodRation(3187, 'f');
    Object.assign(uncursed, { age: 60, orotten: true });
    game.inventory = [uncursed];

    await rhack('e');
    await rhack('f');

    assert.match(game._pending_message, /^Blecch!  Rotten food!/);
    assert.equal(uncursed.oeaten, 267);
    assert.equal(game.u.uhunger, 1033);
    assert.equal(game._eating_turns_remaining, 3);
});

test('rotten delayed food sleep leaves the halved carried meal unfinished', async () => {
    installCommandShopState();
    const ration = foodRation(3181, 'f');
    ration.cursed = true;
    game.inventory = [ration];

    await rhack('e');
    await rhack('f');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!  The world spins and goes dark.');
    assert.equal(game.inventory.includes(ration), true);
    assert.equal(ration.oeaten, 400);
    assert.equal(ration.orotten, true);
    assert.equal(game.u.uhunger, 900);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.ok(game.context.move > 1);

    acknowledgeMoreForOccupation();
    await rhack('e');

    assert.equal(game._command_mode, 'eatObject');
    assert.equal(game._eating_finish_message || '', '');
    assert.match(game._pending_message, /What do you want to eat\? \[f or \?\*\]/);
});

test('carried delayed ordinary food command splits unpaid stacks before C bites', async () => {
    const cases = [
        { kind: 'pancake', letter: 'p', firstOeaten: 100, unitPrice: 15 },
        { kind: 'lembas wafer', letter: 'l', firstOeaten: 400, unitPrice: 45 },
        { kind: 'cram ration', letter: 'c', firstOeaten: 400, unitPrice: 35 },
    ];

    for (const entry of cases) {
        const { shkp } = installCommandShopState();
        const stack = simpleFood(3160 + cases.indexOf(entry), entry.kind, entry.letter, {
            dknown: true,
            known: true,
            quan: 2,
            line: `${entry.letter} - 2 ${entry.kind}s`,
        });
        game.inventory = [stack];
        const unitPrice = entry.unitPrice;
        assert.equal(shop.shopBaseCost(stack), unitPrice, entry.kind);
        shop.addObjectToShopBill(shkp, stack, unitPrice * 2);

        await rhack('e');
        await rhack(entry.letter);

        const touched = game._eating_inventory_object;
        assert.ok(touched, entry.kind);
        assert.notEqual(touched, stack, entry.kind);
        assert.equal(game.inventory.includes(touched), true, entry.kind);
        assert.equal(stack.quan, 1, entry.kind);
        assert.equal(touched.quan, 1, entry.kind);
        assert.equal(touched.oeaten, entry.firstOeaten, entry.kind);
        assert.equal(stack.unpaid, true, entry.kind);
        assert.equal(stack.unpaidPrice, unitPrice, entry.kind);
        assert.notEqual(touched.unpaid, true, entry.kind);
        const live = shop.shopBillEntryForObject(shkp, stack);
        const bite = shop.shopBillEntryForObject(shkp, touched);
        assert.ok(live, entry.kind);
        assert.ok(bite, entry.kind);
        assert.equal(live.useup, false, entry.kind);
        assert.equal(bite.useup, true, entry.kind);
        assert.equal(shop.shopBillEntryTotal(live), unitPrice, entry.kind);
        assert.equal(shop.shopBillEntryTotal(bite), unitPrice, entry.kind);
    }
});

test('cursed carried delayed food stack splits and bills before rotten first bite', async () => {
    const { shkp } = installCommandShopState();
    initRng(2);
    const stack = foodRation(3188, 'f');
    Object.assign(stack, {
        cursed: true,
        quan: 2,
        plural: 'food rations',
        line: 'f - 2 food rations',
    });
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 90);

    await rhack('e');
    await rhack('f');

    assert.match(game._pending_message, /^Blecch!  Rotten food!/);
    const touched = game._eating_inventory_object;
    assert.ok(touched);
    assert.notEqual(touched, stack);
    assert.equal(game.inventory.includes(touched), true);
    assert.equal(stack.quan, 1);
    assert.equal(touched.quan, 1);
    assert.equal(touched.oeaten, 267);
    assert.equal(game.u.uhunger, 1033);
    assert.equal(game._eating_turns_remaining, 3);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 45);
    assert.notEqual(touched.unpaid, true);
    const live = shop.shopBillEntryForObject(shkp, stack);
    const bite = shop.shopBillEntryForObject(shkp, touched);
    assert.ok(live);
    assert.ok(bite);
    assert.equal(live.useup, false);
    assert.equal(bite.useup, true);
    assert.equal(shop.shopBillEntryTotal(live), 45);
    assert.equal(shop.shopBillEntryTotal(bite), 45);
});

test('partly eaten rotten carried delayed food keeps the rotten message when consumed', async () => {
    installCommandShopState();
    initRng(2);
    const pancake = simpleFood(3189, 'pancake', 'p', {
        cursed: true,
        oeaten: 100,
        line: 'p - a partly eaten pancake',
    });
    game.inventory = [pancake];

    await rhack('e');
    await rhack('p');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!');
    assert.equal(game.inventory.includes(pancake), false);
    assert.equal(game.u.uhunger, 950);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('carried delay-one apple and fortune cookie finish without occupation', async () => {
    installNonShopFloorState();
    const apple = simpleFood(31880, 'apple', 'a');
    game.inventory = [apple];

    await rhack('e');
    await rhack('a');

    assert.equal(game._pending_message, 'Delicious!  Must be a Macintosh!');
    assert.equal(game._message_more || false, false);
    assert.equal(game.inventory.includes(apple), false);
    assert.equal(game.u.uhunger, 950);
    assert.equal(game._eating_turns_remaining || 0, 0);

    installNonShopFloorState();
    const cookie = simpleFood(31881, 'fortune cookie', 'f');
    game.inventory = [cookie];

    await rhack('e');
    await rhack('f');

    assert.equal(game._pending_message, 'This fortune cookie is delicious!');
    assert.equal(game._message_more, 1);
    assert.equal(game.inventory.includes(cookie), false);
    assert.equal(game.u.uhunger, 940);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game._queued_message_after_more, 'This cookie has a scrap of paper inside.  It reads:');
    assert.ok(game._fortune_cookie_rumor_after_more);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('carried delay-one cream pie and candy bar use victual path and animal-product conduct', async () => {
    const cases = [
        { kind: 'cream pie', letter: 'p', message: 'This cream pie is delicious!' },
        { kind: 'candy bar', letter: 'c', message: 'This candy bar is delicious!' },
    ];

    for (const entry of cases) {
        installNonShopFloorState();
        const food = simpleFood(31883 + cases.indexOf(entry), entry.kind, entry.letter);
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, entry.message, entry.kind);
        assert.equal(game.inventory.includes(food), false, entry.kind);
        assert.equal(game.u.uhunger, 1000, entry.kind);
        assert.equal(game.u.uconduct?.food, 1, entry.kind);
        assert.equal(game.u.uconduct?.unvegan, 1, entry.kind);
        assert.equal(game.u.uconduct?.unvegetarian || 0, 0, entry.kind);
        assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
    }
});

test('carried meatball uses C delay-one flesh conduct and nutrition', async () => {
    installNonShopFloorState();
    const food = simpleFood(31886, 'meatball', 'm');
    game.inventory = [food];

    await rhack('e');
    await rhack('m');

    assert.equal(game._pending_message, 'This meatball is delicious!');
    assert.equal(game.inventory.includes(food), false);
    assert.equal(game.u.uhunger, 905);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian, 1);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game.context.move, 1);
});

test('carried K-ration and C-ration use C delay-one bland victual path', async () => {
    const cases = [
        { kind: 'K-ration', letter: 'k', message: 'This K-ration is bland.', hunger: 1300 },
        { kind: 'C-ration', letter: 'c', message: 'This C-ration is bland.', hunger: 1200 },
    ];

    for (const entry of cases) {
        installNonShopFloorState();
        const food = simpleFood(31897 + cases.indexOf(entry), entry.kind, entry.letter);
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, entry.message, entry.kind);
        assert.equal(game.inventory.includes(food), false, entry.kind);
        assert.equal(game.u.uhunger, entry.hunger, entry.kind);
        assert.equal(game.u.uconduct?.food, 1, entry.kind);
        assert.equal(game.u.uconduct?.unvegan || 0, 0, entry.kind);
        assert.equal(game.u.uconduct?.unvegetarian || 0, 0, entry.kind);
        assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
        assert.equal(game._eating_inventory_object, null, entry.kind);
        assert.equal(game._eating_bite_nutrition || 0, 0, entry.kind);
        assert.equal(game.context.move, 1, entry.kind);
    }
});

test('carried delay-one plant foods use shared C victual path', async () => {
    const cases = [
        { kind: 'orange', letter: 'o', message: 'This orange is delicious!', hunger: 980 },
        { kind: 'pear', letter: 'p', message: 'Core dumped.', hunger: 950 },
        { kind: 'melon', letter: 'm', message: 'This melon is delicious!', hunger: 1000 },
        { kind: 'banana', letter: 'b', message: 'This banana is delicious!', hunger: 980 },
        { kind: 'carrot', letter: 'c', message: 'This carrot is delicious!', hunger: 950 },
        { kind: 'kelp frond', letter: 'k', message: 'This kelp frond is delicious!', hunger: 930 },
        { kind: 'sprig of wolfsbane', letter: 'w', message: 'This sprig of wolfsbane is delicious!', hunger: 940 },
        { kind: 'clove of garlic', letter: 'g', message: 'This clove of garlic is delicious!', hunger: 940 },
        { kind: 'eucalyptus leaf', letter: 'e', message: 'This eucalyptus leaf is delicious!', hunger: 901 },
    ];

    for (const [index, entry] of cases.entries()) {
        installNonShopFloorState();
        const food = simpleFood(31920 + index, entry.kind, entry.letter);
        game.inventory = [food];

        await rhack('e');
        await rhack(entry.letter);

        assert.equal(game._pending_message, entry.message, entry.kind);
        assert.equal(game.inventory.includes(food), false, entry.kind);
        assert.equal(game.u.uhunger, entry.hunger, entry.kind);
        assert.equal(game.u.uconduct?.food, 1, entry.kind);
        assert.equal(game.u.uconduct?.unvegan || 0, 0, entry.kind);
        assert.equal(game.u.uconduct?.unvegetarian || 0, 0, entry.kind);
        assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
        assert.equal(game._eating_inventory_object, null, entry.kind);
        assert.equal(game._eating_bite_nutrition || 0, 0, entry.kind);
        assert.equal(game.context.move, 1, entry.kind);
    }
});

test('carried current fruit slime mold uses C delay-one feedback', async () => {
    installNonShopFloorState();
    setCurrentFruitName('durian');
    const mold = slimeMoldFood(31946, 'd', 'durian', currentFruitId());
    game.inventory = [mold];

    await rhack('e');
    await rhack('d');

    assert.equal(game._pending_message, 'My, this is a yummy durian!');
    assert.equal(game.inventory.includes(mold), false);
    assert.equal(game.u.uhunger, 1150);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan || 0, 0);
    assert.equal(game.u.uconduct?.unvegetarian || 0, 0);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game.context.move, 1);
});

test('carried non-current fruit slime mold uses its own fruit name', async () => {
    installNonShopFloorState();
    setCurrentFruitName('mango');
    const mangoId = currentFruitId();
    setCurrentFruitName('durian');
    const mold = slimeMoldFood(31947, 'm', 'mango', mangoId);
    game.inventory = [mold];

    await rhack('e');
    await rhack('m');

    assert.equal(game._pending_message, 'This mango is delicious!');
    assert.equal(game.inventory.includes(mold), false);
    assert.equal(game.u.uhunger, 1150);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('cursed current fruit slime mold rots before the delay-one bite', async () => {
    installNonShopFloorState();
    initRng(2);
    setCurrentFruitName('durian');
    const mold = slimeMoldFood(31948, 'd', 'durian', currentFruitId(), { cursed: true });
    game.inventory = [mold];

    await rhack('e');
    await rhack('d');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!');
    assert.equal(game.inventory.includes(mold), false);
    assert.equal(game.u.uhunger, 1025);
    assert.doesNotMatch(game._pending_message, /durian|yummy|primo/);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('carried meat ring uses C delay-one flesh conduct', async () => {
    installNonShopFloorState();
    const ring = meatRingFood(31961, 'm');
    game.inventory = [ring];

    await rhack('e');
    await rhack('m');

    assert.equal(game._pending_message, 'This meat ring is delicious!');
    assert.equal(game.inventory.includes(ring), false);
    assert.equal(game.u.uhunger, 905);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian, 1);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game.context.move, 1);
});

test('carried royal jelly uses C delay-one food effects and animal-product conduct', async () => {
    installNonShopFloorState();
    const jelly = simpleFood(31965, 'lump of royal jelly', 'j');
    game.inventory = [jelly];

    await rhack('e');
    await rhack('j');

    assert.equal(game._pending_message, 'This lump of royal jelly is delicious!  You feel strong!');
    assert.equal(game.inventory.includes(jelly), false);
    assert.equal(game.u.uhunger, 1100);
    assert.equal(game.u.acurr.a[0], 11);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian || 0, 0);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game.context.move, 1);
});

test('cursed carried royal jelly rots before the one-bite post effects', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.uhp = 40;
    game.u.uhpmax = 40;
    const jelly = simpleFood(31966, 'lump of royal jelly', 'j', { cursed: true });
    game.inventory = [jelly];

    await rhack('e');
    await rhack('j');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!  You feel weak!');
    assert.equal(game.inventory.includes(jelly), false);
    assert.equal(game.u.uhunger, 1000);
    assert.equal(game.u.acurr.a[0], 9);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian || 0, 0);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('fatal cursed royal jelly runs post effects before useup', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.uhp = 1;
    game.u.uhpmax = 1;
    const jelly = simpleFood(31969, 'lump of royal jelly', 'j', { cursed: true });
    game.inventory = [jelly];

    await rhack('e');
    await rhack('j');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!  You feel weak!  You die...');
    assert.equal(game._message_more, 1);
    assert.equal(game._command_mode, 'deathDieMore');
    assert.equal(game.context.move, 0);
    assert.equal(game._process_time_with_more || 0, 0);
    assert.equal(game.inventory.includes(jelly), true);
    assert.equal(game.u.uhunger, 1000);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'poisoned by a rotten lump of royal jelly');
});

test('cursed royal jelly rehumanizes a fatally damaged polyself', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.uhp = 1;
    game.u.uhpmax = 6;
    game.u._polyself_form = { name: 'newt' };
    game.u._polyself_base = {
        uhp: 7,
        uhpmax: 12,
        uen: 0,
        uenmax: 0,
        uac: 10,
        ulevel: 1,
        rank: { m: 'Wizard', f: 'Wizard' },
    };
    game.urole = { ...(game.urole || {}), rank: game.urole?.rank || { m: 'Newt', f: 'Newt' } };
    const jelly = simpleFood(31970, 'lump of royal jelly', 'j', { cursed: true });
    game.inventory = [jelly];

    await rhack('e');
    await rhack('j');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!  You feel weak!  You return to human form!');
    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.includes(jelly), false);
    assert.equal(game.u._polyself_form, null);
    assert.equal(game.u._polyself_base, null);
    assert.equal(game.u.uhp, 7);
    assert.equal(game.u.uhpmax, 12);
    assert.equal(game.u.uhunger, 1000);
    assert.equal(game.u.acurr.a[0], 9);
});

test('killer bee eating royal jelly becomes a queen bee after the C delay-one bite', async () => {
    installNonShopFloorState();
    const jelly = simpleFood(31967, 'lump of royal jelly', 'j');
    game.inventory = [jelly];
    game.u._polyself_form = { name: 'killer bee' };
    game.urole = { ...(game.urole || {}), rank: game.urole?.rank || { m: 'Wizard', f: 'Wizard' } };

    await rhack('e');
    await rhack('j');

    assert.equal(game._pending_message, 'This lump of royal jelly is delicious!  You turn into a queen bee!');
    assert.equal(game.inventory.includes(jelly), false);
    assert.equal(game.u.uhunger, 1100);
    assert.equal(game.u._polyself_form?.name, 'queen bee');
    assert.equal(game.u.acurr.a[0], 10);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.polyselfs, 1);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('cursed carried meat ring rots before the one-bite finish', async () => {
    installNonShopFloorState();
    initRng(2);
    const ring = meatRingFood(31962, 'm', { cursed: true });
    game.inventory = [ring];

    await rhack('e');
    await rhack('m');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!');
    assert.equal(game.inventory.includes(ring), false);
    assert.equal(game.u.uhunger, 900);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian, 1);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('floor meat ring uses C delay-one flesh conduct', async () => {
    installNonShopFloorState();
    const ring = meatRingFood(31963);
    delete ring.letter;
    delete ring.line;
    game.level.objects = [ring];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'This meat ring is delicious!');
    assert.equal(game.level.objects.includes(ring), false);
    assert.equal(game.u.uhunger, 905);
    assert.equal(game.u.uconduct?.food, 1);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian, 1);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('carrot clears temporary blindness after the delay-one bite', async () => {
    installNonShopFloorState();
    const carrot = simpleFood(31940, 'carrot', 'c');
    game.inventory = [carrot];
    Object.assign(game.u, {
        blind: true,
        _blindTimeout: 20,
        ucreamed: 0,
        _statusSuffix: ' Blind',
    });

    await rhack('e');
    await rhack('c');

    assert.equal(game._pending_message, 'This carrot is delicious!  You can see again.');
    assert.equal(game.inventory.includes(carrot), false);
    assert.equal(game.u.uhunger, 950);
    assert.equal(game.u.blind, false);
    assert.equal(game.u._blindTimeout, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Blind/);
});

test('garlic scares nearby olfactory monsters after the delay-one bite', async () => {
    installNonShopFloorState();
    const garlic = simpleFood(31941, 'clove of garlic', 'g');
    const nearDog = { mx: 6, my: 5, data: { name: 'dog', mlet: 'd' } };
    const farDog = { mx: 9, my: 5, data: { name: 'dog', mlet: 'd' } };
    const eye = { mx: 5, my: 6, data: { name: 'floating eye', mlet: 'e' } };
    game.inventory = [garlic];
    game.level.monsters = [nearDog, farDog, eye];

    await rhack('e');
    await rhack('g');

    assert.equal(game._pending_message, 'This clove of garlic is delicious!');
    assert.equal(nearDog.mflee, 1);
    assert.equal(nearDog.mfleetim, 0);
    assert.equal(farDog.mflee || 0, 0);
    assert.equal(eye.mflee || 0, 0);
});

test('undead garlic starts vomiting instead of scaring monsters', async () => {
    installNonShopFloorState();
    const garlic = simpleFood(31942, 'clove of garlic', 'g');
    const nearDog = { mx: 6, my: 5, data: { name: 'dog', mlet: 'd' } };
    game.inventory = [garlic];
    game.level.monsters = [nearDog];
    game.u._polyself_form = { name: 'ghost', undead: true };

    await rhack('e');
    await rhack('g');

    assert.equal(game._pending_message, '');
    assert.equal(game.inventory.includes(garlic), false);
    assert.equal(game.u.uhunger, 940);
    assert.equal(game.u._vomitingTimeout, 5);
    assert.equal(game.u.vomiting, true);
    assert.match(game.u._statusSuffix || '', /Vom/);
    assert.equal(nearDog.mflee || 0, 0);
});

test('rotten garlic skips the C garlic prefix effect', async () => {
    installNonShopFloorState();
    initRng(2);
    const garlic = simpleFood(31945, 'clove of garlic', 'g', { cursed: true });
    const nearDog = { mx: 6, my: 5, data: { name: 'dog', mlet: 'd' } };
    game.inventory = [garlic];
    game.level.monsters = [nearDog];
    game.u._polyself_form = { name: 'ghost', undead: true };

    await rhack('e');
    await rhack('g');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!');
    assert.equal(game.u.uhunger, 920);
    assert.equal(game.u._vomitingTimeout || 0, 0);
    assert.equal(nearDog.mflee || 0, 0);
});

test('eucalyptus leaf cures sickness and vomiting when uncursed', async () => {
    installNonShopFloorState();
    const leaf = simpleFood(31943, 'eucalyptus leaf', 'e');
    game.inventory = [leaf];
    Object.assign(game.u, {
        sick: true,
        _sickTimeout: 20,
        vomiting: true,
        _vomitingTimeout: 12,
        _statusSuffix: ' Sick Vom',
    });

    await rhack('e');
    await rhack('e');

    assert.equal(game._pending_message, 'This eucalyptus leaf is delicious!  You feel cured.  What a relief!  You feel much less nauseated now.');
    assert.equal(game.inventory.includes(leaf), false);
    assert.equal(game.u.uhunger, 901);
    assert.equal(game.u.sick, false);
    assert.equal(game.u._sickTimeout, 0);
    assert.equal(game.u.vomiting, false);
    assert.equal(game.u._vomitingTimeout, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Sick|Vom/);
});

test('sprig of wolfsbane cures lycanthropy after the delay-one bite', async () => {
    installNonShopFloorState();
    const sprig = simpleFood(31944, 'sprig of wolfsbane', 'w');
    game.inventory = [sprig];
    Object.assign(game.u, {
        ulycn: 123,
        lycanthrope: true,
    });

    await rhack('e');
    await rhack('w');

    assert.equal(game._pending_message, 'This sprig of wolfsbane is delicious!  You feel purified.');
    assert.equal(game.inventory.includes(sprig), false);
    assert.equal(game.u.uhunger, 940);
    assert.equal(game.u.ulycn, -1);
    assert.equal(game.u.lycanthrope, false);
});

test('recovered choking on one-bite candy bar consumes the food', async () => {
    installCommandShopState();
    game.u.uhunger = 1950;
    const candy = simpleFood(31885, 'candy bar', 'c');
    const amulet = {
        id: 31886,
        letter: 'm',
        cls: 'amulet',
        glyph: '"',
        kind: 'amulet of magical breathing',
        actualKind: 'amulet of magical breathing',
        quan: 1,
        worn: true,
        line: 'm - an amulet of magical breathing (being worn)',
    };
    game.inventory = [candy, amulet];

    await rhack('e');
    await rhack('c');

    assert.equal(game._pending_message, 'This candy bar is delicious!  You stuff yourself and then vomit voluminously.');
    assert.equal(game.inventory.includes(candy), false);
    assert.equal(game.u.uhunger, 1050);
    assert.equal(game.context.move, 2);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_interrupted || 0, 0);
});

test('blind fortune cookie shows unreadable paper instead of a rumor', async () => {
    installNonShopFloorState();
    const cookie = simpleFood(31882, 'fortune cookie', 'f');
    game.inventory = [cookie];
    game.u.blind = true;

    await rhack('e');
    await rhack('f');

    assert.equal(game._pending_message, 'This fortune cookie is delicious!');
    assert.equal(game._message_more, 1);
    assert.equal(game.inventory.includes(cookie), false);
    assert.equal(game._queued_message_after_more, 'This cookie has a scrap of paper inside.');
    assert.equal(game._fortune_cookie_rumor_after_more, 'What a pity that you cannot read it!');
});

test('floor fortune cookie uses the C paper and rumor flow', async () => {
    installNonShopFloorState();
    const cookie = simpleFood(31890, 'fortune cookie');
    delete cookie.letter;
    delete cookie.line;
    game.level.objects = [cookie];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'This fortune cookie is delicious!');
    assert.equal(game._message_more, 1);
    assert.equal(game.level.objects.includes(cookie), false);
    assert.equal(game.u.uhunger, 940);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game._queued_message_after_more, 'This cookie has a scrap of paper inside.  It reads:');
    assert.equal(game._queued_message_more_after_more, 1);
    assert.ok(game._fortune_cookie_rumor_after_more);
});

test('cursed floor apple applies rotten bite then Snow White sleep when not knocked out', async () => {
    installNonShopFloorState();
    initRng(2);
    const apple = simpleFood(31891, 'apple', undefined, { cursed: true });
    delete apple.letter;
    delete apple.line;
    game.level.objects = [apple];

    await rhack('e');
    await rhack('y');

    assert.equal(game.level.objects.includes(apple), false);
    assert.equal(game.u.uhunger, 925);
    assert.match(game._pending_message, /^Blecch!  Rotten food!  You hear sinister laughter as you fall asleep\.\.\.$/);
    assert.ok(game._helpless_time >= 20 && game._helpless_time <= 30);
    assert.equal(game._sleeping_time, game._helpless_time + 1);
    assert.equal(game.context.move, game._helpless_time);
});

test('floor delay-one apple stack consumes one item without occupation', async () => {
    installNonShopFloorState();
    const apples = simpleFood(31892, 'apple', undefined, {
        quan: 2,
        plural: 'apples',
    });
    delete apples.letter;
    delete apples.line;
    game.level.objects = [apples];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'Delicious!  Must be a Macintosh!');
    assert.equal(game.u.uhunger, 950);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game.level.objects.includes(apples), false);
    const rest = game.level.objects.find(obj => obj.kind === 'apple');
    assert.ok(rest);
    assert.equal(rest.quan, 1);
    assert.equal(rest.oeaten || 0, 0);
});

test('shop-floor delay-one food stacks bill the touched unit before immediate finish', async () => {
    const cases = [
        { kind: 'apple', id: 31893, message: 'Delicious!  Must be a Macintosh!', hunger: 950 },
        { kind: 'orange', id: 31951, message: 'This orange is delicious!', hunger: 980 },
        { kind: 'pear', id: 31952, message: 'Core dumped.', hunger: 950 },
        { kind: 'melon', id: 31953, message: 'This melon is delicious!', hunger: 1000 },
        { kind: 'banana', id: 31954, message: 'This banana is delicious!', hunger: 980 },
        { kind: 'carrot', id: 31955, message: 'This carrot is delicious!', hunger: 950 },
        { kind: 'kelp frond', id: 31959, message: 'This kelp frond is delicious!', hunger: 930 },
        { kind: 'sprig of wolfsbane', id: 31956, message: 'This sprig of wolfsbane is delicious!', hunger: 940 },
        { kind: 'clove of garlic', id: 31957, message: 'This clove of garlic is delicious!', hunger: 940 },
        { kind: 'eucalyptus leaf', id: 31958, message: 'This eucalyptus leaf is delicious!', hunger: 901 },
        { kind: 'lump of royal jelly', id: 31968, message: 'This lump of royal jelly is delicious!  You feel strong!', hunger: 1100, conduct: 'unvegan' },
        { kind: 'fortune cookie', id: 31894, message: 'This fortune cookie is delicious!', hunger: 940, more: 1, conduct: 'unvegan' },
        { kind: 'cream pie', id: 31895, message: 'This cream pie is delicious!', hunger: 1000, conduct: 'unvegan' },
        { kind: 'candy bar', id: 31896, message: 'This candy bar is delicious!', hunger: 1000, conduct: 'unvegan' },
        { kind: 'K-ration', id: 31897, message: 'This K-ration is bland.', hunger: 1300 },
        { kind: 'C-ration', id: 31898, message: 'This C-ration is bland.', hunger: 1200 },
    ];

    for (const entry of cases) {
        const { shkp } = installCommandShopState();
        const plurals = {
            apple: 'apples',
            'fortune cookie': 'fortune cookies',
            'cream pie': 'cream pies',
            'candy bar': 'candy bars',
            'K-ration': 'K-rations',
            'C-ration': 'C-rations',
            orange: 'oranges',
            pear: 'pears',
            melon: 'melons',
            banana: 'bananas',
            carrot: 'carrots',
            'kelp frond': 'kelp fronds',
            'sprig of wolfsbane': 'sprigs of wolfsbane',
            'clove of garlic': 'cloves of garlic',
            'eucalyptus leaf': 'eucalyptus leaves',
            'lump of royal jelly': 'lumps of royal jelly',
        };
        const stack = simpleFood(entry.id, entry.kind, undefined, {
            quan: 2,
            plural: plurals[entry.kind],
        });
        delete stack.letter;
        delete stack.line;
        game.level.objects = [stack];
        const expected = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);

        await rhack('e');
        await rhack('y');

        assert.equal(game._pending_message, entry.message, entry.kind);
        assert.equal(game._message_more || false, entry.more || false, entry.kind);
        assert.equal(game.u.uhunger, entry.hunger, entry.kind);
        assert.equal(game.level.objects.includes(stack), false, entry.kind);
        const rest = game.level.objects.find(obj => obj.kind === entry.kind);
        assert.ok(rest, entry.kind);
        assert.equal(rest.quan, 1, entry.kind);
        assert.equal(rest.no_charge || false, false, entry.kind);
        if (entry.conduct) assert.equal(game.u.uconduct?.[entry.conduct], 1, entry.kind);
        const bite = shop.shopBillEntryForObject(shkp, stack);
        assert.ok(bite, entry.kind);
        assert.equal(bite.useup, true, entry.kind);
        assert.equal(shop.shopBillEntryTotal(bite), expected, entry.kind);
        assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
    }
});

test('shop-floor current fruit slime mold stack bills the touched unit before immediate finish', async () => {
    const { shkp } = installCommandShopState();
    setCurrentFruitName('durian');
    const stack = slimeMoldFood(31960, undefined, 'durian', currentFruitId(), {
        quan: 2,
        plural: 'durians',
    });
    delete stack.letter;
    delete stack.line;
    game.level.objects = [stack];
    const expected = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'My, this is a yummy durian!');
    assert.equal(game.u.uhunger, 1150);
    assert.equal(game.level.objects.includes(stack), false);
    const rest = game.level.objects.find(obj => obj.actualKind === 'slime mold' && obj.spe === currentFruitId());
    assert.ok(rest);
    assert.equal(rest.quan, 1);
    assert.equal(rest.no_charge || false, false);
    const bite = shop.shopBillEntryForObject(shkp, stack);
    assert.ok(bite);
    assert.equal(bite.useup, true);
    assert.equal(shop.shopBillEntryTotal(bite), expected);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('shop-floor meat ring bills the bite before immediate finish', async () => {
    const { shkp } = installCommandShopState();
    const ring = meatRingFood(31964);
    delete ring.letter;
    delete ring.line;
    game.level.objects = [ring];
    const expected = shop.shopItemPrice(ring, 5, 5);

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'This meat ring is delicious!');
    assert.equal(game.u.uhunger, 905);
    assert.equal(game.level.objects.includes(ring), false);
    assert.equal(game.u.uconduct?.unvegan, 1);
    assert.equal(game.u.uconduct?.unvegetarian, 1);
    assertUsedUpBillForObject(shkp, ring, expected);
    assert.equal(game._eating_turns_remaining || 0, 0);
});

test('floor delayed ordinary foods use C bite timing and finish removal', async () => {
    const cases = [
        { kind: 'food ration', firstOeaten: 640, firstHunger: 1060, turns: 5, bite: 160, finalHunger: 1700, message: '', finish: "You're finally finished." },
        { kind: 'pancake', firstOeaten: 100, firstHunger: 1000, turns: 2, bite: 100, finalHunger: 1100, message: 'This pancake is delicious!', conduct: 'unvegan' },
        { kind: 'lembas wafer', firstOeaten: 400, firstHunger: 1300, turns: 2, bite: 400, finalHunger: 1700, message: 'This lembas wafer is delicious!', finish: "You're finally finished." },
        { kind: 'cram ration', firstOeaten: 400, firstHunger: 1100, turns: 3, bite: 200, finalHunger: 1500, message: 'This cram ration is bland.', finish: "You're finally finished." },
        { kind: 'tripe ration', firstOeaten: 100, firstHunger: 1000, turns: 2, bite: 100, finalHunger: 1100, message: 'Yak - dog food!', conduct: 'unvegan', vegetarianConduct: true, experience: 1 },
    ];

    for (const entry of cases) {
        installNonShopFloorState();
        const food = simpleFood(3190 + cases.indexOf(entry), entry.kind);
        delete food.letter;
        delete food.line;
        game.level.objects = [food];

        await rhack('e');
        await rhack('y');

        assert.equal(game._pending_message, entry.message, entry.kind);
        assert.equal(game.level.objects.includes(food), true, entry.kind);
        assert.equal(food.oeaten, entry.firstOeaten, entry.kind);
        assert.equal(game.u.uhunger, entry.firstHunger, entry.kind);
        assert.equal(game._eating_turns_remaining, entry.turns, entry.kind);
        assert.equal(game._eating_floor_object, food, entry.kind);
        assert.equal(game._eating_bite_nutrition, entry.bite, entry.kind);
        assert.equal(game._eating_bite_hunger, entry.bite, entry.kind);
        if (entry.conduct) assert.equal(game.u.uconduct?.[entry.conduct], 1, entry.kind);
        if (entry.vegetarianConduct) assert.equal(game.u.uconduct?.unvegetarian, 1, entry.kind);
        if (entry.experience) assert.equal(game.u.uexp, entry.experience, entry.kind);

        finishEatingOccupation();

        assert.equal(game.level.objects.includes(food), false, entry.kind);
        assert.equal(game.u.uhunger, entry.finalHunger, entry.kind);
        assert.equal(game._eating_turns_remaining || 0, 0, entry.kind);
        assert.equal(game._eating_floor_object, null, entry.kind);
        assert.equal(game._eating_bite_hunger || 0, 0, entry.kind);
        if (entry.finish) assert.equal(game._pending_message, entry.finish, entry.kind);
        else assert.match(game._pending_message || '', new RegExp(`You finish eating the ${entry.kind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`), entry.kind);
    }
});

test('interrupted floor food ration resumes and removes same floor unit', async () => {
    installNonShopFloorState();
    const ration = foodRation(31901);
    delete ration.letter;
    delete ration.line;
    game.level.objects = [ration];

    await rhack('e');
    await rhack('y');
    processEatingOccupationTick(game);
    interruptEatingOccupation(game);

    assert.equal(game._pending_message, 'You stop eating the partly eaten food ration.');
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(ration.oeaten, 480);
    assert.equal(game.u.uhunger, 1220);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_floor_object, ration);
    assert.equal(game._eating_interrupted, 1);
    assert.equal(game._eating_paused_turns_remaining, 4);

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'You resume your meal.');
    assert.equal(ration.oeaten, 320);
    assert.equal(game.u.uhunger, 1380);
    assert.equal(game._eating_turns_remaining, 3);
    assert.equal(game._eating_floor_object, ration);
    assert.equal(game._eating_interrupted || 0, 0);

    finishEatingOccupation();

    assert.equal(game.level.objects.includes(ration), false);
    assert.equal(game.u.uhunger, 1700);
    assert.equal(game._eating_floor_object, null);
    assert.equal(game._pending_message, "You're finally finished.");
});

test('floor delayed foods use C race-adjusted hunger before victual ticks', async () => {
    const cases = [
        { race: 'orc', kind: 'lembas wafer', firstOeaten: 400, firstHunger: 1200, turns: 2, bite: 400, biteHunger: 300, finalHunger: 1500, message: '!#?&* elf kibble!' },
        { race: 'elf', kind: 'lembas wafer', firstOeaten: 400, firstHunger: 1400, turns: 2, bite: 400, biteHunger: 500, finalHunger: 1900, message: 'A little goes a long way.' },
        { race: 'dwarf', kind: 'cram ration', firstOeaten: 400, firstHunger: 1133, turns: 3, bite: 200, biteHunger: 233, finalHunger: 1599, message: 'This cram ration is bland.' },
    ];

    for (const entry of cases) {
        installNonShopFloorState();
        game._startup_race = entry.race;
        game.urace = { noun: entry.race };
        const food = simpleFood(3198 + cases.indexOf(entry), entry.kind);
        delete food.letter;
        delete food.line;
        game.level.objects = [food];

        await rhack('e');
        await rhack('y');

        assert.equal(game._pending_message, entry.message, entry.race);
        assert.equal(food.oeaten, entry.firstOeaten, entry.race);
        assert.equal(game.u.uhunger, entry.firstHunger, entry.race);
        assert.equal(game._eating_turns_remaining, entry.turns, entry.race);
        assert.equal(game._eating_bite_nutrition, entry.bite, entry.race);
        assert.equal(game._eating_bite_hunger, entry.biteHunger, entry.race);

        finishEatingOccupation();

        assert.equal(game.level.objects.includes(food), false, entry.race);
        assert.equal(game.u.uhunger, entry.finalHunger, entry.race);
    }
});

test('floor cursed delayed food halves before C bites and then finishes', async () => {
    installNonShopFloorState();
    initRng(2);
    const ration = foodRation(3195);
    delete ration.letter;
    delete ration.line;
    ration.cursed = true;
    game.level.objects = [ration];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!');
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(ration.oeaten, 267);
    assert.equal(game.u.uhunger, 1033);
    assert.equal(game._eating_turns_remaining, 3);
    assert.equal(game._eating_floor_object, ration);

    acknowledgeMoreForOccupation();
    finishEatingOccupation();

    assert.equal(game.level.objects.includes(ration), false);
    assert.equal(game.u.uhunger, 1299);
    assert.match(game._pending_message || '', /You finish eating the food ration\./);
});

test('floor rotten delayed food sleep leaves the halved meal on the floor', async () => {
    installNonShopFloorState();
    const ration = foodRation(3196);
    delete ration.letter;
    delete ration.line;
    ration.cursed = true;
    game.level.objects = [ration];

    await rhack('e');
    await rhack('y');

    assert.equal(game._pending_message, 'Blecch!  Rotten food!  The world spins and goes dark.');
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(ration.oeaten, 400);
    assert.equal(ration.orotten, true);
    assert.equal(game.u.uhunger, 900);
    assert.equal(game._eating_turns_remaining || 0, 0);
    assert.equal(game._eating_floor_object || null, null);
    assert.ok(game.context.move > 1);
});

test('floor delayed shop stack bills touched unit before C bites', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRation(3197);
    Object.assign(stack, {
        quan: 2,
        plural: 'food rations',
    });
    delete stack.letter;
    delete stack.line;
    game.level.objects = [stack];
    const expected = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 5);

    await rhack('e');
    await rhack('y');

    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 1);
    assert.equal(stack.oeaten, 640);
    assert.equal(stack.no_charge, true);
    const rest = game.level.objects.find(obj => obj !== stack && obj.kind === 'food ration');
    assert.ok(rest);
    assert.equal(rest.quan, 1);
    assert.notEqual(rest.no_charge, true);
    const bite = shop.shopBillEntryForObject(shkp, stack);
    assert.ok(bite);
    assert.equal(bite.useup, true);
    assert.equal(shop.shopBillEntryTotal(bite), expected);

    finishEatingOccupation();

    assert.equal(game.level.objects.includes(stack), false);
    assert.equal(game.level.objects.includes(rest), true);
    assert.equal(rest.quan, 1);
    assert.equal(rest.no_charge || false, false);
    assert.equal(game.u.uhunger, 1700);
    assert.equal(game._eating_floor_object, null);
    assert.equal(shop.shopBillEntryTotal(bite), expected);
});

test('shop pickup merge rejects unpaid into paid and combines compatible unpaid bills', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(4001, 'b');
    const paidStack = foodRation(4002, 'a');

    assert.deepEqual(
        shop.mergePickedObjectIntoShopBill(floorObj, paidStack, 45),
        { canMerge: false, price: 45, billEntry: null },
    );
    assert.equal(paidStack.unpaid, undefined);
    assert.equal(shkp.billct, 0);

    const unpaidStack = foodRation(4003, 'c');
    shop.addObjectToShopBill(shkp, unpaidStack, 45);
    const result = shop.mergePickedObjectIntoShopBill(floorObj, unpaidStack, 45);

    assert.equal(result.canMerge, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, unpaidStack), result.billEntry);
    assert.equal(result.billEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(result.billEntry), 90);
    assert.equal(unpaidStack.unpaidPrice, 90);
});

test('shop pickup merge rejects stale unpaid targets without a current bill row', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(4004, 'b');
    const staleStack = foodRation(4005, 'a');
    staleStack.unpaid = true;
    staleStack.unpaidPrice = 45;

    const result = shop.mergePickedObjectIntoShopBill(floorObj, staleStack, 45);

    assert.equal(result.canMerge, false);
    assert.equal(result.billEntry, null);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, staleStack), null);
    assert.equal(staleStack.unpaid, true);
    assert.equal(staleStack.unpaidPrice, 45);
});

test('container takeout bill merge requires a same-shop target bill row', () => {
    const { shkp } = installShopState();
    const source = foodRation(4006, 'b');
    const staleTarget = foodRation(4007, 'a');
    staleTarget.unpaid = true;
    staleTarget.unpaidPrice = 45;
    const billing = { shkp, price: 45, sourceWillBeUnpaid: true };

    assert.equal(shop.containerTakeoutBillMergeCompatible(source, staleTarget, billing), false);

    shop.addObjectToShopBill(shkp, staleTarget, 45);

    assert.equal(shop.containerTakeoutBillMergeCompatible(source, staleTarget, billing), true);
});

test('floor food pickup preflight rejects billable source before target bill lookup', () => {
    const { shkp } = installShopState();
    const source = foodRation(4008);
    const staleTarget = foodRation(4009, 'a');
    staleTarget.unpaid = true;
    staleTarget.unpaidPrice = 45;
    game.inventory = [staleTarget];

    assert.equal(shop.findFloorPickupFoodMergeTargetForPreflight(source, 45), null);

    shop.addObjectToShopBill(shkp, staleTarget, 45);

    assert.equal(shop.findFloorPickupFoodMergeTargetForPreflight(source, 45), null);
});

test('dummy alteration billing ignores stale unpaid objects without a bill row', () => {
    const { shkp } = installShopState();
    const stalePie = creamPie(4010, 'p');
    stalePie.unpaid = true;
    stalePie.unpaidPrice = 10;

    assert.equal(shop.billDummyAlteredCarriedObjectForTest(stalePie), false);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.equal(stalePie.unpaid, true);
    assert.equal(stalePie.unpaidPrice, 10);

    shop.addObjectToShopBill(shkp, stalePie, 10);

    assert.equal(shop.billDummyAlteredCarriedObjectForTest(stalePie), true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 10);
    assert.equal(stalePie.unpaid, false);
    assert.equal((game._usedUpShopBills || []).length, 1);
});

test('used-up preservation ignores stale unpaid objects without a bill row', () => {
    const { shkp } = installShopState();
    const staleRation = foodRation(4011, 'a');
    staleRation.unpaid = true;
    staleRation.unpaidPrice = 45;

    assert.equal(shop.markObjectShopBillUsedUpForTest(staleRation, shkp), false);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
    assert.equal(staleRation.unpaid, true);
    assert.equal(staleRation.unpaidPrice, 45);

    shop.addObjectToShopBill(shkp, staleRation, 45);

    assert.equal(shop.markObjectShopBillUsedUpForTest(staleRation, shkp), true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 45);
    assert.equal(staleRation.unpaid, false);
    assert.equal((game._usedUpShopBills || []).length, 1);
});

test('unpaid usage ignores stale charged tools without a current bill row', () => {
    const { shkp } = installShopState();
    const staleBag = chargedTool(4012, 'bag of tricks', 'b', 3);
    staleBag.unpaid = true;
    staleBag.unpaidPrice = 100;
    game.inventory = [staleBag];
    const messages = [];

    assert.equal(shop.checkUnpaidUsageForTest(staleBag, messages), 0);
    assert.equal(shkp.debit || 0, 0);
    assert.deepEqual(messages, []);
    assert.equal(shkp.billct, 0);

    const bill = shop.addObjectToShopBill(shkp, staleBag, 100);
    const billedMessages = [];
    const expectedFee = Math.trunc(shop.shopItemPrice(staleBag, 5, 5) / 5);

    assert.equal(shop.checkUnpaidUsageForTest(staleBag, billedMessages), expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shop.shopBillEntryForObject(shkp, staleBag), bill);
    assert.equal(shop.shopBillEntryTotal(bill), 100);
    assert.equal(billedMessages.length, 1);
    assert.match(billedMessages[0], new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('unpaid charged tool usage prices from current shop cost instead of stored bill total', () => {
    const { shkp } = installShopState();
    const bag = chargedTool(4014, 'bag of tricks', 'b', 3);
    game.inventory = [bag];
    const currentPrice = shop.shopItemPrice(bag, 5, 5);
    assert.equal(currentPrice, 133);
    shop.addObjectToShopBill(shkp, bag, 25);
    const messages = [];
    const expectedFee = Math.trunc(currentPrice / 5);

    const fee = shop.checkUnpaidUsageForTest(bag, messages);

    assert.equal(fee, expectedFee);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(bag.unpaidPrice, 25);
    assert.match(messages[0], new RegExp(`Usage fee, ${expectedFee} zorkmids`));
});

test('payable debts ignore stale unpaid field rows for selected shopkeeper', () => {
    const { shkp } = installShopState();
    const staleRation = foodRation(4013, 'a');
    staleRation.unpaid = true;
    staleRation.unpaidPrice = 45;
    game.inventory = [staleRation];

    assert.deepEqual(shop.collectPayableShopDebts(shkp), []);

    const bill = shop.addObjectToShopBill(shkp, staleRation, 45);
    const debts = shop.collectPayableShopDebts(shkp);

    assert.equal(debts.length, 1);
    assert.equal(debts[0].billEntry, bill);
    assert.equal(debts[0].billPortion, 'intact');
    assert.equal(debts[0].price, 45);
});

test('corpse timer used-up tracking ignores stale unpaid fields without bill rows', async () => {
    const { shkp } = installShopState();
    game.moves = 10;
    const corpse = {
        ...foodRation(4015, 'c'),
        otyp: 'corpse',
        kind: 'newt corpse',
        actualKind: 'newt corpse',
        line: 'c - a newt corpse',
        rotAwayTurn: 10,
        unpaid: true,
        unpaidPrice: 45,
    };
    game.inventory = [corpse];

    await processCorpseTimers(game);

    assert.equal(game.inventory.includes(corpse), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('corpse timer preserves a real bill row as used-up', async () => {
    const { shkp } = installShopState();
    game.moves = 10;
    const corpse = {
        ...foodRation(4016, 'c'),
        otyp: 'corpse',
        kind: 'newt corpse',
        actualKind: 'newt corpse',
        line: 'c - a newt corpse',
        rotAwayTurn: 10,
    };
    shop.addObjectToShopBill(shkp, corpse, 45);
    game.inventory = [corpse];

    await processCorpseTimers(game);

    assert.equal(game.inventory.includes(corpse), false);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, corpse);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(corpse.id)), true);
});

test('glob shrink used-up tracking ignores stale unpaid fields without bill rows', () => {
    const { shkp } = installShopState();
    game.moves = 20;
    const glob = {
        id: 4017,
        cls: 'food',
        otyp: 'glob',
        glyph: '%',
        kind: 'glob of gray ooze',
        actualKind: 'glob of gray ooze',
        globName: 'glob of gray ooze',
        globby: true,
        owt: 1,
        globShrinkTurn: 20,
        line: 'g - a glob of gray ooze',
        unpaid: true,
        unpaidPrice: 45,
    };
    game.inventory = [glob];

    processGlobShrinkTimers(game);

    assert.equal(game.inventory.includes(glob), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('glob shrink preserves a real bill row as used-up', () => {
    const { shkp } = installShopState();
    game.moves = 20;
    const glob = {
        id: 4018,
        cls: 'food',
        otyp: 'glob',
        glyph: '%',
        kind: 'glob of gray ooze',
        actualKind: 'glob of gray ooze',
        globName: 'glob of gray ooze',
        globby: true,
        owt: 1,
        globShrinkTurn: 20,
        line: 'g - a glob of gray ooze',
    };
    shop.addObjectToShopBill(shkp, glob, 45);
    game.inventory = [glob];

    processGlobShrinkTimers(game);

    assert.equal(game.inventory.includes(glob), false);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, glob);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(glob.id)), true);
});

test('paid saleable shop drop computes C-style sale offer and transfers cash on accept', () => {
    const { shkp } = installShopState();
    const dropped = dagger(5001);
    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(shop.shopSaleableObject(shkp, dropped), true);
    assert.equal(shop.shopSaleOffer(dropped, shkp), 2);
    assert.equal(sale.prompt, true);
    assert.equal(sale.offer, 2);

    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, /receive 2 gold pieces/);
    assert.equal(shkp.minvent[0].quan, 98);
    assert.equal(shop.shopkeeperCash(shkp), 98);
    assert.equal(game._goldCount, 2);
    assert.equal(dropped.no_charge, undefined);
});

test('declining a paid shop sale marks the floor object no-charge', () => {
    installShopState();
    const dropped = dagger(5002);
    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);
    const message = shop.finishDroppedObjectSale({ ...sale, declineMessage: 'You drop a dagger.' }, false);

    assert.equal(message, 'You drop a dagger.');
    assert.equal(dropped.no_charge, true);
    assert.equal(game._goldCount, 0);
});

test('cashless shopkeeper offers sale credit without changing hero gold', () => {
    const { shkp } = installShopState();
    shkp.minvent = [];
    const dropped = dagger(5003);
    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.credit, true);
    assert.equal(sale.offer, 1);
    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, /1 zorkmid in credit/);
    assert.equal(shkp.credit, 1);
    assert.equal(game._goldCount, 0);
    assert.equal(dropped.no_charge, undefined);
});

test('angry shopkeeper keeps a paid non-gold drop without sale prompt', () => {
    const { shkp } = installShopState();
    shkp.angry = true;
    const dropped = dagger(5004);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.angry, true);
    assert.match(sale.message, /smirks/);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.notEqual(dropped.no_charge, true);
});

test('robbed shopkeeper treats a paid non-gold drop as restock contribution', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    const dropped = dagger(5005);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.robbed, true);
    assert.equal(sale.robbedContribution, shop.shopSaleOffer(dropped, shkp));
    assert.match(sale.message, /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.notEqual(dropped.no_charge, true);
});

test('paid unsaleable shop drop is kept without a sale prompt', () => {
    const { shkp } = installShopState();
    makeCandleShop(shkp);
    const dropped = blankScroll(5006);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.match(sale.message, /Izchak seems uninterested\./);
    assert.equal(dropped.no_charge, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.billct, 0);
});

test('Izchak refuses the candelabrum with special-stock dialogue before invocation', () => {
    const { shkp } = installShopState();
    makeCandleShop(shkp);
    game.u.uevent = {};
    const dropped = candelabrum(5007, 'c', 3);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.match(sale.message, /hang onto that/);
    assert.match(sale.message, /4 more candles/);
    assert.doesNotMatch(sale.message, /uninterested/);
    assert.equal(dropped.no_charge, true);
    assert.equal(game._goldCount, 0);
});

test('candelabrum special stock refusal changes after invocation', () => {
    const { shkp } = installShopState();
    makeCandleShop(shkp);
    game.u.uevent = { invoked: 1 };
    const dropped = candelabrum(5008);

    const sale = shop.shopDroppedPaidObjectSaleInfo(dropped, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.match(sale.message, /won't stock that/);
    assert.doesNotMatch(sale.message, /uninterested/);
    assert.equal(dropped.no_charge, true);
});

test('dropping gold in a shop partially pays shop debt', () => {
    const { shkp } = installShopState();
    shkp.debit = 10;
    shkp.loan = 10;
    shkp.credit = 3;

    const result = shop.sellobjDroppedGoldAt(5, 5, 4);

    assert.equal(result.donated, 4);
    assert.deepEqual(result.messages, ['Your debt is partially paid off.']);
    assert.equal(shkp.debit, 6);
    assert.equal(shkp.loan, 6);
    assert.equal(shkp.credit, 3);
});

test('dropping gold in a shop pays debt before adding credit', () => {
    const { shkp } = installShopState();
    shkp.debit = 7;
    shkp.loan = 7;
    shkp.credit = 2;

    const result = shop.sellobjDroppedGoldAt(5, 5, 12);

    assert.equal(result.donated, 12);
    assert.deepEqual(result.messages, [
        'Your debt is paid off.',
        '5 zorkmids added to your credit; total is now 7 zorkmids.',
    ]);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 7);
});

test('dropping gold in a shop establishes or adds credit without changing shopkeeper cash', () => {
    const { shkp } = installShopState();

    const established = shop.sellobjDroppedGoldAt(5, 5, 8);

    assert.deepEqual(established.messages, ['You have established 8 zorkmids credit.']);
    assert.equal(shkp.credit, 8);
    assert.equal(shop.shopkeeperCash(shkp), 100);

    const added = shop.sellobjDroppedGoldAt(5, 5, 3);

    assert.deepEqual(added.messages, ['3 zorkmids added to your credit; total is now 11 zorkmids.']);
    assert.equal(shkp.credit, 11);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('dropping gold outside a shop does not affect shop debt or credit', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    shkp.debit = 4;
    shkp.loan = 4;

    const result = shop.sellobjDroppedGoldAt(9, 5, 12);

    assert.equal(result.donated, 0);
    assert.deepEqual(result.messages, []);
    assert.equal(shkp.debit, 4);
    assert.equal(shkp.loan, 4);
    assert.equal(shkp.credit || 0, 0);
});

test('dropping gold for angry or robbed shopkeepers does not create credit', () => {
    const { shkp } = installShopState();
    shkp.angry = true;

    const angry = shop.sellobjDroppedGoldAt(5, 5, 6);

    assert.equal(angry.angry, true);
    assert.match(angry.messages.join(' '), /smirks/);
    assert.equal(shkp.credit || 0, 0);

    shkp.angry = false;
    shkp.robbed = 20;
    const robbed = shop.sellobjDroppedGoldAt(5, 5, 6);

    assert.equal(robbed.robbedContribution, 6);
    assert.match(robbed.messages.join(' '), /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.credit || 0, 0);
});

test('picking up shop-floor gold consumes shop credit before adding carried gold', () => {
    const { shkp } = installShopState();
    shkp.credit = 10;
    const gold = { cls: 'coin', otyp: 466, glyph: '$', ox: 5, oy: 5, quan: 4 };
    game.level.objects = [gold];

    const result = shop.pickUpFloorGoldObject(gold);

    assert.equal(result.picked, true);
    assert.deepEqual(result.messages, [
        '$ - 4 gold pieces.',
        'Your credit is reduced by 4 zorkmids.',
    ]);
    assert.equal(game._goldCount, 4);
    assert.equal(game.inventory[0].quan, 4);
    assert.equal(game.level.objects.includes(gold), false);
    assert.equal(shkp.credit, 6);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.loan || 0, 0);
});

test('picking up shop-floor gold erases credit then increases debt', () => {
    const { shkp } = installShopState();
    shkp.credit = 3;
    shkp.debit = 2;
    shkp.loan = 2;
    const gold = { cls: 'coin', otyp: 466, glyph: '$', ox: 5, oy: 5, quan: 8 };
    game.level.objects = [gold];

    const result = shop.pickUpFloorGoldObject(gold);

    assert.deepEqual(result.messages, [
        '$ - 8 gold pieces.',
        'Your credit is erased.',
        'Your debt increases by 5 zorkmids.',
    ]);
    assert.equal(game._goldCount, 8);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
});

test('picking up shop-floor gold creates debt when no credit exists', () => {
    const { shkp } = installShopState();
    const gold = { cls: 'coin', otyp: 466, glyph: '$', ox: 5, oy: 5, quan: 6 };
    game.level.objects = [gold];

    const result = shop.pickUpFloorGoldObject(gold);

    assert.deepEqual(result.messages, [
        '$ - 6 gold pieces.',
        'You owe Izchak 6 zorkmids.',
    ]);
    assert.equal(game._goldCount, 6);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 6);
    assert.equal(shkp.loan, 6);
});

test('dropping a paid container in a shop can sell saleable contents', () => {
    const { shkp } = installShopState();
    const bag = sack(5104, 'b');
    const blade = putObjectInContainer(bag, dagger(5105));
    bag.ox = 5;
    bag.oy = 5;
    game._goldCount = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    const expectedOffer = shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp);

    assert.equal(sale.kind, 'drop');
    assert.equal(sale.prompt, true);
    assert.equal(sale.containerSale, true);
    assert.equal(sale.topOffer, shop.shopSaleOffer(bag, shkp));
    assert.equal(sale.contentOffer, shop.shopSaleOffer(blade, shkp));
    assert.equal(sale.contentSaleCount, 1);
    assert.equal(sale.offer, expectedOffer);
    assert.match(sale.promptMessage, /bag and its contents/);
    assert.match(sale.promptMessage, /Sell them/);

    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, new RegExp(`receive ${expectedOffer} gold pieces?`));
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.equal(game._goldCount, 5 + expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), 100 - expectedOffer);
    assert.equal(shkp.billct, 0);
});

test('declining a dropped container sale marks owned contents no-charge', () => {
    const { shkp } = installShopState();
    const bag = sack(5106, 'b');
    const blade = putObjectInContainer(bag, dagger(5107));
    bag.ox = 5;
    bag.oy = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    const message = shop.finishDroppedObjectSale({ ...sale, declineMessage: 'You drop a sack.' }, false);

    assert.equal(message, 'You drop a sack.');
    assert.equal(bag.no_charge, true);
    assert.equal(blade.no_charge, true);
    assert.equal(shkp.billct, 0);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('cashless shopkeeper offers credit for dropped container contents', () => {
    const { shkp } = installShopState();
    shkp.minvent = [];
    const bag = sack(5108, 'b');
    const blade = putObjectInContainer(bag, dagger(5109));
    bag.ox = 5;
    bag.oy = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    const baseOffer = shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp);
    const expectedCredit = Math.trunc((baseOffer * 9) / 10) + (baseOffer <= 1 ? 1 : 0);

    assert.equal(sale.prompt, true);
    assert.equal(sale.credit, true);
    assert.equal(sale.offer, expectedCredit);
    assert.match(sale.promptMessage, /credit for your bag and its contents/);

    const message = shop.finishDroppedObjectSale(sale, true);

    assert.match(message, /credit/);
    assert.equal(shkp.credit, expectedCredit);
    assert.equal(game._goldCount, 0);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
});

test('dropped container sale donates contained gold before selling the rest', () => {
    const { shkp } = installShopState();
    const bag = sack(5110, 'b');
    const coins = putObjectInContainer(bag, goldPieces(5111, 9));
    const blade = putObjectInContainer(bag, dagger(5112));
    bag.ox = 5;
    bag.oy = 5;
    shkp.credit = 1;
    shkp.debit = 5;
    shkp.loan = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);

    assert.equal(sale.prompt, true);
    assert.equal(sale.contentOffer, shop.shopSaleOffer(blade, shkp));
    assert.equal(sale.offer, shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp));
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 5);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);

    shop.finishDroppedObjectSale(sale, false);
    assert.equal(blade.no_charge, true);
});

test('dropped container sale removes unpaid contained bill rows on decline', () => {
    const { shkp } = installShopState();
    const bag = sack(5113, 'b');
    const ration = putObjectInContainer(bag, foodRation(5114));
    bag.ox = 5;
    bag.oy = 5;
    shop.addObjectToShopBill(shkp, ration, 45);
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    assert.equal(sale.contentOffer, 0);
    const result = shop.finishDroppedObjectSale(sale, false);

    assert.match(result, /drop/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(bag.no_charge, true);
});

test('ordinary carried-container drop does not run hard-landing impact', async () => {
    installCommandShopState();
    initRng(1);
    const bag = sack(5118, 'b');
    const potion = putObjectInContainer(bag, oilPotion(5119));
    game.inventory = [bag];

    await rhack('d');
    await rhack('b');

    const dropped = game.level.objects.find(obj => obj.kind === 'sack');
    assert.ok(dropped);
    assert.equal(dropped.contents.includes(potion), true);
    assert.equal(dropped.cknown, true);
});

test('ordinary unpaid carried drop into lava preserves a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: LAVAPOOL });
    const ration = foodRation(51202, 'a');
    game.inventory = [ration];
    shop.addObjectToShopBill(shkp, ration, 45);

    await rhack('d');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === ration.id), false);
    assert.equal(ration.unpaid, false);
    assert.equal(shkp.debit || 0, 0);
    assertUsedUpBillForObject(shkp, ration, 45);
});

test('ordinary unpaid carried acid potion drop into water preserves a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: POOL });
    const potion = acidPotion(51203, 'a');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 75);

    await rhack('d');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
    assert.equal(potion.unpaid, false);
    assert.match(game._pending_message, /potion explodes/);
    assertUsedUpBillForObject(shkp, potion, 75);
});

test('ordinary unpaid carried potion shattering on hot ground preserves a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    initRng(4);
    game.level.flags = { temperature: 1 };
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const potion = healingPotion(51204, 'h');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 80);

    await rhack('d');
    await rhack('h');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
    assert.equal(potion.unpaid, false);
    assert.match(game._pending_message, /shattering noise|shatters from the heat/);
    assertUsedUpBillForObject(shkp, potion, 80);
});

test('unpaid carried object falling through a hole converts bill row to shop debt', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    const blade = dagger(51201, 'd');
    shop.addObjectToShopBill(shkp, blade, 15);
    const messages = [];

    const consumed = earthFloorEffects(blade, 5, 5, messages, 'drop');

    assert.equal(consumed, true);
    assert.match(messages.join(' '), /owe Izchak 15 zorkmids? for it/);
    assert.equal(queuedImpactDropsFor().includes(blade), true);
    assert.equal(shkp.debit, 15);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.unpaid, false);
    assert.equal(blade.no_charge, false);
});

test('fragile carried object falling through a hole breaks before migration queue', async () => {
    installNonShopFloorState();
    installSeenHoleAtHero();
    initRng(1);
    const potion = oilPotion(512011, 'o');
    game.inventory = [potion];

    await rhack('d');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
    assert.equal(queuedImpactDropsFor().some(obj => obj.id === potion.id), false);
    assert.match(game._pending_message, /You hear a muffled crash\./);
});

test('unpaid fragile carried object falling through a hole charges before breaking', async () => {
    const { shkp } = installCommandShopState();
    installSeenHoleAtHero();
    initRng(1);
    const potion = oilPotion(512012, 'o');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 60);

    await rhack('d');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
    assert.equal(queuedImpactDropsFor().some(obj => obj.id === potion.id), false);
    assert.match(game._pending_message, /owe Izchak 60 zorkmids? for it/);
    assert.match(game._pending_message, /You hear a muffled crash\./);
    assert.equal(shkp.debit, 60);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, potion), null);
});

test('shop-floor stock falling through a hole charges stolen value before migration', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    const blade = { ...dagger(51202), letter: undefined, line: undefined, ox: 5, oy: 5 };
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [blade];

    const impact = shop.impactDropFloorObjects(5, 5, game.level.traps[0], { targetLevel: { dnum: 0, dlevel: 2 } });

    assert.match(impact.message, new RegExp(`owe Izchak ${expected} zorkmids? for goods lost`));
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(queuedImpactDropsFor().includes(blade), true);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
    assert.equal(blade.no_charge, false);
});

test('shop-floor fragile stock falling through a hole migrates without ship-object breakage', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    const potion = { ...oilPotion(512022), letter: undefined, line: undefined, ox: 5, oy: 5 };
    const expected = shop.shopItemPrice(potion, 5, 5);
    game.level.objects = [potion];

    const impact = shop.impactDropFloorObjects(5, 5, game.level.traps[0], { targetLevel: { dnum: 0, dlevel: 2 } });

    assert.match(impact.message, new RegExp(`owe Izchak ${expected} zorkmids? for goods lost`));
    assert.doesNotMatch(impact.message, /muffled/);
    assert.equal(game.level.objects.includes(potion), false);
    assert.equal(queuedImpactDropsFor().includes(potion), true);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
});

test('shop-floor stock falling through a hole routes angry shopkeeper value to robbed', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    shkp.angry = true;
    const blade = { ...dagger(512021), letter: undefined, line: undefined, ox: 5, oy: 5 };
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [blade];

    shop.impactDropFloorObjects(5, 5, game.level.traps[0], { targetLevel: { dnum: 0, dlevel: 2 } });

    assert.equal(shkp.robbed, expected);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(queuedImpactDropsFor().includes(blade), true);
    assert.equal(blade.no_charge, false);
});

test('shop-floor container falling through a hole charges contents and clears no-charge', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    const bag = sack(51203);
    bag.ox = 5;
    bag.oy = 5;
    bag.no_charge = true;
    const blade = putObjectInContainer(bag, dagger(51204));
    const free = putObjectInContainer(bag, foodRation(51205));
    free.no_charge = true;
    const coins = putObjectInContainer(bag, goldPieces(51206, 7));
    const expected = shop.shopItemPrice(blade, 5, 5) + 7;
    game.level.objects = [bag];

    shop.impactDropFloorObjects(5, 5, game.level.traps[0], { targetLevel: { dnum: 0, dlevel: 2 } });

    assert.equal(shkp.debit, expected);
    assert.equal(queuedImpactDropsFor().includes(bag), true);
    assert.equal(bag.no_charge, false);
    assert.equal(blade.no_charge, false);
    assert.equal(free.no_charge, false);
    assert.equal(coins.no_charge, undefined);
});

test('angry shopkeeper takes dropped container contents without sale or no-charge marking', () => {
    const { shkp } = installShopState();
    shkp.angry = true;
    const bag = sack(5121, 'b');
    const blade = putObjectInContainer(bag, dagger(5122));
    const ration = putObjectInContainer(bag, foodRation(5123));
    shop.addObjectToShopBill(shkp, ration, 45);

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.angry, true);
    assert.match(sale.message, /smirks/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.billct, 0);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.notEqual(ration.no_charge, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
});

test('robbed shopkeeper treats dropped container contents as restock contribution', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    const bag = sack(5131, 'b');
    const blade = putObjectInContainer(bag, dagger(5132));
    const coins = putObjectInContainer(bag, goldPieces(5133, 9));
    const ration = putObjectInContainer(bag, foodRation(5134));
    shop.addObjectToShopBill(shkp, ration, 45);

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);

    assert.equal(sale.handled, true);
    assert.equal(sale.prompt, false);
    assert.equal(sale.robbed, true);
    assert.equal(sale.robbedContribution, shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp) + 1);
    assert.match(sale.message, /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.billct, 0);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('putting paid merchandise into a shop-floor container accepts cash sale', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(5051);
    const item = dagger(5052, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [container];

    const pending = shop.beginShopFloorContainerPutSale(container, item);

    assert.equal(pending.prompt, true);
    assert.equal(pending.credit, false);
    assert.equal(pending.offer, 2);
    assert.equal(game.inventory.includes(item), true);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.contained, true);
    assert.equal(item.container, container);
    assert.notEqual(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 7);
    assert.equal(shop.shopkeeperCash(shkp), 98);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a shop-floor ice box accepts cash sale', () => {
    const { shkp } = installShopState();
    const iceBox = shopFloorIceBox(5056);
    const item = dagger(5057, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [iceBox];

    const pending = shop.beginShopFloorContainerPutSale(iceBox, item);
    assert.equal(pending.prompt, true);
    assert.equal(pending.offer, 2);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(iceBox.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.equal(game._goldCount, 7);
    assert.equal(shop.shopkeeperCash(shkp), 98);
});

test('putting paid merchandise into a shop-floor container declines cash sale', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(5061);
    const item = dagger(5062, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [container];

    const pending = shop.beginShopFloorContainerPutSale(container, item);
    const result = shop.finishShopFloorContainerPutSale(pending, false);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a shop-floor container accepts cashless credit sale', () => {
    const { shkp } = installShopState();
    shkp.minvent = [];
    const container = shopFloorContainer(5071);
    const item = dagger(5072, 'a');
    game._goldCount = 5;
    game.inventory = [item];
    game.level.objects = [container];

    const pending = shop.beginShopFloorContainerPutSale(container, item);

    assert.equal(pending.prompt, true);
    assert.equal(pending.credit, true);
    assert.equal(pending.offer, 1);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopkeeperCash(shkp), 0);
    assert.equal(shkp.credit, 1);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a shop-floor container for an angry shopkeeper does not mark no-charge', () => {
    const { shkp } = installShopState();
    shkp.angry = true;
    const container = shopFloorContainer(5075);
    const item = dagger(5076, 'a');
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.match(result.message, /smirks/);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting paid merchandise into a robbed shop-floor container is a restock contribution', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    const container = shopFloorContainer(5077);
    const item = dagger(5078, 'a');
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.match(result.message, /contribution/);
    assert.equal(shkp.robbed, 0);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.notEqual(item.no_charge, true);
    assert.notEqual(item.unpaid, true);
    assert.equal(game._goldCount, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('putting a paid container into a shop-floor container can sell saleable contents', () => {
    const { shkp } = installShopState();
    const target = shopFloorContainer(5081);
    const bag = sack(5082, 'b');
    const blade = putObjectInContainer(bag, dagger(5083));
    game._goldCount = 5;
    game.inventory = [bag];
    game.level.objects = [target];

    const pending = shop.beginShopFloorContainerPutSale(target, bag);
    const expectedOffer = shop.shopSaleOffer(bag, shkp) + shop.shopSaleOffer(blade, shkp);

    assert.equal(pending.prompt, true);
    assert.equal(pending.credit, false);
    assert.equal(pending.offer, expectedOffer);

    const result = shop.finishShopFloorContainerPutSale(pending, true);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(bag), false);
    assert.equal(target.contents.includes(bag), true);
    assert.equal(bag.container, target);
    assert.equal(blade.container, bag);
    assert.notEqual(bag.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.notEqual(bag.unpaid, true);
    assert.notEqual(blade.unpaid, true);
    assert.equal(game._goldCount, 5 + expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), 100 - expectedOffer);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('no-charge floor merchandise is not billed when picked back up', () => {
    const { shkp } = installShopState();
    const floorObj = foodRation(6001, 'a');
    floorObj.no_charge = true;
    const carried = { ...floorObj, line: 'a - a food ration' };
    const result = shop.addPickedObjectToShopBill(floorObj, carried);

    assert.equal(result.price, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(carried.unpaid, undefined);
    assert.equal(floorObj.no_charge, false);
    assert.equal(carried.no_charge, false);
});

test('picking back up a declined dropped container clears recursive no-charge', async () => {
    const { shkp } = installCommandShopState();
    const bag = sack(6002, 'b');
    const blade = putObjectInContainer(bag, dagger(6003));
    bag.ox = 5;
    bag.oy = 5;
    game.level.objects = [bag];

    const sale = shop.shopDroppedPaidObjectSaleInfo(bag, 5, 5);
    shop.finishDroppedObjectSale({ ...sale, declineMessage: 'You drop a sack.' }, false);

    assert.equal(bag.no_charge, true);
    assert.equal(blade.no_charge, true);

    await rhack(',');

    const carried = game.inventory.find(item => item.id === bag.id);
    assert.ok(carried);
    assert.equal(game.level.objects.includes(bag), false);
    assert.equal(carried.no_charge, false);
    assert.equal(carried.unpaid, undefined);
    assert.equal(carried.contents.includes(blade), true);
    assert.equal(blade.no_charge, false);
    assert.equal(blade.unpaid, undefined);
    assert.equal(blade.container, carried);
    assert.equal(shkp.billct, 0);
});

test('picking up a no-charge floor container bills chargeable contents', () => {
    const { shkp } = installShopState();
    const bag = sack(6004, 'b');
    const blade = putObjectInContainer(bag, dagger(6005));
    bag.no_charge = true;
    bag.ox = 5;
    bag.oy = 5;
    const carried = { ...bag, line: 'b - a sack' };
    const expectedPrice = shop.shopItemPrice(blade, 5, 5);

    const result = shop.addPickedObjectToShopBill(bag, carried);

    assert.equal(result.price, expectedPrice);
    assert.equal(shop.shopBillEntryForObject(shkp, carried), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade).bo_id, String(blade.id));
    assert.equal(shkp.billct, 1);
    assert.equal(bag.no_charge, false);
    assert.equal(carried.no_charge, false);
    assert.equal(blade.no_charge, false);
    assert.equal(blade.unpaid, true);
    assert.equal(blade.container, carried);
});

test('forcing a shop-floor box lock bills only the altered box as a dummy bill', () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const box = shopFloorContainer(6098);
    box.locked = true;
    box.olocked = true;
    box.lknown = true;
    const blade = putObjectInContainer(box, dagger(6099));
    game.level.objects = [box];
    const expected = shop.shopItemPrice(box, 5, 5);

    const destroyed = finishForceLock({ chest: box, picktyp: true });

    assert.equal(destroyed, false);
    assert.equal(box.locked, false);
    assert.equal(box.olocked, false);
    assert.equal(box.obroken, true);
    assert.equal(box.lknown, true);
    assert.equal(box.no_charge, true);
    assert.equal(game.level.objects.includes(box), true);
    assert.equal(box.contents.includes(blade), true);
    assert.equal(shop.shopBillEntryForObject(shkp, box), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.notEqual(String(shkp.bill[0].bo_id), String(box.id));
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), expected);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.equal(game._usedUpShopBills[0].price, expected);
});

test('pickup menu prices billable contents of a no-charge floor container', async () => {
    installCommandShopState();
    const bag = sack(6100, 'b');
    bag.no_charge = true;
    bag.ox = 5;
    bag.oy = 5;
    const blade = putObjectInContainer(bag, dagger(6101));
    const scroll = blankScroll(6102);
    game.level.objects = [scroll, bag];
    const expected = shop.shopItemPrice(blade, 5, 5);

    await rhack(',');

    assert.equal(game._command_mode, 'pickupList');
    const menuText = (game._overlay_lines || []).map(row => row[2]).join('\n');
    assert.match(menuText, new RegExp(`a bag \\(contents, ${expected} zorkmids?\\)`));
    assert.doesNotMatch(menuText, /a bag \(no charge\)/);
});

test('single pickup quotes no-charge floor container contents without marking the container unpaid', async () => {
    const { shkp } = installCommandShopState();
    const bag = sack(6103, 'b');
    bag.no_charge = true;
    bag.ox = 5;
    bag.oy = 5;
    const blade = putObjectInContainer(bag, dagger(6104));
    game.level.objects = [bag];
    const expected = shop.shopItemPrice(blade, 5, 5);

    await rhack(',');

    assert.equal(game._command_mode, 'pickupShopQuote');
    assert.match(game._pending_message, new RegExp(`only ${expected} zorkmids? for the contents of this bag`));

    await rhack(' ');

    const carried = game.inventory.find(item => item.id === bag.id);
    assert.ok(carried);
    assert.equal(carried.unpaid, undefined);
    assert.match(carried.line, new RegExp(`\\(contents, ${expected} zorkmids?\\)`));
    assert.match(game._pending_message, new RegExp(`\\(contents, ${expected} zorkmids?\\)`));
    assert.equal(shop.shopBillEntryForObject(shkp, carried), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade).bo_id, String(blade.id));
    assert.equal(shkp.billct, 1);
});

test('whole container pickup quote excludes contained gold from item price', async () => {
    const { shkp } = installCommandShopState();
    const bag = sack(6105, 'b');
    bag.ox = 5;
    bag.oy = 5;
    const blade = putObjectInContainer(bag, dagger(6106));
    const coins = putObjectInContainer(bag, goldPieces(6107, 12));
    game.level.objects = [bag];
    const expectedItemPrice = shop.shopItemPrice(bag, 5, 5) + shop.shopItemPrice(blade, 5, 5);

    await rhack(',');

    assert.equal(game._command_mode, 'pickupShopQuote');
    assert.match(game._pending_message, new RegExp(`only ${expectedItemPrice} zorkmids? for this bag and its contents`));
    assert.doesNotMatch(game._pending_message, new RegExp(`${expectedItemPrice + 12} zorkmids?`));

    await rhack(' ');

    const carried = game.inventory.find(item => item.id === bag.id);
    assert.ok(carried);
    assert.match(game._pending_message, new RegExp(`\\(unpaid, ${expectedItemPrice} zorkmids?\\)`));
    assert.doesNotMatch(game._pending_message, new RegExp(`\\(unpaid, ${expectedItemPrice + 12} zorkmids?\\)`));
    assert.equal(shkp.debit, 12);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assertBillRowsFor(shkp, [carried, blade]);
});

test('ordinary shop-floor pickup slot failure happens before billing or removal', async () => {
    const { shkp } = installCommandShopState();
    const floorObj = foodRation(6006, 'a');
    game.level.objects = [floorObj];
    fillInventoryLetters();

    await rhack(',');

    assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(game.level.objects.includes(floorObj), true);
    assert.equal(game.inventory.includes(floorObj), false);
    assert.equal(floorObj.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('ordinary shop-floor pickup artifact refusal happens before billing or removal', async () => {
    const { shkp } = installCommandShopState();
    const artifact = {
        id: 6007,
        cls: 'tool',
        glyph: '(',
        kind: 'crystal ball',
        actualKind: 'crystal ball',
        artifact: 'The Orb of Detection',
        quan: 1,
        ox: 5,
        oy: 5,
    };
    game.level.objects = [artifact];
    game.u.uhp = 80;
    game.u.uhpmax = 80;
    game._startup_role = 'Wizard';
    game.u.ualign = { type: -1, record: 0 };

    await rhack(',');

    assert.match(game._pending_message, /You are blasted by the Orb of Detection's power/);
    assert.match(game._pending_message, /Orb of Detection evades your grasp/);
    assert.ok(game.u.uhp > 0 && game.u.uhp < 80);
    assert.equal(game.level.objects.includes(artifact), true);
    assert.equal(game.inventory.includes(artifact), false);
    assert.equal(artifact.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('lethal ordinary shop-floor pickup artifact blast stops before billing or removal', async () => {
    const { shkp } = installCommandShopState();
    const artifact = {
        id: 6008,
        cls: 'tool',
        glyph: '(',
        kind: 'crystal ball',
        actualKind: 'crystal ball',
        artifact: 'The Orb of Detection',
        quan: 1,
        ox: 5,
        oy: 5,
    };
    game.level.objects = [artifact];
    game.u.uhp = 1;
    game.u.uhpmax = 1;
    game._startup_role = 'Wizard';
    game.u.ualign = { type: -1, record: 0 };

    await rhack(',');

    assert.match(game._pending_message, /You are blasted by the Orb of Detection's power/);
    assert.match(game._pending_message, /You die/);
    assert.equal(game.level.objects.includes(artifact), true);
    assert.equal(game.inventory.includes(artifact), false);
    assert.equal(artifact.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'touching The Orb of Detection');
    assert.equal(game.context.move || 0, 0);
});

test('ordinary floor petrifying corpse touch precedes slot preflight and billing', async () => {
    const { shkp } = installCommandShopState();
    const body = corpse(6009, 'c', 'chickatrice');
    game.level.objects = [body];
    fillInventoryLetters();

    await rhack(',');

    assert.match(game._pending_message, /Touching a chickatrice corpse is a fatal mistake/);
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate/);
    assert.equal(game.level.objects.includes(body), true);
    assert.equal(game.inventory.includes(body), false);
    assert.equal(body.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'petrified by a chickatrice corpse');
    assert.equal(game.context.move || 0, 0);
});

test('ordinary floor Rider corpse pickup revives before billing or inventory', async () => {
    const { shkp } = installCommandShopState();
    const body = corpse(6010, 'c', 'Death');
    body.corpsenm = {
        name: 'Death',
        rider: true,
        unique: true,
        glyph: '&',
        mlet: '&',
        mlevel: 30,
        mmove: 12,
        ac: -5,
        mr: 100,
    };
    game.level.objects = [body];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });

    await rhack(',');

    const revived = game.level.monsters.find(mon => mon.data?.name === 'Death');
    assert.match(game._pending_message, /At your touch, the corpse suddenly moves/);
    assert.ok(revived);
    assert.equal(revived.mrevived, 1);
    assert.equal(game.level.objects.includes(body), false);
    assert.equal(game.inventory.includes(body), false);
    assert.equal(body.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('declined ordinary floor burden prompt leaves shop merchandise untouched', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRationStack(6011, 11);
    game.level.objects = [stack];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');

    assert.equal(game._command_mode, 'floorPickupBurdenConfirm');
    assert.match(game._pending_message, /much trouble lifting 11 food rations.*Continue\? \[ynq\]/);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(game.inventory.some(item => item.kind === 'food ration'), false);
    assert.equal(shkp.billct, 0);

    await rhack('n');

    assert.equal(game._command_mode, null);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 11);
    assert.equal(stack.unpaid, undefined);
    assert.equal(game.inventory.some(item => item.kind === 'food ration'), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('accepted ordinary floor burden prompt bills after confirmation', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRationStack(6012, 11);
    game.level.objects = [stack];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');

    assert.equal(game._command_mode, 'floorPickupBurdenConfirm');
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(shkp.billct, 0);

    await rhack('y');

    assert.equal(game._command_mode, 'pickupShopQuote');
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(shkp.billct, 0);

    await rhack(' ');

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const entry = shop.shopBillEntryForObject(shkp, carried);
    const expectedPrice = shop.shopItemPrice(carried, stack.ox, stack.oy);

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /much trouble lifting .*11 food rations.*unpaid/);
    assert.equal(game.level.objects.includes(stack), false);
    assert.ok(carried);
    assert.notEqual(carried, stack);
    assert.equal(carried.quan, 11);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.bquan, 11);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(carried.unpaidPrice, expectedPrice);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('accepted ordinary floor partial-stack burden prompt bills only lifted count', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRationStack(6013, 20);
    game.level.objects = [stack];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');

    assert.equal(game._command_mode, 'floorPickupBurdenConfirm');
    assert.match(game._pending_message, /can only lift some of the 20 food rations lying here/);
    assert.match(game._pending_message, /extreme difficulty lifting 15 food rations.*Continue\? \[ynq\]/);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 20);
    assert.equal(shkp.billct, 0);

    await rhack('y');

    assert.equal(game._command_mode, 'pickupShopQuote');
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 20);
    assert.equal(shkp.billct, 0);

    await rhack(' ');

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const entry = shop.shopBillEntryForObject(shkp, carried);
    const expectedPrice = shop.shopItemPrice(carried, stack.ox, stack.oy);

    assert.equal(game._command_mode, null);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 5);
    assert.equal(stack.unpaid, undefined);
    assert.ok(carried);
    assert.notEqual(carried, stack);
    assert.equal(carried.quan, 15);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.bquan, 15);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(carried.unpaidPrice, expectedPrice);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('ordinary floor gold burden prompt splits before shop charging', async () => {
    const { shkp } = installCommandShopState();
    const gold = goldPieces(6014, 50000);
    gold.ox = 5;
    gold.oy = 5;
    game.level.objects = [gold];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');

    assert.equal(game._command_mode, 'floorPickupBurdenConfirm');
    assert.match(game._pending_message, /can only lift some of the 50000 gold pieces lying here/);
    assert.match(game._pending_message, /extreme difficulty lifting \d+ gold pieces.*Continue\? \[ynq\]/);
    assert.equal(game._goldCount, 0);
    assert.equal(shkp.debit || 0, 0);

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.ok(game._goldCount > 0);
    assert.ok(game._goldCount < 50000);
    assert.equal(game.level.objects.includes(gold), true);
    assert.equal(gold.quan, 50000 - game._goldCount);
    assert.equal(shkp.debit, game._goldCount);
    assert.equal(game.context.move, 1);
});

test('shop pickup quote for stacks uses C per-item wording before billing', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRationStack(6090, 2);
    game.level.objects = [stack];
    const unitPrice = shop.shopItemPrice({ ...stack, quan: 1 }, stack.ox, stack.oy);

    await rhack(',');

    assert.equal(game._command_mode, 'pickupShopQuote');
    assert.match(game._pending_message, new RegExp(`only ${unitPrice} zorkmids? per food ration\\."$`));
    assert.doesNotMatch(game._pending_message, /for this food ration/);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(game.inventory.some(item => item.id === stack.id), false);
    assert.equal(shkp.billct, 0);
});

test('pickup menu rows and selected stack quotes use C shop pricing text', async () => {
    const { shkp } = installCommandShopState();
    const ration = foodRationStack(6091, 2);
    const scroll = blankScroll(6092);
    game.level.objects = [ration, scroll];
    const rationPrice = shop.shopItemPrice(ration, ration.ox, ration.oy);
    const rationUnitPrice = shop.shopItemPrice({ ...ration, quan: 1 }, ration.ox, ration.oy);
    const scrollPrice = shop.shopItemPrice(scroll, scroll.ox, scroll.oy);

    await rhack(',');

    assert.equal(game._command_mode, 'pickupList');
    const menuText = (game._overlay_lines || []).map(line => line[2]).join('\n');
    assert.match(menuText, new RegExp(`a - 2 food rations \\(for sale, ${rationPrice} zorkmids?\\)`));
    assert.match(menuText, new RegExp(`b - a scroll of blank paper \\(for sale, ${scrollPrice} zorkmids?\\)`));

    await rhack('a');
    await rhack('\n');

    const carried = game.inventory.find(item => item.id === ration.id);
    const entry = shop.shopBillEntryForObject(shkp, carried);
    assert.ok(carried);
    assert.ok(entry);
    assert.match(game._pending_message, new RegExp(`only ${rationUnitPrice} zorkmids? per food ration\\.`));
    assert.match(game._pending_message, new RegExp(`a - 2 food rations \\(unpaid, ${rationPrice} zorkmids?\\)`));
    assert.equal(shop.shopBillEntryTotal(entry), rationPrice);
});

test('uncursed scare monster floor scroll first pickup marks spe and bills live item', async () => {
    const { shkp } = installCommandShopState();
    const scroll = floorScareMonsterScroll(6015);
    game.level.objects = [scroll];
    const expectedPrice = shop.shopItemPrice(scroll, 5, 5);

    await rhack(',');
    assert.equal(game._command_mode, 'pickupShopQuote');

    await rhack(' ');

    const carried = game.inventory.find(item => item.id === scroll.id);
    const entry = shop.shopBillEntryForObject(shkp, carried);

    assert.ok(carried);
    assert.equal(game.level.objects.includes(scroll), false);
    assert.equal(carried.spe, 1);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.doesNotMatch(game._pending_message, /turns? to dust/i);
    assert.equal(game.context.move, 1);
});

test('blessed scare monster floor scroll unblesses without setting pickup spe', async () => {
    const { shkp } = installCommandShopState();
    const scroll = floorScareMonsterScroll(6016, { blessed: true });
    game.level.objects = [scroll];
    const expectedPrice = shop.shopItemPrice(scroll, 5, 5);

    await rhack(',');
    assert.equal(game._command_mode, 'pickupShopQuote');

    await rhack(' ');

    const carried = game.inventory.find(item => item.id === scroll.id);
    const entry = shop.shopBillEntryForObject(shkp, carried);

    assert.ok(carried);
    assert.equal(game.level.objects.includes(scroll), false);
    assert.equal(carried.blessed, false);
    assert.equal(carried.cursed, false);
    assert.equal(carried.spe || 0, 0);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.doesNotMatch(game._pending_message, /turns? to dust/i);
});

test('too-heavy scare monster floor scroll stays untouched before quote or billing', async () => {
    const { shkp } = installCommandShopState();
    const scroll = floorScareMonsterScroll(60155, { blessed: true });
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    game.inventory = [{
        id: 60156,
        cls: 'tool',
        kind: 'weighted test object',
        actualKind: 'weighted test object',
        quan: 1,
        owt: 1000,
        letter: 'a',
        line: 'a - a weighted test object',
    }];
    game.level.objects = [scroll];

    await rhack(',');

    assert.notEqual(game._command_mode, 'pickupShopQuote');
    assert.match(game._pending_message, /cannot carry any more/);
    assert.equal(game.level.objects.includes(scroll), true);
    assert.equal(game.inventory.some(item => item.id === scroll.id), false);
    assert.equal(scroll.blessed, true);
    assert.equal(scroll.cursed, false);
    assert.equal(scroll.spe || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('cursed or used scare monster floor scroll crumbles into used-up bill', async () => {
    for (const [label, id, props] of [
        ['cursed', 6017, { cursed: true }],
        ['used', 6018, { spe: 1 }],
    ]) {
        const { shkp } = installCommandShopState();
        const scroll = floorScareMonsterScroll(id, props);
        game.level.objects = [scroll];
        const expectedPrice = shop.shopItemPrice(scroll, 5, 5);

        await rhack(',');

        const entry = shop.shopBillEntryForObject(shkp, scroll);
        const debts = shop.collectPayableShopDebts(shkp);

        assert.equal(game.inventory.some(item => item.id === scroll.id), false, label);
        assert.equal(game.level.objects.includes(scroll), false, label);
        assert.equal(shkp.billct, 1, label);
        assert.ok(entry, label);
        assert.equal(entry.useup, true, label);
        assert.equal(shop.shopBillEntryTotal(entry), expectedPrice, label);
        assert.equal(debts.some(debt => debt.billPortion === 'fullyUsedUp' && debt.price === expectedPrice), true, label);
        assert.match(game._pending_message, /scroll.*turns? to dust.*pick.*up/i, label);
        assert.match(game._pending_message, /scroll of scare monster will cost you \d+ zorkmids?/i, label);
        assert.doesNotMatch(game._pending_message, /For you/i, label);
        assert.equal(game.context.move, 1, label);
    }
});

test('unknown used scare monster floor scroll dust offers type-call before used-up billing', async () => {
    const { shkp } = installCommandShopState();
    const label = 'TRYME TEST';
    const scroll = unknownLabeledScareMonsterScroll(6020, { label, spe: 1 });
    game.level.objects = [scroll];
    const expectedPrice = shop.shopItemPrice(scroll, 5, 5);

    await rhack(',');

    assert.equal(game._command_mode, 'callScrollAfterMore');
    assert.equal(game._call_scroll_label, label);
    assert.equal(game.inventory.some(item => item.id === scroll.id), false);
    assert.equal(game.level.objects.includes(scroll), true);
    assert.equal(shkp.billct, 0);
    assert.match(game._pending_message, /scroll.*turns? to dust.*pick.*up/i);
    assert.equal(game.context.move, 0);

    await answerScrollTryCall(label, 'fear');

    const entry = shop.shopBillEntryForObject(shkp, scroll);
    const debts = shop.collectPayableShopDebts(shkp);

    assert.equal(game.level.objects.includes(scroll), false);
    assert.equal(shkp.billct, 1);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(debts.some(debt => debt.billPortion === 'fullyUsedUp' && debt.price === expectedPrice), true);
    assert.match(game._pending_message, /will cost you \d+ zorkmids?/i);
    assert.doesNotMatch(game._pending_message, /For you/i);
    assert.equal(game.context.move, 1);
});

test('plural scare monster floor scroll dust quotes unit shop price', async () => {
    const { shkp } = installCommandShopState();
    const scroll = floorScareMonsterScroll(6022, {
        cursed: true,
        quan: 2,
        plural: 'scrolls of scare monster',
    });
    game.level.objects = [scroll];
    const expectedPrice = shop.shopItemPrice(scroll, 5, 5);
    const unitPrice = Math.trunc(expectedPrice / 2);

    await rhack(',');

    const entry = shop.shopBillEntryForObject(shkp, scroll);

    assert.equal(game.inventory.some(item => item.id === scroll.id), false);
    assert.equal(game.level.objects.includes(scroll), false);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.match(game._pending_message, /The scrolls turn to dust as you pick them up\./);
    assert.match(game._pending_message, new RegExp(`The 2 scrolls of scare monster will cost you ${unitPrice} zorkmids each\\.`));
    assert.equal(game.context.move, 1);
});

test('multi-pickup cursed or used scare monster scroll dusts and continues to later item', async () => {
    for (const [label, id, props] of [
        ['cursed', 6034, { cursed: true }],
        ['used', 6036, { spe: 1 }],
    ]) {
        const { shkp } = installCommandShopState();
        const scroll = floorScareMonsterScroll(id, { ...props, section: 'Other Items' });
        const ration = foodRation(id + 1);
        ration.section = 'Other Items';
        game.level.objects = [scroll, ration];
        const scrollPrice = shop.shopItemPrice(scroll, 5, 5);
        const rationPrice = shop.shopItemPrice(ration, 5, 5);

        await rhack(',');
        assert.equal(game._command_mode, 'pickupList', label);

        await rhack('a');
        await rhack('b');
        await rhack('\n');

        const carriedRation = game.inventory.find(item => item.id === ration.id);
        const dustEntry = shop.shopBillEntryForObject(shkp, scroll);
        const rationEntry = shop.shopBillEntryForObject(shkp, carriedRation);

        assert.ok(carriedRation, label);
        assert.equal(game.inventory.some(item => item.id === scroll.id), false, label);
        assert.equal(game.level.objects.includes(scroll), false, label);
        assert.equal(game.level.objects.includes(ration), false, label);
        assert.ok(dustEntry, label);
        assert.equal(dustEntry.useup, true, label);
        assert.equal(shop.shopBillEntryTotal(dustEntry), scrollPrice, label);
        assert.ok(rationEntry, label);
        assert.equal(rationEntry.useup, false, label);
        assert.equal(shop.shopBillEntryTotal(rationEntry), rationPrice, label);
        assert.equal(shkp.billct, 2, label);
        assert.match(game._pending_message, /scroll.*turns? to dust.*pick.*up/i, label);
        assert.match(game._pending_message, /scroll of scare monster will cost you \d+ zorkmids?/i, label);
        assert.match(game._pending_message, /food ration/, label);
        assert.ok(game._pending_message.indexOf('will cost you') < game._pending_message.indexOf('food ration'), label);
        assert.equal(game.context.move, 1, label);
    }
});

test('unknown scare monster dust in multi-pickup prompts before continuing later item', async () => {
    const { shkp } = installCommandShopState();
    const label = 'TRYME TEST';
    const scroll = unknownLabeledScareMonsterScroll(6037, {
        label,
        cursed: true,
        section: 'Other Items',
    });
    const ration = foodRation(6038);
    ration.section = 'Other Items';
    game.level.objects = [scroll, ration];
    const scrollPrice = shop.shopItemPrice(scroll, 5, 5);
    const rationPrice = shop.shopItemPrice(ration, 5, 5);

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    assert.equal(game._command_mode, 'callScrollAfterMore');
    assert.equal(game._call_scroll_label, label);
    assert.equal(game.level.objects.includes(scroll), true);
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(shkp.billct, 0);
    assert.match(game._pending_message, /scroll.*turns? to dust.*pick.*up/i);
    assert.doesNotMatch(game._pending_message, /food ration/);
    assert.equal(game.context.move, 0);

    await answerScrollTryCall(label, 'fear');

    const carriedRation = game.inventory.find(item => item.id === ration.id);
    const dustEntry = shop.shopBillEntryForObject(shkp, scroll);
    const rationEntry = shop.shopBillEntryForObject(shkp, carriedRation);

    assert.ok(carriedRation);
    assert.equal(game.inventory.some(item => item.id === scroll.id), false);
    assert.equal(game.level.objects.includes(scroll), false);
    assert.equal(game.level.objects.includes(ration), false);
    assert.ok(dustEntry);
    assert.equal(dustEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(dustEntry), scrollPrice);
    assert.ok(rationEntry);
    assert.equal(rationEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(rationEntry), rationPrice);
    assert.equal(shkp.billct, 2);
    assert.match(game._pending_message, /will cost you \d+ zorkmids?/i);
    assert.match(game._pending_message, /food ration/);
    assert.ok(game._pending_message.indexOf('will cost you') < game._pending_message.indexOf('food ration'));
    assert.equal(game.context.move, 1);
});

test('reading unknown scare monster scroll offers type-call after effect', async () => {
    installCommandShopState();
    const label = 'TRYME TEST';
    const scroll = unknownLabeledScareMonsterScroll(6046, { label, letter: 's' });
    game.inventory = [scroll];

    await rhack('r');
    await rhack('s');

    assert.equal(game._command_mode, 'callScrollAfterMore');
    assert.equal(game.inventory.includes(scroll), false);
    assert.match(game._pending_message, /As you read the scroll, it disappears/);
    assert.equal(game.context.move, 0);

    await answerScrollTryCall(label, 'fear');

    assert.equal(game.context.move, 1);
});

test('multi-pickup scare monster scroll live states match single pickup', async () => {
    for (const [label, id, props, expected] of [
        ['uncursed', 6038, {}, { spe: 1, blessed: false }],
        ['blessed', 6040, { blessed: true }, { spe: 0, blessed: false }],
    ]) {
        const { shkp } = installCommandShopState();
        const scroll = floorScareMonsterScroll(id, { ...props, section: 'Other Items' });
        const filler = foodRation(id + 1);
        filler.section = 'Other Items';
        game.level.objects = [scroll, filler];
        const expectedPrice = shop.shopItemPrice(scroll, 5, 5);

        await rhack(',');
        assert.equal(game._command_mode, 'pickupList', label);

        await rhack('a');
        await rhack('\n');

        const carried = game.inventory.find(item => item.id === scroll.id);
        const entry = shop.shopBillEntryForObject(shkp, carried);

        assert.ok(carried, label);
        assert.equal(carried.spe || 0, expected.spe, label);
        assert.equal(!!carried.blessed, expected.blessed, label);
        assert.equal(carried.cursed, false, label);
        assert.equal(game.level.objects.includes(scroll), false, label);
        assert.equal(game.level.objects.includes(filler), true, label);
        assert.ok(entry, label);
        assert.equal(entry.useup, false, label);
        assert.equal(shop.shopBillEntryTotal(entry), expectedPrice, label);
        assert.doesNotMatch(game._pending_message, /turns? to dust/i, label);
        assert.equal(game.context.move, 1, label);
    }
});

test('multi-pickup partial scare monster stack preserves remainder state', async () => {
    for (const [label, id, props, expected] of [
        ['fresh', 6042, {}, { carriedSpe: 1, remainderBlessed: false }],
        ['blessed', 6044, { blessed: true }, { carriedSpe: 0, remainderBlessed: true }],
    ]) {
        const { shkp } = installCommandShopState();
        const stack = floorScareMonsterScroll(id, {
            quan: 100,
            plural: 'scrolls of scare monster',
            section: 'Other Items',
            ...props,
        });
        const filler = foodRation(id + 1);
        filler.section = 'Other Items';
        game.level.objects = [stack, filler];
        game.u.acurr.a = [1, 1, 10, 10, 1, 10];

        await rhack(',');
        assert.equal(game._command_mode, 'pickupList', label);

        await rhack('a');
        await rhack('\n');

        assert.equal(game._command_mode, 'pickupListBurdenConfirm', label);
        assert.match(game._pending_message, /You can only lift/, label);

        await rhack('y');

        const carried = game.inventory.find(item => item.id !== filler.id && item.scrollIndex === 3);
        const entry = shop.shopBillEntryForObject(shkp, carried);

        assert.ok(carried, label);
        assert.ok(carried.quan > 0 && carried.quan < 100, label);
        assert.equal(carried.spe || 0, expected.carriedSpe, label);
        assert.equal(carried.blessed, false, label);
        assert.equal(stack.quan, 100 - carried.quan, label);
        assert.equal(stack.spe || 0, 0, label);
        assert.equal(!!stack.blessed, expected.remainderBlessed, label);
        assert.equal(stack.cursed, false, label);
        assert.equal(game.level.objects.includes(stack), true, label);
        assert.equal(game.level.objects.includes(filler), true, label);
        assert.ok(entry, label);
        assert.equal(entry.useup, false, label);
        assert.equal(shop.shopBillEntryTotal(entry), shop.shopItemPrice(carried, 5, 5), label);
        assert.doesNotMatch(game._pending_message, /turns? to dust/i, label);
        assert.equal(game.context.move, 1, label);
    }
});

test('multi-pickup declined burden prompt skips item and continues', async () => {
    const { shkp } = installCommandShopState();
    const heavy = foodRationStack(6046, 11);
    heavy.section = 'Other Items';
    const later = blankScroll(6047);
    later.section = 'Other Items';
    game.level.objects = [heavy, later];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    assert.equal(game._command_mode, 'pickupListBurdenConfirm');
    assert.match(game._pending_message, /much trouble lifting 11 food rations.*Continue\? \[ynq\]/);
    assert.equal(game.level.objects.includes(heavy), true);
    assert.equal(game.level.objects.includes(later), true);
    assert.equal(shkp.billct, 0);

    await rhack('n');

    const carriedLater = game.inventory.find(item => item.id === later.id);
    const entry = shop.shopBillEntryForObject(shkp, carriedLater);

    assert.equal(game._command_mode, null);
    assert.equal(game.level.objects.includes(heavy), true);
    assert.equal(heavy.quan, 11);
    assert.equal(heavy.unpaid, undefined);
    assert.equal(game.level.objects.includes(later), false);
    assert.ok(carriedLater);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('multi-pickup quit burden prompt aborts remaining selections', async () => {
    const { shkp } = installCommandShopState();
    const heavy = foodRationStack(6048, 11);
    heavy.section = 'Other Items';
    const later = blankScroll(6049);
    later.section = 'Other Items';
    game.level.objects = [heavy, later];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    assert.equal(game._command_mode, 'pickupListBurdenConfirm');

    await rhack('q');

    assert.equal(game._command_mode, null);
    assert.equal(game.level.objects.includes(heavy), true);
    assert.equal(game.level.objects.includes(later), true);
    assert.equal(game.inventory.some(item => item.id === heavy.id), false);
    assert.equal(game.inventory.some(item => item.id === later.id), false);
    assert.equal(heavy.unpaid, undefined);
    assert.equal(later.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move, 1);
});

test('menu pickup accepted partial-stack burden prompt bills only lifted count', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRationStack(6050, 20);
    stack.section = 'Other Items';
    const filler = blankScroll(6051);
    filler.section = 'Other Items';
    game.level.objects = [stack, filler];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('\n');

    assert.equal(game._command_mode, 'pickupListBurdenConfirm');
    assert.match(game._pending_message, /can only lift some of the 20 food rations lying here/);
    assert.match(game._pending_message, /extreme difficulty lifting .*Continue\? \[ynq\]/);
    assert.equal(stack.quan, 20);
    assert.equal(shkp.billct, 0);

    await rhack('y');

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const entry = shop.shopBillEntryForObject(shkp, carried);

    assert.equal(game._command_mode, null);
    assert.ok(carried);
    assert.ok(carried.quan > 0 && carried.quan < 20);
    assert.equal(stack.quan, 20 - carried.quan);
    assert.equal(stack.unpaid, undefined);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(game.level.objects.includes(filler), true);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), shop.shopItemPrice(carried, 5, 5));
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('multi-pickup declined gold burden prompt does not charge shop gold and continues', async () => {
    const { shkp } = installCommandShopState();
    const gold = goldPieces(6052, 50000);
    gold.ox = 5;
    gold.oy = 5;
    const later = blankScroll(6053);
    later.section = 'Other Items';
    game.level.objects = [gold, later];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('$');
    await rhack('a');
    await rhack('\n');

    assert.equal(game._command_mode, 'pickupListBurdenConfirm');
    assert.match(game._pending_message, /can only lift some of the 50000 gold pieces lying here/);
    assert.match(game._pending_message, /extreme difficulty lifting .*gold pieces.*Continue\? \[ynq\]/);
    assert.equal(game._goldCount, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.loan || 0, 0);

    await rhack('n');

    const carriedLater = game.inventory.find(item => item.id === later.id);
    const entry = shop.shopBillEntryForObject(shkp, carriedLater);

    assert.equal(game._command_mode, null);
    assert.equal(game._goldCount, 0);
    assert.equal(gold.quan, 50000);
    assert.equal(game.level.objects.includes(gold), true);
    assert.equal(game.level.objects.includes(later), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.loan || 0, 0);
    assert.ok(carriedLater);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('menu pickup accepted shop gold lift charges only lifted amount', async () => {
    const { shkp } = installCommandShopState();
    const gold = goldPieces(6054, 50000);
    gold.ox = 5;
    gold.oy = 5;
    const filler = blankScroll(6055);
    filler.section = 'Other Items';
    shkp.credit = 5;
    game.level.objects = [gold, filler];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('$');
    await rhack('\n');

    assert.equal(game._command_mode, 'pickupListBurdenConfirm');

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.ok(game._goldCount > 0);
    assert.ok(game._goldCount < 50000);
    assert.equal(gold.quan, 50000 - game._goldCount);
    assert.equal(game.level.objects.includes(gold), true);
    assert.equal(game.level.objects.includes(filler), true);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, game._goldCount - 5);
    assert.equal(shkp.loan, game._goldCount - 5);
    assert.equal(shkp.billct, 0);
    assert.match(game._pending_message, /\$ - \d+ gold pieces/);
    assert.match(game._pending_message, /credit is erased|credit is reduced/);
    assert.match(game._pending_message, /owe|debt increases/);
    assert.equal(game.context.move, 1);
});

test('cursed shop-floor loadstone pickup ignores overweight and bills live item', async () => {
    const { shkp } = installCommandShopState();
    const stone = floorLoadstone(6020);
    game.level.objects = [stone];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    const expectedPrice = shop.shopItemPrice(stone, 5, 5);

    assert.ok(expectedPrice > 0);

    await rhack(',');
    assert.equal(game._command_mode, 'pickupShopQuote');

    await rhack(' ');

    const carried = game.inventory.find(item => item.id === stone.id);
    const entry = shop.shopBillEntryForObject(shkp, carried);

    assert.ok(carried);
    assert.equal(game._command_mode, null);
    assert.equal(game.level.objects.includes(stone), false);
    assert.equal(carried.cursed, true);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.doesNotMatch(game._pending_message, /knapsack|cannot carry|Continue\?/i);
    assert.equal(game.context.move, 1);
});

test('first loadstone can exceed full inventory slot limit and is billed', async () => {
    const { shkp } = installCommandShopState();
    fillInventoryLetters();
    const stone = floorLoadstone(6021);
    game.level.objects = [stone];
    const expectedPrice = shop.shopItemPrice(stone, 5, 5);

    await rhack(',');
    assert.equal(game._command_mode, 'pickupShopQuote');

    await rhack(' ');

    const carried = game.inventory.find(item => item.id === stone.id);
    const entry = shop.shopBillEntryForObject(shkp, carried);

    assert.ok(carried);
    assert.equal(carried.letter, '#');
    assert.equal(game.inventory.length, INVENTORY_LETTERS.length + 1);
    assert.equal(game.level.objects.includes(stone), false);
    assert.ok(entry);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate/i);
    assert.equal(game.context.move, 1);
});

test('full inventory refuses another non-mergeable loadstone before billing', async () => {
    const { shkp } = installCommandShopState();
    fillInventoryLetters();
    game.inventory[0] = carriedLoadstone(6022, 'a', { cursed: false });
    const floor = floorLoadstone(6023, { cursed: true });
    game.level.objects = [floor];

    await rhack(',');

    assert.match(game._pending_message, /too much stuff to pick up another loadstone/i);
    assert.equal(game.level.objects.includes(floor), true);
    assert.equal(game.inventory.some(item => item.id === floor.id), false);
    assert.equal(floor.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('loadstone floor pickup from a pile still bypasses burden prompt', async () => {
    const { shkp } = installCommandShopState();
    const stone = floorLoadstone(6024, { section: 'Gems/Stones' });
    const ration = foodRation(6025, 'f');
    ration.section = 'Comestibles';
    game.level.objects = [stone, ration];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('b');
    await rhack('\n');

    const carried = game.inventory.find(item => item.id === stone.id);

    assert.ok(carried);
    assert.equal(game.level.objects.includes(stone), false);
    assert.equal(game.level.objects.includes(ration), true);
    assert.ok(shop.shopBillEntryForObject(shkp, carried));
    assert.doesNotMatch(game._pending_message, /Continue\?/);
    assert.equal(game.context.move, 1);
});

test('ordinary hero cannot pick up floor boulder but spends command', async () => {
    installNonShopFloorState();
    const rock = floorBoulder(6060);
    game.level.objects = [rock];

    await rhack(',');

    assert.match(game._pending_message, /There is a boulder here, but it is too heavy for you to lift/);
    assert.equal(game.level.objects.includes(rock), true);
    assert.equal(game.inventory.some(item => item.otyp === BOULDER), false);
    assert.equal(game._command_mode ?? null, null);
    assert.equal(game.context.move, 1);
});

test('Sokoban boulder blocks pickup even for throws-rocks form', async () => {
    installNonShopFloorState();
    installThrowsRocksForm();
    game.level.flags = { sokoban_rules: true };
    const rock = floorBoulder(6061);
    game.level.objects = [rock];

    await rhack(',');

    assert.match(game._pending_message, /cannot get your .* around this boulder/i);
    assert.equal(game.level.objects.includes(rock), true);
    assert.equal(game.inventory.some(item => item.otyp === BOULDER), false);
    assert.equal(game._command_mode ?? null, null);
    assert.equal(game.context.move, 1);
});

test('polymorphed throws-rocks hero picks up overweight boulder', async () => {
    installNonShopFloorState();
    installThrowsRocksForm();
    const rock = floorBoulder(6062);
    game.level.objects = [rock];

    await rhack(',');

    const carried = game.inventory.find(item => item.otyp === BOULDER);
    assert.ok(carried);
    assert.equal(carried.kind, 'boulder');
    assert.equal(carried.cls, 'rock');
    assert.equal(carried.quan, 1);
    assert.equal(game.level.objects.includes(rock), false);
    assert.match(game._pending_message, /a - a boulder/);
    assert.doesNotMatch(game._pending_message, /Continue\?/);
    assert.equal(game._command_mode ?? null, null);
    assert.equal(game.context.move, 1);
});

test('menu pickup ordinary boulder failure aborts later selected items', async () => {
    installNonShopFloorState();
    const rock = floorBoulder(6063, { section: 'Other Items' });
    const later = blankScroll(6064);
    later.section = 'Other Items';
    game.level.objects = [rock, later];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    assert.match(game._pending_message, /There is a boulder here, but it is too heavy for you to lift/);
    assert.equal(game.level.objects.includes(rock), true);
    assert.equal(game.level.objects.includes(later), true);
    assert.equal(game.inventory.some(item => item.otyp === BOULDER), false);
    assert.equal(game.inventory.some(item => item.id === later.id), false);
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
});

test('shop menu pickup by throws-rocks hero bills normal item and carries boulder without billing', async () => {
    const { shkp } = installCommandShopState();
    installThrowsRocksForm();
    const scroll = blankScroll(6066);
    scroll.section = 'Other Items';
    const rock = floorBoulder(6065, { section: 'Other Items' });
    game.level.objects = [scroll, rock];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    const carriedBoulder = game.inventory.find(item => item.otyp === BOULDER);
    const carriedScroll = game.inventory.find(item => item.id === scroll.id);
    const scrollEntry = shop.shopBillEntryForObject(shkp, carriedScroll);

    assert.ok(carriedBoulder);
    assert.equal(carriedBoulder.unpaid == null, true);
    assert.equal(shop.shopBillEntryForObject(shkp, carriedBoulder) == null, true);
    assert.ok(carriedScroll);
    assert.ok(scrollEntry);
    assert.equal(scrollEntry.useup, false);
    assert.equal(shkp.billct, 1);
    assert.equal(game.level.objects.includes(rock), false);
    assert.equal(game.level.objects.includes(scroll), false);
    assert.match(game._pending_message, /a - a scroll of blank paper \(unpaid, \d+ zorkmids?\)/);
    assert.match(game._pending_message, /b - a boulder/);
    assert.equal(game.context.move, 1);
});

test('multi-pickup keeps earlier shop item when later selection runs out of slots', async () => {
    const { shkp } = installCommandShopState();
    fillInventoryLetters();
    game.inventory = game.inventory.filter(item => item.letter !== 'Z');
    const first = foodRation(6030);
    const later = blankScroll(6031);
    game.level.objects = [first, later];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    const carried = game.inventory.find(item => item.id === first.id);
    const entry = shop.shopBillEntryForObject(shkp, carried);

    assert.ok(carried);
    assert.equal(carried.letter, 'Z');
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(game.level.objects.includes(first), false);
    assert.equal(game.level.objects.includes(later), true);
    assert.equal(game.inventory.some(item => item.id === later.id), false);
    assert.equal(later.unpaid, undefined);
    assert.equal(shkp.billct, 1);
    assert.match(game._pending_message, /Z - a food ration/);
    assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(game.context.move, 1);
});

test('multi-pickup failed first selection still consumes an explicit pickup turn', async () => {
    const { shkp } = installCommandShopState();
    fillInventoryLetters();
    const first = foodRation(6032);
    const later = blankScroll(6033);
    game.level.objects = [first, later];

    await rhack(',');
    assert.equal(game._command_mode, 'pickupList');

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    assert.equal(game.level.objects.includes(first), true);
    assert.equal(game.level.objects.includes(later), true);
    assert.equal(game.inventory.some(item => item.id === first.id), false);
    assert.equal(game.inventory.some(item => item.id === later.id), false);
    assert.equal(first.unpaid, undefined);
    assert.equal(later.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(game.context.move, 1);
});

test('cursed loadstone cannot be dropped and non-cursed drop becomes cursed', async () => {
    installCommandShopState();
    game.level.rooms = [{ rtype: ROOM }];
    game.level.monsters = [];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const cursed = carriedLoadstone(6026, 'l', { cursed: true });
    game.inventory = [cursed];

    await rhack('d');
    assert.equal(game._command_mode, 'dropObject');

    await rhack('l');

    assert.match(game._pending_message, /cannot drop the stone/i);
    assert.equal(game.inventory.includes(cursed), true);
    assert.equal(cursed.bknown, true);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.context.move || 0, 0);

    const uncursed = carriedLoadstone(6027, 'm', { cursed: false, bknown: false });
    game.inventory = [uncursed];

    await rhack('d');
    await rhack('m');

    const dropped = game.level.objects.find(item => item.id === uncursed.id);
    assert.ok(dropped);
    assert.equal(game.inventory.includes(uncursed), false);
    assert.equal(dropped.cursed, true);
    assert.equal(dropped.blessed, false);
    assert.equal(dropped.bknown, false);
    assert.equal(game.context.move, 1);
});

test('ordinary shop-floor partial stack pickup splits before billing', async () => {
    const { shkp } = installCommandShopState();
    const stack = foodRationStack(6028, 20);
    game.level.objects = [stack];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    game.flags.pickup_burden = 'overloaded';

    await rhack(',');
    assert.equal(game._command_mode, 'pickupShopQuote');

    await rhack(' ');

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const entry = shop.shopBillEntryForObject(shkp, carried);
    const expectedPrice = shop.shopItemPrice(carried, stack.ox, stack.oy);

    assert.match(game._pending_message, /can only lift some of the 20 food rations lying here/);
    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 5);
    assert.equal(stack.unpaid, undefined);
    assert.ok(carried);
    assert.notEqual(carried, stack);
    assert.equal(carried.quan, 15);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(entry.bquan, 15);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(carried.unpaidPrice, expectedPrice);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(game.context.move, 1);
});

test('taking merchandise from a shop-floor container adds the carried object to the bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6101);
    const contained = putObjectInContainer(container, foodRation(6102));
    game.level.objects = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(container.contents.length, 0);
    assert.equal(game.inventory.includes(contained), true);
    assert.equal(contained.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shkp.bill[0].bo_id, String(contained.id));
    assert.equal(contained.unpaidPrice, shop.shopBillEntryTotal(shkp.bill[0]));
    assert.match(line, /unpaid, \d+ zorkmids?/);
    assert.match(contained.line, /unpaid, \d+ zorkmids?/);
});

test('taking stale field-only unpaid merchandise from a shop-floor container bills current shop price', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6103);
    const contained = putObjectInContainer(container, foodRation(6104));
    contained.unpaid = true;
    contained.unpaidPrice = 999;
    game.level.objects = [container];
    const expectedPrice = shop.shopItemPrice(contained, container.ox, container.oy);

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);
    const entry = shop.shopBillEntryForObject(shkp, contained);

    assert.equal(game.inventory.includes(contained), true);
    assert.ok(entry);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, expectedPrice);
    assert.notEqual(contained.unpaidPrice, 999);
    assert.equal(shkp.billct, 1);
    assert.match(line, new RegExp(`unpaid, ${expectedPrice} zorkmids?`));
});

test('shop-floor container take-out slot failure happens before billing or extraction', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6111);
    const contained = putObjectInContainer(container, foodRation(6112));
    game.level.objects = [container];
    fillInventoryLetters();

    await confirmSingleContainerTakeout(container, contained);

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(container.contents.includes(contained), true);
    assert.equal(game.inventory.includes(contained), false);
    assert.equal(contained.contained, true);
    assert.equal(contained.container, container);
    assert.equal(contained.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('ordinary hero cannot take boulder out of a container', async () => {
    installNonShopFloorState();
    const container = shopFloorContainer(6141);
    const rock = putObjectInContainer(container, floorBoulder(6142));
    game.level.objects = [container];

    await confirmSingleContainerTakeout(container, rock, 'a', 'Boulders/Statues');

    assert.match(game._pending_message, /There is a boulder in .*large box.*, but it is too heavy for you to carry/);
    assert.equal(container.contents.includes(rock), true);
    assert.equal(game.inventory.some(item => item.otyp === BOULDER), false);
    assert.equal(rock.contained, true);
    assert.equal(rock.container, container);
    assert.equal(game.context.move || 0, 0);
});

test('Sokoban container boulder blocks before throws-rocks override', async () => {
    installNonShopFloorState();
    installThrowsRocksForm();
    game.level.flags = { sokoban_rules: true };
    const container = shopFloorContainer(6143);
    const rock = putObjectInContainer(container, floorBoulder(6144));
    game.level.objects = [container];

    await confirmSingleContainerTakeout(container, rock, 'a', 'Boulders/Statues');

    assert.match(game._pending_message, /cannot get your .* around this boulder/i);
    assert.equal(container.contents.includes(rock), true);
    assert.equal(game.inventory.some(item => item.otyp === BOULDER), false);
    assert.equal(rock.contained, true);
    assert.equal(rock.container, container);
    assert.equal(game.context.move || 0, 0);
});

test('throws-rocks hero takes boulder out of a container without burden prompt', async () => {
    installNonShopFloorState();
    installThrowsRocksForm();
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    const container = shopFloorContainer(6145);
    const rock = putObjectInContainer(container, floorBoulder(6146));
    game.level.objects = [container];

    await confirmSingleContainerTakeout(container, rock, 'a', 'Boulders/Statues');

    const carried = game.inventory.find(item => item.otyp === BOULDER);
    assert.ok(carried);
    assert.equal(carried, rock);
    assert.equal(carried.cls, 'rock');
    assert.equal(carried.glyph, '`');
    assert.equal(carried.kind, 'boulder');
    assert.equal(container.contents.includes(rock), false);
    assert.equal(rock.contained, false);
    assert.equal(rock.container, null);
    assert.match(game._pending_message, /a - a boulder/);
    assert.doesNotMatch(game._pending_message, /Continue\?/);
    assert.equal(game.context.move, 1);
});

test('full inventory still allows first contained boulder for throws-rocks form', async () => {
    installNonShopFloorState();
    installThrowsRocksForm();
    fillInventoryLetters();
    const container = shopFloorContainer(6147);
    const rock = putObjectInContainer(container, floorBoulder(6148));
    game.level.objects = [container];

    await confirmSingleContainerTakeout(container, rock, 'a', 'Boulders/Statues');

    const carried = game.inventory.find(item => item.otyp === BOULDER);
    assert.ok(carried);
    assert.equal(carried.letter, '#');
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate/);
    assert.doesNotMatch(game._pending_message, /too much stuff/);
    assert.equal(container.contents.includes(rock), false);
    assert.equal(game.context.move, 1);
});

test('full inventory and carried boulder refuses another contained boulder', async () => {
    const { shkp } = installCommandShopState();
    installThrowsRocksForm();
    fillInventoryLetters();
    const carried = floorBoulder(6149, { letter: '#' });
    delete carried.ox;
    delete carried.oy;
    carried.line = '# - a boulder';
    game.inventory.push(carried);
    const container = shopFloorContainer(6150);
    const rock = putObjectInContainer(container, floorBoulder(6151));
    game.level.objects = [container];

    await confirmSingleContainerTakeout(container, rock, 'a', 'Boulders/Statues');

    assert.match(game._pending_message, /carrying too much stuff to pick up another boulder/);
    assert.equal(container.contents.includes(rock), true);
    assert.equal(game.inventory.includes(rock), false);
    assert.equal(rock.contained, true);
    assert.equal(rock.container, container);
    assert.equal(shop.shopBillEntryForObject(shkp, rock), null);
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move || 0, 0);
});

test('container take-out menu groups contained boulders with statues', async () => {
    installNonShopFloorState();
    const container = shopFloorContainer(6152);
    const rock = putObjectInContainer(container, floorBoulder(6153));
    game.level.objects = [container];
    game._floor_container_object = container;
    game._command_mode = 'lootMenu';

    await rhack('o');

    assert.equal(game._command_mode, 'lootTakeoutObjects');
    assert.equal(game._loot_takeout_entries.length, 1);
    assert.equal(game._loot_takeout_entries[0].item, rock);
    assert.equal(game._loot_takeout_entries[0].label, 'Boulders/Statues');
});

test('shop-floor container take-out bills normal merchandise but not boulder', async () => {
    const { shkp } = installCommandShopState();
    installThrowsRocksForm();
    const container = shopFloorContainer(6154);
    const ration = putObjectInContainer(container, foodRation(6155));
    const rock = putObjectInContainer(container, floorBoulder(6156));
    game.level.objects = [container];
    game._command_mode = 'lootTakeoutObjects';
    game._loot_takeout_container = container;
    game._loot_takeout_entries = [
        { item: ration, label: 'Comestibles', letter: 'a' },
        { item: rock, label: 'Boulders/Statues', letter: 'b' },
    ];
    game._loot_takeout_selected = ['a', 'b'];

    await rhack(' ');

    const carriedBoulder = game.inventory.find(item => item.otyp === BOULDER);
    const carriedRation = game.inventory.find(item => item.id === ration.id);

    assert.ok(carriedBoulder);
    assert.ok(carriedRation);
    assert.equal(container.contents.includes(rock), false);
    assert.equal(container.contents.includes(ration), false);
    assert.equal(carriedBoulder.unpaid == null, true);
    assert.equal(shop.shopBillEntryForObject(shkp, carriedBoulder), null);
    assert.equal(carriedRation.unpaid, true);
    assert.ok(shop.shopBillEntryForObject(shkp, carriedRation));
    assert.equal(shkp.billct, 1);
    assert.match(game._pending_message, /a - a food ration \(unpaid, \d+ zorkmids?\)/);
    assert.match(game._pending_message, /b - a boulder/);
    assert.equal(game.context.move, 1);
});

test('failed take-out preflight does not recursively bill nested contents', async () => {
    const { shkp } = installCommandShopState();
    const source = shopFloorContainer(6121);
    const bag = sack(6122);
    const ration = putObjectInContainer(bag, foodRation(6123));
    const coins = putObjectInContainer(bag, goldPieces(6124, 12));
    putObjectInContainer(source, bag);
    game.level.objects = [source];
    game._goldCount = 3;
    fillInventoryLetters();

    await confirmSingleContainerTakeout(source, bag, 'a', 'Tools');

    assert.equal(source.contents.includes(bag), true);
    assert.equal(game.inventory.includes(bag), false);
    assert.equal(bag.contained, true);
    assert.equal(bag.container, source);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assert.equal(bag.unpaid, undefined);
    assert.equal(ration.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(game._goldCount, 3);
});

test('container take-out capacity preflight refuses objects beyond maximum carry', async () => {
    installCommandShopState();
    const container = shopFloorContainer(6131);
    const heavy = putObjectInContainer(container, {
        id: 6132,
        cls: 'rock',
        glyph: '`',
        kind: 'heavy lump',
        actualKind: 'heavy lump',
        quan: 1,
        owt: 400,
    });
    game.level.objects = [container];
    game.u.acurr.a = [1, 10, 10, 10, 1, 10];

    await confirmSingleContainerTakeout(container, heavy, 'a', 'Boulders/Statues');

    assert.match(game._pending_message, /cannot carry any more/);
    assert.equal(container.contents.includes(heavy), true);
    assert.equal(game.inventory.includes(heavy), false);
    assert.equal(heavy.contained, true);
    assert.equal(heavy.container, container);
    assert.equal(game.context.move || 0, 0);
});

test('container take-out artifact refusal happens before billing or extraction', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6133);
    const artifact = putObjectInContainer(container, {
        id: 6134,
        cls: 'tool',
        glyph: '(',
        kind: 'crystal ball',
        actualKind: 'crystal ball',
        artifact: 'The Orb of Detection',
        quan: 1,
    });
    game.level.objects = [container];
    game.u.uhp = 80;
    game.u.uhpmax = 80;
    game._startup_role = 'Wizard';
    game.u.ualign = { type: -1, record: 0 };

    await confirmSingleContainerTakeout(container, artifact, 'a', 'Tools');

    assert.match(game._pending_message, /You are blasted by the Orb of Detection's power/);
    assert.match(game._pending_message, /Orb of Detection evades your grasp/);
    assert.ok(game.u.uhp > 0 && game.u.uhp < 80);
    assert.equal(container.contents.includes(artifact), true);
    assert.equal(game.inventory.includes(artifact), false);
    assert.equal(artifact.contained, true);
    assert.equal(artifact.container, container);
    assert.equal(artifact.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('container take-out artifact blast can still allow billing and extraction', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6141);
    const artifact = putObjectInContainer(container, {
        id: 6142,
        cls: 'tool',
        glyph: '(',
        kind: 'crystal ball',
        actualKind: 'crystal ball',
        artifact: 'The Orb of Detection',
        quan: 1,
    });
    game.level.objects = [container];
    game.u.uhp = 80;
    game.u.uhpmax = 80;
    game._startup_role = 'Archeologist';
    game.u.ualign = { type: -1, record: 0 };

    await confirmSingleContainerTakeout(container, artifact, 'a', 'Tools');

    assert.match(game._pending_message, /You are blasted by the Orb of Detection's power/);
    assert.doesNotMatch(game._pending_message, /evades your grasp/);
    assert.ok(game.u.uhp > 0 && game.u.uhp < 80);
    assert.equal(container.contents.includes(artifact), false);
    assert.equal(game.inventory.includes(artifact), true);
    assert.equal(artifact.contained, false);
    assert.equal(artifact.container, null);
    assert.equal(artifact.unpaid, true);
    assert.ok(shop.shopBillEntryForObject(shkp, artifact));
    assert.equal(game.context.move, 1);
});

test('lethal container take-out artifact blast stops before billing or extraction', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6143);
    const artifact = putObjectInContainer(container, {
        id: 6144,
        cls: 'tool',
        glyph: '(',
        kind: 'crystal ball',
        actualKind: 'crystal ball',
        artifact: 'The Orb of Detection',
        quan: 1,
    });
    game.level.objects = [container];
    game.u.uhp = 1;
    game.u.uhpmax = 1;
    game._startup_role = 'Wizard';
    game.u.ualign = { type: -1, record: 0 };

    await confirmSingleContainerTakeout(container, artifact, 'a', 'Tools');

    assert.match(game._pending_message, /You are blasted by the Orb of Detection's power/);
    assert.match(game._pending_message, /You die/);
    assert.equal(container.contents.includes(artifact), true);
    assert.equal(game.inventory.includes(artifact), false);
    assert.equal(artifact.contained, true);
    assert.equal(artifact.container, container);
    assert.equal(artifact.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'touching The Orb of Detection');
    assert.equal(game.context.move || 0, 0);
});

test('container take-out fatal corpse touch precedes slot preflight and billing', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6136);
    const body = putObjectInContainer(container, corpse(6137, 'c', 'cockatrice'));
    game.level.objects = [container];
    fillInventoryLetters();

    await confirmSingleContainerTakeout(container, body);

    assert.match(game._pending_message, /Touching a cockatrice corpse is a fatal mistake/);
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate/);
    assert.equal(container.contents.includes(body), true);
    assert.equal(game.inventory.includes(body), false);
    assert.equal(body.contained, true);
    assert.equal(body.container, container);
    assert.equal(body.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'petrified by a cockatrice corpse');
});

test('container take-out of a Rider corpse does not immediately revive it', async () => {
    installCommandShopState();
    const container = shopFloorContainer(6146);
    const body = putObjectInContainer(container, corpse(6147, 'c', 'Death'));
    body.corpsenm = { name: 'Death', rider: true };
    game.level.objects = [container];

    await confirmSingleContainerTakeout(container, body);

    assert.doesNotMatch(game._pending_message || '', /suddenly moves/);
    assert.equal(game.level.monsters.some(mon => mon.data?.name === 'Death'), false);
    assert.equal(container.contents.includes(body), false);
    assert.equal(game.inventory.includes(body), true);
    assert.equal(body.contained, false);
    assert.equal(body.container, null);
});

test('worn gloves allow dangerous corpse take-out without fatal touch', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6138);
    const body = putObjectInContainer(container, corpse(6139, 'c', 'cockatrice'));
    game.level.objects = [container];
    game.inventory = [{
        id: 6140,
        cls: 'armor',
        glyph: '[',
        kind: 'leather gloves',
        actualKind: 'leather gloves',
        letter: 'g',
        line: 'g - a pair of leather gloves (being worn)',
        worn: true,
    }];

    await confirmSingleContainerTakeout(container, body);

    assert.doesNotMatch(game._pending_message, /fatal mistake/);
    assert.equal(container.contents.includes(body), false);
    assert.equal(game.inventory.includes(body), true);
    assert.equal(game.u.uhp, 10);
    assert.equal(game._death_cause || '', '');
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move, 1);
});

test('declined container take-out burden prompt leaves merchandise untouched', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6134);
    const contained = putObjectInContainer(container, { ...foodRation(6135), quan: 11 });
    game.level.objects = [container];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await confirmSingleContainerTakeout(container, contained);

    assert.equal(game._command_mode, 'containerTakeoutBurdenConfirm');
    assert.match(game._pending_message, /trouble removing .*Continue\? \[ynq\]/);
    assert.equal(container.contents.includes(contained), true);
    assert.equal(game.inventory.includes(contained), false);
    assert.equal(shkp.billct, 0);

    await rhack('n');

    assert.equal(game._command_mode, null);
    assert.equal(container.contents.includes(contained), true);
    assert.equal(contained.quan, 11);
    assert.equal(contained.contained, true);
    assert.equal(contained.container, container);
    assert.equal(game.inventory.includes(contained), false);
    assert.equal(contained.unpaid, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game.context.move || 0, 0);
});

test('accepted container take-out burden prompt bills after confirmation', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6137);
    const contained = putObjectInContainer(container, { ...foodRation(6138), quan: 11 });
    game.level.objects = [container];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];

    await confirmSingleContainerTakeout(container, contained);

    assert.equal(container.contents.includes(contained), true);
    assert.equal(game.inventory.includes(contained), false);
    assert.equal(shkp.billct, 0);

    await rhack('y');

    const entry = shop.shopBillEntryForObject(shkp, contained);
    assert.equal(game._command_mode, null);
    assert.equal(container.contents.includes(contained), false);
    assert.equal(game.inventory.includes(contained), true);
    assert.equal(contained.unpaid, true);
    assert.ok(entry);
    assert.equal(contained.unpaidPrice, shop.shopBillEntryTotal(entry));
    assert.match(contained.line, /unpaid, \d+ zorkmids?/);
    assert.equal(game.context.move, 1);
});

test('container take-out partial stack lifting splits before shop billing', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6140);
    const contained = putObjectInContainer(container, { ...foodRation(6141), quan: 20 });
    game.level.objects = [container];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    game.flags.pickup_burden = 'overloaded';

    await confirmSingleContainerTakeout(container, contained);

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const entry = shop.shopBillEntryForObject(shkp, carried);
    const expectedPrice = shop.shopItemPrice(carried, container.ox, container.oy);

    assert.match(game._pending_message, /can only carry some of the 20 food rations in a large box/);
    assert.equal(container.contents.includes(contained), true);
    assert.equal(contained.quan, 5);
    assert.equal(contained.unpaid, undefined);
    assert.notEqual(carried, contained);
    assert.equal(carried.quan, 15);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(carried.unpaidPrice, expectedPrice);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('container take-out partial stack clears stale unpaid fields before billing lifted part', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(61401);
    const contained = putObjectInContainer(container, { ...foodRation(61402), quan: 20 });
    contained.unpaid = true;
    contained.unpaidPrice = 999;
    game.level.objects = [container];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    game.flags.pickup_burden = 'overloaded';

    await confirmSingleContainerTakeout(container, contained);

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const entry = shop.shopBillEntryForObject(shkp, carried);
    const expectedPrice = shop.shopItemPrice(carried, container.ox, container.oy);

    assert.ok(carried);
    assert.notEqual(carried, contained);
    assert.equal(contained.quan, 5);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, undefined);
    assert.equal(carried.quan, 15);
    assert.equal(carried.unpaid, true);
    assert.ok(entry);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(carried.unpaidPrice, expectedPrice);
    assert.notEqual(carried.unpaidPrice, 999);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('container take-out partial live unpaid stack splits the bill row', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(61403);
    const contained = putObjectInContainer(container, { ...foodRation(61404), quan: 20 });
    const totalPrice = shop.shopItemPrice(contained, container.ox, container.oy);
    shop.addObjectToShopBill(shkp, contained, totalPrice);
    game.level.objects = [container];
    game.u.acurr.a = [1, 1, 10, 10, 1, 10];
    game.flags.pickup_burden = 'overloaded';

    await confirmSingleContainerTakeout(container, contained);

    const carried = game.inventory.find(item => item.kind === 'food ration');
    const parentEntry = shop.shopBillEntryForObject(shkp, contained);
    const childEntry = shop.shopBillEntryForObject(shkp, carried);

    assert.ok(carried);
    assert.notEqual(carried, contained);
    assert.equal(contained.quan, 5);
    assert.equal(carried.quan, 15);
    assert.ok(parentEntry);
    assert.ok(childEntry);
    assert.equal(parentEntry.bquan, 5);
    assert.equal(childEntry.bquan, 15);
    assert.equal(parentEntry.price, childEntry.price);
    assert.equal(shop.shopBillEntryTotal(parentEntry) + shop.shopBillEntryTotal(childEntry), totalPrice);
    assert.equal(contained.unpaidPrice, shop.shopBillEntryTotal(parentEntry));
    assert.equal(carried.unpaidPrice, shop.shopBillEntryTotal(childEntry));
    assert.equal(shkp.billct, 2);
    assert.equal(game.context.move, 1);
});

test('full inventory allows no-charge container take-out into a paid stack', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6141);
    const contained = putObjectInContainer(container, { ...dagger(6142), no_charge: true });
    game.level.objects = [container];
    fillInventoryLetters();
    const target = game.inventory[0];

    await confirmSingleContainerTakeout(container, contained, 'a', 'Weapons');

    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(container.contents.includes(contained), false);
    assert.equal(game.inventory.length, INVENTORY_LETTERS.length);
    assert.equal(game.inventory.includes(contained), false);
    assert.equal(target.quan, 2);
    assert.notEqual(target.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, target), null);
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move, 1);
});

test('full inventory allows shop-floor container take-out into a compatible unpaid stack', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6144);
    const contained = putObjectInContainer(container, dagger(6145));
    game.level.objects = [container];
    fillInventoryLetters();
    const target = game.inventory[0];
    const price = shop.shopItemPrice(contained, container.ox, container.oy);
    shop.addObjectToShopBill(shkp, target, price);

    await confirmSingleContainerTakeout(container, contained, 'a', 'Weapons');

    const entry = shop.shopBillEntryForObject(shkp, target);
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(container.contents.includes(contained), false);
    assert.equal(game.inventory.length, INVENTORY_LETTERS.length);
    assert.equal(game.inventory.includes(contained), false);
    assert.equal(target.quan, 2);
    assert.equal(target.unpaid, true);
    assert.equal(entry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(entry), price * 2);
    assert.equal(target.unpaidPrice, price * 2);
    assert.match(target.line, new RegExp(`unpaid, ${price * 2} zorkmids?`));
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('full inventory treats stale unpaid take-out source as current shop merchandise for merge', async () => {
    const { shkp } = installCommandShopState();
    const container = shopFloorContainer(6146);
    const contained = putObjectInContainer(container, dagger(6147));
    contained.unpaid = true;
    contained.unpaidPrice = 999;
    game.level.objects = [container];
    fillInventoryLetters();
    const target = game.inventory[0];
    const price = shop.shopItemPrice(contained, container.ox, container.oy);
    shop.addObjectToShopBill(shkp, target, price);

    await confirmSingleContainerTakeout(container, contained, 'a', 'Weapons');

    const entry = shop.shopBillEntryForObject(shkp, target);
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(container.contents.includes(contained), false);
    assert.equal(game.inventory.length, INVENTORY_LETTERS.length);
    assert.equal(game.inventory.includes(contained), false);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, undefined);
    assert.equal(target.quan, 2);
    assert.equal(target.unpaid, true);
    assert.equal(entry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(entry), price * 2);
    assert.equal(target.unpaidPrice, price * 2);
    assert.equal(shkp.billct, 1);
    assert.equal(game.context.move, 1);
});

test('taking gold from a shop-floor container charges debt and merges into hero gold', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6151);
    const contained = putObjectInContainer(container, goldPieces(6152, 12));
    const wallet = goldPieces(6153, 3);
    shkp.credit = 5;
    game._goldCount = 3;
    game.inventory = [wallet];
    game.level.objects = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(container.contents.length, 0);
    assert.equal(game._goldCount, 15);
    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], wallet);
    assert.equal(wallet.quan, 15);
    assert.equal(contained.contained, false);
    assert.equal(contained.container, null);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.match(line, /12 gold pieces/);
});

test('taking a nested shop-floor container bills recursive contents and charges contained gold', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6161);
    const bag = sack(6162);
    const ration = putObjectInContainer(bag, foodRation(6163));
    const inner = sack(6164);
    const blade = putObjectInContainer(inner, dagger(6165));
    const coins = putObjectInContainer(inner, goldPieces(6166, 12));
    putObjectInContainer(bag, inner);
    putObjectInContainer(source, bag);
    shkp.credit = 5;
    shkp.debit = 2;
    shkp.loan = 2;
    game.level.objects = [source];

    shop.removeContainedObject(source, bag);
    const line = shop.addContainerTakeoutObjectToInventory(source, bag);

    assert.equal(game.inventory.includes(bag), true);
    assertBillRowsFor(shkp, [bag, ration, inner, blade]);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 9);
    assert.equal(shkp.loan, 9);
    assert.match(line, /unpaid/);
});

test('taking a nested shop-floor container bills stale field-only recursive contents', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6167);
    const bag = sack(6168);
    const ration = putObjectInContainer(bag, foodRation(6169));
    bag.no_charge = true;
    ration.unpaid = true;
    ration.unpaidPrice = 999;
    putObjectInContainer(source, bag);
    game.level.objects = [source];
    const expectedPrice = shop.shopItemPrice(ration, source.ox, source.oy);

    shop.removeContainedObject(source, bag);
    const line = shop.addContainerTakeoutObjectToInventory(source, bag);
    const rationEntry = shop.shopBillEntryForObject(shkp, ration);

    assert.equal(game.inventory.includes(bag), true);
    assert.notEqual(bag.unpaid, true);
    assert.ok(rationEntry);
    assert.equal(shop.shopBillEntryTotal(rationEntry), expectedPrice);
    assert.equal(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, expectedPrice);
    assert.notEqual(ration.unpaidPrice, 999);
    assert.equal(shkp.billct, 1);
    assert.doesNotMatch(line, /sack \(unpaid/);
});

test('taking no-charge contents from a shop-floor container does not bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6201);
    const contained = putObjectInContainer(container, foodRation(6202));
    contained.no_charge = true;
    game.level.objects = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(game.inventory.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.no_charge, false);
    assert.doesNotMatch(line, /unpaid/);
});

test('taking contents from a carried container does not use shop-floor billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6301);
    container.letter = 'b';
    const contained = putObjectInContainer(container, foodRation(6302));
    game.inventory = [container];

    shop.removeContainedObject(container, contained);
    const line = shop.addContainerTakeoutObjectToInventory(container, contained);

    assert.equal(game.inventory.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
    assert.doesNotMatch(line, /unpaid/);
});

test('putting a whole unpaid item into a shop-floor container returns it to shop billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6401);
    const item = foodRation(6402, 'a');
    shop.addObjectToShopBill(shkp, item, 45);
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(item), false);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.contained, true);
    assert.equal(item.container, container);
    assert.equal(item.unpaid, false);
    assert.equal(item.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, item), null);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('putting gold into a shop-floor container pays debt before adding excess credit', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6451);
    const wallet = goldPieces(6452, 20);
    shkp.credit = 3;
    shkp.debit = 7;
    shkp.loan = 7;
    game._goldCount = 20;
    game.inventory = [wallet];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, wallet, 12);

    assert.equal(result.moved, true);
    assert.match(result.message, /Your debt is paid off/);
    assert.match(result.message, /5 zorkmids added to your credit/);
    assert.equal(game._goldCount, 8);
    assert.equal(wallet.quan, 8);
    assert.equal(container.contents.length, 1);
    assert.equal(container.contents[0].quan, 12);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 8);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopkeeperCash(shkp), 100);
});

test('putting gold into a shop-floor container for angry or robbed shopkeepers does not donate', () => {
    const { shkp } = installShopState();
    const angryContainer = shopFloorContainer(6453);
    const angryWallet = goldPieces(6454, 20);
    shkp.angry = true;
    shkp.debit = 7;
    shkp.loan = 7;
    game._goldCount = 20;
    game.inventory = [angryWallet];
    game.level.objects = [angryContainer];

    const angry = shop.putInventoryObjectIntoContainer(angryContainer, angryWallet, 8);

    assert.equal(angry.moved, true);
    assert.match(angry.message, /smirks/);
    assert.equal(game._goldCount, 12);
    assert.equal(angryContainer.contents[0].quan, 8);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.credit || 0, 0);

    shkp.angry = false;
    shkp.robbed = 20;
    const robbedContainer = shopFloorContainer(6455);
    const robbedWallet = goldPieces(6456, 12);
    game._goldCount = 12;
    game.inventory = [robbedWallet];
    game.level.objects = [robbedContainer];

    const robbed = shop.putInventoryObjectIntoContainer(robbedContainer, robbedWallet, 5);

    assert.equal(robbed.moved, true);
    assert.match(robbed.message, /contribution/);
    assert.equal(game._goldCount, 7);
    assert.equal(robbedContainer.contents[0].quan, 5);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.credit || 0, 0);
});

test('putting a carried container with contents into a shop-floor container donates contained gold', () => {
    const { shkp } = installShopState();
    const target = shopFloorContainer(6461);
    const bag = sack(6462, 'b');
    const inner = sack(6463);
    const ration = putObjectInContainer(inner, foodRation(6464));
    const coins = putObjectInContainer(inner, goldPieces(6465, 9));
    putObjectInContainer(bag, inner);
    shkp.credit = 1;
    shkp.debit = 5;
    shkp.loan = 5;
    game.inventory = [bag];
    game.level.objects = [target];

    const prompt = shop.putInventoryObjectIntoContainer(target, bag);
    assert.equal(prompt.pendingSale.prompt, true);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.moved, true);
    assert.equal(game.inventory.includes(bag), false);
    assert.equal(target.contents.includes(bag), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shkp.credit, 5);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(bag.no_charge, true);
    assert.equal(inner.no_charge, true);
    assert.equal(ration.no_charge, true);
    assert.notEqual(coins.unpaid, true);
});

test('putting part of an unpaid stack into a shop-floor container reduces only the live bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6501);
    const stack = { ...dagger(6502, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, stack, 1);
    const contained = container.contents[0];
    const parentEntry = shop.shopBillEntryForObject(shkp, stack);

    assert.equal(result.moved, true);
    assert.equal(stack.quan, 2);
    assert.equal(contained.quan, 1);
    assert.notEqual(contained.id, stack.id);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, undefined);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 10);
    assert.match(stack.line, /unpaid, 10 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('putting unpaid merchandise into an outside-shop container preserves the debt', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const container = shopFloorContainer(6601, 9, 5);
    const item = foodRation(6602, 'a');
    shop.addObjectToShopBill(shkp, item, 45);
    game.inventory = [item];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, item);

    assert.equal(result.moved, true);
    assert.equal(container.contents.includes(item), true);
    assert.equal(item.unpaid, true);
    assert.equal(item.unpaidPrice, 45);
    assert.equal(shop.shopBillEntryForObject(shkp, item), shkp.bill[0]);
    assert.equal(shkp.billct, 1);
});

test('putting paid and no-charge items into a shop-floor container does not create debt', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6701);
    const paid = dagger(6702, 'd');
    const free = foodRation(6703, 'e');
    free.no_charge = true;
    game.inventory = [paid, free];
    game.level.objects = [container];

    const paidPrompt = shop.putInventoryObjectIntoContainer(container, paid);
    assert.equal(paidPrompt.moved, false);
    assert.equal(paidPrompt.pendingSale.prompt, true);
    assert.equal(shop.finishShopFloorContainerPutSale(paidPrompt.pendingSale, false).moved, true);
    assert.equal(shop.putInventoryObjectIntoContainer(container, free).moved, true);

    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.notEqual(paid.unpaid, true);
    assert.notEqual(free.unpaid, true);
    assert.equal(paid.no_charge, true);
    assert.equal(free.no_charge, true);
    assert.equal(game._goldCount, 0);
});

test('putting an unsaleable paid item into a shop-floor container reports uninterested', () => {
    const { shkp } = installShopState();
    makeCandleShop(shkp);
    const container = shopFloorContainer(6704);
    const paper = blankScroll(6705);
    game.inventory = [paper];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, paper);

    assert.equal(result.moved, true);
    assert.equal(result.pendingSale, undefined);
    assert.match(result.message, /Izchak seems uninterested\./);
    assert.match(result.message, /You put a scroll of blank paper into the large box\./);
    assert.equal(container.contents.includes(paper), true);
    assert.equal(paper.no_charge, true);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('putting saleable goods into a shop-floor container with a full bill reports uninterested', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6710);
    const paid = dagger(6711);
    shkp.bill = Array.from({ length: 200 }, (_, index) => ({
        bo_id: `full-${index}`,
        price: 1,
        bquan: 1,
        totalPrice: 1,
    }));
    shkp.billct = shkp.bill.length;
    game.inventory = [paid];
    game.level.objects = [container];

    const result = shop.putInventoryObjectIntoContainer(container, paid);

    assert.equal(result.moved, true);
    assert.equal(result.pendingSale, undefined);
    assert.match(result.message, /Izchak seems uninterested\./);
    assert.equal(container.contents.includes(paid), true);
    assert.equal(paid.no_charge, true);
    assert.equal(shkp.bill.length, 200);
    assert.equal(shkp.billct, 200);
});

test('shop-floor container put-in does not merge no-charge goods into chargeable stacks', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6801);
    const stocked = { ...dagger(6802), letter: undefined, line: undefined };
    const paid = dagger(6803, 'd');
    container.contents = [stocked];
    stocked.contained = true;
    stocked.container = container;
    game.inventory = [paid];
    game.level.objects = [container];

    const prompt = shop.putInventoryObjectIntoContainer(container, paid);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.moved, true);
    assert.equal(container.contents.length, 2);
    assert.equal(stocked.no_charge, undefined);
    assert.equal(paid.no_charge, true);
    assert.equal(shkp.billct, 0);
});

test('tipping merchandise from a shop-floor container to the floor returns it to shop stock', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6901);
    const contained = putObjectInContainer(container, foodRation(6902));
    game.level.objects = [container];

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /Objects spill|An object spills/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(contained.ox, 5);
    assert.equal(contained.oy, 5);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('tipping shop-floor merchandise into lava preserves a used-up bill row', () => {
    const { shkp } = installShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: LAVAPOOL });
    const container = shopFloorContainer(6905);
    const contained = putObjectInContainer(container, foodRation(6906));
    game.level.objects = [container];
    const price = shop.shopItemPrice(contained, 5, 5);

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /spills out/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(container), true);
    assert.equal(game.level.objects.includes(contained), false);
    assert.equal(contained.unpaid, false);
    assert.equal(contained.unpaidPrice, undefined);
    assertUsedUpBillForObject(shkp, contained, price);
});

test('tipping shop-floor acid potion into water preserves a used-up bill row', () => {
    const { shkp } = installShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: POOL });
    const container = shopFloorContainer(6907);
    const contained = putObjectInContainer(container, acidPotion(6908));
    game.level.objects = [container];
    const price = shop.shopItemPrice(contained, 5, 5);

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /potion explodes/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(contained), false);
    assert.equal(contained.unpaid, false);
    assertUsedUpBillForObject(shkp, contained, price);
});

test('tipping shop-floor potion onto hot ground preserves a used-up bill row', () => {
    const { shkp } = installShopState();
    initRng(4);
    game.level.flags = { temperature: 1 };
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const container = shopFloorContainer(6909);
    const contained = putObjectInContainer(container, healingPotion(6910));
    game.level.objects = [container];
    const price = shop.shopItemPrice(contained, 5, 5);

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /shattering noise|shatters from the heat/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(contained), false);
    assert.equal(contained.unpaid, false);
    assertUsedUpBillForObject(shkp, contained, price);
});

test('tipping no-charge contents from a shop-floor container clears no-charge without billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6911);
    const contained = putObjectInContainer(container, foodRation(6912));
    contained.no_charge = true;
    game.level.objects = [container];

    shop.tipContainerToFloor(container);

    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
    assert.equal(contained.no_charge, false);
});

test('tipping lost merchandise from a cursed shop-floor magic bag charges debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6916);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6917));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.length, 0);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping lost container from a cursed shop-floor magic bag ignores contained gold', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69161);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(69162));
    putObjectInContainer(nested, goldPieces(69163, 17));
    const expected = shop.shopItemPrice(nested, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(shkp.debit, expected);
    assert.notEqual(shkp.debit, expected + 17);
    assert.equal(shkp.billct, 0);
});

test('tipping lost container from a cursed shop-floor magic bag ignores unbilled nested contents', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69169);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(69170));
    const blade = putObjectInContainer(nested, dagger(69171));
    const expected = shop.shopItemPrice(nested, 5, 5);
    const overbilled = expected + shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(shkp.debit, expected);
    assert.notEqual(shkp.debit, overbilled);
    assert.equal(shkp.billct, 0);
});

test('tipping no-charge lost container with only gold from a cursed shop-floor magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69164);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(69165));
    nested.no_charge = true;
    putObjectInContainer(nested, goldPieces(69166, 17));
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping no-charge lost container with unbilled nested contents from a cursed shop-floor magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69172);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(69173));
    nested.no_charge = true;
    putObjectInContainer(nested, dagger(69174));
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping direct gold lost from a cursed shop-floor magic bag still charges coin value', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69167);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    putObjectInContainer(source, goldPieces(69168, 17));
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), /owe 17 zorkmids? for lost merchandise/);
    assert.equal(shkp.debit, 17);
    assert.equal(shkp.billct, 0);
});

test('tipping unpaid lost merchandise from a cursed shop-floor magic bag removes bill row and consumes credit first', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6918);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(6919));
    shop.addObjectToShopBill(shkp, ration, 45);
    shkp.credit = 10;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 35 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 35);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping lost merchandise from a cursed shop-floor magic bag routes angry shopkeeper value to robbed', () => {
    const { shkp } = installShopState();
    initRng(17);
    shkp.angry = true;
    const source = bagOfHolding(6920);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6923));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(shkp.robbed, expected);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.notEqual(blade.no_charge, true);
});

test('tipping no-charge lost contents from a cursed shop-floor magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6924);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6925));
    blade.no_charge = true;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping stale unpaid shop-floor magic bag contents uses current shop price', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69241);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(69242));
    ration.unpaid = true;
    ration.unpaidPrice = 999;
    const expected = shop.shopItemPrice(ration, 5, 5);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(shkp.debit, expected);
    assert.notEqual(shkp.debit, 999);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
});

test('tipping unbilled partly eaten food from a cursed shop-floor magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6926);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(6927));
    ration.oeaten = 400;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(source.contents.includes(ration), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping billed partly eaten food from a cursed shop-floor magic bag converts bill row to debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6926);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(6927));
    ration.oeaten = 400;
    shop.addObjectToShopBill(shkp, ration, 45);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 45 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.debit, 45);
    assert.equal(shkp.billct, 0);
});

test('tipping nested unbilled partly eaten food from a cursed shop-floor magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6926);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(6927));
    nested.no_charge = true;
    const ration = putObjectInContainer(nested, foodRation(6928));
    ration.oeaten = 400;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping nested billed partly eaten food from a cursed shop-floor magic bag converts bill row', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6926);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(6927));
    nested.no_charge = true;
    const ration = putObjectInContainer(nested, foodRation(6928));
    ration.oeaten = 400;
    shop.addObjectToShopBill(shkp, ration, 45);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 45 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(shkp.debit, 45);
    assert.equal(shkp.billct, 0);
});

test('looting a cursed shop-floor magic bag loses merchandise before empty handling', async () => {
    const { shkp } = installCommandShopState();
    initRng(17);
    const source = bagOfHolding(6927);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6928));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    await rhack('#');
    await rhack('l');
    await rhack('\n');
    assert.equal(game._command_mode, 'floorBagAction');

    assert.match(game._pending_message, /vanished/);
    assert.match(game._pending_message, new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.length, 0);
    assert.equal(source.contents.includes(blade), false);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move, 1);
    assert.ok((game._overlay_lines || []).some(row => row[2] === 'q * done'));

    await rhack(' ');
    await rhack('o');

    assert.match(game._pending_message, /bag is now empty/i);
    assert.equal(game._command_mode, null);
});

test('looting a cursed shop-floor magic bag ignores unbilled nested contents in a lost container', async () => {
    const { shkp } = installCommandShopState();
    initRng(17);
    const source = bagOfHolding(69301);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(69302));
    const blade = putObjectInContainer(nested, dagger(69303));
    const expected = shop.shopItemPrice(nested, 5, 5);
    const overbilled = expected + shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    await rhack('#');
    await rhack('l');
    await rhack('\n');

    assert.equal(game._command_mode, 'floorBagAction');
    assert.match(game._pending_message, /vanished/);
    assert.match(game._pending_message, new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.includes(nested), false);
    assert.equal(source.contents.length, 0);
    assert.equal(shkp.debit, expected);
    assert.notEqual(shkp.debit, overbilled);
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move, 1);
});

test('looking inside a cursed shop-floor magic bag loses merchandise before contents display', async () => {
    const { shkp } = installCommandShopState();
    initRng(17);
    const source = bagOfHolding(6926);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6929));
    const ration = putObjectInContainer(source, foodRation(6934));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [source];

    await rhack('#');
    await rhack('l');
    await rhack('\n');
    assert.equal(game._command_mode, 'floorBagAction');

    assert.match(game._pending_message, /vanished/);
    assert.match(game._pending_message, new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.includes(blade), false);
    assert.equal(source.contents.includes(ration), true);
    assert.equal(source.contents.length, 1);
    assert.equal(shkp.debit, expected);
    assert.equal(game.context.move, 1);

    await rhack(' ');
    await rhack(':');

    assert.equal(game._command_mode, 'simpleOverlay');
    assert.ok((game._overlay_lines || []).some(row => String(row[2] || '').includes('food ration')));
});

test('looting no-charge cursed shop-floor magic bag contents vanishes without turn-cost debt', async () => {
    const { shkp } = installCommandShopState();
    initRng(17);
    const source = bagOfHolding(6935);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6936));
    blade.no_charge = true;
    game.level.objects = [source];

    await rhack('#');
    await rhack('l');
    await rhack('\n');

    assert.equal(game._command_mode, 'floorBagAction');
    assert.match(game._pending_message, /vanished/);
    assert.doesNotMatch(game._pending_message, /lost merchandise/);
    assert.equal(source.contents.includes(blade), false);
    assert.equal(source.contents.length, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(game.context.move || 0, 0);
    assert.ok((game._overlay_lines || []).some(row => row[2] === 'q * do nothing'));
});

test('putting a paid cancellation wand into a shop-floor magic bag prompts before explosion', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(6928);
    const wand = cancellationWand(6929);
    source.ox = 5;
    source.oy = 5;
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];
    const cashBefore = shop.shopkeeperCash(shkp);

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.moved, false);
    assert.equal(result.pendingSale.prompt, true);
    assert.match(result.message, /Sell it\?/);
    assert.equal(game.inventory.includes(wand), true);
    assert.equal(game.level.objects.includes(source), true);
    assert.equal(source.contents.length, 0);
    assert.equal(game.u.uhp, 100);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore);
    assert.equal(shkp.billct, 0);
});

test('accepting sale before shop-floor magic bag explosion bills only the destroyed bag', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(6940);
    const wand = cancellationWand(6941);
    source.ox = 5;
    source.oy = 5;
    game.u.uhp = 100;
    game._goldCount = 5;
    game.inventory = [wand];
    game.level.objects = [source];
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);
    const expectedOffer = shop.shopSaleOffer(wand, shkp);
    const cashBefore = shop.shopkeeperCash(shkp);

    const prompt = shop.putInventoryObjectIntoContainer(source, wand);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, true);

    assert.equal(result.moved, true);
    assert.equal(result.bagGone, true);
    const saleIndex = result.message.indexOf('You sell');
    const explosionIndex = result.message.indexOf('magical explosion');
    assert.ok(saleIndex >= 0);
    assert.ok(explosionIndex > saleIndex);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(game.level.objects.includes(source), false);
    assert.notEqual(wand.no_charge, true);
    assert.equal(game._goldCount, 5 + expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore - expectedOffer);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
});

test('declining sale before shop-floor magic bag explosion leaves only the destroyed bag on the bill', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(6942);
    const wand = cancellationWand(6943);
    source.ox = 5;
    source.oy = 5;
    game.u.uhp = 100;
    game._goldCount = 5;
    game.inventory = [wand];
    game.level.objects = [source];
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);
    const cashBefore = shop.shopkeeperCash(shkp);

    const prompt = shop.putInventoryObjectIntoContainer(source, wand);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.moved, true);
    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(game.level.objects.includes(source), false);
    assert.equal(wand.no_charge, true);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
});

test('accepting sale of paid container with unpaid trigger contents clears contents before shop-floor magic bag explosion', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(69418);
    const outer = sack(69419, 's');
    const wand = putObjectInContainer(outer, cancellationWand(69420));
    source.ox = 5;
    source.oy = 5;
    shop.addObjectToShopBill(shkp, wand, 45);
    game.u.uhp = 100;
    game._goldCount = 5;
    game.inventory = [outer];
    game.level.objects = [source];
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);
    const expectedOffer = shop.shopSaleOffer(outer, shkp);
    const cashBefore = shop.shopkeeperCash(shkp);

    const prompt = shop.putInventoryObjectIntoContainer(source, outer);
    assert.equal(prompt.pendingSale.prompt, true);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, true);

    assert.equal(result.moved, true);
    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /You sell/);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(outer), false);
    assert.equal(game.level.objects.includes(source), false);
    assert.equal(shop.shopBillEntryForObject(shkp, outer), null);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.notEqual(wand.unpaid, true);
    assert.equal(game._goldCount, 5 + expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore - expectedOffer);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(wand.id)), false);
});

test('declining sale of paid container with unpaid trigger contents clears contents before shop-floor magic bag explosion', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(69421);
    const outer = sack(69422, 's');
    const wand = putObjectInContainer(outer, cancellationWand(69423));
    source.ox = 5;
    source.oy = 5;
    shop.addObjectToShopBill(shkp, wand, 45);
    game.u.uhp = 100;
    game._goldCount = 5;
    game.inventory = [outer];
    game.level.objects = [source];
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);

    const prompt = shop.putInventoryObjectIntoContainer(source, outer);
    assert.equal(prompt.pendingSale.prompt, true);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.moved, true);
    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(outer), false);
    assert.equal(game.level.objects.includes(source), false);
    assert.equal(shop.shopBillEntryForObject(shkp, outer), null);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.notEqual(wand.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(wand.id)), false);
});

test('shop-floor magic bag explosion charges contents destroyed by the bag blast as lost merchandise', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = bagOfHolding(6930);
    const wand = cancellationWand(6934);
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6935));
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);
    const expectedBladePrice = shop.shopItemPrice(blade, 5, 5);
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];

    const prompt = shop.putInventoryObjectIntoContainer(source, wand);
    assert.equal(prompt.pendingSale.prompt, true);
    const result = shop.finishShopFloorContainerPutSale(prompt.pendingSale, false);

    assert.equal(result.bagGone, true);
    assert.equal(game.level.objects.includes(source), false);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.debit, expectedBladePrice);
    assert.equal(shkp.loan || 0, 0);
    assert.equal(shkp.billct, 1);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
});

test('unpaid cancellation wand that explodes a shop-floor magic bag remains as a used-up bill row', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(6936);
    const wand = cancellationWand(6937);
    source.ox = 5;
    source.oy = 5;
    shop.addObjectToShopBill(shkp, wand, 45);
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.inventory.includes(wand), false);
    assert.notEqual(wand.unpaid, true);
    assert.equal(wand.unpaidPrice, undefined);
    const wandEntry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(wandEntry);
    assert.equal(wandEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(wandEntry), 45);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shkp.billct, 2);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(wand.id)), true);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
});

test('stale unpaid cancellation wand that explodes a shop-floor magic bag does not create trigger bill', () => {
    const { shkp } = installShopState();
    const source = bagOfHolding(69361);
    const wand = cancellationWand(69371);
    source.ox = 5;
    source.oy = 5;
    wand.unpaid = true;
    wand.unpaidPrice = 999;
    game.u.uhp = 100;
    game.inventory = [wand];
    game.level.objects = [source];
    const expectedBagPrice = shop.shopItemPrice(source, 5, 5);

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    const bagEntry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(bagEntry);
    assert.equal(bagEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(bagEntry), expectedBagPrice);
    assert.equal(shkp.billct, 1);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(wand.id)), false);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(source.id)), true);
});

test('tipping unpaid lost contents from a carried cursed magic bag converts the bill to debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6938);
    source.cursed = true;
    const ration = putObjectInContainer(source, foodRation(6939));
    shop.addObjectToShopBill(shkp, ration, 45);
    shkp.credit = 10;
    game.inventory = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 35 zorkmids? for lost merchandise/);
    assert.equal(source.contents.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 35);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('tipping stale unpaid lost contents from a carried cursed magic bag does not bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69383);
    source.cursed = true;
    const ration = putObjectInContainer(source, foodRation(69384));
    ration.unpaid = true;
    ration.unpaidPrice = 999;
    game.inventory = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(source.contents.length, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('applying carried cursed magic bag with no-charge known contents vanishes without turn cost', async () => {
    const { shkp } = installCommandShopState();
    initRng(17);
    const source = bagOfHolding(69385);
    source.cursed = true;
    const blade = putObjectInContainer(source, dagger(69386));
    blade.no_charge = true;
    blade.dknown = true;
    game.inventory = [source];

    await rhack('a');
    await rhack('b');

    assert.equal(game._command_mode, 'bagAction');
    assert.match(game._pending_message, /A dagger has vanished!/);
    assert.doesNotMatch(game._pending_message, /lost merchandise/);
    assert.equal(source.contents.includes(blade), false);
    assert.equal(source.contents.length, 0);
    assert.equal(source.cknown, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(game.context.move || 0, 0);
});

test('applying carried cursed magic bag reports unknown lost contents by sight', async () => {
    installCommandShopState();
    initRng(17);
    const source = bagOfHolding(69387);
    source.cursed = true;
    const blade = putObjectInContainer(source, dagger(69388));
    blade.no_charge = true;
    blade.dknown = false;
    game.inventory = [source];

    await rhack('a');
    await rhack('b');

    assert.match(game._pending_message, /You see a dagger disappear!/);
    assert.doesNotMatch(game._pending_message, /has vanished|lost merchandise/);
    assert.equal(game.context.move || 0, 0);
});

test('applying carried cursed magic bag reports unknown lost contents while blind', async () => {
    installCommandShopState();
    initRng(17);
    game.u.blind = true;
    const source = bagOfHolding(69389);
    source.cursed = true;
    const blade = putObjectInContainer(source, dagger(69390));
    blade.no_charge = true;
    blade.dknown = false;
    game.inventory = [source];

    await rhack('a');
    await rhack('b');

    assert.match(game._pending_message, /You notice a dagger disappear!/);
    assert.doesNotMatch(game._pending_message, /has vanished|lost merchandise/);
    assert.equal(game.context.move || 0, 0);
});

test('applying carried cursed magic bag charges a turn for billed lost merchandise', async () => {
    const { shkp } = installCommandShopState();
    initRng(17);
    const source = bagOfHolding(69391);
    source.cursed = true;
    const ration = putObjectInContainer(source, foodRation(69392));
    ration.dknown = true;
    shop.addObjectToShopBill(shkp, ration, 45);
    game.inventory = [source];

    await rhack('a');
    await rhack('b');

    assert.equal(game._command_mode, 'bagAction');
    assert.match(game._pending_message, /A food ration has vanished!/);
    assert.match(game._pending_message, /owe 45 zorkmids? for lost merchandise/);
    assert.equal(source.contents.includes(ration), false);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.debit, 45);
    assert.equal(game.context.move, 1);
});

test('tipping unpaid lost contents from a carried cursed magic bag outside a shop preserves a used-up bill', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(69381);
    source.cursed = true;
    const ration = putObjectInContainer(source, foodRation(69382));
    shop.addObjectToShopBill(shkp, ration, 45);
    shkp.credit = 10;
    game.inventory = [source];
    game.u.ux = 1;
    game.u.uy = 1;
    game.level.at = (x, y) => ({
        roomno: (x === 5 && y === 5) || (x === 6 && y === 5) ? ROOMOFFSET : 0,
        typ: ROOM,
    });

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(source.contents.length, 0);
    assert.notEqual(ration.unpaid, true);
    assert.equal(shkp.credit, 10);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, ration);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(ration.id)), true);
});

test('paid carried container lost from a cursed magic bag preserves nested unpaid contents as used-up bills', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6940);
    const inner = sack(6941);
    const ration = putObjectInContainer(inner, foodRation(6942));
    source.cursed = true;
    putObjectInContainer(source, inner);
    shop.addObjectToShopBill(shkp, ration, 45);
    game.inventory = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /vanished/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, ration);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.notEqual(ration.unpaid, true);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(ration.id)), true);
});

test('carried magic bag explosion converts unpaid contents destroyed by the blast to debt', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = bagOfHolding(6943);
    const wand = cancellationWand(6944);
    const blade = putObjectInContainer(source, dagger(6945));
    const expected = 45;
    shop.addObjectToShopBill(shkp, blade, expected);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
});

test('carried magic bag explosion outside a shop preserves unpaid blast-lost contents as used-up bills', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = bagOfHolding(69431);
    const wand = cancellationWand(69432);
    const blade = putObjectInContainer(source, dagger(69433));
    const expected = 45;
    shop.addObjectToShopBill(shkp, blade, expected);
    game.u.uhp = 100;
    game.u.ux = 1;
    game.u.uy = 1;
    game.level.at = (x, y) => ({
        roomno: (x === 5 && y === 5) || (x === 6 && y === 5) ? ROOMOFFSET : 0,
        typ: ROOM,
    });
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.match(result.messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(wand), false);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, blade);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expected);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(blade.id)), true);
});

test('unpaid carried magic bag destroyed by its own explosion remains as a used-up bill', () => {
    const { shkp } = installShopState();
    initRng(1);
    const source = bagOfHolding(6946);
    const wand = cancellationWand(6947);
    shop.addObjectToShopBill(shkp, source, 100);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.inventory.includes(source), false);
    assert.notEqual(source.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, source);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(source.id)), true);
});

test('carried magic bag scatter break preserves unpaid destroyed contents as used-up bills', () => {
    const { shkp } = installShopState();
    initRng(1);
    const source = bagOfHolding(6948);
    const wand = cancellationWand(6949);
    const thrownEgg = putObjectInContainer(source, egg(6950));
    shop.addObjectToShopBill(shkp, thrownEgg, 45);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.level.objects.includes(thrownEgg), false);
    assert.notEqual(thrownEgg.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, thrownEgg);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(thrownEgg.id)), true);
});

test('carried magic bag scatter splits unpaid stacks before preserving used-up bills', () => {
    const { shkp } = installShopState();
    initRng(1);
    const source = bagOfHolding(6951);
    const wand = cancellationWand(6952);
    const eggs = putObjectInContainer(source, egg(6953, 'e', 2));
    shop.addObjectToShopBill(shkp, eggs, 90);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(source.contents.length, 0);
    assert.equal(game.level.objects.some(obj => obj.kind === 'egg'), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 2);
    assert.equal(shkp.bill.every(entry => entry.useup), true);
    assert.equal(shkp.bill.reduce((sum, entry) => sum + shop.shopBillEntryTotal(entry), 0), 90);
    const originalEntry = shop.shopBillEntryForObject(shkp, eggs);
    assert.ok(originalEntry);
    assert.equal(originalEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(originalEntry), 45);
});

test('carried magic bag scatter into lava preserves unpaid landing destruction as used-up bill', () => {
    const { shkp } = installShopState();
    initRng(2);
    game.level.at = (x, y) => ({
        typ: x === 5 && y === 5 ? ROOM : LAVAPOOL,
        roomno: x === 5 && y === 5 ? ROOMOFFSET : 0,
        doormask: 0,
    });
    const source = bagOfHolding(6957);
    const wand = cancellationWand(6958);
    const ration = putObjectInContainer(source, foodRation(6959));
    shop.addObjectToShopBill(shkp, ration, 45);
    game.u.uhp = 100;
    game.inventory = [source, wand];

    const result = shop.putInventoryObjectIntoContainer(source, wand);

    assert.equal(result.bagGone, true);
    assert.equal(game.level.objects.includes(ration), false);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, ration);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(ration.id)), true);
});

test('unpaid trigger object destroyed by tipping into a carried magic bag remains as a used-up bill', () => {
    const { shkp } = installShopState();
    const source = sack(6954);
    const target = bagOfHolding(6955);
    const wand = putObjectInContainer(source, cancellationWand(6956));
    shop.addObjectToShopBill(shkp, wand, 45);
    game.u.uhp = 100;
    game.inventory = [source, target];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(source.contents.length, 0);
    assert.notEqual(wand.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 45);
});

test('tipping shop-floor nested cancellation trigger into carried magic bag preserves billed tree', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(69561);
    const target = bagOfHolding(69562, 'b');
    const outer = putObjectInContainer(source, sack(69563));
    const wand = putObjectInContainer(outer, cancellationWand(69564));
    const outerPrice = shop.shopItemPrice(outer, 5, 5);
    const wandPrice = shop.shopItemPrice(wand, 5, 5);
    game.u.uhp = 100;
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /An object tumbles into the empty bag/);
    assert.match(messages.join(' '), /As a bag tumbles inside, you are blasted by a magical explosion/);
    assert.doesNotMatch(messages.join(' '), /lost merchandise/);
    assert.equal(game.u.uhp < 100, true);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(source.contents.includes(outer), false);
    assert.equal(game.level.objects.includes(outer), false);
    assert.equal(game.level.objects.includes(wand), false);
    assert.notEqual(outer.unpaid, true);
    assert.notEqual(wand.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 2);
    const outerEntry = shop.shopBillEntryForObject(shkp, outer);
    const wandEntry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(outerEntry);
    assert.ok(wandEntry);
    assert.equal(outerEntry.useup, true);
    assert.equal(wandEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(outerEntry), outerPrice);
    assert.equal(shop.shopBillEntryTotal(wandEntry), wandPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(outer.id)), true);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(wand.id)), true);
});

test('tipping into a magic bag explosion leaves later source contents in source', () => {
    installShopState();
    const source = sack(6962, 's');
    const target = bagOfHolding(6963, 'b');
    const wand = putObjectInContainer(source, cancellationWand(6964));
    const ration = putObjectInContainer(source, foodRation(6965));
    game.u.uhp = 100;
    game.inventory = [source, target];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /magical explosion/);
    assert.equal(source.contents.includes(wand), false);
    assert.equal(source.contents.includes(ration), true);
    assert.equal(ration.container, source);
    assert.equal(game.inventory.includes(target), false);
});

test('putting part of an unpaid carried stack into a carried bag splits the bill row', () => {
    const { shkp } = installShopState();
    const bag = sack(6960, 'b');
    const stack = foodRationStack(6961, 3, 'f');
    game.inventory = [bag, stack];
    shop.addObjectToShopBill(shkp, stack, 135);

    const result = shop.putInventoryObjectIntoBag(bag, stack, 1);

    assert.equal(result.moved, true);
    assert.equal(stack.quan, 2);
    assert.equal(bag.contents.length, 1);
    const stashed = bag.contents[0];
    assert.notEqual(stashed, stack);
    assert.notEqual(String(stashed.id), String(stack.id));
    assert.equal(stashed.quan, 1);
    assert.equal(stashed.container, bag);
    assert.equal(stashed.unpaid, true);
    assert.equal(stack.unpaid, true);
    assert.equal(shkp.billct, 2);
    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    const childEntry = shop.shopBillEntryForObject(shkp, stashed);
    assert.ok(parentEntry);
    assert.ok(childEntry);
    assert.equal(shop.shopBillEntryQuantity(parentEntry), 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 90);
    assert.equal(shop.shopBillEntryQuantity(childEntry), 1);
    assert.equal(shop.shopBillEntryTotal(childEntry), 45);
});

test('tipping contents from a carried container does not use shop-floor billing', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6921);
    container.letter = 'b';
    const contained = putObjectInContainer(container, foodRation(6922));
    game.inventory = [container];

    shop.tipContainerToFloor(container);

    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
});

test('tipping a non-floor container with stale shop coordinates does not bill', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6926);
    const contained = putObjectInContainer(container, foodRation(6927));

    shop.tipContainerToFloor(container);

    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(contained.unpaid, true);
});

test('tipping merchandise from a shop-floor container into another container keeps the bill with the moved object', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6931);
    const target = shopFloorContainer(6932);
    target.letter = 'b';
    const contained = putObjectInContainer(source, dagger(6933));
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(contained), true);
    assert.equal(contained.container, target);
    assert.equal(contained.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].bo_id, String(contained.id));
    assert.equal(contained.unpaidPrice, shop.shopBillEntryTotal(shkp.bill[0]));
});

test('tipping stale field-only unpaid merchandise from a shop-floor container bills current shop price', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6934);
    const target = sack(6935, 'b');
    const contained = putObjectInContainer(source, dagger(6936));
    contained.unpaid = true;
    contained.unpaidPrice = 999;
    game.inventory = [target];
    game.level.objects = [source];
    const expectedPrice = shop.shopItemPrice(contained, source.ox, source.oy);

    const messages = shop.tipContainerIntoContainer(source, target);
    const entry = shop.shopBillEntryForObject(shkp, contained);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(contained), true);
    assert.ok(entry);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal(contained.unpaid, true);
    assert.equal(contained.unpaidPrice, expectedPrice);
    assert.notEqual(contained.unpaidPrice, 999);
    assert.equal(shkp.billct, 1);
});

test('tipping nested shop-floor container into a carried container bills recursive contents and charges contained gold', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6936);
    const target = sack(6937, 'b');
    const bag = sack(6938);
    const inner = sack(6939);
    const blade = putObjectInContainer(inner, dagger(6940));
    const coins = putObjectInContainer(inner, goldPieces(6941, 6));
    putObjectInContainer(bag, inner);
    putObjectInContainer(source, bag);
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(target.contents.includes(bag), true);
    assert.equal(bag.container, target);
    assertBillRowsFor(shkp, [bag, inner, blade]);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.credit, 4);
    assert.equal(shkp.debit, 2);
    assert.equal(shkp.loan, 2);
});

test('tipping gold from a shop-floor container to the floor charges then donates it', () => {
    const { shkp } = installShopState();
    const container = shopFloorContainer(6941);
    const contained = putObjectInContainer(container, goldPieces(6942, 6));
    const wallet = goldPieces(6943, 4);
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game._goldCount = 4;
    game.inventory = [wallet];
    game.level.objects = [container];

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /spills/);
    assert.equal(container.contents.length, 0);
    assert.equal(game.level.objects.includes(contained), true);
    assert.equal(contained.ox, 5);
    assert.equal(contained.oy, 5);
    assert.equal(game._goldCount, 4);
    assert.equal(wallet.quan, 4);
    assert.equal(shkp.credit, 8);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.billct, 0);
});

test('tipping nested shop-floor container to the floor charges then donates contained gold and returns bill rows', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6946);
    const bag = sack(6947);
    const inner = sack(6948);
    const blade = putObjectInContainer(inner, dagger(6949));
    const coins = putObjectInContainer(inner, goldPieces(6950, 6));
    putObjectInContainer(bag, inner);
    putObjectInContainer(source, bag);
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /spills/);
    assert.equal(game.level.objects.includes(bag), true);
    assert.equal(bag.ox, 5);
    assert.equal(bag.oy, 5);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.notEqual(bag.unpaid, true);
    assert.notEqual(inner.unpaid, true);
    assert.notEqual(blade.unpaid, true);
    assert.notEqual(coins.unpaid, true);
    assert.equal(shkp.credit, 8);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
});

test('tipping gold from a shop-floor container into a carried container only charges it', () => {
    const { shkp } = installShopState();
    const source = shopFloorContainer(6951);
    const target = shopFloorContainer(6952);
    const contained = putObjectInContainer(source, goldPieces(6953, 6));
    const wallet = goldPieces(6954, 4);
    target.letter = 'b';
    shkp.credit = 10;
    shkp.debit = 2;
    shkp.loan = 2;
    game._goldCount = 4;
    game.inventory = [target, wallet];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /tumbles into/);
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(contained), true);
    assert.equal(contained.container, target);
    assert.equal(contained.ox, undefined);
    assert.equal(contained.oy, undefined);
    assert.equal(game._goldCount, 4);
    assert.equal(wallet.quan, 4);
    assert.equal(shkp.credit, 4);
    assert.equal(shkp.debit, 2);
    assert.equal(shkp.loan, 2);
    assert.equal(shkp.billct, 0);
});

test('tipping lost merchandise from a cursed shop-floor magic bag into another container charges debt', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6956);
    const target = sack(6957, 'b');
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const blade = putObjectInContainer(source, dagger(6958));
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(blade), false);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
});

test('tipping lost container from a cursed shop-floor magic bag into another container ignores unbilled nested contents', () => {
    const { shkp } = installShopState();
    initRng(17);
    const source = bagOfHolding(6959);
    const target = sack(6960, 'b');
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(6961));
    const blade = putObjectInContainer(nested, dagger(6962));
    const expected = shop.shopItemPrice(nested, 5, 5);
    const overbilled = expected + shop.shopItemPrice(blade, 5, 5);
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /vanished/);
    assert.match(messages.join(' '), new RegExp(`owe ${expected} zorkmids? for lost merchandise`));
    assert.equal(source.contents.length, 0);
    assert.equal(target.contents.includes(nested), false);
    assert.equal(target.contents.includes(blade), false);
    assert.equal(shkp.debit, expected);
    assert.notEqual(shkp.debit, overbilled);
    assert.equal(shkp.billct, 0);
});

test('non-food pickup merges compatible paid inventory stacks', () => {
    installShopState();
    const carried = dagger(7001, 'd');
    const floorObj = { ...dagger(7002), letter: undefined, line: undefined };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 0);
    assert.equal(merge.target, carried);
    const message = shop.mergePickedObjectIntoInventory(floorObj, carried);

    assert.equal(carried.quan, 2);
    assert.match(carried.line, /^d - 2 \+0 daggers/);
    assert.match(message, /2 in total/);
});

test('food-ration floor pickup merges compatible paid inventory stacks', async () => {
    installNonShopFloorState();
    const carried = { ...foodRation(7051, 'a'), bknown: false };
    const floorObj = { ...foodRation(7052), letter: undefined, line: undefined, bknown: false };
    game.inventory = [carried];
    game.level.objects = [floorObj];

    await rhack(',');

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], carried);
    assert.equal(carried.quan, 2);
    assert.match(carried.line, /^a - 2 food rations/);
    assert.equal(game.level.objects.includes(floorObj), false);
    assert.match(game._pending_message, /a - a food ration \(2 in total\)\./);
    assert.equal(game.context.move, 1);
});

test('covered simple food floor pickup merges compatible paid inventory stacks', async () => {
    installNonShopFloorState();
    const carried = { ...simpleFood(7053, 'lembas wafer', 'l'), bknown: false };
    const floorObj = { ...simpleFood(7054, 'lembas wafer'), letter: undefined, line: undefined, bknown: false };
    game.inventory = [carried];
    game.level.objects = [floorObj];

    await rhack(',');

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], carried);
    assert.equal(carried.quan, 2);
    assert.match(carried.line, /^l - 2 lembas wafers/);
    assert.equal(game.level.objects.includes(floorObj), false);
    assert.match(game._pending_message, /l - a lembas wafer \(2 in total\)\./);
    assert.equal(game.context.move, 1);
});

test('expanded simple food floor pickup merges compatible paid inventory stacks', async () => {
    const cases = [
        ['cream pie', 'cream pies', 'p'],
        ['K-ration', 'K-rations', 'k'],
        ['C-ration', 'C-rations', 'c'],
        ['apple', 'apples', 'a'],
        ['orange', 'oranges', 'o'],
        ['pear', 'pears', 'r'],
        ['melon', 'melons', 'm'],
        ['banana', 'bananas', 'b'],
        ['carrot', 'carrots', 't'],
        ['kelp frond', 'kelp fronds', 'd'],
        ['slime mold', 'slime molds', 's'],
        ['sprig of wolfsbane', 'sprigs of wolfsbane', 'w'],
        ['clove of garlic', 'cloves of garlic', 'g'],
        ['eucalyptus leaf', 'eucalyptus leaves', 'e'],
        ['lump of royal jelly', 'lumps of royal jelly', 'j'],
        ['meatball', 'meatballs', 's'],
        ['enormous meatball', 'enormous meatballs', 'n'],
        ['fortune cookie', 'fortune cookies', 'f'],
    ];

    for (const [index, [kind, plural, letter]] of cases.entries()) {
        installNonShopFloorState();
        const carried = { ...simpleFood(7060 + (index * 2), kind, letter), bknown: false };
        const floorObj = { ...simpleFood(7061 + (index * 2), kind), letter: undefined, line: undefined, bknown: false };
        game.inventory = [carried];
        game.level.objects = [floorObj];

        await rhack(',');

        assert.equal(game.inventory.length, 1);
        assert.equal(game.inventory[0], carried);
        assert.equal(carried.quan, 2);
        assert.match(carried.line, new RegExp(`^${letter} - 2 ${plural}`));
        assert.equal(game.level.objects.includes(floorObj), false);
        assert.match(game._pending_message, new RegExp(`${letter} - .*${kind} \\(2 in total\\)`, 'i'));
        assert.equal(game.context.move, 1);
    }
});

test('food-ration pickup merge rejects actual BUC mismatches even when unknown', () => {
    installShopState();
    const carried = foodRation(7061, 'a');
    const floorObj = { ...foodRation(7062), letter: undefined, line: undefined, cursed: true, bknown: false };
    carried.bknown = false;
    game.inventory = [carried];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorObj, 0), null);
    assert.equal(carried.quan, 1);
});

test('food-ration pickup merge averages source and target ages', () => {
    installShopState();
    const carried = { ...foodRation(7071, 'a'), age: 100 };
    const floorObj = { ...foodRation(7072), letter: undefined, line: undefined, age: 300 };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 0);
    assert.equal(merge.target, carried);
    shop.mergePickedObjectIntoInventory(floorObj, carried);

    assert.equal(carried.quan, 2);
    assert.equal(carried.age, 200);
});

test('food-ration pickup merge describes learned uncursed source state', () => {
    installShopState();
    const carried = { ...foodRation(7073, 'a'), bknown: true };
    const floorObj = { ...foodRation(7074), letter: undefined, line: undefined, bknown: false };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 0);
    assert.equal(merge.target, carried);
    const message = shop.mergePickedObjectIntoInventory(floorObj, carried);

    assert.equal(message, 'a - an uncursed food ration (2 in total).');
});

test('food-ration pickup merge follows C object-name compatibility', () => {
    installShopState();
    const namedTarget = { ...foodRation(7081, 'a'), oname: 'lunch' };
    const differentNamedSource = { ...foodRation(7082), letter: undefined, line: undefined, oname: 'dinner' };
    game.inventory = [namedTarget];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(differentNamedSource, 0), null);

    const unnamedTarget = foodRation(7083, 'b');
    const namedSource = { ...foodRation(7084), letter: undefined, line: undefined, oname: 'lunch' };
    game.inventory = [unnamedTarget];
    const merge = shop.findPickedObjectInventoryMergeTarget(namedSource, 0);
    assert.equal(merge.target, unnamedTarget);
    shop.mergePickedObjectIntoInventory(namedSource, unnamedTarget);

    assert.equal(unnamedTarget.quan, 2);
    assert.equal(unnamedTarget.oname, 'lunch');
    assert.match(unnamedTarget.line, /food rations named lunch/);
});

test('food-ration shop pickup merge rejects paid targets and combines same-shop unpaid bills', () => {
    const { shkp } = installShopState();
    const paidStack = foodRation(7091, 'a');
    const billableSource = { ...foodRation(7092), letter: undefined, line: undefined };
    game.inventory = [paidStack];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(billableSource, 45), null);
    assert.equal(shkp.billct, 0);

    const unpaidStack = foodRation(7093, 'b');
    shop.addObjectToShopBill(shkp, unpaidStack, 45);
    game.inventory = [unpaidStack];
    const merge = shop.findPickedObjectInventoryMergeTarget(billableSource, 45);
    assert.equal(merge.target, unpaidStack);
    shop.mergePickedObjectIntoInventory(billableSource, unpaidStack);

    assert.equal(unpaidStack.quan, 2);
    assert.equal(unpaidStack.unpaidPrice, 90);
    assert.equal(shop.shopBillEntryTotal(merge.billMerge.billEntry), 90);
    assert.match(unpaidStack.line, /unpaid, 90 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('cream pie shop pickup merge rejects paid targets and combines same-shop unpaid bills', () => {
    const { shkp } = installShopState();
    const paidStack = creamPie(7101, 'p');
    const billableSource = { ...creamPie(7102), letter: undefined, line: undefined };
    game.inventory = [paidStack];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(billableSource, 10), null);
    assert.equal(shkp.billct, 0);

    const unpaidStack = creamPie(7103, 'q');
    shop.addObjectToShopBill(shkp, unpaidStack, 10);
    game.inventory = [unpaidStack];
    const merge = shop.findPickedObjectInventoryMergeTarget(billableSource, 10);
    assert.equal(merge.target, unpaidStack);
    shop.mergePickedObjectIntoInventory(billableSource, unpaidStack);

    assert.equal(unpaidStack.quan, 2);
    assert.equal(unpaidStack.unpaidPrice, 20);
    assert.equal(shop.shopBillEntryTotal(merge.billMerge.billEntry), 20);
    assert.match(unpaidStack.line, /unpaid, 20 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('K-ration and C-ration pickup merge only with exact ration kind', () => {
    installShopState();
    const carriedK = simpleFood(7111, 'K-ration', 'k');
    const floorC = { ...simpleFood(7112, 'C-ration'), letter: undefined, line: undefined };
    game.inventory = [carriedK];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorC, 0), null);

    const floorK = { ...simpleFood(7113, 'K-ration'), letter: undefined, line: undefined };
    const merge = shop.findPickedObjectInventoryMergeTarget(floorK, 0);
    assert.equal(merge.target, carriedK);
    shop.mergePickedObjectIntoInventory(floorK, carriedK);

    assert.equal(carriedK.quan, 2);
    assert.match(carriedK.line, /^k - 2 K-rations/);
});

test('fruit pickup merge accepts same fruit and rejects different fruit', () => {
    installShopState();
    const carriedApple = simpleFood(7121, 'apple', 'a');
    const floorOrange = { ...simpleFood(7122, 'orange'), letter: undefined, line: undefined };
    game.inventory = [carriedApple];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorOrange, 0), null);

    const floorApple = { ...simpleFood(7123, 'apple'), letter: undefined, line: undefined };
    const merge = shop.findPickedObjectInventoryMergeTarget(floorApple, 0);
    assert.equal(merge.target, carriedApple);
    shop.mergePickedObjectIntoInventory(floorApple, carriedApple);

    assert.equal(carriedApple.quan, 2);
    assert.match(carriedApple.line, /^a - 2 apples/);
});

test('slime mold pickup merge requires same custom fruit id', () => {
    installShopState();
    setCurrentFruitName('kumquat');
    const kumquatId = currentFruitId();
    const carried = slimeMoldFood(7124, 'k', 'kumquat', kumquatId);
    const floorSame = { ...slimeMoldFood(7125, undefined, 'kumquat', kumquatId), letter: undefined, line: undefined };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorSame, 0);
    assert.equal(merge.target, carried);
    shop.mergePickedObjectIntoInventory(floorSame, carried);

    assert.equal(carried.quan, 2);
    assert.match(carried.line, /^k - 2 kumquats/);

    setCurrentFruitName('grapefruit');
    const grapefruitId = currentFruitId();
    const floorOther = { ...slimeMoldFood(7126, undefined, 'grapefruit', grapefruitId), letter: undefined, line: undefined };
    game.inventory = [carried];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorOther, 0), null);
    assert.equal(carried.quan, 2);
});

test('covered simple food pickup merge excludes remaining special food exceptions', () => {
    installShopState();
    const carriedPancake = simpleFood(7131, 'pancake', 'p');
    const floorPancake = { ...simpleFood(7132, 'pancake'), letter: undefined, line: undefined };
    game.inventory = [carriedPancake];

    const pancakeMerge = shop.findPickedObjectInventoryMergeTarget(floorPancake, 0);
    assert.equal(pancakeMerge.target, carriedPancake);
    shop.mergePickedObjectIntoInventory(floorPancake, carriedPancake);
    assert.equal(carriedPancake.quan, 2);

    const carriedCookie = simpleFood(7133, 'fortune cookie', 'f');
    const floorCookie = { ...simpleFood(7134, 'fortune cookie'), letter: undefined, line: undefined };
    game.inventory = [carriedCookie];

    const cookieMerge = shop.findPickedObjectInventoryMergeTarget(floorCookie, 0);
    assert.equal(cookieMerge.target, carriedCookie);
    shop.mergePickedObjectIntoInventory(floorCookie, carriedCookie);
    assert.equal(carriedCookie.quan, 2);
    assert.match(carriedCookie.line, /^f - 2 fortune cookies/);

    const carriedRoyalJelly = simpleFood(7135, 'lump of royal jelly', 'j');
    const floorRoyalJelly = { ...simpleFood(7136, 'lump of royal jelly'), letter: undefined, line: undefined };
    game.inventory = [carriedRoyalJelly];

    const royalJellyMerge = shop.findPickedObjectInventoryMergeTarget(floorRoyalJelly, 0);
    assert.equal(royalJellyMerge.target, carriedRoyalJelly);
    shop.mergePickedObjectIntoInventory(floorRoyalJelly, carriedRoyalJelly);
    assert.equal(carriedRoyalJelly.quan, 2);
    assert.match(carriedRoyalJelly.line, /^j - 2 lumps of royal jelly/);

    const carriedMeatball = simpleFood(7139, 'meatball', 's');
    const floorMeatball = { ...simpleFood(7140, 'meatball'), letter: undefined, line: undefined };
    game.inventory = [carriedMeatball];

    const meatballMerge = shop.findPickedObjectInventoryMergeTarget(floorMeatball, 0);
    assert.equal(meatballMerge.target, carriedMeatball);
    shop.mergePickedObjectIntoInventory(floorMeatball, carriedMeatball);
    assert.equal(carriedMeatball.quan, 2);
    assert.match(carriedMeatball.line, /^s - 2 meatballs/);

    const carriedEnormousMeatball = simpleFood(7141, 'enormous meatball', 'n');
    const floorEnormousMeatball = { ...simpleFood(7142, 'enormous meatball'), letter: undefined, line: undefined };
    game.inventory = [carriedEnormousMeatball];

    const enormousMeatballMerge = shop.findPickedObjectInventoryMergeTarget(floorEnormousMeatball, 0);
    assert.equal(enormousMeatballMerge.target, carriedEnormousMeatball);
    shop.mergePickedObjectIntoInventory(floorEnormousMeatball, carriedEnormousMeatball);
    assert.equal(carriedEnormousMeatball.quan, 2);
    assert.match(carriedEnormousMeatball.line, /^n - 2 enormous meatballs/);

    const carriedMeatRing = {
        ...foodRation(7143, 'm'),
        kind: 'meat ring',
        actualKind: 'meat ring',
        plural: 'meat rings',
    };
    const floorMeatRing = { ...carriedMeatRing, id: 7144, letter: undefined, line: undefined };
    game.inventory = [carriedMeatRing];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorMeatRing, 0), null);
});

test('food-ration pickup full-inventory preflight allows no-charge merge', async () => {
    const { shkp } = installCommandShopState();
    const carried = { ...foodRation(7111, 'a'), bknown: false };
    const floorObj = { ...foodRation(7112), letter: undefined, line: undefined, bknown: false, no_charge: true };
    fillInventoryLetters();
    game.inventory[0] = carried;
    game.level.objects = [floorObj];

    await rhack(',');

    assert.equal(game.inventory.length, INVENTORY_LETTERS.length);
    assert.equal(carried.quan, 2);
    assert.equal(game.level.objects.includes(floorObj), false);
    assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate/);
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move, 1);
});

test('expanded simple food pickup full-inventory preflight allows no-charge merges', async () => {
    const cases = [
        ['K-ration', 'k'],
        ['kelp frond', 'd'],
        ['sprig of wolfsbane', 'w'],
        ['clove of garlic', 'g'],
        ['eucalyptus leaf', 'e'],
        ['lump of royal jelly', 'j'],
        ['meatball', 's'],
        ['enormous meatball', 'n'],
        ['fortune cookie', 'f'],
    ];

    for (const [index, [kind, letter]] of cases.entries()) {
        const { shkp } = installCommandShopState();
        // Keep this matrix about full inventory slots, not the 400-weight enormous meatball.
        game.u.acurr.a[0] = 30;
        game.u.acurr.a[4] = 30;
        const carried = { ...simpleFood(7113 + (index * 2), kind, letter), bknown: false };
        const floorObj = { ...simpleFood(7114 + (index * 2), kind), letter: undefined, line: undefined, bknown: false, no_charge: true };
        fillInventoryLetters();
        game.inventory[0] = carried;
        game.level.objects = [floorObj];

        await rhack(',');

        assert.equal(game.inventory.length, INVENTORY_LETTERS.length, kind);
        assert.equal(carried.quan, 2, kind);
        assert.equal(game.level.objects.includes(floorObj), false, kind);
        assert.doesNotMatch(game._pending_message, /knapsack cannot accommodate/, kind);
        assert.equal(shkp.billct, 0, kind);
        assert.equal(game.context.move, 1, kind);
    }
});

test('shopBaseCost returns C prices for covered simple foods', () => {
    assert.equal(shop.shopBaseCost(simpleFood(7125, 'K-ration')), 25);
    assert.equal(shop.shopBaseCost(simpleFood(7126, 'C-ration')), 20);
    assert.equal(shop.shopBaseCost(simpleFood(7127, 'tripe ration')), 15);
    assert.equal(shop.shopBaseCost({ ...simpleFood(7128, 'tripe'), foodRoll: 140 }), 15);
    assert.equal(shop.shopBaseCost(simpleFood(7132, 'kelp frond')), 6);
    assert.equal(shop.shopBaseCost(simpleFood(7129, 'sprig of wolfsbane')), 7);
    assert.equal(shop.shopBaseCost(simpleFood(7130, 'clove of garlic')), 7);
    assert.equal(shop.shopBaseCost(simpleFood(7131, 'eucalyptus leaf')), 5);
    assert.equal(shop.shopBaseCost(slimeMoldFood(7137)), 17);
    assert.equal(shop.shopBaseCost(simpleFood(7134, 'lump of royal jelly')), 15);
    assert.equal(shop.shopBaseCost(simpleFood(7135, 'meatball')), 5);
    assert.equal(shop.shopBaseCost(meatRingFood(7138)), 1);
    assert.equal(shop.shopBaseCost(simpleFood(7136, 'enormous meatball')), 105);
    assert.equal(shop.shopBaseCost(simpleFood(7133, 'fortune cookie')), 7);
});

test('food-ration pickup full-inventory preflight rejects BUC mismatch', async () => {
    const { shkp } = installCommandShopState();
    const carried = { ...foodRation(7121, 'a'), blessed: true, bknown: false };
    const floorObj = {
        ...foodRation(7122),
        letter: undefined,
        line: undefined,
        cursed: true,
        bknown: false,
        no_charge: true,
    };
    fillInventoryLetters();
    game.inventory[0] = carried;
    game.level.objects = [floorObj];

    await rhack(',');

    assert.equal(carried.quan, 1);
    assert.equal(game.level.objects.includes(floorObj), true);
    assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(shkp.billct, 0);
});

test('simple food pickup full-inventory preflight rejects billable source into paid stack', async () => {
    const cases = [
        [
            (id, letter) => foodRation(id, letter),
            id => foodRation(id),
        ],
        [
            (id, letter) => simpleFood(id, 'fortune cookie', letter),
            id => simpleFood(id, 'fortune cookie'),
        ],
        [
            (id, letter) => simpleFood(id, 'lump of royal jelly', letter),
            id => simpleFood(id, 'lump of royal jelly'),
        ],
        [
            (id, letter) => simpleFood(id, 'meatball', letter),
            id => simpleFood(id, 'meatball'),
        ],
        [
            (id, letter) => simpleFood(id, 'enormous meatball', letter),
            id => simpleFood(id, 'enormous meatball'),
        ],
    ];

    for (const [index, [makeCarried, makeFloor]] of cases.entries()) {
        const { shkp } = installCommandShopState();
        const carried = { ...makeCarried(7131 + (index * 2), 'a'), bknown: false };
        const floorObj = { ...makeFloor(7132 + (index * 2)), letter: undefined, line: undefined, bknown: false };
        fillInventoryLetters();
        game.inventory[0] = carried;
        game.level.objects = [floorObj];

        await rhack(',');

        assert.equal(carried.quan, 1);
        assert.equal(game.level.objects.includes(floorObj), true);
        assert.notEqual(game._command_mode, 'pickupShopQuote');
        assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
        assert.equal(shkp.billct, 0);
    }
});

test('simple food pickup full-inventory preflight rejects billable source before same-shop unpaid merge', async () => {
    const cases = [
        [
            (id, letter) => foodRation(id, letter),
            id => foodRation(id),
        ],
        [
            (id, letter) => simpleFood(id, 'fortune cookie', letter),
            id => simpleFood(id, 'fortune cookie'),
        ],
        [
            (id, letter) => simpleFood(id, 'lump of royal jelly', letter),
            id => simpleFood(id, 'lump of royal jelly'),
        ],
        [
            (id, letter) => simpleFood(id, 'meatball', letter),
            id => simpleFood(id, 'meatball'),
        ],
        [
            (id, letter) => simpleFood(id, 'enormous meatball', letter),
            id => simpleFood(id, 'enormous meatball'),
        ],
    ];

    for (const [index, [makeCarried, makeFloor]] of cases.entries()) {
        const { shkp } = installCommandShopState();
        const carried = { ...makeCarried(7141 + (index * 2), 'a'), bknown: false };
        const floorObj = { ...makeFloor(7142 + (index * 2)), letter: undefined, line: undefined, bknown: false };
        const unitPrice = shop.shopItemPrice(floorObj, floorObj.ox, floorObj.oy);
        shop.addObjectToShopBill(shkp, carried, unitPrice);
        fillInventoryLetters();
        game.inventory[0] = carried;
        game.level.objects = [floorObj];

        await rhack(',');

        const entry = shop.shopBillEntryForObject(shkp, carried);
        assert.notEqual(game._command_mode, 'pickupShopQuote');
        assert.equal(game.inventory.length, INVENTORY_LETTERS.length);
        assert.equal(carried.quan, 1);
        assert.equal(game.level.objects.includes(floorObj), true);
        assert.equal(shkp.billct, 1);
        assert.equal(entry.bquan, 1);
        assert.equal(shop.shopBillEntryTotal(entry), unitPrice);
        assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
        assert.equal(game.context.move, 0);
    }
});

test('non-food shop pickup merge rejects unpaid into paid stacks', () => {
    const { shkp } = installShopState();
    const paidStack = dagger(7101, 'd');
    const floorObj = { ...dagger(7102), letter: undefined, line: undefined };
    game.inventory = [paidStack];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(floorObj, 5), null);
    assert.equal(paidStack.quan, 1);
    assert.equal(shkp.billct, 0);
});

test('non-food shop pickup merge combines compatible unpaid bill entries', () => {
    const { shkp } = installShopState();
    const unpaidStack = dagger(7201, 'd');
    shop.addObjectToShopBill(shkp, unpaidStack, 5);
    game.inventory = [unpaidStack];
    const floorObj = { ...dagger(7202), letter: undefined, line: undefined };

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 5);
    assert.equal(merge.target, unpaidStack);
    shop.mergePickedObjectIntoInventory(floorObj, unpaidStack);

    assert.equal(unpaidStack.quan, 2);
    assert.equal(unpaidStack.unpaidPrice, 10);
    assert.equal(shop.shopBillEntryTotal(merge.billMerge.billEntry), 10);
    assert.match(unpaidStack.line, /unpaid, 10 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('split shop bill entry preserves parent and child unit prices', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(8001, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, parent, 15);
    const child = { ...parent, id: 8002, quan: 1, letter: 'e', line: 'e - a +0 dagger' };

    const childEntry = shop.splitShopBillEntry(shkp, parent, child, 1);
    const parentEntry = shop.shopBillEntryForObject(shkp, parent);

    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(parent.unpaidPrice, 10);
    assert.equal(childEntry.bo_id, String(child.id));
    assert.equal(childEntry.bquan, 1);
    assert.equal(childEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(childEntry), 5);
    assert.equal(child.unpaidPrice, 5);
    assert.equal(shkp.billct, 2);
});

test('returning a split unpaid child leaves the parent bill entry intact', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(8101, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, parent, 15);
    const child = { ...parent, id: 8102, quan: 1, letter: 'e', line: 'e - a +0 dagger' };
    shop.splitShopBillEntry(shkp, parent, child, 1);

    assert.equal(shop.sellobjReturnUnpaidToShop(child, 5, 5), true);

    const parentEntry = shop.shopBillEntryForObject(shkp, parent);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, child), null);
    assert.equal(child.unpaid, false);
    assert.equal(shkp.billct, 1);
});

test('unpaid return keeps used-up residual bill quantity when live stack shrank', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8201, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 1;
    stack.line = 'd - a +0 dagger (unpaid, 15 zorkmids)';

    assert.equal(shop.sellobjReturnUnpaidToShop(stack, 5, 5), true);

    assert.equal(stack.unpaid, false);
    assert.doesNotMatch(stack.line, /unpaid/);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.notEqual(String(shkp.bill[0].bo_id), String(stack.id));
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shkp.bill[0].bquan, 2);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 10);
    assert.equal(game._usedUpShopBills.length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, shkp.bill[0].bo_id);
    assert.equal(game._usedUpShopBills[0].price, 10);
});

test('unpaid return without matching bill does not delete unrelated ledger rows', () => {
    const { shkp } = installShopState();
    const billed = dagger(8301, 'd');
    shop.addObjectToShopBill(shkp, billed, 5);
    const orphanedSplit = {
        ...dagger(8302, 'e'),
        unpaid: true,
        unpaidPrice: 5,
        line: 'e - a +0 dagger (unpaid, 5 zorkmids)',
    };

    assert.equal(shop.sellobjReturnUnpaidToShop(orphanedSplit, 5, 5), true);

    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shop.shopBillEntryForObject(shkp, billed), shkp.bill[0]);
    assert.equal(orphanedSplit.unpaid, false);
});

test('partial unpaid inventory use keeps bill total visible until return', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8401, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];

    shop.removeInventoryItem(stack, 1);

    assert.equal(stack.quan, 2);
    assert.equal(stack.unpaidPrice, 15);
    assert.match(stack.line, /^d - 2 \+0 daggers \(unpaid, 15 zorkmids\)$/);
    const entry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(entry.bquan, 3);
    assert.equal(shop.shopBillEntryTotal(entry), 15);

    assert.equal(shop.sellobjReturnUnpaidToShop(stack, 5, 5), true);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shkp.bill[0].bquan, 1);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 5);
});

test('projectile split creates a separate child bill before inventory removal', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8501, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    const thrown = {
        ...stack,
        id: 8502,
        letter: undefined,
        line: undefined,
        quan: 1,
        ox: 7,
        oy: 5,
    };

    const thrownEntry = shop.splitCarriedObjectShopBill(stack, thrown, 1);
    shop.removeInventoryItem(stack, 1);

    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(stack.quan, 2);
    assert.equal(stack.unpaidPrice, 10);
    assert.match(stack.line, /^d - 2 \+0 daggers \(unpaid, 10 zorkmids\)$/);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(thrownEntry.bo_id, String(thrown.id));
    assert.equal(thrownEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(thrownEntry), 5);
    assert.equal(thrown.unpaidPrice, 5);
    assert.equal(shkp.billct, 2);
});

test('returning a thrown unpaid projectile removes only the child bill', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(8601, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    const thrown = {
        ...stack,
        id: 8602,
        letter: undefined,
        line: undefined,
        quan: 1,
        ox: 5,
        oy: 5,
    };
    shop.splitCarriedObjectShopBill(stack, thrown, 1);
    shop.removeInventoryItem(stack, 1);

    assert.equal(shop.returnUnpaidObjectToShopBillOwnerAt(thrown, 5, 5), true);

    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown), null);
    assert.equal(thrown.unpaid, false);
    assert.equal(thrown.unpaidPrice, undefined);
    assert.equal(shkp.billct, 1);
});

test('projectile leaving its owning shop converts the child bill to debit', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const stack = { ...dagger(8701, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    const thrown = {
        ...stack,
        id: 8702,
        letter: undefined,
        line: undefined,
        quan: 1,
        ox: 9,
        oy: 5,
    };
    shop.splitCarriedObjectShopBill(stack, thrown, 1);
    const result = shop.resolveUnpaidProjectileShopLanding(thrown, 9, 5, { silent: true });
    shop.removeInventoryItem(stack, 1);

    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(result.charged, true);
    assert.equal(result.value, 5);
    assert.equal(shkp.debit, 5);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown), null);
    assert.equal(thrown.unpaid, false);
    assert.equal(thrown.unpaidPrice, undefined);
    assert.equal(shkp.billct, 1);
});

test('projectile leaving shop preserves used-up residual from partly used bill row', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const stack = { ...dagger(8705, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 2;

    const result = shop.resolveUnpaidProjectileShopLanding(stack, 9, 5, { silent: true });

    assert.equal(result.charged, true);
    assert.equal(result.value, 15);
    assert.equal(shkp.debit, 15);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill.length, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shkp.bill[0].bquan, 1);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 5);
    assert.equal(stack.unpaid, false);
});

test('projectile container landing in its owning shop returns unpaid contents', () => {
    const { shkp } = installShopState();
    const bag = sack(8710);
    const blade = putObjectInContainer(bag, dagger(8711));
    putObjectInContainer(bag, goldPieces(8712, 6));
    shop.addObjectToShopBill(shkp, blade, 10);

    const result = shop.resolveUnpaidProjectileShopLanding(bag, 5, 5, { silent: true });

    assert.equal(result.handled, true);
    assert.equal(result.returned, true);
    assert.equal(result.charged, false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shkp.credit, 6);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.unpaid, false);
    assert.equal(bag.contents.includes(blade), true);
});

test('projectile container leaving its owning shop converts unpaid contents to debt', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const bag = sack(8720);
    const blade = putObjectInContainer(bag, dagger(8721));
    shop.addObjectToShopBill(shkp, blade, 10);

    const result = shop.resolveUnpaidProjectileShopLanding(bag, 9, 5, { silent: true });

    assert.equal(result.handled, true);
    assert.equal(result.charged, true);
    assert.equal(result.value, 10);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.unpaid, false);
    assert.equal(bag.unpaid || false, false);
    assert.equal(bag.contents.includes(blade), true);
});

test('projectile container debt ignores stale unpaid contents without bill rows', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const bag = sack(8725);
    const blade = putObjectInContainer(bag, dagger(8726));
    const staleRation = putObjectInContainer(bag, foodRation(8727));
    staleRation.unpaid = true;
    staleRation.unpaidPrice = 999;
    shop.addObjectToShopBill(shkp, blade, 10);

    const result = shop.resolveUnpaidProjectileShopLanding(bag, 9, 5, { silent: true });

    assert.equal(result.handled, true);
    assert.equal(result.charged, true);
    assert.equal(result.value, 10);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.unpaid, false);
    assert.equal(staleRation.unpaid, true);
    assert.equal(staleRation.unpaidPrice, 999);
});

test('projectile unpaid container leaving shop charges it and its unpaid contents', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const bag = sack(8730);
    const blade = putObjectInContainer(bag, dagger(8731));
    shop.addObjectToShopBill(shkp, bag, 2);
    shop.addObjectToShopBill(shkp, blade, 10);

    const result = shop.resolveUnpaidProjectileShopLanding(bag, 9, 5);

    assert.equal(result.handled, true);
    assert.equal(result.charged, true);
    assert.equal(result.value, 12);
    assert.equal(shkp.debit, 12);
    assert.match(result.message, /owe Izchak 12 zorkmids for it and its contents!/);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(bag.unpaid, false);
    assert.equal(blade.unpaid, false);
});

test('hard-landing projectile container breaks contents before same-shop return', () => {
    const { shkp } = installShopState();
    initRng(1);
    const bag = sack(8735);
    const potion = putObjectInContainer(bag, oilPotion(8736));
    const blade = putObjectInContainer(bag, dagger(8737));
    shop.addObjectToShopBill(shkp, potion, 20);
    shop.addObjectToShopBill(shkp, blade, 10);

    const landing = shop.landProjectileObjectWithShopHandling(bag, 5, 5, { fromX: 5, fromY: 5, silent: true });

    assert.equal(landing.impact.broke, true);
    assert.equal(landing.impact.loss, 20);
    assert.equal(landing.shopLanding.returned, true);
    assert.equal(shkp.debit, 20);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(bag.contents.includes(potion), false);
    assert.equal(bag.contents.includes(blade), true);
    assert.equal(blade.unpaid, false);
    assert.equal(bag.cknown, false);
});

test('hard-landing projectile container charges broken contents before outside-shop debt', () => {
    const { shkp } = installShopState();
    initRng(1);
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET });
    const bag = sack(8738);
    const potion = putObjectInContainer(bag, oilPotion(8739));
    const blade = putObjectInContainer(bag, dagger(8740));
    shop.addObjectToShopBill(shkp, potion, 20);
    shop.addObjectToShopBill(shkp, blade, 10);

    const landing = shop.landProjectileObjectWithShopHandling(bag, 9, 5, { fromX: 5, fromY: 5, silent: true });

    assert.equal(landing.impact.broke, true);
    assert.equal(landing.impact.loss, 20);
    assert.equal(landing.shopLanding.charged, true);
    assert.equal(landing.shopLanding.value, 10);
    assert.equal(shkp.debit, 30);
    assert.equal(shkp.billct, 0);
    assert.equal(bag.contents.includes(potion), false);
    assert.equal(bag.contents.includes(blade), true);
    assert.equal(blade.unpaid, false);
});

test('soft-landing projectile container skips content impact before shop return', () => {
    const { shkp } = installShopState();
    initRng(1);
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: LAVAPOOL });
    const bag = sack(8741);
    const potion = putObjectInContainer(bag, oilPotion(8742));
    const blade = putObjectInContainer(bag, dagger(8743));
    shop.addObjectToShopBill(shkp, potion, 20);
    shop.addObjectToShopBill(shkp, blade, 10);

    const landing = shop.landProjectileObjectWithShopHandling(bag, 5, 5, { fromX: 5, fromY: 5, silent: true });

    assert.equal(landing.impact.broke, false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(bag.contents.includes(potion), true);
    assert.equal(potion.unpaid, false);
    assert.equal(blade.unpaid, false);
    assert.equal(bag.cknown, true);
});

test('hard-landing top-level unpaid projectile breaks before same-shop return', () => {
    const { shkp } = installShopState();
    const potion = oilPotion(8744);
    shop.addObjectToShopBill(shkp, potion, 20);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 5, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.topBreak.value, 20);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(potion), false);
    assert.equal(shkp.debit, 20);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, potion), null);
    assert.equal(potion.unpaid, false);
    assert.equal(potion.no_charge, true);
});

test('hard-landing top-level unpaid projectile breaks before outside-shop debt', () => {
    const { shkp } = installShopState();
    game.level.at = (x, y) => ({ roomno: x === 9 && y === 5 ? 0 : ROOMOFFSET, typ: ROOM });
    const potion = oilPotion(8745);
    shop.addObjectToShopBill(shkp, potion, 20);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 9, 5, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.shopLanding.charged, true);
    assert.equal(landing.shopLanding.value, 20);
    assert.equal(game.level.objects.includes(potion), false);
    assert.equal(shkp.debit, 20);
    assert.equal(shkp.billct, 0);
    assert.equal(potion.unpaid, false);
    assert.equal(potion.no_charge, true);
});

test('hard-landing top-level paid projectile breaks without sale or floor placement', () => {
    const { shkp } = installShopState();
    const potion = oilPotion(8746);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 5, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(potion), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(potion.no_charge, true);
    assert.equal(landing.shopSale.handled, false);
});

test('same-shop paid projectile auto-sells before stacking', () => {
    const { shkp } = installShopState();
    const floorStack = { ...dagger(8747), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    const thrown = { ...dagger(8748), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    game.level.objects = [floorStack];
    const expectedOffer = shop.shopSaleOffer(thrown, shkp);
    const cashBefore = shop.shopkeeperCash(shkp);

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 5, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shopSale.handled, true);
    assert.equal(landing.shopSale.sold, true);
    assert.equal(landing.object, floorStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorStack.quan, 2);
    assert.equal(game._goldCount, expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore - expectedOffer);
    assert.equal(shkp.billct, 0);
    assert.notEqual(floorStack.no_charge, true);
    assert.notEqual(game._command_mode, 'shopSaleConfirm');
});

test('paid projectile landing on shopkeeper square is not sold', () => {
    const { shkp } = installShopState();
    const thrown = { ...dagger(8749), letter: undefined, line: undefined, quan: 1, ox: 6, oy: 5 };
    const cashBefore = shop.shopkeeperCash(shkp);

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 6, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shopSale.handled, false);
    assert.equal(landing.object, thrown);
    assert.equal(game.level.objects.includes(thrown), true);
    assert.equal(game._goldCount || 0, 0);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore);
    assert.equal(shkp.credit || 0, 0);
    assert.equal(shkp.debit || 0, 0);
});

test('thrown gold donation uses projectile amount before stacking', () => {
    const { shkp } = installShopState();
    shkp.debit = 7;
    shkp.loan = 7;
    const floorGold = { ...goldPieces(8750, 4), letter: undefined, line: undefined, ox: 5, oy: 5 };
    const thrownGold = { ...goldPieces(8751, 10), letter: undefined, line: undefined, ox: 5, oy: 5 };
    game.level.objects = [floorGold];

    const landing = shop.landProjectileObjectWithShopHandling(thrownGold, 5, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shopSale.handled, true);
    assert.equal(landing.shopSale.gold, true);
    assert.equal(landing.object, floorGold);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorGold.quan, 14);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 3);
});

test('thrown gold landing on shopkeeper square does not donate', () => {
    const { shkp } = installShopState();
    shkp.debit = 7;
    shkp.loan = 7;
    const thrownGold = { ...goldPieces(8752, 10), letter: undefined, line: undefined, ox: 6, oy: 5 };

    const landing = shop.landProjectileObjectWithShopHandling(thrownGold, 6, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shopSale.handled, false);
    assert.equal(landing.object, thrownGold);
    assert.equal(game.level.objects.includes(thrownGold), true);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.credit || 0, 0);
});

test('throwing gold from inventory donates the whole purse and updates wallet state', async () => {
    const { shkp } = installCommandShopState();
    shkp.debit = 5;
    shkp.loan = 5;
    const floorGold = { ...goldPieces(8753, 4), letter: undefined, line: undefined, ox: 5, oy: 13 };
    const purse = goldPieces(8754, 12);
    game.level.objects = [floorGold];
    game.inventory = [purse];
    game._goldCount = 12;

    await rhack('t');
    await rhack('$');
    await rhack('j');

    assert.equal(game._command_mode, null);
    assert.equal(game._goldCount, 0);
    assert.equal(game.inventory.some(item => item.letter === '$' || item.cls === 'coin'), false);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0].quan, 16);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 7);
});

test('floor stacking rejects unpaid projectiles into paid stacks', () => {
    const { shkp } = installShopState();
    const paidStack = { ...dagger(8801), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const thrown = { ...dagger(8802), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, thrown, 5);
    game.level.objects = [paidStack];

    const stacked = shop.placeStackableFloorObject(thrown);

    assert.equal(stacked, thrown);
    assert.equal(game.level.objects.length, 2);
    assert.equal(paidStack.quan, 1);
    assert.equal(thrown.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown).bquan, 1);
    assert.equal(shkp.billct, 1);
});

test('floor stacking merges compatible unpaid bill rows', () => {
    const { shkp } = installShopState();
    const floorStack = { ...dagger(8901), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const thrown = { ...dagger(8902), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, floorStack, 5);
    shop.addObjectToShopBill(shkp, thrown, 5);
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(thrown);

    const floorEntry = shop.shopBillEntryForObject(shkp, floorStack);
    assert.equal(stacked, floorStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorStack.quan, 2);
    assert.equal(floorEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(floorEntry), 10);
    assert.equal(floorStack.unpaidPrice, 10);
    assert.equal(shop.shopBillEntryForObject(shkp, thrown), null);
    assert.equal(thrown.unpaid, false);
    assert.equal(shkp.billct, 1);
});

test('floor stacking keeps hatching eggs separate from compatible egg stacks', () => {
    installShopState();
    const floorStack = { ...egg(8903), letter: undefined, line: undefined, corpsenm: { name: 'red dragon' }, ox: 7, oy: 5 };
    const hatching = {
        ...egg(8904),
        letter: undefined,
        line: undefined,
        corpsenm: { name: 'red dragon' },
        eggHatchTurn: game.moves + 10,
        _egg_hatch_seq: 1,
        _egg_hatch_consumed: true,
        ox: 7,
        oy: 5,
    };
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(hatching);

    assert.equal(stacked, hatching);
    assert.equal(game.level.objects.length, 2);
    assert.equal(floorStack.quan, 1);
    assert.equal(hatching.eggHatchTurn, game.moves + 10);
});

test('floor stacking requires matching egg corpse species', () => {
    installShopState();
    const floorStack = { ...egg(8905), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, ox: 7, oy: 5 };
    const otherSpecies = { ...egg(8906), letter: undefined, line: undefined, corpsenm: { name: 'red dragon' }, ox: 7, oy: 5 };
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(otherSpecies);

    assert.equal(stacked, otherSpecies);
    assert.equal(game.level.objects.length, 2);
    assert.equal(floorStack.quan, 1);
});

test('floor stacking requires matching tin corpse species', () => {
    installShopState();
    const floorStack = { ...tin(8907), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, ox: 7, oy: 5 };
    const otherSpecies = { ...tin(8908), letter: undefined, line: undefined, corpsenm: { name: 'red dragon' }, ox: 7, oy: 5 };
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(otherSpecies);

    assert.equal(stacked, otherSpecies);
    assert.equal(game.level.objects.length, 2);
    assert.equal(floorStack.quan, 1);
});

test('floor stacking merges compatible nontimed same-species eggs', () => {
    installShopState();
    const floorStack = { ...egg(8909), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, ox: 7, oy: 5 };
    const sameSpecies = { ...egg(8910), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, ox: 7, oy: 5 };
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(sameSpecies);

    assert.equal(stacked, floorStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorStack.quan, 2);
});

test('floor stacking rejects revivable corpse stacks', () => {
    installShopState();
    const floorStack = { ...corpse(8911, undefined, 'troll'), ox: 7, oy: 5 };
    const otherTroll = { ...corpse(8912, undefined, 'troll'), ox: 7, oy: 5 };
    game.level.objects = [floorStack];

    const stacked = shop.placeStackableFloorObject(otherTroll);

    assert.equal(stacked, otherTroll);
    assert.equal(game.level.objects.length, 2);
    assert.equal(floorStack.quan, 1);
});

test('ordinary inventory drop stacks with compatible floor objects after placement', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: 0, typ: ROOM });
    const floorStack = { ...dagger(8911), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    const carried = dagger(8912, 'd');
    game.level.objects = [floorStack];
    game.inventory = [carried];

    await rhack('d');
    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0].id, carried.id);
    assert.equal(game.level.objects[0].quan, 2);
    assert.equal(shkp.billct, 0);
});

test('ordinary unpaid drop merges same-price floor bill rows after placement', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: 0, typ: ROOM });
    const floorStack = { ...dagger(8913), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    const carried = dagger(8914, 'd');
    game.level.objects = [floorStack];
    game.inventory = [carried];
    shop.addObjectToShopBill(shkp, floorStack, 5);
    shop.addObjectToShopBill(shkp, carried, 5);

    await rhack('d');
    await rhack('d');

    const merged = game.level.objects[0];
    const mergedEntry = shop.shopBillEntryForObject(shkp, merged);
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.length, 1);
    assert.equal(merged.id, carried.id);
    assert.equal(merged.quan, 2);
    assert.equal(merged.unpaid, true);
    assert.equal(mergedEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(mergedEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, floorStack), null);
    assert.equal(floorStack.unpaid, false);
    assert.equal(shkp.billct, 1);
});

test('declined paid drop sale does not stack into chargeable shop stock', async () => {
    const { shkp } = installCommandShopState();
    const stock = { ...dagger(8921), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    const carried = dagger(8922, 'd');
    game.level.objects = [stock];
    game.inventory = [carried];

    await rhack('d');
    await rhack('d');

    assert.equal(game._command_mode, 'shopSaleConfirm');

    await rhack('n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.level.objects.length, 2);
    assert.equal(stock.quan, 1);
    assert.equal(stock.no_charge, undefined);
    const dropped = game.level.objects.find(obj => obj.id === carried.id);
    assert.ok(dropped);
    assert.equal(dropped.quan, 1);
    assert.equal(dropped.no_charge, true);
    assert.equal(shkp.billct, 0);
});

test('accepted paid drop sale stacks into compatible chargeable shop stock', async () => {
    const { shkp } = installCommandShopState();
    const stock = { ...dagger(8931), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    const carried = dagger(8932, 'd');
    game.level.objects = [stock];
    game.inventory = [carried];
    game._goldCount = 0;

    await rhack('d');
    await rhack('d');

    assert.equal(game._command_mode, 'shopSaleConfirm');

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0].id, carried.id);
    assert.equal(game.level.objects[0].quan, 2);
    assert.equal(game.level.objects[0].no_charge, undefined);
    assert.equal(game._goldCount > 0, true);
    assert.equal(shkp.billct, 0);
});

test('payable debts use C itemized order by used-up state then price', () => {
    const { shkp } = installShopState();
    const costly = dagger(8991, 'a');
    const partlyUsed = { ...dagger(8992, 'b'), quan: 2, line: 'b - 2 +0 daggers' };
    game.inventory = [costly, partlyUsed];
    shop.addObjectToShopBill(shkp, costly, 30);
    shop.addObjectToShopBill(shkp, partlyUsed, 10);
    partlyUsed.quan = 1;

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 3);
    assert.equal(entries[0].billPortion, 'partlyUsedUp');
    assert.equal(entries[0].price, 5);
    assert.equal(entries[0].letter, 'a');
    assert.equal(entries[1].item, costly);
    assert.equal(entries[1].price, 30);
    assert.equal(entries[1].letter, 'b');
    assert.equal(entries[2].item, partlyUsed);
    assert.equal(entries[2].price, 5);
    assert.equal(entries[2].letter, 'c');
});

test('equal-price payable contents in a hero-owned container sort before bill-indexed rows', async () => {
    const { shkp } = installCommandShopState();
    const bag = sack(89921, 'b');
    const contained = putObjectInContainer(bag, foodRation(89922));
    const ordinary = foodRation(89923, 'f');
    game.inventory = [bag, ordinary];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, ordinary, 45);
    shop.addObjectToShopBill(shkp, contained, 45);

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].containerPayment, true);
    assert.equal(entries[0].item, bag);
    assert.equal(entries[0].price, 45);
    assert.equal(entries[0].letter, 'a');
    assert.equal(entries[1].item, ordinary);
    assert.equal(entries[1].price, 45);
    assert.equal(entries[1].letter, 'b');

    await rhack('p');

    assert.equal(game._command_mode, 'payMenu');
    const lines = (game._overlay_lines || []).map(row => row[2]);
    assert.match(lines.find(line => /^a -/.test(line)) || '', /contents of your bag/);
    assert.match(lines.find(line => /^b -/.test(line)) || '', /food ration/);
});

test('queued equal-price itemized payment follows C bill-index tie-break', () => {
    const { shkp } = installShopState();
    const bag = sack(89924, 'b');
    const contained = putObjectInContainer(bag, dagger(89925));
    const loose = dagger(89926, 'd');
    game.inventory = [bag, loose];
    game._goldCount = 10;
    shop.addObjectToShopBill(shkp, loose, 10);
    shop.addObjectToShopBill(shkp, contained, 10);

    const entries = shop.collectPayableShopDebts(shkp);
    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.paid, true);
    assert.equal(payment.stoppedShort, true);
    assert.equal(payment.cashTotal, 10);
    assert.equal(payment.payableEntries.length, 1);
    assert.equal(payment.payableEntries[0].billPortion, 'containerContents');
    assert.equal(shop.shopBillEntryForObject(shkp, contained), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, loose), null);
    assert.equal(game._goldCount, 0);
});

test('queued shop payment stops after selected entries become unaffordable', () => {
    const { shkp } = installShopState();
    const cheap = dagger(8993, 'a');
    const costly = dagger(8994, 'b');
    game.inventory = [cheap, costly];
    game._goldCount = 25;
    shop.addObjectToShopBill(shkp, cheap, 10);
    shop.addObjectToShopBill(shkp, costly, 20);

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].item, costly);
    assert.equal(entries[0].price, 20);
    assert.equal(entries[1].item, cheap);
    assert.equal(entries[1].price, 10);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.paid, true);
    assert.equal(payment.stoppedShort, true);
    assert.equal(payment.cashTotal, 20);
    assert.equal(payment.payableEntries.length, 1);
    assert.equal(payment.payableEntries[0].item, costly);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopBillEntryForObject(shkp, costly), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, cheap), null);
    assert.equal(costly.unpaid, false);
    assert.equal(cheap.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.equal(payment.message, "You don't have gold enough to pay for a dagger.");
});

test('selected shop payment shortfall names the unpaid row and credit', () => {
    const { shkp } = installShopState();
    const ration = foodRation(9601, 'a');
    game.inventory = [ration];
    game._goldCount = 5;
    shkp.credit = 10;
    shop.addObjectToShopBill(shkp, ration, 45);

    const entries = shop.collectPayableShopDebts(shkp);
    const payment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    assert.equal(payment.paid, false);
    assert.equal(payment.message, "You don't have gold or credit enough to pay for a food ration.");
    assert.equal(game._goldCount, 5);
    assert.equal(shkp.credit, 10);
    assert.equal(shkp.billct, 1);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
});

test('pay command separates used-up and unpaid sections in the itemized menu', async () => {
    const { shkp } = installCommandShopState();
    const partlyUsed = { ...dagger(8995, 'a'), quan: 2, line: 'a - 2 +0 daggers' };
    const costly = dagger(8996, 'b');
    game.inventory = [partlyUsed, costly];
    game._goldCount = 50;
    shop.addObjectToShopBill(shkp, costly, 30);
    shop.addObjectToShopBill(shkp, partlyUsed, 10);
    partlyUsed.quan = 1;

    await rhack('p');

    assert.equal(game._command_mode, 'payMenu');
    let lines = (game._overlay_lines || []).map(row => row[2]);
    const usedHeader = lines.indexOf('Used up item:');
    const unpaidHeader = lines.indexOf('Unpaid items:');
    assert.notEqual(usedHeader, -1);
    assert.ok(unpaidHeader > usedHeader);
    assert.match(lines[usedHeader + 1], /^a -\s*5 Zm,/);
    assert.match(lines[unpaidHeader + 1], /^b -\s*30 Zm,/);
    assert.match(lines[unpaidHeader + 2], /^c -\s*5 Zm,/);

    await rhack('b');

    lines = (game._overlay_lines || []).map(row => row[2]);
    assert.match(lines[unpaidHeader + 1], /^b \+\s*30 Zm,/);
});

test('pay command does not open itemized menu with no gold or credit', async () => {
    const { shkp } = installCommandShopState();
    const ration = foodRation(8997, 'a');
    game.inventory = [ration];
    game._goldCount = 0;
    shop.addObjectToShopBill(shkp, ration, 45);

    await rhack('p');

    assert.notEqual(game._command_mode, 'payMenu');
    assert.match(game._pending_message, /You have no gold or credit\./);
    assert.equal(shkp.billct, 1);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
});

test('pay command refuses itemized menu below the cheapest billed row', async () => {
    const { shkp } = installCommandShopState();
    const cheap = dagger(8998, 'a');
    const costly = foodRation(8999, 'b');
    game.inventory = [cheap, costly];
    game._goldCount = 5;
    shop.addObjectToShopBill(shkp, cheap, 10);
    shop.addObjectToShopBill(shkp, costly, 45);

    await rhack('p');

    assert.notEqual(game._command_mode, 'payMenu');
    assert.match(game._pending_message, /You don't have enough gold to buy any of the items you've picked\./);
    assert.equal(game._goldCount, 5);
    assert.equal(shkp.billct, 2);
    assert.notEqual(shop.shopBillEntryForObject(shkp, cheap), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, costly), null);
});

test('pay command selected row shortfall names the unpaid item and credit', async () => {
    const { shkp } = installCommandShopState();
    const cheap = dagger(9602, 'a');
    const costly = foodRation(9603, 'b');
    game.inventory = [cheap, costly];
    game._goldCount = 20;
    shkp.credit = 5;
    shop.addObjectToShopBill(shkp, cheap, 10);
    shop.addObjectToShopBill(shkp, costly, 45);

    await rhack('p');

    assert.equal(game._command_mode, 'payMenu');
    assert.equal(game._pay_menu_items[0].item, costly);

    await rhack('a');
    await rhack('\n');

    assert.notEqual(game._command_mode, 'payMenu');
    assert.equal(game._pending_message, "You don't have gold or credit enough to pay for a food ration.");
    assert.equal(game._goldCount, 20);
    assert.equal(shkp.credit, 5);
    assert.equal(shkp.billct, 2);
    assert.notEqual(shop.shopBillEntryForObject(shkp, costly), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, cheap), null);
});

test('pay command queued payment stops with selected row shortfall wording', async () => {
    const { shkp } = installCommandShopState();
    const cheap = dagger(9604, 'a');
    const costly = foodRation(9605, 'b');
    game.inventory = [cheap, costly];
    game._goldCount = 50;
    shop.addObjectToShopBill(shkp, cheap, 10);
    shop.addObjectToShopBill(shkp, costly, 45);

    await rhack('p');

    assert.equal(game._command_mode, 'payMenu');
    assert.equal(game._pay_menu_items[0].item, costly);
    assert.equal(game._pay_menu_items[1].item, cheap);

    await rhack('a');
    await rhack('b');
    await rhack('\n');

    assert.equal(game._pending_message, 'You bought a food ration for 45 gold pieces.');
    assert.equal(game._queued_message_after_more, "You don't have gold enough to pay for a dagger.");
    assert.equal(game.context.move, 1);
    assert.equal(game._goldCount, 5);
    assert.equal(shkp.billct, 1);
    assert.equal(costly.unpaid, false);
    assert.equal(cheap.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, costly), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, cheap), null);
});

test('pay command traditional itemized prompt q cancels without mutation', async () => {
    const { shkp, ration, blade } = installTraditionalPayPromptState();

    await rhack('p');

    assert.equal(game._command_mode, 'payItemizedPrompt');
    assert.match(game._pending_message, /Itemized billing\? \[ynq m\] \(q\)/);
    assert.equal(game.context.move, 0);

    await rhack('q');

    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message, '');
    assert.equal(game.context.move, 0);
    assert.equal(game._goldCount, 100);
    assert.equal(shkp.billct, 2);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, blade), null);
});

test('pay command traditional itemized prompt n buys all billed items', async () => {
    const { shkp, ration, blade } = installTraditionalPayPromptState();

    await rhack('p');
    await rhack('n');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game._pending_message, 'You bought 2 items for 55 gold pieces.');
    assert.equal(game._queued_message_after_more, "\"Thank you for shopping in Izchak's general store!\"");
    assert.equal(game._goldCount, 45);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(ration.unpaid, false);
    assert.equal(blade.unpaid, false);
});

test('pay command traditional itemized prompt m opens the pay menu without mutation', async () => {
    const { shkp, ration, blade } = installTraditionalPayPromptState();

    await rhack('p');
    await rhack('m');

    assert.equal(game._command_mode, 'payMenu');
    assert.equal(game.context.move, 0);
    assert.equal(game._goldCount, 100);
    assert.equal(shkp.billct, 2);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, blade), null);
    assert.match((game._overlay_lines || []).map(row => row[2]).join('\n'), /Pay for which items\?/);
});

test('pay command traditional itemized prompt y asks and pays item-by-item', async () => {
    const { shkp, ration, blade } = installTraditionalPayPromptState();

    await rhack('p');
    await rhack('y');

    assert.equal(game._command_mode, 'payItemized');
    assert.match(game._pending_message, /Pay for a food ration for 45 zorkmids\? \[yn\]/);
    assert.equal(game.context.move, 0);
    assert.equal(game._goldCount, 100);
    assert.equal(shkp.billct, 2);

    await rhack('n');

    assert.equal(game._command_mode, 'payItemized');
    assert.match(game._pending_message, /Pay for a dagger for 10 zorkmids\? \[yn\]/);
    assert.equal(game._goldCount, 100);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, blade), null);

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game._pending_message, 'You bought a dagger for 10 gold pieces.');
    assert.equal(game._queued_message_after_more, "\"Thank you for shopping in Izchak's general store!\"");
    assert.equal(game._goldCount, 90);
    assert.equal(shkp.billct, 1);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(ration.unpaid, true);
    assert.equal(blade.unpaid, false);
});

test('pay command m prefix inverts traditional itemized prompt to the pay menu', async () => {
    const { shkp, ration, blade } = installTraditionalPayPromptState();

    await rhack('m');
    await rhack('p');

    assert.equal(game._command_mode, 'payMenu');
    assert.equal(game.context.move, 0);
    assert.equal(game._goldCount, 100);
    assert.equal(shkp.billct, 2);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
    assert.notEqual(shop.shopBillEntryForObject(shkp, blade), null);
    assert.match((game._overlay_lines || []).map(row => row[2]).join('\n'), /Pay for which items\?/);
});

test('pay command settles shop debt before opening itemized billing', async () => {
    const { shkp } = installCommandShopState();
    const ration = foodRation(9000, 'a');
    game.inventory = [ration];
    game._goldCount = 30;
    shkp.debit = 10;
    shkp.loan = 10;
    shop.addObjectToShopBill(shkp, ration, 15);

    await rhack('p');

    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(game._goldCount, 20);
    assert.equal(game._command_mode, 'payMenu');
    assert.equal(game._pay_menu_items.length, 1);
    assert.equal(game._pay_menu_items[0].item, ration);
    assert.doesNotMatch((game._overlay_lines || []).map(row => row[2]).join('\n'), /debt owed/i);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
});

test('pay command refuses itemized billing when shop debt cannot be settled', async () => {
    const { shkp } = installCommandShopState();
    const ration = foodRation(9002, 'a');
    game.inventory = [ration];
    game._goldCount = 10;
    shkp.debit = 20;
    shkp.loan = 20;
    shop.addObjectToShopBill(shkp, ration, 5);

    await rhack('p');

    assert.notEqual(game._command_mode, 'payMenu');
    assert.match(game._pending_message, /You owe Izchak 20 zorkmids you picked up in the store\./);
    assert.match(game._pending_message, /But you don't have enough gold\./);
    assert.equal(shkp.debit, 20);
    assert.equal(shkp.loan, 20);
    assert.equal(game._goldCount, 10);
    assert.notEqual(shop.shopBillEntryForObject(shkp, ration), null);
});

test('pay command lets a blind hero pay a unique adjacent shopkeeper', async () => {
    const { shkp } = installCommandShopState();
    game.u.blind = true;
    game._goldCount = 20;
    shkp.debit = 10;
    shkp.loan = 10;

    await rhack('p');

    assert.match(game._pending_message, /You owe Izchak 10 zorkmids you picked up in the store\./);
    assert.match(game._pending_message, /You pay that debt\./);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(game._goldCount, 10);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command keeps blind resident-at-distance blocked', async () => {
    const { shkp } = installCommandShopState();
    game.u.blind = true;
    shkp.mx = 8;
    shkp.my = 5;
    shkp.shk = { x: 8, y: 5 };
    game._goldCount = 20;
    shkp.debit = 10;
    shkp.loan = 10;

    await rhack('p');

    assert.match(game._pending_message, /You can't see\.\.\./);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.loan, 10);
    assert.equal(game._goldCount, 20);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command does not auto-select while blind with multiple adjacent shopkeepers', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    game.u.blind = true;
    game._goldCount = 20;
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;

    await rhack('p');

    assert.match(game._pending_message, /You can't see\.\.\./);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 20);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command refuses a lone nonresident shopkeeper at a distance', async () => {
    const { shkp } = installCommandShopState();
    game.u.ux = 1;
    game.u.uy = 1;
    game.level.at = () => ({ roomno: 0, typ: ROOM });
    game._goldCount = 20;
    shkp.debit = 10;
    shkp.loan = 10;

    await rhack('p');

    assert.match(game._pending_message, /Izchak is not near enough to receive your payment\./);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.loan, 10);
    assert.equal(game._goldCount, 20);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command skips dead shopkeepers during target selection', async () => {
    const { shkp } = installCommandShopState();
    shkp.dead = true;
    shkp.debit = 10;
    shkp.loan = 10;
    game._goldCount = 20;

    await rhack('p');

    assert.match(game._pending_message, /There appears to be no shopkeeper here to receive your payment\./);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.loan, 10);
    assert.equal(game._goldCount, 20);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command refuses a resident who is outside the shop at a distance', async () => {
    const { shkp } = installCommandShopState();
    shkp.mx = 8;
    shkp.my = 5;
    shkp.shk = { x: 8, y: 5 };
    game.level.at = (x, y) => (x === game.u.ux && y === game.u.uy
        ? { roomno: shkp.shoproom, typ: ROOM }
        : { roomno: 0, typ: ROOM });
    shkp.debit = 10;
    shkp.loan = 10;
    game._goldCount = 20;

    await rhack('p');

    assert.match(game._pending_message, /Izchak is not near enough to receive your payment\./);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.loan, 10);
    assert.equal(game._goldCount, 20);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command opens Pay whom cursor for multiple visible shopkeepers without mutation', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');

    assert.match(game._pending_message, /Pay whom\?/);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
    assert.equal(game._command_mode, 'payWhomCursor');
    assert.equal(game._farlook_x, game.u.ux);
    assert.equal(game._farlook_y, game.u.uy);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('pay command Pay whom monster cycling follows getpos distance order and wraps through self', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 5, my: 7, shk: { x: 5, y: 7 } });
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 2, { shoproom: ROOMOFFSET + 1 });
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('m');

    assert.equal(game._command_mode, 'payWhomCursor');
    assert.equal(game._farlook_x, shkp.mx);
    assert.equal(game._farlook_y, shkp.my);
    assert.match(game._pending_message, /Izchak/);

    await rhack('m');

    assert.equal(game._farlook_x, secondShopkeeper.mx);
    assert.equal(game._farlook_y, secondShopkeeper.my);
    assert.match(game._pending_message, /Asidonhopo/);

    await rhack('m');

    assert.equal(game._farlook_x, game.u.ux);
    assert.equal(game._farlook_y, game.u.uy);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);

    await rhack('M');

    assert.equal(game._farlook_x, secondShopkeeper.mx);
    assert.equal(game._farlook_y, secondShopkeeper.my);
});

test('pay command Pay whom monster cycling includes non-shopkeeper targets', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 6, { shoproom: ROOMOFFSET + 1 });
    const orc = sleepingMonster('orc', 4, 5);
    game.level.monsters.push(secondShopkeeper, orc);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('m');

    assert.equal(game._command_mode, 'payWhomCursor');
    assert.equal(game._farlook_x, orc.mx);
    assert.equal(game._farlook_y, orc.my);
    assert.match(game._pending_message, /orc/);

    await rhack('.');

    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message, 'The orc is not interested in your payment.');
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command Pay whom object cycling targets visible objects without payment', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 5, my: 7, shk: { x: 5, y: 7 } });
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 2, { shoproom: ROOMOFFSET + 1 });
    const blade = dagger(9703, 'c');
    blade.ox = 7;
    blade.oy = 5;
    game.level.monsters.push(secondShopkeeper);
    game.level.objects = [blade];
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('o');

    assert.equal(game._command_mode, 'payWhomCursor');
    assert.equal(game._farlook_x, blade.ox);
    assert.equal(game._farlook_y, blade.oy);
    assert.match(game._pending_message, /dagger/);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);

    await rhack('.');

    assert.equal(game._command_mode, null);
    assert.equal(game._pending_message, 'There is no one there to receive your payment.');
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command Pay whom object cycling wraps through self', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 5, my: 7, shk: { x: 5, y: 7 } });
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 2, { shoproom: ROOMOFFSET + 1 });
    const ration = foodRation(9704, 'c');
    ration.ox = 7;
    ration.oy = 5;
    game.level.monsters.push(secondShopkeeper);
    game.level.objects = [ration];
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('o');
    await rhack('o');

    assert.equal(game._command_mode, 'payWhomCursor');
    assert.equal(game._farlook_x, game.u.ux);
    assert.equal(game._farlook_y, game.u.uy);

    await rhack('O');

    assert.equal(game._farlook_x, ration.ox);
    assert.equal(game._farlook_y, ration.oy);
    assert.match(game._pending_message, /food ration/);
});

test('pay command cancels Pay whom cursor without mutation', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('\x1b');

    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command validates self target from Pay whom cursor before payment', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('.');

    assert.equal(game._pending_message, 'You are generous to yourself.');
    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command validates empty visible target from Pay whom cursor before payment', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('j');
    await rhack('.');

    assert.equal(game._pending_message, 'There is no one there to receive your payment.');
    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command validates unseen target from Pay whom cursor before payment', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    game.viz_array = Array.from({ length: 21 }, () => Array(80).fill(0));
    game.viz_array[5][4] = IN_SIGHT;
    game.viz_array[5][6] = IN_SIGHT;
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('j');
    await rhack('.');

    assert.equal(game._pending_message, "You can't see anyone there.");
    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command validates non-shopkeeper target from Pay whom cursor before payment', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    const orc = sleepingMonster('orc', 5, 6);
    game.level.monsters.push(secondShopkeeper, orc);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('j');
    await rhack('.');

    assert.equal(game._pending_message, 'The orc is not interested in your payment.');
    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command validates distant nonresident target from Pay whom cursor before payment', async () => {
    const { shkp } = installCommandShopState();
    shkp.mx = 7;
    shkp.my = 5;
    shkp.shk = { x: 7, y: 5 };
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 8, 5, { shoproom: ROOMOFFSET + 1 });
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('l');
    await rhack('l');
    await rhack('l');
    await rhack('.');

    assert.equal(game._pending_message, 'Asidonhopo is too far to receive your payment.');
    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(secondShopkeeper.debit, 10);
    assert.equal(game._goldCount, 30);
});

test('pay command pays selected shopkeeper from Pay whom cursor after validation', async () => {
    const { shkp } = installCommandShopState();
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5);
    game.level.monsters.push(secondShopkeeper);
    shkp.debit = 10;
    shkp.loan = 10;
    secondShopkeeper.debit = 10;
    secondShopkeeper.loan = 10;
    game._goldCount = 30;

    await rhack('p');
    await rhack('h');
    await rhack('.');

    assert.match(game._pending_message, /You owe Asidonhopo 10 zorkmids you picked up in the store\./);
    assert.match(game._pending_message, /You pay that debt\./);
    assert.equal(game._command_mode, null);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.loan, 10);
    assert.equal(secondShopkeeper.debit, 0);
    assert.equal(secondShopkeeper.loan, 0);
    assert.equal(game._goldCount, 20);
    assert.notEqual(game._command_mode, 'payMenu');
});

test('payable debts split partly used stacks into used and intact bill portions', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(9001, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    game._goldCount = 20;
    shop.removeInventoryItem(stack, 1);

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].billPortion, 'partlyUsedUp');
    assert.equal(entries[0].price, 5);
    assert.equal(entries[1].billPortion, 'intact');
    assert.equal(entries[1].price, 10);

    const payment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    const bill = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(payment.cashTotal, 5);
    assert.equal(game._goldCount, 15);
    assert.equal(bill.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(bill), 10);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 10);
});

test('paying intact portion after used-up quantity clears the remaining bill row', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(9101, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    game.inventory = [stack];
    game._goldCount = 20;
    shop.removeInventoryItem(stack, 1);

    let entries = shop.collectPayableShopDebts(shkp);
    shop.finishShopPaymentSelection(shkp, [entries[0]]);
    entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'intact');

    const payment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    assert.equal(payment.cashTotal, 10);
    assert.equal(game._goldCount, 5);
    assert.equal(shop.shopBillEntryForObject(shkp, stack), null);
    assert.equal(stack.unpaid, false);
    assert.equal(stack.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
});

test('paying a split stack child removes only the child ledger row', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(9201, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    const child = { ...parent, id: 9202, letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, parent, 15);
    shop.splitShopBillEntry(shkp, parent, child, 1);
    game.inventory = [parent];
    game.level.objects = [child];
    game._goldCount = 20;

    const entries = shop.collectPayableShopDebts(shkp);
    const childEntry = entries.find(entry => entry.billEntry?.bo_id === String(child.id));
    const payment = shop.finishShopPaymentSelection(shkp, [childEntry]);

    const parentEntry = shop.shopBillEntryForObject(shkp, parent);
    assert.equal(payment.cashTotal, 5);
    assert.equal(game._goldCount, 15);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(shop.shopBillEntryForObject(shkp, child), null);
    assert.equal(child.unpaid, false);
    assert.equal(child.unpaidPrice, undefined);
    assert.equal(shkp.billct, 1);
});

test('paying a used-up residual bill removes ledger row and tracker once', () => {
    const { shkp } = installShopState();
    const stack = { ...dagger(9301, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 1;
    stack.line = 'd - a +0 dagger (unpaid, 15 zorkmids)';
    shop.sellobjReturnUnpaidToShop(stack, 5, 5);
    game._goldCount = 20;

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'fullyUsedUp');
    assert.equal(entries[0].price, 10);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 10);
    assert.equal(game._goldCount, 10);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(game._usedUpShopBills.length, 0);
});

test('paying a robbed-only shopkeeper compensates shop losses', () => {
    const { shkp } = installShopState();
    shkp.robbed = 20;
    game._goldCount = 25;

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(entries.length, 0);
    assert.equal(shop.hasRobbedOnlyShopPayment(shkp, entries), true);

    const payment = shop.finishRobbedOnlyShopPayment(shkp);

    assert.equal(payment.paid, true);
    assert.equal(payment.robbedOnly, true);
    assert.equal(payment.cashTotal, 20);
    assert.equal(payment.compensationValue, 20);
    assert.equal(game._goldCount, 5);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
});

test('pay command handles robbed-only shopkeepers without claiming nothing is owed', async () => {
    const { shkp } = installCommandShopState();
    shkp.robbed = 20;
    game._goldCount = 25;

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /after blood, not gold/i);
    assert.match(game._pending_message, /shop has been robbed recently/i);
    assert.match(game._pending_message, /compensate Izchak/i);
    assert.doesNotMatch(game._pending_message, /do not owe/i);
    assert.equal(game._goldCount, 5);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(game.context.move, 1);
});

test('pay command gives a peaceful robbed nonresident the gold they asked for', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: 0, typ: ROOM });
    shkp.robbed = 20;
    game._goldCount = 25;

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /You give Izchak the 20 gold pieces he asked for\./);
    assert.doesNotMatch(game._pending_message, /after blood/i);
    assert.doesNotMatch(game._pending_message, /do not owe/i);
    assert.equal(game._goldCount, 5);
    assert.equal(shkp.robbed, 0);
    assert.equal(game.context.move, 1);
});

test('pay command partially compensates robbed-only shopkeepers when carrying at least half', async () => {
    const { shkp } = installCommandShopState();
    shkp.robbed = 20;
    shkp.angry = true;
    game._goldCount = 12;

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /after blood, not gold/i);
    assert.match(game._pending_message, /partially compensate Izchak/i);
    assert.equal(game._goldCount, 0);
    assert.equal(shkp.robbed, 0);
    assert.equal(shkp.angry, false);
    assert.equal(shkp.mpeaceful, 1);
    assert.equal(game.context.move, 1);
});

test('pay command refuses robbed-only compensation below half the loss', async () => {
    const { shkp } = installCommandShopState();
    shkp.robbed = 20;
    game._goldCount = 9;

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /after blood, not gold/i);
    assert.match(game._pending_message, /don't have enough to interest him/i);
    assert.doesNotMatch(game._pending_message, /compensate Izchak/i);
    assert.doesNotMatch(game._pending_message, /do not owe/i);
    assert.equal(game._goldCount, 9);
    assert.equal(shkp.robbed, 20);
    assert.equal(game.context.move, 1);
});

test('pay command refuses angry unrobbed appeasement with no gold', async () => {
    const { shkp } = installAngryNotRobbedPayState({ gold: 0 });

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /Izchak is after your hide, not your gold!/);
    assert.match(game._pending_message, /Moreover, you have no gold\./);
    assert.doesNotMatch(game._pending_message, /do not owe|try to appease/i);
    assert.equal(game._goldCount, 0);
    assertStillAngryNotRobbed(shkp);
    assert.equal(game.context.move, 1);
});

test('pay command refuses angry unrobbed appeasement below 1000 gold', async () => {
    const { shkp, purse } = installAngryNotRobbedPayState({ gold: 999 });
    shkp.credit = 1000;

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /Izchak is after your hide, not your gold!/);
    assert.match(game._pending_message, /Besides, you don't have enough to interest him\./);
    assert.doesNotMatch(game._pending_message, /try to appease/i);
    assert.equal(game._goldCount, 999);
    assert.equal(purse.quan, 999);
    assert.equal(shkp.credit, 1000);
    assertStillAngryNotRobbed(shkp);
    assert.equal(game.context.move, 1);
});

test('pay command appeases angry unrobbed shopkeepers with 1000 gold', async () => {
    const { shkp, purse } = installAngryNotRobbedPayState({ gold: 1500, customer: 'SomeoneElse' });

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /Izchak is after your hide, not your gold!/);
    assert.match(game._pending_message, /You try to appease the angry Izchak by giving him 1000 gold pieces\./);
    assert.match(game._pending_message, /Izchak calms down\./);
    assert.doesNotMatch(game._pending_message, /as angry as ever/i);
    assert.equal(game._goldCount, 500);
    assert.equal(purse.quan, 500);
    assertPacifiedNoDebt(shkp);
    assert.equal(game.context.move, 1);
});

test('pay command can leave the same angry unrobbed customer angry after appeasement', async () => {
    const { shkp, purse } = installAngryNotRobbedPayState({ gold: 1500, seed: 2, player: 'Hero', customer: 'Hero' });

    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /You try to appease the angry Izchak by giving him 1000 gold pieces\./);
    assert.match(game._pending_message, /But Izchak is as angry as ever\./);
    assert.equal(game._goldCount, 500);
    assert.equal(purse.quan, 500);
    assertStillAngryNotRobbed(shkp);
    assert.equal(game.context.move, 1);
});

test('shop credit offsets itemized bill rows before hero gold', () => {
    const { shkp } = installShopState();
    const ration = foodRation(9401, 'a');
    shop.addObjectToShopBill(shkp, ration, 45);
    game.inventory = [ration];
    game._goldCount = 50;
    shkp.credit = 20;

    const entries = shop.collectPayableShopDebts(shkp);
    assert.equal(shop.shopPaymentCashDue(shkp, entries), 25);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 25);
    assert.equal(game._goldCount, 25);
    assert.equal(shkp.credit, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(ration.unpaid, false);
});

test('payable debts aggregate unpaid contents in a carried container', () => {
    const { shkp } = installShopState();
    const bag = sack(9410, 'b');
    const blade = putObjectInContainer(bag, dagger(9411));
    const ration = putObjectInContainer(bag, foodRation(9412));
    game.inventory = [bag];
    shop.addObjectToShopBill(shkp, blade, 10);
    shop.addObjectToShopBill(shkp, ration, 45);

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'containerContents');
    assert.equal(entries[0].containerPayment, true);
    assert.equal(entries[0].item, bag);
    assert.equal(entries[0].price, 55);
    assert.match(entries[0].name, /contents of your bag/);
    assert.equal(entries[0].billItems.length, 2);
});

test('paying carried container contents clears every constituent bill row', () => {
    const { shkp } = installShopState();
    const bag = sack(9420, 'b');
    const blade = putObjectInContainer(bag, dagger(9421));
    const ration = putObjectInContainer(bag, foodRation(9422));
    game.inventory = [bag];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, blade, 10);
    shop.addObjectToShopBill(shkp, ration, 45);
    const entries = shop.collectPayableShopDebts(shkp);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 55);
    assert.equal(payment.removedLedgerBillCount, 2);
    assert.equal(game._goldCount, 45);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(blade.unpaid, false);
    assert.equal(ration.unpaid, false);
    assert.equal(bag.contents.includes(blade), true);
    assert.equal(bag.contents.includes(ration), true);
});

test('payable debts aggregate an unpaid carried container with its unpaid contents', () => {
    const { shkp } = installShopState();
    const bag = sack(9430, 'b');
    const blade = putObjectInContainer(bag, dagger(9431));
    game.inventory = [bag];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, bag, 2);
    shop.addObjectToShopBill(shkp, blade, 10);

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'containerContents');
    assert.equal(entries[0].price, 12);
    assert.match(entries[0].name, /unpaid bag and its contents/);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 12);
    assert.equal(payment.removedLedgerBillCount, 2);
    assert.equal(game._goldCount, 88);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(bag.unpaid, false);
    assert.equal(blade.unpaid, false);
});

test('payable debts aggregate unpaid contents in a floor container', () => {
    const { shkp } = installShopState();
    const box = shopFloorContainer(9440);
    const blade = putObjectInContainer(box, dagger(9441));
    const ration = putObjectInContainer(box, foodRation(9442));
    game.level.objects = [box];
    shop.addObjectToShopBill(shkp, blade, 10);
    shop.addObjectToShopBill(shkp, ration, 45);

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'containerContents');
    assert.equal(entries[0].containerPayment, true);
    assert.equal(entries[0].item, box);
    assert.equal(entries[0].price, 55);
    assert.match(entries[0].name, /contents of the large box/);
    assert.equal(entries[0].billItems.length, 2);
});

test('paying floor container contents clears every constituent bill row', () => {
    const { shkp } = installShopState();
    const box = shopFloorContainer(9450);
    const blade = putObjectInContainer(box, dagger(9451));
    const ration = putObjectInContainer(box, foodRation(9452));
    game.level.objects = [box];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, blade, 10);
    shop.addObjectToShopBill(shkp, ration, 45);
    const entries = shop.collectPayableShopDebts(shkp);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 55);
    assert.equal(payment.removedLedgerBillCount, 2);
    assert.equal(game._goldCount, 45);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.bill.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(blade.unpaid, false);
    assert.equal(ration.unpaid, false);
    assert.equal(box.contents.includes(blade), true);
    assert.equal(box.contents.includes(ration), true);
    assert.equal(game.level.objects.includes(box), true);
});

test('payable debts aggregate an unpaid floor container with its unpaid contents', () => {
    const { shkp } = installShopState();
    const box = shopFloorContainer(9460);
    const blade = putObjectInContainer(box, dagger(9461));
    game.level.objects = [box];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, box, 2);
    shop.addObjectToShopBill(shkp, blade, 10);

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'containerContents');
    assert.equal(entries[0].price, 12);
    assert.match(entries[0].name, /unpaid large box and its contents/);

    const payment = shop.finishShopPaymentSelection(shkp, entries);

    assert.equal(payment.cashTotal, 12);
    assert.equal(payment.removedLedgerBillCount, 2);
    assert.equal(game._goldCount, 88);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, box), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(box.unpaid, false);
    assert.equal(blade.unpaid, false);
});

test('partly used contained bill blocks container payment until used-up portion is paid', () => {
    const { shkp } = installShopState();
    const box = shopFloorContainer(9470);
    const stack = putObjectInContainer(box, { ...dagger(9471), quan: 3 });
    game.level.objects = [box];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 2;

    const entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].billPortion, 'partlyUsedUp');
    assert.equal(entries[0].price, 5);
    assert.equal(entries[1].billPortion, 'containerContents');
    assert.equal(entries[1].price, 10);
    assert.equal(entries[1].blockedByUsedUp, true);
    assert.equal(entries[1].billItems[0].blockedByUsedUp, true);

    const blocked = shop.finishShopPaymentSelection(shkp, [entries[1]]);

    assert.equal(blocked.paid, false);
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.skipped, false);
    assert.match(blocked.message, /Please pay for the other dagger before buying the ones in the large box\./);
    assert.equal(game._goldCount, 100);
    assert.equal(shop.shopBillEntryForObject(shkp, stack).bquan, 3);

    const paid = shop.finishShopPaymentSelection(shkp, [entries[1], entries[0]]);

    assert.equal(paid.paid, true);
    assert.equal(paid.cashTotal, 15);
    assert.equal(paid.removedLedgerBillCount, 1);
    assert.equal(game._goldCount, 85);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, stack), null);
    assert.equal(stack.unpaid, false);
    assert.equal(box.contents.includes(stack), true);
});

test('paying contained used-up portion first lets later container payment clear the live row', () => {
    const { shkp } = installShopState();
    const bag = sack(9480, 'b');
    const stack = putObjectInContainer(bag, { ...dagger(9481), quan: 3 });
    game.inventory = [bag];
    game._goldCount = 100;
    shop.addObjectToShopBill(shkp, stack, 15);
    stack.quan = 2;

    let entries = shop.collectPayableShopDebts(shkp);
    const firstPayment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    assert.equal(firstPayment.cashTotal, 5);
    assert.equal(game._goldCount, 95);
    assert.equal(shop.shopBillEntryForObject(shkp, stack).bquan, 2);

    entries = shop.collectPayableShopDebts(shkp);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].billPortion, 'containerContents');
    assert.equal(entries[0].price, 10);
    assert.equal(entries[0].blockedByUsedUp, false);

    const secondPayment = shop.finishShopPaymentSelection(shkp, [entries[0]]);

    assert.equal(secondPayment.cashTotal, 10);
    assert.equal(game._goldCount, 85);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, stack), null);
    assert.equal(stack.unpaid, false);
    assert.equal(bag.contents.includes(stack), true);
});
