import assert from 'node:assert/strict';
import test from 'node:test';

// C ref: nethack-c/upstream/src/mkobj.c mksobj_init — charge and BUC roll
// order for TOOL_CLASS / AMULET_CLASS objects (mkobj.c:987-1069) and the
// shared blessorcurse (mkobj.c:1841-1854). Each mksobj() call first consumes
// rnd(2) for next_ident (mkobj.c:521), then the class-specific init rolls.
import { game, resetGame } from '../js/gstate.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { mksobj } from '../js/mklev.js';

const TOOL_CLASS = 12;
const AMULET_CLASS = 15;
const TALLOW_CANDLE = 370;
const WAX_CANDLE = 371;
const BRASS_LANTERN = 226;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const FIGURINE = 795;
const MAGIC_FLUTE = 946;
const FROST_HORN = 953;
const FIRE_HORN = 955;
const HORN_OF_PLENTY = 957;
const DRUM_OF_EARTHQUAKE = 975;
const BAG_OF_TRICKS = 10158; // note: collides with CHAIN_MAIL; see force flag
const MAGIC_HARP = 10169;
const TINNING_KIT = 10170;
const CAN_OF_GREASE = 10171;
const EXPENSIVE_CAMERA = 10082;
const MAGIC_MARKER = 10084;
const CRYSTAL_BALL = 10088;
const LOADSTONE = 10165;
const RUBY = 10070;

function callsFor(otyp, { seed = 9010, badAmulet = false, toolRoll = 0, forceBagOfTricks = false, init = true } = {}) {
    resetGame();
    initRng(seed);
    enableRngLog({ reset: true });
    game.moves = 100;
    if (badAmulet) game._mkobj_bad_amulet = true;
    if (toolRoll) game._mkobj_tool_roll = toolRoll;
    if (forceBagOfTricks) game._mkobj_force_bag_of_tricks = true;
    const before = getRngLog().length;
    const otmp = mksobj(otyp, init, false);
    const calls = getRngLog().slice(before).map(entry => {
        const m = entry.match(/^(\w+\(\d+\))=(\d+)$/);
        return { call: m[1], value: Number(m[2]) };
    });
    // mksobj always starts with next_ident's rnd(2) (C: mkobj.c:521)
    assert.equal(calls[0].call, 'rnd(2)', 'first mksobj roll must be next_ident rnd(2)');
    return { otmp, init: calls.slice(1) };
}

function signatures(calls) {
    return calls.map(c => c.call);
}

// mkobj.c:1038 — HORN_OF_PLENTY/BAG_OF_TRICKS: spe = rn1(18, 3) => 3..20
test('horn of plenty charges consume exactly rn2(18)', () => {
    const { otmp, init } = callsFor(HORN_OF_PLENTY);
    assert.deepEqual(signatures(init), ['rn2(18)']);
    assert.ok(otmp.spe >= 3 && otmp.spe <= 20, `spe ${otmp.spe} in 3..20`);
});

test('bag of tricks (forced past CHAIN_MAIL otyp collision) consumes exactly rn2(18)', () => {
    const { otmp, init } = callsFor(BAG_OF_TRICKS, { forceBagOfTricks: true });
    assert.deepEqual(signatures(init), ['rn2(18)']);
    assert.ok(otmp.spe >= 3 && otmp.spe <= 20, `spe ${otmp.spe} in 3..20`);
});

// mkobj.c:1056 — MAGIC_FLUTE/MAGIC_HARP/FROST_HORN/FIRE_HORN/
// DRUM_OF_EARTHQUAKE: spe = rn1(5, 4) => 4..8
test('charged instruments consume exactly rn2(5)', () => {
    for (const otyp of [MAGIC_FLUTE, MAGIC_HARP, FROST_HORN, FIRE_HORN, DRUM_OF_EARTHQUAKE]) {
        const { otmp, init } = callsFor(otyp);
        assert.deepEqual(signatures(init), ['rn2(5)'], `otyp ${otyp}`);
        assert.ok(otmp.spe >= 4 && otmp.spe <= 8, `otyp ${otyp} spe ${otmp.spe} in 4..8`);
    }
});

// mkobj.c:1026 — EXPENSIVE_CAMERA/TINNING_KIT/MAGIC_MARKER: spe = rn1(70, 30)
test('camera/tinning kit/magic marker consume exactly rn2(70)', () => {
    for (const otyp of [EXPENSIVE_CAMERA, TINNING_KIT, MAGIC_MARKER]) {
        const { otmp, init } = callsFor(otyp);
        assert.deepEqual(signatures(init), ['rn2(70)'], `otyp ${otyp}`);
        assert.ok(otmp.spe >= 30 && otmp.spe <= 99, `otyp ${otyp} spe ${otmp.spe} in 30..99`);
    }
});

// mkobj.c:1028-1031 — CAN_OF_GREASE: rn1(21, 5) then blessorcurse(10)
test('can of grease consumes rn2(21) then blessorcurse(10)', () => {
    const { otmp, init } = callsFor(CAN_OF_GREASE);
    const sig = signatures(init);
    assert.deepEqual(sig.slice(0, 2), ['rn2(21)', 'rn2(10)']);
    assert.ok(sig.length === 2 || (sig.length === 3 && sig[2] === 'rn2(2)'), `tail ${sig}`);
    assert.ok(otmp.spe >= 5 && otmp.spe <= 25, `spe ${otmp.spe} in 5..25`);
});

// mkobj.c:1032-1035 — CRYSTAL_BALL: rn1(5, 3) then blessorcurse(2)
test('crystal ball consumes rn2(5) then blessorcurse(2)', () => {
    const { otmp, init } = callsFor(CRYSTAL_BALL);
    const sig = signatures(init);
    assert.deepEqual(sig.slice(0, 2), ['rn2(5)', 'rn2(2)']);
    assert.ok(sig.length === 2 || (sig.length === 3 && sig[2] === 'rn2(2)'), `tail ${sig}`);
    assert.ok(otmp.spe >= 3 && otmp.spe <= 7, `spe ${otmp.spe} in 3..7`);
});

// mkobj.c:989-997 — candles: quan = 1 + (rn2(2) ? rn2(7) : 0), blessorcurse(5)
test('candles consume rn2(2), conditional rn2(7), then blessorcurse(5)', () => {
    for (const otyp of [TALLOW_CANDLE, WAX_CANDLE]) {
        for (let seed = 1; seed <= 20; seed++) {
            const { init } = callsFor(otyp, { seed });
            const sig = signatures(init);
            assert.equal(sig[0], 'rn2(2)', `otyp ${otyp} seed ${seed}`);
            let idx = 1;
            if (init[0].value === 1) {
                assert.equal(sig[1], 'rn2(7)', `quan roll after rn2(2)=1, seed ${seed}`);
                idx = 2;
            }
            assert.equal(sig[idx], 'rn2(5)', `blessorcurse(5) at ${idx}, seed ${seed}`);
            assert.ok(sig.length === idx + 1 || (sig.length === idx + 2 && sig[idx + 1] === 'rn2(2)'));
        }
    }
});

// mkobj.c:998-1004 — BRASS_LANTERN/OIL_LAMP: age = rn1(500, 1000), blessorcurse(5)
test('lanterns/oil lamps consume rn2(500) then blessorcurse(5)', () => {
    for (const otyp of [BRASS_LANTERN, OIL_LAMP]) {
        const { init } = callsFor(otyp);
        const sig = signatures(init);
        assert.deepEqual(sig.slice(0, 2), ['rn2(500)', 'rn2(5)']);
        assert.ok(sig.length === 2 || (sig.length === 3 && sig[2] === 'rn2(2)'), `tail ${sig}`);
    }
});

// mkobj.c:1005-1009 — MAGIC_LAMP: blessorcurse(2), no charge roll
test('magic lamp consumes only blessorcurse(2)', () => {
    const { init } = callsFor(MAGIC_LAMP);
    const sig = signatures(init);
    assert.equal(sig[0], 'rn2(2)');
    assert.ok(sig.length === 1 || (sig.length === 2 && sig[1] === 'rn2(2)'), `tail ${sig}`);
});

// mkobj.c:1060-1069 — AMULET_CLASS: rn2(10) always; the three "bad" amulets
// are cursed when it is non-zero, everyone else gets blessorcurse(10).
test('amulet init rolls rn2(10) then blessorcurse(10) for non-bad amulets', () => {
    for (let seed = 1; seed <= 30; seed++) {
        const { init } = callsFor(AMULET_CLASS, { seed });
        const sig = signatures(init);
        assert.deepEqual(sig.slice(0, 2), ['rn2(10)', 'rn2(10)'], `seed ${seed}`);
        assert.ok(sig.length === 2 || (sig.length === 3 && sig[2] === 'rn2(2)'), `tail ${sig} seed ${seed}`);
    }
});

test('bad amulets (strangulation/change/restful sleep) curse on non-zero rn2(10)', () => {
    let sawCursed = false;
    let sawSpared = false;
    for (let seed = 1; seed <= 60; seed++) {
        const { otmp, init } = callsFor(AMULET_CLASS, { seed, badAmulet: true });
        const sig = signatures(init);
        assert.equal(sig[0], 'rn2(10)', `seed ${seed}`);
        if (init[0].value !== 0) {
            assert.deepEqual(sig, ['rn2(10)'], `cursed path stops after rn2(10), seed ${seed}`);
            assert.equal(otmp.cursed, true, `seed ${seed}`);
            sawCursed = true;
        } else {
            assert.equal(sig[1], 'rn2(10)', `rn2(10)=0 falls through to blessorcurse(10), seed ${seed}`);
            sawSpared = true;
        }
    }
    assert.ok(sawCursed && sawSpared, 'both amulet paths exercised');
});

// mkobj.c:1040-1047 — FIGURINE: rndmonnum_adj(5, 10) loop, then
// blessorcurse(4); mksobj's post-init STATUE/FIGURINE case (mkobj.c:1211-1223)
// then sets gender in spe (rn2(2) only for no-fixed-gender monsters).
test('figurine init rolls monster pick then blessorcurse(4) then gender', () => {
    for (let seed = 1; seed <= 10; seed++) {
        const { otmp, init } = callsFor(FIGURINE, { seed });
        const sig = signatures(init);
        // the monster-table walk ends with rn2(204); the last rn2(4) is blessorcurse(4)
        const bucIdx = sig.lastIndexOf('rn2(4)');
        assert.ok(bucIdx > 0, `blessorcurse(4) after monster pick, seed ${seed}: ${sig}`);
        assert.ok(otmp.corpsenm, `corpsenm assigned, seed ${seed}`);
        assert.ok(Number.isInteger(otmp.spe), `gender spe assigned, seed ${seed}`);
        // after blessorcurse(4): rn2(2) BUC flip iff rn2(4)==0, then rn2(2)
        // gender iff the picked monster has no fixed gender (mkobj.c:1216-1220)
        const tail = sig.slice(bucIdx + 1);
        assert.ok(tail.every(c => c === 'rn2(2)'), `tail ${tail} seed ${seed}`);
        const bucFlipped = init[bucIdx].value === 0 ? 1 : 0;
        const fixedGender = otmp.corpsenm.neuter || otmp.corpsenm.female || otmp.corpsenm.male;
        assert.equal(tail.length, bucFlipped + (fixedGender ? 0 : 1), `tail length, seed ${seed}`);
    }
});

// TOOL_CLASS wishes route through game._mkobj_tool_roll; the roll selects the
// otyp and only charged tools consume init rolls (C: mkobj.c:987-1059).
test('tool-roll path: charged tools roll charges, plain tools roll nothing', () => {
    const expectations = [
        [953, ['rn2(5)'], 'frost horn'],
        [955, ['rn2(5)'], 'fire horn'],
        [957, ['rn2(18)'], 'horn of plenty'],
        [975, ['rn2(5)'], 'drum of earthquake'],
        [946, ['rn2(5)'], 'magic flute'],
        [951, [], 'tooled horn'],
        [969, [], 'bugle'],
        [973, [], 'leather drum'],
        [965, [], 'bell'],
        [910, [], 'tin whistle'],
        [940, [], 'magic whistle'],
    ];
    for (const [roll, expected, label] of expectations) {
        const { init } = callsFor(TOOL_CLASS, { toolRoll: roll });
        assert.deepEqual(signatures(init), expected, `${label} (roll ${roll})`);
    }
});

// Classes that skip blessorcurse entirely (mkobj.c:976-986 GEM_CLASS):
// gems only roll rn2(6) for quantity; loadstone is cursed without any roll.
test('gem class skips blessorcurse: quantity roll only', () => {
    const { init } = callsFor(RUBY);
    assert.deepEqual(signatures(init), ['rn2(6)']);
});

test('loadstone is cursed with zero init rolls', () => {
    const { otmp, init } = callsFor(LOADSTONE);
    assert.deepEqual(signatures(init), []);
    assert.equal(otmp.cursed, true);
});
