# 139 - Historic Archeologist stone-to-flesh statue guilt

## Implemented Slice

Successful downward stone-to-flesh animation of a historic floor statue now applies the Archeologist-only C side effect: the hero feels guilty that the historic statue is gone, alignment record drops by one, and alignment abuse increases by one.

This is scoped to hero-caused spell animation through the existing ordinary floor-statue path. Monster-caused wand animation regret text, directed doppelganger/cant-revive retargeting, and saved monster traits remain separate slices.

C anchors:

- `animate_statue()` treats a statue as historic only for Archeologists and `CORPSTAT_HISTORIC`: `nethack-c/upstream/src/trap.c:740`, `nethack-c/upstream/src/trap.c:741`.
- C orders visible animation, shop debt, historic guilt/alignment, then content transfer/deletion: `nethack-c/upstream/src/trap.c:817`, `nethack-c/upstream/src/trap.c:866`, `nethack-c/upstream/src/trap.c:870`, `nethack-c/upstream/src/trap.c:880`.
- `adjalign(-1)` decrements alignment record and increments abuse: `nethack-c/upstream/src/attrib.c:1298`, `nethack-c/upstream/src/attrib.c:1305`.

JS changes:

- Added `stoneToFleshHistoricStatueGoneMessage()` to detect Archeologist historic statues, apply the `adjalign(-1)` state change, and return the C guilt wording: `js/cmd.js:12781`.
- `stoneToFleshAnimateFloorStatue()` now appends that message after shop debt and before statue-content transfer: `js/cmd.js:12794`, `js/cmd.js:12807`.

## Tests Added

Added focused floor-statue coverage in `test/shop-billing-helpers.test.mjs`:

- Archeologist historic statues animate with historic object wording, guilt text, `record - 1`, and `abuse + 1`: `test/shop-billing-helpers.test.mjs:4928`.
- Non-Archeologists animate the same historic-flagged statue without historic display wording, guilt text, or alignment changes: `test/shop-billing-helpers.test.mjs:4953`.

## Deferred Gaps From This Slice

- Monster-caused statue animation should emit visible regret text without alignment penalty.
- Unique/cant-revive statues should use C's directed doppelganger and retarget rules instead of being skipped.
- Saved monster traits from petrified statues still need their own source-backed slice.

## Fresh Deferred Findings

Five read-only follow-up audits found additional compact slices that are ready for later source-backed implementation:

- Non-food metallivorous `#eat`: C gates carried/floor metal eating through `M1_METALLIVORE`, `metallivorous()`, `is_metallic()`, and rust-monster rustprone checks (`include/monflag.h:118`, `include/mondata.h:92`, `include/objclass.h:193`, `src/eat.c:91`, `src/eat.c:2733`, `src/eat.c:2876`, `src/eat.c:3515`, `src/eat.c:3602`). JS has polyself diet overlay hooks but food-only hero prompts (`js/cmd.js:7454`, `js/cmd.js:18649`, `js/cmd.js:51365`, `js/cmd.js:53051`) and monster-only metal classification (`js/allmain.js:2218`, `js/allmain.js:2276`, `js/allmain.js:2297`). Safest slice: carried non-accessory, non-unique metallic non-food for xorn/rock mole plus rust-monster iron handling; defer floor gold, traps, bars, rings, amulets, ball/chain, and shop rows.
- Shop terrain damage and delayed repair: C records damage with `add_damage()` and later `pay_for_damage()`/`repair_damage()` (`include/rm.h:408`, `include/rm.h:480`, `include/hack.h:76`, `src/shk.c:4398`, `src/shk.c:4452`, `src/shk.c:4732`, `src/shk.c:4892`, `src/shk.c:5174`, `src/shk.c:5304`, `include/mextra.h:113`). JS has shopkeeper-door coordinates and billing helpers but no `damagelist` equivalent (`js/mklev.js:20931`, `js/cmd.js:14278`, `js/cmd.js:14305`, `js/cmd.js:21481`, `js/cmd.js:21521`, `js/cmd.js:21763`). Safest slice: door-only shop damage records, payment, and five-turn repair for burning-oil door destruction.
- Directed statue animation for cant-revive targets: C routes unique/no-revive statue animation through directed doppelganger/chameleon retargeting instead of skipping (`src/zap.c:2017`, `src/zap.c:2029`, `src/read.c:3112`, `src/trap.c:746`, `src/trap.c:776`, `src/trap.c:781`, `src/trap.c:923`, `src/mon.c:5278`). JS currently defers these in spell stone-to-flesh and statue-trap animation (`js/cmd.js:12593`, `js/cmd.js:12794`, `js/cmd.js:17759`) while unrelated doppelganger handling is random-only (`js/mklev.js:6947`, `js/allmain.js:6691`). Safest slice: shared cant-revive/directed-doppel helper for floor spell animation and statue traps; defer saved traits and equipment.
- Raised drawbridge movement terrain: C distinguishes raw `IS_POOL(DRAWBRIDGE_UP)` from bridge-under-terrain helpers (`src/dbridge.c:45`, `src/dbridge.c:61`, `src/dbridge.c:76`, `src/dbridge.c:85`, `include/rm.h:117`) and movement callers (`src/hack.c:1178`, `src/hack.c:1372`, `src/hack.c:1883`, `src/hack.c:2395`, `src/hack.c:2462`, `src/hack.c:3232`, `src/hack.c:3403`). JS has raw `IS_POOL()` and some private moat/lava helpers but movement still uses broad liquid checks (`js/const.js:2061`, `js/ice.js:65`, `js/ice.js:858`, `js/cmd.js:9580`, `js/cmd.js:36034`, `js/cmd.js:36917`, `js/cmd.js:37106`, `js/cmd.js:37129`). Safest slice: movement-local pool/lava/ice helpers for raised drawbridges and crawl-out checks; defer broad travel/fumble rewrites.
- Monster-thrown `drop_throw(ohit)`: C deletes cream pies/venom unconditionally, deletes eggs only on hits, runs missile mulch only on hits, then ships before floor effects (`src/mthrowu.c:157`, `src/mthrowu.c:170`, `src/mthrowu.c:174`, `src/mthrowu.c:180`, `src/mthrowu.c:184`, `src/dothrow.c:1974`, `src/dokick.c:1639`, `src/dokick.c:1943`). JS currently lands monster-thrown objects through `landMonsterThrownObject()` with pre-shipping hooks (`js/cmd.js:26231`, `js/cmd.js:26255`, `js/cmd.js:22470`, `js/cmd.js:22484`) and callers in `js/allmain.js:6128`, `js/allmain.js:6407`, `js/allmain.js:6562`, `js/allmain.js:6610`, plus deferred impact delivery at `js/cmd.js:39622`. Safest slice: add an `ohit=false` drop-throw prelude for landing behavior; defer passive object effects and target-square refactors.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "ordinary floor statue|named ordinary statue|historic statue" test/shop-billing-helpers.test.mjs` - 4 pass, 908 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 912 pass
- `SESSION_REPLAY_TIMEOUT_MS=300000 node frozen/ps_test_runner.mjs sessions` - 44/44 pass
