# 140 - Monster drop_throw prelude and historic regret

## Implemented Slices

Two small parity gaps were closed from the current audit batch.

### Monster-thrown drop_throw prelude

Monster-thrown cream pies and venom now break before remote shaft shipping, floor effects, placement, and stacking. Missed monster-thrown eggs still land instead of being destroyed; the hit-only egg/missile mulch and passive-object branches remain deferred.

C anchors:

- `drop_throw()` destroys cream pies and venom regardless of hit state, but eggs only when `ohit` is true: `nethack-c/upstream/src/mthrowu.c:157`, `nethack-c/upstream/src/mthrowu.c:170`.
- Shipping runs only after that break gate, and floor effects/placement/passive/stacking run after shipping declines: `nethack-c/upstream/src/mthrowu.c:180`, `nethack-c/upstream/src/mthrowu.c:184`.
- Hit-only missile mulch is governed by `should_mulch_missile()` and is intentionally deferred: `nethack-c/upstream/src/dothrow.c:1974`.

JS changes:

- `landMonsterThrownObject()` now accepts `ohit`, computes a C-shaped `dropThrow` result, and consumes cream pies/venom before shipping or floor effects: `js/cmd.js:26249`, `js/cmd.js:26261`.
- Surviving monster-thrown objects keep the `dropThrow` diagnostic in the landing result for focused tests and future hit-state wiring: `js/cmd.js:26292`, `js/cmd.js:26302`, `js/cmd.js:26316`.

Tests:

- Cream pie break wins over remote shaft shipping and lava floor effects: `test/shop-billing-helpers.test.mjs:18427`.
- Venom break wins over ordinary floor placement: `test/shop-billing-helpers.test.mjs:18448`.
- Missed eggs still land and do not take the hit-only break branch: `test/shop-billing-helpers.test.mjs:18464`.

### Monster-moving historic statue regret

Historic stone-to-flesh statue animation now distinguishes hero-caused Archeologist guilt from monster-moving regret. Under `game._monster_moving`, visible historic statue animation prints regret and does not alter alignment.

C anchors:

- `animate_statue()` treats historic statues as Archeologist-only `CORPSTAT_HISTORIC` cases: `nethack-c/upstream/src/trap.c:740`.
- Hero-caused animation prints guilt and calls `adjalign(-1)`: `nethack-c/upstream/src/trap.c:870`, `nethack-c/upstream/src/attrib.c:1298`.
- Monster-moving animation prints visible regret without alignment penalty: `nethack-c/upstream/src/trap.c:874`.
- C sets monster-moving context during monster movement: `nethack-c/upstream/src/allmain.c:210`.

JS changes:

- `stoneToFleshHistoricStatueGoneMessage()` now receives coordinates and branches on `game._monster_moving`, using `cansee(x, y)` for the regret message: `js/cmd.js:12781`.
- `stoneToFleshAnimateFloorStatue()` passes the statue coordinates into the helper after shop debt and before content transfer: `js/cmd.js:12810`.

Test:

- Monster-moving historic animation gives regret without record/abuse changes: `test/shop-billing-helpers.test.mjs:4976`.

## Fresh Deferred Findings

- `#force` and mimic wake coverage: C blunt forcing calls `wake_nearby(FALSE)` before lock breakage (`nethack-c/upstream/src/lock.c:241`, `nethack-c/upstream/src/lock.c:252`), while `wake_nearby()` does not reveal object/furniture mimics (`nethack-c/upstream/src/mon.c:4367`, `nethack-c/upstream/src/mon.c:4384`; contrast `wakeup()`/`seemimic()` at `nethack-c/upstream/src/mon.c:4333`, `nethack-c/upstream/src/mon.c:4342`). JS appears to preserve disguise in `wakeNearbyFromForceLock()` (`js/cmd.js:9118`, `js/cmd.js:9127`) but only has blind regression coverage. Safest next slice is visible coverage that asserts wake messages, `msleeping` clearing, and preserved `appearObj`/`appearGlyph`; full `M_AP_FURNITURE`/`M_AP_OBJECT` representation remains broader work.
- Hero-thrown stairs/ladders/special-stairs down-gates: C `ship_object()` gates down stairs, down ladders, special stairs, and seen holes/trapdoors (`nethack-c/upstream/src/dokick.c:1651`, `nethack-c/upstream/src/dokick.c:1657`, `nethack-c/upstream/src/dokick.c:1953`, `nethack-c/upstream/src/dokick.c:1958`) and charges debt before migration (`nethack-c/upstream/src/dokick.c:1695`). JS projectile shipping currently recognizes only remote seen holes/trapdoors (`js/cmd.js:22485`, `js/cmd.js:22506`) even though stairs and migration constants exist (`js/mklev.js:3527`, `js/const.js:874`). Safest next slice is a projectile `downGateAt(x,y)` for horizontal hero-thrown gold and ordinary non-gold objects, with ladder always-drop behavior and reciprocal stair/ladder delivery metadata deferred if needed.
- Kicked floor objects: C checks adjacent floor objects before door/nondoor kick fallback (`nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:489`) and kicked-object shipping has kick-specific ordering (`nethack-c/upstream/src/dokick.c:649`, `nethack-c/upstream/src/dokick.c:733`, `nethack-c/upstream/src/zap.c:4049`). JS `kickDirection` never inspects `game.level.objects` (`js/cmd.js:51014`, `js/cmd.js:51109`). Safest next slice is one non-shop, non-gold, non-container, non-boulder adjacent floor object kicked into a clear seen hole/trapdoor using a kick-specific shipping helper; full kick range/RNG/shop/fragile/gold/boulder work remains deferred.
- Ordinary upward corpse damage: C generic `toss_up()` handles non-petrifying corpses with roof/self breaktests, corpse-weight damage, helmet mitigation, `Maybe_Half_Phys`, landing before HP loss, and falling-object death cause (`nethack-c/upstream/src/dothrow.c:1256`, `nethack-c/upstream/src/dothrow.c:1268`, `nethack-c/upstream/src/dothrow.c:1341`, `nethack-c/upstream/src/dothrow.c:1356`, `nethack-c/upstream/src/dothrow.c:1374`, `nethack-c/upstream/src/dothrow.c:1380`, `nethack-c/upstream/src/dothrow.c:1420`). JS only has special upward petrifying corpse handling and lacks `Maybe_Half_Phys` use (`js/cmd.js:52175`, `js/cmd.js:52365`, `js/cmd.js:15281`, `js/cmd.js:15288`, `js/cmd.js:15308`, `js/const.js:2351`). Safest next slice is ordinary non-petrifying, non-Rider corpse upward `toss_up()` only.
- Remaining monster-thrown `drop_throw(ohit)`: this slice covered the pre-shipping break gate for pie/venom and egg misses. Still open: passing true hit state from monster throw callers (`js/allmain.js:6128`, `js/allmain.js:6407`, `js/allmain.js:6562`, `js/allmain.js:6610`), hit-only egg deletion, C `should_mulch_missile()` RNG, passive object effects, and target-square refactors (`nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:184`).

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "historic statue|monster-thrown cream pie|monster-thrown venom|monster-thrown egg miss|monster-thrown dagger|monster-thrown boulder" test/shop-billing-helpers.test.mjs` - 10 pass, 906 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 916 pass
- `SESSION_REPLAY_TIMEOUT_MS=300000 node frozen/ps_test_runner.mjs sessions` - 40/44 pass; the four failures were `spawnSync /usr/bin/node ETIMEDOUT` with zero RNG/screen metrics.
- Direct worker replay loop over `sessions/*.session.json` with `timeout 240s node frozen/ps_test_runner.mjs --worker-session=...` - 44/44 pass. The timed-out wrapper children (`seed0014`, `seed0030`, `seed0360`, `seed4500`) each passed as direct workers with full RNG/screen parity.
