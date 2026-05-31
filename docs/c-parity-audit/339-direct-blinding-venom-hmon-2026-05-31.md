# C Parity Audit 339: Direct Blinding Venom Monster Hits

## Sources

- `nethack-c/upstream/src/dothrow.c:2256-2260`: hero-thrown eggs, cream pies, blinding venom, and acid venom use the direct `hmon()` path when the throw is guaranteed or `ACURR(A_DEX) > rnd(25)`; `hmon()` uses up the object.
- `nethack-c/upstream/src/uhitm.c:1265-1272`: `hmon()` shares the cream-pie and blinding-venom branch, clears monster sleep, and checks `can_blnd()` with `AT_SPIT` for blinding venom.
- `nethack-c/upstream/src/uhitm.c:1273-1299`: eligible blinding venom prints the visible venom-blinds message, adds the `further` suffix for already temporarily blind monsters, angers the monster, clears `mcansee`, and adds `rn1(25,21)` blindness capped at 127.
- `nethack-c/upstream/src/uhitm.c:1300-1317`: ineligible cream pie or blinding venom only prints `Splat!`/`Splash!`, still angers the monster, consumes the thrown object, and suppresses normal thrown damage.
- `nethack-c/upstream/src/mon.c:4287-4296`: `setmangry()` clears waiting strategy, leaves tame monsters peaceful, and only makes non-tame peaceful monsters hostile.
- `nethack-c/upstream/src/mondata.c:315-328`: `can_blnd()` blocks no-eyes monsters, permanently blind monsters, and raven-on-raven blinding.
- `nethack-c/upstream/src/mondata.c:388-394`: `can_blnd()` blocks object-based blinding when the defender is wearing a visored helmet.

## JS Changes

- Added a direct hero-thrown blinding-venom branch before the older cream-pie, egg, potion, and generic noncombat miss paths.
- The successful branch now consumes the C-shaped hit rolls, splits one thrown unit from stacks for shop billing, applies the `hmon()` blinding/splash result, removes the thrown unit, redraws the target square, spends the turn, and leaves no floor object.
- Added a focused blinding-venom monster-effect helper that wakes and angers the target, clears wait strategy, preserves tame peacefulness, checks eyes/permanent blindness/raven/visor defenses, applies `21 + rn2(25)` temporary blindness capped at 127, and emits `Splash!` for ineligible or hero-blind feedback.
- The failed Dexterity branch still falls through to the normal landing path with a miss message, preserving current projectile placement and break handling.

## Tests

- `hero-thrown blinding venom direct hit blinds monster through hmon path` covers the visible eligible target branch, RNG order, object consumption, no floor landing, wakeup, anger, and bounded blindness duration.
- `hero-thrown blinding venom direct hit preserves tame peacefulness` covers the `setmangry()` tame target exception while still waking and clearing wait strategy.
- `hero-thrown blinding venom direct hit extends temporary monster blindness` covers the `further` message and 127 blindness cap.
- `hero-thrown blinding venom direct hit splashes on eyeless monster` covers `can_blnd()` rejection without the duration roll.
- `hero-thrown blinding venom direct hit splashes on permanently blind monster` covers permanent-blind rejection without the duration roll.

## Remaining Gaps

- Direct `ACID_VENOM` monster hits still need their matching `hmon()` branch for harmless acid-resistant hits, burn damage, object consumption, and no floor landing.
- The direct cream-pie branch remains older local behavior and still needs a separate `can_blnd()`/`hmon()` cleanup pass if hidden coverage starts probing no-eyes, permanent-blind, visor, or hero-blind variants.
- Full `setmangry()` side effects such as Elbereth/alignment penalties and nearby peaceful-monster reactions are still outside this projectile helper.
