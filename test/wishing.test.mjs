import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack, __shopBillingTestHooks as shop, heroCarryCapacity } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import {
    A_LAWFUL, ALTAR, Align2amask, BEAR_TRAP, CLOUD, CORR, DB_EAST, DB_FLOOR,
    DB_ICE, DB_LAVA, DB_MOAT, DB_UNDER, DOOR, DRAWBRIDGE_DOWN, D_BROKEN,
    D_CLOSED, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED, FOUNTAIN, F_LOOTED,
    GRAVE, HWALL, ICE, ICED_POOL, IRONBARS, LANDMINE, LAVAPOOL, LAVAWALL,
    MAX_CARR_CAP, MOAT, PIT, POOL, ROOM, SCORR, SDOOR, SINK, S_LDWASHER, S_LPUDDING,
    S_LRING, THRONE, TREE, TREE_LOOTED, TREE_SWARM, T_LOOTED, WATER,
} from '../js/const.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { mksobj, object_display } from '../js/mklev.js';
import { currentFruitId, setCurrentFruitName } from '../js/fruit.js';

const BELL = 358;
const GOLD_PIECE = 466;
const WEAPON_CLASS = 1;
const ARMOR_CLASS = 2;
const TOOL_CLASS = 12;
const SACK = 217;
const OILSKIN_SACK = 218;
const BAG_OF_HOLDING = 219;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const LAND_MINE_OBJECT = 10160;
const BEARTRAP_OBJECT = 10161;
const FIGURINE = 795;
const CORPSE = 471;
const STATUE = 472;
const EGG = 10001;
const TIN = 10004;
const TALLOW_CANDLE = 370;
const WAX_CANDLE = 371;
const CANDELABRUM_OF_INVOCATION = 10076;
const BOOK_OF_THE_DEAD = 10097;
const HORN_OF_PLENTY = 957;
const CRYSTAL_BALL = 10088;
const EXPENSIVE_CAMERA = 10082;
const MAGIC_MARKER = 10084;
const TINNING_KIT = 10170;
const CAN_OF_GREASE = 10171;
const LOW_BOOTS = 10048;
const HIGH_BOOTS = 10049;
const IRON_SHOES = 10105;
const SPEED_BOOTS = 10087;
const WATER_WALKING_BOOTS = 10132;
const JUMPING_BOOTS = 10133;
const ELVEN_BOOTS = 10134;
const KICKING_BOOTS = 10135;
const FUMBLE_BOOTS = 10136;
const LEVITATION_BOOTS = 10137;
const LEATHER_GLOVES = 10050;
const GAUNTLETS_OF_POWER = 10112;
const GAUNTLETS_OF_FUMBLING = 10114;
const GAUNTLETS_OF_DEXTERITY = 10115;
const LEATHER_CLOAK = 10051;
const ROBE = 10063;
const CLOAK_OF_PROTECTION = 10064;
const CLOAK_OF_MAGIC_RESISTANCE = 10065;
const DWARVISH_CLOAK = 10080;
const ELVEN_CLOAK = 10110;
const CLOAK_OF_DISPLACEMENT = 10111;
const CLOAK_OF_INVISIBILITY = 10201;
const MUMMY_WRAPPING = 10202;
const ORCISH_CLOAK = 10203;
const OILSKIN_CLOAK = 10204;
const ALCHEMY_SMOCK = 10205;
const SMALL_SHIELD = 10046;
const SHIELD_OF_DRAIN_RESISTANCE = 10206;
const SHIELD_OF_SHOCK_RESISTANCE = 10207;
const ELVEN_SHIELD = 10208;
const URUK_HAI_SHIELD = 10209;
const ORCISH_SHIELD = 10210;
const LARGE_SHIELD = 10047;
const DWARVISH_ROUNDSHIELD = 10106;
const SHIELD_OF_REFLECTION = 10074;
const FEDORA = 10078;
const CORNUTHAUM = 10211;
const DUNCE_CAP = 10212;
const ELVEN_LEATHER_HELM = 10213;
const ORCISH_HELM = 10022;
const DWARVISH_IRON_HELM = 10107;
const DENTED_POT = 10045;
const HELM_OF_BRILLIANCE = 10131;
const HELMET = 10044;
const HELM_OF_CAUTION = 10214;
const HELM_OF_OPPOSITE_ALIGNMENT = 10215;
const HELM_OF_TELEPATHY = 10216;
const HAWAIIAN_SHIRT = 10188;
const T_SHIRT = 10189;
const GRAY_DRAGON_SCALE_MAIL = 10085;
const SILVER_DRAGON_SCALE_MAIL = 10086;
const GOLD_DRAGON_SCALE_MAIL = 10140;
const RED_DRAGON_SCALE_MAIL = 10141;
const WHITE_DRAGON_SCALE_MAIL = 10142;
const ORANGE_DRAGON_SCALE_MAIL = 10143;
const BLACK_DRAGON_SCALE_MAIL = 10144;
const BLUE_DRAGON_SCALE_MAIL = 10145;
const GREEN_DRAGON_SCALE_MAIL = 10146;
const YELLOW_DRAGON_SCALE_MAIL = 10147;
const GRAY_DRAGON_SCALES = 10148;
const GOLD_DRAGON_SCALES = 10149;
const SILVER_DRAGON_SCALES = 10150;
const RED_DRAGON_SCALES = 10151;
const WHITE_DRAGON_SCALES = 10152;
const ORANGE_DRAGON_SCALES = 10153;
const BLACK_DRAGON_SCALES = 10154;
const BLUE_DRAGON_SCALES = 10155;
const GREEN_DRAGON_SCALES = 10156;
const YELLOW_DRAGON_SCALES = 10157;
const SHORT_SWORD = 10031;
const ELVEN_SHORT_SWORD = 10186;
const ORCISH_SHORT_SWORD = 10187;
const DWARVISH_SHORT_SWORD = 10103;
const SCIMITAR = 10021;
const BROADSWORD = 10032;
const ELVEN_BROADSWORD = 10122;
const LONG_SWORD = 10033;
const TWO_HANDED_SWORD = 10059;
const SILVER_SABER = 10062;
const KATANA = 10125;
const RANSEUR = 10055;
const PARTISAN = 10056;
const GLAIVE = 10057;
const SPETUM = 10058;
const HALBERD = 10172;
const BARDICHE = 10173;
const VOULGE = 10174;
const FAUCHARD = 10175;
const GUISARME = 10176;
const BILL_GUISARME = 10177;
const BEC_DE_CORBIN = 10178;
const LUCERN_HAMMER = 10071;
const MAGIC_FLUTE = 946;
const TOOLED_HORN = 10162;
const FROST_HORN = 953;
const FIRE_HORN = 955;
const MAGIC_HARP = 10169;
const DRUM_OF_EARTHQUAKE = 975;
const BAG_OF_TRICKS = 10158;
const MEAT_RING = 10164;
const K_RATION = 10035;
const C_RATION = 10036;
const CRAM_RATION = 145;
const PANCAKE = 11011;
const KELP_FROND = 172;
const SLIME_MOLD = 11009;
const LUMP_OF_ROYAL_JELLY = 10089;
const MEATBALL = 11012;
const MEAT_STICK = 11014;
const ENORMOUS_MEATBALL = 11013;
const DRAGON_SCALE_MAIL_OTYPES = new Set([
    GRAY_DRAGON_SCALE_MAIL, GOLD_DRAGON_SCALE_MAIL, SILVER_DRAGON_SCALE_MAIL,
    RED_DRAGON_SCALE_MAIL, WHITE_DRAGON_SCALE_MAIL, ORANGE_DRAGON_SCALE_MAIL,
    BLACK_DRAGON_SCALE_MAIL, BLUE_DRAGON_SCALE_MAIL, GREEN_DRAGON_SCALE_MAIL,
    YELLOW_DRAGON_SCALE_MAIL,
]);
const DRAGON_SCALES_OTYPES = new Set([
    GRAY_DRAGON_SCALES, GOLD_DRAGON_SCALES, SILVER_DRAGON_SCALES,
    RED_DRAGON_SCALES, WHITE_DRAGON_SCALES, ORANGE_DRAGON_SCALES,
    BLACK_DRAGON_SCALES, BLUE_DRAGON_SCALES, GREEN_DRAGON_SCALES,
    YELLOW_DRAGON_SCALES,
]);

function testCell(typ = ROOM) {
    return { roomno: 0, typ, flags: 0, altarmask: 0, doormask: 0, horizontal: false, wall_info: 0 };
}

function installWishState(seed = 1, { debug = true, luck = 0 } = {}) {
    const g = resetGame();
    initRng(seed);
    g.flags = { debug };
    g.inventory = [];
    g._goldCount = 0;
    g.context = {};
    g.u = {
        ux: 1,
        uy: 1,
        ublesscnt: 0,
        uluck: luck,
        moreluck: 0,
        acurr: { a: [10, 10, 10, 10, 10, 10] },
    };
    const heroCell = testCell();
    g.level = {
        flags: { nfountains: 0, nsinks: 0 },
        rooms: [],
        monsters: [],
        objects: [],
        traps: [],
        engravings: [],
        meltIceTimers: [],
        at: (x, y) => x === g.u.ux && y === g.u.uy ? heroCell : testCell(),
    };
    return g;
}

async function beginWizardWish() {
    await rhack('\x17');
    assert.equal(game._command_mode, 'wizardWish');
}

function beginWishDirectly() {
    game._wish_text = '';
    game._wish_tries = 0;
    game._command_mode = 'wizardWish';
}

async function submitWish(text) {
    for (const ch of text) await rhack(ch.charCodeAt(0));
    await rhack('\n');
}

function trapAtHero() {
    return game.level.traps.find(t => t.tx === game.u.ux && t.ty === game.u.uy);
}

function cellAtHero() {
    return game.level.at(game.u.ux, game.u.uy);
}

test('unrecognized wish retries without creating a named weapon', async () => {
    installWishState();
    await beginWizardWish();

    await submitWish('blessed greased rusty nonexistent sword');

    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);
    assert.match(game._pending_message, /For what do you wish\?/);
});

test('five unrecognized wishes fall back to a random object', async () => {
    installWishState(23);
    await beginWizardWish();

    for (let i = 0; i < 4; i++) {
        await submitWish(`flibbertigibbet ${i}`);
        assert.equal(game._command_mode, 'wizardWish');
        assert.equal(game.inventory.length, 0);
    }

    await submitWish('flibbertigibbet 4');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 1);
    assert.equal(game._wish_tries, 0);
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);
    assert.match(game._pending_message, /That's enough tries!/);
    assert.doesNotMatch(game.inventory[0].kind || game.inventory[0].actualKind || '', /flibbertigibbet/);
});

test('explicit nothing wishes decline without consuming wish conduct', async () => {
    for (const wish of ['nothing', 'nil', 'none']) {
        installWishState();
        await beginWizardWish();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game._wish_tries, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
        assert.doesNotMatch(game._pending_message || '', /Nothing fitting/, wish);
    }
});

test('qualified nothing wishes retry as bad descriptions', async () => {
    for (const wish of ['blessed nothing', 'a nothing', 'nothing (0)']) {
        installWishState();
        await beginWizardWish();
        await submitWish(wish);

        assert.equal(game._command_mode, 'wizardWish', wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game._wish_tries, 1, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.match(game._pending_message, /Nothing fitting that description exists in the game\./, wish);
        assert.match(game._pending_message, /For what do you wish\?/, wish);
    }
});

test('wand of nothing remains an object wish', async () => {
    installWishState();
    await beginWizardWish();
    await submitWish('wand of nothing');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 1);
    assert.equal(item.cls, 'wand');
    assert.equal(item.kind, 'nothing');
    assert.equal(game.u.uconduct?.wishes, 1);
});

test('normal-mode wished gold clamps to C quantity bounds', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('5001 gold pieces');

    const money = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
    assert.equal(game._command_mode, null);
    assert.equal(game._goldCount, 5000);
    assert.equal(money.quan, 5000);
    assert.equal(money.owt, 50);
    assert.match(game._pending_message, /\$ - 5000 gold pieces\./);
    assert.equal(game.u.uconduct?.wishes, 1);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('0 zorkmids');

    const one = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
    assert.equal(game._goldCount, 1);
    assert.equal(one.quan, 1);
    assert.equal(one.owt, 1);
    assert.match(game._pending_message, /\$ - 1 gold piece\./);
});

test('wizard-mode wished gold keeps requested quantity above normal cap', async () => {
    installWishState(1, { debug: true });
    beginWishDirectly();
    await submitWish('6000 zorkmids');

    const money = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
    assert.equal(game._command_mode, null);
    assert.equal(game._goldCount, 6000);
    assert.equal(money.quan, 6000);
    assert.equal(money.owt, 60);
    assert.match(game._pending_message, /\$ - 6000 gold pieces\./);
});

test('bare plural money wishes follow C singularization count', async () => {
    for (const wish of ['gold pieces', 'coins', 'zorkmids']) {
        installWishState(1, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const money = game.inventory.find(item => item.otyp === GOLD_PIECE || item.letter === '$');
        assert.equal(game._command_mode, null, wish);
        assert.equal(game._goldCount, 2, wish);
        assert.equal(money.quan, 2, wish);
        assert.equal(money.owt, 1, wish);
        assert.match(game._pending_message, /\$ - 2 gold pieces\./, wish);
    }
});

test('wizard trap wish creates a non-object hands result', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('pit');

    const trap = trapAtHero();
    assert.equal(game._command_mode, null);
    assert.equal(trap?.ttyp, PIT);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
    assert.equal(game.u.ublesscnt, 0);
    assert.match(game._pending_message, /^A pit\.$/);
});

test('wizard ambiguous trap names default to disarmed objects', async () => {
    for (const { wish, otyp, kind } of [
        { wish: 'bear trap', otyp: BEARTRAP_OBJECT, kind: 'beartrap' },
        { wish: 'beartrap', otyp: BEARTRAP_OBJECT, kind: 'beartrap' },
        { wish: 'land mine', otyp: LAND_MINE_OBJECT, kind: 'land mine' },
        { wish: 'landmine', otyp: LAND_MINE_OBJECT, kind: 'land mine' },
    ]) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game.inventory.length, 1, wish);
        assert.equal(game.inventory[0].otyp, otyp, wish);
        assert.equal(game.inventory[0].kind, kind, wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
        assert.ok(game.u.ublesscnt > 0, wish);
    }
});

test('wizard ambiguous trapped forms create armed trap non-object results', async () => {
    for (const { wish, ttyp, message } of [
        { wish: 'trapped bear trap', ttyp: BEAR_TRAP, message: /^A bear trap\.$/ },
        { wish: 'trapped beartrap', ttyp: BEAR_TRAP, message: /^A bear trap\.$/ },
        { wish: 'bear trap trap', ttyp: BEAR_TRAP, message: /^A bear trap\.$/ },
        { wish: 'beartrap trap', ttyp: BEAR_TRAP, message: /^A bear trap\.$/ },
        { wish: 'trapped land mine', ttyp: LANDMINE, message: /^A land mine\.$/ },
        { wish: 'trapped landmine', ttyp: LANDMINE, message: /^A land mine\.$/ },
        { wish: 'land mine trap', ttyp: LANDMINE, message: /^A land mine\.$/ },
        { wish: 'landmine trap', ttyp: LANDMINE, message: /^A land mine\.$/ },
    ]) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(trapAtHero()?.ttyp, ttyp, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
        assert.equal(game.u.ublesscnt, 0, wish);
        assert.match(game._pending_message, message, wish);
    }
});

test('wizard ambiguous object-forced forms stay disarmed objects', async () => {
    for (const { wish, otyp } of [
        { wish: 'untrapped bear trap', otyp: BEARTRAP_OBJECT },
        { wish: 'bear trap object', otyp: BEARTRAP_OBJECT },
        { wish: 'trapped bear trap object', otyp: BEARTRAP_OBJECT },
        { wish: 'untrapped land mine', otyp: LAND_MINE_OBJECT },
        { wish: 'land mine object', otyp: LAND_MINE_OBJECT },
        { wish: 'trapped land mine object', otyp: LAND_MINE_OBJECT },
    ]) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game.inventory.length, 1, wish);
        assert.equal(game.inventory[0].otyp, otyp, wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

test('non-wizard ambiguous trapped prefixes still resolve to objects', async () => {
    for (const { wish, otyp } of [
        { wish: 'trapped bear trap', otyp: BEARTRAP_OBJECT },
        { wish: 'trapped land mine', otyp: LAND_MINE_OBJECT },
    ]) {
        installWishState(1, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game.inventory.length, 1, wish);
        assert.equal(game.inventory[0].otyp, otyp, wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

test('non-wizard ambiguous suffixes do not create map traps', async () => {
    for (const wish of ['bear trap trap', 'land mine trap']) {
        installWishState(1, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, 'wizardWish', wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game._wish_tries, 1, wish);
        assert.match(game._pending_message, /Nothing fitting that description exists in the game\./, wish);
    }
});

test('non-wizard trap words remain bad wish descriptions', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('pit');

    assert.equal(game.level.traps.length, 0);
    assert.equal(game.inventory.length, 0);
    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game._wish_tries, 1);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);
});

test('wizard terrain and furniture wishes create non-object map results', async () => {
    for (const { wish, typ, message, nfountains, nsinks } of [
        { wish: 'throne', typ: THRONE, message: /^A throne\.$/, nfountains: 0, nsinks: 0 },
        { wish: 'fountain', typ: FOUNTAIN, message: /^A fountain\.$/, nfountains: 1, nsinks: 0 },
        { wish: 'sink', typ: SINK, message: /^A sink\.$/, nfountains: 0, nsinks: 1 },
    ]) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(cellAtHero().typ, typ, wish);
        assert.equal(game.level.flags.nfountains || 0, nfountains, wish);
        assert.equal(game.level.flags.nsinks || 0, nsinks, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
        assert.equal(game.u.ublesscnt, 0, wish);
        assert.match(game._pending_message, message, wish);
    }
});

test('wizard terrain and furniture wish qualifiers set C map flags', async () => {
    for (const { wish, typ, flags, blessedftn, message } of [
        { wish: 'looted throne', typ: THRONE, flags: T_LOOTED, blessedftn: 0, message: /^A throne\.$/ },
        { wish: 'disturbed throne', typ: THRONE, flags: T_LOOTED, blessedftn: 0, message: /^A throne\.$/ },
        { wish: 'opulent throne', typ: THRONE, flags: 0, blessedftn: 0, message: /^A throne\.$/ },
        { wish: 'looted fountain', typ: FOUNTAIN, flags: F_LOOTED, blessedftn: 0, message: /^A fountain\.$/ },
        { wish: 'magic fountain', typ: FOUNTAIN, flags: 0, blessedftn: 1, message: /^A magic fountain\.$/ },
        { wish: 'magic fountains', typ: FOUNTAIN, flags: 0, blessedftn: 1, message: /^A magic fountain\.$/ },
        { wish: 'looted magic fountain', typ: FOUNTAIN, flags: F_LOOTED, blessedftn: 1, message: /^A magic fountain\.$/ },
        { wish: 'blessed fountain', typ: FOUNTAIN, flags: 0, blessedftn: 1, message: /^A magic fountain\.$/ },
        { wish: 'holy fountain', typ: FOUNTAIN, flags: 0, blessedftn: 1, message: /^A magic fountain\.$/ },
        { wish: 'looted sink', typ: SINK, flags: S_LPUDDING | S_LDWASHER | S_LRING, blessedftn: 0, message: /^A sink\.$/ },
        { wish: 'kitchen sink', typ: SINK, flags: 0, blessedftn: 0, message: /^A sink\.$/ },
    ]) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(cellAtHero().typ, typ, wish);
        assert.equal(cellAtHero().flags || 0, flags, wish);
        assert.equal(cellAtHero().blessedftn || 0, blessedftn, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.ublesscnt, 0, wish);
        assert.match(game._pending_message, message, wish);
    }
});

test('wizard terrain wishes create broader C non-object map results', async () => {
    for (const { wish, typ, flags = 0, altarmask = 0, message } of [
        { wish: 'pool', typ: POOL, message: /^A pool of water\.$/ },
        { wish: 'moat', typ: MOAT, message: /^A moat\.$/ },
        { wish: 'wall of water', typ: WATER, message: /^A wall of water\.$/ },
        { wish: 'molten lava', typ: LAVAPOOL, message: /^A pool of molten lava\.$/ },
        { wish: 'wall of lava', typ: LAVAWALL, message: /^A wall of molten lava\.$/ },
        { wish: 'ice', typ: ICE, flags: ICED_POOL, message: /^Ice\.$/ },
        { wish: 'lawful altar', typ: ALTAR, flags: Align2amask(A_LAWFUL), altarmask: Align2amask(A_LAWFUL), message: /^A lawful altar\.$/ },
        { wish: 'disturbed grave', typ: GRAVE, flags: 1, message: /^A disturbed grave\.$/ },
        { wish: 'looted tree', typ: TREE, flags: TREE_LOOTED | TREE_SWARM, message: /^A tree\.$/ },
        { wish: 'iron bars', typ: IRONBARS, message: /^Iron bars\.$/ },
        { wish: 'stone wall', typ: HWALL, message: /^A wall\.$/ },
        { wish: 'cloud', typ: CLOUD, message: /^A cloud\.$/ },
    ]) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(cellAtHero().typ, typ, wish);
        assert.equal(cellAtHero().flags || 0, flags, wish);
        assert.equal(cellAtHero().altarmask || 0, altarmask, wish);
        assert.equal(cellAtHero().doormask || 0, D_NODOOR, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
        assert.equal(game.u.ublesscnt, 0, wish);
        assert.match(game._pending_message, message, wish);
    }

    installWishState();
    beginWishDirectly();
    await submitWish('melting ice');
    assert.equal(cellAtHero().typ, ICE);
    assert.equal(cellAtHero().flags || 0, ICED_POOL);
    assert.equal(game.level.meltIceTimers.length, 1);
    assert.equal(game.level.meltIceTimers[0].x, game.u.ux);
    assert.equal(game.level.meltIceTimers[0].y, game.u.uy);
});

test('wizard terrain door wishes honor C masks and location restrictions', async () => {
    for (const { wish, typ = DOOR, doormask, message } of [
        { wish: 'trapped locked door', doormask: D_LOCKED | D_TRAPPED, message: /^A trapped locked door\.$/ },
        { wish: 'open door', doormask: D_ISOPEN, message: /^An open door\.$/ },
        { wish: 'broken door', doormask: D_BROKEN, message: /^A broken door\.$/ },
        { wish: 'doorless doorway', doormask: D_NODOOR, message: /^A doorless doorway\.$/ },
        { wish: 'secret door', typ: SDOOR, doormask: D_NODOOR, message: /^A secret door\.$/ },
        { wish: 'trapped secret door', typ: SDOOR, doormask: D_TRAPPED, message: /^A trapped secret door\.$/ },
    ]) {
        installWishState();
        cellAtHero().typ = HWALL;
        cellAtHero().horizontal = true;
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, null, wish);
        assert.equal(cellAtHero().typ, typ, wish);
        assert.equal(cellAtHero().doormask, doormask, wish);
        assert.equal(cellAtHero().horizontal, true, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.ublesscnt, 0, wish);
        assert.match(game._pending_message, message, wish);
    }

    installWishState();
    beginWishDirectly();
    await submitWish('door');

    assert.equal(game._command_mode, null);
    assert.equal(cellAtHero().typ, ROOM);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.match(game._pending_message, /^Door requires door or wall location\.$/);
});

test('wizard terrain corridor room and drawbridge wishes follow C map rules', async () => {
    installWishState();
    cellAtHero().typ = CORR;
    beginWishDirectly();
    await submitWish('secret corridor');
    assert.equal(cellAtHero().typ, SCORR);
    assert.match(game._pending_message, /^Secret corridor\.$/);

    installWishState();
    beginWishDirectly();
    await submitWish('secret corridor');
    assert.equal(cellAtHero().typ, ROOM);
    assert.match(game._pending_message, /^Secret corridor requires corridor location\.$/);

    installWishState();
    cellAtHero().typ = FOUNTAIN;
    game.level.flags.nfountains = 1;
    beginWishDirectly();
    await submitWish('floor');
    assert.equal(cellAtHero().typ, ROOM);
    assert.equal(game.level.flags.nfountains || 0, 0);
    assert.match(game._pending_message, /^Room floor\.$/);

    for (const { wish, under, message } of [
        { wish: 'moat', under: DB_MOAT, message: /^Moat under the drawbridge\.$/ },
        { wish: 'lava', under: DB_LAVA, message: /^Lava under the drawbridge\.$/ },
        { wish: 'ice', under: DB_ICE, message: /^Ice under the drawbridge\.$/ },
        { wish: 'floor', under: DB_FLOOR, message: /^Floor under the drawbridge\.$/ },
    ]) {
        installWishState();
        cellAtHero().typ = DRAWBRIDGE_DOWN;
        cellAtHero().flags = DB_EAST | DB_MOAT;
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(cellAtHero().typ, DRAWBRIDGE_DOWN, wish);
        assert.equal(cellAtHero().flags & DB_EAST, DB_EAST, wish);
        assert.equal(cellAtHero().flags & DB_UNDER, under, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.match(game._pending_message, message, wish);
    }
});

test('non-wizard terrain and furniture wish words remain bad descriptions', async () => {
    for (const wish of [
        'throne', 'fountain', 'magic fountain', 'looted throne', 'sink',
        'cloud', 'lawful altar', 'disturbed grave', 'looted tree', 'trapped locked door',
        'wall of water', 'secret corridor',
    ]) {
        installWishState(1, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        assert.equal(game._command_mode, 'wizardWish', wish);
        assert.equal(cellAtHero().typ, ROOM, wish);
        assert.equal(game.level.flags.nfountains || 0, 0, wish);
        assert.equal(game.level.flags.nsinks || 0, 0, wish);
        assert.equal(game.inventory.length, 0, wish);
        assert.equal(game.level.traps.length, 0, wish);
        assert.equal(game._wish_tries, 1, wish);
        assert.equal(game.u.uconduct?.wishes || 0, 0, wish);
        assert.equal(game.u.ublesscnt, 0, wish);
        assert.match(game._pending_message, /Nothing fitting that description exists in the game\./, wish);
    }
});

test('recognized wishes still create the requested object', async () => {
    installWishState();
    await beginWizardWish();

    await submitWish('food ration');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 1);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.match(game._pending_message, /food ration/);
});

test('wish quantity only applies to mergeable object classes', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 speed boots');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'speed boots');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('2 wands of fire');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].cls, 'wand');
    assert.equal(game.inventory[0].wand, 'fire');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('2 magic markers');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'magic marker');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('2 spellbooks of magic missile');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].spellName, 'magic missile');
    assert.equal(game.inventory[0].quan, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('pair of daggers');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'dagger');
    assert.equal(game.inventory[0].quan, 2);

    installWishState();
    beginWishDirectly();
    await submitWish('2 food rations');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.inventory[0].quan, 2);
});

test('wished polearms use C appearance metadata', async () => {
    const cases = [
        ['partisan', PARTISAN, 'vulgar polearm', 'partisan', 80, 10],
        ['ranseur', RANSEUR, 'hilted polearm', 'ranseur', 50, 6],
        ['spetum', SPETUM, 'forked polearm', 'spetum', 50, 5],
        ['glaive', GLAIVE, 'single-edged polearm', 'glaive', 75, 6],
        ['halberd', HALBERD, 'angled poleaxe', 'halberd', 150, 10],
        ['bardiche', BARDICHE, 'long poleaxe', 'bardiche', 120, 7],
        ['voulge', VOULGE, 'pole cleaver', 'voulge', 125, 5],
        ['fauchard', FAUCHARD, 'pole sickle', 'fauchard', 60, 5],
        ['guisarme', GUISARME, 'pruning hook', 'guisarme', 80, 5],
        ['bill-guisarme', BILL_GUISARME, 'hooked polearm', 'bill-guisarme', 120, 7],
        ['lucern hammer', LUCERN_HAMMER, 'pronged polearm', 'lucern hammer', 150, 7],
        ['bec de corbin', BEC_DE_CORBIN, 'beaked polearm', 'bec de corbin', 100, 8],
    ];

    for (const [wish, otyp, kind, actualKind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.cls, 'weapon', wish);
        assert.equal(item.glyph, ')', wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.known, false, wish);
        assert.equal(item.quan, 1, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(item.wishedfor, true, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
        assert.match(item.line, new RegExp(kind), wish);
        assert.doesNotMatch(game._pending_message || '', /Nothing fitting that description exists/, wish);
    }
});

test('wished polearm appearances resolve to concrete C polearms', async () => {
    const cases = [
        ['vulgar polearm', PARTISAN, 'partisan'],
        ['hilted polearm', RANSEUR, 'ranseur'],
        ['forked polearm', SPETUM, 'spetum'],
        ['single edged polearm', GLAIVE, 'glaive'],
        ['angled poleaxe', HALBERD, 'halberd'],
        ['long poleaxe', BARDICHE, 'bardiche'],
        ['pole cleaver', VOULGE, 'voulge'],
        ['pole sickle', FAUCHARD, 'fauchard'],
        ['pruning hook', GUISARME, 'guisarme'],
        ['hooked polearm', BILL_GUISARME, 'bill-guisarme'],
        ['pronged polearm', LUCERN_HAMMER, 'lucern hammer'],
        ['beaked polearm', BEC_DE_CORBIN, 'bec de corbin'],
    ];

    for (const [wish, otyp, actualKind] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.known, false, wish);
        assert.equal(item.wishedfor, true, wish);
    }
});

test('wished ration foods use concrete C object metadata', async () => {
    const cases = [
        ['1 pancake', PANCAKE, 'pancake', 'pancakes', 200, 2, 15],
        ['1 cram ration', CRAM_RATION, 'cram ration', 'cram rations', 600, 15, 35],
        ['1 kelp frond', KELP_FROND, 'kelp frond', 'kelp fronds', 30, 1, 6],
        ['1 slime mold', SLIME_MOLD, 'slime mold', 'slime molds', 250, 5, 17],
        ['1 lump of royal jelly', LUMP_OF_ROYAL_JELLY, 'lump of royal jelly', 'lumps of royal jelly', 200, 2, 15],
        ['1 meatball', MEATBALL, 'meatball', 'meatballs', 5, 1, 5],
        ['1 meat stick', MEAT_STICK, 'meat stick', 'meat sticks', 5, 1, 5],
        ['1 enormous meatball', ENORMOUS_MEATBALL, 'enormous meatball', 'enormous meatballs', 2000, 400, 105],
        ['1 K-ration', K_RATION, 'K-ration', 'K-rations', 400, 10, 25],
        ['1 C-ration', C_RATION, 'C-ration', 'C-rations', 300, 10, 20],
    ];

    for (const [wish, otyp, kind, plural, nutrition, weight, cost] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.plural, plural);
        assert.equal(item.nutrition, nutrition);
        assert.equal(item.quan, 1);
        assert.equal(item.owt, weight);
        assert.equal(shop.shopBaseCost(item), cost);
        assert.match(item.line, new RegExp(kind));
    }
});

test('plural wished ration foods keep C plural metadata and weights', async () => {
    const cases = [
        ['pancakes', PANCAKE, 'pancake', 'pancakes', 2, 4],
        ['cram rations', CRAM_RATION, 'cram ration', 'cram rations', 2, 30],
        ['kelp fronds', KELP_FROND, 'kelp frond', 'kelp fronds', 2, 2],
        ['slime molds', SLIME_MOLD, 'slime mold', 'slime molds', 2, 10],
        ['lumps of royal jelly', LUMP_OF_ROYAL_JELLY, 'lump of royal jelly', 'lumps of royal jelly', 2, 4],
        ['meatballs', MEATBALL, 'meatball', 'meatballs', 2, 2],
        ['meat sticks', MEAT_STICK, 'meat stick', 'meat sticks', 2, 2],
        ['enormous meatballs', ENORMOUS_MEATBALL, 'enormous meatball', 'enormous meatballs', 2, 800],
        ['K-rations', K_RATION, 'K-ration', 'K-rations', 2, 20],
        ['C-rations', C_RATION, 'C-ration', 'C-rations', 2, 20],
    ];

    for (const [wish, otyp, kind, plural, quantity, weight] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.plural, plural);
        assert.equal(item.quan, quantity);
        assert.equal(item.owt, weight);
        assert.match(item.line, new RegExp(`${quantity} ${plural}`));
    }
});

test('custom fruit wishes bind slime mold spe and display fruit name', async () => {
    installWishState();
    setCurrentFruitName('kumquat');
    const fid = currentFruitId();
    beginWishDirectly();
    await submitWish('fruit');

    let item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, SLIME_MOLD);
    assert.equal(item.actualKind, 'slime mold');
    assert.equal(item.kind, 'kumquat');
    assert.equal(item.spe, fid);
    assert.equal(item.owt, 5);
    assert.equal(shop.shopBaseCost(item), 17);
    assert.match(item.line, /kumquat/);

    installWishState();
    setCurrentFruitName('kumquat');
    beginWishDirectly();
    await submitWish('kumquats');

    item = game.inventory[0];
    assert.equal(item.otyp, SLIME_MOLD);
    assert.equal(item.kind, 'kumquat');
    assert.equal(item.quan, 2);
    assert.equal(item.owt, 10);
    assert.match(item.line, /2 kumquats/);
});

test('covered food wishes tolerate C aliases and fuzzy hyphen spacing', async () => {
    const cases = [
        ['kelp', KELP_FROND, 'kelp frond', 1],
        ['K ration', K_RATION, 'K-ration', 1],
        ['krations', K_RATION, 'K-ration', 2],
        ['C ration', C_RATION, 'C-ration', 1],
        ['crations', C_RATION, 'C-ration', 2],
        ['huge meatball', ENORMOUS_MEATBALL, 'enormous meatball', 1],
        ['huge chunk of meat', ENORMOUS_MEATBALL, 'enormous meatball', 1],
    ];

    for (const [wish, otyp, kind, quantity] of cases) {
        installWishState();
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.quan, quantity);
    }
});

test('mksobj initializes kelp frond quantity from C rnd(2)', () => {
    const quantities = new Set();
    for (let seed = 1; seed <= 40; seed++) {
        installWishState(seed);
        quantities.add(mksobj(KELP_FROND, true, false).quan);
    }

    assert.deepEqual([...quantities].sort(), [1, 2]);
});

test('mksobj initializes slime mold with current fruit id', () => {
    installWishState(1);
    setCurrentFruitName('kumquat');
    const fid = currentFruitId();
    const item = mksobj(SLIME_MOLD, true, false);

    assert.equal(item.otyp, SLIME_MOLD);
    assert.equal(item.actualKind, 'slime mold');
    assert.equal(item.kind, 'kumquat');
    assert.equal(item.plural, 'kumquats');
    assert.equal(item.spe, fid);
    assert.equal(item.nutrition, 250);
    assert.equal(item.owt, 5);
});

test('mksobj initializes exact local-ID polearms with C appearance metadata', () => {
    const cases = [
        [PARTISAN, 'vulgar polearm', 'partisan', 80, 10],
        [RANSEUR, 'hilted polearm', 'ranseur', 50, 6],
        [SPETUM, 'forked polearm', 'spetum', 50, 5],
        [GLAIVE, 'single-edged polearm', 'glaive', 75, 6],
        [HALBERD, 'angled poleaxe', 'halberd', 150, 10],
        [BARDICHE, 'long poleaxe', 'bardiche', 120, 7],
        [VOULGE, 'pole cleaver', 'voulge', 125, 5],
        [FAUCHARD, 'pole sickle', 'fauchard', 60, 5],
        [GUISARME, 'pruning hook', 'guisarme', 80, 5],
        [BILL_GUISARME, 'hooked polearm', 'bill-guisarme', 120, 7],
        [LUCERN_HAMMER, 'pronged polearm', 'lucern hammer', 150, 7],
        [BEC_DE_CORBIN, 'beaked polearm', 'bec de corbin', 100, 8],
    ];

    for (const [otyp, kind, actualKind, weight, cost] of cases) {
        installWishState(1);
        const item = mksobj(otyp, true, false);
        const display = object_display({ otyp });

        assert.equal(item.otyp, otyp, actualKind);
        assert.equal(item.cls, 'weapon', actualKind);
        assert.equal(item.glyph, ')', actualKind);
        assert.equal(display.glyph, ')', actualKind);
        assert.equal(display.color, 6, actualKind);
        assert.equal(item.kind, kind, actualKind);
        assert.equal(item.actualKind, actualKind, actualKind);
        assert.equal(item.known, false, actualKind);
        assert.equal(item.quan, 1, actualKind);
        assert.equal(item.owt, weight, actualKind);
        assert.equal(shop.shopBaseCost(item), cost, actualKind);
    }
});

test('mksobj initializes exact charged instruments with C charge ranges', () => {
    const cases = [
        [MAGIC_FLUTE, 4, 8],
        [FROST_HORN, 4, 8],
        [FIRE_HORN, 4, 8],
        [MAGIC_HARP, 4, 8],
        [DRUM_OF_EARTHQUAKE, 4, 8],
        [HORN_OF_PLENTY, 3, 20],
    ];

    for (const [otyp, minSpe, maxSpe] of cases) {
        installWishState(1);
        const item = mksobj(otyp, true, false);
        assert.equal(item.otyp, otyp);
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe, String(otyp));
    }
});

test('random tool generation maps charged instrument rolls to concrete tools', () => {
    const cases = [
        [946, MAGIC_FLUTE, 4, 8],
        [953, FROST_HORN, 4, 8],
        [955, FIRE_HORN, 4, 8],
        [957, HORN_OF_PLENTY, 3, 20],
        [963, MAGIC_HARP, 4, 8],
        [975, DRUM_OF_EARTHQUAKE, 4, 8],
    ];

    for (const [roll, otyp, minSpe, maxSpe] of cases) {
        installWishState(1);
        game._mkobj_tool_roll = roll;
        const item = mksobj(TOOL_CLASS, true, false);
        assert.equal(item.otyp, otyp, String(roll));
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe, String(roll));
    }
});

test('normal-mode wish quantity keeps C merge caps', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('7 wax candles');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'wax candle');
    assert.equal(game.inventory[0].quan, 7);
    assert.equal(game.inventory[0].spe, 1);
    assert.equal(game.inventory[0].age, 400);
    assert.equal(game.inventory[0].lamplit || false, false);
    assert.equal(game.inventory[0].owt, 14);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('20 darts');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'dart');
    assert.equal(game.inventory[0].quan, 20);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('21 darts');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'dart');
    assert.notEqual(game.inventory[0].quan, 21);
});

test('plural meat ring wish remains one nonmergeable food object', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 meat rings');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, MEAT_RING);
    assert.equal(item.cls, 'food');
    assert.equal(item.kind, 'meat ring');
    assert.equal(item.actualKind, 'meat ring');
    assert.equal(item.quan, 1);
    assert.equal(item.owt, 5);
    assert.match(item.line, /a meat ring/);
    assert.doesNotMatch(item.line, /meat rings/);
});

test('burning wished candles keep C candle metadata', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('6 burning tallow candles');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.kind, 'tallow candle');
    assert.equal(item.quan, 6);
    assert.equal(item.spe, 1);
    assert.equal(item.lamplit, true);
    assert.equal(item.burning, true);
    assert.equal(item.age, 75);
    assert.equal(item.owt, 12);
    assert.match(item.line, /6 tallow candles \(lit\)/);
});

test('non-debug wished spe follows C class constraints', async () => {
    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('+3 food ration');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.inventory[0].spe, 0);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-3 food ration');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'food ration');
    assert.equal(game.inventory[0].spe, 0);
    assert.equal(game.inventory[0].cursed, true);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('+99 plate mail');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'plate mail');
    assert.equal(game.inventory[0].spe, 0);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-5 potion of healing');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].actualKind, 'potion of healing');
    assert.equal(game.inventory[0].spe, 0);
    assert.equal(game.inventory[0].cursed, true);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-5 crystal ball');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].actualKind, 'crystal ball');
    assert.equal(game.inventory[0].spe, -1);
    assert.equal(game.inventory[0].cursed, true);

    installWishState(1, { debug: false });
    beginWishDirectly();
    await submitWish('-3 wand of digging');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].wand, 'digging');
    assert.equal(game.inventory[0].spe, -1);
    assert.equal(game.inventory[0].cursed, true);
});

test('wish charge suffix applies before object naming', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('wand of fire (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].cls, 'wand');
    assert.equal(game.inventory[0].wand, 'fire');
    assert.equal(game.inventory[0].spe, 3);
    assert.equal(game.inventory[0].recharged, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('magic marker (0:7) named dry');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'magic marker');
    assert.equal(game.inventory[0].oname, 'dry');
    assert.equal(game.inventory[0].spe, 7);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
});

test('wish charge suffix ignores tool recharge count in normal mode', async () => {
    installWishState(3, { debug: false });
    beginWishDirectly();
    await submitWish('horn of plenty (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].otyp, HORN_OF_PLENTY);
    assert.equal(game.inventory[0].actualKind, 'horn of plenty');
    assert.equal(game.inventory[0].spe, 3);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
    assert.equal(game.inventory[0].owt, 18);
});

test('wished charged tools use C object metadata rows', async () => {
    installWishState(3);
    beginWishDirectly();
    await submitWish('bag of tricks');

    let item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, BAG_OF_TRICKS);
    assert.equal(item.cls, 'tool');
    assert.equal(item.kind, 'bag of tricks');
    assert.equal(item.actualKind, 'bag of tricks');
    assert.equal(item.quan, 1);
    assert.ok(item.spe >= 3 && item.spe <= 20);
    assert.equal(item.blessed, false);
    assert.equal(item.cursed, false);
    assert.equal(item.owt, 15);
    assert.equal(shop.shopBaseCost(item), 100);

    installWishState(11);
    beginWishDirectly();
    await submitWish('magic marker');

    item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, MAGIC_MARKER);
    assert.equal(item.cls, 'tool');
    assert.equal(item.kind, 'magic marker');
    assert.equal(item.actualKind, 'magic marker');
    assert.equal(item.quan, 1);
    assert.ok(item.spe >= 30 && item.spe <= 99);
    assert.equal(item.blessed, false);
    assert.equal(item.cursed, false);
    assert.equal(item.owt, 2);
    assert.equal(shop.shopBaseCost(item), 50);

    installWishState(11);
    beginWishDirectly();
    await submitWish('glass orb');

    item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, CRYSTAL_BALL);
    assert.equal(item.cls, 'tool');
    assert.equal(item.kind, 'glass orb');
    assert.equal(item.actualKind, 'crystal ball');
    assert.equal(item.known || false, false);
    assert.ok(item.spe >= 3 && item.spe <= 7);
    assert.equal(item.owt, 150);
    assert.equal(shop.shopBaseCost(item), 60);
    assert.match(item.line, /glass orb/);
});

test('generic wished object ranges use C rnd_class candidates', async () => {
    const cases = [
        ['bag', new Set([SACK, OILSKIN_SACK, BAG_OF_HOLDING, BAG_OF_TRICKS])],
        ['candle', new Set([TALLOW_CANDLE, WAX_CANDLE])],
        ['horn', new Set([TOOLED_HORN, FROST_HORN, FIRE_HORN, HORN_OF_PLENTY])],
    ];

    for (const [wish, allowed] of cases) {
        const seen = new Set();
        for (let seed = 1; seed <= 30; seed++) {
            installWishState(seed, { debug: false });
            beginWishDirectly();
            await submitWish(wish);

            const item = game.inventory[0];
            assert.equal(game._command_mode, null, wish);
            assert.ok(allowed.has(item.otyp), `${wish} produced ${item.otyp}`);
            assert.notEqual(item.otyp, TOOL_CLASS, wish);
            seen.add(item.otyp);

            if (item.otyp === BAG_OF_TRICKS || item.otyp === HORN_OF_PLENTY) {
                assert.ok(item.spe >= 3 && item.spe <= 20, wish);
                assert.equal(item.owt, item.otyp === BAG_OF_TRICKS ? 15 : 18, wish);
                assert.equal(shop.shopBaseCost(item), item.otyp === BAG_OF_TRICKS ? 100 : 50, wish);
            } else if (item.otyp === FROST_HORN || item.otyp === FIRE_HORN) {
                assert.ok(item.spe >= 4 && item.spe <= 8, wish);
                assert.equal(item.owt, 18, wish);
                assert.equal(shop.shopBaseCost(item), 50, wish);
            }
        }
        assert.ok(seen.size > 1, `${wish} should not collapse to one concrete object`);
    }
});

test('called wished range bases use C namedesc tail lookup', async () => {
    async function wishedCalledRange(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    for (const [wish, otyp, namedesc, kind, actualKind, line, weight, cost] of [
        ['bag called holding', BAG_OF_HOLDING, /^rn2\(21\)=/, 'bag of holding', undefined, /a bag/, 15, 100],
        ['bag called tricks', BAG_OF_TRICKS, /^rn2\(21\)=/, 'bag of tricks', 'bag of tricks', /a bag of tricks/, 15, 100],
        ['horn called plenty', HORN_OF_PLENTY, /^rn2\(3\)=/, 'horn', 'horn of plenty', /a horn/, 18, 50],
        ['gauntlets called power', GAUNTLETS_OF_POWER, /^rn2\(9\)=/, 'gauntlets of power', 'gauntlets of power', /riding gloves/, 30, 50],
        ['gloves called dexterity', GAUNTLETS_OF_DEXTERITY, /^rn2\(9\)=/, 'gauntlets of dexterity', 'gauntlets of dexterity', /fencing gloves/, 10, 50],
        ['cloak called magic resistance', CLOAK_OF_MAGIC_RESISTANCE, /^rn2\(7\)=/, 'cloak of magic resistance', 'cloak of magic resistance', /ornamental cope/, 10, 60],
        ['hat called conical hat', DUNCE_CAP, /^rn2\(12\)=/, 'dunce cap', 'dunce cap', /conical hat/, 4, 1],
        ['helm called telepathy', HELM_OF_TELEPATHY, /^rn2\(5\)=/, 'helm of telepathy', 'helm of telepathy', /visored helmet/, 50, 50],
    ]) {
        const result = await wishedCalledRange(wish);
        assert.match(result.log[0], namedesc, wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.notEqual(result.item.otyp, TOOL_CLASS, wish);
        assert.notEqual(result.item.otyp, ARMOR_CLASS, wish);
        assert.equal(result.item.kind, kind, wish);
        assert.equal(result.item.actualKind, actualKind, wish);
        assert.equal(result.item.quan, 1, wish);
        assert.equal(result.item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(result.item), cost, wish);
        assert.match(result.item.line, line, wish);
    }
});

test('labeled wished scrolls and spellbooks use C description lookup', async () => {
    async function wishedLabeledObject(text, configureDescriptions, seed = 1) {
        installWishState(seed);
        configureDescriptions();
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    for (const spelling of ['labeled', 'labelled']) {
        const scrollResult = await wishedLabeledObject(`scroll ${spelling} "ELAM EBOW"`, () => {
            game._object_descriptions = { scrolls: Array.from({ length: 41 }, (_, i) => `scroll label ${i}`) };
            game._object_descriptions.scrolls[14] = 'ELAM EBOW';
        });
        assert.match(scrollResult.log[0], /^rn2\(46\)=/, spelling);
        assert.equal(scrollResult.item.cls, 'scroll', spelling);
        assert.equal(scrollResult.item.glyph, '?', spelling);
        assert.equal(scrollResult.item.scrollIndex, 14, spelling);
        assert.equal(scrollResult.item.actualKind, 'scroll of magic mapping', spelling);
        assert.equal(scrollResult.item.kind, 'scroll labeled ELAM EBOW', spelling);
        assert.match(scrollResult.item.line, /scroll labeled ELAM EBOW/, spelling);
        assert.equal(game._command_mode, null, spelling);
        assert.equal(game._wish_tries, 0, spelling);
        assert.equal(game.u.uconduct?.wishes, 1, spelling);

        const spellbookResult = await wishedLabeledObject(`spellbook ${spelling} ragged`, () => {
            game._object_descriptions = {
                spellbooks: Array.from({ length: 41 }, (_, i) => `spellbook label ${i}`),
                spellbookColors: Array.from({ length: 41 }, () => 7),
            };
            game._object_descriptions.spellbooks[1] = 'ragged';
        });
        assert.match(spellbookResult.log[0], /^rn2\(46\)=/, spelling);
        assert.equal(spellbookResult.item.cls, 'spellbook', spelling);
        assert.equal(spellbookResult.item.glyph, '+', spelling);
        assert.equal(spellbookResult.item.spellbookIndex, 1, spelling);
        assert.equal(spellbookResult.item.spellName, 'magic missile', spelling);
        assert.equal(spellbookResult.item.appearance, 'ragged', spelling);
        assert.match(spellbookResult.item.line, /ragged spellbook/, spelling);
        assert.equal(game._command_mode, null, spelling);
        assert.equal(game._wish_tries, 0, spelling);
        assert.equal(game.u.uconduct?.wishes, 1, spelling);
    }
});

test('unknown labeled wished scrolls and spellbooks fall back to random class creation', async () => {
    async function wishedUnknownLabel(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const scrollResult = await wishedUnknownLabel('scroll labeled "NOT A REAL LABEL"');
    assert.match(scrollResult.log[0], /^rnd\(1000\)=/);
    assert.equal(scrollResult.item.cls, 'scroll');
    assert.equal(scrollResult.item.glyph, '?');
    assert.notEqual(scrollResult.item.scrollIndex, -1);
    assert.notEqual(scrollResult.item.actualKind, 'scroll');
    assert.doesNotMatch(scrollResult.item.line, /scroll of scroll/);
    assert.equal(game._command_mode, null);
    assert.equal(game._wish_tries, 0);
    assert.equal(game.u.uconduct?.wishes, 1);

    const spellbookResult = await wishedUnknownLabel('spellbook labelled "NOT A REAL LABEL"');
    assert.match(spellbookResult.log[0], /^rnd\(1000\)=/);
    assert.equal(spellbookResult.item.cls, 'spellbook');
    assert.equal(spellbookResult.item.glyph, '+');
    assert.notEqual(spellbookResult.item.spellbookIndex, -1);
    assert.notEqual(spellbookResult.item.kind, 'spellbook of spellbook');
    assert.doesNotMatch(spellbookResult.item.line, /spellbook of spellbook/);
    assert.equal(game._command_mode, null);
    assert.equal(game._wish_tries, 0);
    assert.equal(game.u.uconduct?.wishes, 1);
});

test('unresolved called range bases try C base namedesc before class fallback', async () => {
    async function wishedUnresolvedCalledRange(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    for (const [wish, firstRoll, cls, glyph, allowed] of [
        ['bag called plaid', /^rn2\(84\)=/, 'tool', '(', new Set([SACK, OILSKIN_SACK, BAG_OF_HOLDING, BAG_OF_TRICKS])],
        ['lamp called magic', /^rn2\(62\)=/, 'tool', '(', new Set([OIL_LAMP])],
        ['candle called wax', /^rn2\(27\)=/, 'tool', '(', new Set([TALLOW_CANDLE, WAX_CANDLE])],
        ['horn called brass', /^rn2\(15\)=/, 'tool', '(', new Set([TOOLED_HORN, FROST_HORN, FIRE_HORN, HORN_OF_PLENTY])],
        ['boots called speed', /^rnd\(1000\)=/, 'armor', '[', null],
        ['shoes called iron', /^rnd\(1000\)=/, 'armor', '[', null],
        ['sword called long', /^rnd\(1002\)=/, 'weapon', ')', null],
    ]) {
        const result = await wishedUnresolvedCalledRange(wish);
        assert.match(result.log[0], firstRoll, wish);
        assert.equal(result.item.cls, cls, wish);
        assert.equal(result.item.glyph, glyph, wish);
        if (allowed) assert.ok(allowed.has(result.item.otyp), `${wish} produced ${result.item.otyp}`);
        assert.equal(result.item.quan, 1, wish);
        assert.equal(game._command_mode, null, wish);
        assert.equal(game._wish_tries, 0, wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

test('wished shoes range uses C low and iron shoe candidates', async () => {
    async function wishedShoes(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    let result = await wishedShoes('shoes', 1);
    assert.equal(result.item.otyp, LOW_BOOTS);
    assert.equal(result.item.kind, 'low boots');
    assert.equal(result.item.actualKind, 'low boots');
    assert.equal(result.item.appearance, 'walking shoes');
    assert.equal(result.item.quan, 1);
    assert.equal(result.item.owt, 10);
    assert.equal(shop.shopBaseCost(result.item), 8);
    assert.match(result.item.line, /a pair of walking shoes/);
    assert.match(result.log[0], /^rnd\(30\)=/);

    result = await wishedShoes('shoes', 7);
    assert.equal(result.item.otyp, IRON_SHOES);
    assert.equal(result.item.kind, 'iron shoes');
    assert.equal(result.item.actualKind, 'iron shoes');
    assert.equal(result.item.appearance, 'hard shoes');
    assert.equal(result.item.quan, 1);
    assert.equal(result.item.owt, 50);
    assert.equal(shop.shopBaseCost(result.item), 16);
    assert.match(result.item.line, /a pair of hard shoes/);
    assert.match(result.log[0], /^rnd\(30\)=/);

    result = await wishedShoes('low boots');
    assert.equal(result.item.otyp, LOW_BOOTS);
    assert.match(result.item.line, /a pair of walking shoes/);
    assert.match(result.log[0], /^rn2\(24\)=/);

    result = await wishedShoes('hard shoes');
    assert.equal(result.item.otyp, IRON_SHOES);
    assert.match(result.item.line, /a pair of hard shoes/);
    assert.match(result.log[0], /^rn2\(8\)=/);

    result = await wishedShoes('2 pairs of shoes', 7);
    assert.equal(result.item.otyp, IRON_SHOES);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a pair of hard shoes/);
    assert.match(result.log[0], /^rnd\(30\)=/);
});

test('wished boots range uses full C boot candidates', async () => {
    async function wishedBoots(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const cases = [
        [3, 'rnd(128)=12', LOW_BOOTS, 'low boots', 'walking shoes', 10, 8],
        [18, 'rnd(128)=29', IRON_SHOES, 'iron shoes', 'hard shoes', 50, 16],
        [6, 'rnd(128)=42', HIGH_BOOTS, 'high boots', 'jackboots', 20, 12],
        [1, 'rnd(128)=46', SPEED_BOOTS, 'speed boots', 'combat boots', 20, 50],
        [20, 'rnd(128)=58', WATER_WALKING_BOOTS, 'water walking boots', 'jungle boots', 15, 50],
        [7, 'rnd(128)=78', JUMPING_BOOTS, 'jumping boots', 'hiking boots', 20, 50],
        [9, 'rnd(128)=86', ELVEN_BOOTS, 'elven boots', 'mud boots', 15, 8],
        [2, 'rnd(128)=94', KICKING_BOOTS, 'kicking boots', 'buckled boots', 50, 8],
        [8, 'rnd(128)=110', FUMBLE_BOOTS, 'fumble boots', 'riding boots', 20, 30],
        [5, 'rnd(128)=125', LEVITATION_BOOTS, 'levitation boots', 'snow boots', 15, 30],
    ];

    for (const [seed, firstRoll, otyp, kind, appearance, weight, cost] of cases) {
        const result = await wishedBoots('boots', seed);
        assert.equal(result.log[0], firstRoll, kind);
        assert.equal(result.item.otyp, otyp, kind);
        assert.equal(result.item.cls, 'armor', kind);
        assert.equal(result.item.kind, kind);
        assert.equal(result.item.actualKind, kind);
        assert.equal(result.item.quan, 1, kind);
        assert.equal(result.item.owt, weight, kind);
        assert.equal(shop.shopBaseCost(result.item), cost, kind);
        assert.match(result.item.line, new RegExp(`a pair of ${appearance}`), kind);
    }

    let result = await wishedBoots('high boots');
    assert.equal(result.item.otyp, HIGH_BOOTS);
    assert.match(result.log[0], /^rn2\(15\)=/);
    assert.match(result.item.line, /a pair of jackboots/);

    for (const [wish, otyp, appearance] of [
        ['boots of speed', SPEED_BOOTS, 'combat boots'],
        ['water walking boots', WATER_WALKING_BOOTS, 'jungle boots'],
        ['boots of jumping', JUMPING_BOOTS, 'hiking boots'],
        ['elvish boots', ELVEN_BOOTS, 'mud boots'],
        ['buckled boots', KICKING_BOOTS, 'buckled boots'],
        ['snow boots', LEVITATION_BOOTS, 'snow boots'],
    ]) {
        result = await wishedBoots(wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.match(result.log[0], /^rn2\(13\)=/, wish);
        assert.match(result.item.line, new RegExp(`a pair of ${appearance}`), wish);
    }

    result = await wishedBoots('2 pairs of boots', 5);
    assert.equal(result.item.otyp, LEVITATION_BOOTS);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a pair of snow boots/);
    assert.equal(result.log[0], 'rnd(128)=125');
});

test('wished gloves and gauntlets ranges use C candidates', async () => {
    async function wishedGloves(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const rangeCases = [
        [1, 'rnd(39)=10', LEATHER_GLOVES, 'leather gloves', 'old gloves', 10, 8],
        [2, 'rnd(39)=17', GAUNTLETS_OF_FUMBLING, 'gauntlets of fumbling', 'padded gloves', 10, 50],
        [7, 'rnd(39)=29', GAUNTLETS_OF_POWER, 'gauntlets of power', 'riding gloves', 30, 50],
        [9, 'rnd(39)=35', GAUNTLETS_OF_DEXTERITY, 'gauntlets of dexterity', 'fencing gloves', 10, 50],
    ];

    for (const [seed, firstRoll, otyp, kind, appearance, weight, cost] of rangeCases) {
        const result = await wishedGloves('gloves', seed);
        assert.equal(result.log[0], firstRoll, kind);
        assert.equal(result.item.otyp, otyp, kind);
        assert.equal(result.item.cls, 'armor', kind);
        assert.equal(result.item.kind, kind);
        assert.equal(result.item.actualKind, kind);
        assert.equal(result.item.quan, 1, kind);
        assert.equal(result.item.owt, weight, kind);
        assert.equal(shop.shopBaseCost(result.item), cost, kind);
        assert.match(result.item.line, new RegExp(`a pair of ${appearance}`), kind);
    }

    let result = await wishedGloves('gauntlets', 1);
    assert.equal(result.log[0], 'rnd(39)=10');
    assert.equal(result.item.otyp, LEATHER_GLOVES);
    assert.match(result.item.line, /a pair of old gloves/);

    result = await wishedGloves('gauntlets', 9);
    assert.equal(result.log[0], 'rnd(39)=35');
    assert.equal(result.item.otyp, GAUNTLETS_OF_DEXTERITY);
    assert.match(result.item.line, /a pair of fencing gloves/);

    for (const [wish, otyp, namedesc, appearance] of [
        ['leather gloves', LEATHER_GLOVES, /^rn2\(16\)=/, 'old gloves'],
        ['old gloves', LEATHER_GLOVES, /^rn2\(16\)=/, 'old gloves'],
        ['gauntlets of fumbling', GAUNTLETS_OF_FUMBLING, /^rn2\(9\)=/, 'padded gloves'],
        ['padded gloves', GAUNTLETS_OF_FUMBLING, /^rn2\(9\)=/, 'padded gloves'],
        ['gloves of power', GAUNTLETS_OF_POWER, /^rn2\(9\)=/, 'riding gloves'],
        ['riding gloves', GAUNTLETS_OF_POWER, /^rn2\(9\)=/, 'riding gloves'],
        ['gauntlets of dexterity', GAUNTLETS_OF_DEXTERITY, /^rn2\(9\)=/, 'fencing gloves'],
        ['fencing gloves', GAUNTLETS_OF_DEXTERITY, /^rn2\(9\)=/, 'fencing gloves'],
    ]) {
        result = await wishedGloves(wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.match(result.log[0], namedesc, wish);
        assert.match(result.item.line, new RegExp(`a pair of ${appearance}`), wish);
    }

    result = await wishedGloves('gloves of ogre power');
    assert.equal(result.item.otyp, GAUNTLETS_OF_POWER);
    assert.ok(!result.log.some(entry => /^rn2\(9\)=/.test(entry)));
    assert.match(result.item.line, /a pair of riding gloves/);

    result = await wishedGloves('2 pairs of gloves', 9);
    assert.equal(result.item.otyp, GAUNTLETS_OF_DEXTERITY);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a pair of fencing gloves/);
    assert.equal(result.log[0], 'rnd(39)=35');

    result = await wishedGloves('2 pairs of gauntlets', 9);
    assert.equal(result.item.otyp, GAUNTLETS_OF_DEXTERITY);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a pair of fencing gloves/);
    assert.equal(result.log[0], 'rnd(39)=35');
});

test('wished cloak range uses C cloak candidates', async () => {
    async function wishedCloak(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const rangeCases = [
        [3, 'rnd(98)=2', ELVEN_CLOAK, 'elven cloak', 'faded pall', 10, 60],
        [9, 'rnd(98)=12', ORCISH_CLOAK, 'orcish cloak', 'coarse mantelet', 10, 40],
        [12, 'rnd(98)=20', DWARVISH_CLOAK, 'dwarvish cloak', 'hooded cloak', 10, 50],
        [6, 'rnd(98)=28', OILSKIN_CLOAK, 'oilskin cloak', 'slippery cloak', 10, 50],
        [4, 'rnd(98)=37', ROBE, 'robe', 'robe', 15, 50],
        [5, 'rnd(98)=41', ALCHEMY_SMOCK, 'alchemy smock', 'apron', 10, 50],
        [14, 'rnd(98)=53', LEATHER_CLOAK, 'leather cloak', 'leather cloak', 15, 40],
        [2, 'rnd(98)=58', CLOAK_OF_PROTECTION, 'cloak of protection', 'tattered cape', 10, 50],
        [1, 'rnd(98)=76', CLOAK_OF_INVISIBILITY, 'cloak of invisibility', 'opera cloak', 10, 60],
        [34, 'rnd(98)=86', CLOAK_OF_MAGIC_RESISTANCE, 'cloak of magic resistance', 'ornamental cope', 10, 60],
        [11, 'rnd(98)=93', CLOAK_OF_DISPLACEMENT, 'cloak of displacement', 'piece of cloth', 10, 50],
    ];

    for (const [seed, firstRoll, otyp, kind, display, weight, cost] of rangeCases) {
        const result = await wishedCloak('cloak', seed);
        assert.equal(result.log[0], firstRoll, kind);
        assert.equal(result.item.otyp, otyp, kind);
        assert.equal(result.item.cls, 'armor', kind);
        assert.equal(result.item.kind, kind);
        assert.equal(result.item.actualKind, kind);
        assert.equal(result.item.quan, 1, kind);
        assert.equal(result.item.owt, weight, kind);
        assert.equal(shop.shopBaseCost(result.item), cost, kind);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), kind);
    }

    for (const [wish, otyp, namedesc, display] of [
        ['mummy wrapping', MUMMY_WRAPPING, /^rn2\(1\)=/, 'mummy wrapping'],
        ['elven cloak', ELVEN_CLOAK, /^rn2\(9\)=/, 'faded pall'],
        ['faded pall', ELVEN_CLOAK, /^rn2\(9\)=/, 'faded pall'],
        ['dwarven cloak', DWARVISH_CLOAK, /^rn2\(9\)=/, 'hooded cloak'],
        ['robe', ROBE, /^rn2\(7\)=/, 'robe'],
        ['alchemy smock', ALCHEMY_SMOCK, /^rn2\(12\)=/, 'apron'],
        ['apron', ALCHEMY_SMOCK, /^rn2\(12\)=/, 'apron'],
        ['cloak of protection', CLOAK_OF_PROTECTION, /^rn2\(12\)=/, 'tattered cape'],
        ['protection cloak', CLOAK_OF_PROTECTION, /^rn2\(12\)=/, 'tattered cape'],
        ['cloak of invisibility', CLOAK_OF_INVISIBILITY, /^rn2\(13\)=/, 'opera cloak'],
        ['invisibility cloak', CLOAK_OF_INVISIBILITY, /^rn2\(13\)=/, 'opera cloak'],
        ['cloak of magic resistance', CLOAK_OF_MAGIC_RESISTANCE, /^rn2\(7\)=/, 'ornamental cope'],
        ['magic resistance cloak', CLOAK_OF_MAGIC_RESISTANCE, /^rn2\(7\)=/, 'ornamental cope'],
        ['cloak of displacement', CLOAK_OF_DISPLACEMENT, /^rn2\(13\)=/, 'piece of cloth'],
        ['piece of cloth', CLOAK_OF_DISPLACEMENT, /^rn2\(13\)=/, 'piece of cloth'],
    ]) {
        const result = await wishedCloak(wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.match(result.log[0], namedesc, wish);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), wish);
    }

    const result = await wishedCloak('2 cloaks', 11);
    assert.equal(result.item.otyp, CLOAK_OF_DISPLACEMENT);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a piece of cloth/);
    assert.equal(result.log[0], 'rnd(98)=93');
});

test('wished shield range uses C shield candidates', async () => {
    async function wishedShield(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const rangeCases = [
        [10, 'rnd(50)=5', SMALL_SHIELD, 'small shield', 'wooden shield', 30, 3],
        [4, 'rnd(50)=9', SHIELD_OF_DRAIN_RESISTANCE, 'shield of drain resistance', 'wooden shield', 30, 50],
        [6, 'rnd(50)=20', SHIELD_OF_SHOCK_RESISTANCE, 'shield of shock resistance', 'wooden shield', 30, 50],
        [3, 'rnd(50)=32', ELVEN_SHIELD, 'elven shield', 'blue and green shield', 40, 7],
        [2, 'rnd(50)=34', URUK_HAI_SHIELD, 'uruk-hai shield', 'white-handed shield', 50, 7],
        [20, 'rnd(50)=36', ORCISH_SHIELD, 'orcish shield', 'red-eyed shield', 50, 7],
        [22, 'rnd(50)=39', LARGE_SHIELD, 'large shield', 'large shield', 100, 10],
        [11, 'rnd(50)=41', DWARVISH_ROUNDSHIELD, 'dwarvish roundshield', 'large round shield', 100, 10],
        [1, 'rnd(50)=46', SHIELD_OF_REFLECTION, 'shield of reflection', 'polished silver shield', 50, 50],
    ];

    for (const [seed, firstRoll, otyp, kind, display, weight, cost] of rangeCases) {
        const result = await wishedShield('shield', seed);
        assert.equal(result.log[0], firstRoll, kind);
        assert.equal(result.item.otyp, otyp, kind);
        assert.notEqual(result.item.otyp, ARMOR_CLASS, kind);
        assert.equal(result.item.cls, 'armor', kind);
        assert.equal(result.item.kind, kind);
        assert.equal(result.item.actualKind, kind);
        assert.equal(result.item.quan, 1, kind);
        assert.equal(result.item.owt, weight, kind);
        assert.equal(shop.shopBaseCost(result.item), cost, kind);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), kind);
    }

    for (const [wish, otyp, namedesc, display] of [
        ['small shield', SMALL_SHIELD, /^rn2\(7\)=/, 'wooden shield'],
        ['shield of drain resistance', SHIELD_OF_DRAIN_RESISTANCE, /^rn2\(13\)=/, 'wooden shield'],
        ['shield called drain resistance', SHIELD_OF_DRAIN_RESISTANCE, /^rn2\(13\)=/, 'wooden shield'],
        ['drain resistance shield', SHIELD_OF_DRAIN_RESISTANCE, /^rn2\(13\)=/, 'wooden shield'],
        ['shield of shock resistance', SHIELD_OF_SHOCK_RESISTANCE, /^rn2\(13\)=/, 'wooden shield'],
        ['shock resistance shield', SHIELD_OF_SHOCK_RESISTANCE, /^rn2\(13\)=/, 'wooden shield'],
        ['elven shield', ELVEN_SHIELD, /^rn2\(3\)=/, 'blue and green shield'],
        ['elvish shield', ELVEN_SHIELD, /^rn2\(3\)=/, 'blue and green shield'],
        ['blue and green shield', ELVEN_SHIELD, /^rn2\(3\)=/, 'blue and green shield'],
        ['Uruk hai shield', URUK_HAI_SHIELD, /^rn2\(3\)=/, 'white-handed shield'],
        ['white-handed shield', URUK_HAI_SHIELD, /^rn2\(3\)=/, 'white-handed shield'],
        ['red-eyed shield', ORCISH_SHIELD, /^rn2\(3\)=/, 'red-eyed shield'],
        ['large shield', LARGE_SHIELD, /^rn2\(5\)=/, 'large shield'],
        ['dwarven round shield', DWARVISH_ROUNDSHIELD, /^rn2\(4\)=/, 'large round shield'],
        ['large round shield', DWARVISH_ROUNDSHIELD, /^rn2\(4\)=/, 'large round shield'],
        ['shield of reflection', SHIELD_OF_REFLECTION, /^rn2\(8\)=/, 'polished silver shield'],
        ['shield called reflection', SHIELD_OF_REFLECTION, /^rn2\(8\)=/, 'polished silver shield'],
        ['reflection shield', SHIELD_OF_REFLECTION, /^rn2\(8\)=/, 'polished silver shield'],
        ['polished silver shield', SHIELD_OF_REFLECTION, /^rn2\(8\)=/, 'polished silver shield'],
    ]) {
        const result = await wishedShield(wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.match(result.log[0], namedesc, wish);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), wish);
    }

    for (const [wish, seed, firstRoll, otyp, display] of [
        ['wooden shield', 14, 'rn2(33)=0', SMALL_SHIELD, 'wooden shield'],
        ['wooden shield', 7, 'rn2(33)=7', SHIELD_OF_DRAIN_RESISTANCE, 'wooden shield'],
        ['wooden shield', 13, 'rn2(33)=20', SHIELD_OF_SHOCK_RESISTANCE, 'wooden shield'],
    ]) {
        const result = await wishedShield(wish, seed);
        assert.equal(result.log[0], firstRoll, `${wish} seed ${seed}`);
        assert.equal(result.item.otyp, otyp, `${wish} seed ${seed}`);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), `${wish} seed ${seed}`);
    }

    for (const wish of ['smooth shield', 'silver shield']) {
        const result = await wishedShield(wish);
        assert.equal(result.item.otyp, SHIELD_OF_REFLECTION, wish);
        assert.ok(!result.log.some(entry => /^rn2\(8\)=/.test(entry)), wish);
        assert.match(result.item.line, /a polished silver shield/, wish);
    }

    const result = await wishedShield('2 shields', 1);
    assert.equal(result.item.otyp, SHIELD_OF_REFLECTION);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a polished silver shield/);
    assert.equal(result.log[0], 'rnd(50)=46');
});

test('wished hat range uses C hat candidates', async () => {
    async function wishedHat(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const rangeCases = [
        [2, 'rnd(10)=4', CORNUTHAUM, 'cornuthaum', 'conical hat', 4, 80],
        [1, 'rnd(10)=6', DUNCE_CAP, 'dunce cap', 'conical hat', 4, 1],
    ];

    for (const [seed, firstRoll, otyp, kind, display, weight, cost] of rangeCases) {
        const result = await wishedHat('hat', seed);
        assert.equal(result.log[0], firstRoll, kind);
        assert.equal(result.item.otyp, otyp, kind);
        assert.notEqual(result.item.otyp, FEDORA, kind);
        assert.notEqual(result.item.otyp, ARMOR_CLASS, kind);
        assert.equal(result.item.cls, 'armor', kind);
        assert.equal(result.item.kind, kind);
        assert.equal(result.item.actualKind, kind);
        assert.equal(result.item.quan, 1, kind);
        assert.equal(result.item.owt, weight, kind);
        assert.equal(shop.shopBaseCost(result.item), cost, kind);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), kind);
    }

    for (const [wish, otyp, namedesc, display, weight, cost] of [
        ['fedora', FEDORA, /^rn2\(1\)=/, 'fedora', 3, 1],
        ['cornuthaum', CORNUTHAUM, /^rn2\(6\)=/, 'conical hat', 4, 80],
        ['dunce cap', DUNCE_CAP, /^rn2\(6\)=/, 'conical hat', 4, 1],
    ]) {
        const result = await wishedHat(wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.match(result.log[0], namedesc, wish);
        assert.equal(result.item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(result.item), cost, wish);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), wish);
    }

    for (const [wish, seed, firstRoll, otyp] of [
        ['conical hat', 2, 'rn2(12)=1', CORNUTHAUM],
        ['conical hat', 1, 'rn2(12)=9', DUNCE_CAP],
    ]) {
        const result = await wishedHat(wish, seed);
        assert.equal(result.log[0], firstRoll, `${wish} seed ${seed}`);
        assert.equal(result.item.otyp, otyp, `${wish} seed ${seed}`);
        assert.match(result.item.line, /a conical hat/, `${wish} seed ${seed}`);
    }

    let result = await wishedHat('2 hats', 1);
    assert.equal(result.item.otyp, DUNCE_CAP);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a conical hat/);
    assert.equal(result.log[0], 'rnd(10)=6');

    for (const wish of ['wizard cap', 'wizzard cap']) {
        result = await wishedHat(wish);
        assert.equal(result.item, undefined, wish);
        assert.match(game._pending_message, /Nothing fitting that description exists in the game\./, wish);
    }
});

test('wished helm range uses C helm candidates', async () => {
    async function wishedHelm(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    const rangeCases = [
        [6, 'rnd(66)=4', ELVEN_LEATHER_HELM, 'elven leather helm', 'leather hat', 3, 8],
        [7, 'rnd(66)=8', ORCISH_HELM, 'orcish helm', 'iron skull cap', 30, 10],
        [5, 'rnd(66)=17', DWARVISH_IRON_HELM, 'dwarvish iron helm', 'hard hat', 40, 20],
        [1, 'rnd(66)=22', CORNUTHAUM, 'cornuthaum', 'conical hat', 4, 80],
        [3, 'rnd(66)=28', DUNCE_CAP, 'dunce cap', 'conical hat', 4, 1],
        [21, 'rnd(66)=29', DENTED_POT, 'dented pot', 'dented pot', 10, 8],
        [22, 'rnd(66)=33', HELM_OF_BRILLIANCE, 'helm of brilliance', 'crystal helmet', 40, 50],
        [4, 'rnd(66)=39', HELMET, 'helmet', 'plumed helmet', 30, 10],
        [33, 'rnd(66)=49', HELM_OF_CAUTION, 'helm of caution', 'etched helmet', 50, 50],
        [2, 'rnd(66)=56', HELM_OF_OPPOSITE_ALIGNMENT, 'helm of opposite alignment', 'crested helmet', 50, 50],
        [32, 'rnd(66)=63', HELM_OF_TELEPATHY, 'helm of telepathy', 'visored helmet', 50, 50],
    ];

    for (const [seed, firstRoll, otyp, kind, display, weight, cost] of rangeCases) {
        const result = await wishedHelm('helm', seed);
        assert.equal(result.log[0], firstRoll, kind);
        assert.equal(result.item.otyp, otyp, kind);
        assert.notEqual(result.item.otyp, FEDORA, kind);
        assert.notEqual(result.item.otyp, ARMOR_CLASS, kind);
        assert.equal(result.item.cls, 'armor', kind);
        assert.equal(result.item.kind, kind);
        assert.equal(result.item.actualKind, kind);
        assert.equal(result.item.quan, 1, kind);
        assert.equal(result.item.owt, weight, kind);
        assert.equal(shop.shopBaseCost(result.item), cost, kind);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), kind);
    }

    for (const [wish, otyp, namedesc, display, weight, cost] of [
        ['elven leather helm', ELVEN_LEATHER_HELM, /^rn2\(7\)=/, 'leather hat', 3, 8],
        ['leather hat', ELVEN_LEATHER_HELM, /^rn2\(7\)=/, 'leather hat', 3, 8],
        ['orcish helm', ORCISH_HELM, /^rn2\(7\)=/, 'iron skull cap', 30, 10],
        ['iron skull cap', ORCISH_HELM, /^rn2\(7\)=/, 'iron skull cap', 30, 10],
        ['dwarvish iron helm', DWARVISH_IRON_HELM, /^rn2\(7\)=/, 'hard hat', 40, 20],
        ['hard hat', DWARVISH_IRON_HELM, /^rn2\(7\)=/, 'hard hat', 40, 20],
        ['dented pot', DENTED_POT, /^rn2\(3\)=/, 'dented pot', 10, 8],
        ['helm of brilliance', HELM_OF_BRILLIANCE, /^rn2\(7\)=/, 'crystal helmet', 40, 50],
        ['helmet of brilliance', HELM_OF_BRILLIANCE, /^rn2\(7\)=/, 'crystal helmet', 40, 50],
        ['crystal helmet', HELM_OF_BRILLIANCE, /^rn2\(7\)=/, 'crystal helmet', 40, 50],
        ['helmet', HELMET, /^rn2\(11\)=/, 'plumed helmet', 30, 10],
        ['plumed helmet', HELMET, /^rn2\(11\)=/, 'plumed helmet', 30, 10],
        ['helm of caution', HELM_OF_CAUTION, /^rn2\(7\)=/, 'etched helmet', 50, 50],
        ['helmet of caution', HELM_OF_CAUTION, /^rn2\(7\)=/, 'etched helmet', 50, 50],
        ['etched helmet', HELM_OF_CAUTION, /^rn2\(7\)=/, 'etched helmet', 50, 50],
        ['helm of opposite alignment', HELM_OF_OPPOSITE_ALIGNMENT, /^rn2\(11\)=/, 'crested helmet', 50, 50],
        ['helmet of opposite alignment', HELM_OF_OPPOSITE_ALIGNMENT, /^rn2\(11\)=/, 'crested helmet', 50, 50],
        ['crested helmet', HELM_OF_OPPOSITE_ALIGNMENT, /^rn2\(11\)=/, 'crested helmet', 50, 50],
        ['helm of telepathy', HELM_OF_TELEPATHY, /^rn2\(5\)=/, 'visored helmet', 50, 50],
        ['helmet of telepathy', HELM_OF_TELEPATHY, /^rn2\(5\)=/, 'visored helmet', 50, 50],
        ['visored helmet', HELM_OF_TELEPATHY, /^rn2\(5\)=/, 'visored helmet', 50, 50],
    ]) {
        const result = await wishedHelm(wish);
        assert.equal(result.item.otyp, otyp, wish);
        assert.match(result.log[0], namedesc, wish);
        assert.equal(result.item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(result.item), cost, wish);
        assert.match(result.item.line, new RegExp(`a(?:n)? ${display}`), wish);
    }

    for (const wish of ['helm of esp', 'helmet of esp', 'kabuto']) {
        const result = await wishedHelm(wish);
        assert.equal(result.item.otyp, wish === 'kabuto' ? HELMET : HELM_OF_TELEPATHY, wish);
        if (wish !== 'kabuto')
            assert.ok(!result.log.some(entry => entry.startsWith('rn2(5)=')), wish);
    }

    const result = await wishedHelm('2 helms', 32);
    assert.equal(result.item.otyp, HELM_OF_TELEPATHY);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a visored helmet/);
    assert.equal(result.log[0], 'rnd(66)=63');

    const pluralExact = await wishedHelm('helmets');
    assert.equal(pluralExact.item.otyp, HELMET);
    assert.equal(pluralExact.item.quan, 1);
    assert.match(pluralExact.item.line, /a plumed helmet/);
    assert.match(pluralExact.log[0], /^rn2\(11\)=/);

    const calledHelmet = await wishedHelm('helmet called telepathy');
    assert.equal(calledHelmet.item.otyp, HELMET);
    assert.equal(calledHelmet.item.quan, 1);
    assert.match(calledHelmet.item.line, /a plumed helmet/);
    assert.match(calledHelmet.log[0], /^rn2\(11\)=/);
});

test('wished shirt range uses C Hawaiian and T-shirt candidates', async () => {
    async function wishedShirt(text, seed = 1) {
        installWishState(seed);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    let result = await wishedShirt('shirt', 1);
    assert.equal(result.item.otyp, HAWAIIAN_SHIRT);
    assert.equal(result.item.cls, 'armor');
    assert.equal(result.item.kind, 'Hawaiian shirt');
    assert.equal(result.item.actualKind, 'Hawaiian shirt');
    assert.equal(result.item.quan, 1);
    assert.equal(result.item.owt, 5);
    assert.equal(shop.shopBaseCost(result.item), 3);
    assert.match(result.item.line, /a Hawaiian shirt/);
    assert.match(result.log[0], /^rnd\(10\)=6$/);

    result = await wishedShirt('shirt', 4);
    assert.equal(result.item.otyp, T_SHIRT);
    assert.equal(result.item.cls, 'armor');
    assert.equal(result.item.kind, 'T-shirt');
    assert.equal(result.item.actualKind, 'T-shirt');
    assert.equal(result.item.quan, 1);
    assert.equal(result.item.owt, 5);
    assert.equal(shop.shopBaseCost(result.item), 2);
    assert.match(result.item.line, /a T-shirt/);
    assert.match(result.log[0], /^rnd\(10\)=9$/);

    result = await wishedShirt('Hawaiian shirt');
    assert.equal(result.item.otyp, HAWAIIAN_SHIRT);
    assert.match(result.item.line, /a Hawaiian shirt/);
    assert.match(result.log[0], /^rn2\(9\)=/);

    result = await wishedShirt('T-shirt');
    assert.equal(result.item.otyp, T_SHIRT);
    assert.match(result.item.line, /a T-shirt/);
    assert.match(result.log[0], /^rn2\(3\)=/);

    result = await wishedShirt('t shirt');
    assert.equal(result.item.otyp, T_SHIRT);
    assert.match(result.item.line, /a T-shirt/);
    assert.match(result.log[0], /^rn2\(3\)=/);

    result = await wishedShirt('tee shirt');
    assert.equal(result.item.otyp, T_SHIRT);
    assert.match(result.item.line, /a T-shirt/);
    assert.doesNotMatch(result.log[0], /^rn2\(3\)=/);

    result = await wishedShirt('2 shirts', 4);
    assert.equal(result.item.otyp, T_SHIRT);
    assert.equal(result.item.quan, 1);
    assert.doesNotMatch(result.item.line, /^a - 2 /);
    assert.match(result.item.line, /a T-shirt/);
    assert.match(result.log[0], /^rnd\(10\)=9$/);
});

test('dragon armor wishes follow C range and namedesc RNG paths', async () => {
    async function wishedDragon(text) {
        installWishState(1);
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish(text);
        return { item: game.inventory[0], log: [...getRngLog()] };
    }

    let result = await wishedDragon('dragon scales');
    assert.ok(DRAGON_SCALES_OTYPES.has(result.item.otyp), `dragon scales produced ${result.item.otyp}`);
    assert.equal(result.item.dragonArmorKind, 'scales');
    assert.match(result.log[0], /^rn2\(10\)=/);
    assert.ok(!result.log.some(entry => /^rn2\(67\)=/.test(entry)));

    result = await wishedDragon('dragon scale mail');
    assert.ok(DRAGON_SCALE_MAIL_OTYPES.has(result.item.otyp), `dragon scale mail produced ${result.item.otyp}`);
    assert.equal(result.item.dragonArmorKind, 'mail');
    assert.match(result.log[0], /^rn2\(10\)=/);
    assert.ok(!result.log.some(entry => /^rn2\(67\)=/.test(entry)));

    result = await wishedDragon('dragon scale armor');
    assert.ok(DRAGON_SCALE_MAIL_OTYPES.has(result.item.otyp), `dragon scale armor produced ${result.item.otyp}`);
    assert.equal(result.item.dragonArmorKind, 'mail');
    assert.match(result.log[0], /^rn2\(10\)=/);
    assert.ok(!result.log.some(entry => /^rn2\(67\)=/.test(entry)));

    result = await wishedDragon('red dragon scale mail');
    assert.equal(result.item.otyp, RED_DRAGON_SCALE_MAIL);
    assert.equal(result.item.kind, 'red dragon scale mail');
    assert.match(result.log[0], /^rn2\(67\)=/);

    result = await wishedDragon('red dragon scale armor');
    assert.equal(result.item.otyp, RED_DRAGON_SCALE_MAIL);
    assert.equal(result.item.kind, 'red dragon scale mail');
    assert.match(result.log[0], /^rn2\(67\)=/);
    assert.ok(!result.log.some(entry => /^rn2\(1\)=/.test(entry)));

    result = await wishedDragon('grey dragon scale mail');
    assert.equal(result.item.otyp, GRAY_DRAGON_SCALE_MAIL);
    assert.equal(result.item.kind, 'gray dragon scale mail');
    assert.match(result.log[0], /^rnd\(2\)=/);
    assert.ok(!result.log.some(entry => /^rn2\(67\)=/.test(entry)));

    result = await wishedDragon('grey dragon scale armor');
    assert.equal(result.item.otyp, GRAY_DRAGON_SCALE_MAIL);
    assert.equal(result.item.kind, 'gray dragon scale mail');
    assert.match(result.log[0], /^rnd\(2\)=/);
    assert.ok(!result.log.some(entry => /^rn2\(67\)=/.test(entry)));
});

test('generic wished lamp range substitutes magic lamp after C range roll outside wizard mode', async () => {
    const debugSeen = new Set();
    for (let seed = 1; seed <= 30; seed++) {
        installWishState(seed, { debug: true });
        beginWishDirectly();
        await submitWish('lamp');

        const item = game.inventory[0];
        assert.ok(new Set([OIL_LAMP, MAGIC_LAMP]).has(item.otyp), `lamp produced ${item.otyp}`);
        debugSeen.add(item.otyp);
    }
    assert.ok(debugSeen.has(OIL_LAMP), 'wizard-mode lamp range should include oil lamps');
    assert.ok(debugSeen.has(MAGIC_LAMP), 'wizard-mode lamp range should include magic lamps');

    for (let seed = 1; seed <= 30; seed++) {
        installWishState(seed, { debug: false });
        beginWishDirectly();
        await submitWish('lamp');

        const item = game.inventory[0];
        assert.equal(item.otyp, OIL_LAMP);
        assert.equal(item.kind, 'oil lamp');
        assert.notEqual(item.actualKind, 'magic lamp');
    }
});

test('generic wished sword range uses C rnd_class candidates', async () => {
    const allowed = new Set([
        SHORT_SWORD, ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD,
        SCIMITAR, SILVER_SABER, BROADSWORD, ELVEN_BROADSWORD, LONG_SWORD,
        TWO_HANDED_SWORD, KATANA,
    ]);
    const weights = new Map([
        [SHORT_SWORD, 30], [ELVEN_SHORT_SWORD, 30], [ORCISH_SHORT_SWORD, 30],
        [DWARVISH_SHORT_SWORD, 30], [SCIMITAR, 40], [SILVER_SABER, 40],
        [BROADSWORD, 70], [ELVEN_BROADSWORD, 70], [LONG_SWORD, 40],
        [TWO_HANDED_SWORD, 150], [KATANA, 40],
    ]);
    const seen = new Set();

    for (let seed = 1; seed <= 60; seed++) {
        installWishState(seed, { debug: false });
        beginWishDirectly();
        await submitWish('sword');

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.ok(allowed.has(item.otyp), `sword produced ${item.otyp}`);
        assert.notEqual(item.otyp, WEAPON_CLASS);
        assert.notEqual(item.kind, 'sword');
        assert.notEqual(item.actualKind, 'sword');
        assert.equal(item.owt, weights.get(item.otyp));
        seen.add(item.otyp);
    }

    assert.ok(seen.size > 1, 'sword should not collapse to one concrete object');
});

test('generic wished polearm range uses C uniform P_POLEARMS candidates', async () => {
    const allowed = new Set([
        PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD, BARDICHE,
        VOULGE, FAUCHARD, GUISARME, BILL_GUISARME, LUCERN_HAMMER,
        BEC_DE_CORBIN,
    ]);
    const weights = new Map([
        [PARTISAN, 80], [RANSEUR, 50], [SPETUM, 50], [GLAIVE, 75],
        [HALBERD, 150], [BARDICHE, 120], [VOULGE, 125], [FAUCHARD, 60],
        [GUISARME, 80], [BILL_GUISARME, 120], [LUCERN_HAMMER, 150],
        [BEC_DE_CORBIN, 100],
    ]);
    const seen = new Set();

    for (let seed = 1; seed <= 60; seed++) {
        installWishState(seed, { debug: false });
        enableRngLog({ reset: true });
        beginWishDirectly();
        await submitWish('polearm');

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.match(getRngLog()[0], /^rn2\(12\)=/);
        assert.ok(allowed.has(item.otyp), `polearm produced ${item.otyp}`);
        assert.notEqual(item.otyp, WEAPON_CLASS);
        assert.equal(item.cls, 'weapon');
        assert.equal(item.glyph, ')');
        assert.notEqual(item.kind, 'polearm');
        assert.notEqual(item.actualKind, 'polearm');
        assert.equal(item.known, false);
        assert.equal(item.owt, weights.get(item.otyp));
        seen.add(item.otyp);
    }

    assert.ok(seen.size > 1, 'polearm should not collapse to one concrete object');
});

test('wished camera tinning kit and grease use C charged-tool metadata rows', async () => {
    const cases = [
        ['uncursed expensive camera', EXPENSIVE_CAMERA, 'expensive camera', 30, 99, 12, 200],
        ['uncursed tinning kit', TINNING_KIT, 'tinning kit', 30, 99, 100, 30],
        ['uncursed can of grease', CAN_OF_GREASE, 'can of grease', 5, 25, 15, 20],
    ];

    for (const [wish, otyp, kind, minSpe, maxSpe, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.cls, 'tool');
        assert.equal(item.kind, kind);
        assert.equal(item.actualKind, kind);
        assert.equal(item.quan, 1);
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe);
        assert.equal(item.blessed, false);
        assert.equal(item.cursed, false);
        assert.equal(item.owt, weight);
        assert.equal(shop.shopBaseCost(item), cost);
    }
});

test('wish charge suffix applies through charged-tool metadata', async () => {
    const cases = [
        ['bag of tricks (1:3)', BAG_OF_TRICKS, 'bag of tricks', 'bag of tricks', 15],
        ['magic marker (1:3)', MAGIC_MARKER, 'magic marker', 'magic marker', 2],
        ['glass orb (1:3)', CRYSTAL_BALL, 'glass orb', 'crystal ball', 150],
        ['expensive camera (1:3)', EXPENSIVE_CAMERA, 'expensive camera', 'expensive camera', 12],
        ['tinning kit (1:3)', TINNING_KIT, 'tinning kit', 'tinning kit', 100],
        ['can of grease (1:3)', CAN_OF_GREASE, 'can of grease', 'can of grease', 15],
    ];

    for (const [wish, otyp, kind, actualKind, weight] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.actualKind, actualKind);
        assert.equal(item.spe, 3);
        assert.equal(item.recharged ?? 0, 0);
        assert.equal(item.owt, weight);
    }
});

test('plural wished camera tinning kit and grease remain one requested tool', async () => {
    const cases = [
        ['2 expensive cameras', EXPENSIVE_CAMERA, 'expensive camera', 12, 200],
        ['2 tinning kits', TINNING_KIT, 'tinning kit', 100, 30],
        ['2 cans of grease', CAN_OF_GREASE, 'can of grease', 15, 20],
    ];

    for (const [wish, otyp, kind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null);
        assert.equal(item.otyp, otyp);
        assert.equal(item.kind, kind);
        assert.equal(item.actualKind, kind);
        assert.equal(item.quan, 1);
        assert.equal(item.owt, weight);
        assert.equal(shop.shopBaseCost(item), cost);
        assert.match(item.line, new RegExp(kind));
        assert.doesNotMatch(item.line, /^a - 2 /);
    }
});

test('wished charged instruments use C object metadata rows', async () => {
    const cases = [
        ['magic flute', MAGIC_FLUTE, 'flute', 'magic flute', 4, 8, 5, 36],
        ['frost horn', FROST_HORN, 'horn', 'frost horn', 4, 8, 18, 50],
        ['fire horn', FIRE_HORN, 'horn', 'fire horn', 4, 8, 18, 50],
        ['magic harp', MAGIC_HARP, 'harp', 'magic harp', 4, 8, 30, 50],
        ['drum of earthquake', DRUM_OF_EARTHQUAKE, 'drum', 'drum of earthquake', 4, 8, 25, 25],
        ['horn of plenty', HORN_OF_PLENTY, 'horn', 'horn of plenty', 3, 20, 18, 50],
    ];

    for (const [wish, otyp, kind, actualKind, minSpe, maxSpe, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.cls, 'tool', wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.quan, 1, wish);
        assert.ok(item.spe >= minSpe && item.spe <= maxSpe, wish);
        assert.equal(item.known, false, wish);
        assert.equal(item.blessed, false, wish);
        assert.equal(item.cursed, false, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
        assert.match(item.line, new RegExp(kind), wish);
    }
});

test('wish charge suffix applies through charged instrument metadata', async () => {
    const cases = [
        ['magic flute (1:3)', MAGIC_FLUTE, 'flute', 'magic flute', 5, 36],
        ['frost horn (1:3)', FROST_HORN, 'horn', 'frost horn', 18, 50],
        ['fire horn (1:3)', FIRE_HORN, 'horn', 'fire horn', 18, 50],
        ['magic harp (1:3)', MAGIC_HARP, 'harp', 'magic harp', 30, 50],
        ['drum of earthquake (1:3)', DRUM_OF_EARTHQUAKE, 'drum', 'drum of earthquake', 25, 25],
        ['horn of plenty (1:3)', HORN_OF_PLENTY, 'horn', 'horn of plenty', 18, 50],
    ];

    for (const [wish, otyp, kind, actualKind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.spe, 3, wish);
        assert.equal(item.recharged ?? 0, 0, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
    }
});

test('plural wished charged instruments remain one requested tool', async () => {
    const cases = [
        ['2 magic flutes', MAGIC_FLUTE, 'flute', 'magic flute', 5, 36],
        ['2 frost horns', FROST_HORN, 'horn', 'frost horn', 18, 50],
        ['2 fire horns', FIRE_HORN, 'horn', 'fire horn', 18, 50],
        ['2 magic harps', MAGIC_HARP, 'harp', 'magic harp', 30, 50],
        ['2 drums of earthquake', DRUM_OF_EARTHQUAKE, 'drum', 'drum of earthquake', 25, 25],
        ['2 horns of plenty', HORN_OF_PLENTY, 'horn', 'horn of plenty', 18, 50],
    ];

    for (const [wish, otyp, kind, actualKind, weight, cost] of cases) {
        installWishState(3, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.equal(item.kind, kind, wish);
        assert.equal(item.actualKind, actualKind, wish);
        assert.equal(item.quan, 1, wish);
        assert.equal(item.owt, weight, wish);
        assert.equal(shop.shopBaseCost(item), cost, wish);
        assert.match(item.line, new RegExp(kind), wish);
        assert.doesNotMatch(item.line, /^a - 2 /, wish);
    }
});

test('empty wished horn of plenty zeroes charges after charge suffix parsing', async () => {
    installWishState(3, { debug: false });
    beginWishDirectly();
    await submitWish('empty horn of plenty (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].otyp, HORN_OF_PLENTY);
    assert.equal(game.inventory[0].actualKind, 'horn of plenty');
    assert.equal(game.inventory[0].spe, 0);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
});

test('normal-mode wished wand of wishing ignores requested abuse charges', async () => {
    installWishState(11, { debug: false });
    beginWishDirectly();
    await submitWish('wand of wishing (7:99)');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.cls, 'wand');
    assert.equal(item.wand, 'wishing');
    assert.ok(item.spe === -1 || item.spe === 0);
    assert.equal(item.recharged, 1);
    assert.notEqual(item.spe, 7);
});

test('wizard bell of opening wish follows C namedesc silver-bell path', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('Bell of Opening (1:3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].otyp, BELL);
    assert.equal(game.inventory[0].kind, 'silver bell');
    assert.equal(game.inventory[0].actualKind, 'bell of opening');
    assert.equal(game.inventory[0].spe, 3);
    assert.equal(game.inventory[0].recharged ?? 0, 0);
    assert.equal(game.inventory[0].owt, 10);
    assert.equal(shop.shopBaseCost(game.inventory[0]), 5000);
    assert.notEqual(game.inventory[0].unique, true);
    assert.match(game.inventory[0].line, /silver bell/);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('silver bell wish resolves through Bell of Opening namedesc path in wizard mode', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('silver bell');

    const item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.otyp, BELL);
    assert.equal(item.kind, 'silver bell');
    assert.equal(item.actualKind, 'bell of opening');
    assert.equal(item.spe, 3);
    assert.equal(item.owt, 10);
    assert.equal(shop.shopBaseCost(item), 5000);
    assert.match(item.line, /silver bell/);
});

test('wizard wishes create real unique invocation candelabrum and book objects', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('Candelabrum of Invocation');

    assert.equal(game.inventory[0].actualKind, 'Candelabrum of Invocation');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'tool');

    installWishState();
    beginWishDirectly();
    await submitWish('Book of the Dead');

    assert.equal(game.inventory[0].actualKind, 'Book of the Dead');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'spellbook');
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('wizard description wishes create real unique candelabrum and book objects', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('candelabrum');

    assert.equal(game.inventory[0].otyp, CANDELABRUM_OF_INVOCATION);
    assert.equal(game.inventory[0].actualKind, 'Candelabrum of Invocation');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'tool');

    installWishState();
    beginWishDirectly();
    await submitWish('papyrus');

    assert.equal(game.inventory[0].otyp, BOOK_OF_THE_DEAD);
    assert.equal(game.inventory[0].actualKind, 'Book of the Dead');
    assert.equal(game.inventory[0].unique, true);
    assert.equal(game.inventory[0].cls, 'spellbook');
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('non-wizard unique description wishes use C substitutions', async () => {
    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('candelabrum');

    const candle = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.ok([TALLOW_CANDLE, WAX_CANDLE].includes(candle.otyp));
    assert.equal(candle.cls, 'tool');
    assert.match(candle.kind, /candle/);
    assert.notEqual(candle.actualKind, 'Candelabrum of Invocation');
    assert.equal(game.u.uconduct?.wishes, 1);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('papyrus');

    const book = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(book.cls, 'spellbook');
    assert.equal(book.kind, 'spellbook of blank paper');
    assert.notEqual(book.actualKind, 'Book of the Dead');
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
});

test('non-wizard exact unique and magic-lamp wishes use C substitutions', async () => {
    for (const wish of ['Candelabrum of Invocation']) {
        installWishState(7, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.ok([TALLOW_CANDLE, WAX_CANDLE].includes(item.otyp), wish);
        assert.match(item.kind, /candle/, wish);
        assert.notEqual(item.actualKind, 'Candelabrum of Invocation', wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
    }

    for (const wish of ['Book of the Dead']) {
        installWishState(7, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.cls, 'spellbook', wish);
        assert.equal(item.kind, 'spellbook of blank paper', wish);
        assert.notEqual(item.actualKind, 'Book of the Dead', wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
    }

    for (const wish of ['Bell of Opening', 'silver bell']) {
        installWishState(7, { debug: false });
        beginWishDirectly();
        await submitWish(wish);

        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, BELL, wish);
        assert.equal(item.kind, 'bell', wish);
        assert.notEqual(item.actualKind, 'bell of opening', wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
        assert.equal(game.u.uconduct?.wisharti || 0, 0, wish);
    }

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('magic lamp');
    assert.equal(game.inventory[0].kind, 'oil lamp');
    assert.notEqual(game.inventory[0].actualKind, 'magic lamp');
    assert.equal(game.u.uconduct?.wishes, 1);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('real Amulet of Yendor');
    assert.equal(game.inventory[0].fakeAmuletOfYendor, true);
    assert.equal(game.inventory[0].realAmuletOfYendor, undefined);
    assert.equal(game.u.uconduct?.wishes, 1);
});

test('wizard-only venom wishes follow C oc_nowish policy', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('splash of acid venom');

    let item = game.inventory[0];
    assert.equal(game._command_mode, null);
    assert.equal(item.cls, 'venom');
    assert.equal(item.kind, 'splash of acid venom');
    assert.equal(item.actualKind, 'splash of acid venom');
    assert.equal(item.spe, 1);
    assert.equal(item.owt, 1);
    assert.equal(game.u.uconduct?.wishes, 1);
    assert.equal(game.u.uconduct?.wisharti || 0, 0);
    assert.match(item.line, /^a - a splash of acid venom$/);

    installWishState();
    beginWishDirectly();
    await submitWish('acid venom');
    item = game.inventory[0];
    assert.equal(item.kind, 'splash of acid venom');
    assert.equal(item.glyph, '.');
    assert.equal(item.owt, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('venom');
    item = game.inventory[0];
    assert.equal(item.cls, 'venom');
    assert.ok(['splash of blinding venom', 'splash of acid venom'].includes(item.kind));
    assert.equal(item.spe, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('splash of venom');
    item = game.inventory[0];
    assert.equal(item.cls, 'venom');
    assert.ok(['splash of blinding venom', 'splash of acid venom'].includes(item.kind));
    assert.equal(item.quan, 1);
    assert.equal(item.spe, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('splashes of venom');
    item = game.inventory[0];
    assert.equal(item.cls, 'venom');
    assert.ok(['splash of blinding venom', 'splash of acid venom'].includes(item.kind));
    assert.equal(item.quan, 2);
    assert.equal(item.owt, 2);
    assert.match(item.line, /^a - 2 splashes of (?:blinding|acid) venom$/);

    installWishState();
    beginWishDirectly();
    await submitWish('splash of blinding venom');
    item = game.inventory[0];
    assert.equal(item.kind, 'splash of blinding venom');
    assert.equal(item.spe, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('blinding venom');
    item = game.inventory[0];
    assert.equal(item.kind, 'splash of blinding venom');
    assert.equal(item.spe, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('+7 venom');
    item = game.inventory[0];
    assert.equal(item.cls, 'venom');
    assert.equal(item.spe, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('venom (7)');
    item = game.inventory[0];
    assert.equal(item.cls, 'venom');
    assert.equal(item.spe, 1);

    installWishState();
    beginWishDirectly();
    await submitWish('venoms');
    item = game.inventory[0];
    assert.equal(item.cls, 'venom');
    assert.equal(item.quan, 2);
    assert.equal(item.owt, 2);
    assert.match(item.line, /^a - 2 splashes of (?:blinding|acid) venom$/);

    installWishState();
    beginWishDirectly();
    await submitWish('splashes of acid venom');
    item = game.inventory[0];
    assert.equal(item.kind, 'splash of acid venom');
    assert.equal(item.quan, 2);
    assert.equal(item.spe, 1);
    assert.match(item.line, /^a - 2 splashes of acid venom$/);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('splash of blinding venom');

    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game._wish_tries, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.match(game._pending_message, /Nothing fitting that description exists in the game\./);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('venom');

    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game._wish_tries, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('splash of venom');

    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game._wish_tries, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);

    installWishState(7, { debug: false });
    beginWishDirectly();
    await submitWish('venoms');

    assert.equal(game._command_mode, 'wizardWish');
    assert.equal(game._wish_tries, 1);
    assert.equal(game.inventory.length, 0);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
});

test('figurine wishes apply C monster-type restrictions', async () => {
    installWishState(11);
    beginWishDirectly();
    await submitWish('figurine of newt');
    let item = game.inventory[0];
    assert.equal(item.otyp, FIGURINE);
    assert.equal(item.kind, 'figurine');
    assert.equal(item.corpsenm?.name, 'newt');
    assert.equal(game.u.uconduct?.wishes, 1);

    installWishState(11);
    beginWishDirectly();
    await submitWish('figurine of werewolf');
    item = game.inventory[0];
    assert.equal(item.otyp, FIGURINE);
    assert.equal(item.corpsenm?.name, 'werewolf');
    assert.equal(item.corpsenm?.wereBeast, true);

    installWishState(11);
    beginWishDirectly();
    await submitWish('figurine of human werewolf');
    item = game.inventory[0];
    assert.equal(item.otyp, FIGURINE);
    assert.equal(item.corpsenm?.name, 'werewolf');
    assert.equal(item.corpsenm?.wereHuman, true);

    for (const wish of [
        'figurine of human',
        'figurine of soldier',
        'figurine of mail daemon',
        'figurine of Wizard of Yendor',
        'figurine of Medusa',
        'figurine of student',
    ]) {
        installWishState(11);
        beginWishDirectly();
        await submitWish(wish);
        item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, FIGURINE, wish);
        assert.equal(item.kind, 'figurine', wish);
        assert.ok(item.corpsenm?.name, wish);
        assert.notEqual(item.corpsenm.name.toLowerCase(), wish.replace(/^figurine of /, '').toLowerCase(), wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

test('corpse and tin wishes apply C non-figurine wereform conversion', async () => {
    installWishState(11);
    beginWishDirectly();
    await submitWish('corpse of werewolf');
    let item = game.inventory[0];
    assert.equal(item.otyp, CORPSE);
    assert.equal(item.corpsenm?.name, 'werewolf');
    assert.equal(item.corpsenm?.wereHuman, true);
    assert.notEqual(item.corpsenm?.wereBeast, true);
    assert.notEqual(item.corpsenm?.noCorpse, true);

    installWishState(11);
    beginWishDirectly();
    await submitWish('tin of werewolf meat');
    item = game.inventory[0];
    assert.equal(item.otyp, TIN);
    assert.equal(item.corpsenm?.name, 'werewolf');
    assert.equal(item.corpsenm?.wereHuman, true);
    assert.notEqual(item.corpsenm?.wereBeast, true);
    assert.notEqual(item.corpsenm?.noCorpse, true);
});

test('disallowed corpse and tin species preserve randomized fallback objects', async () => {
    for (const [wish, otyp, rejectedName] of [
        ['corpse of mail daemon', CORPSE, 'mail daemon'],
        ['corpse of Medusa', CORPSE, 'medusa'],
        ['tin of mail daemon meat', TIN, 'mail daemon'],
        ['tin of Medusa meat', TIN, 'medusa'],
    ]) {
        installWishState(23, { debug: false });
        beginWishDirectly();
        await submitWish(wish);
        const item = game.inventory[0];
        assert.equal(game._command_mode, null, wish);
        assert.equal(item.otyp, otyp, wish);
        assert.notEqual(item.corpsenm?.name?.toLowerCase(), rejectedName, wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

test('statue wishes bind human unique and no-corpse monsters like C', async () => {
    for (const [wish, monsterName] of [
        ['statue of human', 'human'],
        ['statue of mail daemon', 'mail daemon'],
        ['statue of Wizard of Yendor', 'Wizard of Yendor'],
    ]) {
        installWishState(17, { debug: false });
        beginWishDirectly();
        await submitWish(wish);
        const item = game.inventory[0];
        assert.equal(item.otyp, STATUE, wish);
        assert.equal(item.corpsenm?.name, monsterName, wish);
        assert.equal(game.u.uconduct?.wishes, 1, wish);
    }
});

test('egg wishes use C hatchability mapping and clear generic hatch timers', async () => {
    installWishState(29);
    beginWishDirectly();
    await submitWish('egg of human');
    let item = game.inventory[0];
    assert.equal(item.otyp, EGG);
    assert.equal(item.corpsenm, null);
    assert.equal(item.eggHatchTurn, undefined);

    installWishState(29);
    beginWishDirectly();
    await submitWish('egg of Scorpius');
    item = game.inventory[0];
    assert.equal(item.otyp, EGG);
    assert.equal(item.corpsenm?.name, 'scorpion');
    assert.ok(item.eggHatchTurn > (game.moves || 0));

    installWishState(29);
    beginWishDirectly();
    await submitWish('egg of killer bee');
    item = game.inventory[0];
    assert.equal(item.otyp, EGG);
    assert.equal(item.corpsenm?.name, 'killer bee');
    assert.ok(item.eggHatchTurn > (game.moves || 0));

    installWishState(29);
    beginWishDirectly();
    await submitWish('egg of baby red dragon');
    item = game.inventory[0];
    assert.equal(item.otyp, EGG);
    assert.equal(item.corpsenm?.name, 'red dragon');
    assert.ok(item.eggHatchTurn > (game.moves || 0));
});

test('denied quest artifact wish records artifact conduct without ordinary wish conduct', async () => {
    installWishState(5, { debug: false });
    game._startup_role = 'Wizard';
    beginWishDirectly();
    await submitWish('The Eye of the Aethiopica');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory.length, 0);
    assert.match(game._pending_message, /For a moment, you feel something in your hands, but it disappears!/);
    assert.equal(game.u.uconduct?.wisharti, 1);
    assert.equal(game.u.uconduct?.wishes || 0, 0);
    assert.equal(game.u.ublesscnt, 0);
});

test('wished object finalization recomputes stack weight', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 daggers');

    assert.equal(game.inventory[0].kind, 'dagger');
    assert.equal(game.inventory[0].quan, 2);
    assert.equal(game.inventory[0].owt, 20);
});

test('wished lenses use C pair naming, weight, and cost', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('lenses');

    const item = game.inventory[0];
    assert.equal(item.kind, 'lenses');
    assert.equal(item.actualKind, 'lenses');
    assert.equal(item.quan, 1);
    assert.equal(item.owt, 3);
    assert.match(item.line, /a pair of lenses/);
    assert.match(game._pending_message, /a pair of lenses/);
    assert.equal(shop.shopBaseCost(item), 80);

    item.line = '';
    await rhack('i');
    const overlayText = (game._overlay_lines || []).map(line => line[2]).join('\n');
    assert.match(overlayText, /a pair of lenses/);
    assert.doesNotMatch(overlayText, /a lenses/);
});

test('pair of lenses wish remains one non-mergeable object', async () => {
    installWishState();
    beginWishDirectly();
    await submitWish('2 pair of lenses');

    const item = game.inventory[0];
    assert.equal(item.kind, 'lenses');
    assert.equal(item.actualKind, 'lenses');
    assert.equal(item.quan, 1);
    assert.match(item.line, /a pair of lenses/);
    assert.doesNotMatch(item.line, /2 lenses/);
});

test('signed wish charge suffix is invalid and stripped like C', async () => {
    installWishState(17);
    beginWishDirectly();
    await submitWish('magic marker');
    const generatedSpe = game.inventory[0].spe;

    installWishState(17);
    beginWishDirectly();
    await submitWish('magic marker (-3)');

    assert.equal(game._command_mode, null);
    assert.equal(game.inventory[0].kind, 'magic marker');
    assert.equal(game.inventory[0].spe, generatedSpe);
    assert.equal(game.inventory[0].cursed || false, false);
});

// C ref: src/hack.c:4313-4323 weight_cap() Upolyd branch — while polymorphed,
// carry capacity scales with the new form's body weight before the
// MAX_CARR_CAP clamp (seed0108 step 165: red dragon form, weight 938,
// C capacity 1000, so no encumbrance message after the chest wish).
test('polymorphed red dragon scales carry capacity by body weight', () => {
    const g = installWishState();
    g.u.acurr.a = [8, 18, 10, 18, 12, 9]; // base = 25*(8+12)+50 = 550
    g.u._polyself_form = { name: 'red dragon', mlet: 'D', strong: true };
    // strong && cwt 4500 (WT_DRAGON) > 1450 (WT_HUMAN): 550*4500/1450 -> clamp 1000
    assert.equal(heroCarryCapacity(), MAX_CARR_CAP);
});

test('polymorphed flesh golem keeps base capacity (strong, cwt <= WT_HUMAN)', () => {
    const g = installWishState();
    g.u.acurr.a = [8, 18, 10, 18, 12, 9];
    g.u._polyself_form = { name: 'flesh golem', mlet: "'", strong: true };
    assert.equal(heroCarryCapacity(), 550);
});

test('polymorphed stone golem scales capacity by golem body weight', () => {
    const g = installWishState();
    g.u.acurr.a = [8, 18, 10, 18, 12, 9];
    g.u._polyself_form = { name: 'stone golem', mlet: "'", strong: true };
    // strong && 1900 > 1450: trunc(550*1900/1450) = 720
    assert.equal(heroCarryCapacity(), 720);
});

test('unlisted weak polyself form leaves capacity unchanged', () => {
    const g = installWishState();
    g.u.acurr.a = [8, 18, 10, 18, 12, 9];
    g.u._polyself_form = { name: 'newt', mlet: ':' };
    // unknown forms default to WT_HUMAN: 550*1450/1450
    assert.equal(heroCarryCapacity(), 550);
});

test('nymph polyself form maxes carry capacity (S_NYMPH)', () => {
    const g = installWishState();
    g.u.acurr.a = [8, 18, 10, 18, 12, 9];
    g.u._polyself_form = { name: 'wood nymph', mlet: 'n' };
    assert.equal(heroCarryCapacity(), MAX_CARR_CAP);
});

test('carry capacity without a polyself form is the 25*(Str+Con)+50 base', () => {
    const g = installWishState();
    g.u.acurr.a = [8, 18, 10, 18, 12, 9];
    assert.equal(heroCarryCapacity(), 550);
});
