# C Parity Audit 237: Polyself Gloves-Off Stat Fallout

## Sources

- `nethack-c/upstream/src/polyself.c:1248-1257`: no-hands and very-small polyself forms print `You drop your gloves%s!`, drop the wielded weapon first, call `Gloves_off()`, then drop the glove object.
- `nethack-c/upstream/src/do_wear.c:662-668`: `Gloves_off()` makes gauntlets of power known and removes gauntlets-of-dexterity bonus with `adj_abon(uarmg, -uarmg->spe)`.
- `nethack-c/upstream/src/do_wear.c:673-675`: after glove-specific side effects, C clears `W_ARMG` and reports immediate encumbrance feedback.
- `nethack-c/upstream/src/do_wear.c:3319-3327`: `adj_abon()` makes gauntlets of dexterity known, adjusts `ABON(A_DEX)`, and marks the status line dirty.
- `nethack-c/upstream/include/objects.h:692-697`: gauntlets of power and gauntlets of dexterity are magical glove-slot armor; gauntlets of dexterity use the object enchantment as their attribute bonus.

## JS Changes

- Added a polyself glove-off side-effect helper for forced successful-polyself equipment fallout.
- Gauntlets of dexterity now subtract their enchantment from `A_DEX` before the gloves leave inventory and record armor discovery when a nonzero bonus is removed.
- Gauntlets of power now reuse the existing strength restoration helper before the gloves are dropped and record armor discovery.
- Hooked glove side effects into the shared polyself dropped-equipment path, preserving the existing C-shaped order where the weapon is dropped before glove side effects and floor placement.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into wererat while wearing `+2 gauntlets of dexterity` now drops the gloves, removes the two-point dexterity bonus, leaves maximum dexterity unchanged, and records the armor discovery.
- Successful debug polyself into wererat while wearing gauntlets of power now drops the gloves, restores the saved base strength, clears the stored gauntlets strength base, and records the armor discovery.

## Remaining Gaps

- `Gloves_off()` glib cleanup and cockatrice-corpse retouch fallout remain open.
- Alchemy smock poison/acid resistance clearing during forced `Cloak_off()` remains open.
- Blue dragon armor speed-loss messaging during forced `Armor_gone()` remains open.
- Active `cancel_don()` handling is still represented only by narrower local flags in the currently covered polyself rows.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "gauntlets|gloves|no-hands polyself|helm of brilliance|cornuthaum|speed boots" test/shop-billing-helpers.test.mjs` (`20` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1138/1138` tests passed)
- `node --test test/*.mjs` (`1235/1235` tests passed)
- `npm run score` (`44/44` passing)
