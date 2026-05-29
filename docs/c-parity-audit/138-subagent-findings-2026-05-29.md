# 138 - Named stone-to-flesh floor statues

## Implemented Slice

Downward stone-to-flesh casts on named ordinary floor statues now copy the statue object name onto the animated monster, matching C `animate_statue()`. The visible animation message already used the statue's named object text; the missing parity was the resulting monster's persistent name.

This remains scoped to successful ordinary floor-statue animation. Unique/cant-revive directed doppelganger handling, saved monster traits, and Archeologist historic guilt remain separate slices.

C anchors:

- `animate_statue()` creates or restores the monster before applying the statue object name: `nethack-c/upstream/src/trap.c:726`.
- Named statues christen the resulting monster only when the resulting monster is not unique: `nethack-c/upstream/src/trap.c:802`, `nethack-c/upstream/src/trap.c:803`.
- The spell animation message still uses the statue object name and selected life/move/disappear verb: `nethack-c/upstream/src/trap.c:817`, `nethack-c/upstream/src/trap.c:834`.

JS changes:

- Added `stoneToFleshChristenAnimatedStatueMonster()` using the existing object instance-name helper and unique/nemesis/rider guard: `js/cmd.js:12775`.
- The floor-statue animation path now christens the monster immediately after `makemon()` and before sleep/hiding cleanup, message generation, shop debt, and content transfer: `js/cmd.js:12781`, `js/cmd.js:12786`.

## Tests Added

Added focused floor-statue coverage in `test/shop-billing-helpers.test.mjs`:

- named ordinary goblin statues now animate into a goblin with `givenName` copied from the statue name and visible message text still naming the statue: `test/shop-billing-helpers.test.mjs:4908`.

## Deferred Gaps From This Slice

- Archeologist historic statues should print C guilt/regret text and apply `adjalign(-1)` for hero-caused animation.
- Unique and cant-revive statues should use C's directed doppelganger path instead of being skipped.
- Saved monster traits from petrified statues still need their own source-backed slice.

## Fresh Deferred Findings

Burning-oil shop-door damage/repair remains open. C burning oil reaches `zap_over_floor()` via `explode_oil()` and records real shop entrance damage before a single `pay_for_damage("burn away", FALSE)` pass, with delayed repair from `add_damage()`/`repair_damage()`: `nethack-c/upstream/src/potion.c:1686`, `nethack-c/upstream/src/dothrow.c:2501`, `nethack-c/upstream/src/explode.c:962`, `nethack-c/upstream/src/zap.c:5412`, `nethack-c/upstream/src/zap.c:5466`, `nethack-c/upstream/src/explode.c:681`, `nethack-c/upstream/src/shk.c:4407`, `nethack-c/upstream/src/shk.c:4802`. JS burns ordinary doors in `applyBurningOilDoorTerrain()` but does not yet record entrance damage or repair: `js/cmd.js:14271`, `js/cmd.js:14325`.

Monster-thrown projectile terminal landing remains open. C `drop_throw(ohit)` destroys cream pies and venom always, eggs only on hit, and mulches missiles before floor placement/passive object mutation: `nethack-c/upstream/src/mthrowu.c:162`, `nethack-c/upstream/src/dothrow.c:1976`, `nethack-c/upstream/src/mthrowu.c:183`, `nethack-c/upstream/src/uhitm.c:6127`. JS `landMonsterThrownObject()` lacks an `ohit` input and monster-thrown arrow branches currently consume only RNG after a hit: `js/cmd.js:26231`, `js/allmain.js:6310`, `js/cmd.js:39716`.

Raised drawbridge under-terrain movement classification remains open. C coordinate helpers classify `DRAWBRIDGE_UP` by `DB_UNDER`, so raised `DB_LAVA` is lava, raised `DB_ICE` is ice, raised `DB_FLOOR` is non-liquid ground, and only raised `DB_MOAT` is water/moat: `nethack-c/upstream/src/dbridge.c:45`, `nethack-c/upstream/src/hack.c:1831`, `nethack-c/upstream/src/hack.c:3230`. JS movement still uses raw `target.typ` for liquid warnings/effects, so all raised drawbridges are treated as water: `js/cmd.js:35933`, `js/cmd.js:36034`, `js/cmd.js:36917`, `js/cmd.js:37106`.

The next recommended stone-to-flesh slice is historic Archeologist side effects: C checks `CORPSTAT_HISTORIC`, prints guilt on hero-caused animation, and calls `adjalign(-1)`: `nethack-c/upstream/src/trap.c:740`, `nethack-c/upstream/src/trap.c:870`, `nethack-c/upstream/src/attrib.c:1298`. JS already preserves historic naming data but has no matching alignment/guilt side effect in `stoneToFleshAnimateFloorStatue()`: `js/cmd.js:12781`, `js/cmd.js:28222`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "ordinary floor statue|named ordinary statue" test/shop-billing-helpers.test.mjs` - 2 pass, 908 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 910 pass
- `SESSION_REPLAY_TIMEOUT_MS=300000 node frozen/ps_test_runner.mjs sessions` - 44/44 passing
