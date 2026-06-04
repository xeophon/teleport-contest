# Monster Sling Intervening Hit

Date: 2026-06-05

## Summary

Production monster-slung ammo now checks occupied flight squares before continuing to iron-bars, unicorn/hero catch, or hero-hit handling. A successful accidental hit wakes and damages the intervening target with sling-ammo `dmgval()`-style dice, lands the ammo on that monster's square with `ohit=true`, and preserves C `drop_throw()` ordering: hit-only ammo mulch happens before floor placement, passive-object handling, and stacking.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` ranks flint, rocks, loadstones, and luckstones before darts.
- `nethack-c/upstream/src/weapon.c:615` through `:627`: sling fallback can select arbitrary `GEM_CLASS` ammo when the monster has a sling, while skipping gem-liking monsters and cursed loadstones.
- `nethack-c/upstream/include/obj.h:238` through `:244`: `is_ammo()` includes `GEM_CLASS` negative-launcher-skill objects, which covers sling ammo.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one projectile before flight.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster projectiles scan monster squares and call `ohitmon()` before testing the hero square.
- `nethack-c/upstream/src/mthrowu.c:798` through `:815`: the per-square `forcehit = !rn2(5)` terrain/iron-bars check happens after monster and hero handling.
- `nethack-c/upstream/src/mthrowu.c:321` through `:350`: `ohitmon()` computes the accidental-hit threshold from `5 + find_mac(mtmp) + omon_adj(...)` and gates it with `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:369` through `:494`: non-potion object hits compute `dmgval()`, wake/damage the target, and call `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/include/objects.h:1515` through `:1524` and `:1598` through `:1606`: sling gems and gray stones use `GEM_CLASS`, `-P_SLING`, ordinary `d3` damage, and flint `d6` damage.
- `nethack-c/upstream/src/weapon.c:216` through `:350`: `dmgval()` rolls object damage dice; gem ammo is not `Is_weapon`, so `spe` is not added, while positive damage still floors at one after erosion adjustment.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` runs hit-only missile mulch before placement, then invokes `passive_obj()` before stacking when `ohit` is true.
- `nethack-c/upstream/src/dothrow.c:1976` through `:2000`: `should_mulch_missile()` handles ammo mulch, blessed survival, and hard-gem/flint survival.
- `nethack-c/upstream/src/uhitm.c:6127` through `:6184`: `passive_obj()` runs passive fire/acid/rust/corrosion/disenchant object effects after a hit.

## JS Changes

- `js/allmain.js`
  - Adds `monsterAtFlightSquare()` interception to the production sling branch before the per-square iron-bars `rn2(5)` force-hit roll.
  - Uses the shared accidental-hit `rnd(20)` gate for intervening monsters.
  - Wakes and damages the target with `rnd(monsterSlingAmmoDamageSides(...))`, preserving the current sling damage classifier: ordinary rocks/gems/stones use `d3`, flint uses `d6`.
  - Routes the landed sling ammo through `landMonsterThrownObject(..., { ohit: true })`, preserving hit-only mulch, passive-object handling, and stacking.
- `test/shop-billing-helpers.test.mjs`
  - Lets the sling production helper seed intervening monsters and initial floor objects.
  - Adds production coverage for a slung rock hitting an intervening monster before iron bars and stacking if it survives hit-only mulch.
  - Adds production coverage for a slung rock mulching on an intervening hit before it can stack.
  - Adds a gray-stone/loadstone acid-passive canary showing `ohit=true` reaches passive-object handling without incorrectly applying visible gem-class erosion.

## Tests

- `production monster sling rock hits intervening monster before iron bars and stacks surviving rock`
- `production monster sling rock hit on intervening monster can mulch before stacking`
- `production monster sling loadstone intervening acid passive runs before stacking`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "production monster sling (rock hits intervening|rock hit on intervening|loadstone intervening)" test/shop-billing-helpers.test.mjs` - 3 pass, 1660 skipped
- `node --test --test-reporter=dot --test-name-pattern "sling" test/shop-billing-helpers.test.mjs` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1663 pass
- `node --test test/*.test.mjs` - 1814 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers the production sling branch's ordinary nonlethal intervening-hit path. Launcher ammo and broader generic `ohitmon()` extraction remain separate source-backed work.
- The JS accidental-hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses; this audit keeps the existing simplified helper.
- Real gems and gray stones can pass harmlessly through rock-passing monsters in C; that harmless `stone_missile()` branch remains outside this slice.
- Lethal non-potion intervening hits do not yet run full C monster death cleanup, drop handling, or shifted resume-slot logic.
- Mimic reveal, poison, acid venom, egg, cream-pie, blinding, and broader sling-gem selection/damage refinements remain outside this slice.
