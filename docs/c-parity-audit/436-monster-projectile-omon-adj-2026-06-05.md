# Monster Projectile Omon Adj

Date: 2026-06-05

## Summary

Monster projectile intervening-hit rolls now include a C-shaped `omon_adj()` subset instead of using only `5 + AC`. Existing modeled monster-thrown potion, sling, spear, shuriken, dagger, knife, and dart interception checks pass the thrown object into a shared helper so target size, sleeping state, immobility, weapon enchantment, object hit bonus, blessed-vs-undead/demon bonus, and spear-vs-kebabable bonus can affect the `rnd(20)` threshold.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: `ohitmon()` checks `tmp = 5 + find_mac(mtmp) + omon_adj(mtmp, otmp, FALSE)` against `rnd(20)`, then only applies aimed-target shooter/artifact launcher bonuses for `gm.mtarget`.
- `nethack-c/upstream/src/dothrow.c:1913` through `:1947`: `omon_adj()` adds target size, sleeping, immobile, boulder/iron-ball, and `hitval()` adjustments; with `mon_notices=FALSE`, immobile targets do not get the wakeup `rn2(10)` side effect.
- `nethack-c/upstream/src/weapon.c:149` through `:180`: `hitval()` adds weapon enchantment, object `oc_hitbon`, blessed-vs-undead/demon bonus, spear-vs-kebabable bonus, and artifact bonus.
- `nethack-c/upstream/include/objects.h:1515` through `:1606`: sling gems and rocks are `GEM_CLASS` with zero object hit bonus, so target-side `omon_adj()` applies while object hit bonus stays neutral.
- `nethack-c/upstream/include/objects.h:201` through `:213`: dagger-family objects have object hit bonus `2`, which can turn a boundary accidental miss into a hit.

## JS Changes

- `js/allmain.js`
  - Threads the thrown object into all existing modeled intervening-monster projectile hit checks.
  - Replaces the target-only accidental-hit helper with a shared target/object adjustment helper.
  - Adds metadata-backed size, sleeping, immobile, weapon enchantment, object hit-bonus, blessed-target, and spear-kebabable threshold adjustments without adding extra RNG.
  - Keeps aimed-target shooter-level and artifact launcher bonuses out of this slice because current JS hero-directed projectile paths do not model `gm.marcher/gm.mtarget` monster-vs-monster aiming.
- `test/shop-billing-helpers.test.mjs`
  - Adds a sling loadstone boundary test proving a sleeping target's `+2` adjustment can turn `rnd(20)=20` from miss into hit.
  - Adds a plain dagger boundary test proving the dagger `oc_hitbon=2` path can turn `rnd(20)=19` from miss into hit.

## Tests

- `production monster sling sleeping target omon_adj can turn intervening miss into hit`
- `production monster plain dagger hit bonus can turn intervening miss into hit`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (sling sleeping target omon_adj|plain dagger hit bonus can turn)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (sling|potion|spear|shuriken|dart|knife|plain dagger|crude dagger).*intervening" test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1667 pass
- `node --test test/*.test.mjs` - 1818 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- `find_mac()` still uses modeled `ac/mac` metadata and does not yet compute full worn-monster armor state.
- Aimed-target shooter-level and artifact-launcher bonuses remain separate work; current JS does not yet have a full monster-vs-monster `gm.marcher/gm.mtarget` projectile path.
- Artifact `spec_abon()` remains intentionally deferred because it can introduce extra artifact-specific RNG and needs a focused path.
- Launcher-arrow intervening-monster interception is still absent and should be added as a separate slice using this helper.
- Generic `ohitmon()` extraction, mimic reveal, poison, acid venom, egg, blinding, lethal cleanup, and broader monster death/drop handling remain outside this slice.
