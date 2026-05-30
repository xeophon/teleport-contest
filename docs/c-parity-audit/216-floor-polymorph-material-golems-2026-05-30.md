# C Parity Audit 216: Floor Polymorph Material Golems

## Sources

- `nethack-c/upstream/src/zap.c:1476-1496`: `obj_shudders()` chooses shudder odds from wand/cursed/blessed state and halves the odds for stacks larger than four.
- `nethack-c/upstream/src/zap.c:1637-1672`: `do_osshock()` records the first shuddered object's material through `gp.poly_zapped` on a `rn2(Luck + 45)` per-stack-unit roll, splits large stacks with `rnd(quan - 1)`, bills the used-up object, and deletes it.
- `nethack-c/upstream/src/zap.c:2465-2484`: `bhitpile()` resets `gp.poly_zapped`, applies polymorph to the pile, and calls `create_polymon()` after the pile pass when a shudder recorded material.
- `nethack-c/upstream/src/zap.c:1546-1629`: `create_polymon()` requires enough remaining pile material, maps material to a golem or skeleton, calls `makemon()`, then runs `polyuse()` and prints the visible meld message.
- `nethack-c/upstream/src/zap.c:1515-1534`: `polyuse()` skips resistant/special objects and deletes matching-material pile objects with the C `rn2(minwt + 1)` predicate.
- `nethack-c/upstream/include/objects.h:1048-1095`: flesh food/corpses/eggs/meatballs are `FLESH`, while ordinary rations and other people-food are `VEGGY`; `VEGGY` falls through to the default straw golem case rather than the flesh-golem case.

## JS Changes

- Added floor-polymorph material inference for modeled floor objects, including flesh food/corpses/eggs, veggie food/rations, and paper scroll/book objects.
- Extended floor-pile shudder fallout to carry a captured material through the whole pile pass, use C-style random split counts for shuddered stacks, and create a material-derived monster from the remaining pile when enough material remains.
- Added the material-golem mapping used by `create_polymon()`, including lithic clay/stone choice, flesh/organic, wood/leather/cloth/bone/gold/glass/paper, and default straw behavior.
- Added a floor-pile `polyuse()` tail that consumes additional modeled pile objects after monster creation and routes shop billing through the same used-up/robbed helpers as the initial shudder deletion.
- Made the floor-pile result helper async and awaited it from direct floor polymorph and ray traversal so `makemon()` can run in the shudder tail.
- Preserved the existing JS wand-learning compatibility rolls around direct floor-pile shudder while adding the C material/golem/polyuse behavior.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Large floor-food stacks now use C random split counts during shudder deletion rather than always using one unit.
- A visible flesh-food stack can shudder, leave enough pile material, create a flesh golem, and print both the organic meld and delayed shudder messages.
- A visible ordinary food-ration stack captures `VEGGY`, falls through to the default straw golem case, and prints the straw-golem meld plus delayed shudder messages.

## Remaining Gaps

- `polyuse()` only models currently represented special-object resistance. Broader C `obj_resists(0, 0)` exemptions such as invocation artifacts and Rider corpses still need object-registry-backed coverage.
- Hidden-under vertical pile handling can still diverge where C's `polyuse()` consumes skipped cover or lower-pile objects after a material golem.
- Shop coverage for `polyuse()` consuming multiple additional shop-owned objects remains narrow; this slice covers the shared billing path but not every multi-object ledger permutation.
- Successful `polyself()` equipment fallout remains separate; audit 215 describes the next narrow self-polymorph rows.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="floor polymorph shudder" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1097/1097` passed)
- `node --test test/*.mjs` (`1194/1194` passed)
- `npm run score` (`44/44` passing)
