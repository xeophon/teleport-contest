# Monster Acid Potion Accidental Kill

Date: 2026-06-04

## Summary

Monster-thrown acid potions that hit an intervening monster now keep the C `POTHIT_OTHER_THROW` attribution when the acid is lethal. A visible accidental acid death prints the neutral `monkilled()` wording, does not print `You kill ...!`, and does not award hero experience, while still removing the monster, recording the death, consuming the thrown potion unit, and preserving any residual potion stack with the thrower.

The monster-turn handoff also preserves the throwing monster when the killed intervening monster appeared earlier in `game.level.monsters`, so a `--More--` pause after the accidental kill does not skip the thrower's next resume slot.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/include/obj.h:474` through `:478`: `POTHIT_OTHER_THROW` is the non-hero/non-monster-target propeller mode for `potionhit()`.
- `nethack-c/upstream/src/mthrowu.c:361` through `:367`: `ohitmon()` wakes the target and calls `potionhit(mtmp, otmp, POTHIT_OTHER_THROW)` for monster-object potion hits.
- `nethack-c/upstream/src/potion.c:1625` through `:1631`: `potionhit()` derives `your_fault` from `how <= POTHIT_HERO_THROW`, making `POTHIT_OTHER_THROW` non-hero fault.
- `nethack-c/upstream/src/potion.c:1728`: monster potion effects initialize `angermon` from `your_fault`.
- `nethack-c/upstream/src/potion.c:1870` through `:1881`: acid pain uses `d(cursed ? 2 : 1, blessed ? 4 : 8)` and lethal acid uses `killed(mon)` only for `your_fault`; otherwise it calls `monkilled(mon, "", AD_ACID)`.
- `nethack-c/upstream/src/mon.c:3377` through `:3393`: visible `monkilled(mon, "", ...)` prints the neutral killed/destroyed message without a cause string.

## JS Changes

- `js/cmd.js`
  - Extends `killMonsterFromPotionHit()` with a `heroFault` option.
  - Emits `You kill/destroy ...!` and awards experience only for hero-fault potion kills.
  - Emits visible neutral `... is killed/destroyed!` wording for non-hero-fault acid deaths.
  - Routes acid lethal damage through that attribution option while leaving non-acid potion kill families for separate source-backed work.
- `js/allmain.js`
  - Tracks the intervening monster's pre-hit index.
  - Resumes monster turns at the throwing monster's shifted index if the killed target was before the thrower and a `--More--` handoff occurs.
- `test/shop-billing-helpers.test.mjs`
  - Adds production coverage for a stacked monster-thrown acid potion killing a 1-HP intervening goblin before the hero catch branch.
  - Asserts neutral death wording, no hero catch/damage, residual stack retention, thrown unit consumption, and the expected hit/damage RNG calls.

## Tests

- `production monster acid potion kills intervening monster without hero attribution`

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster (acid potion kills intervening monster|potion hits intervening monster|acid potion failed catch)|hero-thrown acid potion can kill" test/shop-billing-helpers.test.mjs` - 5 pass, 1647 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1652 pass
- `node --test test/*.test.mjs` - 1803 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- This is not a general accidental lethal potion attribution audit. Non-acid potion kill families remain separate source-backed work.
- Water potion lethal branches in upstream `potionhit()` still call `killed(mon)` unconditionally in their currently modeled comments/paths; they should be audited separately before changing JS attribution.
- Broader `ohitmon()` behavior remains outside this slice, including non-potion missile damage, `omon_adj()` bonuses, projectile miss/drop messages, mimic reveal details, and passive object delivery.
- The C `monkilled(mon, "", AD_ACID)` path does not grow the throwing monster, so monster growth from this accidental acid kill is intentionally not modeled here.
