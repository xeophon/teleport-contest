# Lava Entry Worn Boot Pre-Pass

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6794` enters `lava_effects()`.
- `nethack-c/upstream/src/trap.c:6811` computes the initial lava damage/survival roll with `d(6, 6)`.
- `nethack-c/upstream/src/trap.c:6858` burns vulnerable worn boots before final lava fall/sink handling.
- `nethack-c/upstream/src/trap.c:6863` wraps `Boots_off()` with `iflags.in_lava_effects` so boot removal does not recursively re-enter lava fallout.
- `nethack-c/upstream/src/do_wear.c:280` skips water-walking `spoteffects()` while `iflags.in_lava_effects` is set.
- `nethack-c/upstream/src/do_wear.c:300` skips levitation `float_down()` while `iflags.in_lava_effects` is set.

## JS Parity Slice

- Added a direct lava-entry resolver for forced `m` movement into lava.
- The resolver now rolls `d(6, 6)`, burns vulnerable worn boots first, and then evaluates fatal fall, water-walking burn, or fire-resistant sinking.
- Boot burning uses `destroyWornArmorItem()` so AC updates, boot-off side effects, and shop used-up billing remain centralized.
- Added `_in_lava_effects` guarding for water-walking and levitation boot removal fallout, matching C's recursive lava suppression.
- Preserved fatal `lavaDeathMore` flow and fire-resistant `TT_LAVA` sink state.

## Tests

- `m-prefix into lava burns non-fireproof water walking boots before fatal lava`
- `m-prefix into lava sinks fire-resistant hero after guarded water walking boot burn`
- `m-prefix into lava clears burned levitation boots without recursive lava fallout`
- `m-prefix into lava marks unpaid burned water walking boots as used-up`

Verification:

```sh
node --test test/shop-billing-helpers.test.mjs
```

Result: 3095 passing tests.

## Remaining Gaps

- Broader `lava_effects()` inventory burn/lifesaving/explore-mode handling remains incomplete.
- Terrain-created lava entry at `js/cmd.js:6708` still has a separate direct lava path and is not included in this movement-only slice.
- Per-turn `sink_into_lava()` parity remains future work.
