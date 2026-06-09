# Fatal Lava Inventory Burn

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6800` rolls `d(6,6)` for `lava_effects()`.
- `nethack-c/upstream/src/trap.c:6811` computes initial `usurvive = Fire_resistance || (Wwalking && dmg < u.uhp)`.
- `nethack-c/upstream/src/trap.c:6822` only marks doomed inventory when that initial survival check fails.
- `nethack-c/upstream/src/trap.c:6843` marks organic or potion inventory unless protected, fireproof/fire-resistance, scroll of fire, spellbook of fireball, or `obj_resists(obj, 0, 0)`.
- `nethack-c/upstream/src/trap.c:6858` burns vulnerable worn boots after marking.
- `nethack-c/upstream/src/trap.c:6909` destroys the marked objects with `useupall()`.
- `nethack-c/upstream/src/invent.c:1312` confirms `useupall()` removes the whole object stack.

## JS Parity Slice

- Added a lava-specific fatal inventory selection for the initial non-survivor path.
- Preserved the C ordering nuance by selecting doomed inventory before boot burn, then destroying only still-carried selected objects in the fatal branch.
- Destroyed whole eligible carried stacks with `useUpInventoryItem()`.
- Kept the ordinary fatal path silent for inventory burn-up, instead of reusing generic fire inventory messages and potion vapor.
- Retained fireproof/fire-resistance objects, scrolls of fire, spellbooks of fireball, and hard invocation/resisting objects.

## Tests

- `m-prefix fatal lava burns initial non-survivor organic and potion inventory`
- `m-prefix lava does not whole-burn inventory when initial water walking would survive`

Verification:

```sh
node --test --test-name-pattern "m-prefix (fatal lava burns initial non-survivor|lava does not whole-burn|into lava burns non-fireproof water walking boots|into lava sinks fire-resistant)" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: 3103 passing tests.

## Remaining Gaps

- Fire-resistant and water-walking survivor `burn_stuff` inventory fire parity is still incomplete.
- Lava entry still does not route life-saving, explore/wizard continuation, rescue teleport, or follow-up `spoteffects(FALSE)`.
- `sink_into_lava()` countdown death still lacks life-saving and rescue teleport continuation.
