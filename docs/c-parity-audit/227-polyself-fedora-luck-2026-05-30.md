# C Parity Audit 227: Polyself Fedora Luck Removal

## Sources

- `nethack-c/upstream/src/polyself.c:886-890`: successful `polyself()` calls `break_armor()`, then `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1264-1270`: no-hands or very small forms force worn headgear off, report the fall message, call `Helmet_off()`, and then drop the object.
- `nethack-c/upstream/src/do_wear.c:517-526`: `Helmet_off()` applies the fedora side effect; Archeologists lose one point of Luck when a worn fedora is removed.
- `nethack-c/upstream/src/attrib.c:411-418`: `change_luck()` adjusts `u.uluck` and clamps it to `LUCKMIN`/`LUCKMAX`.
- `nethack-c/upstream/src/do.c:786-843` and `nethack-c/upstream/src/shk.c:3938-3946`: dropped equipment goes through inventory removal, floor placement, shop sale handling, stacking, and redraw.

## JS Changes

- Added a small C-shaped Luck adjustment helper that mutates `game.u.uluck` and clamps to the existing `LUCKMIN`/`LUCKMAX` constants.
- Added forced `Helmet_off()` side-effect handling for polyself-dropped helmets.
- Applied the Archeologist fedora `change_luck(-1)` side effect before the existing shop-aware drop path removes the fedora from inventory.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into a wererat while an Archeologist wears a fedora.
- Assert hat fall wording, fedora floor placement, worn state clearing, AC recomputation, and Luck decreasing from `0` to `-1`.

## Remaining Gaps

- Other `Helmet_off()` item-specific side effects remain open: cornuthaum charisma, helm of brilliance attributes, telepathy/caution monster visibility, and opposite-alignment restoration.
- Active donning cancellation is still only represented by local transient item flags used by the JS harness.
- Terrain-specific wording still uses the existing JS `ground` wording for forced helmet drops.
- Full `Boots_off()` terrain side effects for water-walking and levitation boots remain broader work.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "fedora|horned polyself|centaur polyself|no-hands polyself drops shield|whirly polyself drops no-hands gear" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test --test-name-pattern "successful (fedora|horned polyself|centaur polyself|whirly polyself|no-hands polyself|small polyself|hobbit polyself|breakarm polyself|very small polyself|cloak-only gnome|no-head polyself)" test/shop-billing-helpers.test.mjs` (`16` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1113/1113` tests passed)
- `node --test test/*.mjs` (`1210/1210` tests passed)
- `npm run score` (`44/44` passing)
