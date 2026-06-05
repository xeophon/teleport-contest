# Monster anti-magic trap effect parity

## Scope

Ordinary monsters that trigger `ANTI_MAGIC` traps now get the C-shaped monster effect instead of only learning/revealing the trap.

## C reference

- `nethack-c/upstream/src/trap.c:3795` computes the common `mintrap()` known-trap prelude.
- `nethack-c/upstream/src/trap.c:3812` can return before learning/effects for known traps.
- `nethack-c/upstream/src/trap.c:3816` learns/reveals the trap before dispatch.
- `nethack-c/upstream/src/trap.c:1061` shows `ANTI_MAGIC` is not a floor-trigger trap, so in-air monsters do not skip it through `check_in_air()`.
- `nethack-c/upstream/src/trap.c:1173` treats magic-resistant/defended monsters as harmless for monster movement pathing.
- `nethack-c/upstream/src/trap.c:2328` starts the anti-magic trap effect.
- `nethack-c/upstream/src/trap.c:2333` lets positively enchanted iron shoes absorb the effect by losing one enchantment.
- `nethack-c/upstream/src/trap.c:2401` computes monster visibility for effect messages.
- `nethack-c/upstream/src/trap.c:2406` handles non-resistant monsters.
- `nethack-c/upstream/src/trap.c:2409` adds `d(2,6)` to `mspec_used` for non-cancelled magic/breath monsters.
- `nethack-c/upstream/src/trap.c:2410` reveals the trap and prints `seems lethargic` when visible.
- `nethack-c/upstream/src/trap.c:2416` handles magic-resistant monsters by damaging HP.
- `nethack-c/upstream/src/trap.c:2418` rolls base `rnd(4)` anti-magic implosion damage.
- `nethack-c/upstream/src/trap.c:2429` quarters resistant damage for pass-wall monsters.
- `nethack-c/upstream/src/trap.c:2436` kills with the visible cause `compression from an anti-magic field`.
- `nethack-c/upstream/src/mon.c:3384` shows `monkilled()` emits the visible killed/destroyed cause message.
- `nethack-c/upstream/src/mon.c:2348` documents the `mfndpos()` rule that harmless traps are neither avoided nor marked hazardous.

## JS parity change

- Added `monsterAntiMagicTrapEffect(mon, trap)` in `js/allmain.js`.
- Preserved the shared known-trap prelude before effect handling.
- Kept magic-resistant anti-magic traps harmless for pathing, while still applying damage when actually triggered.
- Implemented silent positive iron-footwear enchantment drain.
- Implemented `mspec_used += d(2,6)` for non-resistant, non-cancelled magic/breath monsters with visible `seems lethargic` feedback.
- Implemented magic-resistant `rnd(4)` HP damage, pass-wall quartering, visible trap reveal, visible C cause message, and normal monster cleanup on death.

## Tests

- `magic resistant monster anti-magic pathing candidate is harmless like C`
- `ordinary non-magical monster anti-magic trap only teaches the trap`
- `monster anti-magic trap drains magical attack cooldown and reveals visibly`
- `canceled magical monster anti-magic trap learns but does not drain`
- `magic resistant monster anti-magic trap takes implosion damage`
- `pass-wall magic resistant monster anti-magic trap damage is quartered`
- `visible lethal anti-magic implosion removes monster with C cause message`
- `positive enchanted iron footwear absorbs monster anti-magic trap silently`

The tests use direct helper fixtures and explicit RNG queues. They do not depend on replay maps, hidden seeds, player names, or runtime-specific behavior.

## Remaining nearby gaps

The optional C damage adders for monster-wielded Magicbane and carried magic-defending artifacts are covered in `543-monster-anti-magic-artifact-damage-2026-06-06.md`.
