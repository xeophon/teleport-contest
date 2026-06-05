# C Parity Audit 482: Kicked Fragile Low-Range Thump

Implemented the low-range continuation for kicked fragile floor objects that survive the preflight `breaktest()` roll. The slice keeps C ordering: kicked-object range is computed before `hero_breaks()`, a resisted fragile object with range below two prints `Thump!` before any stack split or flight, and the C return roll can route into `kick_ouch()` damage while still consuming command time. No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:558` through `:588`: kicked-object range is computed from strength, one-item stack weight, martial skill, level medium, ice, and grease before fragile break handling.
- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before box, fragile, low-range, split, or flight handling.
- `nethack-c/upstream/src/dokick.c:678` through `:689`: kicked fragile objects call `hero_breaks(..., 0)` first; if it does not break and `range < 2`, non-box objects print `Thump!` and return `(!rn2(3) || martial())`.
- `nethack-c/upstream/src/dokick.c:692` through `:695`: non-gold stack splitting only happens after the low-range return branch.
- `nethack-c/upstream/src/dokick.c:880` through `:901` and `:1452` through `:1463`: a false `kick_object()` return calls `kick_ouch()`, prints `Ouch!  That hurts!`, applies wounded-leg and damage side effects, and still returns command time.
- `nethack-c/upstream/src/dothrow.c:2428` through `:2435`: a resisted `hero_breaks()` returns without break messages or `breakobj()` side effects.

## JS Changes

- `js/cmd.js`
  - Computes `kickFloorObjectRange()` before kicked fragile preflight breakage, matching C's range-before-`hero_breaks()` ordering and preserving range RNG order for martial, air/water, ice, and greased kicks.
  - Adds `lowRangeKickedObjectAvoidsOuch()` for the C `!rn2(3) || martial()` low-range return roll.
  - Adds `applyKickedObjectOuchDamage()` so the false return path uses the same wounded-right-leg and damage sequence as the existing command-level kick ouch branch.
  - Stops low-range resisted fragile stacks before `splitKickedFloorObjectForFlight()`, leaving the full source stack in place.

## Tests

- `command kicked fragile stack resistance thumps before split at low range`
  - Kicks a stack of three known confusion potions with the first preflight break roll resisting and hero strength low enough for `range < 2`.
  - Asserts message order includes `You kick ...`, `Thump!`, then `Ouch!  That hurts!`.
  - Asserts the full stack remains on the source square unsplit, no break/vapor/remote-flight/hit/miss side effects occur, and the hero takes deterministic wounded-leg plus HP damage from the `kick_ouch()` path.
  - Pins RNG order as preflight `rn2(100)`, low-range `rn2(3)`, kick-ouch exercise rolls, wounded-leg roll, wound duration, and damage.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "kicked fragile stack resistance|kicked oartifact fragile|kicked oartifact glass-material|kicked expensive camera breaks before remote" test/shop-billing-helpers.test.mjs` - pass, 5 matching tests
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1772 tests
- `node --test` - pass, 1923 tests
- `node --test test/*.mjs` - pass, 1923 tests
- `npm run score` - pass, 44/44

## Remaining

- Glass armor kicked preflight remains separate because C crack-erodes it before destruction.
- Generic local venom placeholders remain excluded unless resolved to concrete acid/blinding venom.
