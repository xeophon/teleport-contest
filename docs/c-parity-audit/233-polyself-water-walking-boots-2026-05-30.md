# C Parity Audit 233: Polyself Water-Walking Boots

## Sources

- `nethack-c/upstream/src/polyself.c:1273-1284`: no-hands, very small, slithy, and centaur polyself forms print the boot falloff message, call `Boots_off()`, then drop the boot object.
- `nethack-c/upstream/src/do_wear.c:262-291`: `Boots_off()` clears worn boots before handling side effects; water-walking boots become known and call `spoteffects(TRUE)` when the hero is on water or lava without levitation, flight, ceiling-clinging, cancelled donning, or lava recursion.
- `nethack-c/upstream/src/hack.c:3271-3306`: `pooleffects(TRUE)` handles entering water or lava after water walking is lost.
- `nethack-c/upstream/src/trap.c:5078-5084`: entering ordinary water prints the fall and sink messages.
- `nethack-c/upstream/src/trap.c:5151-5165`: a successful crawl-out attempt prints the crawl and `Pheew!` messages, then relocates the hero.

## JS Changes

- Added water-walking boot fallout to the polyself boot drop path, after the boot is treated as no longer worn and before the object is left on the floor.
- Detects the hero standing on a pool, moat, or water wall when water-walking boots are pushed off, unless levitation, flight, or a clinging form prevents the fall.
- Marks water-walking boots known when the fall is triggered, matching C's `makeknown()` before `spoteffects(TRUE)`.
- Reuses the existing forced-water movement flow by queuing `_relocate_after_more` and `_topline_after_more`; the initial polyself message pauses at More, then the More handler moves the hero to the dry landing square and shows the crawl-out result.
- Leaves lava and levitation boot fallout out of this slice so those branches can be handled with their own source-backed tests.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Centaur polyself over a pool pushes off water-walking boots, learns their identity, leaves them on the original water square, reports falling and sinking, pauses for More, then relocates the hero to a deterministic dry adjacent square with the crawl-out message.
- Centaur polyself on dry terrain still pushes off water-walking boots but does not learn their identity, does not queue relocation, and does not print water fallout.
- Existing speed-boots and no-hands boot-drop tests continue to cover the shared boot fallout path.

## Remaining Gaps

- Lava fallout from `Boots_off()` is still not modeled in polyself boot loss.
- Levitation boot `float_down()` work is now split across audits 234, 235, and 336.
- Successful crawl-out placement is covered in audit 336; emergency disrobe, fatal drowning, amphibious/swimming/breathless handling, hallucinated Titanic wording, and exact C `rnd_nextto_goodpos()` selection remain broader water-entry gaps.
- Ceiling-clinger handling uses form metadata but does not yet model level-specific ceiling availability.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "successful centaur polyself losing water walking boots falls into pool and crawls out" test/shop-billing-helpers.test.mjs` (`1` matching test passed)
- `node --test --test-name-pattern "water walking boots|speed boots|polyself.*boots" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1128/1128` tests passed)
- `node --test test/*.mjs` (`1225/1225` tests passed)
- `npm run score` (`44/44` passing)
