# C Parity Audit 457: Direct Hero-Thrown Glass Gem Rock-Passer Damage

Implemented the narrow direct hero-thrown worthless glass gem hit path against rock-passing monsters. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1477-1493`: direct hero throws route monster-square impacts through `throwit_mon_hit()` and `thitmonst(mon, obj)`.
- `nethack-c/upstream/src/dothrow.c:2018-2055`: `thitmonst()` builds the projectile hit value from Luck, monster AC, hero hit bonus, hero/polyself level, dexterity, and range.
- `nethack-c/upstream/src/dothrow.c:2152-2162`: weapon, weptool, and gem-class projectile hits use `rnd(20)`; thrown ammo without the matching launcher takes the no-launcher ammo penalty.
- `nethack-c/upstream/src/uhitm.c:1075-1087`: thrown ammo without the matching launcher uses the ranged weapon damage branch.
- `nethack-c/upstream/src/uhitm.c:884-895`: ranged weapon-style hits deal only `rnd(2)` damage.
- `nethack-c/upstream/src/uhitm.c:1397-1407`: the harmless rock-passer branch only applies to thrown or kicked `stone_missile()` objects.
- `nethack-c/upstream/include/obj.h:238-244`: `GEM_CLASS` objects can be ammo.
- `nethack-c/upstream/include/obj.h:272-277`: `stone_missile()` is limited to `GEMSTONE` or `MINERAL` material and excludes ring-class objects.
- `nethack-c/upstream/include/objects.h:1572-1578`: worthless glass gems are `GLASS`, so they are not `stone_missile()` objects and should not take the harmless rock-passer branch.
- `nethack-c/upstream/src/dothrow.c:1974-2001` and `:2217-2225`: successful thrown projectile hits can still be destroyed by `should_mulch_missile()` before the caller lands the object.

## JS Changes

- `js/cmd.js`
  - Adds a direct hero-thrown glass-gem predicate using the existing material classifier for `GLASS` gem-class objects.
  - Adds the C-shaped hit calculation for no-launcher thrown gem ammo by reusing the projectile base hit value and applying the `-4` ammo penalty.
  - Applies `rnd(20)` hit rolls, `rnd(2)` ranged damage, wake/anger side effects on hits, miss wording/wakeup behavior on misses, and hit-only projectile mulch before landing.
  - Leaves surviving glass gems on the normal projectile landing path so shop handling, breakage, stacking, and inventory removal remain owned by the existing throw helper.

## Tests

- `hero-thrown glass gem harms rock-passing monster and survives landing`
- `hero-thrown glass gem hit can mulch before landing`
- `hero-thrown glass gem miss against rock-passer stays a miss`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown (loadstone|stone missile|glass gem)|production monster sling glass gem" test/shop-billing-helpers.test.mjs` - 6 pass, 1703 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- This is not a full direct `thitmonst()`/`hmon()` conversion for ordinary thrown weapons, real gems, rocks, gray stones, or passive-object side effects.
- Lethal glass-gem cleanup is still limited by the current local direct-throw path and remains separate from this nonlethal damage canary.
- Kicked glass gem damage, generic kicked object damage, full glass gem identification/naming, unicorn gem catch/acceptance, and broader projectile lifecycle behavior remain separate work.
