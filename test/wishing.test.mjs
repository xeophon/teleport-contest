import assert from 'node:assert/strict';
import test from 'node:test';

import { rhack, __shopBillingTestHooks as shop } from '../js/cmd.js';
import { game, resetGame } from '../js/gstate.js';
import {
    A_LAWFUL, ALTAR, Align2amask, BEAR_TRAP, CLOUD, CORR, DB_EAST, DB_FLOOR,
    DB_ICE, DB_LAVA, DB_MOAT, DB_UNDER, DOOR, DRAWBRIDGE_DOWN, D_BROKEN,
    D_CLOSED, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED, FOUNTAIN, F_LOOTED,
    GRAVE, HWALL, ICE, ICED_POOL, IRONBARS, LANDMINE, LAVAPOOL, LAVAWALL,
    MOAT, PIT, POOL, ROOM, SCORR, SDOOR, SINK, S_LDWASHER, S_LPUDDING,
    S_LRING, THRONE, TREE, TREE_LOOTED, TREE_SWARM, T_LOOTED, WATER,
} from '../js/const.js';
import { enableRngLog, getRngLog, initRng } from '../js/rng.js';
import { mksobj } from '../js/mklev.js';
import { currentFruitId, setCurrentFruitName } from '../js/fruit.js';

const BELL = 358;
const GOLD_PIECE = 466;
const WEAPON_CLASS = 1;
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
const IRON_SHOES = 10105;
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
