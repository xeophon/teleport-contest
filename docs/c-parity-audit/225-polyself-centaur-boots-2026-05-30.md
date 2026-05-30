# C Parity Audit 225: Polyself Centaur Boot Fallout

## Sources

- `nethack-c/upstream/src/polyself.c:1273-1284`: successful `break_armor()` drops worn boots when the new form has no hands, is very small, is slithy, or is a centaur. Whirly forms use `Your boots fall away!`; very small forms use `slide`; the other forms use `are pushed`.
- `nethack-c/upstream/src/do_wear.c:262-278`: `Boots_off()` clears worn boots and reports speed-boots slowdown when no other very-fast source remains.
- `nethack-c/upstream/src/do.c:786-829`: `dropx()`/`dropz()` removes the object from inventory, places it on the hero square, runs shop sale handling, stacking, and redraw.
- `nethack-c/upstream/src/shk.c:3938-3946`: `sellobj()` removes unpaid non-container merchandise from the live bill when it is dropped on a costly square in the owning shop.
- `nethack-c/upstream/include/monsters.h:1301-1317`: centaurs use monster class `S_CENTAUR`, which triggers the boot branch even though they can still have hands.

## JS Changes

- Split the polyself boot-drop predicate out from the no-hands equipment block.
- Added C-shaped centaur and slithy checks so boots can fall off forms that still bypass the no-hands branch.
- Preserved existing whirly/no-hands ordering by keeping the standalone weapon drop after boot fallout.
- Added the speed-boots slowdown message for forced polyself boot removal when no other very-fast source remains.
- Kept the actual object lifecycle on the existing `dropCarriedObjectAtHero()` path so unpaid boots are returned through shop-aware floor placement.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into a plains centaur while wearing unpaid speed boots in a shop.
- Assert centaur-specific pushed-off boot wording, speed slowdown wording, speed state cleanup, AC recomputation without boots, shop bill removal, and floor placement on the hero square.

## Remaining Gaps

- Full `Boots_off()` terrain side effects for water-walking and levitation boots remain broader work.
- Horned-form helmet fallout remains open and should be handled as its own source-backed slice.
- This still uses targeted local body-shape predicates rather than a generated C monster-shape table.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "centaur polyself|whirly polyself drops no-hands gear|no-hands polyself drops shield" test/shop-billing-helpers.test.mjs` (`3` matching tests passed)
- `node --test --test-name-pattern "successful (centaur polyself|whirly polyself|no-hands polyself|small polyself|hobbit polyself|breakarm polyself|very small polyself|cloak-only gnome|no-head polyself)" test/shop-billing-helpers.test.mjs` (`13` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1110/1110` tests passed)
- `node --test test/*.mjs` (`1207/1207` tests passed)
- `git diff --check`
- `npm run score` (`44/44` passing)
