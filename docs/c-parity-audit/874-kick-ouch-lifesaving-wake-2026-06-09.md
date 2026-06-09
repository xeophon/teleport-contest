# Kick Ouch Lifesaving Wake

## C anchors

- `nethack-c/upstream/src/dokick.c:686` prints `Thump!` for low-range kicked objects and returns `(!rn2(3) || martial())`; a false return falls through to the caller's `kick_ouch()`.
- `nethack-c/upstream/src/dokick.c:792` through `:826` build the `kicking ...` death cause, using the kicked object name when one exists.
- `nethack-c/upstream/src/dokick.c:886` through `:904` print `Ouch!  That hurts!`, exercise Dexterity/Strength, wake nearby monsters at `5 * 5`, wound the right leg on `!rn2(3)`, apply `Maybe_Half_Phys(rnd(CON > 15 ? 3 : 5))`, and hurtle on air level or levitation.
- `nethack-c/upstream/src/hack.c:4256` through `:4283` route lethal `losehp()` damage through the normal death flow.
- `nethack-c/upstream/src/end.c:1081` starts the life-saving branch in `done()` before final death.
- `nethack-c/upstream/src/dokick.c:1452` through `:1461` dispatch floor objects before door/non-door terrain; false object-kick returns call `kick_ouch(x, y, kickobjnam)`.

## JS parity

- `js/cmd.js` now centralizes object and terrain kick-ouch damage in `applyKickOuchDamage()`.
- The helper keeps the existing C-shaped exercise RNG, wound RNG, and CON-sized damage roll, and now wraps the damage with `maybeHalfPhysicalDamage()`.
- Lethal kick-ouch damage now appends `You die...` or the life-saving medallion message, removes a worn life-saving amulet, and returns a fatal/life-saving result to the existing command-mode handler.
- Kick-ouch now wakes nearby sleepers around the struck square with the existing `wakeNearbyMonstersAt(x, y, 5 * 5)` helper.
- Low-range `Thump!`, failed loose kicks, unsupported loose-source objects, and solid terrain kicks all route through the shared helper.

## Canaries

- `command kicked object ouch wakes nearby sleepers` covers the `wake_nearto(x, y, 5 * 5)` side effect without mutating the kicked object or door.
- `command kicked object ouch can be fatal` covers fatal `losehp()`-style command-mode routing, object-first door preservation, and `kicking a boulder` death cause.
- `command kicked object ouch uses life saving` covers worn amulet consumption, life-saving command mode, medallion continuation, and post-more HP restoration.
- Existing failed-loose and low-range kicked-object tests continue to cover nonfatal wound and damage RNG order through the shared helper.

## Remaining follow-up

- Blind `feel_location(x, y)`, drawbridge-wall `The drawbridge is unaffected.` maploc fallout, and airlevel/levitation hurtle remain broader `kick_ouch()` work.
- Successful object-kick recoil on the air level remains separate from failed object `kick_ouch()`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'command kicked object ouch|command kicked boulder on closed door|command kicked shop object on closed door failed loose roll may hurt hero|low-range ordinary floor object|single gold piece' test/shop-billing-helpers.test.mjs` (`15` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2975` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
