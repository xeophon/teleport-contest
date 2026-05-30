# C Parity Audit 226: Polyself Horned Helmet Fallout

## Sources

- `nethack-c/upstream/src/polyself.c:886-890`: successful `polyself()` calls `break_armor()`, then `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1229-1247`: horned forms handle worn helmets before the later no-hands/verysmall fallout branch. Flimsy, non-donning headgear is pierced and remains worn; non-flimsy or actively-donned headgear falls off, calls `Helmet_off()`, and is dropped.
- `nethack-c/upstream/src/mondata.c:676-694`: `num_horns()` gives two horns to horned devils, minotaurs, Asmodeus, and balrogs; one horn to unicorns and ki-rin.
- `nethack-c/upstream/include/obj.h:418-420`: `is_flimsy()` is material `<= LEATHER` or rubber hose.
- `nethack-c/upstream/include/objects.h:444-487`: helmet materials distinguish leather/cloth headgear from iron/glass hard helms.
- `nethack-c/upstream/src/objnam.c:5511-5528`: `helm_simple_name()` reports hard headgear as `helm` and non-hard headgear as `hat`.
- `nethack-c/upstream/src/do_wear.c:517-563`: `Helmet_off()` clears the worn helmet slot and has item-specific side effects.
- `nethack-c/upstream/src/do.c:786-843` and `nethack-c/upstream/src/shk.c:3938-3946`: dropped helmet fallout routes through inventory removal, floor placement, shop sale handling, stacking, and redraw.

## JS Changes

- Added local horn-count predicates for the C horned forms currently reachable through the JS monster metadata.
- Added horned helmet fallout before no-hands/verysmall equipment fallout.
- Added flimsy headgear handling that reports horn piercing while keeping the item worn.
- Added hard helmet drop handling through the existing `dropCarriedObjectAtHero()` shop-aware path.
- Switched no-hands helmet wording to the same `helm`/`hat` helper and suppressed duplicate no-hands helmet fallout when the horned branch already dropped the helm.
- Broadened the polyself fallout gate so message-only retained-helmet fallout still triggers the C-like post-`break_armor()` AC recomputation.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful polyself into a minotaur while wearing an elven leather helm keeps the flimsy helm worn, reports plural horn piercing, keeps the floor empty, and recomputes AC with the retained helm.
- Successful polyself into a minotaur while wearing an unpaid orcish helm in a shop drops the hard helm, clears the live bill, places a non-worn/non-unpaid floor object on the hero square, and avoids unrelated no-hands fallout messages.

## Remaining Gaps

- `Helmet_off()` item-specific side effects for fedora luck, cornuthaum charisma, helm of brilliance attributes, telepathy/caution monster visibility, and opposite-alignment restoration are still broader work.
- Active donning cancellation is represented only by local transient item flags used by the JS harness, not a full C `cancel_don()` model.
- Horn counts still use targeted local predicates rather than a generated C monster-shape table.
- Terrain-specific wording still uses the existing JS `ground` wording for forced helmet drops.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "horned polyself|centaur polyself|no-hands polyself drops shield|whirly polyself drops no-hands gear" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `node --test --test-name-pattern "successful (horned polyself|centaur polyself|whirly polyself|no-hands polyself|small polyself|hobbit polyself|breakarm polyself|very small polyself|cloak-only gnome|no-head polyself)" test/shop-billing-helpers.test.mjs` (`15` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1112/1112` tests passed)
- `node --test test/*.mjs` (`1209/1209` tests passed)
- `git diff --check`
- `npm run score` (`44/44` passing)
