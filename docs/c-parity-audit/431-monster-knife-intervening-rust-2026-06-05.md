# Monster Knife Intervening Rust

Date: 2026-06-05

## Summary

Production monster-thrown knives now check intervening monsters before continuing to iron-bars, catch, or hero-hit handling. A successful accidental hit wakes and damages the intervening target with knife `d3` damage plus the branch's `dmgval()`-style enchantment and erosion adjustment, lands the knife on that monster's square with `ohit=true`, and preserves passive-object ordering so a rust monster rusts the incoming knife before it can stack with a clean floor knife.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` includes `KNIFE` after dagger-family weapons and before stones, darts, and cream pies.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses ranged inventory objects from the C `rwep[]` order and hands them to the monster projectile path.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one thrown object before projectile flight.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster-thrown objects scan monster squares before the hero square and call `ohitmon()` for intervening monsters.
- `nethack-c/upstream/src/mthrowu.c:321` through `:350`: `ohitmon()` computes the accidental-hit threshold from `5 + find_mac(mtmp) + omon_adj(...)` and gates it with `rnd(20)`.
- `nethack-c/upstream/src/dothrow.c:1913`: `omon_adj()` can further adjust the hit threshold for object/target properties; JS still uses the existing simplified helper.
- `nethack-c/upstream/src/mthrowu.c:369` through `:399`: non-potion object hits wake the monster, compute `dmgval()`, and print object-hit wording.
- `nethack-c/upstream/src/mthrowu.c:451` through `:494`: non-potion object hits apply damage, avoid monster anger while `mon_moving`, and call `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` places the object, invokes `passive_obj()` when `ohit` is true, then stacks the object.
- `nethack-c/upstream/include/objects.h:218` through `:220`: ordinary knives are iron `P_KNIFE` weapons with `d3` small-target damage.
- `nethack-c/upstream/src/weapon.c:216` through `:252`: `dmgval()` rolls weapon damage, adds enchantment, subtracts erosion, and floors nonzero weapon damage at one.
- `nethack-c/upstream/src/uhitm.c:6145` through `:6184`: `passive_obj()` uses the target's `AT_NONE` passive attack; `AD_RUST` erodes vulnerable objects.
- `nethack-c/upstream/src/trap.c:246` through `:287`: object erosion mutates the object before the later stack merge.

## JS Changes

- `js/allmain.js`
  - Adds `monsterAtFlightSquare()` interception to the production knife branch before the per-square `rn2(5)` iron-bars force-hit roll.
  - Uses the shared accidental-hit `rnd(20)` gate for intervening monsters.
  - Wakes and damages the target with knife `rnd(3)` damage plus `spe` and erosion adjustment.
  - Routes the landed knife through `landMonsterThrownObject(..., { ohit: true })`, preserving passive-object erosion before stacking.
  - Applies the same `spe`/erosion damage adjustment to the existing knife hero-hit branch.
- `test/shop-billing-helpers.test.mjs`
  - Lets the knife production helper seed intervening monsters and initial floor objects.
  - Adds production coverage for a gnome-thrown knife hitting an intervening rust monster before iron bars, rusting only the incoming knife and leaving the pre-existing floor stack clean.

## Tests

- `production monster knife hits and rusts intervening rust monster object before stacking`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster (knife hits and rusts intervening rust monster object before stacking|knife aimed shot can pass through iron bars before hero|knife aimed shot can clonk iron bars before hero|spear hits and rusts intervening rust monster object before stacking|plain dagger hits and rusts intervening rust monster object before stacking|crude dagger hits and rusts intervening rust monster object before stacking)" test/shop-billing-helpers.test.mjs` - 6 pass, 1650 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1656 pass
- `node --test test/*.test.mjs` - 1807 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers only the knife production branch's ordinary nonlethal intervening-hit path. Shuriken, darts, sling missiles, launcher ammo, and broader generic `ohitmon()` extraction remain separate source-backed work.
- The JS accidental-hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses; this audit keeps the existing simplified helper.
- Lethal non-potion intervening hits do not yet run full C monster death cleanup, drop handling, or shifted resume-slot logic.
- Mimic reveal, poison, acid venom, egg, cream-pie, blinding, harmless pass-through, and non-ordinary knife-family variants remain outside this slice.
