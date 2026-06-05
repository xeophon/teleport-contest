# C Parity Audit 496: Monster-Thrown Kop Cream-Pie Iron-Bars Breakage

Monster-thrown Kop cream pies that receive C's random forced `hits_bars()` result now run through the shared fragile projectile breaktest before floor placement. Normal breakage consumes the `obj_resists()` roll, emits `What a mess!`, destroys the pie before hero catch/hit/blindness, and skips iron-bars `Clonk!`/`Clink!` sounds. If the break is resisted, the pie uses the flimsy-object bars sound and can land on the pre-bars square instead of being consumed by generic cream-pie contact breakage.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canaries use deterministic test RNG only to select and assert the live forced-bars and breaktest paths.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:552` through `:566`: `MT_FLIGHTCHECK(pre, forcehit)` checks next-square `IRONBARS` and calls `hits_bars(&singleobj, current, bars, pre ? 0 : forcehit, 0)`.
- `nethack-c/upstream/src/mthrowu.c:639`: initial point-blank bars checks use `pre=TRUE`, so the random forced-hit branch is not used at point blank.
- `nethack-c/upstream/src/mthrowu.c:798` through `:801`: in-flight monster throws roll `forcehit = !rn2(5)` before the next-square bars check; `hits_bars()` may have destroyed `singleobj`.
- `nethack-c/upstream/src/mthrowu.c:1417` through `:1434`: non-hero bar hits call `breaks()` and clear the object pointer if the object breaks.
- `nethack-c/upstream/src/mthrowu.c:1446` through `:1470`: nonbreaking bars hits emit object-class sounds; flimsy objects use `Flapp!`.
- `nethack-c/upstream/src/mthrowu.c:1497` through `:1558`: `hits_bars()` only makes ordinary `FOOD_CLASS` items like cream pies hit bars when `always_hit` is true.
- `nethack-c/upstream/src/dothrow.c:2444` through `:2453`: `breaks()` calls `breaktest()`, emits `breakmsg()`, then destroys the object.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2605`: `breaktest()` consumes `obj_resists(..., 1, 99)` before treating `CREAM_PIE` as breakable.
- `nethack-c/upstream/src/dothrow.c:2644` through `:2646`: visible cream-pie breakage prints `What a mess!`.
- `nethack-c/upstream/include/obj.h:418` through `:420`: `is_flimsy()` classifies low-material objects for the `Flapp!` bars sound.

## JS Changes

- `js/cmd.js`
  - Exports the shared top-level projectile break kind/message helpers for monster flight branches outside `cmd.js`.
  - Adds a `contactBreaks` override to `landMonsterThrownObject()` so a C-resisted bars break can place a cream pie instead of forcing generic contact destruction.
- `js/allmain.js`
  - Routes Kop cream-pie forced iron-bars stops through `projectileTopLevelBreakKind()` and `projectileTopLevelBreakMessage()`.
  - Emits `What a mess!` and consumes the pie on ordinary breakage.
  - Emits `Flapp!` and lands the pie when the C `breaktest()` resistance roll prevents breakage.
  - Leaves hero catch, hit, creaming blindness, and iron-bars `Clonk!`/`Clink!` out of the forced-bars break path.

## Tests

- `monster-thrown resisted cream pie bars hit can land instead of contact-breaking`
  - Pins the helper override that lets a resisted cream-pie bars hit land on the floor without generic contact destruction.
- `production Kop cream pie forced iron bars hit breaks before hero`
  - Pins production Kop flight geometry, forced-bars breaktest RNG, `What a mess!`, no floor cream pie, no hero catch/hit/creaming, and no `Clonk!`/`Clink!`/`Flapp!` on the ordinary break path.

## Verification

- `node --check js/cmd.js` - pass
- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "cream pie.*bars|Kop cream pie" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
