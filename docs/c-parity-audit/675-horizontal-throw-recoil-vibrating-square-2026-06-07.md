# 675 - Horizontal Throw Recoil Vibrating Square

## C Source

- `nethack-c/upstream/src/dothrow.c:937-965` handles traps after each successful recoil `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:951-954` prints `The ground vibrates as you pass it.` for `VIBRATING_SQUARE`, then calls `dotrap(ttmp, NO_TRAP_FLAGS)`.
- `nethack-c/upstream/src/trap.c:2725-2734` dispatches the hero vibrating-square effect through `feeltrap(trap)` and leaves messages to the caller.
- `nethack-c/upstream/src/trap.c:3588-3595` shows `feeltrap()` marking `trap->tseen` and redrawing the trap square.

## Port Notes

- `heroHorizontalThrowRecoil()` now handles the vibrating-square special branch separately from generic seen-trap pass-over text.
- Recoiling over a vibrating square always adds `The ground vibrates as you pass it.`, even if the trap was hidden.
- The trap is marked seen and redrawn to mirror C's `feeltrap()` side effect.
- The generic `You pass right over ...` path still excludes vibrating squares, so the recoil-specific message is not mixed with ordinary trap pass-over wording.

## Tests

- `levitating hero-thrown ordinary weapon recoil vibrates hidden vibrating square`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown ordinary weapon recoil passes over seen anti-magic field|levitating hero-thrown ordinary weapon recoil vibrates hidden vibrating square" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Recoil effects for Sokoban pit/hole stops remain a separate slice.
- Full normal-movement trap dispatch is still deliberately avoided for recoil because C only triggers a narrow trap subset from `hurtle_step()`.
