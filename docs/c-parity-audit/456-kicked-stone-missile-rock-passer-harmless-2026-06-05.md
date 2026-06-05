# C Parity Audit 456: Kicked Stone-Missile Rock-Passer Harmless Hit

Implemented the narrow kicked-object `stone_missile() && passes_rocks()` branch. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:736-758`: after a floor object is kicked, `bhit(..., KICKED_WEAPON, ...)` can stop on a monster and route non-gold objects through `thitmonst(mon, gk.kickedobj)`.
- `nethack-c/upstream/src/dothrow.c:2021-2023`: `thitmonst()` classifies `gk.kickedobj` impacts as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2029-2051`: object-hit chance includes Luck, monster AC, hero hit bonus, hero/polyself level, dexterity, and distance.
- `nethack-c/upstream/src/dothrow.c:2154-2159`: kicked weapon/gem-class objects use the generic `rnd(20)` hit roll and apply the kicked-object ammo/non-ammo penalty instead of throw skill bonuses.
- `nethack-c/upstream/src/dothrow.c:1976-2000` and `:2218-2226`: successful object hits can still run `should_mulch_missile()` before the object lands; hero-side blessed survival uses `rnl(4)`, then flint/hard gems get the extra hard-object survival roll.
- `nethack-c/upstream/src/uhitm.c:1397-1406`: thrown or kicked stone missiles against rock-passing monsters print the harmless-hit text, wake the monster, return early, and do not apply damage.
- `nethack-c/upstream/include/obj.h:238-244` and `nethack-c/upstream/include/objects.h:1521-1607`: mineral/gemstone rocks and gray stones are `GEM_CLASS` sling ammo for the kicked penalty.

## JS Changes

- `js/cmd.js`
  - Adds a small C-shaped projectile hit-value helper for the kicked stone-missile branch.
  - Adds kicked projectile ammo penalty detection for gem/stone missile fixtures.
  - Adds hero-side hit-missile mulch handling for successful kicked stone hits, including hard flint/gem survival.
  - Lets the existing floor-object kick helper handle a first-flight-square monster only for the stone-missile rock-passer case; other floor-object kicks keep the prior down-gate-only support boundary.
  - Wakes/angers the rock-passing target on harmless hit, skips HP damage, and places only surviving kicked objects on the monster square.

## Tests

- `command kicked stone missile hits rock-passing monster harmlessly`
- `command kicked stone missile harmless hit can mulch before landing`
- `command kicked stone missile miss against rock-passer stays a miss`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "command kick ordinary floor object|command kicked stone missile" test/shop-billing-helpers.test.mjs` - 5 pass, 1701 skipped
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown (loadstone|stone missile)|command kicked stone missile" test/shop-billing-helpers.test.mjs` - 5 pass, 1701 skipped
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- This is not a broad kicked-object `thitmonst()` conversion. Generic kicked object damage, kicked glass gem damage, passive-object side effects, monster pickup/catch handling, and full kicked-object flight through multiple squares remain separate work.
- Direct hero-thrown stone missile rock-passer harmless hits are covered in audit 455; generic direct thrown weapon/gem/rock damage remains separate.
