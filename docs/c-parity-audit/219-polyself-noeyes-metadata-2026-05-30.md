# C Parity Audit 219: Polyself No-Eyes Metadata

## Sources

- `nethack-c/upstream/include/monflag.h:97`: `M1_NOEYES` marks monsters with no eyes.
- `nethack-c/upstream/include/mondata.h:46`: `haseyes(ptr)` is false exactly when `M1_NOEYES` is present.
- `nethack-c/upstream/src/polyself.c:38-107`: `set_uasmon()` applies `PROPSET(BLINDED, !haseyes(mdat))`, so eyeless forms add form-derived blindness.
- `nethack-c/upstream/src/polyself.c:204-258`: `rehumanize()` snapshots `was_blind`, calls `set_uasmon()`, and recalculates vision when reverting from an eyeless form clears blindness.
- `nethack-c/upstream/src/polyself.c:739-899`: successful `polymon()` has the same `was_blind`/`set_uasmon()`/vision-recalc path when changing from an eyeless form to an eyed form.
- `nethack-c/upstream/include/monsters.h:143-2120`: the C monster table marks blobs, jellies, mimics, piercers, trappers, vortices/lights, elementals, fungi/molds, oozes, and puddings/slimes with `M1_NOEYES`.

## JS Changes

- Expanded `NOEYES_MONSTERS` in `js/mklev.js` from the previous fungi/mold subset to the full C `M1_NOEYES` list modeled by the JS random monster metadata path.
- Applied `noeyes` to both static `RANDOM_MONSTER_BY_NAME` entries and `monsterFromRndMeta()` output, matching the existing no-head metadata propagation pattern.
- Added a polyself blindness snapshot for the hero's base form when first becoming a monster.
- Tracked blindness that is caused only by the current eyeless form, then cleared that form-derived blindness when returning human or changing into an eyed form.
- Kept non-form blindness separate: worn blindfold/towel blindness, active timed blindness, cream blindness, and original persistent non-worn blindness remain active after form blindness is cleared.

## Tests

Extended focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful no-head polyself into an `acid blob` now also asserts the form has `noeyes` and the hero becomes blind.
- Rehumanizing from the acid blob row clears the form state, drops the base snapshot, and restores non-blind sight when no non-form blindness source exists.

## Remaining Gaps

- Broader monster metadata still is not generated directly from the C table; this slice only closes the modeled `M1_NOEYES` set used by current polyself and potion-vapor paths.
- Healing/carrot sight restoration while currently in an eyeless form remains broader because those callers still manipulate the flat JS `blind` boolean directly.
- Vision refresh/redraw ordering is only covered by state assertions here; full `vision_recalc()`/`docrt()` parity for eyeless-form transitions remains open.
- Body armor, cloak, shirt, retouching equipment, cockatrice self-touch, artifact effects, and shop prompts for forced polyself equipment fallout remain separate from this metadata/blindness slice.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful no-head polyself|successful no-hands polyself" test/shop-billing-helpers.test.mjs` (`3` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1100/1100` passed)
- `node --test test/*.mjs` (`1197/1197` passed)
- `npm run score` (`44/44` passing)
