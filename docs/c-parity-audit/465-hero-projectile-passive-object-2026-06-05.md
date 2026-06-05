# C Parity Audit 465: Hero Projectile Passive Object

Implemented the C `passive_obj()` follow-up for surviving direct and kicked hero stone/gem projectile hits currently modeled by the JS port. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1481`: direct hero throws route monster impacts through `thitmonst(mon, obj)`.
- `nethack-c/upstream/src/dokick.c:742`: kicked floor objects route monster impacts through `thitmonst(mon, gk.kickedobj)`.
- `nethack-c/upstream/src/dothrow.c:2205-2226`: successful `thitmonst()` calls `hmon()`, exercises Dexterity, checks hit-only missile mulch, then calls `passive_obj(mon, obj, NULL)` for surviving objects.
- `nethack-c/upstream/src/dothrow.c:1780-1838`: direct hero projectiles land, place, and stack after `thitmonst()` returns.
- `nethack-c/upstream/src/dokick.c:771`: kicked objects run floor effects, place, and stack after `thitmonst()` returns.
- `nethack-c/upstream/src/uhitm.c:6145-6179`: `passive_obj()` picks an `AT_NONE` passive attack when no explicit attack is supplied; `AD_FIRE` and `AD_ACID` consume `rn2(6)`, `AD_RUST`/`AD_CORR` do not, and `AD_ENCH` routes through `drain_item(obj, TRUE)`.
- `nethack-c/upstream/src/trap.c:246` and `nethack-c/upstream/src/trap.c:377`: grease handling precedes `erosion_matters()` and can consume `rn2(2)` and clear `obj->greased`.
- `nethack-c/upstream/src/objnam.c:1195`: `GEM_CLASS` objects do not otherwise matter for erosion, so ungreased gems/stones receive no erosion.

## JS Changes

- `js/cmd.js`
  - Threads hit state and the explicit target monster from the current direct and kicked hero stone/gem projectile paths into the landing helpers.
  - Runs passive-object handling for hit, surviving direct hero projectiles before hard-landing break RNG, floor effects, shipping, placement, and stacking.
  - Runs passive-object handling for hit, surviving kicked projectiles before kicked floor effects, placement, and stacking.
  - Preserves hit-only mulch as the gate before passive delivery; mulched or consumed projectiles do not run passive handling.
  - Updates the shared passive-object helper so `AD_FIRE` consumes its C `rn2(6)` before cancellation/steam-vortex suppression, `AD_ACID` consumes its C `rn2(6)`, and grease checks run before gem/stone erosion eligibility.

## Tests

- Added a kicked greased glass-gem hit against `AD_CORR` passive that survives hit-only mulch, consumes the kicked grease range roll, and clears grease without eroding the gem.
- Added a direct hero-thrown glass-gem hit against `AD_ACID` passive that consumes passive `rn2(6)` before the hard-landing `rn2(100)` break roll and leaves the gem un-eroded.
- Kept adjacent direct/kicked stone/gem, monster-thrown passive, and direct melee passive canaries in the focused verification set to catch ordering regressions.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "(kicked greased glass gem|hero-thrown glass gem hit runs acid passive|hero-thrown glass gem|hero-thrown ruby|command kicked glass gem|command kicked ruby|monster-thrown dagger hit applies rust monster passive|production monster sling loadstone intervening acid passive|direct hero melee cancelled fire passive)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Full generic `thitmonst()` extraction for ordinary direct/kicked weapons and weapon-tools remains separate.
- Full default object `oc_hitbon` tables, blessed-weapon to-hit, spear-vs-kebabable to-hit, and artifact hit bonuses remain separate for broader weapon paths.
- Additional hero/polyself passive-object canaries for passive types beyond current direct/kicked stone/gem cases remain separate.
- Unicorn gem catch/gift handling still uses the earlier pre-catch thaw shim for the RNG-relevant part of C's pre-catch `omon_adj()` call.
