# Wielded Aklys Return

## C anchors

- `nethack-c/upstream/src/dothrow.c:28` through `:34`: `AutoReturn()` only treats an aklys as returning when the saved worn mask includes `W_WEP`; non-wielded, quivered, and alternate/swap aklyses do not qualify.
- `nethack-c/upstream/include/hack.h:49`, `nethack-c/upstream/src/weapon.c:512` through `:516`, and `nethack-c/upstream/src/dothrow.c:1664` through `:1677`: aklys is a tethered return weapon with `AKLYS_LIM = BOLT_LIM / 2`, so direct throw range is capped at 4.
- `nethack-c/upstream/src/dothrow.c:250` through `:270` and `:1562` through `:1565`: `dothrow()` saves the original worn mask, removes the object from inventory, and sets `iflags.returning_missile` from `AutoReturn(obj, wep_mask)`.
- `nethack-c/upstream/src/dothrow.c:1695` through `:1717`: monster hit resolution, `hmon()` damage, and successful-hit Dexterity exercise happen before the return rolls.
- `nethack-c/upstream/src/dothrow.c:1710` through `:1726`: return success rolls `rn2(100)` for the return attempt, then another `rn2(100)` for the catch if the hero is not impaired; success prints `The aklys returns to your hand!`, adds it back to inventory, clears quiver if needed, and rewields it.
- `nethack-c/upstream/src/dothrow.c:1729` through `:1769`: failed catches roll `rn2(2)` and possibly `rnd(3)`, then drop/ship at the hero square; a failed return prints `The aklys fails to return!` and continues into ordinary landing at `gb.bhitpos`.
- `nethack-c/upstream/src/dothrow.c:1780` through `:1804`: hard-floor break testing only happens after return failure or for non-returning direct throws, not after a clean return.

## JS parity

- `itemIsPrimaryWieldedAklys()` now gates return behavior on primary wielded state and `aklys` object kind.
- Direct throw uses range 4 for primary-wielded aklys and the existing range for ordinary throws.
- The direct throw tail now runs return attempt and catch RNG after impact handling and before normal landing/removal.
- A clean return leaves the original inventory object in hand, clears quiver state, emits `The aklys returns to your hand!`, and skips the hard-floor landing path.
- Failed return attempts fall through to the existing landing path after adding `The aklys fails to return!`; bad catches drop at the hero square without top-level hard-floor break testing and with the C-order `rn2(2)`/`rnd(3)` RNG tail.

## Replay-free coverage

- `hero-thrown primary-wielded aklys returns to hand after monster hit`
- `hero-thrown primary-wielded aklys range caps before distant monster`
- `hero-thrown primary-wielded aklys failed catch drops at hero without hard break roll`
- `hero-thrown primary-wielded aklys failed return lands at monster square with hard break roll`
- `hero-thrown primary-wielded aklys impaired return skips catch roll and lands at feet`

The monster-hit canary drives the real `t` command with deterministic unit RNG only. It asserts C-order hit, damage, Dexterity exercise, return attempt, and catch rolls; unchanged monster wake/anger side effects; retained inventory/wielded state; no landed floor object; and no hard-floor `rn2(100)` after the clean return.

The range canary places a monster five squares away, outside the tethered aklys range. It asserts the monster is not hit or woken, the aklys returns to hand, and the only RNG is the return attempt plus catch roll.

The failed-catch canary drives a seeded catch failure after a successful monster hit. It asserts the arm-hit message, hero HP loss from `rnd(3) + 1`, dropped non-wielded object at the hero square, and the exact `rnd(20)`, `rnd(6)`, `rn2(19)`, `rn2(100)`, `rn2(100)`, `rn2(2)`, `rnd(3)` sequence with no hard-floor `rn2(100)`.

The failed-return canary drives a first return roll of zero. It asserts `The aklys fails to return!`, monster-square landing, dropped non-wielded state, and the hard-floor `rn2(100)` after failed return.

The impaired canary sets the hero fumbling before a successful return attempt. It asserts no catch `rn2(100)` is consumed, `rn2(2)=0` lands the aklys at the hero's feet without HP loss, and the object is no longer wielded.

## Remaining candidates

- An impaired arm-hit canary can pin the no-catch-roll `rn2(2)=1` plus `rnd(3)` path if needed.
- Swap-weapon/two-weapon edge cases remain worth pinning if the JS inventory model grows explicit left-hand weapon state.
