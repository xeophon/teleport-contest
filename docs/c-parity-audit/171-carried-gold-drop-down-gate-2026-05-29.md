# Carried Gold Drop Down Gate 2026-05-29

Implemented a compact command-drop carried-gold down-gate parity slice. No private fixtures were inspected or encoded.

## C Anchors

- `dropx()` removes the object from inventory and calls `ship_object(obj, u.ux, u.uy, FALSE)` with no coin-class exclusion: `nethack-c/upstream/src/do.c:786`.
- `dropz()` only runs floor effects after `ship_object()` declines: `nethack-c/upstream/src/do.c:827`.
- Local placement happens after floor effects: `nethack-c/upstream/src/do.c:829`.
- Shop `sellobj()` donation/credit happens after local placement: `nethack-c/upstream/src/do.c:835`.
- `ship_object()` resolves `down_gate()` first: `nethack-c/upstream/src/dokick.c:1651`.
- Ladders always drop, while other down gates use the `rn2(3)` stay roll: `nethack-c/upstream/src/dokick.c:1657`.
- Object breakage is tested before migration queueing: `nethack-c/upstream/src/dokick.c:1717`.
- Surviving objects are queued for migration: `nethack-c/upstream/src/dokick.c:1743`.
- `down_gate()` checks down stairs, ladders, special stairs, then seen holes/trap doors: `nethack-c/upstream/src/dokick.c:1943`.
- Thrown gold already uses the same broad order: ship before floor effects, donation, and stacking: `nethack-c/upstream/src/dothrow.c:2715`.

## JS Work

- Added an opt-in `{ allowGold: true }` path to the carried-drop down-gate helper while preserving the default gold exclusion for existing non-gold callers.
- Routed the command-drop `$` branch through `maybeShipCarriedDropObject()` before floor effects, local placement, shop donation/credit, and stacking.
- If carried gold ships, it now skips local floor effects and shop donation.
- If the first down-gate roll keeps carried gold local, it still proceeds through `earthFloorEffects()` before placement/donation, matching the C `dropx()` then `dropz()` order.

## Public Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `command carried gold drop down stairs ships before same-square hole or donation`
- `command carried gold drop down ladder skips stay roll and ships before donation`
- `command carried gold drop down stairs can stay and donate locally`
- `command carried gold seen hole stay roll can still floor-effect ship before donation`

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "command carried gold|command carried drop down|unpaid fragile carried potion down stairs|thrown gold" test/shop-billing-helpers.test.mjs`

## Fresh Follow-Up Findings

Parallel read-only audits identified these source-backed next slices:

- Monster-thrown `drop_throw(ohit)` should thread hit state into egg breakage, hit-only missile mulch, and later passive-object handling. Anchors: `nethack-c/upstream/src/mthrowu.c:161`, `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:188`.
- Floor statue stone-to-flesh should apply C `cant_revive()` substitutions and saved `omonst` traits before broad `newcham()`/shopkeeper restoration work. Anchors: `nethack-c/upstream/src/zap.c:1993`, `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:761`, `nethack-c/upstream/src/zap.c:713`.
- Floor-effect deletion should preserve nested shop bills recursively through the existing tree helper, matching `obfree()` content deletion. Anchors: `nethack-c/upstream/src/shk.c:1173`, `nethack-c/upstream/src/shk.c:1199`, `nethack-c/upstream/src/shk.c:1224`.

## Remaining Gaps

- Kicked-object down-gate shipping remains separate.
- Arrival scatter/break refinements for migrated piles remain separate.
- Monster-thrown hit-state mulch/passive behavior remains separate.
- Floor statue saved-traits/cant-revive and recursive floor-effect `obfree()` preservation remain separate follow-up slices.
