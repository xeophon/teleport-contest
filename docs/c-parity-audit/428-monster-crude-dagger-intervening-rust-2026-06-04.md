# Monster Crude Dagger Intervening Rust

Date: 2026-06-04

## Summary

Production monster-thrown crude/orcish daggers now check arbitrary intervening monsters before continuing toward the hero. A hit wakes and damages the target, lands the thrown dagger on that monster's square with `ohit=true`, and runs the existing passive-object delivery path so a rust monster can rust the incoming dagger before it stacks with another dagger already on the floor.

This keeps the covered runtime path source-backed without adding replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster-thrown objects scan monster squares before the hero square and call `ohitmon()` for intervening monsters.
- `nethack-c/upstream/src/mthrowu.c:321` through `:350`: `ohitmon()` computes the accidental-hit threshold from `5 + find_mac(mtmp) + omon_adj(...)` and gates it with `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:369` through `:399`: non-potion object hits wake the monster, compute `dmgval()`, and print the object-hit wording.
- `nethack-c/upstream/src/mthrowu.c:451` through `:494`: non-potion object hits apply damage, avoid monster anger while `mon_moving`, and call `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` places the object, invokes `passive_obj()` when `ohit` is true, then stacks the object.
- `nethack-c/upstream/src/uhitm.c:6145` through `:6184`: `passive_obj()` uses the target's `AT_NONE` passive attack; `AD_RUST` erodes vulnerable objects.
- `nethack-c/upstream/src/trap.c:246` through `:287`: object erosion mutates the object and emits the visible erosion message from the victim/object perspective.
- `nethack-c/upstream/include/objects.h:206` through `:208`: orcish daggers are the crude dagger appearance, iron material, and use `d3` small-target damage.

## JS Changes

- `js/allmain.js`
  - Generalizes the crude/orcish dagger production flight scan from pets only to any live monster returned by `monsterAtFlightSquare()`.
  - Adds the non-potion accidental-hit `rnd(20)` gate before stopping the projectile at an intervening monster.
  - Wakes and damages the intervening target with crude dagger `rnd(3)` damage.
  - Routes the landed dagger through `landMonsterThrownObject(..., { ohit: true })`, preserving passive-object erosion before stacking.
- `test/shop-billing-helpers.test.mjs`
  - Lets the crude dagger production helper seed existing floor objects.
  - Adds production coverage for a goblin-thrown crude dagger hitting an intervening rust monster before iron bars, rusting only the incoming dagger and leaving the pre-existing floor stack clean.

## Tests

- `production monster crude dagger hits and rusts intervening rust monster object before stacking`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster crude dagger (hits pet before iron bars|hits and rusts intervening rust monster object before stacking|iron bars stop before pet)" test/shop-billing-helpers.test.mjs` - 3 pass, 1650 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1653 pass
- `node --test test/*.test.mjs` - 1804 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers only the production crude/orcish dagger branch. Plain daggers, silver daggers, knives, spears, shuriken, launcher ammo, sling missiles, and generic object-hit routing remain separate source-backed work.
- The JS hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses; this audit only shares the existing simplified accidental-hit helper with monster-thrown potions.
- Lethal non-potion intervening hits do not yet run full C monster death cleanup, drop handling, or shifted resume-slot logic.
- Mimic reveal, poison, silver, acid venom, egg, cream-pie, blinding, and harmless pass-through follow-ups remain outside this slice.
- The deferred `--More--` payload still uses the legacy `hitPet` field name for compatibility with the existing landing handler.
