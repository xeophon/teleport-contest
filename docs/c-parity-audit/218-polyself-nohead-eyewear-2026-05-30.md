# C Parity Audit 218: Polyself No-Head Eyewear

## Sources

- `nethack-c/upstream/src/polyself.c:887-889`: successful `polymon()` calls `break_armor()`, then `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1287-1298`: `break_armor()` drops worn `ublindf` when the new form does not have a head; `simpleonames()` is used for the message and leading `pair of ` is stripped for lenses.
- `nethack-c/upstream/src/do_wear.c:1495-1505`: `Blindf_off(NULL)` clears the worn tool slot without printing the ordinary takeoff message before the object is dropped.
- `nethack-c/upstream/src/polyself.c:1301`: rings and the amulet stay worn after `break_armor()`.
- `nethack-c/upstream/include/monsters.h:137-144`: acid blobs have `M1_NOHEAD`, giving a compact no-head polyself form for this focused row.

## JS Changes

- Added no-head metadata for C `M1_NOHEAD` monsters in the JS monster data path, including the `acid blob` form used by this regression.
- Extended successful-polyself equipment fallout to run eyewear checks separately from the no-hands/verysmall slot checks.
- Dropped worn blindfolds, towels, and lenses for no-head forms with C-shaped messages such as `Your lenses fall off!`.
- Cleared the JS blindfold/towel worn state when the forced eyewear drop occurs, while preserving amulet and ring retention.
- Kept the existing shared carried-object drop routing so forced eyewear fallout lands on the hero square through the same floor placement helper as the armor and weapon rows.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful no-hands polyself into a `wererat` while wearing a shield, helm, boots, and amulet. The shield, helm, and boots drop with slot-specific messages, while the amulet remains worn.
- Successful no-head polyself into an `acid blob` while wearing lenses and an amulet. The lenses drop with plural `fall` wording and land on the hero square, while the amulet remains worn.

## Remaining Gaps

- Body armor, cloak, and shirt ordering remains partially modeled and should stay separate from this eyewear row.
- The delayed body-armor overload follow-up still uses the legacy replay-visible AC assignment from audit 217.
- The broader monster metadata tables still do not model every C monster trait; this slice only adds the no-head flag needed by the covered successful-polyself fallout.
- Shop sale prompts for forced polyself equipment drops still need explicit shop tests.
- Retouching equipment, cockatrice self-touch after glove loss, artifact effects, dragon armor merge, and cannot-let-go weapon handling remain open.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful no-hands polyself|successful no-head polyself" test/shop-billing-helpers.test.mjs` (`3` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1100/1100` passed)
- `node --test test/*.mjs` (`1197/1197` passed)
- `npm run score` (`44/44` passing)
