# 640 - Boomerang Failed-Catch Self-Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:1601-1610` routes non-underwater hero-thrown boomerangs through `boomhit()`, and only `mon == &gy.youmonst` returns the object to inventory.
- `nethack-c/upstream/src/zap.c:4202-4209` handles the return-to-hero square. Failed catch is `Fumbling || rn2(20) >= ACURR(A_DEX)`, then `dmgval(obj, &gy.youmonst)`, then `thitu(10 + obj->spe, Maybe_Half_Phys(dam), &obj, "boomerang")`.
- `nethack-c/upstream/src/mthrowu.c:106-121` is the `thitu()` AC roll and hit/miss wording: miss if `u.uac + tlev <= rnd(20)`, near miss if only by one, and hit text uses `an("boomerang")`.
- `nethack-c/upstream/src/weapon.c:225-355` gives ordinary boomerangs `rnd(9)` versus both small and large targets, adds enchantment, applies blessing/silver bonuses when relevant, subtracts erosion, and floors positive damage to 1.
- `nethack-c/upstream/src/dothrow.c:1780-1824` continues through normal hard-landing breaktest and floor placement after `boomhit()` returns null for a failed catch.

## Port Notes

- Added boomerang to the toss-up `dmgval` damage tables so self-hit damage uses the C `d9` table rather than hero projectile monster-hit bonuses.
- Added `heroThrownBoomerangSelfHitResult()` to preserve C order: catch `rn2(20)` when not fumbling, `rnd(9)` damage before hit/miss, `rnd(20)` `thitu()` roll, then the existing hard-landing `rn2(100)` path.
- Wired `boomerangFlight.failedCatch` after the one-unit thrown object is built and before ordinary impact handling, leaving existing shop split, landing, breaktest, and inventory removal logic intact.

## Tests

- `hero-thrown boomerang failed catch self-hits before landing`
- `hero-thrown boomerang failed catch can miss after damage roll and still land`
- Focused verification: `node --test --test-name-pattern "boomerang" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Air-level and levitation recoil before `boomhit()` (`dothrow.c:1602-1603`).
- Fumbling failed-catch canary without the catch `rn2(20)`.
- Broader `dmgval()` target-form edges for thick-skinned polyself and unusual boomerang variants.
