# C Parity Audit 235: Polyself Levitation Boots Special Float-Down

## Sources

- `nethack-c/upstream/src/polyself.c:1273-1284`: no-hands, very small, slithy, and centaur polyself forms print the boot falloff message, call `Boots_off()`, then drop the boot object.
- `nethack-c/upstream/src/do_wear.c:300-307`: losing levitation boots calls `float_down(0L, 0L)` when no other levitation source remains, then calls `makeknown(otyp)`.
- `nethack-c/upstream/src/trap.c:4032-4035`: `float_down()` clears levitation masks and returns early if another levitation source remains.
- `nethack-c/upstream/src/trap.c:4056-4063`: when controlled flight resumes after levitation ends, C prints `You have stopped levitating and are now flying.`
- `nethack-c/upstream/src/trap.c:4114-4117`: air-level float-down prints `You begin to tumble in place.` and water-level float-down prints `You feel heavier.`

## JS Changes

- Split levitation boot fallout into a message-selection helper and a source-clearing helper.
- Added the controlled-flight branch for polyself levitation boot loss while preserving the active flying state.
- Added air-level and water-level messages by reusing the existing `Is_airlevel()` and `Is_waterlevel()` predicates.
- Kept the previous ordinary dry-ground branch unchanged and still gated liquid, trap, swallowed/engulfed, and other broad `float_down()` cases for separate slices.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Centaur polyself with levitation boots and active flight now prints the controlled-flight message, clears levitation, preserves flight, learns the boots, and drops them.
- Centaur polyself with levitation boots on the air level now prints the tumble message, clears levitation, learns the boots, and drops them.
- Centaur polyself with levitation boots on the water level now prints the heavier message, clears levitation, learns the boots, and drops them.

## Remaining Gaps

- Pool, lava, trap, Sokoban, swallowed/engulfed, steed, hallucination, blocked levitation, and post-landing pickup/encumbrance effects from `float_down()` are still not modeled for polyself levitation boot loss.
- JS levitation source tracking remains thinner than C's `HLevitation`, `ELevitation`, and `BLevitation` masks.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "levitation boots|polyself.*boots|water walking boots|speed boots" test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1133/1133` tests passed)
- `node --test test/*.mjs` (`1230/1230` tests passed)
- `npm run score` (`44/44` passing)
