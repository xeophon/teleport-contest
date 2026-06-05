# C Parity Audit 464: Hero Projectile Omon Adj

Implemented the C `omon_adj()` target-state hit-value adjustment for the currently modeled hero stone/gem projectile d20 paths. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1913-1947`: `omon_adj()` adds monster size relative to `MZ_MEDIUM`, `+2` for sleeping, `+4` for immobile targets, a `mon_notices` thaw chance via `rn2(10)`, object bonuses for heavy iron balls and boulders, and `hitval()` for weapons, weapon-tools, and `GEM_CLASS`.
- `nethack-c/upstream/include/monflag.h:177-183`: monster size values are `TINY=0`, `SMALL=1`, `MEDIUM=2`, `LARGE=3`, `HUGE=4`, and `GIGANTIC=7`.
- `nethack-c/upstream/src/dothrow.c:2074`: hero `thitmonst()` adds `omon_adj(mon, obj, TRUE)` before unicorn catch handling and before the d20 hit roll.
- `nethack-c/upstream/src/dothrow.c:2152-2162`: the d20 roll is compared against the adjusted hit value; thrown ammo without launcher gets `-4`, and kicked ammo gets `-5`.
- `nethack-c/upstream/src/dokick.c:733-749`: kicked floor objects use `thitmonst()` through `bhit(..., KICKED_WEAPON, ..., &gk.kickedobj)`.
- `nethack-c/upstream/src/weapon.c:149-180`: `hitval()` adds weapon/tool enchantment and object hit bonuses; blessed weapon and spear special hit bonuses remain relevant for broader weapon paths.

## JS Changes

- `js/cmd.js`
  - Adds hero projectile `omon_adj()` helpers for C monster size values, sleeping bonus, immobile bonus, and the `mon_notices` `rn2(10)` thaw side effect.
  - Adds object adjustment support for heavy iron balls, boulders, explicit `hitbon`/`oc_hitbon`, and weapon/tool `spe`.
  - Evaluates the adjusted hit value before `rnd(20)` for direct hero-thrown gems, direct hero-thrown stone/gray-stone harmless rock-passer hits, kicked gems, and kicked stone/gray-stone harmless rock-passer hits.
  - Converts the direct hero-thrown stone/gray-stone harmless rock-passer branch from its older dex `rnd(25)` gate to the same C-shaped d20 hit-value check as direct gems.

## Tests

- Updated direct loadstone hit/miss canaries to remove the old `rnd(25)` roll and retuned the miss setup against the C hit-value threshold.
- Added a kicked ruby sleeping-target boundary canary where the C `+2` sleeping adjustment turns the first d20 roll from a miss into a hit.
- Added a kicked ruby immobile-target canary proving `rn2(10)` runs before `rnd(20)` and can clear `mcanmove`/`mfrozen` before the hit.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "(hero-thrown loadstone|hero-thrown stone missile|hero-thrown glass gem|hero-thrown ruby|command kicked stone missile|command kicked glass gem|command kicked ruby|command kicked flint)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Full generic `thitmonst()` extraction for ordinary direct/kicked weapons and weapon-tools remains separate.
- Full default object `oc_hitbon` tables, blessed-weapon to-hit, spear-vs-kebabable to-hit, and artifact hit bonuses remain separate for broader weapon paths; these are normally neutral for the current gem/stone cases.
- Passive-object RNG/grease effects after surviving direct or kicked projectile hits remain separate.
- Unicorn gem catch/gift handling still uses the earlier pre-catch thaw shim for the RNG-relevant part of C's pre-catch `omon_adj()` call.
