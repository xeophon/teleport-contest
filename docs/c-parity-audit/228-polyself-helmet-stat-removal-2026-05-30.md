# C Parity Audit 228: Polyself Helmet Stat Removal

## Sources

- `nethack-c/upstream/src/polyself.c:1239-1244`: horned-form hard headgear fallout cancels active donning when needed, reports the fall message, calls `Helmet_off()`, then drops the object.
- `nethack-c/upstream/src/polyself.c:1264-1270`: no-hands or very small forms force worn headgear off through the same `Helmet_off()` then `dropp()` sequence.
- `nethack-c/upstream/src/do_wear.c:536-540`: removing a cornuthaum reverses its charisma bonus unless this is a cancelled donning operation; Wizards lose one point and non-Wizards regain one point.
- `nethack-c/upstream/src/do_wear.c:548-550`: removing a helm of brilliance calls `adj_abon(uarmh, -uarmh->spe)` unless this is a cancelled donning operation.
- `nethack-c/upstream/src/do_wear.c:3319-3335`: `adj_abon()` applies helm-of-brilliance bonus deltas to `ABON(A_INT)` and `ABON(A_WIS)` and identifies the armor type when the delta is nonzero.
- `nethack-c/upstream/src/attrib.c:1204-1238`: effective non-strength attributes are clamped to `3..25`.

## JS Changes

- Added a worn-stat bonus helper for this forced-removal path. It mutates `game.u.acurr.a` directly because the JS port does not currently model C's separate `u.abon.a` layer.
- Extended `addPolyselfHelmetOffSideEffects()` to reverse cornuthaum charisma and helm-of-brilliance INT/WIS bonuses before the existing drop path removes the item from inventory.
- Preserved the C `cancelled_don` guard for cornuthaum and helm of brilliance by skipping those stat deltas when the local transient donning flags indicate interrupted donning.
- Recorded helm-of-brilliance armor discovery on nonzero stat deltas, matching C `makeknown()` in `adj_abon()`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful no-hands polyself into a wererat while a Wizard wears a cornuthaum; the hat drops and charisma falls from `11` to `10`.
- Successful no-hands polyself into a wererat while a non-Wizard wears a cornuthaum; the hat drops and charisma rises from `9` to `10`.
- Successful no-hands polyself into a wererat while wearing a `+2` helm of brilliance; the helm drops and INT/WIS each lose the `+2` worn bonus without changing max stats.

## Remaining Gaps

- `Helmet_off()` side effects for telepathy/caution monster visibility and opposite-alignment restoration remain open.
- Normal wear/takeoff paths still lack a full C-like `ABON` model for cornuthaum and helm of brilliance.
- Active donning cancellation is still only represented by local transient item flags used by the JS harness.
- Terrain-specific wording still uses the existing JS `ground` wording for forced helmet drops.
- Full `Boots_off()` terrain side effects for water-walking and levitation boots remain broader work.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "fedora|cornuthaum|helm of brilliance|horned polyself|centaur polyself|no-hands polyself drops shield|whirly polyself drops no-hands gear" test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `node --test --test-name-pattern "successful (fedora|cornuthaum|helm of brilliance|horned polyself|centaur polyself|whirly polyself|no-hands polyself|small polyself|hobbit polyself|breakarm polyself|very small polyself|cloak-only gnome|no-head polyself)" test/shop-billing-helpers.test.mjs` (`19` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1116/1116` tests passed)
- `node --test test/*.mjs` (`1213/1213` tests passed)
- `npm run score` (`44/44` passing)
