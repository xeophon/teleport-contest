import assert from 'node:assert/strict';
import test from 'node:test';

import { interruptEatingOccupation, moveloop_core, processEatingOccupationTick, processForceLockOccupation } from '../js/allmain.js';
import { activateStatueTrap, burnFloorObjectsByFire, earthFloorEffects, finishForceLock, landMonsterThrownObject, processCorpseTimers, processForceLockOccupationTick, processGlobShrinkTimers, processSpellbookStudyOccupation, rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import { pushKey, resetInputState } from '../js/input.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { A_CON, A_DEX, A_STR, BILLSZ, CANDLESHOP, CLOUD, COULD_SEE, DB_EAST, DB_MOAT, DBWALL, DOOR, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, D_CLOSED, D_NODOOR, FOUNTAIN, HOLE, ICE, ICED_POOL, IN_SIGHT, LAVAPOOL, MOAT, NORMAL_SPEED, PIT, POOL, ROOM, ROOMOFFSET, SDOOR, SHOPBASE, SQKY_BOARD, STATUE_TRAP, STONE, STRAT_WAITFORU, TRAPDOOR, TT_WEB, WEB, W_SADDLE } from '../js/const.js';
import { currentFruitId, setCurrentFruitName } from '../js/fruit.js';

const BRASS_LANTERN = 226;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const POT_OIL = 252;
const CRYSTAL_BALL = 10088;
const CANDELABRUM_OF_INVOCATION = 10076;
const BELL = 358;
const POT_ACID = 238;
const POT_PARALYSIS = 244;
const POT_POLYMORPH = 248;
const POT_OBJECT_DETECTION = 249;
const INVENTORY_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SCR_SCARE_MONSTER = 279;
const LOADSTONE = 10165;
const BOULDER = 465;
const HORN_OF_PLENTY = 957;
const BAG_OF_TRICKS = 10158;
const POT_WATER = 253;
const SLIME_MOLD = 11009;
const MEAT_RING = 10164;
const MEATBALL = 11012;
const ENORMOUS_MEATBALL = 11013;
const MEAT_STICK = 11014;
const DART = 353;
const TALLOW_CANDLE = 370;
const MIRROR = 10006;
const WAN_MAKE_INVISIBLE = 10091;
const CORPSE = 471;
const STATUE = 472;
const FIGURINE = 795;
const LOCK_PICK = 10167;
const ROCK = 467;
const EGG = 10001;
const EXPENSIVE_CAMERA = 10082;
const BLINDING_VENOM = 10184;
const ACID_VENOM = 10185;

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

async function drainQueuedMessagesAfterMore(limit = 20) {
    const messages = [];
    for (let i = 0; i < limit && (game._queued_message_after_more
        || game._queued_messages_after_more?.length
        || game._break_chest_contents_after_more); i++) {
        const current = game._pending_message
            || game._queued_message_after_more
            || game._queued_messages_after_more?.[0]?.text
            || game._break_chest_destroyed_message
            || 'More';
        game._pending_message = current;
        game._topline_after_more = '';
        game._message_more = 1;
        await rhack(' ');
        if (game._pending_message) messages.push(game._pending_message);
    }
    return messages;
}

async function castStoneToFleshDirection(direction) {
    game._known_spells = [{ name: 'stone to flesh', level: 3, skill: 'healing', learnedTurn: game.moves || 1 }];
    game.u.uen = 50;
    game.u.uenmax = 50;
    game.nhDisplay = { cols: 200 };

    await rhack('Z');
    assert.equal(game._command_mode, 'castSpell');
    assert.equal(game._spell_menu_spells?.[0]?.name, 'stone to flesh');
    game._spell_menu_spells[0].successChance = 100;

    await rhack('a');
    assert.equal(game._command_mode, 'spellDirection');
    assert.match(game._pending_message, /In what direction\?/);

    await rhack(direction);
    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
}

async function castStoneToFleshAtSelf() {
    await castStoneToFleshDirection('.');
}

async function castStoneToFleshDown() {
    await castStoneToFleshDirection('>');
}

function assertNoStoneToFleshScoreSideEffects() {
    assert.equal(game.u.uconduct?.polypiles || 0, 0);
    assert.equal(game.u.urexp || 0, 0);
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

function addSecondShopkeeper(name = 'Asidonhopo') {
    const shkp = makeShopkeeper(2, name, 10, 5, { shoproom: ROOMOFFSET + 1 });
    game.level.rooms[1] = { rtype: SHOPBASE, resident: shkp };
    game.level.monsters.push(shkp);
    game.level.at = (x) => ({
        roomno: x >= 9 ? ROOMOFFSET + 1 : ROOMOFFSET,
        typ: ROOM,
    });
    return shkp;
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

function installSeenRemoteShaft(ttyp = HOLE, x = 7, y = 5) {
    game.u.uz = { dnum: 0, dlevel: 1 };
    game.dungeons = [{ num_dunlevs: 3 }];
    game.level.flags = {};
    game.level.traps = [{ ttyp, tx: x, ty: y, tseen: true }];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    markSquareVisible(x, y);
    return game.level.traps[0];
}

function installSeenSqueakyBoardEast() {
    game.level.traps = [{ ttyp: SQKY_BOARD, tx: 6, ty: 5, tseen: true, tnote: 0 }];
    return game.level.traps[0];
}

function queuedImpactDropsFor(level = { dnum: 0, dlevel: 2 }) {
    return game._impact_drop_migrations?.get(`${level.dnum}:${level.dlevel}`) || [];
}

function markHeroSquareVisible() {
    game.viz_array = [];
    game.viz_array[game.u.uy] = [];
    game.viz_array[game.u.uy][game.u.ux] = COULD_SEE | IN_SIGHT;
}

function markSquareVisible(x, y) {
    game.viz_array ??= [];
    game.viz_array[y] ??= [];
    game.viz_array[y][x] = COULD_SEE | IN_SIGHT;
}

function markHeroNeighborhoodVisible() {
    for (let y = (game.u?.uy || 0) - 1; y <= (game.u?.uy || 0) + 1; y++)
        for (let x = (game.u?.ux || 0) - 1; x <= (game.u?.ux || 0) + 1; x++)
            markSquareVisible(x, y);
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

function dartStack(id, letter = 'd', quan = 3, extra = {}) {
    return {
        id,
        otyp: DART,
        cls: 'weapon',
        glyph: ')',
        kind: 'dart',
        actualKind: 'dart',
        plural: 'darts',
        quan,
        ox: 5,
        oy: 5,
        letter,
        known: true,
        dknown: true,
        line: `${letter} - ${quan > 1 ? `${quan} darts` : 'a dart'}`,
        ...extra,
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

function carriedGlassArmor(id, letter = 'a', extra = {}) {
    return {
        id,
        cls: 'armor',
        glyph: '[',
        kind: 'crystal plate mail',
        actualKind: 'crystal plate mail',
        material: 'glass',
        quan: 1,
        spe: 0,
        ox: 5,
        oy: 5,
        letter,
        known: true,
        dknown: true,
        owt: 450,
        line: `${letter} - a +0 crystal plate mail`,
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
        'candy bar': 'candy bars',
        'cram ration': 'cram rations',
        'fortune cookie': 'fortune cookies',
        'lump of royal jelly': 'lumps of royal jelly',
        meatball: 'meatballs',
        'meat stick': 'meat sticks',
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

function venomSplash(id, adjective, otyp, letter = 'v', quan = 1, extra = {}) {
    const singular = `splash of ${adjective} venom`;
    const plural = `splashes of ${adjective} venom`;
    return {
        id,
        otyp,
        cls: 'venom',
        glyph: '.',
        kind: singular,
        actualKind: singular,
        singular,
        plural,
        quan,
        spe: 1,
        owt: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} ${plural}` : `a ${singular}`}`,
        ...extra,
    };
}

function blindingVenom(id, letter = 'v', quan = 1, extra = {}) {
    return venomSplash(id, 'blinding', BLINDING_VENOM, letter, quan, extra);
}

function acidVenom(id, letter = 'a', quan = 1, extra = {}) {
    return venomSplash(id, 'acid', ACID_VENOM, letter, quan, extra);
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

function makeInvisibleWand(id, letter = 'w', spe = 6, extra = {}) {
    return {
        id,
        otyp: WAN_MAKE_INVISIBLE,
        cls: 'wand',
        glyph: '/',
        kind: 'make invisible',
        actualKind: 'wand of make invisible',
        wandIndex: 8,
        quan: 1,
        spe,
        recharged: 0,
        chargeKnown: true,
        known: true,
        dknown: true,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - a wand of make invisible (0:${spe})`,
        ...extra,
    };
}

function ordinaryTool(id, kind, letter = 't') {
    const tool = chargedTool(id, kind, letter, 0);
    delete tool.spe;
    return tool;
}

function unicornHorn(id, letter = 'u', extra = {}) {
    return {
        ...ordinaryTool(id, 'unicorn horn', letter),
        ...extra,
    };
}

function amethystStone(id, letter = 'a', extra = {}) {
    return {
        id,
        cls: 'gem',
        glyph: '*',
        kind: 'amethyst stone',
        actualKind: 'amethyst stone',
        quan: 1,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - an amethyst stone`,
        ...extra,
    };
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

function zombieCorpse(id, x = 5, y = 5, extra = {}) {
    return {
        id,
        otyp: 'corpse',
        cls: 'food',
        glyph: '%',
        kind: 'kobold corpse',
        actualKind: 'kobold corpse',
        corpsenm: { name: 'kobold' },
        quan: 1,
        ox: x,
        oy: y,
        buried: true,
        ...extra,
    };
}

function ordinaryThrowTarget(name = 'goblin', x = 7, y = 5, extra = {}) {
    return {
        mx: x,
        my: y,
        mhp: 5,
        mhpmax: 5,
        m_lev: 1,
        mr: 0,
        msleeping: 1,
        mpeaceful: true,
        data: { name, mlevel: 1 },
        ...extra,
    };
}

function wornSaddle(id, extra = {}) {
    return {
        ...ordinaryTool(id, 'saddle', 's'),
        worn: true,
        owornmask: W_SADDLE,
        oslot: 'saddle',
        ...extra,
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

async function answerPotionTryCall(appearance, name = 'visions') {
    assert.equal(game._command_mode, 'callPotionAfterMore');
    assert.equal(game._call_potion_appearance, appearance);

    await rhack(' ');
    assert.equal(game._command_mode, 'callPotionText');
    assert.match(game._pending_message, new RegExp(`Call a ${appearance} potion:`));

    for (const ch of name) await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, null);
    assert.equal(game._called_potions?.[appearance], name);
    assert.equal(
        game._discoveries.some(entry =>
            entry.section === 'Potions'
            && entry.name === `potion called ${name}`
            && entry.text === `potion called ${name} (${appearance})`),
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

function floorGem(id, kind, props = {}) {
    return {
        id,
        otyp: 14,
        cls: 'gem',
        glyph: '*',
        kind,
        actualKind: kind,
        gemDescription: `${kind} gem`,
        quan: 1,
        ox: 5,
        oy: 5,
        known: true,
        dknown: true,
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
        nohands: false,
        verysmall: false,
    };
}

function installStoneGolemPolyself() {
    Object.assign(game.u, {
        uhp: 100,
        uhpmax: 100,
        uen: 0,
        uenmax: 0,
        uac: 5,
        ulevel: 1,
        _polyself_base: {
            uhp: 12,
            uhpmax: 12,
            uen: 0,
            uenmax: 0,
            uac: 10,
            ulevel: 1,
            rank: { m: 'Wizard', f: 'Wizard' },
        },
        _polyself_form: {
            name: 'stone golem',
            mlet: "'",
            glyph: "'",
            mlevel: 14,
            hpLevel: 14,
            mmove: 6,
            mac: 5,
            strong: true,
            neuter: true,
            fixedHp: 100,
            stoneResistance: true,
        },
    });
    game.urole = { ...(game.urole || {}), rank: { m: 'Stone Golem', f: 'Stone Golem' } };
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

function statueTrapStatue(id, x = 7, y = 5, name = 'goblin') {
    return {
        id,
        otyp: STATUE,
        cls: 'rock',
        glyph: '`',
        kind: 'statue',
        actualKind: 'statue',
        singular: 'statue',
        plural: 'statues',
        quan: 1,
        ox: x,
        oy: y,
        known: true,
        dknown: true,
        contents: [],
        corpsenm: {
            name,
            mlet: 'o',
            glyph: 'o',
            color: 3,
            mlevel: 1,
            hpLevel: 1,
            mmove: 9,
            maligntyp: -3,
        },
    };
}

function vegetarianCorpstatMonster(name = 'acid blob', mlet = 'b', props = {}) {
    return {
        name,
        mlet,
        glyph: props.glyph || (String(mlet).length === 1 ? mlet : '?'),
        color: props.color ?? 2,
        mlevel: props.mlevel ?? 1,
        hpLevel: props.hpLevel ?? 1,
        mmove: props.mmove ?? 3,
        neuter: props.neuter ?? true,
        ...props,
    };
}

function stoneToFleshFigurine(id, letter = 'f', monster = vegetarianCorpstatMonster()) {
    return {
        id,
        otyp: FIGURINE,
        cls: 'tool',
        glyph: '(',
        kind: 'figurine',
        actualKind: 'figurine',
        singular: 'figurine',
        plural: 'figurines',
        quan: 1,
        letter,
        line: `${letter} - a figurine of an ${monster.name}`,
        known: true,
        dknown: true,
        corpsenm: monster,
    };
}

function stoneToFleshStatue(id, x = 5, y = 5, monster = vegetarianCorpstatMonster('brown pudding', 'P')) {
    const statue = statueTrapStatue(id, x, y, monster.name);
    statue.corpsenm = monster;
    return statue;
}

function golemCorpstatMonster(name = 'stone golem', props = {}) {
    return vegetarianCorpstatMonster(name, "'", {
        color: props.color ?? 7,
        mlevel: props.mlevel ?? 14,
        hpLevel: props.hpLevel ?? 14,
        mmove: props.mmove ?? 6,
        neuter: true,
        strong: true,
        stoneResistance: name === 'stone golem',
        ...props,
    });
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

function polymorphWand(id, letter = 'w') {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'wand of polymorph',
        actualKind: 'wand of polymorph',
        wand: 'polymorph',
        wandIndex: 12,
        quan: 1,
        spe: 1,
        letter,
        line: `${letter} - a wand of polymorph`,
    };
}

function lightWand(id, letter = 'w', extra = {}) {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'light',
        actualKind: 'wand of light',
        wand: 'light',
        wandIndex: 0,
        quan: 1,
        spe: 6,
        letter,
        line: `${letter} - a wand of light`,
        ...extra,
    };
}

function unknownAppearanceWand(id, appearance, letter = 'w', extra = {}) {
    const wandIndex = (game._object_descriptions?.wands || [])
        .findIndex(entry => entry.description === appearance);
    return {
        id,
        cls: 'wand',
        glyph: '/',
        known: false,
        dknown: true,
        appearance,
        ...(wandIndex >= 0 ? { wandIndex } : {}),
        quan: 1,
        spe: 6,
        letter,
        line: `${letter} - a ${appearance} wand`,
        ...extra,
    };
}

function expensiveCamera(id, letter = 'c', extra = {}) {
    return {
        ...chargedTool(id, 'expensive camera', letter, 3),
        otyp: EXPENSIVE_CAMERA,
        line: `${letter} - an expensive camera`,
        ...extra,
    };
}

function coldWand(id, letter = 'w') {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'cold',
        actualKind: 'wand of cold',
        wand: 'cold',
        wandIndex: 21,
        quan: 1,
        spe: 1,
        letter,
        line: `${letter} - a wand of cold`,
    };
}

function fireWand(id, letter = 'w') {
    return {
        id,
        cls: 'wand',
        glyph: '/',
        kind: 'fire',
        actualKind: 'wand of fire',
        wand: 'fire',
        wandIndex: 20,
        quan: 1,
        spe: 1,
        letter,
        line: `${letter} - a wand of fire`,
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
        potionIndex: 10,
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} potions of healing` : 'a potion of healing'}`,
    };
}

const POTION_INDEX_BY_NAME = {
    'gain ability': 0,
    'restore ability': 1,
    confusion: 2,
    blindness: 3,
    paralysis: 4,
    speed: 5,
    levitation: 6,
    hallucination: 7,
    invisibility: 8,
    'see invisible': 9,
    healing: 10,
    'extra healing': 11,
    'gain level': 12,
    enlightenment: 13,
    'monster detection': 14,
    'object detection': 15,
    'gain energy': 16,
    sleeping: 17,
    'full healing': 18,
    polymorph: 19,
    booze: 20,
    sickness: 21,
    'fruit juice': 22,
};

function namedPotion(id, name, letter, quan = 1, extra = {}) {
    return {
        id,
        cls: 'potion',
        glyph: '!',
        kind: name,
        actualKind: `potion of ${name}`,
        potionIndex: POTION_INDEX_BY_NAME[name],
        quan,
        ox: 5,
        oy: 5,
        letter,
        line: `${letter} - ${quan > 1 ? `${quan} potions of ${name}` : `a potion of ${name}`}`,
        ...extra,
    };
}

function polymorphPotion(id, letter = 'p', quan = 1) {
    return namedPotion(id, 'polymorph', letter, quan, { otyp: POT_POLYMORPH });
}

function sicknessPotion(id, letter = 's', quan = 1, extra = {}) {
    return namedPotion(id, 'sickness', letter, quan, extra);
}

function confusionPotion(id, letter = 'c', quan = 1, extra = {}) {
    return namedPotion(id, 'confusion', letter, quan, extra);
}

function blindnessPotion(id, letter = 'b', quan = 1, extra = {}) {
    return namedPotion(id, 'blindness', letter, quan, extra);
}

function hallucinationPotion(id, letter = 'h', quan = 1, extra = {}) {
    return namedPotion(id, 'hallucination', letter, quan, extra);
}

function boozePotion(id, letter = 'b', quan = 1, extra = {}) {
    return namedPotion(id, 'booze', letter, quan, extra);
}

function paralysisPotion(id, letter = 'p', quan = 1, extra = {}) {
    return namedPotion(id, 'paralysis', letter, quan, extra);
}

function sleepingPotion(id, letter = 's', quan = 1, extra = {}) {
    return namedPotion(id, 'sleeping', letter, quan, extra);
}

function invisibilityPotion(id, letter = 'i', quan = 1, extra = {}) {
    return namedPotion(id, 'invisibility', letter, quan, extra);
}

function speedPotion(id, letter = 's', quan = 1, extra = {}) {
    return namedPotion(id, 'speed', letter, quan, extra);
}

function extraHealingPotion(id, letter = 'e', quan = 1) {
    return namedPotion(id, 'extra healing', letter, quan);
}

function fullHealingPotion(id, letter = 'f', quan = 1) {
    return namedPotion(id, 'full healing', letter, quan);
}

async function startRubCommand() {
    await rhack('#');
    await rhack('r');
    await rhack('u');
    await rhack('b');
    await rhack('\n');
}

async function startForceCommand() {
    await rhack('#');
    await rhack('f');
    await rhack('o');
    await rhack('r');
    await rhack('c');
    await rhack('e');
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

async function destroyedBoxContentText(content, id) {
    installNonShopFloorState();
    initRng(5);
    const box = shopFloorContainer(id);
    box.locked = true;
    box.olocked = true;
    putObjectInContainer(box, content);
    game.level.objects = [box];

    const destroyed = finishForceLock({ chest: box, picktyp: false });
    const messages = await drainQueuedMessagesAfterMore();

    assert.equal(destroyed, true);
    assert.equal(game.level.objects.includes(box), false);
    return messages.join('  ');
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

function fillShopBill(shkp, count = BILLSZ) {
    shkp.bill = Array.from({ length: count }, (_, index) => ({
        bo_id: `full-${index}`,
        price: 1,
        bquan: 1,
        totalPrice: 1,
    }));
    shkp.billct = shkp.bill.length;
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

test('full shop bill leaves direct pickup free instead of synthesizing unpaid state', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp);
    const floorObj = foodRation(1002, 'a');
    const carried = { ...floorObj, line: 'a - a food ration' };

    const result = shop.addPickedObjectToShopBill(floorObj, carried);

    assert.equal(result.price, 0);
    assert.equal(result.billEntry, null);
    assert.equal(result.free, true);
    assert.deepEqual(result.messages, ['You got that for free!']);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(carried.unpaid, undefined);
    assert.equal(carried.unpaidPrice, undefined);
    assert.doesNotMatch(carried.line, /unpaid/);
});

test('full shop bill leaves shop-floor container takeout free', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp);
    const container = shopFloorContainer(1003);
    const source = foodRation(1004);
    container.contents = [source];
    source.contained = true;
    source.container = container;
    game.level.objects = [container];

    const result = shop.addContainerTakeoutObjectToShopBill(container, source, source);

    assert.equal(result.price, 0);
    assert.equal(result.billEntry, null);
    assert.equal(result.free, true);
    assert.deepEqual(result.messages, ['You got that for free!']);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(source.unpaid, undefined);
    assert.equal(source.unpaidPrice, undefined);
});

test('full bill still converts an existing live row into a dummy used-up row', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp, BILLSZ - 1);
    const blade = dagger(1005, 'd');
    game.inventory = [blade];
    const liveEntry = shop.addObjectToShopBill(shkp, blade, 80);

    const result = shop.billDummyAlteredCarriedObjectForTest(blade);

    assert.equal(result, true);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(shkp.bill.some(entry => String(entry.bo_id) === String(liveEntry.bo_id)), false);
    const usedRows = shkp.bill.filter(entry => entry.useup && shop.shopBillEntryTotal(entry) === 80);
    assert.equal(usedRows.length, 1);
    assert.notEqual(String(usedRows[0].bo_id), String(blade.id));
    assert.equal(blade.unpaid, false);
    assert.equal(blade.unpaidPrice, undefined);
    assert.equal((game._usedUpShopBills || []).length, 1);
    assert.equal(game._usedUpShopBills[0].bo_id, usedRows[0].bo_id);
    assert.equal(game._usedUpShopBills[0].price, 80);
});

test('full bill makes split carried food bites free after shrinking the parent bill', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp, BILLSZ - 1);
    const stack = foodRation(10051, 'a');
    stack.quan = 2;
    stack.line = 'a - 2 food rations';
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 90);

    const touched = shop.touchFoodForBiteTest(stack, false);

    assert.notEqual(touched, stack);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(stack.quan, 1);
    assert.equal(touched.quan, 1);
    assert.equal(touched.oeaten, 800);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 45);
    assert.notEqual(touched.unpaid, true);
    assert.equal(touched.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, touched), null);
    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.ok(parentEntry);
    assert.equal(parentEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 45);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('full bill makes split carried tin alterations free after shrinking the parent bill', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp, BILLSZ - 1);
    const stack = tin(10052, 't', 2);
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 90);

    const opened = shop.costlyTinForTest(stack, { floorObject: false, alterType: 'open' });

    assert.notEqual(opened, stack);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(stack.quan, 1);
    assert.equal(opened.quan, 1);
    assert.equal(stack.unpaid, true);
    assert.equal(stack.unpaidPrice, 45);
    assert.notEqual(opened.unpaid, true);
    assert.equal(opened.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, opened), null);
    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.ok(parentEntry);
    assert.equal(parentEntry.useup, false);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 45);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('full bill marks a force-locked shop-floor box no-charge without a dummy row', () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    fillShopBill(shkp);
    const box = shopFloorContainer(1006);
    box.locked = true;
    box.olocked = true;
    box.lknown = true;
    const blade = putObjectInContainer(box, dagger(1007));
    game.level.objects = [box];

    const destroyed = finishForceLock({ chest: box, picktyp: true });

    assert.equal(destroyed, false);
    assert.equal(box.locked, false);
    assert.equal(box.olocked, false);
    assert.equal(box.obroken, true);
    assert.equal(box.no_charge, true);
    assert.equal(box.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, box), null);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('full bill marks opened shop-floor tins no-charge without a dummy row', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp);
    const floorTin = tin(1008, undefined, 1);
    delete floorTin.letter;
    delete floorTin.line;
    game.level.objects = [floorTin];

    const opened = shop.costlyTinForTest(floorTin, { floorObject: true, alterType: 'open' });

    assert.equal(opened, floorTin);
    assert.equal(floorTin.no_charge, true);
    assert.equal(floorTin.unpaid, false);
    assert.equal(floorTin.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, floorTin), null);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('full bill marks first-bitten shop-floor food no-charge without a dummy row', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp);
    const floor = foodRation(1009);
    delete floor.letter;
    delete floor.line;
    game.level.objects = [floor];

    const touched = shop.touchFoodForBiteTest(floor, true);

    assert.equal(touched, floor);
    assert.equal(floor.oeaten, 800);
    assert.equal(floor.no_charge, true);
    assert.equal(floor.unpaid, false);
    assert.equal(floor.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, floor), null);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal((game._usedUpShopBills || []).length, 0);
});

test('whole-container pickup keeps billing contents after the bill fills', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp, BILLSZ - 2);
    const bag = sack(1010, 'b');
    bag.ox = 5;
    bag.oy = 5;
    const blade = putObjectInContainer(bag, dagger(1011));
    const ration = putObjectInContainer(bag, foodRation(1012));
    game.level.objects = [bag];
    const expectedPrice = shop.shopItemPrice(bag, 5, 5)
        + shop.shopItemPrice(blade, 5, 5)
        + shop.shopItemPrice(ration, 5, 5);

    const result = shop.addPickedObjectToShopBill(bag, bag);

    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.ok(shop.shopBillEntryForObject(shkp, bag));
    assert.ok(shop.shopBillEntryForObject(shkp, blade));
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(bag.unpaid, true);
    assert.equal(blade.unpaid, true);
    assert.notEqual(ration.unpaid, true);
    assert.equal(ration.unpaidPrice, undefined);
    assert.equal(result.itemPrice, expectedPrice);
    assert.equal(result.price, expectedPrice);
    assert.equal(result.billEntries.length, 2);
    assert.deepEqual(result.messages, ['You got that for free!']);
});

test('mid-recursion bill saturation still charges contained gold', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp, BILLSZ - 1);
    const bag = sack(1020, 'b');
    bag.no_charge = true;
    bag.ox = 5;
    bag.oy = 5;
    const blade = putObjectInContainer(bag, dagger(1021));
    const ration = putObjectInContainer(bag, foodRation(1022));
    const coins = putObjectInContainer(bag, goldPieces(1023, 7));
    game.level.objects = [bag];
    const itemPrice = shop.shopItemPrice(blade, 5, 5) + shop.shopItemPrice(ration, 5, 5);

    const result = shop.addPickedObjectToShopBill(bag, bag);

    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.ok(shop.shopBillEntryForObject(shkp, blade));
    assert.equal(shop.shopBillEntryForObject(shkp, ration), null);
    assert.equal(shop.shopBillEntryForObject(shkp, coins), null);
    assert.notEqual(bag.unpaid, true);
    assert.equal(bag.no_charge, false);
    assert.equal(blade.unpaid, true);
    assert.notEqual(ration.unpaid, true);
    assert.equal(result.itemPrice, itemPrice);
    assert.equal(result.goldCharged, 7);
    assert.equal(result.price, itemPrice + 7);
    assert.equal(result.billEntries.length, 1);
    assert.deepEqual(result.messages, ['You got that for free!']);
    assert.deepEqual(result.goldMessages, ['You owe Izchak 7 zorkmids.']);
    assert.notEqual(result.free, true);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
});

test('nested container billing continues after saturation without marking grandchildren unpaid', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp, BILLSZ - 2);
    const outer = sack(1030, 'b');
    outer.ox = 5;
    outer.oy = 5;
    const inner = putObjectInContainer(outer, sack(1031));
    const blade = putObjectInContainer(inner, dagger(1032));
    game.level.objects = [outer];
    const expectedPrice = shop.shopItemPrice(outer, 5, 5)
        + shop.shopItemPrice(inner, 5, 5)
        + shop.shopItemPrice(blade, 5, 5);

    const result = shop.addPickedObjectToShopBill(outer, outer);

    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.ok(shop.shopBillEntryForObject(shkp, outer));
    assert.ok(shop.shopBillEntryForObject(shkp, inner));
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(outer.unpaid, true);
    assert.equal(inner.unpaid, true);
    assert.notEqual(blade.unpaid, true);
    assert.equal(blade.unpaidPrice, undefined);
    assert.equal(outer.contents.includes(inner), true);
    assert.equal(inner.contents.includes(blade), true);
    assert.equal(blade.container, inner);
    assert.equal(result.itemPrice, expectedPrice);
    assert.equal(result.billEntries.length, 2);
    assert.deepEqual(result.messages, ['You got that for free!']);
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

test('addObjectToShopBill refuses a full bill without marking unpaid', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp);
    const extra = foodRation(2003, 'a');

    const entry = shop.addObjectToShopBill(shkp, extra, 45);

    assert.equal(entry, null);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(shop.shopBillEntryForObject(shkp, extra), null);
    assert.notEqual(extra.unpaid, true);
    assert.equal(extra.unpaidPrice, undefined);
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

test('full shop bill prevents floor bag of tricks #tip temporary usage fee', async () => {
    const { shkp } = installCommandShopState();
    fillShopBill(shkp);
    const bag = floorBagOfTricks(3065, 3);
    game.level.objects = [bag];
    game.inventory = [];

    await rhack('#');
    for (const ch of 'tip') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, 'tipConfirm');
    assert.equal(game._tip_container_object, bag);

    await rhack('y');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(bag.spe, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(shop.shopBillEntryForObject(shkp, bag), null);
    assert.notEqual(bag.unpaid, true);
    assert.equal(bag.unpaidPrice, undefined);
    assert.doesNotMatch(game._pending_message, /Emptying that will cost/);
    assert.doesNotMatch(game._pending_message, /got that for free/);
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

test('inventory fire destroying an unpaid carried potion applies vapor before use-up and preserves the bill', () => {
    const { shkp } = installShopState();
    initRng(1);
    Object.assign(game.u, { uhp: 20, uhpmax: 20 });
    const potion = confusionPotion(30983, 'c');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 80);

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    assert.equal(game.inventory.includes(potion), false);
    assert.equal(result.messages[0], 'Your potion of confusion boils and explodes!');
    assert.equal(result.messages[1], 'You feel somewhat dizzy.');
    assert.ok(game.u._confusionTimeout > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
    assert.equal(result.events[0].damage, result.damage);
    assert.equal(result.events[0].insertAfter[0].text, 'You feel somewhat dizzy.');
    assert.equal(result.events[0].insertAfter[0].damageAfter, undefined);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 80);
    assert.equal(potion.unpaid, false);
    assert.equal(game._usedUpShopBills.some(bill => String(bill.bo_id) === String(potion.id)), true);
});

test('wet worn towel blocks inventory fire potion vapor effects', () => {
    installShopState();
    initRng(1);
    Object.assign(game.u, { uhp: 20, uhpmax: 20 });
    const potion = confusionPotion(30984, 'c');
    const towel = ordinaryTool(30985, 'towel', 't');
    towel.spe = 3;
    towel.wetness = 3;
    towel.worn = true;
    towel.line = 't - a towel (being worn)';
    game.inventory = [potion, towel];

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.inventory.includes(towel), true);
    assert.equal(game.u._confusionTimeout || 0, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Conf/);
    assert.match(result.messages.join(' '), /Some vapor passes harmlessly around you\./);
});

test('water vapor from destroyed carried potion splits gremlin polyself', () => {
    installShopState();
    initRng(1);
    game.plname = 'Ada';
    Object.assign(game.u, {
        uhp: 7,
        uhpmax: 11,
        _polyself_base: { uhp: 12, uhpmax: 12 },
        _polyself_form: { name: 'gremlin', mlet: 'g', mlevel: 5, mmove: 12, mac: 2 },
    });
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const potion = waterPotion(30986, 'w');
    game.inventory = [potion];

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    const clone = game.level.monsters.find(mon => mon.data?.name === 'gremlin');
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(result.messages[0], 'Your potion of water boils and explodes!');
    assert.equal(result.messages[1], 'You multiply!');
    assert.equal(game.u.uhp, 4);
    assert.equal(game.u.uhpmax, 6);
    assert.ok(clone);
    assert.equal(clone.mhp, 3);
    assert.equal(clone.mhpmax, 5);
    assert.equal(clone.mcloned, 1);
    assert.equal(clone.pet, true);
    assert.equal(clone.mtame, 5);
    assert.equal(clone.mpeaceful, 1);
    assert.equal(clone.givenName, 'Ada');
    assert.ok(clone.mextra?.edog);
    assert.doesNotMatch(result.messages.join(' '), /peculiar odor|eyes water/);
});

test('wet worn towel blocks water vapor gremlin split', () => {
    installShopState();
    initRng(1);
    Object.assign(game.u, {
        uhp: 7,
        uhpmax: 11,
        _polyself_base: { uhp: 12, uhpmax: 12 },
        _polyself_form: { name: 'gremlin', mlet: 'g', mlevel: 5, mmove: 12, mac: 2 },
    });
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const potion = waterPotion(30987, 'w');
    const towel = ordinaryTool(30988, 'towel', 't');
    towel.spe = 3;
    towel.wetness = 3;
    towel.worn = true;
    towel.line = 't - a towel (being worn)';
    game.inventory = [potion, towel];

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.monsters.some(mon => mon.data?.name === 'gremlin'), false);
    assert.equal(game.u.uhp, 7);
    assert.equal(game.u.uhpmax, 11);
    assert.match(result.messages.join(' '), /Some vapor passes harmlessly around you\./);
    assert.doesNotMatch(result.messages.join(' '), /You multiply!/);
});

test('cursed water vapor transforms a non-polymorphed lycanthrope', () => {
    installShopState();
    initRng(1);
    Object.assign(game.u, {
        uhp: 12,
        uhpmax: 12,
        uen: 7,
        uenmax: 7,
        uac: 10,
        ulevel: 3,
        uhpinc: [12],
        ueninc: [7],
        ulycn: 'werewolf',
        lycanthrope: true,
    });
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const potion = waterPotion(30989, 'w', { cursed: true, bknown: true });
    game.inventory = [potion];

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    assert.equal(game.inventory.includes(potion), false);
    assert.equal(result.messages[0], 'Your potion of unholy water boils and explodes!');
    assert.match(result.messages.join(' '), /You turn into a werewolf!/);
    assert.equal(game.u.ulycn, 'werewolf');
    assert.equal(game.u._polyself_form?.name, 'werewolf');
    assert.equal(game.u._polyself_form?.wereBeast, true);
    assert.equal(game.u.uac, 4);
    assert.ok(game.u._polyself_base);
    assert.doesNotMatch(result.messages.join(' '), /peculiar odor|eyes water/);
});

test('blessed water vapor reverts matching were-beast form without curing lycanthropy', () => {
    installShopState();
    initRng(1);
    Object.assign(game.u, {
        uhp: 5,
        uhpmax: 8,
        uen: 3,
        uenmax: 4,
        uac: 6,
        ulevel: 2,
        ulycn: 'werewolf',
        lycanthrope: true,
        _polyself_base: { uhp: 13, uhpmax: 15, uen: 7, uenmax: 9, uac: 4, ulevel: 3 },
        _polyself_form: { name: 'werewolf', mlet: 'd', glyph: 'd', wereBeast: true, nohands: true },
    });
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const potion = waterPotion(30990, 'w', { blessed: true, bknown: true });
    game.inventory = [potion];

    const result = shop.fireDamageInventoryForTest(20, true, false, {
        preburnedArmor: { bodyHit: true, message: '' },
    });

    assert.equal(game.inventory.includes(potion), false);
    assert.equal(result.messages[0], 'Your potion of holy water boils and explodes!');
    assert.match(result.messages.join(' '), /You return to human form!/);
    assert.equal(game.u.ulycn, 'werewolf');
    assert.equal(game.u.lycanthrope, true);
    assert.equal(game.u._polyself_form, null);
    assert.equal(game.u._polyself_base, null);
    assert.equal(game.u.uhp, 13);
    assert.equal(game.u.uhpmax, 15);
    assert.doesNotMatch(result.messages.join(' '), /You feel purified|peculiar odor|eyes water/);
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

test('self-cast stone to flesh turns carried marble wand into meat stick', async () => {
    installCommandShopState();
    initRng(1);
    const wand = makeInvisibleWand(31003, 'a', 6);
    game.inventory = [wand];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    const result = game.inventory[0];
    assert.equal(result.letter, 'a');
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.kind, 'meat stick');
    assert.equal(result.actualKind, 'meat stick');
    assert.equal(result.quan, 1);
    assert.notEqual(result.id, 31003);
    assert.equal(result.wandIndex, undefined);
    assert.equal(result.wand, undefined);
    assert.equal(result.chargeKnown, undefined);
    assert.notEqual(result.spe, 6);
    assert.equal(result.line, 'a - a meat stick');
    assert.match(game._pending_message, /You smell the odor of meat\./);
});

test('self-cast stone to flesh turns carried mineral ring into meat ring', async () => {
    installCommandShopState();
    initRng(1);
    const ring = chargeableRing(31012, 'a', 2);
    game.inventory = [ring];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    const result = game.inventory[0];
    assert.equal(result.letter, 'a');
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_RING);
    assert.equal(result.kind, 'meat ring');
    assert.equal(result.actualKind, 'meat ring');
    assert.equal(result.quan, 1);
    assert.notEqual(result.id, 31012);
    assert.equal(result.ringRoll, undefined);
    assert.equal(result.charged, undefined);
    assert.equal(result.known, undefined);
    assert.equal(result.dknown, undefined);
    assert.notEqual(result.spe, 2);
    assert.equal(result.line, 'a - a meat ring');
    assert.match(game._pending_message, /You smell the odor of meat\./);
});

test('self-cast stone to flesh uses delicious smell for carnivorous and omnivorous forms', async () => {
    for (const formName of ['wolf', 'dwarf']) {
        installCommandShopState();
        initRng(1);
        game._startup_role = 'Wizard';
        game.urole = { name: { m: 'Wizard' } };
        game.u.uconduct = { unvegetarian: 1 };
        game.u._polyself_form = { name: formName };
        const wand = makeInvisibleWand(31021, 'a', 6);
        game.inventory = [wand];

        await castStoneToFleshAtSelf();

        assert.equal(game.inventory[0].otyp, MEAT_STICK, formName);
        assert.equal(game._pending_message, 'You smell a delicious smell.', formName);
    }
});

test('self-cast stone to flesh keeps Monk carnivores on odor wording', async () => {
    installCommandShopState();
    initRng(1);
    game._startup_role = 'Monk';
    game.urole = { name: { m: 'Monk' } };
    game.u.uconduct = { unvegetarian: 1 };
    game.u._polyself_form = { name: 'wolf' };
    const wand = makeInvisibleWand(31022, 'a', 6);
    game.inventory = [wand];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory[0].otyp, MEAT_STICK);
    assert.equal(game._pending_message, 'You smell the odor of meat.');
});

test('self-cast stone to flesh preserves wielded meat stick state and skips merge', async () => {
    installCommandShopState();
    initRng(1);
    const food = simpleFood(31023, 'meat stick', 'a', { otyp: MEAT_STICK });
    const wand = makeInvisibleWand(31024, 'b', 4, { wielded: true });
    game.inventory = [food, wand];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 2);
    assert.equal(food.quan, 1);
    const result = game.inventory[1];
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.wielded, true);
    assert.equal(result.line, 'b - a meat stick (weapon in right hand)');
});

test('self-cast stone to flesh preserves quivered meat stick state and skips merge', async () => {
    installCommandShopState();
    initRng(1);
    const food = simpleFood(31025, 'meat stick', 'a', { otyp: MEAT_STICK });
    const wand = makeInvisibleWand(31026, 'b', 4, { quivered: true });
    game.inventory = [food, wand];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 2);
    assert.equal(food.quan, 1);
    const result = game.inventory[1];
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.quivered, true);
    assert.equal(result.line, 'b - a meat stick (at the ready)');
});

test('self-cast stone to flesh preserves worn meat ring hand and skips merge', async () => {
    installCommandShopState();
    initRng(1);
    const food = simpleFood(31027, 'meat ring', 'a', { otyp: MEAT_RING });
    const ring = chargeableRing(31028, 'b', 2);
    ring.worn = 'left';
    game.inventory = [food, ring];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 2);
    assert.equal(food.quan, 1);
    const result = game.inventory[1];
    assert.equal(result.otyp, MEAT_RING);
    assert.equal(result.worn, 'left');
    assert.equal(result.line, 'b - a meat ring (on left hand)');
});

test('self-cast stone to flesh turns carried boulder into enormous meatball', async () => {
    installCommandShopState();
    initRng(1);
    game.level.flags = { sokoban_rules: true };
    game.u.uluck = 2;
    game.u.uconduct = { sokocheat: 4 };
    const boulder = floorBoulder(31016, {
        letter: 'a',
        line: 'a - a boulder',
    });
    delete boulder.ox;
    delete boulder.oy;
    game.inventory = [boulder];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    const result = game.inventory[0];
    assert.equal(result.letter, 'a');
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, ENORMOUS_MEATBALL);
    assert.equal(result.kind, 'enormous meatball');
    assert.equal(result.actualKind, 'enormous meatball');
    assert.equal(result.quan, 1);
    assert.equal(result.nutrition, 2000);
    assert.equal(result.owt, 400);
    assert.notEqual(result.id, 31016);
    assert.equal(result.line, 'a - an enormous meatball');
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assert.equal(game.u.uconduct.sokocheat, 5);
    assert.equal(game.u.uluck, 1);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh respects ordinary object resistance', async () => {
    installCommandShopState();
    initRng(40);
    enableRngLog({ reset: true });
    game.level.flags = { sokoban_rules: true };
    game.u.uluck = 2;
    game.u.uconduct = { sokocheat: 4 };
    const boulder = floorBoulder(31017, {
        letter: 'a',
        line: 'a - a boulder',
    });
    delete boulder.ox;
    delete boulder.oy;
    game.inventory = [boulder];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], boulder);
    assert.equal(boulder.otyp, BOULDER);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assert.equal(game.u.uconduct.sokocheat, 4);
    assert.equal(game.u.uluck, 2);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh turns vegetarian figurine into meatball', async () => {
    installCommandShopState();
    initRng(1);
    const figurine = stoneToFleshFigurine(31031, 'a');
    figurine.cursed = true;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    const result = game.inventory[0];
    assert.equal(result.letter, 'a');
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEATBALL);
    assert.equal(result.kind, 'meatball');
    assert.equal(result.actualKind, 'meatball');
    assert.equal(result.quan, 1);
    assert.notEqual(result.id, 31031);
    assert.equal(result.corpsenm, null);
    assert.equal(result.figurineTransformTurn, undefined);
    assert.equal(result._figurine_transform_seq, undefined);
    assert.equal(result.line, 'a - a meatball');
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh animates carried nonvegetarian figurine', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31033, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.cursed = true;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'goblin');
    assert.ok(monster);
    assert.equal(monster.pet || false, false);
    assert.equal(monster.mtame || 0, 0);
    assert.equal(monster.minvent?.length || 0, 0);
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh animates carried shop-billed figurine and charges stolen value', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31107, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.cursed = true;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];
    const expectedPrice = shop.shopItemPrice(figurine, game.u.ux, game.u.uy);
    shop.addObjectToShopBill(shkp, figurine, expectedPrice);

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit, expectedPrice);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(shkp.bill, []);
    assert.equal(shop.shopBillEntryForObject(shkp, figurine), null);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(figurine.id)), false);
    assert.match(game._pending_message || '', new RegExp(`You owe Izchak ${expectedPrice} zorkmid`));
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /used-up|odor of meat|delicious smell/);
});

test('self-cast stone to flesh uses carried figurine bill price even when no-charge', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31108, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.no_charge = true;
    game.inventory = [figurine];
    shop.addObjectToShopBill(shkp, figurine, 123);

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit, 123);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(shkp.bill, []);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(figurine.id)), false);
    assert.match(game._pending_message || '', /You owe Izchak 123 zorkmids for it!/);
    assert.match(game._pending_message || '', /The figurine animates!/);
});

test('self-cast stone to flesh applies shop credit to carried figurine animation debt', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    Object.assign(shkp, { credit: 200 });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31109, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [figurine];
    shop.addObjectToShopBill(shkp, figurine, 123);

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.equal(shkp.credit, 77);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(figurine.id)), false);
    assert.match(game._pending_message || '', /You have 77 zorkmids credit remaining\./);
    assert.match(game._pending_message || '', /The figurine animates!/);
});

test('self-cast stone to flesh charges angry shopkeeper carried figurine animation as robbed', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    Object.assign(shkp, { angry: true, hostile: true, mpeaceful: 0 });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31110, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [figurine];
    const expectedPrice = shop.shopItemPrice(figurine, game.u.ux, game.u.uy);
    shop.addObjectToShopBill(shkp, figurine, expectedPrice);

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed, expectedPrice);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(figurine.id)), false);
    assert.match(game._pending_message || '', /Izchak booms: "Hero, you are a thief!"|The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /goods lost|used-up|odor of meat|delicious smell/);
});

test('self-cast stone to flesh checks carried shop-billed figurine resistance before billing', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(40);
    enableRngLog({ reset: true });
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31111, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];
    shop.addObjectToShopBill(shkp, figurine, 123);

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory[0], figurine);
    assert.equal(figurine.figurineTransformTurn, 42);
    assert.equal(figurine._figurine_transform_seq, 7);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 123);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|owe|Thief|odor of meat|delicious smell/);
});

test('self-cast stone to flesh animates carried shop-billed figurine outside shop as used-up bill', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: 0, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31112, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];
    shop.addObjectToShopBill(shkp, figurine, 123);

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryForObject(shkp, figurine), shkp.bill[0]);
    assert.equal((game._usedUpShopBills || []).some(bill =>
        String(bill.bo_id) === String(figurine.id) && bill.price === 123), true);
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /owe|goods lost|Thief|odor of meat|delicious smell/);
});

test('self-cast stone to flesh turns carried stone-golem figurine into flesh golem', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31101, 'a', golemCorpstatMonster('stone golem'));
    figurine.cursed = true;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'flesh golem');
    assert.ok(monster);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'stone golem'), false);
    assert.match(game._pending_message || '', /The figurine turns to flesh and animates!/);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh animates carried flesh-golem figurine without transform wording', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31102, 'a', golemCorpstatMonster('flesh golem', {
        mlevel: 9,
        hpLevel: 9,
        mmove: 8,
        stoneResistance: false,
    }));
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.includes(figurine), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'flesh golem'));
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /turns to flesh|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh checks figurine resistance before animation', async () => {
    installNonShopFloorState();
    initRng(40);
    enableRngLog({ reset: true });
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31034, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], figurine);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh failed carried figurine animation becomes corpse', async () => {
    installNonShopFloorState();
    game.level.at = (x, y) => ({ roomno: 0, typ: x === 5 && y === 5 ? ROOM : STONE });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31122, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    const corpse = game.inventory[0];
    assert.equal(corpse, figurine);
    assert.equal(corpse.otyp, CORPSE);
    assert.equal(corpse.corpsenm?.name, 'goblin');
    assert.equal(corpse.letter, 'a');
    assert.equal(corpse.figurineTransformTurn, undefined);
    assert.equal(corpse._figurine_transform_seq, undefined);
    assert.equal(Number.isFinite(corpse.rotAwayTurn) && corpse.rotAwayTurn > 0, true);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh failed unpaid carried figurine animation preserves used-up bill', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = (x, y) => ({ roomno: ROOMOFFSET, typ: x === 5 && y === 5 ? ROOM : STONE });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31128, 'a',
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [figurine];
    const figurineId = figurine.id;
    shop.addObjectToShopBill(shkp, figurine, 123);

    await castStoneToFleshAtSelf();

    const corpse = game.inventory[0];
    assert.equal(corpse.otyp, CORPSE);
    assert.equal(corpse.corpsenm?.name, 'goblin');
    assert.equal(corpse.unpaid, undefined);
    assert.equal(corpse.unpaidPrice, undefined);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryForObject(shkp, corpse), null);
    assert.equal((game._usedUpShopBills || []).some(bill =>
        String(bill.bo_id) === String(figurineId) && bill.price === 123), true);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|owe|goods lost|odor of meat|delicious smell/);
});

test('self-cast stone to flesh failed no-corpse figurine animation preserves figurine', async () => {
    installNonShopFloorState();
    game.level.at = (x, y) => ({ roomno: 0, typ: x === 5 && y === 5 ? ROOM : STONE });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31123, 'a',
        vegetarianCorpstatMonster('mail daemon', 'o', { neuter: false, mmove: 6, noCorpse: true }));
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], figurine);
    assert.equal(figurine.otyp, FIGURINE);
    assert.equal(figurine.figurineTransformTurn, 42);
    assert.equal(figurine._figurine_transform_seq, 7);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'mail daemon'), false);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|corpse|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh checks figurine resistance before meatball conversion', async () => {
    installCommandShopState();
    initRng(40);
    enableRngLog({ reset: true });
    const figurine = stoneToFleshFigurine(31032, 'a');
    game.inventory = [figurine];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], figurine);
    assert.equal(figurine.otyp, FIGURINE);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh leaves carried wooden ring unchanged', async () => {
    installCommandShopState();
    initRng(1);
    const ring = {
        id: 31013,
        cls: 'ring',
        glyph: '=',
        kind: 'ring of adornment',
        actualKind: 'ring of adornment',
        appearance: 'wooden',
        ringRoll: 1,
        charged: true,
        known: true,
        dknown: true,
        quan: 1,
        spe: 0,
        ox: 5,
        oy: 5,
        letter: 'a',
        line: 'a - a ring of adornment',
    };
    game.inventory = [ring];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], ring);
    assert.equal(ring.cls, 'ring');
    assert.equal(ring.kind, 'ring of adornment');
    assert.equal(ring.otyp, undefined);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
});

test('self-cast stone to flesh preserves C fields on wand to meat stick', async () => {
    installCommandShopState();
    initRng(1);
    const wand = makeInvisibleWand(31004, 'a', 6, {
        quan: 2,
        cursed: true,
        bknown: true,
        no_charge: true,
        recharged: 3,
        line: 'a - 2 cursed wands of make invisible (3:6)',
    });
    game.inventory = [wand];

    await castStoneToFleshAtSelf();

    const result = game.inventory[0];
    assert.equal(result.letter, 'a');
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.quan, 2);
    assert.equal(result.cursed, true);
    assert.equal(result.blessed, false);
    assert.equal(result.bknown, undefined);
    assert.equal(result.no_charge, true);
    assert.equal(result.recharged, 3);
    assert.equal(result.spe, 0);
    assert.equal(result.line, 'a - 2 meat sticks');
});

test('self-cast stone to flesh merges resulting meat sticks', async () => {
    installCommandShopState();
    initRng(1);
    const food = simpleFood(31005, 'meat stick', 'a', { otyp: MEAT_STICK });
    const wand = makeInvisibleWand(31006, 'b', 4);
    game.inventory = [food, wand];

    await castStoneToFleshAtSelf();

    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], food);
    assert.equal(food.quan, 2);
    assert.equal(food.line, 'a - 2 meat sticks');
    assert.equal(game.inventory.some(item => item.cls === 'wand' || item.kind === 'make invisible'), false);
});

test('self-cast stone to flesh marks unpaid transformed wand used up', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const wand = makeInvisibleWand(31007, 'a', 5);
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 150);

    await castStoneToFleshAtSelf();

    const result = game.inventory[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.unpaid, undefined);
    assert.equal(result.unpaidPrice, undefined);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shkp.bill[0];
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 150);
    assert.equal(shop.shopBillEntryForObject(shkp, result), null);
    assert.equal(game._usedUpShopBills.some(bill =>
        String(bill.bo_id) === String(31007)
        && bill.price === 150
        && /wand of make invisible/.test(bill.name)), true);
});

test('downward stone to flesh turns floor marble wand into meat stick and angers shopkeeper', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const wand = { ...makeInvisibleWand(31009), letter: undefined, line: undefined, ox: 5, oy: 5 };
    game.inventory = [];
    game.level.objects = [wand];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(wand), false);
    assert.equal(game.level.objects.length, 1);
    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.kind, 'meat stick');
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.notEqual(result.id, 31009);
    assert.equal(result.wandIndex, undefined);
    assert.equal(result.wand, undefined);
    assert.equal(result.unpaid, undefined);
    assert.equal(result.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.angry, true);
    assert.equal(shkp.hostile, true);
    assert.equal(shkp.mpeaceful, 0);
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assert.match(game._pending_message, /Izchak gets angry!/);
});

test('downward stone to flesh preserves C fields on floor wand to meat stick', async () => {
    installCommandShopState();
    initRng(1);
    const wand = makeInvisibleWand(31010, undefined, 6, {
        ox: 5,
        oy: 5,
        letter: undefined,
        line: undefined,
        quan: 2,
        cursed: true,
        bknown: true,
        no_charge: true,
        recharged: 3,
    });
    game.inventory = [];
    game.level.objects = [wand];

    await castStoneToFleshDown();

    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.quan, 2);
    assert.equal(result.cursed, true);
    assert.equal(result.blessed, false);
    assert.equal(result.bknown, undefined);
    assert.equal(result.no_charge, true);
    assert.equal(result.recharged, 3);
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.equal(result.line, undefined);
    assert.doesNotMatch(game._pending_message, /gets angry|furious/);
});

test('downward stone to flesh marks unpaid floor wand used up before replacement', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const wand = { ...makeInvisibleWand(31011), letter: undefined, line: undefined, ox: 5, oy: 5 };
    game.inventory = [];
    game.level.objects = [wand];
    shop.addObjectToShopBill(shkp, wand, 150);

    await castStoneToFleshDown();

    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_STICK);
    assert.equal(result.unpaid, undefined);
    assert.equal(result.unpaidPrice, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, result), null);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, wand);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 150);
    assert.equal((game._usedUpShopBills || []).some(bill =>
        String(bill.bo_id) === String(wand.id)
        && bill.price === 150
        && /wand of make invisible/.test(bill.name)), true);
    assert.match(game._pending_message, /Izchak gets angry!/);
});

test('downward stone to flesh turns floor gemstone ring into meat ring', async () => {
    installCommandShopState();
    initRng(1);
    const ring = {
        id: 31015,
        cls: 'ring',
        glyph: '=',
        kind: 'ring of levitation',
        actualKind: 'ring of levitation',
        ringRoll: 11,
        known: true,
        dknown: true,
        quan: 1,
        spe: 0,
        ox: 5,
        oy: 5,
        unpaid: true,
        unpaidPrice: 200,
        no_charge: true,
    };
    game.inventory = [];
    game.level.objects = [ring];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(ring), false);
    assert.equal(game.level.objects.length, 1);
    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEAT_RING);
    assert.equal(result.kind, 'meat ring');
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.equal(result.unpaid, undefined);
    assert.equal(result.unpaidPrice, undefined);
    assert.equal(result.no_charge, true);
    assert.equal(result.ringRoll, undefined);
    assert.equal(result.line, undefined);
    assert.match(game._pending_message, /You smell the odor of meat\./);
});

test('downward stone to flesh turns floor boulder into enormous meatball', async () => {
    installNonShopFloorState();
    initRng(1);
    game.level.flags = { sokoban_rules: true };
    game.u.uluck = 0;
    game.u.uconduct = {};
    const boulder = floorBoulder(31020);
    game.inventory = [];
    game.level.objects = [boulder];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(boulder), false);
    assert.equal(game.level.objects.length, 1);
    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, ENORMOUS_MEATBALL);
    assert.equal(result.kind, 'enormous meatball');
    assert.equal(result.actualKind, 'enormous meatball');
    assert.equal(result.quan, 1);
    assert.equal(result.nutrition, 2000);
    assert.equal(result.owt, 400);
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.equal(result.line, undefined);
    assert.notEqual(result.id, 31020);
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assert.equal(game.u.uconduct.sokocheat, 1);
    assert.equal(game.u.uluck, -1);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh animates non-shop floor nonvegetarian figurine', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31035, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.ox = 5;
    figurine.oy = 5;
    figurine.line = undefined;
    figurine.cursed = true;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [];
    game.level.objects = [figurine];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'goblin');
    assert.ok(monster);
    assert.equal(monster.pet || false, false);
    assert.equal(monster.mtame || 0, 0);
    assert.equal(monster.minvent?.length || 0, 0);
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh turns floor stone-golem figurine into flesh golem', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31103, undefined, golemCorpstatMonster('stone golem'));
    Object.assign(figurine, {
        ox: 5,
        oy: 5,
        line: undefined,
        figurineTransformTurn: 42,
        _figurine_transform_seq: 7,
    });
    game.inventory = [];
    game.level.objects = [figurine];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'flesh golem'));
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'stone golem'), false);
    assert.match(game._pending_message || '', /The figurine turns to flesh and animates!/);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh animates shop-floor figurine and charges stolen value', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31038, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    Object.assign(figurine, {
        ox: 5,
        oy: 5,
        line: undefined,
        cursed: true,
        figurineTransformTurn: 42,
        _figurine_transform_seq: 7,
    });
    game.inventory = [];
    game.level.objects = [figurine];
    const expectedPrice = shop.shopItemPrice(figurine, 5, 5);

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.equal(figurine.figurineTransformTurn, undefined);
    assert.equal(figurine._figurine_transform_seq, undefined);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit, expectedPrice);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, figurine), null);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(figurine.id)), false);
    assert.match(game._pending_message || '', new RegExp(`You owe Izchak ${expectedPrice} zorkmid`));
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /used-up|odor of meat|delicious smell/);
});

test('downward stone to flesh removes existing floor figurine bill before animation deletion', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31039, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    Object.assign(figurine, { ox: 5, oy: 5, line: undefined });
    game.inventory = [];
    game.level.objects = [figurine];
    shop.addObjectToShopBill(shkp, figurine, 123);

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit, 123);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(shkp.bill, []);
    assert.equal(shop.shopBillEntryForObject(shkp, figurine), null);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(figurine.id)), false);
    assert.match(game._pending_message || '', /You owe Izchak 123 zorkmids for it!/);
    assert.match(game._pending_message || '', /The figurine animates!/);
});

test('downward stone to flesh animates no-charge shop-floor figurine without debt', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31040, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    Object.assign(figurine, { ox: 5, oy: 5, line: undefined, no_charge: true });
    game.inventory = [];
    game.level.objects = [figurine];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
    assert.match(game._pending_message || '', /The figurine animates!/);
    assert.doesNotMatch(game._pending_message || '', /owe|goods lost|used-up|odor of meat|delicious smell/);
});

test('downward stone to flesh checks shop-floor figurine resistance before stolen value', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(40);
    enableRngLog({ reset: true });
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31041, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    Object.assign(figurine, {
        ox: 5,
        oy: 5,
        line: undefined,
        figurineTransformTurn: 42,
        _figurine_transform_seq: 7,
    });
    game.inventory = [];
    game.level.objects = [figurine];

    await castStoneToFleshDown();

    assert.equal(game.level.objects[0], figurine);
    assert.equal(figurine.figurineTransformTurn, 42);
    assert.equal(figurine._figurine_transform_seq, 7);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|owe|goods lost|odor of meat|delicious smell/);
});

test('downward stone to flesh charges angry shopkeeper figurine animation as robbed', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    Object.assign(shkp, { angry: true, hostile: true, mpeaceful: 0 });
    initRng(1);
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31042, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    Object.assign(figurine, { ox: 5, oy: 5, line: undefined });
    game.inventory = [];
    game.level.objects = [figurine];
    const expectedPrice = shop.shopItemPrice(figurine, 5, 5);

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed, expectedPrice);
    assert.equal(shkp.billct, 0);
    assert.match(game._pending_message || '', /Thief|figurine animates/);
    assert.doesNotMatch(game._pending_message || '', /goods lost|used-up|odor of meat|delicious smell/);
});

test('downward stone to flesh checks floor figurine resistance before animation', async () => {
    installNonShopFloorState();
    initRng(40);
    enableRngLog({ reset: true });
    markHeroNeighborhoodVisible();
    const figurine = stoneToFleshFigurine(31036, undefined,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    figurine.ox = 5;
    figurine.oy = 5;
    figurine.line = undefined;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [];
    game.level.objects = [figurine];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0], figurine);
    assert.equal(figurine.figurineTransformTurn, 42);
    assert.equal(figurine._figurine_transform_seq, 7);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /figurine animates|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh turns floor gemstone stack into meatballs', async () => {
    installCommandShopState();
    initRng(1);
    const ruby = floorGem(31018, 'ruby', {
        gemDescription: 'red gem',
        quan: 3,
        no_charge: true,
    });
    game.inventory = [];
    game.level.objects = [ruby];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(ruby), false);
    assert.equal(game.level.objects.length, 1);
    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEATBALL);
    assert.equal(result.kind, 'meatball');
    assert.equal(result.actualKind, 'meatball');
    assert.equal(result.quan, 3);
    assert.equal(result.nutrition, 5);
    assert.equal(result.owt, 3);
    assert.equal(result.no_charge, true);
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.notEqual(result.id, 31018);
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh turns floor vegetarian figurine into meatball', async () => {
    installNonShopFloorState();
    initRng(1);
    const figurine = stoneToFleshFigurine(31037, undefined);
    figurine.ox = 5;
    figurine.oy = 5;
    figurine.line = undefined;
    figurine.cursed = true;
    figurine.figurineTransformTurn = 42;
    figurine._figurine_transform_seq = 7;
    game.inventory = [];
    game.level.objects = [figurine];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(figurine), false);
    assert.equal(game.level.objects.length, 1);
    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEATBALL);
    assert.equal(result.kind, 'meatball');
    assert.equal(result.actualKind, 'meatball');
    assert.equal(result.quan, 1);
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.equal(result.corpsenm, null);
    assert.equal(result.figurineTransformTurn, undefined);
    assert.equal(result._figurine_transform_seq, undefined);
    assert.equal((game.level.monsters || []).length, 0);
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assert.doesNotMatch(game._pending_message || '', /figurine animates/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh turns vegetarian statue into meatball', async () => {
    installNonShopFloorState();
    initRng(1);
    const statue = stoneToFleshStatue(31033, 5, 5);
    statue.contents = [simpleFood(31034, 'food ration')];
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.equal(game.level.objects.length, 1);
    const result = game.level.objects[0];
    assert.equal(result.cls, 'food');
    assert.equal(result.otyp, MEATBALL);
    assert.equal(result.kind, 'meatball');
    assert.equal(result.actualKind, 'meatball');
    assert.equal(result.quan, 1);
    assert.equal(result.ox, 5);
    assert.equal(result.oy, 5);
    assert.equal(result.contents, undefined);
    assert.equal(result.corpsenm, null);
    assert.notEqual(result.id, 31033);
    assert.match(game._pending_message, /You smell the odor of meat\./);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh animates ordinary floor statue and transfers contents', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31113, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    const ration = simpleFood(31114, 'food ration');
    statue.contents = [ration];
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.equal(game.level.objects.some(obj => obj === ration), false);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'goblin');
    assert.ok(monster);
    assert.equal(monster.msleeping, 0);
    assert.equal(monster.mundetected, false);
    assert.equal(monster.minvent?.[0], ration);
    assert.equal(ration.contained, false);
    assert.equal(ration.ox, undefined);
    assert.equal(ration.oy, undefined);
    assert.match(game._pending_message || '', /The statue of a goblin comes to life!/);
    assert.doesNotMatch(game._pending_message || '', /turns into flesh|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh ordinary statue may animate adjacent to blocker', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const blocker = {
        mx: 5,
        my: 5,
        data: vegetarianCorpstatMonster('newt', 'l', { neuter: false, mmove: 6 }),
        mhp: 1,
        mhpmax: 1,
    };
    game.level.monsters = [blocker];
    const statue = stoneToFleshStatue(31115, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    const monster = (game.level.monsters || []).find(mon => mon !== blocker && mon.data?.name === 'goblin');
    assert.ok(monster);
    assert.notDeepEqual([monster.mx, monster.my], [5, 5]);
    assert.equal(Math.max(Math.abs(monster.mx - 5), Math.abs(monster.my - 5)) <= 1, true);
    assert.match(game._pending_message || '', /The statue of a goblin comes to life!/);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh checks ordinary statue resistance before animation', async () => {
    installNonShopFloorState();
    initRng(40);
    enableRngLog({ reset: true });
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31116, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects[0], statue);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /statue of a goblin|comes to life|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh failed floor statue animation becomes corpse and drops contents', async () => {
    installNonShopFloorState();
    game.level.at = (x, y) => ({ roomno: 0, typ: x === 5 && y === 5 ? ROOM : STONE });
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31124, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    const ration = simpleFood(31125, 'food ration');
    statue.contents = [ration];
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    const corpse = game.level.objects.find(obj => obj.otyp === CORPSE);
    assert.ok(corpse);
    assert.equal(corpse.corpsenm?.name, 'goblin');
    assert.equal(corpse.ox, 5);
    assert.equal(corpse.oy, 5);
    assert.equal(Number.isFinite(corpse.rotAwayTurn) && corpse.rotAwayTurn > 0, true);
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(ration.contained, false);
    assert.equal(ration.ox, 5);
    assert.equal(ration.oy, 5);
    assert.doesNotMatch(game._pending_message || '', /statue of a goblin|comes to life|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh failed shop-floor statue animation keeps dropped content bill live', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = (x, y) => ({ roomno: ROOMOFFSET, typ: x === 5 && y === 5 ? ROOM : STONE });
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31129, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    const ration = simpleFood(31130, 'food ration');
    statue.contents = [ration];
    game.inventory = [];
    game.level.objects = [statue];
    shop.addObjectToShopBill(shkp, ration, 45);

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.equal(game.level.objects.includes(ration), true);
    assert.equal(ration.ox, 5);
    assert.equal(ration.oy, 5);
    assert.equal(shkp.billct, 1);
    const rationEntry = shop.shopBillEntryForObject(shkp, ration);
    assert.ok(rationEntry);
    assert.notEqual(rationEntry.useup, true);
    assert.equal(shop.shopBillEntryTotal(rationEntry), 45);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(ration.id)), false);
    assert.equal(shkp.angry, true);
    assert.match(game._pending_message || '', /Izchak gets angry!/);
    assert.doesNotMatch(game._pending_message || '', /statue of a goblin|comes to life|odor of meat|delicious smell/);
});

test('downward stone to flesh animates ordinary statue trap without disarming trap', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const trap = { ttyp: STATUE_TRAP, tx: 5, ty: 5, tseen: true };
    game.level.traps = [trap];
    const statue = stoneToFleshStatue(31126, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    const ration = simpleFood(31127, 'food ration');
    statue.contents = [ration];
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.deepEqual(game.level.traps, [trap]);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'goblin');
    assert.ok(monster);
    assert.equal(monster.minvent?.[0], ration);
    assert.match(game._pending_message || '', /The statue of a goblin comes to life!/);
    assert.doesNotMatch(game._pending_message || '', /posing as a statue|Instead of shattering|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh animates shop-floor ordinary statue and charges existing bill after animation text', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31117, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    const ration = simpleFood(31121, 'food ration');
    statue.contents = [ration];
    game.inventory = [];
    game.level.objects = [statue];
    const expectedPrice = 123 + shop.shopItemPrice(ration, 5, 5);
    shop.addObjectToShopBill(shkp, statue, 123);

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.equal(game.level.objects.some(obj => obj === ration), false);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'goblin');
    assert.ok(monster);
    assert.equal(monster.minvent?.[0], ration);
    assert.equal(shkp.debit, expectedPrice);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(shkp.bill, []);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(statue.id)), false);
    const message = game._pending_message || '';
    assert.match(message, /The statue of a goblin comes to life!/);
    assert.match(message, new RegExp(`You owe Izchak ${expectedPrice} zorkmids? for it and its contents!`));
    assert.equal(message.indexOf('comes to life!') < message.indexOf('You owe Izchak'), true);
    assert.doesNotMatch(message, /used-up|odor of meat|delicious smell/);
});

test('downward stone to flesh animates unbilled zero-price shop-floor ordinary statue without debt', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31118, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(shkp.bill || [], []);
    assert.equal(shop.shopBillEntryForObject(shkp, statue), null);
    assert.equal((game._usedUpShopBills || []).some(bill => String(bill.bo_id) === String(statue.id)), false);
    assert.match(game._pending_message || '', /The statue of a goblin comes to life!/);
    assert.doesNotMatch(game._pending_message || '', /owe|goods lost|used-up|odor of meat|delicious smell/);
});

test('downward stone to flesh animates no-charge shop-floor ordinary statue without debt', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31119, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    statue.no_charge = true;
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'goblin'));
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
    assert.match(game._pending_message || '', /The statue of a goblin comes to life!/);
    assert.doesNotMatch(game._pending_message || '', /owe|goods lost|used-up|odor of meat|delicious smell/);
});

test('downward stone to flesh checks shop-floor ordinary statue resistance before debt', async () => {
    const { shkp } = installCommandShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    initRng(40);
    enableRngLog({ reset: true });
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31120, 5, 5,
        vegetarianCorpstatMonster('goblin', 'o', { neuter: false, mmove: 6 }));
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects[0], statue);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'goblin'), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), ['rn2(100)=0']);
    assert.doesNotMatch(game._pending_message || '', /statue of a goblin|comes to life|owe|goods lost|odor of meat|delicious smell/);
});

test('downward stone to flesh turns floor stone-golem statue into flesh golem and transfers contents', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31104, 5, 5, golemCorpstatMonster('stone golem'));
    const ration = simpleFood(31105, 'food ration');
    statue.contents = [ration];
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.equal(game.level.objects.some(obj => obj === ration), false);
    const monster = (game.level.monsters || []).find(mon => mon.data?.name === 'flesh golem');
    assert.ok(monster);
    assert.equal((game.level.monsters || []).some(mon => mon.data?.name === 'stone golem'), false);
    assert.equal(monster.minvent?.[0], ration);
    assert.equal(ration.contained, false);
    assert.equal(ration.ox, undefined);
    assert.equal(ration.oy, undefined);
    assert.match(game._pending_message || '', /The statue of a stone golem turns into flesh!/);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh animates floor flesh-golem statue with moves wording', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const statue = stoneToFleshStatue(31106, 5, 5, golemCorpstatMonster('flesh golem', {
        mlevel: 9,
        hpLevel: 9,
        mmove: 8,
        stoneResistance: false,
    }));
    game.inventory = [];
    game.level.objects = [statue];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.includes(statue), false);
    assert.ok((game.level.monsters || []).find(mon => mon.data?.name === 'flesh golem'));
    assert.match(game._pending_message || '', /The statue of a flesh golem moves!/);
    assert.doesNotMatch(game._pending_message || '', /turns into flesh|odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('downward stone to flesh leaves worthless glass gems untouched without resistance roll', async () => {
    installCommandShopState();
    initRng(1);
    enableRngLog({ reset: true });
    const glass = floorGem(31019, 'worthless piece of red glass', {
        gemDescription: 'red gem',
        material: 'glass',
        quan: 2,
    });
    game.inventory = [];
    game.level.objects = [glass];

    await castStoneToFleshDown();

    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0], glass);
    assert.equal(glass.kind, 'worthless piece of red glass');
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(100)=')), []);
    assert.doesNotMatch(game._pending_message || '', /odor of meat|delicious smell/);
    assertNoStoneToFleshScoreSideEffects();
});

test('self-cast stone to flesh clears active petrification', async () => {
    installCommandShopState();
    initRng(1);
    game.inventory = [];
    game.u._stonedTimeout = 4;
    game.u._stonedKiller = 'cockatrice corpse';
    game.u._statusSuffix = ' Stone';

    await castStoneToFleshAtSelf();

    assert.equal(game.u._stonedTimeout, 0);
    assert.equal(game.u._stonedKiller, '');
    assert.doesNotMatch(game.u._statusSuffix || '', /Stone/);
    assert.equal(game._pending_message, 'You feel limber!');
});

test('self-cast stone to flesh uses hallucinated petrification rescue message', async () => {
    installCommandShopState();
    initRng(1);
    game.inventory = [];
    game.u._stonedTimeout = 4;
    game.u._stonedKiller = 'cockatrice corpse';
    game.u._statusSuffix = ' Hallu Stone';
    game.u.hallucinating = true;
    game.u.acurr.a[5] = 16;

    await castStoneToFleshAtSelf();

    assert.equal(game.u._stonedTimeout, 0);
    assert.equal(game.u._stonedKiller, '');
    assert.equal(game.u._statusSuffix, ' Hallu');
    assert.equal(game._pending_message, 'What a pity--you just ruined a future piece of fine art!');
});

test('self-cast stone to flesh rescues stoning before transforming inventory', async () => {
    installCommandShopState();
    initRng(1);
    const wand = makeInvisibleWand(31008, 'a', 6);
    game.inventory = [wand];
    game.u._stonedTimeout = 4;
    game.u._stonedKiller = 'cockatrice corpse';
    game.u._statusSuffix = ' Stone';

    await castStoneToFleshAtSelf();

    assert.equal(game.u._stonedTimeout, 0);
    assert.equal(game.u._stonedKiller, '');
    assert.equal(game.inventory[0].otyp, MEAT_STICK);
    assert.equal(game._pending_message, 'You feel limber!  You smell the odor of meat.');
});

test('self-cast stone to flesh turns stone golem polyself into flesh golem', async () => {
    installCommandShopState();
    initRng(1);
    game.inventory = [];
    installStoneGolemPolyself();

    await castStoneToFleshAtSelf();

    assert.equal(game.u._polyself_form?.name, 'flesh golem');
    assert.equal(game.u.uhp, 40);
    assert.equal(game.u.uhpmax, 40);
    assert.equal(game.u.uac, 9);
    assert.equal(game.u._statusSuffix || '', '');
    assert.match(game._pending_message, /You turn into a flesh golem!/);
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

test('dipping an oil lamp into unpaid oil refuels and bills fuel tax', async () => {
    const { shkp } = installCommandShopState();
    const target = lamp(30921, 'oil lamp', 'l');
    const potion = oilPotion(30922, 'o');
    target.age = 0;
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);
    const expectedFee = expectedUnpaidUsageFee(potion);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, 'dipObject');

    await rhack('l');

    assert.equal(game._command_mode, 'dipOilSource');
    assert.match(game._pending_message, /What do you want to dip .*lamp into\? \[o or \?\*\]/);

    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.age, 800);
    assert.equal(target.spe, 1);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(potion.known, true);
    assert.equal(potion.unpaid, false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.match(game._pending_message, /You fill your lamp with oil\./);
    assert.match(game._pending_message, /Yendorian Fuel Tax/);
    assert.doesNotMatch(game._pending_message, /in addition to the cost/);
});

test('dipping a full oil lamp into unpaid oil keeps the live potion bill', async () => {
    const { shkp } = installCommandShopState();
    const target = lamp(30923, 'oil lamp', 'l');
    const potion = oilPotion(30924, 'o');
    target.age = 1500;
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('l');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.age, 1500);
    assert.equal(target.spe, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.match(game._pending_message, /Your lamp is full\./);
    assert.doesNotMatch(game._pending_message, /Yendorian Fuel Tax|in addition to the cost/);
});

test('dipping an empty magic lamp into oil converts it before refuel billing', async () => {
    const { shkp } = installCommandShopState();
    const target = lamp(30925, 'magic lamp', 'm', 0);
    const potion = oilPotion(30926, 'o');
    target.age = 1500;
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);
    const expectedFee = expectedUnpaidUsageFee(potion);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('m');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.otyp, OIL_LAMP);
    assert.equal(target.kind, 'oil lamp');
    assert.equal(target.actualKind, 'oil lamp');
    assert.equal(target.age, 800);
    assert.equal(target.spe, 1);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(shkp.debit, expectedFee);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.match(game._pending_message, /You fill your lamp with oil\./);
    assert.match(game._pending_message, /Yendorian Fuel Tax/);
});

test('dipping an unpaid oil stack into a lamp preserves residual stack billing', async () => {
    const { shkp } = installCommandShopState();
    const target = lamp(30927, 'oil lamp', 'l');
    const potion = oilPotion(30928, 'o', 2);
    target.age = 0;
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);
    const expectedFee = expectedUnpaidUsageFee(potion);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('l');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.age, 800);
    assert.equal(potion.quan, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(potion.unpaid, true);
    assert.equal(shkp.debit, expectedFee);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(entry.bquan, 2);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'partlyUsedUp' && debt.price === 50), true);
    assert.equal(debts.some(debt => debt.billPortion === 'intact' && debt.price === 50), true);
    assert.match(game._pending_message, /You fill your lamp with oil\./);
    assert.match(game._pending_message, /Yendorian Fuel Tax/);
});

test('dipping a rusty weapon into unpaid oil repairs rust without fuel tax', async () => {
    const { shkp } = installCommandShopState();
    const target = dagger(30929, 'd');
    const potion = oilPotion(30930, 'o');
    target.oeroded = 1;
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');

    assert.equal(game._command_mode, 'dipConfirm');
    assert.match(game._pending_message, /Dip a rusty dagger into the fountain\? \[yn\] \(n\)/);

    await rhack('n');

    assert.equal(game._command_mode, 'dipOilSource');
    assert.match(game._pending_message, /What do you want to dip a rusty dagger into\? \[o or \?\*\]/);

    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded, 0);
    assert.equal(target.greased, undefined);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(potion.unpaid, false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.match(game._pending_message, /Your rusty dagger is less rusty\./);
    assert.doesNotMatch(game._pending_message, /Yendorian Fuel Tax|in addition to the cost/);
});

test('dipping a rusty corroded weapon into oil repairs both erosion counters', async () => {
    installCommandShopState();
    const target = dagger(30931, 'd');
    const potion = oilPotion(30932, 'o');
    target.oeroded = 1;
    target.oeroded2 = 1;
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded, 0);
    assert.equal(target.oeroded2, 0);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /less corroded and rusty\./);
});

test('dipping a clean weapon into oil consumes oil without greasing it', async () => {
    installCommandShopState();
    const target = dagger(30933, 'd');
    const potion = oilPotion(30934, 'o');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.greased, undefined);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /Your dagger gleams with an oily sheen\./);
});

test('dipping a rusty weapon-tool into oil repairs it', async () => {
    installCommandShopState();
    const target = {
        id: 30939,
        cls: 'tool',
        glyph: '(',
        kind: 'pick-axe',
        actualKind: 'pick-axe',
        quan: 1,
        letter: 'p',
        line: 'p - a pick-axe',
        oeroded: 1,
    };
    const potion = oilPotion(30940, 'o');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('p');
    await rhack('n');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded, 0);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /Your rusty pick-axe is less rusty\./);
});

test('dipping an unpaid oil stack into a weapon preserves residual billing without fuel tax', async () => {
    const { shkp } = installCommandShopState();
    const target = dagger(30935, 'd');
    const potion = oilPotion(30936, 'o', 2);
    target.oeroded = 1;
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded, 0);
    assert.equal(potion.quan, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(potion.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(entry.bquan, 2);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'partlyUsedUp' && debt.price === 50), true);
    assert.equal(debts.some(debt => debt.billPortion === 'intact' && debt.price === 50), true);
    assert.match(game._pending_message, /Your rusty dagger is less rusty\./);
    assert.doesNotMatch(game._pending_message, /Yendorian Fuel Tax|in addition to the cost/);
});

test('dipping a weapon into cursed oil spills before repairing rust', async () => {
    installCommandShopState();
    const target = dagger(30937, 'd');
    const potion = oilPotion(30938, 'o');
    target.oeroded = 1;
    potion.cursed = true;
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded, 1);
    assert.ok((game.u._glibTimeout || 0) > 0);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /The potion spills and covers your fingers with oil\./);
});

test('dipping a dagger into acid corrodes it and consumes the potion', async () => {
    installCommandShopState();
    const target = dagger(30955, 'd');
    const potion = acidPotion(30956, 'a');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');

    assert.equal(game._command_mode, 'dipOilSource');
    assert.match(game._pending_message, /What do you want to dip a dagger into\? \[a or \?\*\]/);

    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded2, 1);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(target.line, /corroded \+0 dagger/);
    assert.match(game._pending_message, /Your dagger corrodes!/);
});

test('dipping an already thoroughly corroded dagger into acid does not consume the potion', async () => {
    installCommandShopState();
    const target = dagger(30957, 'd');
    const potion = acidPotion(30958, 'a');
    target.oeroded2 = 3;
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded2, 3);
    assert.equal(game.inventory.includes(potion), true);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('dipping a greased dagger into acid consumes acid without corrosion', async () => {
    installCommandShopState();
    const target = dagger(30959, 'd');
    const potion = acidPotion(30960, 'a');
    target.greased = true;
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded2 || 0, 0);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /protected by the layer of grease/);
});

test('dipping greased non-corrodeable armor into acid consumes acid before material checks', async () => {
    installCommandShopState();
    const target = wornArmor(30965, 'leather armor', 'd', 0, { greased: true });
    const potion = acidPotion(30966, 'a');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded2 || 0, 0);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /protected by the layer of grease/);
});

test('dipping a corrodeproof dagger into acid does not consume acid and reveals proofing', async () => {
    installCommandShopState();
    const target = dagger(30961, 'd');
    const potion = acidPotion(30962, 'a');
    target.oerodeproof = true;
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded2 || 0, 0);
    assert.equal(target.rknown, true);
    assert.equal(game.inventory.includes(potion), true);
    assert.match(game._pending_message, /not affected by the corrosion/);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('dipping an unpaid acid stack into a dagger preserves residual billing without usage debit', async () => {
    const { shkp } = installCommandShopState();
    const target = dagger(30963, 'd');
    const potion = acidPotion(30964, 'a', 2);
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded2, 1);
    assert.equal(potion.quan, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(potion.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(entry.bquan, 2);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'partlyUsedUp' && debt.price === 50), true);
    assert.equal(debts.some(debt => debt.billPortion === 'intact' && debt.price === 50), true);
    assert.match(game._pending_message, /Your dagger corrodes!/);
    assert.doesNotMatch(game._pending_message, /Yendorian Fuel Tax|in addition to the cost/);
});

test('inventory action on a non-oil potion starts source-first dip and skips fountains', async () => {
    installCommandShopState();
    const target = dartStack(30967, 'd', 3);
    const potion = sicknessPotion(30968, 's');
    game.inventory = [target, potion];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: FOUNTAIN });

    await rhack('i');
    await rhack('s');

    assert.equal(game._command_mode, 'inventoryAction');
    assert.equal(game._overlay_lines.some(([, , text]) => /a - Dip something into this potion/.test(String(text))), true);

    await rhack('a');

    assert.equal(game._command_mode, 'dipIntoTarget');
    assert.match(game._pending_message, /What do you want to dip into a potion of sickness\? \[d or \?\*\]/);
    assert.doesNotMatch(game._pending_message, /fountain/);

    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.opoisoned, true);
    assert.match(target.line, /3 poisoned \+0 darts/);
    assert.doesNotMatch(target.line, /\+0 poisoned/);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /The potion of sickness forms a coating on the darts\./);
});

test('inventory action on sickness offers unicorn horn as dip target', async () => {
    installCommandShopState();
    const horn = unicornHorn(30990, 'u');
    const potion = sicknessPotion(30991, 's');
    game.inventory = [horn, potion];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: FOUNTAIN });

    await rhack('i');
    await rhack('s');
    await rhack('a');

    assert.equal(game._command_mode, 'dipIntoTarget');
    assert.match(game._pending_message, /What do you want to dip into a potion of sickness\? \[u or \?\*\]/);
    assert.doesNotMatch(game._pending_message, /fountain/);

    await rhack('u');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.kind, 'fruit juice');
    assert.equal(potion.actualKind, 'potion of fruit juice');
    assert.equal(potion.potionIndex, 22);
    assert.match(game._pending_message, /The potion turns/);
});

test('dipping unicorn horn into sickness stack neutralizes one potion into fruit juice', async () => {
    installCommandShopState();
    const horn = unicornHorn(30992, 'u');
    const potion = sicknessPotion(30993, 's', 2);
    game.inventory = [horn, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('u');
    await rhack('n');
    await rhack('s');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.quan, 1);
    assert.equal(potion.kind, 'sickness');
    const fruit = game.inventory.find(item => item !== potion && item.kind === 'fruit juice');
    assert.ok(fruit);
    assert.equal(fruit.actualKind, 'potion of fruit juice');
    assert.equal(fruit.potionIndex, 22);
    assert.equal(fruit.blessed, false);
    assert.equal(fruit.cursed, false);
    assert.equal(game.inventory.includes(horn), true);
    assert.match(game._pending_message, /The potion that you dipped into turns/);
});

test('unicorn horn turns confusion blindness and hallucination into uncursed undiluted water', async () => {
    const cases = [
        ['confusion', confusionPotion, 'c'],
        ['blindness', blindnessPotion, 'b'],
        ['hallucination', hallucinationPotion, 'h'],
    ];

    for (const [index, [name, factory, letter]] of cases.entries()) {
        installCommandShopState();
        const horn = unicornHorn(30994 + (index * 2), 'u');
        const potion = factory(30995 + (index * 2), letter, 1, { cursed: true, odiluted: true });
        game.inventory = [horn, potion];

        await rhack('#');
        for (const ch of 'dip') await rhack(ch);
        await rhack('\n');
        await rhack('u');
        await rhack('n');
        await rhack(letter);

        assert.equal(game._command_mode, null, name);
        assert.equal(game.context.move, 1, name);
        assert.equal(potion.otyp, POT_WATER, name);
        assert.equal(potion.kind, 'water', name);
        assert.equal(potion.actualKind, 'potion of water', name);
        assert.equal(potion.potionIndex, null, name);
        assert.equal(potion.blessed, false, name);
        assert.equal(potion.cursed, false, name);
        assert.equal(potion.odiluted, false, name);
        assert.match(game._pending_message, /The potion clears\./, name);
    }
});

test('cursed unicorn horn makes sickness neutralization fruit juice cursed', async () => {
    installCommandShopState();
    const horn = unicornHorn(31000, 'u', { cursed: true, bknown: true, line: 'u - a cursed unicorn horn' });
    const potion = sicknessPotion(31001, 's', 1, { blessed: true });
    game.inventory = [horn, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('u');
    await rhack('n');
    await rhack('s');

    assert.equal(potion.kind, 'fruit juice');
    assert.equal(potion.blessed, false);
    assert.equal(potion.cursed, true);
    assert.match(game._pending_message, /The potion turns/);
});

test('amethyst turns booze into fruit juice with amethyst curse state', async () => {
    installCommandShopState();
    const amethyst = amethystStone(31002, 'a', { cursed: true, bknown: true, line: 'a - a cursed amethyst stone' });
    const potion = boozePotion(31003, 'b');
    game.inventory = [amethyst, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('a');
    await rhack('n');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.kind, 'fruit juice');
    assert.equal(potion.actualKind, 'potion of fruit juice');
    assert.equal(potion.potionIndex, 22);
    assert.equal(potion.blessed, false);
    assert.equal(potion.cursed, true);
    assert.match(game._pending_message, /The potion turns/);
});

test('nonmatching horn dip is Interesting and does not mutate source', async () => {
    installCommandShopState();
    const horn = unicornHorn(31004, 'u');
    const potion = boozePotion(31005, 'b');
    game.inventory = [horn, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('u');
    await rhack('n');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.kind, 'booze');
    assert.equal(game.inventory.includes(potion), true);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('unpaid sickness stack neutralization preserves residual and used-up bills', async () => {
    const { shkp } = installCommandShopState();
    const horn = unicornHorn(31006, 'u');
    const potion = sicknessPotion(31007, 's', 2);
    game.inventory = [horn, potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('u');
    await rhack('n');
    await rhack('s');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.quan, 1);
    assert.equal(potion.kind, 'sickness');
    assert.equal(potion.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(entry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(entry), 50);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'fullyUsedUp' && debt.price === 50), true);
    assert.equal(debts.some(debt => debt.billPortion === 'intact' && debt.price === 50), true);
    assert.match(game._pending_message, /You neutralize that potion of sickness, you pay for it!/);
    assert.match(game._pending_message, /The potion that you dipped into turns/);
});

test('blind unicorn horn neutralization mutates without visible transformation text', async () => {
    installCommandShopState();
    game.u.blind = true;
    const horn = unicornHorn(31008, 'u');
    const potion = confusionPotion(31009, 'c');
    game.inventory = [horn, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('u');
    await rhack('n');
    await rhack('c');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.kind, 'water');
    assert.equal(potion.dknown, false);
    assert.doesNotMatch(game._pending_message, /turns|clears|Interesting/);
});

test('inventory action on a known oil potion applies it instead of source-first dipping', async () => {
    installCommandShopState();
    const potion = oilPotion(30969, 'o');
    game.inventory = [potion];

    await rhack('i');
    await rhack('o');
    await rhack('a');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.match(game._pending_message, /You light your potion/);
});

test('dipping a known poisoned dart prompts with doname poison ordering', async () => {
    installCommandShopState();
    const target = dartStack(30970, 'd', 1, { opoisoned: true, spe: 0, line: 'd - a +0 poisoned dart' });
    const potion = healingPotion(30971, 'h');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');

    assert.equal(game._command_mode, 'dipConfirm');
    assert.match(game._pending_message, /Dip a poisoned \+0 dart into the fountain\? \[yn\] \(n\)/);
    assert.doesNotMatch(game._pending_message, /\+0 poisoned/);
});

test('dipping poisonable darts into sickness coats the stack', async () => {
    installCommandShopState();
    const target = dartStack(30941, 'd', 3);
    const potion = sicknessPotion(30942, 's');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');

    assert.equal(game._command_mode, 'dipConfirm');
    assert.match(game._pending_message, /Dip 3 darts into the fountain\? \[yn\] \(n\)/);

    await rhack('n');

    assert.equal(game._command_mode, 'dipOilSource');
    assert.match(game._pending_message, /What do you want to dip 3 darts into\? \[s or \?\*\]/);

    await rhack('s');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.opoisoned, true);
    assert.match(target.line, /3 poisoned \+0 darts/);
    assert.doesNotMatch(target.line, /\+0 poisoned/);
    assert.equal(game.inventory.includes(potion), false);
    assert.match(game._pending_message, /The potion of sickness forms a coating on the darts\./);
});

test('ordinary dip offers non-effect potion sources and keeps them after Interesting', async () => {
    installCommandShopState();
    const target = dagger(30972, 'd');
    const potion = healingPotion(30973, 'h');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');

    assert.equal(game._command_mode, 'dipOilSource');
    assert.match(game._pending_message, /What do you want to dip a dagger into\? \[h or \?\*\]/);

    await rhack('h');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(target.opoisoned || false, false);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('source-first potion action offers unsupported ordinary targets', async () => {
    installCommandShopState();
    const target = dagger(30974, 'd');
    const potion = healingPotion(30975, 'h');
    game.inventory = [target, potion];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: FOUNTAIN });

    await rhack('i');
    await rhack('h');
    await rhack('a');

    assert.equal(game._command_mode, 'dipIntoTarget');
    assert.match(game._pending_message, /What do you want to dip into a potion of healing\? \[d or \?\*\]/);
    assert.doesNotMatch(game._pending_message, /fountain/);

    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(target.opoisoned || false, false);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('dipping a polymorph potion target into another potion polymorphs the carried target', async () => {
    installCommandShopState();
    initRng(1);
    const target = polymorphPotion(30976, 'p');
    const source = healingPotion(30977, 'h');
    game.inventory = [target, source];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('p');
    await rhack('n');
    await rhack('h');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(target), true);
    assert.equal(target.letter, 'p');
    assert.notEqual(target.id, 30976);
    assert.notEqual(target.potionIndex, 19);
    assert.match(game._pending_message, /^p - /);
    assert.equal(game.u.uconduct.polypiles, 1);
    assert.ok(game._discoveries.some(entry => entry.section === 'Potions' && entry.name === 'potion of polymorph'));
});

test('dipping an unpolyable object into polymorph potion keeps the potion', async () => {
    installCommandShopState();
    const target = polymorphWand(30978, 'w');
    const source = polymorphPotion(30979, 'p');
    game.inventory = [target, source];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('w');
    await rhack('n');
    await rhack('p');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(source), true);
    assert.equal(target.id, 30978);
    assert.equal(target.kind, 'wand of polymorph');
    assert.match(game._pending_message, /Nothing happens\./);
});

test('floor polymorph shudder destroys shop-floor stock and leaves a used-up bill row', async () => {
    const { shkp } = installCommandShopState();
    initRng(4);
    const wand = polymorphWand(32001, 'w');
    const ration = { ...foodRation(32002), ox: 5, oy: 4, letter: undefined, line: undefined };
    game.inventory = [wand];
    game.level.objects = [ration];
    const expectedPrice = shop.shopItemPrice(ration, 5, 4);

    await rhack('z');
    await rhack('w');
    await rhack('k');

    assert.equal(game._command_mode, null);
    assert.equal(game.level.objects.includes(ration), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assertUsedUpBillForObject(shkp, ration, expectedPrice);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'fullyUsedUp' && debt.price === expectedPrice), true);
    assert.match(game._pending_message, /You feel shuddering vibrations\./);
});

test('floor polymorph shudder outside shop records robbed value instead of a bill row', async () => {
    const { shkp } = installCommandShopState();
    initRng(4);
    const wand = polymorphWand(32003, 'w');
    const ration = { ...foodRation(32004), ox: 5, oy: 5, letter: undefined, line: undefined };
    game.inventory = [wand];
    game.level.objects = [ration];
    game.u.ux = 5;
    game.u.uy = 6;
    game.level.at = (x, y) => ({
        roomno: (x === 5 && y === 5) || (x === 6 && y === 5) ? ROOMOFFSET : 0,
        typ: ROOM,
    });
    const expectedPrice = shop.shopItemPrice(ration, 5, 5);

    await rhack('z');
    await rhack('w');
    await rhack('k');

    assert.equal(game.level.objects.includes(ration), false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed, expectedPrice);
    assert.deepEqual(game._usedUpShopBills || [], []);
});

test('floor polymorph shudder bills only one unit from a shop-floor stack', async () => {
    const { shkp } = installCommandShopState();
    initRng(4);
    const wand = polymorphWand(32005, 'w');
    const stack = { ...foodRationStack(32006, 2), ox: 5, oy: 4, letter: undefined, line: undefined };
    game.inventory = [wand];
    game.level.objects = [stack];
    const expectedPrice = shop.shopItemPrice({ ...stack, quan: 1 }, 5, 4);

    await rhack('z');
    await rhack('w');
    await rhack('k');

    assert.equal(game.level.objects.includes(stack), true);
    assert.equal(stack.quan, 1);
    assert.equal(stack.unpaid, undefined);
    assert.equal(shop.shopBillEntryForObject(shkp, stack), null);
    assert.equal(shkp.billct, 1);
    const entry = shkp.bill[0];
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), expectedPrice);
    assert.equal((game._usedUpShopBills || []).some(bill =>
        String(bill.bo_id) === String(entry.bo_id) && bill.price === expectedPrice), true);
});

test('successful floor polymorph of shop stock angers shopkeeper without immediate debt', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const wand = polymorphWand(32007, 'w');
    const ration = { ...foodRation(32008), ox: 5, oy: 4, letter: undefined, line: undefined };
    game.inventory = [wand];
    game.level.objects = [ration];

    await rhack('z');
    await rhack('w');
    await rhack('k');

    assert.equal(game.level.objects.includes(ration), false);
    assert.equal(game.level.objects.length, 1);
    const replacement = game.level.objects[0];
    assert.notEqual(replacement, ration);
    assert.notEqual(replacement.id, ration.id);
    assert.equal(replacement.unpaid, undefined);
    assert.equal(replacement.unpaidPrice, undefined);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.deepEqual(game._usedUpShopBills || [], []);
    assert.equal(shkp.angry, true);
    assert.equal(shkp.hostile, true);
    assert.equal(shkp.mpeaceful, 0);
    assert.equal(shkp.following, 1);
    assert.equal(game.u.uconduct.polypiles, 1);
    assert.match(game._pending_message, /Izchak gets angry!/);
});

test('potion alchemy mixes healing and speed into diluted extra healing', async () => {
    installCommandShopState();
    initRng(1);
    const target = healingPotion(30980, 'h');
    const source = namedPotion(30981, 'speed', 's');
    game.inventory = [target, source];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('h');
    await rhack('n');
    await rhack('s');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(target), true);
    assert.equal(target.kind, 'extra healing');
    assert.equal(target.actualKind, 'potion of extra healing');
    assert.equal(target.potionIndex, 11);
    assert.equal(target.odiluted, true);
    assert.equal(target.blessed, false);
    assert.equal(target.cursed, false);
    assert.equal(target.bknown, false);
    assert.match(game._pending_message, /potion of healing mixes with potion of speed/);
    assert.match(game._pending_message, /The mixture looks/);
});

test('cursed potion alchemy explodes after consuming the source potion', async () => {
    installCommandShopState();
    initRng(1);
    game.u.uhp = 50;
    const target = confusionPotion(30982, 'c', 1, { cursed: true });
    const source = boozePotion(30983, 'b');
    game.inventory = [target, source];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('c');
    await rhack('n');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(target), false);
    assert.ok(game.u._confusionTimeout > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
    assert.ok(game.u.uhp < 50);
    assert.match(game._pending_message, /You feel somewhat dizzy\./);
    assert.match(game._pending_message, /BOOM!  They explode!/);
});

test('wet worn towel blocks alchemy explosion vapor effects', async () => {
    installCommandShopState();
    initRng(1);
    game.u.uhp = 50;
    const target = confusionPotion(30984, 'c', 1, { cursed: true });
    const source = boozePotion(30985, 'b');
    const towel = ordinaryTool(30986, 'towel', 't');
    towel.spe = 3;
    towel.wetness = 3;
    towel.worn = true;
    towel.line = 't - a towel (being worn)';
    game.inventory = [target, source, towel];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('c');
    await rhack('n');
    await rhack('b');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(game.inventory.includes(towel), true);
    assert.equal(game.u._confusionTimeout || 0, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Conf/);
    assert.ok(game.u.uhp < 50);
    assert.match(game._pending_message, /Some vapor passes harmlessly around you\./);
});

test('known blindness vapor from alchemy explosion discovers the potion', async () => {
    installCommandShopState();
    initRng(1);
    game.u.uhp = 50;
    const target = blindnessPotion(30987, 'b', 1, { cursed: true, dknown: true });
    const source = boozePotion(30988, 'z');
    game.inventory = [target, source];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('b');
    await rhack('n');
    await rhack('z');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.includes(source), false);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(game.u.blind, true);
    assert.ok(game.u._blindTimeout > 0);
    assert.match(game._pending_message, /It suddenly gets dark\./);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of blindness'), true);
});

test('dipping poisoned darts into healing-family potions removes the coating', async () => {
    const cases = [
        ['healing', healingPotion],
        ['extra healing', extraHealingPotion],
        ['full healing', fullHealingPotion],
    ];

    for (const [index, [name, factory]] of cases.entries()) {
        installCommandShopState();
        const target = dartStack(30943 + (index * 2), 'd', 2, { opoisoned: true });
        const potion = factory(30944 + (index * 2), name[0]);
        game.inventory = [target, potion];

        await rhack('#');
        for (const ch of 'dip') await rhack(ch);
        await rhack('\n');
        await rhack('d');
        await rhack('n');
        await rhack(name[0]);

        assert.equal(game._command_mode, null, name);
        assert.equal(game.context.move, 1, name);
        assert.equal(target.opoisoned, false, name);
        assert.doesNotMatch(target.line, /poisoned/, name);
        assert.equal(game.inventory.includes(potion), false, name);
        assert.match(game._pending_message, /A coating wears off the poisoned darts\./, name);
    }
});

test('dipping already poisoned darts into sickness does not consume the potion', async () => {
    installCommandShopState();
    const target = dartStack(30949, 'd', 2, { opoisoned: true });
    const potion = sicknessPotion(30950, 's');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('s');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.opoisoned, true);
    assert.equal(game.inventory.includes(potion), true);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('inventory action on blessed water starts source-first dip and skips fountains', async () => {
    installCommandShopState();
    const target = { ...dagger(30984, 'd'), cursed: true, bknown: true, line: 'd - a cursed dagger' };
    const water = waterPotion(30985, 'w', { blessed: true, bknown: true });
    game.inventory = [target, water];
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: FOUNTAIN });

    await rhack('i');
    await rhack('w');
    await rhack('a');

    assert.equal(game._command_mode, 'dipIntoTarget');
    assert.match(game._pending_message, /What do you want to dip into a potion of holy water\? \[d or \?\*\]/);
    assert.doesNotMatch(game._pending_message, /fountain/);

    await rhack('d');

    assert.equal(game._command_mode, null);
    assert.equal(target.cursed, false);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your cursed dagger glows amber\./);
});

test('dipping unpaid sickness stack into darts preserves residual billing without usage debit', async () => {
    const { shkp } = installCommandShopState();
    const target = dartStack(30951, 'd', 3);
    const potion = sicknessPotion(30952, 's', 2);
    game.inventory = [target, potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('s');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.opoisoned, true);
    assert.equal(potion.quan, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(potion.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(entry.bquan, 2);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'partlyUsedUp' && debt.price === 50), true);
    assert.equal(debts.some(debt => debt.billPortion === 'intact' && debt.price === 50), true);
    assert.match(game._pending_message, /forms a coating on the darts/);
    assert.doesNotMatch(game._pending_message, /Yendorian Fuel Tax|in addition to the cost/);
});

test('dipping permapoisoned Grimtooth into healing does not remove poison', async () => {
    installCommandShopState();
    const target = {
        ...dagger(30953, 'g'),
        kind: 'orcish dagger',
        actualKind: 'orcish dagger',
        artifact: 'Grimtooth',
        opoisoned: true,
        line: 'g - Grimtooth',
    };
    const potion = healingPotion(30954, 'h');
    game.inventory = [target, potion];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('g');
    await rhack('n');
    await rhack('h');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.opoisoned, true);
    assert.equal(game.inventory.includes(potion), true);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('dipping cursed items into blessed water uncurses and consumes the water', async () => {
    installCommandShopState();
    const target = { ...dagger(30972, 'd'), cursed: true, bknown: true, line: 'd - a cursed dagger' };
    const water = waterPotion(30973, 'w', { blessed: true, bknown: true });
    game.inventory = [target, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.cursed, false);
    assert.equal(target.blessed, undefined);
    assert.equal(target.bknown, true);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your cursed dagger glows amber\./);
});

test('dipping uncursed items into blessed water blesses them', async () => {
    installCommandShopState();
    const target = { ...dagger(30974, 'd'), bknown: true };
    const water = waterPotion(30975, 'w', { blessed: true, bknown: true });
    game.inventory = [target, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.blessed, true);
    assert.equal(target.cursed, false);
    assert.equal(target.bknown, true);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your dagger glows with a light blue aura\./);
});

test('dipping already blessed items into blessed water keeps the water', async () => {
    installCommandShopState();
    const target = { ...dagger(30976, 'd'), blessed: true, bknown: true, line: 'd - a blessed dagger' };
    const water = waterPotion(30977, 'w', { blessed: true, bknown: true });
    game.inventory = [target, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.blessed, true);
    assert.equal(game.inventory.includes(water), true);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('dipping blessed items into cursed water unblesses and consumes the water', async () => {
    installCommandShopState();
    const target = { ...dagger(30978, 'd'), blessed: true, bknown: true, line: 'd - a blessed dagger' };
    const water = waterPotion(30979, 'w', { cursed: true, bknown: true });
    game.inventory = [target, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.blessed, false);
    assert.equal(target.cursed, undefined);
    assert.equal(target.bknown, true);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your blessed dagger glows brown\./);
});

test('dipping uncursed items into cursed water curses them', async () => {
    installCommandShopState();
    const target = { ...dagger(30980, 'd'), bknown: true };
    const water = waterPotion(30981, 'w', { cursed: true, bknown: true });
    game.inventory = [target, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.blessed, false);
    assert.equal(target.cursed, true);
    assert.equal(target.bknown, true);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your dagger glows with a black aura\./);
});

test('dipping unpaid holy water into cursed water preserves a used-up devaluation bill', async () => {
    const { shkp } = installCommandShopState();
    const target = waterPotion(30982, 'h', { blessed: true, bknown: true });
    const water = waterPotion(30983, 'c', { cursed: true, bknown: true });
    game.inventory = [target, water];
    shop.addObjectToShopBill(shkp, target, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('h');
    await rhack('n');
    await rhack('c');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.blessed, false);
    assert.equal(target.cursed, false);
    assert.equal(target.bknown, true);
    assert.equal(game.inventory.includes(water), false);
    assert.equal(target.unpaid, false);
    assert.equal(shop.shopBillEntryForObject(shkp, target), null);
    assert.equal(shkp.billct, 1);
    assert.equal(shkp.bill[0].useup, true);
    assert.equal(shop.shopBillEntryTotal(shkp.bill[0]), 100);
    assert.match(game._pending_message, /Your potion of holy water glows brown\./);
    assert.match(game._pending_message, /You unbless that potion of holy water, you pay for it!/);
});

test('dipping unpaid holy water stack into an item preserves residual source billing', async () => {
    const { shkp } = installCommandShopState();
    const target = { ...dagger(30986, 'd'), cursed: true, bknown: true, line: 'd - a cursed dagger' };
    const water = waterPotion(30987, 'w', { blessed: true, bknown: true, quan: 2 });
    game.inventory = [target, water];
    shop.addObjectToShopBill(shkp, water, 200);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.cursed, false);
    assert.equal(water.quan, 1);
    assert.equal(game.inventory.includes(water), true);
    assert.equal(water.unpaid, true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, water);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(entry.bquan, 2);
    const debts = shop.collectPayableShopDebts(shkp);
    assert.equal(debts.some(debt => debt.billPortion === 'partlyUsedUp' && debt.price === 100), true);
    assert.equal(debts.some(debt => debt.billPortion === 'intact' && debt.price === 100), true);
    assert.match(game._pending_message, /Your cursed dagger glows amber\./);
    assert.doesNotMatch(game._pending_message, /Yendorian Fuel Tax|in addition to the cost/);
});

test('dipping a scroll into neutral water blanks it and consumes the water', async () => {
    installCommandShopState();
    const scroll = scrollOfCharging(31010, 's');
    const water = waterPotion(31011, 'w');
    game.inventory = [scroll, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('s');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(scroll.kind, 'blank paper');
    assert.equal(scroll.known, false);
    assert.equal(scroll.spe, 0);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your scroll of charging fades\./);
});

test('dipping a blank scroll into neutral water is Interesting and keeps the water', async () => {
    installCommandShopState();
    const scroll = blankScroll(31012, 's');
    const water = waterPotion(31013, 'w');
    game.inventory = [scroll, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('s');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(scroll.kind, 'blank paper');
    assert.equal(game.inventory.includes(water), true);
    assert.match(game._pending_message, /Interesting\.\.\./);
});

test('dipping a spellbook into neutral water blanks spell data and consumes the water', async () => {
    installCommandShopState();
    const book = healingSpellbook(31014, 'b');
    const water = waterPotion(31015, 'w');
    game.inventory = [book, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('b');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(book.kind, 'spellbook of blank paper');
    assert.equal(book.spellName, '');
    assert.equal(book.spell, null);
    assert.equal(book.known, false);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your spellbook of healing fades\./);
});

test('dipping unpaid acid into neutral water destroys acid and leaves a used-up bill', async () => {
    const { shkp } = installCommandShopState();
    const acid = acidPotion(31016, 'a');
    const water = waterPotion(31017, 'w');
    game.inventory = [acid, water];
    shop.addObjectToShopBill(shkp, acid, 100);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('a');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(acid), false);
    assert.equal(game.inventory.includes(water), false);
    assertUsedUpBillForObject(shkp, acid, 100);
    assert.match(game._pending_message, /Your potion of acid explodes!/);
});

test('dipping potions into neutral water dilutes then turns diluted potions into water', async () => {
    installCommandShopState();
    const potion = healingPotion(31018, 'h');
    const firstWater = waterPotion(31019, 'w');
    game.inventory = [potion, firstWater];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('h');
    await rhack('n');
    await rhack('w');

    assert.equal(potion.kind, 'healing');
    assert.equal(potion.odiluted, true);
    assert.equal(game.inventory.includes(firstWater), false);
    assert.match(game._pending_message, /Your potion of healing dilutes\./);

    const secondWater = waterPotion(31020, 'w');
    secondWater.letter = 'w';
    secondWater.line = 'w - a potion of water';
    game.inventory.push(secondWater);

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('h');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(potion.otyp, POT_WATER);
    assert.equal(potion.kind, 'water');
    assert.equal(potion.actualKind, 'potion of water');
    assert.equal(potion.blessed, false);
    assert.equal(potion.cursed, false);
    assert.equal(potion.odiluted, false);
    assert.equal(game.inventory.includes(secondWater), false);
    assert.match(game._pending_message, /Your diluted potion of healing dilutes further\./);
});

test('dipping a greased scroll into neutral water protects it and consumes the water', async () => {
    installCommandShopState();
    const scroll = { ...scrollOfCharging(31021, 's'), greased: true };
    const water = waterPotion(31022, 'w');
    game.inventory = [scroll, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('s');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(scroll.kind, 'scroll of charging');
    assert.equal(game.inventory.includes(water), false);
    assert.doesNotMatch(game._pending_message, /fades/);
});

test('dipping a rustable weapon into neutral water rusts it and consumes the water', async () => {
    installCommandShopState();
    const target = dagger(31023, 'd');
    const water = waterPotion(31024, 'w');
    game.inventory = [target, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('d');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(target.oeroded, 1);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Your dagger rusts!/);
});

test('dipping a dry towel into neutral water wets it and consumes the water', async () => {
    installCommandShopState();
    const towel = ordinaryTool(31025, 'towel', 't');
    towel.spe = 0;
    const water = waterPotion(31026, 'w');
    game.inventory = [towel, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('t');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.ok(towel.spe > 0);
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /The towel soaks it up!/);
});

test('dipping a sack into neutral water damages contained scrolls and consumes the water', async () => {
    installCommandShopState();
    const bag = sack(31027, 'b');
    const scroll = putObjectInContainer(bag, scrollOfCharging(31028));
    const water = waterPotion(31029, 'w');
    game.inventory = [bag, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('b');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(scroll.kind, 'blank paper');
    assert.equal(game.inventory.includes(water), false);
    assert.match(game._pending_message, /Some water gets into your bag!/);
});

test('dipping a greased sack into neutral water protects contents and consumes the water', async () => {
    installCommandShopState();
    const bag = { ...sack(31030, 'b'), greased: true };
    const scroll = putObjectInContainer(bag, scrollOfCharging(31031));
    const water = waterPotion(31032, 'w');
    game.inventory = [bag, water];

    await rhack('#');
    for (const ch of 'dip') await rhack(ch);
    await rhack('\n');
    await rhack('b');
    await rhack('n');
    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(scroll.kind, 'scroll of charging');
    assert.equal(game.inventory.includes(water), false);
    assert.doesNotMatch(game._pending_message, /Some water gets into your bag!/);
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

test('untrapping a squeaky board with unpaid grease bills one charge before repair', async () => {
    const { shkp } = installCommandShopState();
    const trap = installSeenSqueakyBoardEast();
    const grease = chargedTool(3096, 'can of grease', 'g', 4);
    game.inventory = [grease];
    shop.addObjectToShopBill(shkp, grease, 100);
    const expectedFee = expectedUnpaidUsageFee(grease);

    await rhack('#');
    for (const ch of 'untrap') await rhack(ch);
    await rhack('\n');

    assert.equal(game._command_mode, 'untrapDirection');
    assert.match(game._pending_message, /In what direction\?/);

    await rhack('l');

    assert.equal(game._command_mode, 'untrapSqueakyTool');
    assert.match(game._pending_message, /What do you want to untrap with\? \[g or \?\*\]/);
    assert.equal(grease.spe, 4);
    assert.equal(game.level.traps.includes(trap), true);
    assert.equal(shkp.debit || 0, 0);

    await rhack('g');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(grease.spe, 3);
    assert.equal(game.level.traps.includes(trap), false);
    assert.equal(shkp.debit, expectedFee);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, grease);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.equal(grease.unpaid, true);
    assert.match(game._pending_message, new RegExp(`Usage fee, ${expectedFee} zorkmids`));
    assert.match(game._pending_message, /You repair the squeaky board\./);
    assert.ok(game._pending_message.indexOf('Usage fee') < game._pending_message.indexOf('You repair'));
});

test('untrapping a squeaky board with stale unpaid grease spends charge without debt', async () => {
    const { shkp } = installCommandShopState();
    const trap = installSeenSqueakyBoardEast();
    const grease = chargedTool(3097, 'can of grease', 'g', 4);
    grease.unpaid = true;
    grease.unpaidPrice = 100;
    game.inventory = [grease];

    await rhack('#');
    for (const ch of 'untrap') await rhack(ch);
    await rhack('\n');
    await rhack('l');
    await rhack('g');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(grease.spe, 3);
    assert.equal(game.level.traps.includes(trap), false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, grease), null);
    assert.match(game._pending_message, /You repair the squeaky board\./);
    assert.doesNotMatch(game._pending_message, /Usage fee/);
});

test('untrapping a squeaky board with unpaid oil consumes the potion as used-up stock', async () => {
    const { shkp } = installCommandShopState();
    const trap = installSeenSqueakyBoardEast();
    const potion = oilPotion(3098, 'o');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'untrap') await rhack(ch);
    await rhack('\n');
    await rhack('l');

    assert.equal(game._command_mode, 'untrapSqueakyTool');
    assert.match(game._pending_message, /What do you want to untrap with\? \[o or \?\*\]/);

    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.traps.includes(trap), false);
    assert.equal(potion.known, true);
    assert.equal(potion.unpaid, false);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, true);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.match(game._pending_message, /You repair the squeaky board\./);
    assert.doesNotMatch(game._pending_message, /Usage fee|Yendorian Fuel Tax|in addition to the cost/);
});

test('untrapping a squeaky board with lit oil fails without consuming it', async () => {
    const { shkp } = installCommandShopState();
    const trap = installSeenSqueakyBoardEast();
    const potion = oilPotion(3099, 'o');
    potion.lamplit = true;
    potion.burning = true;
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'untrap') await rhack(ch);
    await rhack('\n');
    await rhack('l');
    await rhack('o');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(game.level.traps.includes(trap), true);
    assert.equal(potion.lamplit, true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.match(game._pending_message, /That squeaky board is difficult to disarm\./);
});

test('untrapping a squeaky board with a non-oil potion fails without consuming it', async () => {
    const { shkp } = installCommandShopState();
    const trap = installSeenSqueakyBoardEast();
    const potion = waterPotion(3100, 'w');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 100);

    await rhack('#');
    for (const ch of 'untrap') await rhack(ch);
    await rhack('\n');
    await rhack('l');

    assert.equal(game._command_mode, 'untrapSqueakyTool');
    assert.match(game._pending_message, /What do you want to untrap with\? \[\*\]/);

    await rhack('w');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.includes(potion), true);
    assert.equal(game.level.traps.includes(trap), true);
    assert.equal(shkp.debit || 0, 0);
    const entry = shop.shopBillEntryForObject(shkp, potion);
    assert.ok(entry);
    assert.equal(entry.useup, false);
    assert.equal(shop.shopBillEntryTotal(entry), 100);
    assert.match(game._pending_message, /That squeaky board is difficult to disarm\./);
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

test('named metallivorous polyself forms eat metal tins through diet overlay', async () => {
    for (const formName of ['rust monster', 'xorn']) {
        installCommandShopState();
        game.u._polyself_form = { name: formName, nohands: false, verysmall: false };
        const can = tin(30944, 't');
        can.spe = 0;
        can.corpsenm = null;
        can.emptyTin = true;
        can.kind = 'empty tin';
        can.singular = 'empty tin';
        can.plural = 'empty tins';
        game.inventory = [can];

        await rhack('e');
        await rhack('t');

        assert.equal(game._command_mode, null, formName);
        assert.equal(game.inventory.includes(can), false, formName);
        assert.equal(game.u.uhunger, 905, formName);
        assert.match(game._pending_message, /You bite right into the metal tin\.\.\./, formName);
        assert.match(game._pending_message, /It turns out to be empty\./, formName);
        assert.doesNotMatch(game._pending_message, /Eat it\?|smells like/, formName);
    }
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

test('polyself diet overlay drives tripe first-bite wording', async () => {
    const cases = [
        { formName: 'wolf', message: 'This tripe ration is surprisingly good!', experience: 0 },
        { formName: 'orc-captain', message: 'Mmm, tripe... not bad!', experience: 0 },
    ];

    for (const entry of cases) {
        installCommandShopState();
        game.u._polyself_form = { name: entry.formName };
        const food = simpleFood(31886, 'tripe ration', 't');
        game.inventory = [food];

        await rhack('e');
        await rhack('t');

        assert.equal(game._pending_message, entry.message, entry.formName);
        assert.equal(game.inventory.includes(food), true, entry.formName);
        assert.equal(food.oeaten, 100, entry.formName);
        assert.equal(game.u.uhunger, 1000, entry.formName);
        assert.equal(game._eating_turns_remaining, 2, entry.formName);
        assert.equal(game.u.uexp || 0, entry.experience, entry.formName);
        assert.equal(game.u.vomiting || 0, 0, entry.formName);
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
    const cases = [
        ['meatball', 'm'],
        ['meat stick', 's'],
    ];

    for (const [index, [kind, letter]] of cases.entries()) {
        installNonShopFloorState();
        const food = simpleFood(31886 + index, kind, letter, {
            otyp: kind === 'meat stick' ? MEAT_STICK : undefined,
        });
        game.inventory = [food];

        await rhack('e');
        await rhack(letter);

        assert.equal(game._pending_message, `This ${kind} is delicious!`, kind);
        assert.equal(game.inventory.includes(food), false, kind);
        assert.equal(game.u.uhunger, 905, kind);
        assert.equal(game.u.uconduct?.food, 1, kind);
        assert.equal(game.u.uconduct?.unvegan, 1, kind);
        assert.equal(game.u.uconduct?.unvegetarian, 1, kind);
        assert.equal(game._eating_turns_remaining || 0, 0, kind);
        assert.equal(game.context.move, 1, kind);
    }
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

test('carnivorous pets treat stone-to-flesh meat as dog food', async () => {
    const cases = [
        ['meatball', () => simpleFood(31964, 'meatball', undefined, { otyp: MEATBALL })],
        ['meat ring', () => meatRingFood(31965, undefined)],
        ['meat stick', () => simpleFood(31966, 'meat stick', undefined, { otyp: MEAT_STICK })],
        ['enormous meatball', () => simpleFood(31967, 'enormous meatball', undefined, { otyp: ENORMOUS_MEATBALL })],
        ['otyp-only meatball', () => {
            const food = simpleFood(31968, 'meatball', undefined, { otyp: MEATBALL });
            delete food.kind;
            delete food.actualKind;
            return food;
        }],
    ];
    const petCases = [
        ['dog', { name: 'dog', cwt: 400, mmove: NORMAL_SPEED }],
        ['wolf', { name: 'wolf', cwt: 500, mmove: NORMAL_SPEED }],
    ];

    for (const [petName, petData] of petCases) {
        for (const [name, makeFood] of cases) {
            const label = `${petName} ${name}`;
            installNonShopFloorState();
            initRng(1);
            resetInputState();
            pushKey('\x1b');
            game.moves = 1;
            game.context = {};
            game.u.umovement = NORMAL_SPEED;
            for (let x = 5; x <= 8; x++) markSquareVisible(x, 5);
            const pet = {
                mx: 7,
                my: 5,
                movement: NORMAL_SPEED,
                data: {
                    mlet: 'd',
                    attack: { dice: 1, sides: 6, verb: 'bites' },
                    ...petData,
                },
                pet: true,
                mtame: 10,
                mpeaceful: true,
                mhp: 10,
                mhpmax: 10,
                mcansee: true,
                mextra: {
                    edog: {
                        apport: 3,
                        hungrytime: 1000,
                        whistletime: 0,
                        ogoal: { x: 0, y: 0 },
                    },
                },
                minvent: [],
            };
            const food = makeFood();
            Object.assign(food, { ox: 8, oy: 5 });
            delete food.letter;
            delete food.line;
            game.level.monsters = [pet];
            game.level.objects = [food];
            game._pending_time_passed = 1;

            await moveloop_core();
            resetInputState();

            assert.equal(pet.mx, 8, label);
            assert.equal(pet.my, 5, label);
            assert.equal(game.level.objects.includes(food), false, label);
            assert.ok((pet.meating || 0) > 0, label);
            assert.ok(pet.mextra.edog.hungrytime > 1000, label);
        }
    }
});

test('diet flags let carnivorous pets eat stone-to-flesh meat', async () => {
    installNonShopFloorState();
    initRng(1);
    resetInputState();
    pushKey('\x1b');
    game.moves = 1;
    game.context = {};
    game.u.umovement = NORMAL_SPEED;
    for (let x = 5; x <= 8; x++) markSquareVisible(x, 5);
    const pet = {
        mx: 7,
        my: 5,
        movement: NORMAL_SPEED,
        data: {
            name: 'custom carnivore',
            mlet: 'Y',
            mmove: NORMAL_SPEED,
            cwt: 700,
            carnivorous: true,
            attack: { dice: 1, sides: 6, verb: 'bites' },
        },
        pet: true,
        mtame: 10,
        mpeaceful: true,
        mhp: 10,
        mhpmax: 10,
        mcansee: true,
        mextra: {
            edog: {
                apport: 3,
                hungrytime: 1000,
                whistletime: 0,
                ogoal: { x: 0, y: 0 },
            },
        },
        minvent: [],
    };
    const food = simpleFood(31969, 'meat stick', undefined, { otyp: MEAT_STICK });
    Object.assign(food, { ox: 8, oy: 5 });
    delete food.letter;
    delete food.line;
    game.level.monsters = [pet];
    game.level.objects = [food];
    game._pending_time_passed = 1;

    await moveloop_core();
    resetInputState();

    assert.equal(pet.mx, 8);
    assert.equal(pet.my, 5);
    assert.equal(game.level.objects.includes(food), false);
    assert.ok((pet.meating || 0) > 0);
    assert.ok(pet.mextra.edog.hungrytime > 1000);
});

function ghoulFoodTestPet({ hungrytime = 1000, mhpmaxPenalty = 0 } = {}) {
    return {
        mx: 7,
        my: 5,
        movement: NORMAL_SPEED,
        data: {
            name: 'ghoul',
            mlet: 'Z',
            mmove: NORMAL_SPEED,
            cwt: 400,
            attack: { dice: 1, sides: 6, verb: 'bites' },
        },
        pet: true,
        mtame: 10,
        mpeaceful: true,
        mhp: 10,
        mhpmax: 10,
        mcansee: true,
        mextra: {
            edog: {
                apport: 3,
                hungrytime,
                whistletime: 0,
                ogoal: { x: 0, y: 0 },
                mhpmax_penalty: mhpmaxPenalty,
            },
        },
        minvent: [],
    };
}

async function runPetFoodTurn(pet, food, { moves = 1 } = {}) {
    installNonShopFloorState();
    initRng(1);
    resetInputState();
    pushKey('\x1b');
    game.moves = moves;
    game.context = {};
    game.u.umovement = NORMAL_SPEED;
    for (let x = 5; x <= 8; x++) markSquareVisible(x, 5);
    Object.assign(food, { ox: 8, oy: 5 });
    delete food.letter;
    delete food.line;
    game.level.monsters = [pet];
    game.level.objects = [food];
    game._pending_time_passed = 1;

    await moveloop_core();
    resetInputState();
}

test('ghoul pets prefer old corpses and stale eggs', async () => {
    const cases = [
        ['old corpse', { ...corpse(31970, undefined, 'newt', 20), oldCorpse: true }, { moves: 200 }],
        ['stale egg', { ...egg(31971), otyp: EGG, age: 1, corpsenm: { name: 'newt' } }, { moves: 500 }],
    ];

    for (const [label, food, options] of cases) {
        const pet = ghoulFoodTestPet();

        await runPetFoodTurn(pet, food, options);

        assert.equal(pet.mx, 8, label);
        assert.equal(pet.my, 5, label);
        assert.equal(game.level.objects.includes(food), false, label);
        assert.ok((pet.meating || 0) > 0, label);
    }
});

test('ghoul pets only take fresh corpses when starving and reject stone-to-flesh meat', async () => {
    const freshCorpse = corpse(31972, undefined, 'newt', 20);
    const starvingGhoul = ghoulFoodTestPet({ hungrytime: 0, mhpmaxPenalty: 1 });

    await runPetFoodTurn(starvingGhoul, freshCorpse);

    assert.equal(starvingGhoul.mx, 8);
    assert.equal(starvingGhoul.my, 5);
    assert.equal(game.level.objects.includes(freshCorpse), false);
    assert.ok((starvingGhoul.meating || 0) > 0);

    const meat = simpleFood(31973, 'meatball', undefined, { otyp: MEATBALL });
    const satedGhoul = ghoulFoodTestPet();

    await runPetFoodTurn(satedGhoul, meat);

    assert.equal(game.level.objects.includes(meat), true);
    assert.equal(satedGhoul.meating || 0, 0);
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
    markHeroSquareVisible();
    const potion = confusionPotion(51204, 'c');
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 80);

    await rhack('d');
    await rhack('c');

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
    assert.equal(potion.unpaid, false);
    assert.match(game._pending_message, /The potion of confusion heats up as it hits the hot ground\./);
    assert.match(game._pending_message, /shattering noise|shatters from the heat/);
    assert.match(game._pending_message, /You smell a peculiar odor\.\.\./);
    assert.match(game._pending_message, /You feel somewhat dizzy\./);
    assert.ok(game.u._confusionTimeout > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
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

test('boulder burial converts unpaid shop-floor object to post-credit debt', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    shkp.credit = 5;
    const blade = { ...dagger(512030), letter: undefined, line: undefined, ox: 5, oy: 5 };
    shop.addObjectToShopBill(shkp, blade, 15);
    game.level.objects = [blade];
    const messages = [];

    const consumed = earthFloorEffects(floorBoulder(512031), 5, 5, messages, 'fall');

    assert.equal(consumed, true);
    assert.match(messages.join(' '), /owe Izchak 10 zorkmids? for burying merchandise/);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(game.level.buriedobjlist.includes(blade), true);
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.unpaid, false);
    assert.equal(blade.unpaidPrice, undefined);
    assert.equal(blade.no_charge, true);
});

test('boulder burial charges owner-billed no-charge merchandise to bill owner', () => {
    const { shkp } = installShopState();
    const owner = addSecondShopkeeper();
    installSeenHoleAtHero();
    initRng(1);
    const ration = { ...foodRation(512032), letter: undefined, line: undefined, ox: 5, oy: 5 };
    shop.addObjectToShopBill(owner, ration, 45);
    ration.no_charge = true;
    game.level.objects = [ration];
    const messages = [];

    const consumed = earthFloorEffects(floorBoulder(512033), 5, 5, messages, 'fall');

    assert.equal(consumed, true);
    assert.match(messages.join(' '), /owe Izchak 45 zorkmids? for burying merchandise/);
    assert.equal(owner.debit, 45);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(owner.billct, 0);
    assert.equal(shop.shopBillEntryForObject(owner, ration), null);
    assert.equal(ration.unpaid, false);
    assert.equal(ration.no_charge, true);
    assert.equal(game.level.buriedobjlist.includes(ration), true);
});

test('boulder burial charges no-charge container contents and contained gold', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    const box = shopFloorContainer(512034);
    box.no_charge = true;
    const blade = putObjectInContainer(box, dagger(512035));
    const free = putObjectInContainer(box, foodRation(512036));
    free.no_charge = true;
    putObjectInContainer(box, goldPieces(512037, 7));
    const expected = shop.shopItemPrice(blade, 5, 5) + 7;
    game.level.objects = [box];
    const messages = [];

    const consumed = earthFloorEffects(floorBoulder(512038), 5, 5, messages, 'fall');

    assert.equal(consumed, true);
    assert.match(messages.join(' '), new RegExp(`owe Izchak ${expected} zorkmids? for burying merchandise`));
    assert.equal(shkp.debit, expected);
    assert.equal(game.level.objects.includes(box), false);
    assert.equal(game.level.buriedobjlist.includes(box), true);
    assert.equal(box.no_charge, true);
    assert.notEqual(blade.no_charge, true);
    assert.equal(free.no_charge, true);
});

test('boulder burial routes angry shopkeeper loss to robbed', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    shkp.angry = true;
    const blade = { ...dagger(512039), letter: undefined, line: undefined, ox: 5, oy: 5 };
    const expected = shop.shopItemPrice(blade, 5, 5);
    game.level.objects = [blade];
    const messages = [];

    const consumed = earthFloorEffects(floorBoulder(512040), 5, 5, messages, 'fall');

    assert.equal(consumed, true);
    assert.match(messages.join(' '), new RegExp(`owe Izchak ${expected} zorkmids? for burying merchandise`));
    assert.equal(shkp.robbed, expected);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(blade.no_charge, true);
    assert.equal(game.level.buriedobjlist.includes(blade), true);
});

async function zapColdWandNorthAtShopPool(pool) {
    const cells = new Map();
    cells.set('5,4', pool);
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: ROOMOFFSET, typ: ROOM };
    game.level.buriedobjlist = [];
    markSquareVisible(5, 4);
    game.inventory = [coldWand(512041, 'w')];

    await rhack('z');
    await rhack('w');
    await rhack('k');
}

test('cold ray freezing shop water charges buried merchandise before burial', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const pool = { roomno: ROOMOFFSET, typ: POOL, flags: 0 };
    const blade = { ...dagger(512042), letter: undefined, line: undefined, ox: 5, oy: 4 };
    const expected = shop.shopItemPrice(blade, 5, 4);
    game.level.objects = [blade];

    await zapColdWandNorthAtShopPool(pool);

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(pool.typ, ICE);
    assert.equal(pool.icedpool, ICED_POOL);
    assert.match(game._pending_message, new RegExp(`owe Izchak ${expected} zorkmids? for burying merchandise`));
    assert.match(game._pending_message, /The water freezes\./);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(game.level.buriedobjlist.includes(blade), true);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.no_charge, true);
});

test('cold ray burial charges owner-billed no-charge merchandise to bill owner', async () => {
    installCommandShopState();
    const owner = addSecondShopkeeper();
    initRng(1);
    const pool = { roomno: ROOMOFFSET, typ: POOL, flags: 0 };
    const ration = { ...foodRation(512043), letter: undefined, line: undefined, ox: 5, oy: 4 };
    shop.addObjectToShopBill(owner, ration, 45);
    ration.no_charge = true;
    game.level.objects = [ration];

    await zapColdWandNorthAtShopPool(pool);

    assert.equal(pool.typ, ICE);
    assert.match(game._pending_message, /owe Izchak 45 zorkmids? for burying merchandise/);
    assert.equal(owner.debit, 45);
    assert.equal(owner.billct, 0);
    assert.equal(shop.shopBillEntryForObject(owner, ration), null);
    assert.equal(ration.unpaid, false);
    assert.equal(ration.no_charge, true);
    assert.equal(game.level.objects.includes(ration), false);
    assert.equal(game.level.buriedobjlist.includes(ration), true);
});

async function zapFireWandNorthAtShopIce(iceLoc) {
    const cells = new Map();
    cells.set('5,4', iceLoc);
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: ROOMOFFSET, typ: ROOM };
    game.level.buriedobjlist = [];
    markSquareVisible(5, 4);
    game.inventory = [fireWand(512044, 'w')];

    await rhack('z');
    await rhack('w');
    await rhack('k');
}

test('hero fire ray melting shop ice charges stock buried by settling boulder', async () => {
    const { shkp } = installCommandShopState();
    initRng(2);
    const iceLoc = { roomno: ROOMOFFSET, typ: ICE, icedpool: ICED_POOL, flags: 0 };
    const boulder = floorBoulder(512045, { ox: 5, oy: 4 });
    const blade = { ...dagger(512046), letter: undefined, line: undefined, ox: 5, oy: 4 };
    const expected = shop.shopItemPrice(blade, 5, 4);
    game.level.objects = [boulder, blade];

    await zapFireWandNorthAtShopIce(iceLoc);

    assert.equal(game._command_mode, null);
    assert.equal(game.context.move, 1);
    assert.equal(iceLoc.typ, ROOM);
    assert.match(game._pending_message, /The ice crackles and melts\./);
    assert.match(game._pending_message, /A boulder settles\./);
    assert.match(game._pending_message, new RegExp(`owe Izchak ${expected} zorkmids? for burying merchandise`));
    assert.equal(game.level.objects.includes(boulder), false);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(game.level.buriedobjlist.includes(blade), true);
    assert.equal(shkp.debit, expected);
    assert.equal(blade.no_charge, true);
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

test('impact-dropped potion arriving with hero applies breakage vapor', () => {
    installShopState();
    initRng(1);
    const potion = { ...confusionPotion(512023), letter: undefined, line: undefined };

    const message = shop.deliverImpactDroppedObjects([potion]);

    assert.equal(game.level.objects.includes(potion), false);
    assert.ok(game.u._confusionTimeout > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
    assert.match(message, /potion of confusion shatters!/);
    assert.match(message, /You smell a peculiar odor\.\.\./);
    assert.match(message, /You feel somewhat dizzy\./);
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

test('blade-forced box lock does not consume the chest destruction roll', () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    enableRngLog({ reset: true });
    const box = shopFloorContainer(6110);
    box.locked = true;
    box.olocked = true;
    box.lknown = true;
    putObjectInContainer(box, dagger(6111));
    game.level.objects = [box];

    const destroyed = finishForceLock({ chest: box, picktyp: true });

    assert.equal(destroyed, false);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(3)=')), []);
    assert.equal(shkp.billct, 1);
});

test('blade force can break one weapon before the success roll', () => {
    installCommandShopState();
    initRng(31);
    const box = shopFloorContainer(6148);
    box.locked = true;
    box.olocked = true;
    const blade = dagger(6149, 'd');
    blade.wielded = true;
    blade.line = 'd - a very corroded dagger (weapon in right hand)';
    blade.oeroded2 = 3;
    game.inventory = [blade];
    game.level.objects = [box];
    enableRngLog({ reset: true });

    const result = processForceLockOccupationTick({
        chest: box,
        weapon: blade,
        picktyp: true,
        chance: 100,
    });

    assert.equal(result.stop, true);
    assert.match(result.messages.join('  '), /Your dagger broke!  You give up your attempt to force the lock\./);
    assert.equal(game.inventory.includes(blade), false);
    assert.equal(box.locked, true);
    assert.equal(box.olocked, true);
    assert.notEqual(box.obroken, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(1000)', 'rn2(100)', 'rn2(19)',
    ]);
});

test('cursed blade force cannot break and does not roll object resistance', () => {
    installCommandShopState();
    initRng(31);
    const box = shopFloorContainer(6150);
    box.locked = true;
    box.olocked = true;
    const blade = dagger(6151, 'd');
    blade.wielded = true;
    blade.cursed = true;
    blade.oeroded2 = 3;
    game.inventory = [blade];
    game.level.objects = [box];
    enableRngLog({ reset: true });

    const result = processForceLockOccupationTick({
        chest: box,
        weapon: blade,
        picktyp: true,
        chance: 0,
    });

    assert.equal(result.stop, false);
    assert.deepEqual(result.messages, []);
    assert.equal(game.inventory.includes(blade), true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(1000)']);
});

test('blunt force wakes nearby sleepers without anger or paralysis cleanup', () => {
    installCommandShopState();
    game.u.blind = true;
    game.u.ulevel = 1;
    const weapon = wieldedWeapon(6153, 'mace', 'm');
    const sleeper = sleepingMonster('orc', 8, 5);
    sleeper.mstrategy = STRAT_WAITFORU;
    sleeper.waiting = true;
    const uniqueSleeper = sleepingMonster('Medusa', 6, 5, { unique: true });
    uniqueSleeper.mstrategy = STRAT_WAITFORU;
    uniqueSleeper.waiting = true;
    const mimicSleeper = sleepingMonster('large mimic', 7, 6);
    mimicSleeper.appearObj = 'door';
    mimicSleeper.appearGlyph = '+';
    const farSleeper = sleepingMonster('gnome', 10, 5);
    game.inventory = [weapon];
    game.level.monsters.push(sleeper, uniqueSleeper, mimicSleeper, farSleeper);

    const result = processForceLockOccupationTick({
        chest: shopFloorContainer(6152),
        weapon,
        picktyp: false,
        chance: 0,
    });

    assert.equal(result.stop, false);
    assert.deepEqual(result.messages, []);
    assert.equal(sleeper.msleeping, 0);
    assert.equal(sleeper.mpeaceful, true);
    assert.equal(sleeper.mfrozen, 3);
    assert.equal(sleeper.mcanmove, false);
    assert.equal(sleeper.mstrategy, 0);
    assert.equal(sleeper.waiting, false);
    assert.equal(uniqueSleeper.msleeping, 0);
    assert.equal(uniqueSleeper.mstrategy, STRAT_WAITFORU);
    assert.equal(uniqueSleeper.waiting, true);
    assert.equal(mimicSleeper.msleeping, 0);
    assert.equal(mimicSleeper.appearObj, 'door');
    assert.equal(mimicSleeper.appearGlyph, '+');
    assert.equal(farSleeper.msleeping, 1);
});

test('blunt force disturbs nearby buried zombie corpse timers', () => {
    installCommandShopState();
    game.moves = 100;
    const weapon = wieldedWeapon(61620, 'mace', 'm');
    const listCorpse = zombieCorpse(61621, 6, 5, { buried: false, zombifyTurn: 190, rotAwayTurn: 130, reviveTurn: 140 });
    const floorBuried = zombieCorpse(61622, 5, 6, { zombifyTurn: 160 });
    const farBuried = zombieCorpse(61623, 7, 5, { zombifyTurn: 190 });
    const rotOnly = zombieCorpse(61624, 5, 4, { rotAwayTurn: 190, reviveTurn: 180 });
    const unburiedFloorCorpse = zombieCorpse(61625, 5, 5, { buried: false, zombifyTurn: 190 });
    const dueCorpse = zombieCorpse(61626, 4, 5, { zombifyTurn: 100 });
    game.inventory = [weapon];
    game.level.buriedobjlist = [listCorpse, dueCorpse];
    game.level.objects = [listCorpse, floorBuried, farBuried, rotOnly, unburiedFloorCorpse];

    const result = processForceLockOccupationTick({
        chest: shopFloorContainer(61627),
        weapon,
        picktyp: false,
        chance: 0,
    });

    assert.equal(result.stop, false);
    assert.deepEqual(result.messages, []);
    assert.equal(listCorpse.zombifyTurn, 160);
    assert.equal(listCorpse.rotAwayTurn, 130);
    assert.equal(listCorpse.reviveTurn, 140);
    assert.equal(floorBuried.zombifyTurn, 140);
    assert.equal(farBuried.zombifyTurn, 190);
    assert.equal(rotOnly.rotAwayTurn, 190);
    assert.equal(rotOnly.reviveTurn, 180);
    assert.equal(unburiedFloorCorpse.zombifyTurn, 190);
    assert.equal(dueCorpse.zombifyTurn, 100);
});

test('blunt force gives up if the weapon is gone before waking sleepers', () => {
    installCommandShopState();
    const sleeper = sleepingMonster('orc', 8, 5);
    const corpse = zombieCorpse(61629, 5, 5, { zombifyTurn: 190 });
    game.level.monsters.push(sleeper);
    game.level.buriedobjlist = [corpse];

    const result = processForceLockOccupationTick({
        chest: shopFloorContainer(6156),
        weapon: wieldedWeapon(6157, 'mace', 'm'),
        picktyp: false,
        chance: 100,
    });

    assert.equal(result.stop, true);
    assert.deepEqual(result.messages, ['You give up your attempt to force the lock.']);
    assert.equal(sleeper.msleeping, 1);
    assert.equal(corpse.zombifyTurn, 190);
});

test('blunt force gives up with no hands before waking sleepers or rolling success', () => {
    installCommandShopState();
    initRng(1);
    game.u._polyself_form = { name: 'gas spore', nohands: true };
    const weapon = wieldedWeapon(6158, 'mace', 'm');
    const sleeper = sleepingMonster('orc', 8, 5);
    const corpse = zombieCorpse(61630, 5, 5, { zombifyTurn: 190 });
    game.inventory = [weapon];
    game.level.monsters.push(sleeper);
    game.level.buriedobjlist = [corpse];
    enableRngLog({ reset: true });

    const result = processForceLockOccupationTick({
        chest: shopFloorContainer(6159),
        weapon,
        picktyp: false,
        chance: 100,
    });

    assert.equal(result.stop, true);
    assert.deepEqual(result.messages, ['You give up your attempt to force the lock.']);
    assert.equal(sleeper.msleeping, 1);
    assert.equal(corpse.zombifyTurn, 190);
    assert.deepEqual(getRngLog(), []);
});

test('blade force does not wake nearby sleepers on an unbroken tick', () => {
    installCommandShopState();
    initRng(1);
    game.u.ulevel = 1;
    const sleeper = sleepingMonster('orc', 8, 5);
    const blade = dagger(6154, 'd');
    blade.wielded = true;
    const corpse = zombieCorpse(61628, 5, 5, { zombifyTurn: 190 });
    game.inventory = [blade];
    game.level.monsters.push(sleeper);
    game.level.buriedobjlist = [corpse];

    const result = processForceLockOccupationTick({
        chest: shopFloorContainer(6155),
        weapon: blade,
        picktyp: true,
        chance: 0,
    });

    assert.equal(result.stop, false);
    assert.deepEqual(result.messages, []);
    assert.equal(sleeper.msleeping, 1);
    assert.equal(corpse.zombifyTurn, 190);
});

test('force occupation give-up after real effort exercises the matching attribute', () => {
    installCommandShopState();
    initRng(1);
    const box = shopFloorContainer(6160);
    box.locked = true;
    box.olocked = true;
    const corpse = zombieCorpse(61631, 5, 5, { zombifyTurn: 190 });
    game.level.objects = [box];
    game.level.buriedobjlist = [corpse];
    game.u.acurr.a[A_STR] = -1;
    game._force_lock_occupation = {
        chest: box,
        weapon: wieldedWeapon(6161, 'club', 'c'),
        picktyp: false,
        chance: 100,
        usedtime: 49,
    };
    enableRngLog({ reset: true });

    processForceLockOccupation();

    assert.equal(game._force_lock_occupation, null);
    assert.equal(game._pending_message, 'You give up your attempt to force the lock.');
    assert.equal(game.u._aexe[A_STR], 1);
    assert.equal(corpse.zombifyTurn, 190);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(19)']);
});

test('successful blade force calls real Dexterity exercise', () => {
    installCommandShopState();
    initRng(1);
    const box = shopFloorContainer(6162);
    box.locked = true;
    box.olocked = true;
    game.level.objects = [box];
    game.u.acurr.a[A_DEX] = -1;
    enableRngLog({ reset: true });

    const destroyed = finishForceLock({ chest: box, picktyp: true });

    assert.equal(destroyed, false);
    assert.equal(game.u._aexe[A_DEX], 1);
    assert.equal(getRngLog()[0]?.replace(/=.*/, ''), 'rn2(19)');
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(3)=')), []);
});

test('dagger #force command uses blade prying and skips chest destruction roll', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const box = shopFloorContainer(6122);
    box.locked = true;
    box.olocked = true;
    box.lknown = true;
    game.level.objects = [box];
    const blade = dagger(6123, 'd');
    blade.wielded = true;
    blade.line = 'd - a dagger (weapon in right hand)';
    game.inventory = [blade];

    await startForceCommand();
    assert.equal(game._command_mode, 'forceConfirm');
    await rhack('y');

    assert.match(game._pending_message, /You force your dagger into a crack and pry\./);
    assert.equal(game._force_lock_occupation?.picktyp, true);
    assert.equal(game._force_lock_occupation?.weapon, blade);
    assert.equal(game._force_lock_occupation?.chance, 6);
    enableRngLog({ reset: true });
    const destroyed = finishForceLock(game._force_lock_occupation);
    game._force_lock_occupation = null;

    assert.equal(destroyed, false);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(3)=')), []);
    assert.equal(shkp.billct, 1);
});

test('#force command stores C oc_wldam chance for common blunt and piercing weapons', async () => {
    const cases = [
        ['spear', 16],
        ['dwarvish spear', 16],
        ['club', 6],
        ['mace', 12],
        ['war hammer', 8],
    ];

    for (const [kind, expectedChance] of cases) {
        installCommandShopState();
        initRng(1);
        const box = shopFloorContainer(6163 + expectedChance + kind.length);
        box.locked = true;
        box.olocked = true;
        game.level.objects = [box];
        const weapon = wieldedWeapon(6170 + expectedChance + kind.length, kind, 'w');
        game.inventory = [weapon];

        await startForceCommand();
        assert.equal(game._command_mode, 'forceConfirm', kind);
        await rhack('y');

        assert.equal(game._force_lock_occupation?.chance, expectedChance, kind);
        game._force_lock_occupation = null;
        acknowledgePendingMessage();
    }
});

test('destroyed box shatters potion contents with direct vapor and stack survivor', async () => {
    installNonShopFloorState();
    initRng(5);
    const box = shopFloorContainer(6112);
    box.locked = true;
    box.olocked = true;
    const potion = putObjectInContainer(box, confusionPotion(6113, undefined, 3));
    delete potion.letter;
    delete potion.line;
    game.level.objects = [box];

    const destroyed = finishForceLock({ chest: box, picktyp: false });
    const messages = await drainQueuedMessagesAfterMore();
    const text = messages.join('  ');

    assert.equal(destroyed, true);
    assert.match(text, /In fact, you've totally destroyed the large box\./);
    assert.match(text, /You see (?:a|an) (?:bottle|phial|flagon|carafe|flask|jar|vial) shatter!/);
    assert.match(text, /You feel somewhat dizzy\./);
    assert.doesNotMatch(text, /peculiar odor|Your eyes water/);
    assert.equal(game.level.objects.includes(box), false);
    const survivor = game.level.objects.find(obj => obj.kind === 'confusion');
    assert.ok(survivor);
    assert.equal(survivor.quan, 2);
    assert.equal(survivor.ox, 5);
    assert.equal(survivor.oy, 5);
});

test('destroyed box uses C material wording for non-potion contents', async () => {
    const cases = [
        [blankScroll(6141), /A scroll of blank paper is torn to shreds!/],
        [{ id: 6142, otyp: TALLOW_CANDLE, cls: 'tool', glyph: '(', kind: 'tallow candle', actualKind: 'tallow candle', quan: 1 }, /A tallow candle is crushed!/],
        [creamPie(6143), /A cream pie is pulped!/],
        [meatRingFood(6144), /A meat ring is mashed!/],
        [{ id: 6145, otyp: MIRROR, cls: 'tool', glyph: '(', kind: 'looking glass', actualKind: 'mirror', quan: 1 }, /A looking glass shatters!/],
        [{ id: 6146, cls: 'weapon', glyph: ')', kind: 'quarterstaff', actualKind: 'quarterstaff', quan: 1 }, /A quarterstaff splinters to fragments!/],
        [{ id: 6147, otyp: LOCK_PICK, cls: 'tool', glyph: '(', kind: 'lock pick', actualKind: 'lock pick', quan: 1 }, /A lock pick is destroyed!/],
    ];

    for (const [content, expected] of cases) {
        const text = await destroyedBoxContentText(content, content.id + 100);
        assert.match(text, expected);
    }
});

test('destroyed shop-floor box charges shattered contents and box as one loss', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const box = shopFloorContainer(6114);
    box.locked = true;
    box.olocked = true;
    const potion = putObjectInContainer(box, confusionPotion(6115, undefined, 1));
    delete potion.letter;
    delete potion.line;
    game.level.objects = [box];
    const expectedLoss = shop.shopItemPrice(potion, 5, 5)
        + shop.shopItemPrice({ ...box, contents: [], cobj: [] }, 5, 5);

    const destroyed = finishForceLock({ chest: box, picktyp: false });
    const messages = await drainQueuedMessagesAfterMore();
    const text = messages.join('  ');

    assert.equal(destroyed, true);
    assert.match(text, new RegExp(`You owe ${expectedLoss} zorkmids for objects destroyed\\.`));
    assert.ok(text.indexOf('shatter!') < text.indexOf('You owe'));
    assert.equal(shkp.debit, expectedLoss);
    assert.equal(shkp.billct, 0);
    assert.equal(game.level.objects.includes(box), false);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
});

test('destroyed shop-floor box charges billed contents to their bill owner', async () => {
    const { shkp } = installCommandShopState();
    const owner = addSecondShopkeeper('Asidonhopo');
    initRng(5);
    const box = shopFloorContainer(6131);
    box.locked = true;
    box.olocked = true;
    const potion = putObjectInContainer(box, confusionPotion(6132, undefined, 1));
    delete potion.letter;
    delete potion.line;
    shop.addObjectToShopBill(owner, potion, 77);
    potion.no_charge = true;
    game.level.objects = [box];
    const boxLoss = shop.shopItemPrice({ ...box, contents: [], cobj: [] }, 5, 5);

    const destroyed = finishForceLock({ chest: box, picktyp: false });
    const messages = await drainQueuedMessagesAfterMore();

    assert.equal(destroyed, true);
    assert.match(messages.join('  '), new RegExp(`You owe ${boxLoss + 77} zorkmids for objects destroyed\\.`));
    assert.equal(shkp.debit, boxLoss);
    assert.equal(owner.debit, 77);
    assert.equal(shkp.billct, 0);
    assert.equal(owner.billct, 0);
    assert.equal(shop.shopBillEntryForObject(owner, potion), null);
    assert.equal(game.level.objects.includes(box), false);
    assert.equal(game.level.objects.some(obj => obj.id === potion.id), false);
});

test('destroyed shop-floor box loss message uses post-credit debt', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const box = shopFloorContainer(6116);
    box.locked = true;
    box.olocked = true;
    const potion = putObjectInContainer(box, confusionPotion(6117, undefined, 1));
    delete potion.letter;
    delete potion.line;
    game.level.objects = [box];
    const expectedLoss = shop.shopItemPrice(potion, 5, 5)
        + shop.shopItemPrice({ ...box, contents: [], cobj: [] }, 5, 5);
    const uncovered = Math.max(1, Math.trunc(expectedLoss / 3));
    shkp.credit = expectedLoss - uncovered;

    const destroyed = finishForceLock({ chest: box, picktyp: false });
    const messages = await drainQueuedMessagesAfterMore();

    assert.equal(destroyed, true);
    assert.match(messages.join('  '), new RegExp(`You owe ${uncovered} zorkmids for objects destroyed\\.`));
    assert.equal(shkp.credit, 0);
    assert.equal(shkp.debit, uncovered);
});

test('destroyed box values contained containers like inventory contents', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const box = shopFloorContainer(6118);
    box.locked = true;
    box.olocked = true;
    const bag = putObjectInContainer(box, sack(6119));
    const nestedGold = putObjectInContainer(bag, goldPieces(6120, 50));
    const nestedDagger = putObjectInContainer(bag, dagger(6121));
    game.level.objects = [box];
    const expectedLoss = shop.shopItemPrice(bag, 5, 5)
        + shop.shopItemPrice({ ...box, contents: [], cobj: [] }, 5, 5);
    const excludedNestedLoss = 50 + shop.shopItemPrice(nestedDagger, 5, 5);

    const destroyed = finishForceLock({ chest: box, picktyp: false });
    const messages = await drainQueuedMessagesAfterMore();

    assert.equal(destroyed, true);
    assert.match(messages.join('  '), /A (?:sack|bag) is destroyed!/);
    assert.match(messages.join('  '), new RegExp(`You owe ${expectedLoss} zorkmids for objects destroyed\\.`));
    assert.equal(shkp.debit, expectedLoss);
    assert.ok(excludedNestedLoss > 0);
    assert.notEqual(shkp.debit, expectedLoss + excludedNestedLoss);
    assert.equal(game.level.objects.includes(bag), false);
    assert.equal(game.level.objects.includes(nestedGold), false);
    assert.equal(game.level.objects.includes(nestedDagger), false);
});

test('shattering shop-floor statue trap charges contents before animation inventory transfer', async () => {
    const { shkp } = installCommandShopState();
    initRng(6);
    const statue = statueTrapStatue(6124);
    const ration = putObjectInContainer(statue, foodRation(6125));
    const blade = putObjectInContainer(statue, dagger(6126));
    const trap = { ttyp: STATUE_TRAP, tx: 7, ty: 5 };
    game.level.objects = [statue];
    game.level.traps = [trap];
    const expectedLoss = (shop.shopItemPrice(statue, 7, 5) || 0)
        + shop.shopItemPrice(ration, 7, 5)
        + shop.shopItemPrice(blade, 7, 5);

    const message = await activateStatueTrap(trap, 7, 5, { shatter: true });

    assert.match(message, /Instead of shattering, .* suddenly comes to life!/);
    assert.match(message, new RegExp(`You owe Izchak ${expectedLoss} zorkmids for its contents!`));
    assert.ok(message.indexOf('Instead of shattering') < message.indexOf('You owe Izchak'));
    assert.equal(shkp.debit, expectedLoss);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(game.level.traps.includes(trap), false);
    assert.equal(game.level.objects.includes(statue), false);
    const mon = game.level.monsters.find(candidate => !candidate.isshk && candidate.data?.name === 'goblin');
    assert.ok(mon);
    assert.equal(mon.minvent.length, 2);
    assert.equal(mon.minvent.includes(ration), true);
    assert.equal(mon.minvent.includes(blade), true);
});

test('shattering shop-floor statue trap charges an existing bill owner', async () => {
    const { shkp } = installCommandShopState();
    const owner = addSecondShopkeeper('Asidonhopo');
    initRng(6);
    const statue = statueTrapStatue(6133);
    const trap = { ttyp: STATUE_TRAP, tx: 7, ty: 5 };
    game.level.objects = [statue];
    game.level.traps = [trap];
    shop.addObjectToShopBill(owner, statue, 123);

    const message = await activateStatueTrap(trap, 7, 5, { shatter: true });

    assert.match(message, /Instead of shattering, .* suddenly comes to life!/);
    assert.match(message, /You owe Asidonhopo 123 zorkmids for it!/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(owner.debit, 123);
    assert.equal(owner.billct, 0);
    assert.equal(shop.shopBillEntryForObject(owner, statue), null);
    assert.equal(game.level.traps.includes(trap), false);
    assert.equal(game.level.objects.includes(statue), false);
});

test('normal shop-floor statue trap activation does not charge transferred contents', async () => {
    const { shkp } = installCommandShopState();
    initRng(6);
    const statue = statueTrapStatue(6127);
    const ration = putObjectInContainer(statue, foodRation(6128));
    const trap = { ttyp: STATUE_TRAP, tx: 7, ty: 5 };
    game.level.objects = [statue];
    game.level.traps = [trap];

    const message = await activateStatueTrap(trap, 7, 5, { normal: true });

    assert.match(message, /posing as a statue/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.equal(game.level.objects.includes(statue), false);
    const mon = game.level.monsters.find(candidate => !candidate.isshk && candidate.data?.name === 'goblin');
    assert.ok(mon);
    assert.equal(mon.minvent.includes(ration), true);
});

test('shattering no-charge shop-floor statue trap does not charge contents', async () => {
    const { shkp } = installCommandShopState();
    initRng(6);
    const statue = statueTrapStatue(6129);
    statue.no_charge = true;
    const ration = putObjectInContainer(statue, foodRation(6130));
    const trap = { ttyp: STATUE_TRAP, tx: 7, ty: 5 };
    game.level.objects = [statue];
    game.level.traps = [trap];

    const message = await activateStatueTrap(trap, 7, 5, { shatter: true });

    assert.match(message, /Instead of shattering, .* suddenly comes to life!/);
    assert.doesNotMatch(message, /You owe|Thief/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    const mon = game.level.monsters.find(candidate => !candidate.isshk && candidate.data?.name === 'goblin');
    assert.ok(mon);
    assert.equal(mon.minvent.includes(ration), true);
});

test('shattering statue trap does not charge when resident shopkeeper is dead', async () => {
    const { shkp } = installCommandShopState();
    initRng(6);
    shkp.dead = true;
    const statue = statueTrapStatue(6131);
    const ration = putObjectInContainer(statue, foodRation(6132));
    const trap = { ttyp: STATUE_TRAP, tx: 7, ty: 5 };
    game.level.objects = [statue];
    game.level.traps = [trap];

    const message = await activateStatueTrap(trap, 7, 5, { shatter: true });

    assert.match(message, /Instead of shattering, .* suddenly comes to life!/);
    assert.doesNotMatch(message, /You owe|Thief/);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    const mon = game.level.monsters.find(candidate => !candidate.isshk && candidate.data?.name === 'goblin');
    assert.ok(mon);
    assert.equal(mon.minvent.includes(ration), true);
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

test('pushing boulder from costly shop square bills it after movement', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 4, my: 5, shk: { x: 4, y: 5 } });
    const rock = floorBoulder(6067, { ox: 6, oy: 5, known: true, dknown: true });
    game.level.objects = [rock];
    game.level.at = (x) => ({ roomno: x <= 6 ? ROOMOFFSET : 0, typ: ROOM });

    await rhack('l');

    const entry = shop.shopBillEntryForObject(shkp, rock);
    assert.equal(rock.ox, 7);
    assert.equal(rock.oy, 5);
    assert.ok(entry);
    assert.equal(shop.shopBillEntryTotal(entry), 7);
    assert.equal(rock.unpaid, true);
    assert.equal(shkp.billct, 1);
    assert.match(game._pending_message, /With great effort you move the boulder\./);
    assert.match(game._pending_message, /The boulder will cost you 7 zorkmids\./);
    assert.equal(game.context.move, 1);
});

test('pushing billed boulder back into owner shop removes the bill row', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 4, my: 5, shk: { x: 4, y: 5 } });
    Object.assign(game.u, { ux: 7, uy: 5 });
    const rock = floorBoulder(6068, { ox: 6, oy: 5, known: true, dknown: true });
    game.level.objects = [rock];
    game.level.at = (x) => ({ roomno: x <= 5 ? ROOMOFFSET : 0, typ: ROOM });
    shop.addObjectToShopBill(shkp, rock, 7);

    await rhack('h');

    assert.equal(rock.ox, 5);
    assert.equal(rock.oy, 5);
    assert.equal(shop.shopBillEntryForObject(shkp, rock), null);
    assert.equal(rock.unpaid, false);
    assert.equal(shkp.billct, 0);
    assert.doesNotMatch(game._pending_message, /will cost/);
    assert.equal(game.context.move, 1);
});

test('pushing billed boulder along shop boundary charges only when fully outside', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 4, my: 5, shk: { x: 4, y: 5 }, debit: 0, credit: 0 });
    const rock = floorBoulder(6069, { ox: 6, oy: 5, known: true, dknown: true });
    game.level.objects = [rock];
    game.level.at = (x) => {
        if (x <= 5) return { roomno: ROOMOFFSET, typ: ROOM };
        if (x <= 7) return { roomno: ROOMOFFSET, typ: ROOM, edge: true };
        return { roomno: 0, typ: ROOM };
    };
    shop.addObjectToShopBill(shkp, rock, 7);

    await rhack('l');

    assert.equal(rock.ox, 7);
    assert.ok(shop.shopBillEntryForObject(shkp, rock));
    assert.equal(rock.unpaid, true);
    assert.equal(shkp.debit || 0, 0);

    acknowledgePendingMessage();
    await rhack('l');

    assert.equal(rock.ox, 8);
    assert.equal(shop.shopBillEntryForObject(shkp, rock), null);
    assert.equal(rock.unpaid, false);
    assert.equal(shkp.billct, 0);
    assert.equal(shkp.debit, 7);
    assert.match(game._pending_message, /owe Izchak 7 zorkmids for it/);
});

test('pushing billed boulder into second owner shop removes that owner row', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 10, my: 5, shk: { x: 10, y: 5 } });
    const secondShopkeeper = makeShopkeeper(2, 'Asidonhopo', 4, 5, { shoproom: ROOMOFFSET + 1 });
    game.level.rooms[1] = { rtype: SHOPBASE, resident: secondShopkeeper };
    game.level.monsters.push(secondShopkeeper);
    Object.assign(game.u, { ux: 7, uy: 5 });
    const rock = floorBoulder(6070, { ox: 6, oy: 5, known: true, dknown: true });
    game.level.objects = [rock];
    game.level.at = (x) => ({ roomno: x <= 5 ? ROOMOFFSET + 1 : 0, typ: ROOM });
    shop.addObjectToShopBill(secondShopkeeper, rock, 7);

    await rhack('h');

    assert.equal(rock.ox, 5);
    assert.equal(shop.shopBillEntryForObject(secondShopkeeper, rock), null);
    assert.equal(shop.shopBillEntryForObject(shkp, rock), null);
    assert.equal(rock.unpaid, false);
    assert.equal(secondShopkeeper.billct, 0);
    assert.equal(shkp.billct, 0);
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
    markHeroSquareVisible();
    const container = shopFloorContainer(6909);
    const contained = putObjectInContainer(container, confusionPotion(6910));
    game.level.objects = [container];
    const price = shop.shopItemPrice(contained, 5, 5);

    const messages = shop.tipContainerToFloor(container);

    assert.match(messages.join(' '), /The potion of confusion heats up as it hits the hot ground\./);
    assert.match(messages.join(' '), /shattering noise|shatters from the heat/);
    assert.match(messages.join(' '), /You smell a peculiar odor\.\.\./);
    assert.match(messages.join(' '), /You feel somewhat dizzy\./);
    assert.ok(game.u._confusionTimeout > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
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

test('tipping owner-billed item lost from cursed shop-floor magic bag charges row owner', () => {
    const { shkp: sourceShkp } = installShopState();
    const owner = addSecondShopkeeper();
    initRng(17);
    const source = bagOfHolding(69321);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(69322));
    shop.addObjectToShopBill(owner, ration, 45);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 45 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(owner, ration), null);
    assert.equal(owner.debit, 45);
    assert.equal(owner.billct, 0);
    assert.equal(sourceShkp.debit || 0, 0);
    assert.equal(sourceShkp.robbed || 0, 0);
    assert.equal(sourceShkp.billct, 0);
});

test('tipping no-charge owner-billed item lost from cursed shop-floor magic bag still charges row owner', () => {
    const { shkp: sourceShkp } = installShopState();
    const owner = addSecondShopkeeper();
    initRng(17);
    const source = bagOfHolding(69323);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(69324));
    shop.addObjectToShopBill(owner, ration, 45);
    ration.no_charge = true;
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 45 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(owner, ration), null);
    assert.equal(owner.debit, 45);
    assert.equal(owner.billct, 0);
    assert.equal(sourceShkp.debit || 0, 0);
    assert.equal(sourceShkp.robbed || 0, 0);
    assert.equal(sourceShkp.billct, 0);
});

test('tipping nested owner-billed item lost from cursed shop-floor magic bag charges nested row owner', () => {
    const { shkp: sourceShkp } = installShopState();
    const owner = addSecondShopkeeper();
    initRng(17);
    const source = bagOfHolding(69325);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const nested = putObjectInContainer(source, sack(69326));
    nested.no_charge = true;
    const ration = putObjectInContainer(nested, foodRation(69327));
    shop.addObjectToShopBill(owner, ration, 45);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 45 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(owner, ration), null);
    assert.equal(owner.debit, 45);
    assert.equal(owner.billct, 0);
    assert.equal(sourceShkp.debit || 0, 0);
    assert.equal(sourceShkp.robbed || 0, 0);
    assert.equal(sourceShkp.billct, 0);
});

test('tipping owner-billed item lost from angry-source magic bag charges owner robbed value', () => {
    const { shkp: sourceShkp } = installShopState();
    const owner = addSecondShopkeeper();
    initRng(17);
    sourceShkp.angry = true;
    sourceShkp.mpeaceful = 0;
    const source = bagOfHolding(69328);
    source.cursed = true;
    source.ox = 5;
    source.oy = 5;
    const ration = putObjectInContainer(source, foodRation(69329));
    shop.addObjectToShopBill(owner, ration, 45);
    game.level.objects = [source];

    const messages = shop.tipContainerToFloor(source);

    assert.match(messages.join(' '), /owe 45 zorkmids? for lost merchandise/);
    assert.equal(shop.shopBillEntryForObject(owner, ration), null);
    assert.equal(owner.robbed, 45);
    assert.equal(owner.debit || 0, 0);
    assert.equal(sourceShkp.debit || 0, 0);
    assert.equal(sourceShkp.robbed || 0, 0);
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

test('tipping shop-floor bag of holding into carried magic bag charges vanished trigger contents', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = shopFloorContainer(69565);
    const target = bagOfHolding(69566, 'b');
    const trigger = putObjectInContainer(source, bagOfHolding(69567));
    const blade = putObjectInContainer(trigger, dagger(69568));
    const triggerPrice = shop.shopItemPrice(trigger, 5, 5);
    const bladePrice = shop.shopItemPrice(blade, 5, 5);
    game.u.uhp = 100;
    game.inventory = [target];
    game.level.objects = [source];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /As a bag tumbles inside, you are blasted by a magical explosion/);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(source.contents.includes(trigger), false);
    assert.equal(game.level.objects.includes(trigger), false);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.debit, bladePrice);
    assertUsedUpBillForObject(shkp, trigger, triggerPrice);
    assert.equal(game._usedUpShopBills.some(entry => String(entry.bo_id) === String(blade.id)), false);
});

test('tipping carried bag of holding into carried magic bag charges vanished unpaid trigger contents', () => {
    const { shkp } = installShopState();
    initRng(13);
    const source = sack(69569, 's');
    const target = bagOfHolding(69570, 'b');
    const trigger = putObjectInContainer(source, bagOfHolding(69571));
    const blade = putObjectInContainer(trigger, dagger(69572));
    shop.addObjectToShopBill(shkp, blade, 45);
    game.u.uhp = 100;
    game.inventory = [source, target];

    const messages = shop.tipContainerIntoContainer(source, target);

    assert.match(messages.join(' '), /magical explosion/);
    assert.equal(game.inventory.includes(target), false);
    assert.equal(source.contents.includes(trigger), false);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.notEqual(blade.unpaid, true);
    assert.equal(shkp.debit, 45);
    assert.equal(shkp.billct, 0);
    assert.equal((game._usedUpShopBills || []).some(entry => String(entry.bo_id) === String(blade.id)), false);
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
        ['meat stick', 'meat sticks', 'i'],
        ['enormous meatball', 'enormous meatballs', 'n'],
        ['tripe ration', 'tripe rations', 't'],
        ['candy bar', 'candy bars', 'y'],
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

test('tripe and candy shop pickup merge rejects paid targets and combines same-shop unpaid bills', () => {
    const cases = [
        ['tripe ration', 't', 15],
        ['candy bar', 'c', 10],
    ];

    for (const [index, [kind, letter, price]] of cases.entries()) {
        const { shkp } = installShopState();
        const paidStack = simpleFood(7105 + (index * 4), kind, letter);
        const billableSource = { ...simpleFood(7106 + (index * 4), kind), letter: undefined, line: undefined };
        game.inventory = [paidStack];

        assert.equal(shop.findPickedObjectInventoryMergeTarget(billableSource, price), null, kind);
        assert.equal(shkp.billct, 0, kind);

        const unpaidStack = simpleFood(7107 + (index * 4), kind, String.fromCharCode(letter.charCodeAt(0) + 1));
        shop.addObjectToShopBill(shkp, unpaidStack, price);
        game.inventory = [unpaidStack];
        const merge = shop.findPickedObjectInventoryMergeTarget(billableSource, price);
        assert.equal(merge.target, unpaidStack, kind);
        shop.mergePickedObjectIntoInventory(billableSource, unpaidStack);

        assert.equal(unpaidStack.quan, 2, kind);
        assert.equal(unpaidStack.unpaidPrice, price * 2, kind);
        assert.equal(shop.shopBillEntryTotal(merge.billMerge.billEntry), price * 2, kind);
        assert.match(unpaidStack.line, new RegExp(`unpaid, ${price * 2} zorkmids`), kind);
        assert.equal(shkp.billct, 1, kind);
    }
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

    const carriedMeatStick = simpleFood(7145, 'meat stick', 'i', { otyp: MEAT_STICK });
    const floorMeatStick = { ...simpleFood(7146, 'meat stick'), otyp: MEAT_STICK, letter: undefined, line: undefined };
    game.inventory = [carriedMeatStick];

    const meatStickMerge = shop.findPickedObjectInventoryMergeTarget(floorMeatStick, 0);
    assert.equal(meatStickMerge.target, carriedMeatStick);
    shop.mergePickedObjectIntoInventory(floorMeatStick, carriedMeatStick);
    assert.equal(carriedMeatStick.quan, 2);
    assert.match(carriedMeatStick.line, /^i - 2 meat sticks/);

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

test('special food pickup merge accepts compatible nontimed eggs and rejects hatch timers', () => {
    installShopState();
    const carried = { ...egg(7151, 'e'), corpsenm: { name: 'newt' }, age: 100 };
    const floorObj = { ...egg(7152), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, age: 300 };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 0);
    assert.equal(merge.target, carried);
    shop.mergePickedObjectIntoInventory(floorObj, carried);

    assert.equal(carried.quan, 2);
    assert.equal(carried.age, 200);
    assert.match(carried.line, /^e - 2 eggs/);

    const timedEgg = {
        ...egg(7153),
        letter: undefined,
        line: undefined,
        corpsenm: { name: 'newt' },
        eggHatchTurn: game.moves + 5,
        _egg_hatch_seq: 1,
    };
    game.inventory = [{ ...egg(7154, 'f'), corpsenm: { name: 'newt' } }];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(timedEgg, 0), null);
});

test('special food pickup merge requires matching tin species', () => {
    installShopState();
    const carried = { ...tin(7161, 't'), corpsenm: { name: 'newt' } };
    const sameSpecies = { ...tin(7162), letter: undefined, line: undefined, corpsenm: { name: 'newt' } };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(sameSpecies, 0);
    assert.equal(merge.target, carried);
    shop.mergePickedObjectIntoInventory(sameSpecies, carried);

    assert.equal(carried.quan, 2);
    assert.match(carried.line, /^t - 2 tins/);

    const otherSpecies = { ...tin(7163), letter: undefined, line: undefined, corpsenm: { name: 'red dragon' } };
    assert.equal(shop.findPickedObjectInventoryMergeTarget(otherSpecies, 0), null);
});

test('special food pickup merge accepts ordinary corpses but rejects revivers', () => {
    installShopState();
    const carried = { ...corpse(7171, 'c', 'newt'), age: 20 };
    const floorObj = { ...corpse(7172, undefined, 'newt'), letter: undefined, line: undefined, age: 60 };
    game.inventory = [carried];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 0);
    assert.equal(merge.target, carried);
    shop.mergePickedObjectIntoInventory(floorObj, carried);

    assert.equal(carried.quan, 2);
    assert.equal(carried.age, 40);
    assert.match(carried.line, /^c - 2 newt corpses/);

    const trollStack = { ...corpse(7173, 'd', 'troll') };
    const otherTroll = { ...corpse(7174, undefined, 'troll'), letter: undefined, line: undefined };
    game.inventory = [trollStack];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(otherTroll, 0), null);
});

test('special food shop pickup merge rejects paid targets and combines same-shop unpaid bills', () => {
    const { shkp } = installShopState();
    const paidStack = { ...egg(7181, 'e'), corpsenm: { name: 'newt' } };
    const billableSource = { ...egg(7182), letter: undefined, line: undefined, corpsenm: { name: 'newt' } };
    game.inventory = [paidStack];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(billableSource, 9), null);
    assert.equal(shkp.billct, 0);

    const unpaidStack = { ...egg(7183, 'f'), corpsenm: { name: 'newt' } };
    shop.addObjectToShopBill(shkp, unpaidStack, 9);
    game.inventory = [unpaidStack];
    const merge = shop.findPickedObjectInventoryMergeTarget(billableSource, 9);
    assert.equal(merge.target, unpaidStack);
    shop.mergePickedObjectIntoInventory(billableSource, unpaidStack);

    assert.equal(unpaidStack.quan, 2);
    assert.equal(unpaidStack.unpaidPrice, 18);
    assert.equal(shop.shopBillEntryTotal(merge.billMerge.billEntry), 18);
    assert.match(unpaidStack.line, /unpaid, 18 zorkmids/);
    assert.equal(shkp.billct, 1);
});

test('special food pickup merge follows C object-name compatibility', () => {
    installShopState();
    const namedEgg = { ...egg(7191, 'e'), corpsenm: { name: 'newt' }, oname: 'breakfast' };
    const differentNamedEgg = { ...egg(7192), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, oname: 'dinner' };
    game.inventory = [namedEgg];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(differentNamedEgg, 0), null);

    const unnamedEgg = { ...egg(7193, 'f'), corpsenm: { name: 'newt' } };
    const namedSourceEgg = { ...egg(7194), letter: undefined, line: undefined, corpsenm: { name: 'newt' }, oname: 'breakfast' };
    game.inventory = [unnamedEgg];
    const eggMerge = shop.findPickedObjectInventoryMergeTarget(namedSourceEgg, 0);
    assert.equal(eggMerge.target, unnamedEgg);
    shop.mergePickedObjectIntoInventory(namedSourceEgg, unnamedEgg);

    assert.equal(unnamedEgg.quan, 2);
    assert.equal(unnamedEgg.oname, 'breakfast');
    assert.match(unnamedEgg.line, /eggs named breakfast/);

    const unnamedCorpse = { ...corpse(7195, 'c', 'newt') };
    const namedCorpse = { ...corpse(7196, undefined, 'newt'), letter: undefined, line: undefined, oname: 'snack' };
    game.inventory = [unnamedCorpse];

    assert.equal(shop.findPickedObjectInventoryMergeTarget(namedCorpse, 0), null);
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
        ['meat stick', 'i'],
        ['enormous meatball', 'n'],
        ['tripe ration', 't'],
        ['candy bar', 'y'],
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
    assert.equal(shop.shopBaseCost(simpleFood(7139, 'candy bar')), 10);
    assert.equal(shop.shopBaseCost(simpleFood(7132, 'kelp frond')), 6);
    assert.equal(shop.shopBaseCost(simpleFood(7129, 'sprig of wolfsbane')), 7);
    assert.equal(shop.shopBaseCost(simpleFood(7130, 'clove of garlic')), 7);
    assert.equal(shop.shopBaseCost(simpleFood(7131, 'eucalyptus leaf')), 5);
    assert.equal(shop.shopBaseCost(slimeMoldFood(7137)), 17);
    assert.equal(shop.shopBaseCost(simpleFood(7134, 'lump of royal jelly')), 15);
    assert.equal(shop.shopBaseCost(simpleFood(7135, 'meatball')), 5);
    assert.equal(shop.shopBaseCost(simpleFood(7145, 'meat stick')), 5);
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
            (id, letter) => simpleFood(id, 'meat stick', letter, { otyp: MEAT_STICK }),
            id => simpleFood(id, 'meat stick', undefined, { otyp: MEAT_STICK }),
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

test('full bill does not bypass C full-inventory shop pickup preflight', async () => {
    const { shkp } = installCommandShopState();
    fillShopBill(shkp);
    const carried = { ...foodRation(7139, 'a'), bknown: false };
    const floorObj = { ...foodRation(7140), letter: undefined, line: undefined, bknown: false };
    fillInventoryLetters();
    game.inventory[0] = carried;
    game.level.objects = [floorObj];

    await rhack(',');

    assert.equal(carried.quan, 1);
    assert.equal(game.level.objects.includes(floorObj), true);
    assert.notEqual(game._command_mode, 'pickupShopQuote');
    assert.match(game._pending_message, /knapsack cannot accommodate any more items/);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
    assert.equal(game.context.move, 0);
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
            (id, letter) => simpleFood(id, 'meat stick', letter, { otyp: MEAT_STICK }),
            id => simpleFood(id, 'meat stick', undefined, { otyp: MEAT_STICK }),
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

test('full shop bill lets pickup merge into paid inventory stack as free', () => {
    const { shkp } = installShopState();
    fillShopBill(shkp);
    const paidStack = foodRation(7103, 'd');
    const floorObj = { ...foodRation(7104), letter: undefined, line: undefined };
    game.inventory = [paidStack];

    const merge = shop.findPickedObjectInventoryMergeTarget(floorObj, 45);

    assert.equal(merge.target, paidStack);
    assert.equal(merge.billMerge.price, 0);
    shop.mergePickedObjectIntoInventory(floorObj, paidStack);
    assert.equal(paidStack.quan, 2);
    assert.equal(paidStack.unpaid, undefined);
    assert.equal(paidStack.unpaidPrice, undefined);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
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

test('full shop bill split clears the child while shrinking the parent row', () => {
    const { shkp } = installShopState();
    const parent = { ...dagger(8003, 'd'), quan: 3, line: 'd - 3 +0 daggers' };
    shop.addObjectToShopBill(shkp, parent, 15);
    for (let index = 0; index < 199; index++) {
        shkp.bill.push({
            bo_id: `full-split-${index}`,
            price: 1,
            bquan: 1,
            totalPrice: 1,
        });
    }
    shkp.billct = shkp.bill.length;
    const child = {
        ...parent,
        id: 8004,
        quan: 1,
        letter: 'e',
        line: 'e - a +0 dagger (unpaid, 5 zorkmids)',
        unpaid: true,
        unpaidPrice: 5,
    };

    const childEntry = shop.splitShopBillEntry(shkp, parent, child, 1);
    const parentEntry = shop.shopBillEntryForObject(shkp, parent);

    assert.equal(childEntry, null);
    assert.equal(parentEntry.bquan, 2);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 10);
    assert.equal(parent.unpaid, true);
    assert.equal(parent.unpaidPrice, 10);
    assert.equal(child.unpaid, false);
    assert.equal(child.unpaidPrice, undefined);
    assert.doesNotMatch(child.line, /unpaid/);
    assert.equal(shkp.billct, BILLSZ);
    assert.equal(shkp.bill.length, BILLSZ);
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

test('hard-landing thrown paid container does not bill broken paid contents', () => {
    const { shkp } = installShopState();
    initRng(1);
    const bag = sack(87381);
    const potion = putObjectInContainer(bag, oilPotion(87382));

    const landing = shop.landProjectileObjectWithShopHandling(bag, 5, 5, { fromX: 5, fromY: 5, silent: true });

    assert.equal(landing.impact.broke, true);
    assert.equal(landing.impact.loss, 0);
    assert.equal(bag.contents.includes(potion), false);
    assert.equal(potion.no_charge, true);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
});

test('kicked shop-floor container impact bills broken shop-owned contents', () => {
    const { shkp } = installShopState();
    initRng(1);
    const bag = sack(87383);
    bag.ox = 5;
    bag.oy = 5;
    const potion = putObjectInContainer(bag, oilPotion(87384));
    const expected = shop.shopItemPrice(potion, 5, 5);
    game.level.objects = [bag];

    const impact = shop.projectileContainerImpactDmg(bag, 5, 5, { fromInventory: false, silent: true });

    assert.equal(impact.broke, true);
    assert.equal(impact.loss, expected);
    assert.equal(bag.contents.includes(potion), false);
    assert.notEqual(potion.no_charge, true);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
});

test('soft-landing projectile container skips content impact before shop return', () => {
    const { shkp } = installShopState();
    initRng(1);
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: POOL });
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

test('projectile landing runs hole floor effects before placement or shop handling', () => {
    const { shkp } = installShopState();
    installSeenHoleAtHero();
    initRng(1);
    const blade = dagger(87431);
    shop.addObjectToShopBill(shkp, blade, 15);

    const landing = shop.landProjectileObjectWithShopHandling(blade, 5, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.floorEffects.consumed, true);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(queuedImpactDropsFor().includes(blade), true);
    assert.equal(landing.shopLanding.handled, false);
    assert.equal(landing.shopSale.handled, false);
    assert.equal(shkp.debit, 15);
    assert.equal(shkp.billct, 0);
    assert.match(landing.messages.join(' '), /owe Izchak 15 zorkmids? for it/);
});

for (const [trapType, namePattern] of [[HOLE, /through the hole/], [TRAPDOOR, /through the trap door/]]) {
    test(`paid same-shop projectile falling through remote ${trapType === HOLE ? 'hole' : 'trap door'} ships before sale`, () => {
        const { shkp } = installShopState();
        installSeenRemoteShaft(trapType);
        initRng(6);
        const floorStack = { ...dagger(874311), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
        const thrown = { ...dagger(874312), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
        game.level.objects = [floorStack];
        const cashBefore = shop.shopkeeperCash(shkp);

        const landing = shop.landProjectileObjectWithShopHandling(thrown, 7, 5, { breakRoll: 0, silent: true });

        assert.equal(landing.shipObject.handled, true);
        assert.equal(landing.floorEffects.consumed, false);
        assert.equal(landing.object, null);
        assert.equal(game.level.objects.includes(thrown), false);
        assert.equal(game.level.objects.includes(floorStack), true);
        assert.equal(floorStack.quan, 1);
        assert.equal(queuedImpactDropsFor().includes(thrown), true);
        assert.equal(landing.shopLanding.handled, false);
        assert.equal(landing.shopSale.handled, false);
        assert.equal(game._goldCount || 0, 0);
        assert.equal(shop.shopkeeperCash(shkp), cashBefore);
        assert.equal(shkp.debit || 0, 0);
        assert.match(landing.messages.join(' '), new RegExp(`hits another object and falls ${namePattern.source}`));
    });
}

test('remote projectile fall impacts a floor pile after projectile migration', () => {
    installNonShopFloorState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    enableRngLog({ reset: true });
    const pile = { ...foodRation(874318), letter: undefined, line: undefined, ox: 7, oy: 5 };
    const thrown = { ...dagger(874319), letter: undefined, line: undefined, ox: 7, oy: 5 };
    game.level.objects = [pile];

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 7, 5, { breakRoll: 0, silent: true });
    const queued = queuedImpactDropsFor();
    const text = landing.messages.join('  ');

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.shipObject.impact.objectCount, 1);
    assert.equal(landing.shipObject.impact.fallenCount, 1);
    assert.equal(queued.includes(thrown), true);
    assert.equal(queued.includes(pile), true);
    assert.deepEqual(queued.map(obj => obj.id), [thrown.id, pile.id]);
    assert.equal(game.level.objects.includes(thrown), false);
    assert.equal(game.level.objects.includes(pile), false);
    assert.match(text, /A dagger hits another object and falls through the hole\./);
    assert.match(text, /From the impact, the other object falls\./);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(100)', 'rn2(3)']);
});

test('unpaid remote projectile falling through a shaft converts bill row to debt before shipping', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    const blade = { ...dagger(874313), letter: undefined, line: undefined, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, blade, 15);

    const landing = shop.landProjectileObjectWithShopHandling(blade, 7, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.shipObject.broke, false);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(blade), false);
    assert.equal(queuedImpactDropsFor().includes(blade), true);
    assert.equal(landing.shopLanding.handled, false);
    assert.equal(landing.shopSale.handled, false);
    assert.equal(shkp.debit, 15);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, blade), null);
    assert.equal(blade.unpaid, false);
    assert.equal(blade.unpaidPrice, undefined);
    assert.equal(blade.no_charge, false);
    assert.match(landing.messages.join(' '), /A dagger falls through the hole\./);
    assert.match(landing.messages.join(' '), /owe Izchak 15 zorkmids? for it/);
});

test('fragile remote projectile falling through a shaft breaks after debt and before migration', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    enableRngLog({ reset: true });
    const potion = { ...oilPotion(874314), letter: undefined, line: undefined, ox: 7, oy: 5 };
    shop.addObjectToShopBill(shkp, potion, 60);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 7, 5, { breakRoll: 0, silent: true });
    const text = landing.messages.join('  ');

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.shipObject.broke, true);
    assert.equal(landing.shipObject.breakKind, 'shatter');
    assert.equal(landing.topBreak.broke, false);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(potion), false);
    assert.equal(queuedImpactDropsFor().some(obj => obj.id === potion.id), false);
    assert.equal(shkp.debit, 60);
    assert.equal(shkp.billct, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, potion), null);
    assert.match(text, /A potion of oil falls through the hole\./);
    assert.match(text, /owe Izchak 60 zorkmids? for it/);
    assert.match(text, /You hear a muffled crash\./);
    assert.ok(text.indexOf('owe Izchak 60') < text.indexOf('muffled crash'));
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(100)']);
});

test('remote projectile fall bills impacted shop-floor pile without ship breakage', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    enableRngLog({ reset: true });
    const pile = { ...oilPotion(874320), letter: undefined, line: undefined, ox: 7, oy: 5 };
    const thrown = { ...dagger(874321), letter: undefined, line: undefined, ox: 7, oy: 5 };
    const expected = shop.shopItemPrice(pile, 7, 5);
    game.level.objects = [pile];

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 7, 5, { breakRoll: 0, silent: true });
    const text = landing.messages.join('  ');

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.shipObject.impact.fallenCount, 1);
    assert.equal(queuedImpactDropsFor().includes(thrown), true);
    assert.equal(queuedImpactDropsFor().includes(pile), true);
    assert.equal(game.level.objects.includes(pile), false);
    assert.equal(shkp.debit, expected);
    assert.equal(shkp.billct, 0);
    assert.match(text, /A dagger hits another object and falls through the hole\./);
    assert.match(text, /From the impact, the other object falls\./);
    assert.match(text, new RegExp(`owe Izchak ${expected} zorkmids? for goods lost`));
    assert.doesNotMatch(text, /muffled/);
    assert.deepEqual(queuedImpactDropsFor().map(obj => obj.id), [thrown.id, pile.id]);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(100)', 'rn2(3)']);
});

test('fragile remote projectile hard-landing break preempts shaft shipping', () => {
    installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    const potion = { ...oilPotion(874317), letter: undefined, line: undefined, ox: 7, oy: 5 };

    const landing = shop.landProjectileObjectWithShopHandling(potion, 7, 5, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.shipObject.handled, false);
    assert.equal(landing.object, null);
    assert.equal(queuedImpactDropsFor().some(obj => obj.id === potion.id), false);
    assert.doesNotMatch(landing.messages.join(' '), /through the hole|muffled crash/);
});

test('remote projectile shaft no-drop roll continues into normal sale and stacking', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(4);
    const floorStack = { ...dagger(874315), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const thrown = { ...dagger(874316), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    game.level.objects = [floorStack];
    const expectedOffer = shop.shopSaleOffer(thrown, shkp);
    const cashBefore = shop.shopkeeperCash(shkp);

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 7, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shipObject.handled, false);
    assert.equal(landing.floorEffects.consumed, false);
    assert.equal(queuedImpactDropsFor().length, 0);
    assert.equal(landing.shopSale.handled, true);
    assert.equal(landing.shopSale.sold, true);
    assert.equal(landing.object, floorStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorStack.quan, 2);
    assert.equal(game._goldCount, expectedOffer);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore - expectedOffer);
});

test('remote projectile no-drop impact can migrate pile before normal sale', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(2);
    enableRngLog({ reset: true });
    const pile = { ...foodRation(874322), letter: undefined, line: undefined, ox: 7, oy: 5, no_charge: true };
    const floorStack = { ...dagger(874324), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const thrown = { ...dagger(874323), letter: undefined, line: undefined, ox: 7, oy: 5 };
    game.level.objects = [pile, floorStack];
    const expectedOffer = shop.shopSaleOffer(thrown, shkp);

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 7, 5, { breakRoll: 0, silent: true });
    const text = landing.messages.join('  ');

    assert.equal(landing.shipObject.handled, false);
    assert.equal(landing.shipObject.noDrop, true);
    assert.equal(landing.shipObject.impact.objectCount, 2);
    assert.equal(landing.shipObject.impact.fallenCount, 1);
    assert.equal(queuedImpactDropsFor().includes(pile), true);
    assert.equal(queuedImpactDropsFor().includes(thrown), false);
    assert.equal(game.level.objects.includes(pile), false);
    assert.equal(landing.object, floorStack);
    assert.equal(floorStack.quan, 2);
    assert.equal(game.level.objects.includes(thrown), false);
    assert.equal(landing.shopSale.handled, true);
    assert.equal(landing.shopSale.sold, true);
    assert.equal(game._goldCount, expectedOffer);
    assert.equal(shkp.debit || 0, 0);
    assert.match(text, /A dagger hits other objects\./);
    assert.match(text, /From the impact, another object falls\./);
    assert.doesNotMatch(text, /through the hole/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(3)', 'rn2(3)']);
});

test('rock projectile impact cannot knock boulders through a remote shaft', () => {
    installNonShopFloorState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    enableRngLog({ reset: true });
    const boulder = floorBoulder(874325, { ox: 7, oy: 5 });
    const rock = { id: 874326, otyp: ROCK, cls: 'gem', glyph: '*', kind: 'rock', actualKind: 'rock', quan: 1, ox: 7, oy: 5 };
    game.level.objects = [boulder];

    const landing = shop.landProjectileObjectWithShopHandling(rock, 7, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.shipObject.impact.objectCount, 1);
    assert.equal(landing.shipObject.impact.fallenCount, 0);
    assert.equal(queuedImpactDropsFor().includes(rock), true);
    assert.equal(queuedImpactDropsFor().includes(boulder), false);
    assert.equal(game.level.objects.includes(boulder), true);
    assert.match(landing.messages.join(' '), /A rock hits another object and falls through the hole\./);
    assert.doesNotMatch(landing.messages.join(' '), /From the impact/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(100)']);
});

test('monster-thrown dagger falling through remote seen hole ships before floor effects', () => {
    installNonShopFloorState();
    installSeenRemoteShaft(HOLE);
    game.level.at = () => ({ roomno: 0, typ: LAVAPOOL });
    initRng(1);
    enableRngLog({ reset: true });
    const missile = { ...dagger(874327), letter: undefined, line: undefined };

    const landing = landMonsterThrownObject(missile, 7, 5, { messages: [] });

    assert.equal(landing.consumed, true);
    assert.equal(landing.object, null);
    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.floorEffects.consumed, false);
    assert.equal(game.level.objects.some(obj => obj.id === missile.id), false);
    assert.equal(queuedImpactDropsFor().some(obj => obj.id === missile.id), true);
    assert.match(landing.messages.join(' '), /A dagger falls through the hole\./);
    assert.doesNotMatch(landing.messages.join(' '), /burn|lava|bursts into flame/i);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(100)']);
});

test('monster-thrown dagger falling through remote seen trap door uses trap door wording', () => {
    installNonShopFloorState();
    installSeenRemoteShaft(TRAPDOOR);
    initRng(1);
    const missile = { ...dagger(874328), letter: undefined, line: undefined };

    const landing = landMonsterThrownObject(missile, 7, 5, { messages: [] });

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.object, null);
    assert.equal(queuedImpactDropsFor().some(obj => obj.id === missile.id), true);
    assert.match(landing.messages.join(' '), /A dagger falls through the trap door\./);
});

test('monster-thrown remote shaft no-drop continues into normal placement and stacking', () => {
    installNonShopFloorState();
    installSeenRemoteShaft(HOLE);
    initRng(4);
    enableRngLog({ reset: true });
    const floorStack = { ...dagger(874329), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const missile = { ...dagger(874330), letter: undefined, line: undefined, quan: 1 };
    game.level.objects = [floorStack];

    const landing = landMonsterThrownObject(missile, 7, 5, { messages: [] });

    assert.equal(landing.consumed, false);
    assert.equal(landing.shipObject.handled, false);
    assert.equal(landing.shipObject.noDrop, true);
    assert.equal(queuedImpactDropsFor().length, 0);
    assert.equal(landing.object, floorStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(floorStack.quan, 2);
    assert.match(landing.messages.join(' '), /A dagger hits another object\./);
    assert.doesNotMatch(landing.messages.join(' '), /through the hole/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(3)']);
});

test('monster-thrown dagger ignores unseen remote trap door', () => {
    installNonShopFloorState();
    const trap = installSeenRemoteShaft(TRAPDOOR);
    trap.tseen = false;
    initRng(1);
    enableRngLog({ reset: true });
    const missile = { ...dagger(874331), letter: undefined, line: undefined, quan: 1 };

    const landing = landMonsterThrownObject(missile, 7, 5, { messages: [] });

    assert.equal(landing.consumed, false);
    assert.equal(landing.shipObject.handled, false);
    assert.equal(queuedImpactDropsFor().length, 0);
    assert.ok(landing.object);
    assert.equal(landing.object.ox, 7);
    assert.equal(landing.object.oy, 5);
    assert.equal(game.level.objects.includes(landing.object), true);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(3)=')), []);
    assert.doesNotMatch(landing.messages.join(' '), /through the trap door/);
});

test('monster-thrown boulder plugs remote seen hole instead of shipping', () => {
    installNonShopFloorState();
    const trap = installSeenRemoteShaft(HOLE);
    initRng(1);
    enableRngLog({ reset: true });
    const boulder = floorBoulder(874332, { ox: 7, oy: 5 });

    const landing = landMonsterThrownObject(boulder, 7, 5, { messages: [] });

    assert.equal(landing.consumed, true);
    assert.equal(landing.object, null);
    assert.equal(landing.shipObject.handled, false);
    assert.equal(landing.floorEffects.consumed, true);
    assert.equal(queuedImpactDropsFor().length, 0);
    assert.equal(game.level.objects.some(obj => obj.id === boulder.id), false);
    assert.equal(game.level.traps.includes(trap), false);
    assert.match(landing.messages.join(' '), /boulder/i);
    assert.deepEqual(getRngLog().filter(entry => entry.startsWith('rn2(3)=')), []);
});

test('projectile landing runs lava floor effects before sale or stacking', () => {
    const { shkp } = installShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: LAVAPOOL });
    const floorStack = { ...foodRation(87432), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    const thrown = { ...foodRation(87433), letter: undefined, line: undefined, quan: 1, ox: 5, oy: 5 };
    game.level.objects = [floorStack];
    const cashBefore = shop.shopkeeperCash(shkp);

    const landing = shop.landProjectileObjectWithShopHandling(thrown, 5, 5, { breakRoll: 0, silent: true });

    assert.equal(landing.floorEffects.consumed, true);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(thrown), false);
    assert.equal(floorStack.quan, 1);
    assert.equal(landing.shopSale.handled, false);
    assert.equal(game._goldCount || 0, 0);
    assert.equal(shop.shopkeeperCash(shkp), cashBefore);
    assert.equal(shkp.billct, 0);
});

test('projectile landing treats lava as hard terrain before floor effects', () => {
    const { shkp } = installShopState();
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: LAVAPOOL });
    const potion = oilPotion(87434);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 5, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.object, null);
    assert.equal(game.level.objects.includes(potion), false);
    assert.equal(landing.shopSale.handled, false);
    assert.equal(shkp.billct, 0);
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

test('hard-landing broken potion near hero applies vapor after shattering', () => {
    installShopState();
    initRng(1);
    const potion = confusionPotion(8747);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 6, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.object, null);
    assert.ok(game.u._confusionTimeout > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
    assert.match(landing.messages.join(' '), /You smell a peculiar odor\.\.\./);
    assert.match(landing.messages.join(' '), /You feel somewhat dizzy\./);
});

test('hard-landing broken water potion near gremlin polyself splits without odor prelude', () => {
    installShopState();
    initRng(1);
    game.plname = 'Ada';
    Object.assign(game.u, {
        uhp: 7,
        uhpmax: 11,
        _polyself_base: { uhp: 12, uhpmax: 12 },
        _polyself_form: { name: 'gremlin', mlet: 'g', mlevel: 5, mmove: 12, mac: 2 },
    });
    game.level.at = () => ({ roomno: ROOMOFFSET, typ: ROOM });
    const potion = waterPotion(8751);

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 6, { breakRoll: 50, silent: true });

    const clone = game.level.monsters.find(mon => mon.data?.name === 'gremlin');
    assert.equal(landing.topBreak.broke, true);
    assert.equal(landing.object, null);
    assert.equal(game.u.uhp, 4);
    assert.equal(game.u.uhpmax, 6);
    assert.ok(clone);
    assert.equal(clone.mhp, 3);
    assert.equal(clone.mhpmax, 5);
    assert.equal(clone.givenName, 'Ada');
    assert.match(landing.messages.join(' '), /You multiply!/);
    assert.doesNotMatch(landing.messages.join(' '), /peculiar odor|eyes water/);
});

test('wet worn towel blocks broken potion vapor effects', () => {
    installShopState();
    initRng(1);
    const potion = confusionPotion(8748);
    const towel = ordinaryTool(8749, 'towel', 't');
    towel.spe = 3;
    towel.wetness = 3;
    towel.worn = true;
    towel.line = 't - a towel (being worn)';
    game.inventory = [towel];

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 6, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(game.u._confusionTimeout || 0, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Conf/);
    assert.doesNotMatch(landing.messages.join(' '), /You smell a peculiar odor/);
    assert.match(landing.messages.join(' '), /Some vapor passes harmlessly around you\./);
});

test('wet worn towel still offers a call for unknown broken potion vapor', () => {
    installShopState();
    initRng(1);
    const potion = {
        id: 8751,
        cls: 'potion',
        glyph: '!',
        kind: 'magenta potion',
        potionIndex: 7,
        quan: 1,
        ox: 5,
        oy: 5,
        dknown: true,
    };
    const towel = ordinaryTool(8752, 'towel', 't');
    towel.spe = 3;
    towel.wetness = 3;
    towel.worn = true;
    towel.line = 't - a towel (being worn)';
    game.inventory = [towel];

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 6, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.doesNotMatch(landing.messages.join(' '), /momentary vision|You smell a peculiar odor/);
    assert.match(landing.messages.join(' '), /Some vapor passes harmlessly around you\./);
    assert.equal(game._command_mode, 'callPotionAfterMore');
    assert.equal(game._call_potion_appearance, 'magenta');
});

test('hero-thrown confusion potion hits visible monster through potionhit', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = confusionPotion(8760, 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor/);
    assert.equal(goblin.mconf, true);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(goblin.mhp, 4);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)',
    ]);
});

test('wielded confusion potion bash routes through potionhit', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_STR] = 10;
    game.u.acurr.a[A_DEX] = 25;
    const potion = confusionPotion(8764, 'p', 1, { dknown: true });
    potion.wielded = true;
    potion.line = 'p - a potion of confusion (wielded)';
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mhp: 10, mhpmax: 10, mpeaceful: false });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    markSquareVisible(6, 5);

    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.doesNotMatch(game._pending_message, /You hit|misses|shatters/);
    assert.equal(goblin.mconf, true);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uconduct?.weaphit || 0, 0);
    assert.equal(game._chronicle_first_weapon_hit || 0, 0);
});

test('wielded potion stack bash consumes one and keeps the stack wielded', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_STR] = 10;
    game.u.acurr.a[A_DEX] = 25;
    const potion = confusionPotion(8765, 'p', 2, { dknown: true });
    potion.wielded = true;
    potion.line = 'p - 2 potions of confusion (wielded)';
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mhp: 10, mhpmax: 10, mpeaceful: false });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    markSquareVisible(6, 5);

    await rhack('l');

    assert.match(game._pending_message, /crashes on the goblin's head and breaks into shards/);
    assert.equal(goblin.mconf, true);
    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0], potion);
    assert.equal(potion.quan, 1);
    assert.equal(potion.wielded, true);
    assert.equal(potion.line, 'p - a potion of confusion (wielded)');
    assert.equal(game.u.uconduct?.weaphit || 0, 0);
});

test('hero-thrown confusion potion hitting a saddle wets it and skips confusion', async () => {
    installNonShopFloorState();
    initRng(5);
    game.u.acurr.a[A_DEX] = 25;
    const potion = confusionPotion(8762, 'p', 1, { dknown: true });
    const saddle = wornSaddle(87621, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle gets wet\./);
    assert.doesNotMatch(game._pending_message, /evaporates|peculiar odor|misses|head/);
    assert.equal(pony.mconf || false, false);
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rn2(5)',
    ]);
});

test('hero-thrown confusion potion can miss the saddle and confuse the monster', async () => {
    installNonShopFloorState();
    initRng(1);
    game.u.acurr.a[A_DEX] = 25;
    const potion = confusionPotion(8763, 'p', 1, { dknown: true });
    const saddle = wornSaddle(87631, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.doesNotMatch(game._pending_message, /saddle gets wet|peculiar odor|misses/);
    assert.equal(pony.mconf, true);
    assert.equal(pony.mhp, 4);
    assert.equal(pony.msleeping, 0);
    assert.equal(pony.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rn2(5)', 'rn2(105)',
    ]);
});

test('adjacent hero-thrown confusion potion can apply direct vapor after monster hit', async () => {
    installNonShopFloorState();
    initRng(3);
    game.u.acurr.a[A_DEX] = 25;
    const potion = confusionPotion(8761, 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.match(game._pending_message, /You feel somewhat dizzy\./);
    assert.equal(goblin.mconf, true);
    assert.ok((game.u._confusionTimeout || 0) > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)', 'rn2(13)', 'rnd(5)',
    ]);
});

test('upward hero-thrown confusion potion self-hits through potionhit', async () => {
    installNonShopFloorState();
    initRng(1);
    const potion = confusionPotion(8766, 'p', 1, { dknown: true });
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.match(game._pending_message, /You feel somewhat dizzy\./);
    assert.doesNotMatch(game._pending_message, /peculiar odor|cmdassist/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u.uhp < hpBefore);
    assert.ok(hpBefore - game.u.uhp <= 2);
    assert.ok((game.u._confusionTimeout || 0) > 0);
    assert.match(game.u._statusSuffix || '', /Conf/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rnd(5)',
    ]);
});

test('upward hero-thrown hallucination potion selected from c self-hits', async () => {
    installNonShopFloorState();
    initRng(1);
    const potion = hallucinationPotion(87661, 'c', 1, { dknown: true });
    game.inventory = [potion];

    await rhack('t');
    await rhack('c');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of hallucination evaporates\./);
    assert.match(game._pending_message, /You have a momentary vision\./);
    assert.doesNotMatch(game._pending_message, /In what direction\?|close|peculiar odor/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
});

test('upward hero-thrown paralysis potion selected from r self-hits', async () => {
    installNonShopFloorState();
    initRng(1);
    const potion = paralysisPotion(87662, 'r', 1, { dknown: true });
    game.inventory = [potion];

    await rhack('t');
    await rhack('r');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of paralysis evaporates\./);
    assert.match(game._pending_message, /Something seems to be holding you\./);
    assert.doesNotMatch(game._pending_message, /What do you want to read|peculiar odor/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok((game._helpless_time || 0) > 0);
    assert.equal(game._wake_message, 'You can move again.');
});

test('upward hero-thrown acid potion self-hits and burns the hero', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 40, uhpmax: 40 });
    const potion = acidPotion(87663, 'a');
    potion.dknown = true;
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of acid evaporates\./);
    assert.match(game._pending_message, /This burns!/);
    assert.doesNotMatch(game._pending_message, /peculiar odor|BOOM|You feel a little/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u.uhp < hpBefore - 1);
    assert.ok(hpBefore - game.u.uhp <= 10);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'd(1,8)', 'rn2(2)',
    ]);
});

test('upward hero-thrown acid potion respects hero acid resistance', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 40, uhpmax: 40, acidResistance: true });
    const potion = acidPotion(87664, 'a');
    potion.dknown = true;
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of acid evaporates\./);
    assert.doesNotMatch(game._pending_message, /This burns|peculiar odor|BOOM|You feel a little/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u.uhp < hpBefore);
    assert.ok(hpBefore - game.u.uhp <= 2);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rn2(2)',
    ]);
});

test('upward hero-thrown unlit oil potion self-hits without evaporation', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 40, uhpmax: 40 });
    const potion = oilPotion(87665, 'o');
    potion.dknown = true;
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('o');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on your head and breaks into shards\./);
    assert.doesNotMatch(game._pending_message, /evaporates|BOOM|explodes|peculiar odor|In what direction/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u.uhp < hpBefore);
    assert.ok(hpBefore - game.u.uhp <= 2);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)',
    ]);
});

test('upward hero-thrown lit oil potion self-hit explodes in burning oil', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    markHeroSquareVisible();
    const potion = oilPotion(87666, 'o');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    game.inventory = [potion];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('o');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /almost hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on your head and breaks into shards\./);
    assert.match(message, /Boom!/);
    assert.match(message, /You are caught in the burning oil!/);
    assert.doesNotMatch(message, /evaporates|peculiar odor|misses|In what direction/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp < 50, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 4), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'd(4,4)',
    ]);
});

test('upward hero-thrown lit oil potion can explode on the ceiling', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    markHeroSquareVisible();
    const potion = oilPotion(87667, 'o');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    game.inventory = [potion];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('o');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /A potion of oil(?: \(lit\))? hits the ceiling\./);
    assert.match(message, /A potion of oil(?: \(lit\))? shatters!/);
    assert.match(message, /Boom!/);
    assert.match(message, /You are caught in the burning oil!/);
    assert.doesNotMatch(message, /falls back|crashes on your head|evaporates|peculiar odor|misses/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp < 50, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 3), [
        'rn2(5)', 'rn2(100)', 'd(4,4)',
    ]);
});

test('upward hero-thrown unpaid lit oil potion bills the exploded potion', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 20, my: 20, shk: { x: 20, y: 20 } });
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    markHeroSquareVisible();
    const potion = oilPotion(87668, 'o');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    game.inventory = [potion];
    shop.addObjectToShopBill(shkp, potion, 50);

    await rhack('t');
    await rhack('o');
    await rhack('<');

    assert.match(game._pending_message || '', /Boom!/);
    assert.match(game._pending_message || '', /You are caught in the burning oil!/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(shop.shopBillEntryForObject(shkp, potion), null);
    assert.equal(shkp.debit, 50);
    assert.equal(shkp.billct, 0);
});

test('upward hero-thrown cream pie self-hits and blinds the hero', async () => {
    installNonShopFloorState();
    initRng(1);
    const pie = creamPie(87671, 'p');
    game.inventory = [pie];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A cream pie almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /What a mess!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.doesNotMatch(game._pending_message, /cmdassist|In what direction|crashes on your head|evaporates/);
    assert.equal(game.inventory.includes(pie), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.blind, true);
    assert.ok((game.u.ucreamed || 0) > 0);
    assert.ok((game.u._blindTimeout || 0) > 0);
    assert.match(game.u._statusSuffix || '', /Blind/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rnd(25)',
    ]);
});

test('upward hero-thrown cream pie can break on the ceiling without face splat', async () => {
    installNonShopFloorState();
    initRng(2);
    const pie = creamPie(87672, 'p');
    game.inventory = [pie];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A cream pie hits the ceiling\./);
    assert.match(game._pending_message, /What a mess!/);
    assert.doesNotMatch(game._pending_message, /falls back|You've got it all over your face|cmdassist|evaporates/);
    assert.equal(game.inventory.includes(pie), false);
    assert.equal(game.level.objects.length, 0);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid cream pie from a stack bills one broken unit', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const pies = creamPie(87673, 'p', 2);
    game.inventory = [pies];
    shop.addObjectToShopBill(shkp, pies, 20);

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.match(game._pending_message, /What a mess!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.equal(pies.quan, 1);
    assert.equal(game.inventory.includes(pies), true);
    assert.equal(game.level.objects.length, 0);
    const liveEntry = shop.shopBillEntryForObject(shkp, pies);
    assert.ok(liveEntry);
    assert.equal(liveEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 10);
    assert.equal(pies.unpaidPrice, 10);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.billct, 1);
});

test('upward hero-thrown blinding venom self-hits and blinds the hero', async () => {
    installNonShopFloorState();
    initRng(1);
    const venom = blindingVenom(87690, 'v');
    game.inventory = [venom];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('v');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A splash of blinding venom almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /Splash!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.match(game._pending_message, /It blinds you!/);
    assert.doesNotMatch(game._pending_message, /crashes on your head|evaporates|What a mess|This burns/);
    assert.equal(game.inventory.includes(venom), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.blind, true);
    assert.ok((game.u.ucreamed || 0) > 0);
    assert.ok((game.u._blindTimeout || 0) > 0);
    assert.match(game.u._statusSuffix || '', /Blind/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rnd(25)',
    ]);
});

test('upward hero-thrown blinding venom can break on the ceiling without blinding', async () => {
    installNonShopFloorState();
    initRng(2);
    const venom = blindingVenom(87691, 'v');
    game.inventory = [venom];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('v');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A splash of blinding venom hits the ceiling\./);
    assert.match(game._pending_message, /Splash!/);
    assert.doesNotMatch(game._pending_message, /falls back|You've got it all over your face|It blinds you|evaporates|crashes on your head/);
    assert.equal(game.inventory.includes(venom), false);
    assert.equal(game.level.objects.length, 0);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown blinding venom extends blindness without repeat blind message', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { blind: true, _blindTimeout: 10, ucreamed: 0 });
    const venom = blindingVenom(87692, 'v');
    game.inventory = [venom];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('v');
    await rhack('<');

    assert.match(game._pending_message, /Splash!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.doesNotMatch(game._pending_message, /It blinds you!/);
    assert.equal(game.inventory.includes(venom), false);
    assert.ok((game.u.ucreamed || 0) > 0);
    assert.ok((game.u._blindTimeout || 0) > 10);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rnd(25)',
    ]);
});

test('upward hero-thrown acid venom self-hit only splashes', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 40, uhpmax: 40 });
    const venom = acidVenom(87693, 'a');
    game.inventory = [venom];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A splash of acid venom almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /Splash!/);
    assert.doesNotMatch(game._pending_message, /You've got it all over your face|It blinds you|This burns|evaporates|crashes on your head/);
    assert.equal(game.inventory.includes(venom), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, hpBefore);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown acid venom on no-ceiling air level flies into the sky and splashes', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, {
        uhp: 40,
        uhpmax: 40,
        uz: { dnum: 8, dlevel: 1 },
    });
    game.astral_level = { dnum: 8, dlevel: 5 };
    game.air_level = { dnum: 8, dlevel: 1 };
    game.earth_level = { dnum: 8, dlevel: 3 };
    game.water_level = { dnum: 8, dlevel: 2 };
    game.fire_level = { dnum: 8, dlevel: 4 };
    game.level.at = () => ({ roomno: 0, typ: CLOUD });
    const venom = acidVenom(87694, 'a');
    game.inventory = [venom];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /flies up into the sky, then falls back on top of your head\./);
    assert.match(game._pending_message, /Splash!/);
    assert.doesNotMatch(game._pending_message, /hits the ceiling|almost hits|This burns|evaporates|crashes on your head/);
    assert.equal(game.inventory.includes(venom), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid blinding venom from a stack bills one broken unit', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const venoms = blindingVenom(87695, 'v', 2);
    game.inventory = [venoms];
    shop.addObjectToShopBill(shkp, venoms, 20);

    await rhack('t');
    await rhack('v');
    await rhack('<');

    assert.match(game._pending_message, /Splash!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.equal(venoms.quan, 1);
    assert.equal(game.inventory.includes(venoms), true);
    assert.equal(game.level.objects.length, 0);
    const liveEntry = shop.shopBillEntryForObject(shkp, venoms);
    assert.ok(liveEntry);
    assert.equal(liveEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 10);
    assert.equal(venoms.unpaidPrice, 10);
    assert.equal(shkp.debit, 10);
    assert.equal(shkp.billct, 1);
});

test('upward hero-thrown scroll almost hits and falls back harmlessly', async () => {
    installNonShopFloorState();
    initRng(1);
    const scroll = scrollOfCharging(87700, 's');
    game.inventory = [scroll];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A scroll of charging almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /It doesn't hurt\./);
    assert.doesNotMatch(game._pending_message, /cmdassist|In what direction|crashes|shatters|Splat|What a mess/);
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0].kind, 'scroll of charging');
    assert.equal(game.level.objects[0].ox, game.u.ux);
    assert.equal(game.level.objects[0].oy, game.u.uy);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown scroll can hit the ceiling and fall back harmlessly', async () => {
    installNonShopFloorState();
    initRng(2);
    const scroll = scrollOfCharging(87701, 's');
    game.inventory = [scroll];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A scroll of charging hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /It doesn't hurt\./);
    assert.doesNotMatch(game._pending_message, /cmdassist|In what direction|crashes|shatters|Splat|What a mess/);
    assert.equal(game.inventory.includes(scroll), false);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0].kind, 'scroll of charging');
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown harmless food does not damage the hero', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, { uhp: 30, uhpmax: 30 });
    const pancake = simpleFood(87702, 'pancake', 'p');
    game.inventory = [pancake];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A pancake hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /It doesn't hurt\./);
    assert.doesNotMatch(game._pending_message, /crashes|shatters|Splat|What a mess|cmdassist|In what direction/);
    assert.equal(game.inventory.includes(pancake), false);
    assert.equal(game.level.objects.length, 1);
    assert.equal(game.level.objects[0].kind, 'pancake');
    assert.equal(game.u.uhp, hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid harmless stack item returns one unit to the shop floor', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const pancakes = simpleFood(87703, 'pancake', 'p', {
        quan: 2,
        line: 'p - 2 pancakes',
    });
    game.inventory = [pancakes];
    shop.addObjectToShopBill(shkp, pancakes, 30);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A pancake hits the shop's ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /It doesn't hurt\./);
    assert.doesNotMatch(game._pending_message, /owe|Thief|cost|sell|crashes|shatters/);
    assert.equal(pancakes.quan, 1);
    assert.equal(game.inventory.includes(pancakes), true);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.kind, 'pancake');
    assert.equal(landed.ox, game.u.ux);
    assert.equal(landed.oy, game.u.uy);
    assert.notEqual(landed.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, landed), null);
    const liveEntry = shop.shopBillEntryForObject(shkp, pancakes);
    assert.ok(liveEntry);
    assert.equal(liveEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 15);
    assert.equal(pancakes.unpaidPrice, 15);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.billct, 1);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(2)', 'rn2(5)', 'rn2(100)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown melon self-hits and splats', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 30, uhpmax: 30 });
    const melon = simpleFood(87674, 'melon', 'm');
    game.inventory = [melon];
    enableRngLog({ reset: true });
    const hpBefore = game.u.uhp;

    await rhack('t');
    await rhack('m');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A melon almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /Splat!/);
    assert.doesNotMatch(game._pending_message, /You've got it all over your face|What a mess|crashes on your head|evaporates|cmdassist|In what direction/);
    assert.equal(game.inventory.includes(melon), false);
    assert.equal(game.level.objects.length, 0);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.equal(game.u.uhp, hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown melon can break on the ceiling', async () => {
    installNonShopFloorState();
    initRng(2);
    const melon = simpleFood(87675, 'melon', 'm');
    game.inventory = [melon];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('m');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A melon hits the ceiling\./);
    assert.match(game._pending_message, /Splat!/);
    assert.doesNotMatch(game._pending_message, /falls back|top of your head|You've got it all over your face|What a mess|evaporates/);
    assert.equal(game.inventory.includes(melon), false);
    assert.equal(game.level.objects.length, 0);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid melon from a stack bills one broken unit', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const melons = simpleFood(87676, 'melon', 'm', {
        quan: 2,
        line: 'm - 2 melons',
    });
    game.inventory = [melons];
    shop.addObjectToShopBill(shkp, melons, 10);

    await rhack('t');
    await rhack('m');
    await rhack('<');

    assert.match(game._pending_message, /Splat!/);
    assert.doesNotMatch(game._pending_message, /You've got it all over your face|What a mess/);
    assert.equal(melons.quan, 1);
    assert.equal(game.inventory.includes(melons), true);
    assert.equal(game.level.objects.length, 0);
    const liveEntry = shop.shopBillEntryForObject(shkp, melons);
    assert.ok(liveEntry);
    assert.equal(liveEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 5);
    assert.equal(melons.unpaidPrice, 5);
    assert.equal(shkp.debit, 5);
    assert.equal(shkp.billct, 1);
});

test('upward hero-thrown ordinary egg self-hits and splats on face', async () => {
    installNonShopFloorState();
    initRng(1);
    const eggItem = { ...egg(87677, 'e'), otyp: EGG };
    game.inventory = [eggItem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /An egg almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /Splat!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.doesNotMatch(game._pending_message, /What a mess|crashes on your head|evaporates|cmdassist|In what direction/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 0);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.equal(game.u._blindTimeout || 0, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Blind/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown ordinary egg can break on the ceiling', async () => {
    installNonShopFloorState();
    initRng(2);
    const eggItem = { ...egg(87678, 'e'), otyp: EGG };
    game.inventory = [eggItem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /An egg hits the ceiling\./);
    assert.match(game._pending_message, /Splat!/);
    assert.doesNotMatch(game._pending_message, /falls back|top of your head|You've got it all over your face|What a mess|evaporates/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 0);
    assert.notEqual(game.u.blind, true);
    assert.equal(game.u.ucreamed || 0, 0);
    assert.equal(game.u._blindTimeout || 0, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Blind/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown cockatrice egg breaks on self-hit and petrifies through helmet', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876780, 'e'), otyp: EGG, corpsenm: { name: 'cockatrice' } };
    const helmet = wornArmor(876781, 'orcish helm', 'h', 0);
    game.inventory = [eggItem, helmet];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, 'deathDieMore');
    assert.match(message, /An egg almost hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /Splat!/);
    assert.match(message, /Your helm fails to protect you\./);
    assert.match(message, /You turn to stone\./);
    assert.doesNotMatch(message, /You've got it all over your face|Fortunately/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.inventory.includes(helmet), true);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'petrified by elementary physics');
    assert.equal(game._death_bones_body, 'statue');
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 2), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown cockatrice egg with stone resistance splats without petrifying', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50, stoneResistance: true });
    const eggItem = { ...egg(876782, 'e'), otyp: EGG, corpsenm: { name: 'cockatrice' } };
    game.inventory = [eggItem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /An egg almost hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /Splat!/);
    assert.match(message, /You've got it all over your face!/);
    assert.doesNotMatch(message, /turn to stone|fails to protect|Fortunately/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, 50);
    assert.equal(game._death_cause || '', '');
    assert.doesNotMatch(game.u._statusSuffix || '', /Stone/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 2), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown intact cockatrice egg is blocked by hard helmet and lands', async () => {
    installNonShopFloorState();
    initRng(46249);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876783, 'e'), otyp: EGG, corpsenm: { name: 'cockatrice' } };
    const helmet = wornArmor(876784, 'orcish helm', 'h', 0);
    game.inventory = [eggItem, helmet];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /An egg almost hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /Fortunately, you are wearing a hard helmet\./);
    assert.doesNotMatch(message, /Splat!|turn to stone|fails to protect|all over your face/);
    assert.equal(game.u.uhp, 49);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.inventory.includes(helmet), true);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.otyp, EGG);
    assert.equal(landed.corpsenm?.name, 'cockatrice');
    assert.equal(landed.ox, game.u.ux);
    assert.equal(landed.oy, game.u.uy);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 3), [
        'rn2(5)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown cockatrice egg can break on the ceiling without petrifying', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876785, 'e'), otyp: EGG, corpsenm: { name: 'cockatrice' } };
    game.inventory = [eggItem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /An egg hits the ceiling\./);
    assert.match(message, /Splat!/);
    assert.doesNotMatch(message, /falls back|top of your head|all over your face|turn to stone|fails to protect/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, 50);
    assert.equal(game._death_cause || '', '');
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 2), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown bare-handed cockatrice corpse petrifies before toss-up', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const body = corpse(876786, 'c', 'cockatrice');
    game.inventory = [body];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, 'deathDieMore');
    assert.match(message, /You throw the cockatrice corpse with your bare hands\./);
    assert.match(message, /You turn to stone\.\.\./);
    assert.doesNotMatch(message, /almost hits|hits the ceiling|falls back/);
    assert.equal(game.inventory.includes(body), true);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'petrified by throwing a cockatrice corpse bare-handed');
    assert.equal(game._death_bones_body, 'statue');
    assert.equal(getRngLog().some(entry => entry.startsWith('rn2(5)')), false);
});

test('upward hero-thrown gloved cockatrice corpse self-hit petrifies by elementary physics', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const body = corpse(876787, 'c', 'cockatrice');
    const gloves = wornArmor(876788, 'leather gloves', 'g');
    game.inventory = [body, gloves];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, 'deathDieMore');
    assert.match(message, /A cockatrice corpse almost hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /You turn to stone\./);
    assert.doesNotMatch(message, /bare hands|Fortunately|fails to protect/);
    assert.equal(game.inventory.includes(body), false);
    assert.equal(game.inventory.includes(gloves), true);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.otyp, 'corpse');
    assert.equal(landed.corpsenm?.name, 'cockatrice');
    assert.equal(landed.ox, game.u.ux);
    assert.equal(landed.oy, game.u.uy);
    assert.equal(game.u.uhp, 0);
    assert.equal(game._death_cause, 'petrified by elementary physics');
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 2), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown cockatrice corpse is blocked by hard helmet and lands', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const body = corpse(876789, 'c', 'cockatrice');
    const gloves = wornArmor(876888, 'leather gloves', 'g');
    const helmet = wornArmor(876889, 'orcish helm', 'h', 0);
    game.inventory = [body, gloves, helmet];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /A cockatrice corpse hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /Fortunately, you are wearing a hard helmet\./);
    assert.doesNotMatch(message, /bare hands|turn to stone|fails to protect/);
    assert.equal(game.u.uhp, 49);
    assert.equal(game.inventory.includes(body), false);
    assert.equal(game.inventory.includes(gloves), true);
    assert.equal(game.inventory.includes(helmet), true);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.otyp, 'corpse');
    assert.equal(landed.corpsenm?.name, 'cockatrice');
    assert.equal(landed.ox, game.u.ux);
    assert.equal(landed.oy, game.u.uy);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid ordinary egg from a stack bills one broken unit', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    const eggs = { ...egg(87679, 'e', 2), otyp: EGG };
    game.inventory = [eggs];
    shop.addObjectToShopBill(shkp, eggs, 18);

    await rhack('t');
    await rhack('e');
    await rhack('<');

    assert.match(game._pending_message, /Splat!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.equal(eggs.quan, 1);
    assert.equal(game.inventory.includes(eggs), true);
    assert.equal(game.level.objects.length, 0);
    const liveEntry = shop.shopBillEntryForObject(shkp, eggs);
    assert.ok(liveEntry);
    assert.equal(liveEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(liveEntry), 9);
    assert.equal(eggs.unpaidPrice, 9);
    assert.equal(shkp.debit, 9);
    assert.equal(shkp.billct, 1);
});

test('upward hero-thrown pyrolisk egg self-hit explodes before face message', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876790, 'e'), otyp: EGG, corpsenm: { name: 'pyrolisk' } };
    game.inventory = [eggItem];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /An egg almost hits the ceiling, then falls back on top of your head\./);
    assert.match(message, /Splat!/);
    assert.match(message, /Boom!/);
    assert.match(message, /You are caught in the fireball!/);
    assert.match(message, /You've got it all over your face!/);
    assert.equal(message.indexOf('Splat!') < message.indexOf('Boom!'), true);
    assert.equal(message.indexOf('You are caught in the fireball!') < message.indexOf("You've got it all over your face!"), true);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp < hpBefore, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 3), [
        'rn2(5)', 'rn2(100)', 'd(3,6)',
    ]);
});

test('upward hero-thrown pyrolisk egg can explode on the ceiling', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876791, 'e'), otyp: EGG, corpsenm: { name: 'pyrolisk' } };
    game.inventory = [eggItem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /An egg hits the ceiling\./);
    assert.match(message, /Splat!/);
    assert.match(message, /Boom!/);
    assert.match(message, /You are caught in the fireball!/);
    assert.doesNotMatch(message, /falls back|top of your head|all over your face|What a mess|evaporates/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 3), [
        'rn2(5)', 'rn2(100)', 'd(3,6)',
    ]);
});

test('upward hero-thrown pyrolisk egg can survive self-hit and land', async () => {
    installNonShopFloorState();
    initRng(46249);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876792, 'e'), otyp: EGG, corpsenm: { name: 'pyrolisk' } };
    game.inventory = [eggItem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    await rhack('<');

    const message = game._pending_message || '';
    assert.equal(game._command_mode, null);
    assert.match(message, /An egg almost hits the ceiling, then falls back on top of your head\./);
    assert.doesNotMatch(message, /Splat!|Boom!|fireball|all over your face/);
    assert.equal(game.u.uhp, 49);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.otyp, EGG);
    assert.equal(landed.corpsenm?.name, 'pyrolisk');
    assert.equal(landed.ox, game.u.ux);
    assert.equal(landed.oy, game.u.uy);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid pyrolisk egg bills the broken egg before explosion', async () => {
    const { shkp } = installCommandShopState();
    Object.assign(shkp, { mx: 20, my: 20, shk: { x: 20, y: 20 } });
    initRng(1);
    Object.assign(game.u, { uhp: 50, uhpmax: 50 });
    const eggItem = { ...egg(876793, 'e'), otyp: EGG, corpsenm: { name: 'pyrolisk' } };
    game.inventory = [eggItem];
    shop.addObjectToShopBill(shkp, eggItem, 9);

    await rhack('t');
    await rhack('e');
    await rhack('<');

    assert.match(game._pending_message, /Splat!/);
    assert.match(game._pending_message, /Boom!/);
    assert.match(game._pending_message, /You've got it all over your face!/);
    assert.equal(game.inventory.includes(eggItem), false);
    assert.equal(shop.shopBillEntryForObject(shkp, eggItem), null);
    assert.equal(shkp.debit, 9);
    assert.equal(shkp.billct, 0);
});

test('upward hero-thrown mirror self-hits and shatters with bad luck', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 30, uhpmax: 30, uluck: 0 });
    const mirror = {
        id: 87680,
        otyp: MIRROR,
        cls: 'tool',
        glyph: '(',
        kind: 'looking glass',
        actualKind: 'mirror',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'm',
        line: 'm - a looking glass',
    };
    game.inventory = [mirror];
    enableRngLog({ reset: true });
    const hpBefore = game.u.uhp;

    await rhack('t');
    await rhack('m');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A looking glass almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /A looking glass shatters into a thousand pieces!/);
    assert.doesNotMatch(game._pending_message, /crashes on your head|evaporates|Splat|What a mess|cmdassist/);
    assert.equal(game.inventory.includes(mirror), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, hpBefore);
    assert.equal(game.u.uluck, -2);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown crystal ball can break on the ceiling', async () => {
    installNonShopFloorState();
    initRng(2);
    const ball = crystalBall(87681, 'c');
    game.inventory = [ball];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A crystal ball hits the ceiling\./);
    assert.match(game._pending_message, /A crystal ball shatters into a thousand pieces!/);
    assert.doesNotMatch(game._pending_message, /falls back|top of your head|crashes on your head|evaporates|Splat|What a mess/);
    assert.equal(game.inventory.includes(ball), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown lenses self-hit uses pair wording and shatters', async () => {
    installNonShopFloorState();
    initRng(1);
    const lenses = {
        ...chargedTool(87682, 'lenses', 'l', 0),
        line: 'l - a pair of lenses',
    };
    game.inventory = [lenses];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('l');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A pair of lenses almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /A pair of lenses shatters into a thousand pieces!/);
    assert.doesNotMatch(game._pending_message, /a lenses|crashes on your head|evaporates|Splat|What a mess/);
    assert.equal(game.inventory.includes(lenses), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid crystal ball bills the broken object', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const ball = crystalBall(87683, 'c');
    game.inventory = [ball];
    shop.addObjectToShopBill(shkp, ball, 60);

    await rhack('t');
    await rhack('c');
    await rhack('<');

    assert.match(game._pending_message, /A crystal ball shatters into a thousand pieces!/);
    assert.equal(game.inventory.includes(ball), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, ball), null);
    assert.equal(shkp.debit, 60);
    assert.equal(shkp.billct, 0);
});

test('upward hero-thrown expensive camera self-hit can release a peaceful homunculus', async () => {
    installNonShopFloorState();
    initRng(1);
    markHeroNeighborhoodVisible();
    const camera = expensiveCamera(87684, 'c');
    game.inventory = [camera];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    const released = game.level.monsters.find(mon => mon.data?.name === 'homunculus');
    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /An expensive camera almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /An expensive camera shatters into a thousand pieces!/);
    assert.match(game._pending_message, /The picture-painting demon is released!/);
    assert.ok(released);
    assert.equal(released.mpeaceful, 1);
    assert.notDeepEqual([released.mx, released.my], [game.u.ux, game.u.uy]);
    assert.equal(game.inventory.includes(camera), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 4), [
        'rn2(5)', 'rn2(100)', 'rn2(3)', 'rn2(3)',
    ]);
});

test('upward hero-thrown cursed expensive camera ceiling break releases a hostile imp', async () => {
    installNonShopFloorState();
    initRng(5);
    markHeroNeighborhoodVisible();
    const camera = expensiveCamera(87685, 'c', { cursed: true });
    game.inventory = [camera];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    const released = game.level.monsters.find(mon => mon.data?.name === 'imp');
    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /An expensive camera hits the ceiling\./);
    assert.match(game._pending_message, /An expensive camera shatters into a thousand pieces!/);
    assert.match(game._pending_message, /The picture-painting demon is released!/);
    assert.doesNotMatch(game._pending_message, /falls back|top of your head/);
    assert.ok(released);
    assert.equal(released.mpeaceful, 0);
    assert.equal(game.inventory.includes(camera), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 4), [
        'rn2(5)', 'rn2(100)', 'rn2(3)', 'rn2(3)',
    ]);
});

test('upward hero-thrown unpaid expensive camera bills without forced demon release', async () => {
    const { shkp } = installCommandShopState();
    initRng(2);
    const camera = expensiveCamera(87686, 'c');
    game.inventory = [camera];
    shop.addObjectToShopBill(shkp, camera, 200);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('c');
    await rhack('<');

    assert.match(game._pending_message, /An expensive camera hits the shop's ceiling\./);
    assert.match(game._pending_message, /An expensive camera shatters into a thousand pieces!/);
    assert.doesNotMatch(game._pending_message, /picture-painting demon is released/);
    assert.equal(game.inventory.includes(camera), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, camera), null);
    assert.equal(shkp.debit, 200);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 3), [
        'rn2(5)', 'rn2(100)', 'rn2(3)',
    ]);
});

test('upward hero-thrown unknown glass wand self-hit shatters into pieces', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 30, uhpmax: 30 });
    const wand = unknownAppearanceWand(87687, 'glass', 'w');
    game.inventory = [wand];
    enableRngLog({ reset: true });
    const hpBefore = game.u.uhp;

    await rhack('t');
    await rhack('w');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A glass wand almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /A glass wand shatters into a thousand pieces!/);
    assert.doesNotMatch(game._pending_message, /crashes on your head|evaporates|Splat|What a mess/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u.uhp, hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown known glass-material wand can break on the ceiling', async () => {
    installNonShopFloorState();
    initRng(2);
    const wand = lightWand(87688, 'w', { material: 'glass' });
    game.inventory = [wand];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A wand of light hits the ceiling\./);
    assert.match(game._pending_message, /A wand of light shatters into a thousand pieces!/);
    assert.doesNotMatch(game._pending_message, /falls back|top of your head|crashes on your head|evaporates|Splat|What a mess/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid glass-material wand bills the broken object', async () => {
    const { shkp } = installCommandShopState();
    initRng(1);
    const wand = unknownAppearanceWand(87689, 'glass', 'w');
    game.inventory = [wand];
    shop.addObjectToShopBill(shkp, wand, 100);

    await rhack('t');
    await rhack('w');
    await rhack('<');

    assert.match(game._pending_message, /A glass wand shatters into a thousand pieces!/);
    assert.equal(game.inventory.includes(wand), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(shop.shopBillEntryForObject(shkp, wand), null);
    assert.equal(shkp.debit, 100);
    assert.equal(shkp.billct, 0);
});

test('upward hero-thrown crystal plate mail self-hit cracks and lands', async () => {
    installNonShopFloorState();
    initRng(11);
    Object.assign(game.u, { uhp: 30, uhpmax: 30 });
    const armor = carriedGlassArmor(87690, 'a');
    game.inventory = [armor];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A crystal plate mail almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /The mail cracks!/);
    assert.doesNotMatch(game._pending_message, /shatters into a thousand pieces|It doesn't hurt|crashes on your head|cmdassist|In what direction/);
    assert.equal(game.inventory.includes(armor), false);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.kind, 'crystal plate mail');
    assert.equal(landed.oeroded, 1);
    assert.equal(landed.ox, game.u.ux);
    assert.equal(landed.oy, game.u.uy);
    assert.equal(game.u.uhp, hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown fully cracked crystal plate mail shatters on ceiling', async () => {
    installNonShopFloorState();
    initRng(5);
    const armor = carriedGlassArmor(87691, 'a', { oeroded: 3 });
    game.inventory = [armor];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A crystal plate mail hits the ceiling\./);
    assert.match(game._pending_message, /The mail shatters!/);
    assert.doesNotMatch(game._pending_message, /falls back|top of your head|thousand pieces|crashes on your head/);
    assert.equal(game.inventory.includes(armor), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)',
    ]);
});

test('upward hero-thrown unpaid crystal plate mail crack returns to shop floor without debt', async () => {
    const { shkp } = installCommandShopState();
    initRng(11);
    const armor = carriedGlassArmor(87692, 'a');
    game.inventory = [armor];
    shop.addObjectToShopBill(shkp, armor, 820);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /A crystal plate mail almost hits the shop's ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /The mail cracks!/);
    assert.doesNotMatch(game._pending_message, /owe|Thief|objects destroyed|you pay|thousand pieces/);
    assert.equal(game.inventory.includes(armor), false);
    assert.equal(game.level.objects.length, 1);
    const landed = game.level.objects[0];
    assert.equal(landed.kind, 'crystal plate mail');
    assert.equal(landed.oeroded, 1);
    assert.notEqual(landed.unpaid, true);
    assert.equal(shop.shopBillEntryForObject(shkp, landed), null);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.equal(shkp.billct, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(100)', 'rn2(100)',
    ]);
});

test('upward hero-thrown polymorph potion self-hits and polymorphs the hero', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, {
        uhp: 40,
        uhpmax: 40,
        uen: 0,
        uenmax: 0,
        ulevel: 1,
        uac: 10,
    });
    game.u.acurr.a[A_CON] = 25;
    const potion = polymorphPotion(87668, 'p');
    potion.dknown = true;
    game.inventory = [potion];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /almost hits the ceiling, then falls back on top of your head\./);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.match(game._pending_message, /You feel a little strange\./);
    assert.match(game._pending_message, /You turn into an? .*!/);
    assert.doesNotMatch(game._pending_message, /peculiar odor|cmdassist|misses|shatters/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u._polyself_base);
    assert.ok(game.u._polyself_form?.name);
    assert.equal(game.u.uconduct?.polyselfs, 1);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 4), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rn2(20)',
    ]);
});

test('upward hero-thrown polymorph potion system shock does not polyself', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 40, uhpmax: 40 });
    const potion = polymorphPotion(87669, 'p');
    potion.dknown = true;
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.match(game._pending_message, /You feel a little strange\./);
    assert.match(game._pending_message, /You shudder for a moment\./);
    assert.doesNotMatch(game._pending_message, /You turn into|peculiar odor|cmdassist|misses/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u._polyself_base || null, null);
    assert.equal(game.u._polyself_form || null, null);
    assert.ok(game.u.uhp < hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rn2(20)', 'rnd(30)', 'rn2(2)', 'rn2(2)',
    ]);
});

test('upward hero-thrown polymorph potion is blocked by unchanging after feeling strange', async () => {
    installNonShopFloorState();
    initRng(1);
    Object.assign(game.u, { uhp: 40, uhpmax: 40, unchanging: true });
    const potion = polymorphPotion(87670, 'p');
    potion.dknown = true;
    game.inventory = [potion];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.match(game._pending_message, /You feel a little strange\./);
    assert.doesNotMatch(game._pending_message, /You fail to transform|You shudder|You turn into|peculiar odor/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u._polyself_base || null, null);
    assert.equal(game.u._polyself_form || null, null);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rn2(2)',
    ]);
});

test('upward hero-thrown potion underwater almost hits the water surface', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, {
        uhp: 40,
        uhpmax: 40,
        uinwater: 1,
        underwater: true,
        uunderwater: true,
    });
    const potion = confusionPotion(87666, 'p', 1, { dknown: true });
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /almost hits the water's surface, then falls back on top of your head\./);
    assert.doesNotMatch(game._pending_message, /hits the ceiling|almost hits the ceiling/);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u.uhp < hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rnd(5)',
    ]);
});

test('upward hero-thrown potion on no-ceiling air level flies into the sky', async () => {
    installNonShopFloorState();
    initRng(2);
    Object.assign(game.u, {
        uhp: 40,
        uhpmax: 40,
        uz: { dnum: 8, dlevel: 1 },
    });
    game.astral_level = { dnum: 8, dlevel: 5 };
    game.air_level = { dnum: 8, dlevel: 1 };
    game.earth_level = { dnum: 8, dlevel: 3 };
    game.water_level = { dnum: 8, dlevel: 2 };
    game.fire_level = { dnum: 8, dlevel: 4 };
    game.level.at = () => ({ roomno: 0, typ: CLOUD });
    const potion = confusionPotion(87667, 'p', 1, { dknown: true });
    game.inventory = [potion];
    const hpBefore = game.u.uhp;
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.equal(game._command_mode, null);
    assert.match(game._pending_message, /flies up into the sky, then falls back on top of your head\./);
    assert.doesNotMatch(game._pending_message, /almost hits|hits the ceiling|shatters/);
    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.ok(game.u.uhp < hpBefore);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rn2(5)', 'rn2(7)', 'rnd(2)', 'rnd(5)',
    ]);
});

test('upward hero-thrown unpaid confusion potion from a stack bills one unit', async () => {
    const { shkp } = installCommandShopState();
    initRng(5);
    Object.assign(game.u, { uhp: 20, uhpmax: 20 });
    const stack = confusionPotion(8767, 'p', 2, { dknown: true });
    game.inventory = [stack];
    shop.addObjectToShopBill(shkp, stack, 100);
    const beforeEntry = shop.shopBillEntryForObject(shkp, stack);
    const beforeTotal = shop.shopBillEntryTotal(beforeEntry);
    const unitPrice = Math.max(1, Math.trunc(beforeTotal / beforeEntry.bquan));

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.match(game._pending_message, /breaks into shards/);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.match(game._pending_message, /You feel somewhat dizzy\./);
    assert.equal(stack.quan, 1);
    assert.equal(game.inventory.includes(stack), true);
    assert.equal(game.level.objects.length, 0);
    const afterEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.ok(afterEntry);
    assert.equal(afterEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(afterEntry), beforeTotal - unitPrice);
    assert.equal(stack.unpaidPrice, beforeTotal - unitPrice);
    assert.equal(shkp.debit, unitPrice);
    assert.equal(shkp.billct, 1);
    assert.equal(game._usedUpShopBills || null, null);
});

test('wet worn towel blocks upward thrown confusion potion vapor', async () => {
    installNonShopFloorState();
    initRng(1);
    const potion = confusionPotion(8768, 'p', 1, { dknown: true });
    const towel = ordinaryTool(8769, 'towel', 't');
    towel.spe = 3;
    towel.wetness = 3;
    towel.worn = true;
    towel.line = 't - a towel (being worn)';
    game.inventory = [potion, towel];

    await rhack('t');
    await rhack('p');
    await rhack('<');

    assert.match(game._pending_message, /crashes on your head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of confusion evaporates\./);
    assert.match(game._pending_message, /Some vapor passes harmlessly around you\./);
    assert.doesNotMatch(game._pending_message, /You feel somewhat dizzy|peculiar odor/);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.inventory.includes(towel), true);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game.u._confusionTimeout || 0, 0);
    assert.doesNotMatch(game.u._statusSuffix || '', /Conf/);
});

test('hero-thrown hallucination potion uses common potionhit without monster effect', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = hallucinationPotion(8795, 'h', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of hallucination evaporates\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|momentary vision/);
    assert.equal(goblin.mconf || false, false);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(goblin.mhp, 4);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of hallucination') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('adjacent hero-thrown hallucination potion applies direct vapor after common hit', async () => {
    installNonShopFloorState();
    initRng(4);
    game.u.acurr.a[A_DEX] = 25;
    const potion = hallucinationPotion(8796, 'h', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    await rhack('l');

    const message = game._pending_message;
    assert.match(message, /The potion of hallucination evaporates\./);
    assert.match(message, /You have a momentary vision\./);
    assert.ok(message.indexOf('The potion of hallucination evaporates.') < message.indexOf('You have a momentary vision.'));
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of hallucination') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(13)',
    ]);
});

test('hero-thrown hallucination potion effect can come from potion index', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 8797,
        cls: 'potion',
        glyph: '!',
        kind: 'magenta potion',
        potionIndex: 7,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'h',
        line: 'h - a magenta potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    await rhack('l');

    assert.match(game._pending_message, /The magenta potion evaporates\./);
    assert.doesNotMatch(game._pending_message, /momentary vision|peculiar odor/);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of hallucination') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('visible dknown no-vapor potion hit offers an appearance call', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 87971,
        cls: 'potion',
        glyph: '!',
        kind: 'magenta potion',
        potionIndex: 7,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'h',
        line: 'h - a magenta potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The magenta potion evaporates\./);
    assert.doesNotMatch(game._pending_message, /momentary vision|potion of hallucination/);
    assert.equal(game._message_more, 1);
    await answerPotionTryCall('magenta', 'visions');
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of hallucination') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('non-visible dknown no-vapor potion hit shows crash without evaporation or call prompt', async () => {
    const cases = [
        {
            name: 'blind',
            prepare(goblin) {
                markSquareVisible(goblin.mx, goblin.my);
                game.u.blind = true;
            },
        },
        {
            name: 'out-of-sight',
            prepare() {
                game.viz_array = [];
            },
        },
    ];

    for (const { name, prepare } of cases) {
        installNonShopFloorState();
        initRng(2);
        game.u.acurr.a[A_DEX] = 25;
        const potion = {
            id: 87973,
            cls: 'potion',
            glyph: '!',
            kind: 'magenta potion',
            potionIndex: 7,
            quan: 1,
            ox: 5,
            oy: 5,
            letter: 'h',
            line: 'h - a magenta potion',
            dknown: true,
        };
        const goblin = ordinaryThrowTarget('goblin', 7, 5);
        game.inventory = [potion];
        game.level.monsters = [goblin];
        enableRngLog({ reset: true });

        await rhack('t');
        await rhack('h');
        prepare(goblin);
        await rhack('l');

        const message = game._pending_message || '';
        assert.match(message, /^Crash!$/, name);
        assert.doesNotMatch(message, /crashes on|evaporates|momentary vision|peculiar odor|misses|shatters/, name);
        assert.equal(goblin.mhp, 4, name);
        assert.equal(goblin.msleeping, 0, name);
        assert.equal(goblin.mpeaceful, false, name);
        assert.equal(game._command_mode, null, name);
        assert.equal(game._message_more || 0, 0, name);
        assert.equal(game._call_potion_appearance || '', '', name);
        assert.equal(game.inventory.includes(potion), false, name);
        assert.equal(game.level.objects.length, 0, name);
        assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
            'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
        ], name);
    }
});

test('visible no-vapor potion hit skips call for already-called appearance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    game._called_potions = { magenta: 'visions' };
    const potion = {
        id: 87972,
        cls: 'potion',
        glyph: '!',
        kind: 'magenta potion',
        potionIndex: 7,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'h',
        line: 'h - a magenta potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];

    await rhack('t');
    await rhack('h');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The magenta potion evaporates\./);
    assert.equal(game._command_mode, null);
    assert.equal(game._message_more || 0, 0);
});

test('hero-thrown common no-effect potions use shared potionhit crash path', async () => {
    const commonNoEffectPotions = [
        'levitation',
        'see invisible',
        'gain level',
        'enlightenment',
        'monster detection',
        'object detection',
        'gain energy',
        'fruit juice',
    ];

    for (const [index, name] of commonNoEffectPotions.entries()) {
        installNonShopFloorState();
        initRng(2);
        game.u.acurr.a[A_DEX] = 25;
        const potion = namedPotion(8798 + index, name, 'p', 1, { dknown: true });
        const goblin = ordinaryThrowTarget('goblin', 7, 5);
        game.inventory = [potion];
        game.level.monsters = [goblin];
        enableRngLog({ reset: true });

        await rhack('t');
        await rhack('p');
        await rhack('l');

        const message = game._pending_message || '';
        assert.match(message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./, name);
        assert.ok(message.includes(`The potion of ${name} evaporates.`), name);
        assert.doesNotMatch(message, /misses|shatters|peculiar odor|momentary vision|looks sound|falls asleep/, name);
        assert.equal(goblin.mhp, 4, name);
        assert.equal(goblin.msleeping, 0, name);
        assert.equal(goblin.mpeaceful, false, name);
        assert.equal(game.inventory.includes(potion), false, name);
        assert.equal(game.level.objects.length, 0, name);
        assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === `potion of ${name}`) ?? false, false, name);
        assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
            'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
        ], name);
    }
});

test('hero-thrown common no-effect potion can come from potion index', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 8806,
        cls: 'potion',
        glyph: '!',
        kind: 'puce potion',
        potionIndex: 15,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'p',
        line: 'p - a puce potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The puce potion evaporates\./);
    assert.doesNotMatch(game._pending_message, /object detection|peculiar odor|momentary vision/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown common no-effect potion can come from concrete otyp', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 88061,
        cls: 'potion',
        glyph: '!',
        otyp: POT_OBJECT_DETECTION,
        kind: 'puce potion',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'p',
        line: 'p - a puce potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The puce potion evaporates\./);
    assert.doesNotMatch(game._pending_message, /object detection|peculiar odor|momentary vision/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('adjacent hero-thrown common no-effect otyp potion offers vapor trycall', async () => {
    installNonShopFloorState();
    initRng(4);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 88062,
        cls: 'potion',
        glyph: '!',
        otyp: POT_OBJECT_DETECTION,
        kind: 'puce potion',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'p',
        line: 'p - a puce potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 6, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.match(message, /crashes on the goblin's head and breaks into shards\./);
    assert.match(message, /The puce potion evaporates\./);
    assert.doesNotMatch(message, /object detection|momentary vision|peculiar odor|misses|shatters/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game._command_mode, 'callPotionAfterMore');
    assert.equal(game._call_potion_appearance, 'puce');
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of object detection') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(13)',
    ]);
});

test('hero-thrown unlit oil potion hits through potionhit without evaporating', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(8807, 'p');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.doesNotMatch(game._pending_message, /evaporates|misses|BOOM|explodes|peculiar odor/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown lit oil potion explodes on a direct monster hit', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(88071, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    markSquareVisible(goblin.mx, goblin.my);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /Boom!/);
    assert.match(game._pending_message, /The goblin is caught in the burning oil!/);
    assert.doesNotMatch(game._pending_message, /evaporates|misses|shatters|peculiar odor/);
    assert.equal(goblin.mhp < 29, true);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(100)',
    ]);
});

test('hero-thrown lit oil explosion consumes closed doors before floor-object fire and monster damage', async () => {
    installNonShopFloorState();
    initRng(8);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880711, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const doorLoc = { roomno: 0, typ: DOOR, doormask: D_CLOSED, flags: 7, lit: true };
    const cells = new Map([['8,5', doorLoc]]);
    const book = floorHealingSpellbook(880712);
    Object.assign(book, { ox: 8, oy: 5 });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.objects = [book];
    game.level.monsters = [goblin];
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM, lit: true };
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.equal(doorLoc.typ, DOOR);
    assert.equal(doorLoc.doormask, D_NODOOR);
    assert.equal(doorLoc.flags, 0);
    assert.equal(game.level.objects.includes(book), false);
    assert.match(message, /The door is consumed in flames!/);
    assert.match(message, /You see a puff of smoke\./);
    assert.equal(message.indexOf('The door is consumed in flames!') < message.indexOf('You see a puff of smoke.'), true);
    assert.equal(message.indexOf('You see a puff of smoke.') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.equal(goblin.mhp < 30, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(3)', 'rn2(100)',
    ]);
});

test('hero-thrown lit oil explosion reveals then consumes closed secret doors', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880713, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const secretLoc = { roomno: 0, typ: SDOOR, doormask: D_CLOSED, flags: 7, lit: true };
    const cells = new Map([['8,5', secretLoc]]);
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM, lit: true };
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.equal(secretLoc.typ, DOOR);
    assert.equal(secretLoc.doormask, D_NODOOR);
    assert.equal(secretLoc.flags, 0);
    assert.match(message, /The blast reveals a secret door\./);
    assert.match(message, /The door is consumed in flames!/);
    assert.equal(message.indexOf('The blast reveals a secret door.') < message.indexOf('The door is consumed in flames!'), true);
    assert.equal(message.indexOf('The door is consumed in flames!') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(100)',
    ]);
});

test('deaf blind hero-thrown lit oil explosion still smells consumed doors', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    game.u.blind = true;
    game.u._deafTimeout = 10;
    game.u._statusSuffix = ' Deaf';
    const potion = oilPotion(880714, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const doorLoc = { roomno: 0, typ: DOOR, doormask: D_CLOSED, flags: 7, lit: true };
    const cells = new Map([['8,5', doorLoc]]);
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM, lit: true };

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.equal(doorLoc.doormask, D_NODOOR);
    assert.match(message, /You smell smoke\./);
    assert.doesNotMatch(message, /Boom!|You hear a blast|The door is consumed in flames!/);
});

test('hero-thrown lit oil explosion burns floor objects across the blast before monster damage', async () => {
    installNonShopFloorState();
    initRng(8);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(88075, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const centerBook = floorHealingSpellbook(880751);
    Object.assign(centerBook, { ox: 7, oy: 5 });
    const adjacentBook = floorHealingSpellbook(880752);
    Object.assign(adjacentBook, { ox: 8, oy: 5 });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.objects = [centerBook, adjacentBook];
    game.level.monsters = [goblin];
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.equal(game.level.objects.includes(centerBook), false);
    assert.equal(game.level.objects.includes(adjacentBook), false);
    assert.equal((message.match(/You see a puff of smoke\./g) || []).length, 2);
    assert.equal(message.indexOf('You see a puff of smoke.') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.equal(goblin.mhp < 30, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(3)', 'rn2(3)', 'rn2(100)',
    ]);
});

test('hero-thrown lit oil explosion melts blast ice before monster damage', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880745, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const iceLoc = {
        roomno: 0,
        typ: ICE,
        icedpool: ICED_POOL,
        flags: 0,
        meltIceTurn: 200,
        meltIceTimeout: 200,
        meltIceAwayTurn: 200,
    };
    const otherIceLoc = { roomno: 0, typ: ICE, icedpool: ICED_POOL, flags: 0 };
    const cells = new Map([
        ['8,5', iceLoc],
        ['2,2', otherIceLoc],
    ]);
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    game.level.meltIceTimers = [
        { x: 8, y: 5, turn: 200, seq: 1 },
        { x: 2, y: 2, turn: 300, seq: 2 },
    ];
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM };
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.equal(iceLoc.typ, POOL);
    assert.equal(iceLoc.icedpool, undefined);
    assert.equal(iceLoc.meltIceTurn, undefined);
    assert.equal(iceLoc.meltIceTimeout, undefined);
    assert.equal(iceLoc.meltIceAwayTurn, undefined);
    assert.deepEqual(game.level.meltIceTimers, [{ x: 2, y: 2, turn: 300, seq: 2 }]);
    assert.equal(otherIceLoc.typ, ICE);
    assert.match(message, /The ice crackles and melts\./);
    assert.equal(message.indexOf('Boom!') < message.indexOf('The ice crackles and melts.'), true);
    assert.equal(message.indexOf('The ice crackles and melts.') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(100)',
    ]);
});

test('hero-thrown lit oil explosion evaporates blast pools before floor-object fire', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880746, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const poolLoc = { roomno: 0, typ: POOL, flags: 7, doormask: 3, wall_info: 5 };
    const cells = new Map([['8,5', poolLoc]]);
    const book = floorHealingSpellbook(880747);
    Object.assign(book, { ox: 8, oy: 5 });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.objects = [book];
    game.level.monsters = [goblin];
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM };
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    const rngNames = getRngLog().map(entry => entry.replace(/=.*/, ''));
    const pit = (game.level.traps || []).find(trap => trap.tx === 8 && trap.ty === 5);
    assert.equal(poolLoc.typ, ROOM);
    assert.equal(poolLoc.flags, 0);
    assert.equal(poolLoc.doormask, 0);
    assert.equal(poolLoc.wall_info, 0);
    assert.equal(pit?.ttyp, PIT);
    assert.equal(game.level.objects.includes(book), false);
    assert.equal((game.level.regions || []).some(region =>
        region.type === 'gas_cloud' && region.coords.some(coord => coord.x === 8 && coord.y === 5)), true);
    assert.match(message, /The water evaporates\./);
    assert.equal(message.indexOf('The water evaporates.') < message.indexOf('You see a puff of smoke.'), true);
    assert.equal(message.indexOf('You see a puff of smoke.') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.equal(rngNames.includes('rnd(5)'), true);
    assert.equal(rngNames.indexOf('rnd(5)') < rngNames.lastIndexOf('rn2(100)'), true);
});

test('hero-thrown lit oil explosion evaporates moat water without changing terrain', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880748, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const moatLoc = { roomno: 0, typ: MOAT, flags: 11 };
    const cells = new Map([['8,5', moatLoc]]);
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM };
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    const rngNames = getRngLog().map(entry => entry.replace(/=.*/, ''));
    assert.equal(moatLoc.typ, MOAT);
    assert.equal(moatLoc.flags, 11);
    assert.equal((game.level.traps || []).some(trap => trap.tx === 8 && trap.ty === 5), false);
    assert.equal((game.level.regions || []).some(region =>
        region.type === 'gas_cloud' && region.coords.some(coord => coord.x === 8 && coord.y === 5)), true);
    assert.match(message, /Some water evaporates\./);
    assert.equal(message.indexOf('Some water evaporates.') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.equal(rngNames.includes('rnd(5)'), true);
    assert.equal(rngNames.indexOf('rnd(5)') < rngNames.lastIndexOf('rn2(100)'), true);
});

test('hero-thrown lit oil explosion steams and dries blast fountains before monster damage', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880749, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const fountainLoc = {
        roomno: 0,
        typ: FOUNTAIN,
        flags: 7,
        blessedftn: 1,
        fountainWarned: true,
    };
    const cells = new Map([['8,5', fountainLoc]]);
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    game.level.flags.nfountains = 1;
    game.level.at = (x, y) => cells.get(`${x},${y}`) || { roomno: 0, typ: ROOM };
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    const rngNames = getRngLog().map(entry => entry.replace(/=.*/, ''));
    assert.equal(fountainLoc.typ, ROOM);
    assert.equal(fountainLoc.flags, 0);
    assert.equal(fountainLoc.blessedftn, 0);
    assert.equal(game.level.flags.nfountains, 0);
    assert.equal((game.level.regions || []).some(region =>
        region.type === 'gas_cloud' && region.coords.some(coord => coord.x === 8 && coord.y === 5)), true);
    assert.match(message, /Steam billows from the fountain\./);
    assert.match(message, /The fountain dries up!/);
    assert.equal(message.indexOf('Boom!') < message.indexOf('Steam billows from the fountain.'), true);
    assert.equal(message.indexOf('Steam billows from the fountain.') < message.indexOf('The fountain dries up!'), true);
    assert.equal(message.indexOf('The fountain dries up!') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.equal(rngNames.includes('rnd(3)'), true);
    assert.equal(rngNames.indexOf('rnd(3)') < rngNames.lastIndexOf('rn2(100)'), true);
});

test('hero-thrown lit oil explosion burns visible webs before monster damage', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(880755, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const centerWeb = { ttyp: WEB, tx: 7, ty: 5, tseen: true };
    const adjacentWeb = { ttyp: WEB, tx: 8, ty: 5, tseen: true };
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    goblin.mtrapped = 1;
    game.inventory = [potion];
    game.level.traps = [centerWeb, adjacentWeb];
    game.level.monsters = [goblin];
    markSquareVisible(7, 5);
    markSquareVisible(8, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.equal(game.level.traps.includes(centerWeb), false);
    assert.equal(game.level.traps.includes(adjacentWeb), false);
    assert.equal(goblin.mtrapped, 0);
    assert.equal((message.match(/A web bursts into flames!/g) || []).length, 1);
    assert.equal(message.indexOf('A web bursts into flames!') < message.indexOf('The goblin is caught in the burning oil!'), true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(100)',
    ]);
});

test('hero-thrown lit oil explosion clears hero web trap state', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    game.u.utrap = 4;
    game.u.utraptype = TT_WEB;
    const potion = oilPotion(880756, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const web = { ttyp: WEB, tx: 5, ty: 5, tseen: true };
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.traps = [web];
    game.level.monsters = [goblin];
    markSquareVisible(5, 5);
    markSquareVisible(6, 5);

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.equal(game.level.traps.includes(web), false);
    assert.equal(game.u.utrap, 0);
    assert.equal(game.u.utraptype, null);
    assert.match(game._pending_message || '', /A web bursts into flames!/);
    assert.match(game._pending_message || '', /You are caught in the burning oil!/);
});

test('hero-thrown lit oil explosion silently burns unseen webs', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    game.u.blind = true;
    const potion = oilPotion(880757, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const web = { ttyp: WEB, tx: 7, ty: 5, tseen: true };
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.traps = [web];
    game.level.monsters = [goblin];

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.equal(game.level.traps.includes(web), false);
    assert.doesNotMatch(game._pending_message || '', /A web bursts into flames!/);
    assert.match(game._pending_message || '', /You hear a blast\./);
});

test('hero-thrown lit oil explosion bills burned shop-floor objects', async () => {
    const { shkp } = installCommandShopState();
    initRng(8);
    game.u.acurr.a[A_DEX] = 25;
    shkp.mx = 1;
    shkp.my = 1;
    shkp.shk = { x: 1, y: 1 };
    const potion = oilPotion(88076, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const book = floorHealingSpellbook(880761);
    Object.assign(book, { ox: 7, oy: 5 });
    const expectedPrice = shop.shopItemPrice(book, 7, 5);
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.objects = [book];
    game.level.monsters = [shkp, goblin];
    markSquareVisible(7, 5);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.equal(game.level.objects.includes(book), false);
    assertUsedUpBillForObject(shkp, book, expectedPrice);
    assert.equal(shkp.debit || 0, 0);
    assert.equal(shkp.robbed || 0, 0);
    assert.match(game._pending_message || '', /You see a puff of smoke\./);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(4,4)', 'rn2(3)', 'rn2(100)',
    ]);
});

test('hero-thrown diluted lit oil uses the smaller burning-oil damage dice', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(88072, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    potion.odiluted = true;
    const elemental = ordinaryThrowTarget('fire elemental', 7, 5, {
        mhp: 30,
        mhpmax: 30,
        fireResistance: true,
        data: { name: 'fire elemental', mlevel: 8, resistsFire: true },
    });
    game.inventory = [potion];
    game.level.monsters = [elemental];
    markSquareVisible(elemental.mx, elemental.my);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The fire elemental is caught in the burning oil!/);
    assert.doesNotMatch(game._pending_message, /evaporates|resists the burning oil|misses/);
    assert.equal(elemental.mhp, 29);
    assert.equal(elemental.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(3,4)',
    ]);
});

test('adjacent hero-thrown lit oil catches the hero in the burning-oil blast', async () => {
    installNonShopFloorState();
    initRng(3);
    game.u.acurr.a[A_DEX] = 25;
    game.u.uhp = 50;
    game.u.uhpmax = 50;
    const potion = oilPotion(88073, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    markSquareVisible(goblin.mx, goblin.my);

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The goblin is caught in the burning oil!/);
    assert.match(game._pending_message, /You are caught in the burning oil!/);
    assert.doesNotMatch(game._pending_message, /evaporates|peculiar odor/);
    assert.equal(game.u.uhp < 50, true);
    assert.equal(game.inventory.includes(potion), false);
});

test('adjacent hero-thrown lit oil burns away hero slime before inventory fire', async () => {
    installNonShopFloorState();
    initRng(3);
    game.u.acurr.a[A_DEX] = 25;
    game.u.uhp = 50;
    game.u.uhpmax = 50;
    game.u._slimingTimeout = 10;
    game.u.sliming = true;
    game.u._statusSuffix = ' Slime';
    const potion = oilPotion(880735, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mhp: 30, mhpmax: 30 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    markSquareVisible(goblin.mx, goblin.my);

    await rhack('t');
    await rhack('p');
    await rhack('l');

    const message = game._pending_message || '';
    assert.match(message, /You are caught in the burning oil!/);
    assert.match(message, /The slime that covers you is burned away!/);
    assert.equal(message.indexOf('You are caught in the burning oil!') < message.indexOf('The slime that covers you is burned away!'), true);
    assert.equal(game.u._slimingTimeout, 0);
    assert.equal(game.u.sliming, false);
    assert.doesNotMatch(game.u._statusSuffix || '', /Slime/);
    assert.equal(game.u.uhp < 50, true);
});

test('hero-thrown lit oil does not explode when it hits a worn saddle', async () => {
    installNonShopFloorState();
    initRng(5);
    game.u.acurr.a[A_DEX] = 25;
    const potion = oilPotion(88074, 'p');
    potion.dknown = true;
    potion.lamplit = true;
    potion.burning = true;
    const saddle = wornSaddle(880741, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    markSquareVisible(pony.mx, pony.my);
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle gets wet\./);
    assert.doesNotMatch(game._pending_message, /Boom|burning oil|evaporates|misses/);
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rn2(5)',
    ]);
});

test('hero-thrown neutral water potion uses direct potionhit on ordinary monsters', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8812, 'w');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of water evaporates\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|writhes|shrieks|rusts|looks healthier/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown blessed water potion damages blessing-hating monsters', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8813, 'w', { blessed: true, bknown: true });
    potion.dknown = true;
    const demon = ordinaryThrowTarget('water demon', 7, 5, {
        mhp: 20,
        mhpmax: 20,
        data: { name: 'water demon', mlevel: 8, mlet: '&', demon: true },
    });
    game.inventory = [potion];
    game.level.monsters = [demon];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(demon.mx, demon.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:holy )?water evaporates\./);
    assert.match(game._pending_message, /The water demon shrieks in pain!/);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|looks healthier|rusts/);
    assert.equal(demon.mhp < 19, true);
    assert.equal(demon.mhp >= 7, true);
    assert.equal(demon.msleeping, 0);
    assert.equal(demon.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(2,6)',
    ]);
});

test('hero-thrown cursed water potion heals blessing-hating monsters without angering them', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8814, 'w', { cursed: true, bknown: true });
    potion.dknown = true;
    const demon = ordinaryThrowTarget('water demon', 7, 5, {
        mhp: 4,
        mhpmax: 12,
        data: { name: 'water demon', mlevel: 8, mlet: '&', demon: true },
    });
    game.inventory = [potion];
    game.level.monsters = [demon];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(demon.mx, demon.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:unholy )?water evaporates\./);
    assert.match(game._pending_message, /The water demon looks healthier\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|writhes|shrieks|rusts/);
    assert.equal(demon.mhp > 3, true);
    assert.equal(demon.mhp <= 12, true);
    assert.equal(demon.msleeping, 0);
    assert.equal(demon.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(2,6)',
    ]);
});

test('hero-thrown neutral water potion hits blessing-hating monsters without special effect', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8815, 'w');
    potion.dknown = true;
    const zombie = ordinaryThrowTarget('human zombie', 7, 5, {
        data: { name: 'human zombie', mlevel: 4, mlet: 'Z' },
    });
    game.inventory = [potion];
    game.level.monsters = [zombie];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(zombie.mx, zombie.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of water evaporates\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|writhes|shrieks|looks healthier|rusts/);
    assert.equal(zombie.mhp, 4);
    assert.equal(zombie.msleeping, 0);
    assert.equal(zombie.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown blessed water potion reverts a were-beast after damage', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8816, 'w', { blessed: true, bknown: true });
    potion.dknown = true;
    const werewolf = ordinaryThrowTarget('werewolf', 7, 5, {
        mhp: 20,
        mhpmax: 24,
        data: { name: 'werewolf', mlevel: 5, mlet: 'd', were: true, wereBeast: true, animal: true, nohands: true },
        mlet: 'd',
        were: true,
        wereBeast: true,
    });
    game.inventory = [potion];
    game.level.monsters = [werewolf];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(werewolf.mx, werewolf.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:holy )?water evaporates\./);
    assert.match(game._pending_message, /The werewolf shrieks in pain!/);
    assert.match(game._pending_message, /The werewolf changes into a human\./);
    assert.doesNotMatch(game._pending_message, /misses|looks healthier|rusts/);
    assert.equal(werewolf.data.wereHuman, true);
    assert.equal(werewolf.data.wereBeast, undefined);
    assert.equal(werewolf.mlet, '@');
    assert.equal(werewolf.msleeping, 0);
    assert.equal(werewolf.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(2,6)',
    ]);
});

test('hero-thrown cursed water potion transforms human werecreatures without angering them', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(88161, 'w', { cursed: true, bknown: true });
    potion.dknown = true;
    const werewolf = ordinaryThrowTarget('werewolf', 7, 5, {
        mhp: 4,
        mhpmax: 20,
        data: { name: 'werewolf', mlevel: 5, mlet: '@', were: true, wereHuman: true, human: true },
        mlet: '@',
        were: true,
        wereHuman: true,
    });
    game.inventory = [potion];
    game.level.monsters = [werewolf];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(werewolf.mx, werewolf.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:unholy )?water evaporates\./);
    assert.match(game._pending_message, /The werewolf looks healthier\./);
    assert.match(game._pending_message, /The werewolf changes into a wolf\./);
    assert.doesNotMatch(game._pending_message, /misses|writhes|shrieks|rusts/);
    assert.equal(werewolf.data.wereBeast, true);
    assert.equal(werewolf.data.wereHuman, undefined);
    assert.equal(werewolf.mlet, 'd');
    assert.equal(werewolf.mhp > 4, true);
    assert.equal(werewolf.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(2,6)',
    ]);
});

test('hero-thrown cursed water potion heals vampire shifters without shape change', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(88162, 'w', { cursed: true, bknown: true });
    potion.dknown = true;
    const bat = ordinaryThrowTarget('vampire bat', 7, 5, {
        mhp: 3,
        mhpmax: 12,
        data: { name: 'vampire bat', mlevel: 5, mlet: 'B', vampshifter: true },
        mlet: 'B',
        chamName: 'vampire',
        vampshifter: true,
    });
    game.inventory = [potion];
    game.level.monsters = [bat];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(bat.mx, bat.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:unholy )?water evaporates\./);
    assert.match(game._pending_message, /The vampire bat looks healthier\./);
    assert.doesNotMatch(game._pending_message, /misses|writhes|shrieks|changes into|rusts/);
    assert.equal(bat.data.name, 'vampire bat');
    assert.equal(bat.mhp > 3, true);
    assert.equal(bat.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(2,6)',
    ]);
});

test('hero-thrown blessed water revives lethal vampire shifter hits in base form', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(88163, 'w', { blessed: true, bknown: true });
    potion.dknown = true;
    const bat = ordinaryThrowTarget('vampire bat', 7, 5, {
        mhp: 1,
        mhpmax: 8,
        data: { name: 'vampire bat', mlevel: 5, mlet: 'B', vampshifter: true },
        mlet: 'B',
        chamName: 'vampire',
        vampshifter: true,
    });
    game.inventory = [potion];
    game.level.monsters = [bat];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(bat.mx, bat.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:holy )?water evaporates\./);
    assert.match(game._pending_message, /The vampire bat shrieks in pain!/);
    assert.match(game._pending_message, /You kill the vampire bat!/);
    assert.match(game._pending_message, /The seemingly dead vampire bat suddenly transforms and rises as a vampire!/);
    assert.equal(game.level.monsters.includes(bat), true);
    assert.equal(bat.dead, false);
    assert.equal(bat.data.name, 'vampire');
    assert.equal(bat.mlet, 'V');
    assert.equal(bat.mhp, bat.mhpmax);
    assert.equal(bat.mhp >= 10, true);
    assert.equal(bat.vampshifter, false);
    assert.equal(bat.chamName, undefined);
    assert.equal(bat.msleeping, 0);
    assert.equal(bat.mpeaceful, false);
    assert.equal(game._vanquished_counts?.['vampire bat'], undefined);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'd(2,6)', 'd(9,8)',
    ]);
});

test('hero-thrown blessed water potion can uncurse a worn saddle', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8817, 'w', { blessed: true, bknown: true });
    potion.dknown = true;
    const saddle = wornSaddle(88171, { cursed: true, blessed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle glows amber\./);
    assert.doesNotMatch(game._pending_message, /evaporates|peculiar odor|misses|shrieks|looks healthier|rusts|gets wet/);
    assert.equal(saddle.cursed, false);
    assert.equal(saddle.blessed, false);
    assert.equal(saddle.bknown, true);
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rnl(10)', 'rnl(10)', 'rn2(5)',
    ]);
});

test('hero-thrown cursed water potion can curse a worn saddle', async () => {
    installNonShopFloorState();
    initRng(1);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8818, 'w', { cursed: true, bknown: true });
    potion.dknown = true;
    const saddle = wornSaddle(88181, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle glows with a black aura\./);
    assert.doesNotMatch(game._pending_message, /evaporates|peculiar odor|misses|writhes|shrieks|looks healthier|rusts|gets wet/);
    assert.equal(saddle.cursed, true);
    assert.equal(saddle.blessed, false);
    assert.equal(saddle.bknown, true);
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rnl(10)', 'rn2(5)',
    ]);
});

test('hero-thrown neutral water potion wets an unaffected worn saddle', async () => {
    installNonShopFloorState();
    initRng(5);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8821, 'w');
    potion.dknown = true;
    const saddle = wornSaddle(88211, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle gets wet\./);
    assert.doesNotMatch(game._pending_message, /evaporates|peculiar odor|misses|glows|writhes|shrieks|looks healthier|rusts/);
    assert.equal(saddle.cursed, false);
    assert.equal(saddle.blessed, false);
    assert.equal(saddle.bknown, true);
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rn2(5)',
    ]);
});

test('non-visible water potion saddle hit mutates saddle without visible feedback', async () => {
    const cases = [
        {
            name: 'blind',
            prepare(pony) {
                markSquareVisible(pony.mx, pony.my);
                game.u.blind = true;
            },
        },
        {
            name: 'out-of-sight',
            prepare() {
                game.viz_array = [];
            },
        },
    ];

    for (const { name, prepare } of cases) {
        installNonShopFloorState();
        initRng(2);
        game.u.acurr.a[A_DEX] = 25;
        const potion = waterPotion(88212, 'w', { blessed: true, bknown: false });
        const saddle = wornSaddle(88213, { cursed: true, blessed: false, bknown: true });
        const pony = ordinaryThrowTarget('pony', 7, 5, {
            saddled: true,
            misc_worn_check: W_SADDLE,
            minvent: [saddle],
        });
        game.inventory = [potion];
        game.level.monsters = [pony];
        enableRngLog({ reset: true });

        await rhack('t');
        await rhack('w');
        prepare(pony);
        await rhack('l');

        const message = game._pending_message || '';
        assert.match(message, /^Crash!$/, name);
        assert.doesNotMatch(message, /crashes on|saddle glows|saddle gets wet|evaporates|head|peculiar odor/, name);
        assert.equal(saddle.cursed, false, name);
        assert.equal(saddle.blessed, false, name);
        assert.equal(saddle.bknown, false, name);
        assert.equal(pony.mhp, 5, name);
        assert.equal(pony.msleeping, 1, name);
        assert.equal(pony.mpeaceful, true, name);
        assert.equal(game.inventory.includes(potion), false, name);
        assert.equal(game.level.objects.length, 0, name);
        assert.equal(game._command_mode, null, name);
        assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
            'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rnl(10)', 'rnl(10)', 'rn2(5)',
        ], name);
    }
});

test('see-invisible hero gets saddle feedback for invisible monster hit', async () => {
    installNonShopFloorState();
    initRng(5);
    game.u.acurr.a[A_DEX] = 25;
    game.u.seeInvisible = true;
    const potion = waterPotion(88214, 'w');
    potion.dknown = true;
    const saddle = wornSaddle(88215, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        minvis: 1,
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle gets wet\./);
    assert.doesNotMatch(game._pending_message, /evaporates|peculiar odor|head/);
    assert.equal(saddle.cursed, false);
    assert.equal(saddle.blessed, false);
    assert.equal(saddle.bknown, true);
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rn2(5)',
    ]);
});

test('hero-thrown water potion can miss the saddle and hit the monster', async () => {
    installNonShopFloorState();
    initRng(1);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8822, 'w', { blessed: true, bknown: true });
    potion.dknown = true;
    const saddle = wornSaddle(88221, { cursed: true, blessed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of (?:holy )?water evaporates\./);
    assert.doesNotMatch(game._pending_message, /saddle glows|saddle gets wet|peculiar odor|misses|writhes|shrieks|looks healthier|rusts/);
    assert.equal(saddle.cursed, true);
    assert.equal(saddle.blessed, false);
    assert.equal(pony.mhp, 4);
    assert.equal(pony.msleeping, 0);
    assert.equal(pony.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rnl(10)', 'rnl(10)', 'rn2(3)', 'rn2(5)',
    ]);
});

test('hero-thrown blessed water potion splits an unsaddled gremlin without angering it', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8819, 'w', { blessed: true, bknown: true });
    potion.dknown = true;
    const gremlin = ordinaryThrowTarget('gremlin', 7, 5, { mhp: 8, mhpmax: 10 });
    game.inventory = [potion];
    game.level.monsters = [gremlin];

    await rhack('t');
    await rhack('w');
    markSquareVisible(gremlin.mx, gremlin.my);
    await rhack('l');

    const clone = game.level.monsters.find(mon => mon !== gremlin && mon.data?.name === 'gremlin');
    assert.match(game._pending_message, /The potion of (?:holy )?water evaporates\./);
    assert.match(game._pending_message, /The gremlin multiplies!/);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|rusts|writhes|shrieks/);
    assert.ok(clone);
    assert.equal(game.level.monsters.includes(gremlin), true);
    assert.equal(game.level.monsters.length, 2);
    assert.equal(gremlin.mhp + clone.mhp, 7);
    assert.equal(gremlin.mhpmax + clone.mhpmax, 10);
    assert.equal(clone.mcloned, 1);
    assert.deepEqual(clone.minvent, []);
    assert.equal(gremlin.msleeping, 0);
    assert.equal(gremlin.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
});

test('hero-thrown cursed water potion rusts an unsaddled iron golem', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8820, 'w', { cursed: true, bknown: true });
    potion.dknown = true;
    const golem = ordinaryThrowTarget('iron golem', 7, 5, {
        mhp: 12,
        mhpmax: 12,
        data: { name: 'iron golem', mlevel: 18, nonliving: true },
    });
    game.inventory = [potion];
    game.level.monsters = [golem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    markSquareVisible(golem.mx, golem.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of (?:unholy )?water evaporates\./);
    assert.match(game._pending_message, /The iron golem rusts\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|looks healthier/);
    assert.equal(golem.mhp < 11, true);
    assert.equal(golem.mhp >= 5, true);
    assert.equal(golem.msleeping, 0);
    assert.equal(golem.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'd(1,6)',
    ]);
});

test('hero-thrown water potion can destroy an unsaddled iron golem', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = waterPotion(8821, 'w');
    potion.dknown = true;
    const golem = ordinaryThrowTarget('iron golem', 7, 5, {
        mhp: 1,
        mhpmax: 1,
        data: { name: 'iron golem', mlevel: 18, nonliving: true },
    });
    game.inventory = [potion];
    game.level.monsters = [golem];

    await rhack('t');
    await rhack('w');
    markSquareVisible(golem.mx, golem.my);
    await rhack('l');

    assert.match(game._pending_message, /The iron golem rusts\./);
    assert.match(game._pending_message, /You destroy the iron golem!/);
    assert.equal(game.level.monsters.includes(golem), false);
    assert.equal(game._vanquished_counts?.['iron golem'], 1);
    assert.equal(game.inventory.includes(potion), false);
});

test('hero-thrown sickness potion makes ordinary monsters ill and angry', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sicknessPotion(8808, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of sickness evaporates\./);
    assert.match(game._pending_message, /The goblin looks rather ill\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|looks unharmed/);
    assert.equal(goblin.mhp, 2);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown sickness potion leaves resistant monsters unharmed but angry', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sicknessPotion(8809, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        data: { name: 'goblin', mlevel: 1, poisonResistance: true },
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of sickness evaporates\./);
    assert.match(game._pending_message, /The goblin looks unharmed\./);
    assert.doesNotMatch(game._pending_message, /looks rather ill|peculiar odor/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown sickness potion heals Pestilence without angering it', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sicknessPotion(8810, 's', 1, { dknown: true });
    const pestilence = ordinaryThrowTarget('Pestilence', 7, 5, {
        mhp: 3,
        mhpmax: 12,
        mblinded: 7,
        data: { name: 'Pestilence', mlevel: 30 },
    });
    game.inventory = [potion];
    game.level.monsters = [pestilence];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    markSquareVisible(pestilence.mx, pestilence.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of sickness evaporates\./);
    assert.match(game._pending_message, /The Pestilence looks sound and hale again\./);
    assert.doesNotMatch(game._pending_message, /looks rather ill|can see again|peculiar odor/);
    assert.equal(pestilence.mhp, 12);
    assert.equal(pestilence.mblinded, 7);
    assert.equal(pestilence.msleeping, 0);
    assert.equal(pestilence.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown sickness potion effect can come from potion index', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 8811,
        cls: 'potion',
        glyph: '!',
        kind: 'emerald potion',
        potionIndex: 21,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 's',
        line: 's - an emerald potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The emerald potion evaporates\./);
    assert.match(game._pending_message, /The goblin looks rather ill\./);
    assert.doesNotMatch(game._pending_message, /potion of sickness|peculiar odor/);
    assert.equal(goblin.mhp, 2);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown acid potion damages ordinary monsters and wakes nearby sleepers', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = acidPotion(8814, 'a');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 12, mhpmax: 12 });
    const sleeper = ordinaryThrowTarget('jackal', 8, 5, { msleeping: 1 });
    game.inventory = [potion];
    game.level.monsters = [goblin, sleeper];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of acid evaporates\./);
    assert.match(game._pending_message, /The goblin shrieks in pain!/);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|looks unharmed/);
    assert.equal(goblin.mhp < 11, true);
    assert.equal(goblin.mhp >= 3, true);
    assert.equal(goblin.msleeping, 0);
    assert.equal(sleeper.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)', 'd(1,8)',
    ]);
});

test('hero-thrown acid potion respects monster acid resistance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = acidPotion(8815, 'a');
    potion.dknown = true;
    const blob = ordinaryThrowTarget('acid blob', 7, 5, {
        data: { name: 'acid blob', mlevel: 1, acidResistance: true, silent: true },
    });
    game.inventory = [potion];
    game.level.monsters = [blob];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    markSquareVisible(blob.mx, blob.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of acid evaporates\./);
    assert.doesNotMatch(game._pending_message, /shrieks|writhes|in pain|peculiar odor/);
    assert.equal(blob.mhp, 4);
    assert.equal(blob.msleeping, 0);
    assert.equal(blob.mpeaceful, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown acid potion can be blocked by potion resistance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = acidPotion(8816, 'a');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mr: 100 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('a');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of acid evaporates\./);
    assert.doesNotMatch(game._pending_message, /shrieks|writhes|in pain|peculiar odor/);
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)',
    ]);
});

test('hero-thrown polymorph potion polymorphs an ordinary monster', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = polymorphPotion(8823, 'p');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 10, mhpmax: 10 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.match(game._pending_message, /The goblin turns into an? .*!/);
    assert.doesNotMatch(game._pending_message, /misses|shatters|peculiar odor|shudders/);
    assert.notEqual(goblin.data.name, 'goblin');
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 6), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)', 'rn2(25)',
    ]);
});

test('hero-thrown polymorph potion is blocked by magic resistance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = polymorphPotion(8824, 'p');
    potion.dknown = true;
    const dragon = ordinaryThrowTarget('gray dragon', 7, 5, {
        mhp: 30,
        mhpmax: 30,
        magicResistance: true,
        data: { name: 'gray dragon', mlevel: 15, resistsMagic: true },
    });
    game.inventory = [potion];
    game.level.monsters = [dragon];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(dragon.mx, dragon.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.doesNotMatch(game._pending_message, /turns into|shudders|peculiar odor|misses/);
    assert.equal(dragon.data.name, 'gray dragon');
    assert.equal(dragon.mhp, 29);
    assert.equal(dragon.msleeping, 0);
    assert.equal(dragon.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown polymorph potion can be resisted by potion-class resistance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = polymorphPotion(8825, 'p');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mr: 100 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.doesNotMatch(game._pending_message, /turns into|shudders|peculiar odor|misses/);
    assert.equal(goblin.data.name, 'goblin');
    assert.equal(goblin.mhp, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)',
    ]);
});

test('hero-thrown polymorph potion system shock kills an ordinary monster', async () => {
    installNonShopFloorState();
    initRng(30);
    game.u.acurr.a[A_DEX] = 25;
    const potion = polymorphPotion(8826, 'p');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 10, mhpmax: 10 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of polymorph evaporates\./);
    assert.match(game._pending_message, /The goblin shudders!/);
    assert.match(game._pending_message, /You kill the goblin!/);
    assert.equal(game.level.monsters.includes(goblin), false);
    assert.equal(game._vanquished_counts?.goblin, 1);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')).slice(0, 6), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(105)', 'rn2(25)',
    ]);
});

test('hero-thrown polymorph potion hitting a saddle wets it and skips polymorph', async () => {
    installNonShopFloorState();
    initRng(5);
    game.u.acurr.a[A_DEX] = 25;
    const potion = polymorphPotion(8827, 'p');
    potion.dknown = true;
    const saddle = wornSaddle(88271, { blessed: false, cursed: false, bknown: true });
    const pony = ordinaryThrowTarget('pony', 7, 5, {
        saddled: true,
        misc_worn_check: W_SADDLE,
        minvent: [saddle],
    });
    game.inventory = [potion];
    game.level.monsters = [pony];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(pony.mx, pony.my);
    await rhack('l');

    assert.match(game._pending_message, /crashes on the pony's saddle and breaks into shards\./);
    assert.match(game._pending_message, /The pony's saddle gets wet\./);
    assert.doesNotMatch(game._pending_message, /evaporates|turns into|shudders|misses|peculiar odor/);
    assert.equal(pony.data.name, 'pony');
    assert.equal(pony.mhp, 5);
    assert.equal(pony.msleeping, 1);
    assert.equal(pony.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(10)', 'rn2(5)',
    ]);
});

test('hero-thrown acid potion can kill and remove the target monster', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = acidPotion(8817, 'a');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mhp: 2, mhpmax: 2 });
    game.inventory = [potion];
    game.level.monsters = [goblin];

    await rhack('t');
    await rhack('a');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The goblin shrieks in pain!/);
    assert.match(game._pending_message, /You kill the goblin!/);
    assert.equal(game.level.monsters.includes(goblin), false);
    assert.equal(game._vanquished_counts?.goblin, 1);
    assert.equal(game.inventory.includes(potion), false);
});

test('hero-thrown unpaid acid potion from a stack charges the thrown unit only', async () => {
    const { shkp } = installCommandShopState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const stack = acidPotion(8818, 'a', 2);
    stack.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 5, 7, { mhp: 12, mhpmax: 12 });
    game.inventory = [stack];
    game.level.monsters.push(goblin);
    shop.addObjectToShopBill(shkp, stack, 100);

    await rhack('t');
    await rhack('a');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('j');

    assert.match(game._pending_message, /The potion of acid evaporates\./);
    assert.match(game._pending_message, /The goblin shrieks in pain!/);
    assert.equal(stack.quan, 1);
    assert.equal(game.inventory.includes(stack), true);
    const parentEntry = shop.shopBillEntryForObject(shkp, stack);
    assert.equal(parentEntry.bquan, 1);
    assert.equal(shop.shopBillEntryTotal(parentEntry), 50);
    assert.equal(stack.unpaidPrice, 50);
    assert.equal(shkp.debit, 50);
    assert.equal(shkp.billct, 1);
});

test('hero-thrown healing potion heals visible monster without angering it', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = healingPotion(8800, 'h');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mhp: 2,
        mhpmax: 10,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of healing evaporates\./);
    assert.match(game._pending_message, /The goblin looks sound and hale again\./);
    assert.doesNotMatch(game._pending_message, /peculiar odor|You feel better|can see again/);
    assert.equal(goblin.mhp, 10);
    assert.equal(goblin.mhpmax, 10);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown blessed healing potion cures monster blindness', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(5);
    game.u.acurr.a[A_DEX] = 25;
    const potion = healingPotion(8801, 'h');
    potion.blessed = true;
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcansee: false,
        mblinded: 7,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of healing evaporates\./);
    assert.match(game._pending_message, /The goblin can see again\./);
    assert.doesNotMatch(game._pending_message, /looks sound and hale/);
    assert.equal(goblin.mcansee, true);
    assert.equal(goblin.mblinded, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown uncursed healing potion does not cure monster blindness', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = healingPotion(8802, 'h');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcansee: false,
        mblinded: 7,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    await rhack('l');

    assert.match(game._pending_message, /The potion of healing evaporates\./);
    assert.doesNotMatch(game._pending_message, /can see again/);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 7);
    assert.equal(goblin.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown cursed extra healing potion heals but does not cure blindness', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = extraHealingPotion(8803, 'e');
    potion.cursed = true;
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mhp: 2,
        mhpmax: 10,
        mcansee: false,
        mblinded: 7,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('e');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of extra healing evaporates\./);
    assert.match(game._pending_message, /The goblin looks sound and hale again\./);
    assert.doesNotMatch(game._pending_message, /can see again/);
    assert.equal(goblin.mhp, 10);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 7);
    assert.equal(goblin.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown cursed full healing potion still cures monster blindness', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = fullHealingPotion(8804, 'f');
    potion.cursed = true;
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcansee: false,
        mblinded: 7,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('f');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of full healing evaporates\./);
    assert.match(game._pending_message, /The goblin can see again\./);
    assert.equal(goblin.mcansee, true);
    assert.equal(goblin.mblinded, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown restore ability potion heals but does not cure monster blindness', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = namedPotion(8805, 'restore ability', 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mhp: 2,
        mhpmax: 10,
        mcansee: false,
        mblinded: 7,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of restore ability evaporates\./);
    assert.match(game._pending_message, /The goblin looks sound and hale again\./);
    assert.doesNotMatch(game._pending_message, /can see again/);
    assert.equal(goblin.mhp, 10);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 7);
    assert.equal(goblin.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown healing potion makes Pestilence ill and angry', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = healingPotion(8806, 'h');
    potion.dknown = true;
    const pestilence = ordinaryThrowTarget('Pestilence', 7, 5, {
        mhp: 21,
        mhpmax: 40,
        mcansee: false,
        mblinded: 7,
        data: { name: 'Pestilence', mlevel: 30 },
    });
    game.inventory = [potion];
    game.level.monsters = [pestilence];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('h');
    markSquareVisible(pestilence.mx, pestilence.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of healing evaporates\./);
    assert.match(game._pending_message, /The Pestilence looks rather ill\./);
    assert.doesNotMatch(game._pending_message, /looks sound and hale|can see again/);
    assert.equal(pestilence.mhp, 10);
    assert.equal(pestilence.mcansee, false);
    assert.equal(pestilence.mblinded, 7);
    assert.equal(pestilence.msleeping, 0);
    assert.equal(pestilence.mpeaceful, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('adjacent hero-thrown full healing potion applies monster healing before vapor', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(4);
    game.u.acurr.a[A_DEX] = 25;
    game.u.uhp = 6;
    game.u.uhpmax = 10;
    const potion = fullHealingPotion(8807, 'f');
    potion.dknown = true;
    const goblin = ordinaryThrowTarget('goblin', 6, 5, {
        mhp: 2,
        mhpmax: 10,
        mcansee: false,
        mblinded: 7,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('f');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    const message = game._pending_message;
    assert.match(message, /The goblin looks sound and hale again\./);
    assert.match(message, /The goblin can see again\./);
    assert.ok(message.indexOf('The goblin looks sound and hale again.') < message.indexOf('The goblin can see again.'));
    assert.doesNotMatch(message, /You feel better|You can see again/);
    assert.equal(goblin.mhp, 10);
    assert.equal(goblin.mcansee, true);
    assert.equal(game.u.uhp, 9);
    assert.equal(goblin.mpeaceful, true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(13)', 'rn2(19)',
    ]);
});

test('hero-thrown paralysis potion paralyzes visible monster without resistance roll', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = paralysisPotion(8762, 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        meating: 4,
        waiting: true,
        mstrategy: 'waitforu',
        mr: 100,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of paralysis evaporates\./);
    assert.doesNotMatch(game._pending_message, /misses|peculiar odor|seems to be holding/);
    assert.equal(goblin.mcanmove, false);
    assert.ok(goblin.mfrozen >= 1 && goblin.mfrozen <= 25);
    assert.equal(goblin.meating, 0);
    assert.equal(goblin.waiting, false);
    assert.equal(goblin.mstrategy, 0);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(25)',
    ]);
});

test('adjacent hero-thrown paralysis potion applies monster paralysis before direct vapor', async () => {
    installNonShopFloorState();
    initRng(3);
    game.u.acurr.a[A_DEX] = 25;
    const potion = paralysisPotion(8763, 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The potion of paralysis evaporates\./);
    assert.match(game._pending_message, /Something seems to be holding you\./);
    assert.doesNotMatch(game._pending_message, /peculiar odor/);
    assert.equal(goblin.mcanmove, false);
    assert.ok(goblin.mfrozen >= 1 && goblin.mfrozen <= 25);
    assert.ok((game._helpless_time || 0) > 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(25)', 'rn2(13)', 'rnd(5)', 'rn2(2)',
    ]);
});

test('hero-thrown paralysis potion does not extend an already immobile monster', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = paralysisPotion(8764, 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcanmove: false,
        mfrozen: 7,
        meating: 4,
        waiting: true,
        mstrategy: 'waitforu',
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.equal(goblin.mcanmove, false);
    assert.equal(goblin.mfrozen, 7);
    assert.equal(goblin.meating, 4);
    assert.equal(goblin.waiting, true);
    assert.equal(goblin.mstrategy, 'waitforu');
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown paralysis potion treats numeric zero mcanmove as immobile', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = paralysisPotion(8765, 'p', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcanmove: 0,
        mfrozen: 6,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.equal(goblin.mcanmove, 0);
    assert.equal(goblin.mfrozen, 6);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown paralysis potion effect can come from potion index', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 8766,
        cls: 'potion',
        glyph: '!',
        kind: 'pink potion',
        potionIndex: 4,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'p',
        line: 'p - a pink potion',
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.equal(goblin.mcanmove, false);
    assert.ok(goblin.mfrozen >= 1 && goblin.mfrozen <= 25);
    assert.equal(game.inventory.includes(potion), false);
});

test('hero-thrown paralysis potion effect can come from concrete otyp', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 87661,
        cls: 'potion',
        glyph: '!',
        otyp: POT_PARALYSIS,
        kind: 'emerald potion',
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'p',
        line: 'p - an emerald potion',
        dknown: true,
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('p');
    await rhack('l');

    assert.match(game._pending_message, /The emerald potion evaporates\./);
    assert.doesNotMatch(game._pending_message, /potion of paralysis|peculiar odor|misses|shatters/);
    assert.equal(goblin.mcanmove, false);
    assert.ok(goblin.mfrozen >= 1 && goblin.mfrozen <= 25);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(25)',
    ]);
});

test('hero-thrown sleeping potion puts visible monster into timed sleep', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sleepingPotion(8767, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcanmove: true,
        meating: 4,
        waiting: true,
        mstrategy: 'waitforu',
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of sleeping evaporates\./);
    assert.match(game._pending_message, /The goblin falls asleep\./);
    assert.doesNotMatch(game._pending_message, /misses|peculiar odor|rather tired/);
    assert.equal(goblin.mcanmove, false);
    assert.ok(goblin.mfrozen >= 1 && goblin.mfrozen <= 12);
    assert.equal(goblin.meating, 0);
    assert.equal(goblin.waiting, true);
    assert.equal(goblin.mstrategy, 'waitforu');
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(goblin.mhp, 4);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(12)', 'rn2(105)',
    ]);
});

test('hero-thrown sleeping potion respects monster sleep resistance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sleepingPotion(8768, 's', 1, { dknown: true });
    const golem = ordinaryThrowTarget('golem', 7, 5, {
        mcanmove: true,
        data: { name: 'golem', mlevel: 1, resistsSleep: true },
    });
    game.inventory = [potion];
    game.level.monsters = [golem];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('l');

    assert.match(game._pending_message, /The potion of sleeping evaporates\./);
    assert.doesNotMatch(game._pending_message, /falls asleep|rather tired/);
    assert.equal(golem.mcanmove, true);
    assert.equal(golem.mfrozen || 0, 0);
    assert.equal(golem.msleeping, 0);
    assert.equal(golem.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(12)',
    ]);
});

test('hero-thrown sleeping potion can be resisted by potion resistance', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sleepingPotion(8769, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcanmove: true,
        mr: 999,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('l');

    assert.match(game._pending_message, /The potion of sleeping evaporates\./);
    assert.doesNotMatch(game._pending_message, /falls asleep|rather tired/);
    assert.equal(goblin.mcanmove, true);
    assert.equal(goblin.mfrozen || 0, 0);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(12)', 'rn2(105)',
    ]);
});

test('hero-thrown sleeping potion does not extend an already immobile monster', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sleepingPotion(8771, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcanmove: false,
        mfrozen: 7,
        meating: 4,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('l');

    assert.match(game._pending_message, /The potion of sleeping evaporates\./);
    assert.doesNotMatch(game._pending_message, /falls asleep|rather tired/);
    assert.equal(goblin.mcanmove, false);
    assert.equal(goblin.mfrozen, 7);
    assert.equal(goblin.meating, 4);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(12)', 'rn2(105)',
    ]);
});

test('adjacent hero-thrown sleeping potion applies monster sleep before direct vapor', async () => {
    installNonShopFloorState();
    initRng(17);
    game.u.acurr.a[A_DEX] = 25;
    const potion = sleepingPotion(8770, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mcanmove: true });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('l');

    const message = game._pending_message;
    assert.match(game._pending_message, /The goblin falls asleep\./);
    assert.match(game._pending_message, /The potion of sleeping evaporates\./);
    assert.match(game._pending_message, /You feel rather tired\./);
    assert.doesNotMatch(game._pending_message, /peculiar odor/);
    assert.ok(message.indexOf('The goblin falls asleep.') < message.indexOf('You feel rather tired.'));
    assert.equal(goblin.mcanmove, false);
    assert.ok(goblin.mfrozen >= 1 && goblin.mfrozen <= 12);
    assert.ok((game._helpless_time || 0) > 0);
    assert.ok((game._sleeping_time || 0) > 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rnd(12)', 'rn2(105)', 'rn2(13)', 'rnd(5)', 'rn2(2)',
    ]);
});

test('hero-thrown blindness potion blinds visible monster through potionhit', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = blindnessPotion(8772, 'b', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mcansee: true });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('b');
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of blindness evaporates\./);
    assert.doesNotMatch(game._pending_message, /misses|shatters|suddenly gets dark/);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 102);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(goblin.mhp, 4);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(32)', 'rn2(32)', 'rn2(105)',
    ]);
});

test('hero-thrown blindness potion reduces bonus duration when resisted', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = blindnessPotion(8773, 'b', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcansee: true,
        mr: 999,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('b');
    await rhack('l');

    assert.match(game._pending_message, /The potion of blindness evaporates\./);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 79);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(32)', 'rn2(32)', 'rn2(105)',
    ]);
});

test('hero-thrown blindness potion does not affect eyeless monsters', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = blindnessPotion(8774, 'b', 1, { dknown: true });
    const jelly = ordinaryThrowTarget('jelly', 7, 5, {
        mcansee: true,
        data: { name: 'jelly', mlevel: 1, noeyes: true },
    });
    game.inventory = [potion];
    game.level.monsters = [jelly];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('b');
    await rhack('l');

    assert.match(game._pending_message, /The potion of blindness evaporates\./);
    assert.equal(jelly.mcansee, true);
    assert.equal(jelly.mblinded || 0, 0);
    assert.equal(jelly.msleeping, 0);
    assert.equal(jelly.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown blindness potion does not alter permanently blind monsters', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = blindnessPotion(8775, 'b', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        mcansee: false,
        mblinded: 0,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('b');
    await rhack('l');

    assert.match(game._pending_message, /The potion of blindness evaporates\./);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded || 0, 0);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('adjacent hero-thrown blindness potion applies monster blindness before direct vapor', async () => {
    installNonShopFloorState();
    initRng(3);
    game.u.acurr.a[A_DEX] = 25;
    const potion = blindnessPotion(8776, 'b', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { mcansee: true });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('b');
    await rhack('l');

    assert.match(game._pending_message, /The potion of blindness evaporates\./);
    assert.match(game._pending_message, /It suddenly gets dark\./);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 118);
    assert.equal(game.u.blind, true);
    assert.ok((game.u._blindTimeout || 0) > 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(32)', 'rn2(32)', 'rn2(105)', 'rn2(13)', 'rnd(5)',
    ]);
});

test('hero-thrown blindness potion effect can come from potion index', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = {
        id: 8777,
        cls: 'potion',
        glyph: '!',
        kind: 'white potion',
        potionIndex: 3,
        quan: 1,
        ox: 5,
        oy: 5,
        letter: 'w',
        line: 'w - a white potion',
    };
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { mcansee: true });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('w');
    await rhack('l');

    assert.match(game._pending_message, /The white potion evaporates\./);
    assert.equal(goblin.mcansee, false);
    assert.equal(goblin.mblinded, 102);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(32)', 'rn2(32)', 'rn2(105)',
    ]);
});

test('monster temporary blindness times out during moveloop turn processing', async () => {
    installNonShopFloorState();
    initRng(2);
    const goblin = ordinaryThrowTarget('goblin', 12, 5, {
        mcansee: false,
        mblinded: 1,
        msleeping: 0,
        mpeaceful: true,
    });
    game.level.monsters = [goblin];

    await rhack('s');
    game._pending_time_passed = (game._pending_time_passed || 0) + (game.context?.move || 0);
    if (game.context) game.context.move = 0;
    resetInputState();
    pushKey('\x1b');
    await moveloop_core();
    resetInputState();

    assert.equal(goblin.mblinded, 0);
    assert.equal(goblin.mcansee, true);
});

test('hero-thrown invisibility potion hides visible monster without angering it', async () => {
    installNonShopFloorState();
    const targetLoc = { roomno: 0, typ: ROOM };
    game.level.at = (x, y) => (x === 7 && y === 5 ? targetLoc : { roomno: 0, typ: ROOM });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    game.u.seeInvisible = false;
    const potion = invisibilityPotion(8790, 'i', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('i');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The (?:bottle|phial|flagon|carafe|flask|jar|vial) crashes on the goblin's head and breaks into shards\./);
    assert.match(game._pending_message, /The potion of invisibility evaporates\./);
    assert.doesNotMatch(game._pending_message, /briefly seems|appears|couldn't see yourself|suddenly disappears/);
    assert.equal(goblin.minvis, 1);
    assert.equal(goblin.perminvis, 1);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(goblin.mhp, 4);
    assert.equal(targetLoc.map_invisible, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game.level.objects.length, 0);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of invisibility') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('cursed hero-thrown invisibility potion briefly marks visible monster transparent', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = invisibilityPotion(8791, 'i', 1, { cursed: true, dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('i');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The goblin briefly seems to be transparent\./);
    assert.equal(goblin.minvis, 0);
    assert.equal(goblin.perminvis, 0);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('cursed hero-thrown invisibility potion reveals unseen invisible monster and angers it', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    game.u.seeInvisible = false;
    const potion = invisibilityPotion(8792, 'i', 1, { cursed: true, dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        minvis: 1,
        perminvis: 1,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('i');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The goblin appears!/);
    assert.equal(goblin.minvis, 0);
    assert.equal(goblin.perminvis, 0);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, false);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('invisibility-blocked monster only gains permanent invisibility from uncursed potionhit', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = invisibilityPotion(8793, 'i', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        invis_blkd: true,
        minvis: 0,
        perminvis: 0,
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('i');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of invisibility evaporates\./);
    assert.doesNotMatch(game._pending_message, /briefly seems|appears|couldn't see yourself/);
    assert.equal(goblin.minvis, 0);
    assert.equal(goblin.perminvis, 1);
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(game.inventory.includes(potion), false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('adjacent hero-thrown invisibility potion applies monster invisibility before vapor discovery', async () => {
    installNonShopFloorState();
    const targetLoc = { roomno: 0, typ: ROOM };
    game.level.at = (x, y) => (x === 6 && y === 5 ? targetLoc : { roomno: 0, typ: ROOM });
    initRng(4);
    game.u.acurr.a[A_DEX] = 25;
    game.u.seeInvisible = false;
    const potion = invisibilityPotion(8794, 'i', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5);
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('i');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    const message = game._pending_message;
    assert.match(message, /The potion of invisibility evaporates\./);
    assert.match(message, /For an instant you couldn't see yourself!/);
    assert.ok(message.indexOf('The potion of invisibility evaporates.') < message.indexOf("For an instant you couldn't see yourself!"));
    assert.equal(goblin.minvis, 1);
    assert.equal(goblin.perminvis, 1);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(game.u.invisible || false, false);
    assert.equal(targetLoc.map_invisible, true);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of invisibility'), true);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(13)',
    ]);
});

test('hero-thrown speed potion speeds visible monster without angering it', async () => {
    installNonShopFloorState();
    game.level.at = () => ({ roomno: 0, typ: ROOM, lit: true });
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = speedPotion(8778, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, { msleeping: 0 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    assert.match(game._pending_message, /The potion of speed evaporates\./);
    assert.match(game._pending_message, /The goblin is suddenly moving faster\./);
    assert.doesNotMatch(game._pending_message, /knees seem|peculiar odor/);
    assert.equal(goblin.mspeed, 'fast');
    assert.equal(goblin.permspeed, 'fast');
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(goblin.mhp, 4);
    assert.equal(game.inventory.includes(potion), false);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of speed') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('hero-thrown speed potion does not describe an already fast monster', async () => {
    installNonShopFloorState();
    initRng(2);
    game.u.acurr.a[A_DEX] = 25;
    const potion = speedPotion(8779, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 7, 5, {
        msleeping: 0,
        mspeed: 'fast',
        permspeed: 'fast',
    });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    await rhack('l');

    assert.match(game._pending_message, /The potion of speed evaporates\./);
    assert.doesNotMatch(game._pending_message, /suddenly moving faster|knees seem/);
    assert.equal(goblin.mspeed, 'fast');
    assert.equal(goblin.permspeed, 'fast');
    assert.equal(goblin.msleeping, 0);
    assert.equal(goblin.mpeaceful, true);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of speed') ?? false, false);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)',
    ]);
});

test('adjacent hero-thrown speed potion applies monster speed before direct vapor', async () => {
    installNonShopFloorState();
    initRng(4);
    game.u.acurr.a[A_DEX] = 25;
    const potion = speedPotion(8780, 's', 1, { dknown: true });
    const goblin = ordinaryThrowTarget('goblin', 6, 5, { msleeping: 0 });
    game.inventory = [potion];
    game.level.monsters = [goblin];
    enableRngLog({ reset: true });

    await rhack('t');
    await rhack('s');
    markSquareVisible(goblin.mx, goblin.my);
    await rhack('l');

    const message = game._pending_message;
    assert.match(message, /The goblin is suddenly moving faster\./);
    assert.match(message, /Your knees seem more flexible now\./);
    assert.ok(message.indexOf('The goblin is suddenly moving faster.') < message.indexOf('Your knees seem more flexible now.'));
    assert.equal(goblin.mspeed, 'fast');
    assert.equal(goblin.mpeaceful, true);
    assert.equal(game.u.veryfast, true);
    assert.ok((game.u._veryfastTimeout || 0) > 0);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), [
        'rnd(20)', 'rnd(25)', 'rn2(7)', 'rn2(5)', 'rn2(13)', 'rnd(5)', 'rn2(19)',
    ]);
});

test('known blindness vapor from broken potion discovers the potion', () => {
    installShopState();
    initRng(1);
    const potion = blindnessPotion(8750, 'b', 1, { dknown: true });

    const landing = shop.landProjectileObjectWithShopHandling(potion, 5, 6, { breakRoll: 50, silent: true });

    assert.equal(landing.topBreak.broke, true);
    assert.equal(game.u.blind, true);
    assert.ok(game.u._blindTimeout > 0);
    assert.match(landing.messages.join(' '), /It suddenly gets dark\./);
    assert.equal(game._discoveries?.some(entry => entry.section === 'Potions' && entry.name === 'potion of blindness'), true);
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

test('thrown gold falling through remote shaft ships before donation and stacking', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(1);
    enableRngLog({ reset: true });
    shkp.debit = 7;
    shkp.loan = 7;
    const floorGold = { ...goldPieces(8755, 4), letter: undefined, line: undefined, ox: 7, oy: 5 };
    const thrownGold = { ...goldPieces(8756, 10), letter: undefined, line: undefined, ox: 7, oy: 5 };
    game.level.objects = [floorGold];

    const landing = shop.landProjectileObjectWithShopHandling(thrownGold, 7, 5, { breakRoll: 0, silent: true });
    const text = landing.messages.join('  ');

    assert.equal(landing.shipObject.handled, true);
    assert.equal(landing.shopSale.handled, false);
    assert.equal(landing.object, null);
    assert.deepEqual(queuedImpactDropsFor().map(obj => obj.id), [thrownGold.id, floorGold.id]);
    assert.equal(game.level.objects.includes(thrownGold), false);
    assert.equal(game.level.objects.includes(floorGold), false);
    assert.equal(shkp.debit, 7);
    assert.equal(shkp.loan, 7);
    assert.equal(shkp.credit || 0, 0);
    assert.match(text, /gold pieces hit other objects and fall through the hole\./);
    assert.match(text, /From the impact, the other objects fall\./);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(100)', 'rn2(3)']);
});

test('thrown gold no-drop shaft impact precedes normal shop donation', () => {
    const { shkp } = installShopState();
    installSeenRemoteShaft(HOLE);
    initRng(2);
    enableRngLog({ reset: true });
    shkp.debit = 7;
    shkp.loan = 7;
    const floorGold = { ...goldPieces(8757, 4), letter: undefined, line: undefined, ox: 7, oy: 5 };
    const thrownGold = { ...goldPieces(8758, 10), letter: undefined, line: undefined, ox: 7, oy: 5 };
    game.level.objects = [floorGold];

    const landing = shop.landProjectileObjectWithShopHandling(thrownGold, 7, 5, { breakRoll: 0, silent: true });
    const text = landing.messages.join('  ');

    assert.equal(landing.shipObject.handled, false);
    assert.equal(landing.shipObject.noDrop, true);
    assert.equal(landing.shipObject.impact.objectCount, 4);
    assert.equal(landing.shipObject.impact.fallenCount, 4);
    assert.equal(landing.shopSale.handled, true);
    assert.equal(landing.shopSale.gold, true);
    assert.equal(queuedImpactDropsFor().includes(floorGold), true);
    assert.equal(queuedImpactDropsFor().includes(thrownGold), false);
    assert.equal(game.level.objects.includes(floorGold), false);
    assert.equal(landing.object, thrownGold);
    assert.equal(game.level.objects.includes(thrownGold), true);
    assert.equal(shkp.debit, 0);
    assert.equal(shkp.loan, 0);
    assert.equal(shkp.credit, 3);
    assert.match(text, /gold pieces hit other objects\./);
    assert.match(text, /From the impact, the other objects fall\./);
    assert.doesNotMatch(text, /through the hole/);
    assert.deepEqual(getRngLog().map(entry => entry.replace(/=.*/, '')), ['rn2(3)', 'rn2(3)']);
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

test('floor stacking follows C object-name compatibility', () => {
    installShopState();
    const namedFloorStack = { ...dagger(89101), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5, oname: 'alpha' };
    const differentlyNamedThrown = { ...dagger(89102), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5, oname: 'beta' };
    game.level.objects = [namedFloorStack];

    const rejected = shop.placeStackableFloorObject(differentlyNamedThrown);

    assert.equal(rejected, differentlyNamedThrown);
    assert.equal(game.level.objects.length, 2);
    assert.equal(namedFloorStack.quan, 1);

    const unnamedStack = { ...dagger(89103), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5 };
    const namedThrown = { ...dagger(89104), letter: undefined, line: undefined, quan: 1, ox: 7, oy: 5, oname: 'alpha' };
    game.level.objects = [unnamedStack];

    const merged = shop.placeStackableFloorObject(namedThrown);

    assert.equal(merged, unnamedStack);
    assert.equal(game.level.objects.length, 1);
    assert.equal(unnamedStack.quan, 2);
    assert.equal(unnamedStack.oname, 'alpha');

    const unnamedCorpse = { ...corpse(89105, undefined, 'newt'), ox: 7, oy: 5 };
    const namedCorpse = { ...corpse(89106, undefined, 'newt'), ox: 7, oy: 5, oname: 'snack' };
    game.level.objects = [unnamedCorpse];

    const corpseRejected = shop.placeStackableFloorObject(namedCorpse);

    assert.equal(corpseRejected, namedCorpse);
    assert.equal(game.level.objects.length, 2);
    assert.equal(unnamedCorpse.quan, 1);
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
