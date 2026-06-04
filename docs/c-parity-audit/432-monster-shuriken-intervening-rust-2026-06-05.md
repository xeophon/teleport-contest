# Monster Shuriken Intervening Rust

Date: 2026-06-05

## Summary

Production monster-thrown shuriken now check intervening monsters before continuing to iron-bars, catch, or hero-hit handling. A successful accidental hit wakes and damages the intervening target with shuriken `d8` damage plus enchantment and erosion adjustment, lands the shuriken on that monster's square with `ohit=true`, and preserves C `drop_throw()` ordering: hit-only mulch happens before floor placement/passive effects, while a surviving ordinary iron shuriken can be rusted by a rust monster before it stacks with a clean floor shuriken.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:163` through `:165`: shuriken are iron `-P_SHURIKEN` weapons with `d8` small-target damage and a to-hit bonus.
- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` selects `SHURIKEN` after spear-family weapons and before launcher ammo, daggers, and knives.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses ranged inventory objects from the C `rwep[]` order and hands them to the monster projectile path.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one thrown object before projectile flight.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster-thrown objects scan monster squares before the hero square and call `ohitmon()` for intervening monsters.
- `nethack-c/upstream/src/mthrowu.c:321` through `:350`: `ohitmon()` computes the accidental-hit threshold from `5 + find_mac(mtmp) + omon_adj(...)` and gates it with `rnd(20)`.
- `nethack-c/upstream/src/dothrow.c:1913`: `omon_adj()` can further adjust the hit threshold for object/target properties; JS still uses the existing simplified helper.
- `nethack-c/upstream/src/mthrowu.c:369` through `:399`: non-potion object hits wake the monster, compute `dmgval()`, and print object-hit wording.
- `nethack-c/upstream/src/mthrowu.c:451` through `:494`: non-potion object hits apply damage, avoid monster anger while `mon_moving`, and call `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` does hit-only breakage/mulch first; surviving objects are placed, passed through `passive_obj()`, then stacked.
- `nethack-c/upstream/src/dothrow.c:1974` through `:1994`: ordinary +0 shuriken use `should_mulch_missile()` and consume `rn2(3)`, breaking on nonzero.
- `nethack-c/upstream/src/weapon.c:216` through `:252`: `dmgval()` rolls weapon damage, adds enchantment, subtracts erosion, and floors nonzero weapon damage at one.
- `nethack-c/upstream/src/uhitm.c:6145` through `:6184`: `passive_obj()` uses the target's `AT_NONE` passive attack; `AD_RUST` erodes vulnerable objects.
- `nethack-c/upstream/src/trap.c:246` through `:287`: object erosion mutates the object before the later stack merge.

## JS Changes

- `js/allmain.js`
  - Adds `monsterAtFlightSquare()` interception to the production shuriken branch before the per-square `rn2(5)` iron-bars force-hit roll.
  - Uses the shared accidental-hit `rnd(20)` gate for intervening monsters.
  - Wakes and damages the target with shuriken `rnd(8)` damage plus `spe` and erosion adjustment.
  - Routes the landed shuriken through `landMonsterThrownObject(..., { ohit: true })`, preserving hit-only mulch and passive-object erosion before stacking.
- `js/cmd.js`
  - Treats shuriken and throwing stars as iron-like rust-prone weapons in the object damage profile so an ordinary iron shuriken can rust before stacking.
- `test/shop-billing-helpers.test.mjs`
  - Adds production coverage for a gnome-thrown shuriken hitting an intervening rust monster before iron bars.
  - Covers both a surviving incoming shuriken that rusts before stacking and a mulched incoming shuriken that is consumed before passive rust or stacking.

## Tests

- `production monster shuriken hits and rusts intervening rust monster object before stacking`
- `production monster shuriken hit on intervening rust monster can mulch before passive rust or stacking`

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "production monster shuriken" test/shop-billing-helpers.test.mjs` - 9 pass, 1649 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1658 pass
- `node --test test/*.test.mjs` - 1809 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers only the shuriken production branch's ordinary nonlethal intervening-hit path. Darts, sling missiles, launcher ammo, and broader generic `ohitmon()` extraction remain separate source-backed work.
- The JS accidental-hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses; this audit keeps the existing simplified helper.
- Lethal non-potion intervening hits do not yet run full C monster death cleanup, drop handling, or shifted resume-slot logic.
- Mimic reveal, poison, acid venom, egg, cream-pie, blinding, harmless pass-through, and non-ordinary shuriken aliases remain outside this slice.
