# Apply blindfold and lenses

## C anchors

- `nethack-c/upstream/src/apply.c:4243` through `:4258` routes `BLINDFOLD` and `LENSES` through `Blindf_on()` / `Blindf_off()` instead of the generic no-effect branch.
- `nethack-c/upstream/src/do_wear.c:72` through `:101` supplies the verbose `You are now wearing ...` eyewear message.
- `nethack-c/upstream/src/do_wear.c:1461` through `:1520` applies and removes blindfold/lenses, preserving independent blindness sources and using `You still cannot see.` when appropriate.
- `nethack-c/upstream/src/do_wear.c:1891` through `:1918` handles cursed worn eyewear removal attempts, marks BUC known, and uses plural wording for lenses.

## JS parity

- `js/cmd.js` now handles `#apply` for carried blindfolds and lenses before the generic tool fallthrough.
- Applying unworn blindfolds and lenses occupies the facewear slot and updates the inventory line.
- Applying the worn uncursed item removes it, with blindfold removal restoring sight only when no other blindness source remains.
- Applying another facewear item while a towel, blindfold, or lenses is worn reports the C conflict text and leaves state unchanged.
- Applying worn cursed blindfolds/lenses leaves them worn, marks BUC known, reports cursed takeoff wording, and still consumes the apply turn.

## Tests

- `applying an unworn blindfold wears it and applying it again removes it`
- `applying lenses while blindfolded reports the worn facewear conflict`
- `applying blindfold while temporarily blind preserves blindness source`
- `applying blindfold with towel or lenses already worn reports C conflict text`
- `applying cursed worn lenses leaves them on with cursed takeoff wording`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "applying.*blindfold|applying.*lenses|worn facewear|towel or lenses|temporarily blind" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot --test-name-pattern "apply.*blindfold|apply.*lenses|applying.*blindfold|applying.*lenses|worn facewear|towel or lenses|temporarily blind" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining follow-up

- The generic `P`/`T` wear and takeoff paths still have older simplified facewear behavior; this slice only covers `#apply` parity.
