# Monster Spear Intervening Rust

Date: 2026-06-05

## Summary

Production monster-thrown spears now check intervening monsters before continuing to iron-bars, catch, or hero-hit handling. A successful accidental hit wakes and damages the intervening target with the existing spear `dmgval()`-style small-target dice, lands the spear on that monster's square with `ohit=true`, and preserves passive-object ordering so a rust monster rusts the incoming spear before it can stack with a clean floor spear.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` ranks spear-family weapons before shuriken, launcher ammo, daggers, knives, stones, darts, and cream pies.
- `nethack-c/upstream/include/objects.h:174` through `:191`: spear-family object metadata includes material, `P_SPEAR`, and small-target damage dice; ordinary spears are iron and use `d6` small-target damage.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one thrown object before projectile flight.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster-thrown objects scan monster squares before the hero square and call `ohitmon()` for intervening monsters.
- `nethack-c/upstream/src/mthrowu.c:321` through `:350`: `ohitmon()` computes the accidental-hit threshold from `5 + find_mac(mtmp) + omon_adj(...)` and gates it with `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:369` through `:399`: non-potion object hits wake the monster, compute `dmgval()`, and print object-hit wording.
- `nethack-c/upstream/src/mthrowu.c:451` through `:494`: non-potion object hits apply damage, avoid monster anger while `mon_moving`, and call `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` places the object, invokes `passive_obj()` when `ohit` is true, then stacks the object.
- `nethack-c/upstream/src/uhitm.c:6145` through `:6184`: `passive_obj()` uses the target's `AT_NONE` passive attack; `AD_RUST` erodes vulnerable objects.
- `nethack-c/upstream/src/trap.c:246` through `:287`: object erosion mutates the object before the later stack merge.

## JS Changes

- `js/allmain.js`
  - Adds `monsterAtFlightSquare()` interception to the production spear branch before the per-square `rn2(5)` iron-bars force-hit roll.
  - Uses the shared accidental-hit `rnd(20)` gate for intervening monsters.
  - Wakes and damages the target with the existing spear damage helper, enchantment, and erosion adjustment.
  - Routes the landed spear through `landMonsterThrownObject(..., { ohit: true })`, preserving passive-object erosion before stacking.
- `test/shop-billing-helpers.test.mjs`
  - Lets the spear production helper seed intervening monsters and initial floor objects.
  - Adds production coverage for a gnome-thrown spear hitting an intervening rust monster before iron bars, rusting only the incoming spear and leaving the pre-existing floor stack clean.

## Tests

- `production monster spear hits and rusts intervening rust monster object before stacking`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster (spear hits and rusts intervening rust monster object before stacking|spear hit uses spear damage and text|spear aimed shot can pass through iron bars before hero|plain dagger hits and rusts intervening rust monster object before stacking|crude dagger hits and rusts intervening rust monster object before stacking)" test/shop-billing-helpers.test.mjs` - 5 pass, 1650 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1655 pass
- `node --test test/*.test.mjs` - 1806 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers only the spear production branch's ordinary nonlethal intervening-hit path. Shuriken, knives, darts, sling missiles, launcher ammo, and broader generic `ohitmon()` extraction remain separate source-backed work.
- The JS accidental-hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses; this audit keeps the existing simplified helper.
- Lethal non-potion intervening hits do not yet run full C monster death cleanup, drop handling, or shifted resume-slot logic.
- Mimic reveal, poison, silver searing, acid venom, egg, cream-pie, blinding, harmless pass-through, and full variant spear side effects remain outside this slice.
