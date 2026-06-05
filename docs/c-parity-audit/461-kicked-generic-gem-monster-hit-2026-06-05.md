# C Parity Audit 461: Kicked Generic Gem Monster Hits

Implemented first-square kicked floor `GEM_CLASS` impacts against ordinary non-unicorn, non-rock-passing monsters. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:733-747`: floor-object kicks extract `gk.kickedobj`, route flight through `bhit(..., KICKED_WEAPON, ..., &gk.kickedobj)`, and call `thitmonst(mon, gk.kickedobj)` when a non-gold object hits a monster.
- `nethack-c/upstream/src/dokick.c:771-785`: when `thitmonst()` does not consume the object, the kicked object runs fall effects and lands at the `bhit` position.
- `nethack-c/upstream/src/dothrow.c:2021-2023`: `thitmonst()` classifies `gk.kickedobj` impacts as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2087-2098`: unicorn gem catch/acceptance is checked before the ordinary hit roll and remains ahead of generic gem damage.
- `nethack-c/upstream/src/dothrow.c:2152-2162`: weapon, weptool, and `GEM_CLASS` objects roll `rnd(20)` and kicked ammo applies the `-5` hit penalty.
- `nethack-c/upstream/src/dothrow.c:2205-2224`: successful hits call `hmon(mon, obj, HMON_KICKED, dieroll)` and then run hit-only missile mulch before the caller can land the object.
- `nethack-c/upstream/src/dothrow.c:1981-1999`: missile mulch uses the `rn2(3)` base break roll for unenchanted ammo and an extra `rn2(2)` survival check for hard gems and flint.
- `nethack-c/upstream/src/dothrow.c:2227`: misses call `tmiss()`, which may consume `rn2(3)` to wake the target.
- `nethack-c/upstream/src/uhitm.c:1397-1404`: stone missiles kicked or thrown at rock-passing monsters hit harmlessly before normal weapon/gem damage.
- `nethack-c/upstream/src/uhitm.c:1415-1418` and `nethack-c/upstream/src/uhitm.c:1075`: `GEM_CLASS` objects enter weapon handling; kicked ammo uses the ranged fallback rather than object-table gem damage.
- `nethack-c/upstream/src/uhitm.c:884`: the ranged fallback base damage is `rnd(2)`.
- `nethack-c/upstream/include/objects.h:1516-1607`: gems, glass, gray stones, flint, and rocks are `GEM_CLASS` sling ammo.

## JS Changes

- `js/cmd.js`
  - Generalizes the kicked glass-gem impact helper to all gem-class objects.
  - Allows first-square kicked-object monster impacts for any gem-class object, while preserving unicorn catch/acceptance and stone-missile rock-passer harmless handling ahead of generic damage.
  - Uses the existing kicked ammo hit-value helper, `rnd(20)` hit roll, modeled `rnd(2)` base damage, wake/anger side effects, hit-only mulch, and kicked-object landing for survivors.

## Tests

- `command kicked ruby harms ordinary monster and survives landing`
- `command kicked ruby miss against ordinary monster lands`
- `command kicked flint harms ordinary monster`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "command kicked (ruby harms ordinary|ruby miss against ordinary|flint harms ordinary|stone missile|glass gem|known ruby|known glass gem|unknown glass gem|ruby to tame unicorn|ruby to sleeping unicorn)" test/shop-billing-helpers.test.mjs` - 14 pass, 1711 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Full `hmon()` damage-bonus recomputation for kicked ammo, including strength and `u.udaminc`, remains separate; existing kicked glass canaries currently cover only the modeled `rnd(2)` base damage path.
- Broader kicked-object `thitmonst()` conversion is still incomplete for ordinary kicked weapons/weptools and downstream passive-object effects.
- Exact full `omon_adj()` target-size/sleep modifiers and passive object effects after surviving kicked gem hits remain separate work.
