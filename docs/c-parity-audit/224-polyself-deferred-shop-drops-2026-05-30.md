# C Parity Audit 224: Polyself Deferred Shop Drops

## Sources

- `nethack-c/upstream/src/polyself.c:886-890`: successful `polymon()` runs `break_armor()`, then `drop_weapon(1)`, then recomputes AC with `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1121-1148`: `dropp()` is the `break_armor()` wrapper around `dropx()` for polymorph armor fallout.
- `nethack-c/upstream/src/polyself.c:1183-1188`: non-mummy wrapping `breakarm()` cloaks call `Cloak_off()` then `dropp(otmp)`.
- `nethack-c/upstream/src/polyself.c:1210-1224`: `sliparm()` cloaks and shirts call the worn-slot off logic then `dropp(otmp)`.
- `nethack-c/upstream/src/polyself.c:1305-1355`: `drop_weapon(1)` drops `uwep` through `dropx()` when the new form cannot wield it; wielded weapon-tools share `uwep`.
- `nethack-c/upstream/src/do.c:786-829`: `dropx()` removes the item from inventory and `dropz()` places it on the hero square, calls `sellobj()` on shop levels, stacks, and redraws the square.
- `nethack-c/upstream/src/shk.c:3938-3946`: `sellobj()` removes an unpaid non-container object from the live shop bill when it is dropped on a costly square in the owning shop.
- `nethack-c/upstream/include/objects.h:422-428` and `571-576`: the `ARMOR()` macro stores suit AC as `10 - ac`; dwarvish and elven mithril-coats are `ARM_SUIT` entries with 6 and 5 AC bonus respectively.
- `nethack-c/upstream/include/objects.h:641-649`: shuffled magical cloak entries carry display colors, including cloak of magic resistance and cloak of displacement.
- `nethack-c/upstream/src/o_init.c:126-139`: description shuffling swaps `oc_descr_idx` and `oc_color`, so class-only/display fallback armor must preserve shuffled appearance colors.

## JS Changes

- Routed the legacy delayed cloak-only gnome polyself drop through `dropCarriedObjectAtHero()` instead of manually cloning/removing/pushing the item.
- Routed the delayed no-hands wielded-tool drop through the same shop-aware drop helper, matching C `drop_weapon(1)`/`dropx()`/`sellobj()` routing for wielded tools.
- Preserved deferred more-message plumbing by appending any floor/shop messages after the first More acknowledgement.
- Replaced the cloak delayed AC placeholder with `wornArmorAcValueGreatestErosion()` so non-1 AC cloaks retain a correct before/after AC transition.
- Promoted dwarvish and elven mithril-coat AC and body-slot recognition into the shared armor metadata instead of keeping a polyself-only workaround.
- Added a class-only armor display color fallback for carried drops that follows the shuffled armor appearance color groups, preserving brown cloak display parity for the public wizard polyself replay.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Cloak-only gnome polyself with an unpaid worn cloak in a shop keeps the bill live before More, then returns the cloak to shop stock after More with no stale bill row and preserves the armor glyph/shuffled cloak color.
- No-hands red-dragon polyself with an unpaid wielded expensive camera keeps the bill live before More, then returns the tool to shop stock after More with no stale bill row.
- Both tests assert the dropped floor object is no longer worn/wielded, no longer unpaid, lands on the hero square, and is not present in the shop bill.

## Remaining Gaps

- The port still has a legacy More-split for cloak-only gnome polyself and no-hands wielded-tool drops; this slice fixes their object lifecycle and shop billing without broadening encumbrance/menu timing.
- Paid involuntary polyself drops now use the ordinary paid-drop sale path; if public parity exposes a distinct C prompt/timing edge, that should be isolated in a separate source-backed slice.
- Full generated object metadata remains open; this slice only moves the mithril-coat suit/AC data needed by the current armor paths into shared JS metadata.
- This slice adds cloak-oriented class-only armor display color fallbacks. A broader generated object display table should still replace remaining duplicated metadata later.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="deferred unpaid" test/shop-billing-helpers.test.mjs` (`2` matching tests passed)
- `node --test --test-name-pattern="successful (cloak-only gnome|no-hands polyself returns deferred|small polyself|hobbit polyself|breakarm polyself|whirly polyself|very small polyself|no-hands polyself|no-head polyself)" test/shop-billing-helpers.test.mjs` (`12` matching tests passed)
- `bash frozen/score.sh sessions/seed0108-wizard-extcmd-wishlist.session.json` (`1/1` passing; RNG `16958/16958`, Screen `303/303`)
- `node --test test/shop-billing-helpers.test.mjs` (`1109/1109` passing)
- `node --test test/*.mjs` (`1206/1206` passing)
- `npm run score` (`44/44` passing)
