# C Parity Audit 458: Kicked Glass Gem Rock-Passer Damage

Implemented the narrow kicked worthless-glass-gem hit path against rock-passing monsters. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:733-749`: kicked floor objects are extracted, sent through `bhit(..., KICKED_WEAPON, ..., &gk.kickedobj)`, and monster impacts route non-gold objects to `thitmonst(mon, gk.kickedobj)`.
- `nethack-c/upstream/src/dothrow.c:2018-2055`: `thitmonst()` builds projectile hit value from Luck, monster AC, hero hit bonus, hero/polyself level, dexterity, and range.
- `nethack-c/upstream/src/dothrow.c:2152-2159`: kicked weapon, weptool, and gem-class impacts use `rnd(20)` and apply the kicked ammo/non-ammo penalty; kicked ammo uses `-5`.
- `nethack-c/upstream/include/obj.h:238-244`: `GEM_CLASS` objects can be ammo.
- `nethack-c/upstream/include/obj.h:272-277`: `stone_missile()` only covers `GEMSTONE` or `MINERAL` material, excluding ring-class objects.
- `nethack-c/upstream/include/objects.h:1572-1578`: worthless glass gems are `GLASS`, so they are not `stone_missile()` objects and should not take the harmless rock-passer branch.
- `nethack-c/upstream/src/uhitm.c:1075-1087`: kicked gem ammo without a launcher reaches the ranged weapon damage branch.
- `nethack-c/upstream/src/uhitm.c:884-895`: ranged weapon-style hits deal `rnd(2)` damage.
- `nethack-c/upstream/src/uhitm.c:1397-1407`: the harmless rock-passer branch only applies to thrown or kicked `stone_missile()` objects.
- `nethack-c/upstream/src/dothrow.c:1974-2001` and `:2217-2225`: successful projectile hits can be destroyed by `should_mulch_missile()` before landing.

## JS Changes

- `js/cmd.js`
  - Adds a kicked glass-gem impact helper that uses the existing projectile base hit calculation plus the C kicked-ammo `-5` penalty.
  - Applies `rnd(20)` hit rolls, `rnd(2)` ranged damage, wake/anger side effects on hit, miss wake behavior, and hit-only projectile mulch.
  - Threads the helper into the existing first-flight-square floor-kick monster impact path, scoped to rock-passing targets until the separate unicorn gem-catch and generic kicked object-hit branches are ported.
  - Leaves surviving kicked glass gems on the existing kicked-object placement path, which does not consume the thrown-object hard-landing break roll.

## Tests

- `command kicked glass gem harms rock-passing monster and survives landing`
- `command kicked glass gem hit can mulch before landing`
- `command kicked glass gem miss against rock-passer stays a miss`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "command kicked (stone missile|glass gem)|hero-thrown (loadstone|stone missile|glass gem)" test/shop-billing-helpers.test.mjs` - 11 pass, 1701 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- This is not a broad kicked-object `thitmonst()` conversion. Generic kicked weapon/gem/object damage, full kicked glass-gem behavior outside rock-passers, passive-object side effects, direct kicked gem-to-unicorn acceptance, monster pickup/catch handling, and full kicked-object flight through multiple squares remain separate work. Direct hero-thrown gem-to-unicorn acceptance is covered separately in audit 459.
- Direct hero-thrown glass gem rock-passer damage is covered in audit 457.
