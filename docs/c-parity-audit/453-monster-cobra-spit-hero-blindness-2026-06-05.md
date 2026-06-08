# C Parity Audit 453: Monster Cobra Spit Hero Blindness

Implemented the narrow cobra-to-hero blinding venom branch. No replay maps, private fixtures, or seed-specific game logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:1027`: cobra `AD_BLND` spit creates `BLINDING_VENOM`.
- `nethack-c/upstream/src/mthrowu.c:1048`: visible cobra spit prints the venom message, then routes through `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:699`: hero hits by blinding venom call `thitu(8, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:102`: `thitu()` misses when `u.uac + 8 <= rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:755`: blinding venom hit uses `can_blnd()`, rolls `rnd(25)`, and queues hero blindness.
- `nethack-c/upstream/src/mondata.c:305`: `can_blnd()` blocks blinding venom through no eyes, worn eye covering, existing cream, or visored helmets.
- `nethack-c/upstream/src/mthrowu.c:170`: venom breaks through `drop_throw()` instead of landing as a floor object.

## JS Changes

- Replaced the old natural-20-only cobra spit miss branch with the C-shaped `uac + 8 <= rnd(20)` hit check.
- Added hero hit feedback, no-damage blinding venom delivery, `ucreamed` and blind-time updates, status suffix refresh, and visible map refresh.
- Added venom-specific hero blindness gates for no eyes, blindfold/towel/lenses, existing cream, and visored helmet/helm-of-telepathy protection.
- Preserved the C miss tail rolls: a missed splash consumes the post-hero `rn2(5)` and obstruction break-test `rn2(100)` before ending flight.

## Tests

- `automatic hostile cobra spit hit blinds the hero with blinding venom`
- `automatic hostile cobra spit uses thitu miss threshold before blinding`
- `automatic hostile cobra spit hit respects worn lenses eye protection`

Verified with:

```sh
node --test --test-name-pattern "cobra spit" test/shop-billing-helpers.test.mjs
```

## Remaining

- Cobra-spit intervening-monster blinding is covered in `781-monster-cobra-spit-intervening-blinding-2026-06-08.md`.
- Monster-thrown hero/polyself passive object behavior remains a separate source-backed projectile slice.
- Broader direct `hits_bars()` object-class gates and direct hero-thrown stone-missile rock-passer harmless handling remain separate candidates.
