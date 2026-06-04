# Monster Plain Dagger Intervening Rust

Date: 2026-06-04

## Summary

Production monster-thrown plain daggers now check intervening monsters before falling through to the hero catch/hit path. A successful accidental hit wakes and damages the intervening target with ordinary dagger `d4` damage, lands the dagger on that monster's square with `ohit=true`, and preserves the existing passive-object ordering so a rust monster rusts the incoming dagger before it can stack with a clean floor dagger.

This keeps the covered runtime path source-backed without adding replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one thrown object before projectile flight.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster-thrown objects scan monster squares before the hero square and call `ohitmon()` for intervening monsters.
- `nethack-c/upstream/src/mthrowu.c:321` through `:350`: `ohitmon()` computes the accidental-hit threshold from `5 + find_mac(mtmp) + omon_adj(...)` and gates it with `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:369` through `:399`: non-potion object hits wake the monster, compute `dmgval()`, and print object-hit wording.
- `nethack-c/upstream/src/mthrowu.c:451` through `:494`: non-potion object hits apply damage, avoid monster anger while `mon_moving`, and call `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` places the object, invokes `passive_obj()` when `ohit` is true, then stacks the object.
- `nethack-c/upstream/src/uhitm.c:6145` through `:6184`: `passive_obj()` uses the target's `AT_NONE` passive attack; `AD_RUST` erodes vulnerable objects.
- `nethack-c/upstream/src/trap.c:246` through `:287`: object erosion mutates the object and emits the visible erosion message from the victim/object perspective.
- `nethack-c/upstream/include/objects.h:200` through `:202`: ordinary daggers are iron, use `P_DAGGER`, and have `d4` small-target damage.

## JS Changes

- `js/allmain.js`
  - Adds `monsterAtFlightSquare()` interception to the plain/silver dagger production branch before the per-square terrain force-hit roll.
  - Uses the shared accidental-hit `rnd(20)` gate for intervening monsters.
  - Wakes and damages the intervening monster with plain dagger `rnd(4)` damage on hit.
  - Routes the landed dagger through `landMonsterThrownObject(..., { ohit: true })`, preserving passive-object erosion before stacking.
- `test/shop-billing-helpers.test.mjs`
  - Lets the plain dagger production helper seed intervening monsters and floor objects.
  - Adds production coverage for a gnome-thrown plain dagger hitting an intervening rust monster before iron bars, rusting only the incoming dagger and leaving the pre-existing floor stack clean.

## Tests

- `production monster plain dagger hits and rusts intervening rust monster object before stacking`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster (plain dagger (aimed shot clonks iron bars before hero|aimed iron bars are silent when deaf|hits and rusts intervening rust monster object before stacking)|crude dagger hits and rusts intervening rust monster object before stacking)" test/shop-billing-helpers.test.mjs` - 4 pass, 1650 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1654 pass
- `node --test test/*.test.mjs` - 1805 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers only the plain/silver dagger production branch's ordinary nonlethal intervening hit path. Ordinary knives, spears, shuriken, darts, sling missiles, launcher ammo, and broader generic `ohitmon()` extraction remain separate source-backed work.
- The JS hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses; this audit keeps the existing simplified accidental-hit helper.
- Lethal non-potion intervening hits do not yet run full C monster death cleanup, drop handling, or shifted resume-slot logic.
- Mimic reveal, poison, silver searing, acid venom, egg, cream-pie, blinding, and harmless pass-through follow-ups remain outside this slice.
