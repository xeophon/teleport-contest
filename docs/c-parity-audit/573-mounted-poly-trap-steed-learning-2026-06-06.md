# Mounted polymorph-trap steed learning parity

## C source anchors

- `nethack-c/upstream/src/trap.c:3047-3049`: `dotrap()` teaches the hero's steed about the trap type with `mon_learns_traps(u.usteed, ttype)` before dispatching the trap effect.
- `nethack-c/upstream/src/trap.c:2468-2496`: `trapeffect_poly_trap()` then reveals the trap, emits the mounted `lead <steed> onto` wording, applies the iron-footwear and antimagic/unchanging branches, or calls `steedintrap()` before deleting the trap and polymorphing the hero.

## JS parity

- `js/cmd.js` now calls `markSteedKnowsTrap(game.u?.usteed, trap)` immediately after marking a polymorph trap seen in `heroPolyTrapResult()`. The helper is a no-op without a mounted steed, so unmounted trap handling is unchanged.
- Because the call happens before the iron-footwear, antimagic/unchanging, and successful polymorph branches, mounted polymorph traps now preserve C's `dotrap()` ordering for steed trap knowledge.

## Coverage

- `test/shop-billing-helpers.test.mjs`: the existing mounted polymorph trap/system-shock regression now asserts the pony's `mtrapseen` bit includes `POLY_TRAP`.
