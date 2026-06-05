# Monster polymorph trap pathing parity

## Scope

Audit and lock the movement-selection behavior for monsters considering `POLY_TRAP` squares. This follows the monster-side trap effect work in `538-monster-polymorph-trap-2026-06-06.md`.

## C references

- `nethack-c/upstream/src/trap.c:1106` defines `m_harmless_trap()`. Its `POLY_TRAP` case at `trap.c:1177` just breaks, so polymorph traps are not harmless movement candidates.
- `nethack-c/upstream/src/mon.c:2348` through `:2368` shows `mfndpos()` skips a harmful trap when the monster knows that trap type and lacks `ALLOW_TRAPS`; harmless traps are not marked in `info[]`.
- `nethack-c/upstream/src/trap.c:3812` gives monsters that have already seen a trap type a later 3-in-4 chance to avoid triggering it after stepping there.
- `nethack-c/upstream/src/trap.c:2516` applies monster magic resistance only inside the `POLY_TRAP` effect after the trap is triggered. It does not make the square harmless during pathing.

## JS parity

- `js/allmain.js` now exposes a narrow `__allmainTestHooks` test hook for `mfndpos()` and `monsterAllowFlags()` so path candidate filtering can be tested directly without full monster-turn RNG.
- `monsterTrapHarmless()` intentionally does not include `POLY_TRAP`; magic-resistant monsters avoid known polymorph traps during hostile movement just like other monsters.
- Unknown polymorph traps remain candidate squares, but their `mfndpos()` result is flagged with `ALLOW_TRAPS`, proving they are hazardous candidates rather than harmless ones.

## Tests

- `magic resistant monster avoids known polymorph trap pathing candidate`
- `magic resistant monster marks unknown polymorph trap pathing candidate as hazardous`

Both tests live beside the existing monster polymorph trap trigger/effect tests in `test/shop-billing-helpers.test.mjs`.
