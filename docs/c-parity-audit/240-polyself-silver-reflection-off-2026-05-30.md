# C Parity Audit 240: Polyself Silver Reflection Off

## Sources

- `nethack-c/upstream/include/objects.h:507`, `nethack-c/upstream/include/objects.h:534`, and `nethack-c/upstream/include/objects.h:677`: silver dragon scale mail, silver dragon scales, and shield of reflection all grant `REFLECTING` through object metadata.
- `nethack-c/upstream/src/worn.c:123-136`: `setworn()` applies an object's `oc_oprop` to the worn slot's extrinsic mask.
- `nethack-c/upstream/include/youprop.h:379`: `Reflecting` is the union of intrinsic and extrinsic reflection.
- `nethack-c/upstream/src/do_wear.c:732` and `nethack-c/upstream/src/worn.c:168-184`: `Shield_off()` and `setnotworn()` clear the worn slot mask generically, so a dropped shield of reflection loses extrinsic reflection without a special message.
- `nethack-c/upstream/src/do_wear.c:806-868` and `nethack-c/upstream/src/do_wear.c:939-957`: `Armor_gone()` handles dragon armor off-state generically; silver dragon armor has no special off feedback beyond its normal worn-source removal.
- `nethack-c/upstream/src/polyself.c:1162-1214`: successful polyself body-armor break/slip fallout calls the armor off path before destruction or drop.
- `nethack-c/upstream/src/polyself.c:1248-1262`: no-hands fallout emits `You can no longer hold your shield!`, runs `Shield_off()`, and drops the shield.
- `nethack-c/upstream/src/polyself.c:637-660`: matching dragon merge keeps the armor object as embedded skin and does not call `Armor_gone()` or `setnotworn()`, so silver dragon skin remains an active reflection source.
- `nethack-c/upstream/src/polyself.c:55-106`: silver dragon form itself grants reflection, separately from equipment.

## JS Changes

- Added a shared silver-dragon armor kind predicate and used it for worn reflection sources and armor wear reflection state.
- Recomputed reflection after polyself forced-drop equipment fallout so shields of reflection and immediately dropped silver dragon scales clear reflection when no other source remains.
- Recomputed reflection when deferred polyself armor fallout clears worn body-armor state before the overload `--More--`, matching C's `Armor_gone()` ordering.
- Kept matching silver dragon skin merge as an active embedded reflection source, preserving the audit 239 merge behavior.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Matching silver dragon scales embed as skin and keep reflection.
- No-hands polyself clears silver dragon scale mail reflection as soon as worn state is cleared, before the deferred final drop.
- Small-form polyself drops silver dragon scales immediately and clears reflection.
- No-hands polyself drops a shield of reflection and clears reflection.

## Remaining Gaps

- Gray dragon antimagic, yellow/green passive property fallout, and broader dragon-form intrinsic metadata remain separate slices.
- Silver dragon form reflection is only covered here indirectly through the matching skin path; broader form-intrinsic audits should cover it with full polymon metadata.
- Uncontrolled draconian random/class routing remains narrower than C and is unchanged by this property-off slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "matching silver dragon|silver dragon reflection|silver dragon scales clears reflection|shield of reflection" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1151/1151` tests passed)
- `node --test test/*.mjs` (`1248/1248` tests passed)
- `npm run score` (`44/44` replay sessions passed)
