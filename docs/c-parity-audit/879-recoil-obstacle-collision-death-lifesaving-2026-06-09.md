# Recoil Obstacle Collision Death Lifesaving

## C anchors

- `nethack-c/upstream/src/dothrow.c:1078` through `:1125` implement `hurtle()`: print the optional `You hurtle/float in the opposite direction.` message, then walk the recoil path through `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:797` through `:836` handle obstacle collision before moving the hero into the obstacle square. Walls/closed doors print `Ouch!`, iron bars and boulders print their specific crash/bump messages, then collision damage is `rnd(2 + *range)`.
- `nethack-c/upstream/src/dothrow.c:836` calls `losehp(Maybe_Half_Phys(dmg), why, KILLED_BY)`, where `why` is the C death cause such as `bumping into a wall` or `bumping into a boulder`.
- `nethack-c/upstream/src/dothrow.c:837` wakes nearby monsters and returns false from `hurtle_step()`, so the hurtle stops at the prior square whether damage was nonfatal, fatal, or life-saved.
- `nethack-c/upstream/src/hack.c:4256` through `:4288` and `nethack-c/upstream/src/end.c:1081` through `:1119` make lethal `losehp()` route through ordinary death or amulet life saving; successful life saving restores HP and returns to the caller.

## JS parity

- `heroHorizontalThrowRecoilObstacleCollision()` now turns lethal obstacle damage into the shared fatal/life-saving result shape by calling the existing `heroDartTrapFatalResult(messages, why)` helper after the C-shaped collision message and damage roll.
- `heroHorizontalThrowRecoilResult()` now propagates that collision result through `trapResult`, preserving the existing recoil message and collision message order while allowing callers to enter `deathDieMore` or `lifeSavingMore`.
- Existing kick and ordinary throw callers already route recoil `trapResult` through `applyLifeSavingOrFatalCommandMode()`, so no seed- or replay-specific branches are needed.
- The `f` command recoil caller now checks `fireRecoilResult.trapResult` instead of top-level `lifeSaving`/`fatal`, matching the result shape used by the shared recoil helper.
- The hero remains on the pre-collision square because JS already checks obstacles before moving, matching C `hurtle_step()`.

## Canaries

- `levitating command kicked object ouch recoil wall collision can be fatal` covers painful-kick recoil into a wall after nonfatal initial `kick_ouch()` damage: range RNG, wall collision damage RNG, death cause, no movement into the wall, and death command mode.
- `levitating command kicked object ouch recoil wall collision uses life saving` covers the same wall collision with a worn amulet, including medallion consumption, `lifeSavingMore`, and HP/death-state cleanup after More.
- `levitating hero-thrown ordinary weapon recoil boulder collision can kill hero` covers the ordinary `t` throw caller, fixed one-square recoil, boulder collision damage, wake-nearby side effects, and final death mode.
- `levitating hero-thrown ordinary weapon recoil boulder collision uses life saving` covers ordinary throw recoil boulder collision with amulet life saving and the post-More recovery.

## Remaining follow-up

- Boomerang pre-recoil obstacle death and life-saving continuation are covered by `880-boomerang-pre-recoil-lifesaving-continuation-2026-06-09.md`.
- Recoil monster collision is still non-damaging in both C and JS for the currently modeled path; deeper sensory and wake details remain broader `hurtle_step()` parity if hidden tests target them.

## Verification

- `node --check js/cmd.js` (passed)
- `node --check test/shop-billing-helpers.test.mjs` (passed)
- `node --test --test-reporter=dot --test-name-pattern "recoil wall collision|recoil boulder collision|recoil bumps boulder with C damage|kicked object ouch hurtles after nonfatal damage" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` (`2978` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
- `git diff --check` (passed)
