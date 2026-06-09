# Drum Earthquake Lava Life-Saving

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/music.c:688` handles charged drum-of-earthquake use.
- `nethack-c/upstream/src/music.c:695` prints `You produce a heavy, thunderous rolling!`.
- `nethack-c/upstream/src/music.c:697` prints the whole-level shaking line.
- `nethack-c/upstream/src/music.c:698` calls `do_earthquake()`.
- `nethack-c/upstream/src/music.c:699` through `nethack-c/upstream/src/music.c:701` only run the post-earthquake monster wake and known-state aftermath if death did not end the game.
- `nethack-c/upstream/src/music.c:219` defines drum earthquake `do_pit()`.
- `nethack-c/upstream/src/music.c:248` through `nethack-c/upstream/src/music.c:251` select liquid fill and call `liquid_flow()` with a null fill message.
- `nethack-c/upstream/src/music.c:253` returns after liquid flow deletes the pit, so no later chasm-fall path runs for a lava-filled hero square.
- `nethack-c/upstream/src/dig.c:606` defines `fillholetyp()`, including lava selection at `nethack-c/upstream/src/dig.c:628`.
- `nethack-c/upstream/src/dig.c:858` defines `liquid_flow()`.
- `nethack-c/upstream/src/dig.c:864` only prints a fill message when the caller supplies one.
- `nethack-c/upstream/src/dig.c:866` through `nethack-c/upstream/src/dig.c:872` damage floor objects before hero fallout.
- `nethack-c/upstream/src/dig.c:874` routes the hero through `pooleffects(FALSE)`.
- `nethack-c/upstream/src/hack.c:3298` sends hero lava pooleffects into `lava_effects()`.
- `nethack-c/upstream/src/trap.c:6811` computes initial lava survival.
- `nethack-c/upstream/src/trap.c:6933` through `nethack-c/upstream/src/trap.c:6936` print fatal lava, call `done(BURNING)`, and only try safe teleport if death handling returns.

## JS Parity Slice

- Preserved `earthquakeLiquidFlow(...).heroResult` on the drum earthquake message array.
- Stopped the remaining earthquake scan once hero liquid fallout reports fatality or life-saving.
- Added a shared earthquake instrument finalizer that sets the pending message, then routes life-saving or non-special fatal metadata through `applyLifeSavingOrFatalCommandMode()`.
- Preserved special `lavaDeathMore` for unrecovered fatal lava while preventing the command from counting as a normal completed move.
- Skips post-earthquake drum known-state and monster-wake aftermath for unrecovered fatal lava, matching the C path after `done()` does not return.
- Kept drum-created lava distinct from land-mine-created lava: no `The hole fills with lava!` line is synthesized.

## Tests

- `drum earthquake lava fill with life saving stops later earthquake effects`
- `drum earthquake fatal lava fill stops later earthquake effects`

Verification:

```sh
node --test --test-name-pattern "drum earthquake (lava fill with life saving|fatal lava fill)" test/shop-billing-helpers.test.mjs
node --test --test-name-pattern "(drum earthquake (lava fill with life saving|fatal lava fill)|leather drum skips|no-blow form gates|manual instrument tune|hero land mine adjacent lava|m-prefix fatal lava consumes life saving)" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: focused drum lava set passed 2 matching tests; broader instrument/lava set passed 9 matching tests; full `test/shop-billing-helpers.test.mjs` passed 3112 tests.

## Remaining Gaps

- Wizard/explore-mode lava death refusal is still not implemented.
- Generic `fireDamageInventory()` still lacks C's fire inventory resistance chance.
- Generic `fireDamageInventory()` still uses full selected `in_use` stack quantity instead of subtracting one first.
- Potion vapor effects still happen before the destruction message in the JS generic helper.
- Fatal lava hard `obj_resists(obj, 0, 0)` RNG consumption and wand/fire-horn exemption parity are still incomplete.
