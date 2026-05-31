# C Parity Audit 341: Direct Cream Pie Monster Hits

## Sources

- `nethack-c/upstream/src/dothrow.c:2256-2260`: hero-thrown eggs, cream pies, blinding venom, and acid venom use the direct `hmon()` path when the throw is guaranteed or `ACURR(A_DEX) > rnd(25)`; `hmon()` uses up the object.
- `nethack-c/upstream/src/uhitm.c:1265-1272`: cream pies share the `hmon()` blinding branch with blinding venom, clear monster sleep, and call `can_blnd()` with `AT_WEAP`.
- `nethack-c/upstream/src/uhitm.c:1273-1292`: an eligible cream pie prints `Splat!` to a blind hero, otherwise reports the pie splashing over the monster or its face.
- `nethack-c/upstream/src/uhitm.c:1293-1299`: eligible hits call `setmangry()`, clear `mcansee`, and add `rn1(25,21)` blindness capped at 127.
- `nethack-c/upstream/src/uhitm.c:1300-1317`: ineligible cream pies print `Splat!`, still anger the monster, consume the thrown object, suppress normal hit text, and deal no ordinary damage.
- `nethack-c/upstream/src/mondata.c:315-328`: `can_blnd()` blocks no-eyes monsters, permanently blind monsters, and raven-on-raven blinding.
- `nethack-c/upstream/src/mon.c:4287-4296`: `setmangry()` clears waiting strategy, leaves tame monsters peaceful, and makes only non-tame peaceful monsters hostile.

## JS Changes

- Replaced the older direct cream-pie throw branch with an `hmon()`-style helper that shares the direct venom gate, one-unit stack splitting, redraw, turn, and no-floor-placement behavior.
- Added cream-pie-specific `can_blnd()` handling for eyes, permanent blindness, and raven-on-raven defenses.
- Direct cream-pie hits now:
  - print the visible face-splash message for eligible visible feedback;
  - print `Splat!` when the hero is blind or the target cannot be blinded;
  - apply `21 + rn2(25)` temporary monster blindness capped at 127 only when eligible;
  - wake and anger survivors through the local hmon anger helper;
  - charge consumed unpaid thrown units through the existing broken-thrown-object debt path.

## Tests

- `hero-thrown cream pie direct hit blinds monster through hmon path` covers the visible face-splash branch, duration RNG, wake/anger, consumption, and no floor placement.
- `hero-thrown cream pie direct hit splats for blind hero but blinds monster` covers blind-hero feedback while still applying monster blindness.
- `hero-thrown cream pie direct hit splats on eyeless monster` covers `can_blnd()` rejection without the duration roll.
- `hero-thrown cream pie direct hit extends temporary monster blindness` covers the allowed temporary-blind target branch, no `further` wording, and the 127 duration cap.
- `hero-thrown cream pie direct hit splats on permanently blind monster` covers permanent-blind rejection without the duration roll.
- `hero-thrown cream pie direct hit preserves tame peacefulness` covers the `setmangry()` tame target exception while still waking and clearing wait strategy.
- `hero-thrown unpaid cream pie stack direct hit bills the splattered unit` covers stack splitting, residual live billing, and debit for the consumed thrown unit.

## Remaining Gaps

- Full shared `hmon()` side effects such as priest/guard anger, Elbereth/alignment penalties, nearby peaceful reactions, pet abuse/fleeing, swallowed guaranteed-hit cases, and exact unseen/invisible monster naming remain broader combat-core work.
- Floating-eye face wording is modeled by name in this focused helper rather than by generated monster body-part metadata.
