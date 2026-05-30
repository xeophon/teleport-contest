# C Parity Audit 236: Polyself Wrapping Breakarm And Large Dog

## Sources

- `nethack-c/upstream/src/polyself.c:1156-1197`: `break_armor()` destroys worn body armor, handles cloak-slot fallout with mummy wrapping/alchemy smock/normal-cloak branches, then destroys shirts.
- `nethack-c/upstream/src/polyself.c:1198-1218`: `sliparm()` drops body armor and cloak-slot items, except mummy wrapping that passes `WrappingAllowed()`.
- `nethack-c/upstream/src/mondata.c:632-649`: `breakarm()` excludes `sliparm()` forms, then covers big monsters, medium-or-larger non-humanoids, mariliths, and winged gargoyles.
- `nethack-c/upstream/include/monsters.h:249-255`: large dog is medium, animal, no-hands, carnivorous, strong, domestic, and not humanoid, so C routes it through `breakarm()` rather than the no-hands overload path.
- `nethack-c/upstream/include/obj.h:443-447`: `WrappingAllowed()` lets mummy wrapping adapt to humanoid, corporeal, small-through-huge forms, excluding centaurs, winged gargoyles, and mariliths.
- `nethack-c/upstream/src/do_wear.c:382-412`: `Cloak_off()` clears worn-cloak state; for mummy wrapping it refreshes the hero glyph and prints `You can see through yourself.` or `You can no longer see yourself.` when the hero is intrinsically invisible and not blind.

## JS Changes

- Added large dog to the source-backed explicit `breakarm()` form set so successful polyself destroys body armor instead of entering the legacy no-hands overload flow.
- Classified `mummy wrapping` as cloak-slot armor so forced polyself cloak fallout can see and remove it through the shared armor helper.
- Added mummy-wrapping `Cloak_off()` feedback for breakarm cloak tearing, non-whirly/whirly sliparm cloak dropping, and the existing deferred cloak-only branch.
- Kept `WrappingAllowed()`-style retention for adaptive mummy wrapping; the deferred cloak-only branch now skips forms allowed to keep the wrapping and uses C `cloak_simple_name()`-style wording.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into large dog while wearing leather armor now prints `You break out of your armor!`, does not queue the overload-more drop flow, destroys the armor, and recomputes AC from the new form.
- Successful debug polyself into xorn while wearing mummy wrapping now tears the wrapping apart, prints the intrinsic-invisibility feedback after the tear message, and destroys the wrapping rather than dropping it.
- Successful debug polyself into wererat while wearing mummy wrapping now uses `wrapping` wording, prints the see-through feedback before the deferred More, and drops the wrapping after the existing deferred cloak-only continuation.

## Remaining Gaps

- JS still lacks a generated C monster body-shape table for every `breakarm()`/`sliparm()` predicate; this slice adds the source-backed large dog row without broadening the table.
- Alchemy smock resistance side effects, gauntlets of dexterity stat fallout, blue dragon armor speed loss, `cancel_don()`, and lamplit armor burn shutdown remain open.
- The very-small cloak-only path still uses the legacy deferred More/drop flow; this slice only aligns its mummy wrapping classification, wording, and visibility feedback.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "mummy wrapping|large dog polyself|breakarm polyself|whirly polyself" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1136/1136` passed)
- `node --test test/*.mjs` (`1233/1233` passed)
- `npm run score` (`44/44` passing)
