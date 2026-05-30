# C Parity Audit 239: Polyself Dragon Skin Merge

## Sources

- `nethack-c/upstream/src/polyself.c:477`: wearing dragon armor makes `polyself()` enter the draconian special case.
- `nethack-c/upstream/src/polyself.c:620-626`: controlled matching-dragon targets and uncontrolled draconian polymorph route to `do_merge`.
- `nethack-c/upstream/src/polyself.c:637-652`: matching dragon scales print `You merge with your scaly armor.`; matching dragon scale mail prints `Your <color> scale mail reverts to scales as you merge with them.` and mutates the same object from mail to scales.
- `nethack-c/upstream/src/polyself.c:656-660`: the same object becomes `uskin`, `uarm` is cleared, and the item remains inventory-owned with `I_SPECIAL`; no drop, `useup()`, `Armor_gone()`, or off handler runs.
- `nethack-c/upstream/src/polyself.c:691` and `nethack-c/upstream/src/polyself.c:798`: `polymon()` runs after the merge message, so the visible `You turn into ...!` message follows the merge message.
- `nethack-c/upstream/src/polyself.c:886-890` and `nethack-c/upstream/src/do_wear.c:2473-2484`: embedded `uskin` is not `uarm`, so it does not contribute armor AC while embedded.
- `nethack-c/upstream/src/polyself.c:1953-1964`: `skinback(FALSE)` restores embedded scales as worn armor and prints `Your skin returns to its original form.`
- `nethack-c/upstream/src/do_wear.c:806-868`, `nethack-c/upstream/src/do_wear.c:939-957`, and `nethack-c/upstream/src/worn.c:168`: nonmatching dragon armor still takes normal `Armor_gone()` fallout; matching merge bypasses those off paths, so speed/reflection/resistance sources are not cleared by the merge.
- `nethack-c/upstream/src/mondata.c:640` and `nethack-c/upstream/src/polyself.c:1162-1171`: adult dragon forms break nonmatching body armor and destroy it rather than using no-hands overload drop behavior.

## JS Changes

- Added a dragon-armor kind map so polyself can compare worn scale mail/scales against the target adult dragon color.
- Matching dragon polyself now embeds matching scales as a `_polyselfSkin` inventory item, clears worn body-armor state for AC/drop logic, and keeps the item in inventory instead of dropping or destroying it.
- Matching dragon scale mail now mutates the same inventory object to matching dragon scales before embedding.
- Returning to human form now restores embedded dragon scales as worn armor and emits the C `skinback(FALSE)` message before the normal human-form message.
- Embedded dragon skin is treated as an active extrinsic source for existing speed/reflection/passive-resistance predicates, while remaining excluded from worn-armor AC.
- Adult dragon forms now use breakarm for nonmatching body armor, preserving the C distinction between matching skin merge and nonmatching armor destruction.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Matching red dragon scale mail embeds as red dragon scales, does not fall/drop/destroy, and skinback restores worn scales when reverting to human.
- Matching red dragon scales embed intact without mail-reversion wording.
- Matching blue dragon scales embed without `You slow down.` and keep the blue speed source.
- Nonmatching blue dragon scales worn while polymorphing into a red dragon run breakarm fallout, clear blue speed, and are destroyed.

## Remaining Gaps

- Uncontrolled draconian random/class selection routing is still narrower than C; the covered path is the current debug-controlled target path plus the shared merge helper.
- Full dragon-form intrinsic/resistance coverage remains incomplete; this slice only preserves currently modeled embedded-equipment sources.
- Adult dragon base AC still depends on existing form metadata and remains outside this merge-focused audit.
- Broader silver/gray/yellow/green forced-off property fallout remains open as separate smaller slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "matching dragon polyself|matching blue dragon polyself|nonmatching dragon polyself" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1147/1147` tests passed)
- `node --test test/*.mjs` (`1244/1244` tests passed)
- `npm run score` (`44/44` replay sessions passed)
