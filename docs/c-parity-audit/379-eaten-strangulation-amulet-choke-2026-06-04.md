# Eaten Strangulation Amulet Choke

Date: 2026-06-04

## Summary

Aligned metallivorous eating of an amulet of strangulation with C's `choke(otmp)` branch. The eaten amulet can recover for breathless or Hunger-protected heroes, has the C 1-in-20 random recovery chance when the hero is not already strangled, and fatal choking now uses metal/amulet wording and the death-more handoff instead of setting a persistent strangled state.

## Upstream source anchors

- `nethack-c/upstream/src/eat.c:245` through `:288`: `choke(food)` exercises constitution, recovers for `Breathless`, `Hunger`, or `!Strangled && !rn2(20)`, prints the amulet recovery message for `AMULET_OF_STRANGULATION`, otherwise prints `foodword(food)` and calls `done(CHOKING)`.
- `nethack-c/upstream/src/eat.c:2265` through `:2280`: `eataccessory()` observes/taste-identifies eaten rings and amulets, then rolls `rn2(3)` for rings or `rn2(5)` for amulets before applying effects.
- `nethack-c/upstream/src/eat.c:2385` through `:2388`: eaten `AMULET_OF_STRANGULATION` calls `choke(otmp)` and gives no permanent effect message.
- `nethack-c/upstream/src/eat.c:2414` through `:2421`: `eatspecial()` applies non-food nutrition before accessory effects.
- `nethack-c/upstream/src/eat.c:2452` through `:2485`: eaten rings and amulets route through `eataccessory()` before carried/floor object consumption.
- `nethack-c/upstream/include/objects.h:831` through `:841`: amulets are iron objects with nutrition 20, so `foodword(food)` renders as metal.

## JS changes

- `js/cmd.js`
  - Added `eatenAmuletStrangulationChoke()` for the C `choke(otmp)` recovery and death branches.
  - Changed eaten amulet-of-strangulation handling from unconditional strangulation death to the C recovery/death roll.
  - Preserved the eaten-object consumption path while allowing fatal or life-saving accessory effects to set the follow-up command mode and `--More--` behavior after the item is removed.

## Tests

- `metallivorous eaten strangulation amulet recovers for breathless heroes` covers the no-`rn2(20)` recovery path and verifies the amulet is consumed after nutrition.
- `metallivorous eaten strangulation amulet uses C random recovery roll` covers the `!Strangled && !rn2(20)` recovery path.
- `metallivorous eaten strangulation amulet can fatally choke over metal` covers the non-recovery branch, fatal `deathDieMore` handoff, metal wording, amulet death cause, and absence of a persistent `strangled` flag.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "eaten strangulation amulet" test/shop-billing-helpers.test.mjs` - 3 pass, 1515 skipped
- `node --test --test-name-pattern "metallivorous (metal ring eating|worn metal ring|slow digestion ring|metal amulet|eaten strangulation amulet)" test/shop-billing-helpers.test.mjs` - 11 pass, 1507 skipped
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1518 pass
- `node --test test/*.mjs` - 1661 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Broader eaten-accessory source-mask cleanup remains open; this slice does not introduce C `FROMOUTSIDE`-style source tracking for ring/amulet intrinsics.
- Full C food-overeating choking and broader life-saving death choreography remain open; this slice only covers the eaten amulet-of-strangulation `choke(otmp)` branch.
