# C Parity Audit 223: Polyself Small Sliparm

## Sources

- `nethack-c/upstream/src/mondata.c:630-635`: `sliparm()` is true for whirly, small-or-smaller, and noncorporeal forms.
- `nethack-c/upstream/src/mondata.c:638-649`: `breakarm()` is skipped whenever `sliparm()` is true.
- `nethack-c/upstream/src/polyself.c:1198-1209`: non-whirly `sliparm()` drops body armor with `Your armor falls around you!` unless `racial_exception()` accepts the worn suit.
- `nethack-c/upstream/src/polyself.c:1210-1218`: non-whirly `sliparm()` drops cloaks with `You shrink out of your %s!`, except mummy wrappings that pass `WrappingAllowed()`.
- `nethack-c/upstream/src/polyself.c:1220-1225`: non-whirly `sliparm()` removes shirts with `You become much too small for your shirt!`.
- `nethack-c/upstream/include/obj.h:443-447`: `WrappingAllowed()` permits mummy wrappings on humanoid, corporeal, small-through-huge forms that are not centaurs, winged gargoyles, or mariliths.
- `nethack-c/upstream/src/worn.c:1364-1367`: hobbits are allowed to keep elven armor through `racial_exception()`.
- `nethack-c/upstream/include/monsters.h:477-483`: hobbits are humanoid `MZ_SMALL` forms.
- `nethack-c/upstream/include/objects.h:571-576`: mithril coats are suit armor; C object AC values imply dwarvish mithril-coat grants 6 AC and elven mithril-coat grants 5 AC.

## JS Changes

- Broadened successful-polyself `sliparm()` handling beyond whirly forms so small forms can drop body armor, cloaks, and shirts through the same fallout helper.
- Added local small-form detection for hobbit and gnome-family forms while keeping the existing generated metadata predicates for tiny/verysmall forms.
- Added noncorporeal detection to the shared sliparm predicate for later parity, while noting that normal C-controlled polyself has no currently modeled noncorporeal test target for this branch.
- Implemented non-whirly cloak wording and `WrappingAllowed()`-style mummy wrapping retention for humanoid small forms.
- Added the hobbit/elven-armor racial exception so hobbit polyself keeps elven body armor while still slipping out of cloak and shirt.
- Added polyself-local AC handling for mithril coats retained by racial exception, without changing the current global normal-wear screen behavior.
- Preserved the existing cloak-only gnome delayed-more path; the full small sliparm path now runs when there is body armor or a shirt to process.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into gnome while wearing body armor, a cloak, and a shirt.
- Assert C message order for non-whirly small sliparm: body armor, cloak, then shirt.
- Assert all three items are dropped, not destroyed, and AC recomputes to the form base.
- Successful debug polyself into gnome while wearing body armor, mummy wrapping, and a shirt.
- Assert mummy wrapping is retained and no shrink/fall/tear wrapping message appears.
- Successful debug polyself into hobbit while wearing elven mithril-coat, a cloak, and a shirt.
- Assert the elven body armor remains worn via racial exception, cloak and shirt drop, and retained armor contributes to polyself AC.

## Remaining Gaps

- JS still lacks a generated C `mondata.c` table for monster size, humanoid, noncorporeal, and body-shape predicates; this slice uses targeted local predicates.
- Ghost and shade are noncorporeal in C, but they are not normal controlled-polyself targets in this port, so the noncorporeal sliparm branch is not separately covered.
- The legacy cloak-only gnome delayed-more path remains for current replay compatibility; broader encumbrance and `dropx()` message parity should be revisited with a dedicated source slice.
- Global normal-wear armor metadata still does not fully model mithril-coat suit/AC behavior; this slice only corrects the polyself recompute path needed by the retained hobbit armor case.
- Shop billing for unpaid items dropped by small sliparm remains open.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful small polyself|successful hobbit polyself|successful whirly polyself|successful breakarm polyself|successful very small polyself|successful no-hands polyself|successful no-head polyself" test/shop-billing-helpers.test.mjs` (`10` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1107/1107` passed)
- `node --test test/*.mjs` (`1204/1204` passed)
- `npm run score` (`44/44` passing)
