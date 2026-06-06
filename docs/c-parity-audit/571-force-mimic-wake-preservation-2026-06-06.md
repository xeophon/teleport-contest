# Force Wake Mimic Preservation

## Scope

Add visible regression coverage for blunt `#force` waking apparent object and furniture mimics without revealing their disguise state. This is a source-backed coverage slice for the existing force-lock helper, not a production behavior change.

The test uses direct synthetic state only and does not use replay maps, hidden-test assumptions, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/lock.c:241` calls `wake_nearby(FALSE)` on each blunt forcing tick before the lock success roll.
- `nethack-c/upstream/src/lock.c:252` runs lock breakage after wake-nearby handling, so waking happens even while the occupation continues.
- `nethack-c/upstream/src/mon.c:4322` through `:4327` implements `wake_msg()` before sleep mutation.
- `nethack-c/upstream/src/mon.c:4367` through `:4387` implements `wake_nearby(FALSE)` as sleep clearing plus non-unique wait-mask clearing, with no `seemimic()` call.
- `nethack-c/upstream/src/mon.c:4333` through `:4343` is the contrasting `wakeup()` path that reveals object and furniture mimics through `seemimic()`.
- `nethack-c/upstream/include/display.h:75` through `:82` documents that concealed mimics still pass `mon_visible()`/`canseemon()`; visible wake messages can name them even though the disguise state is preserved.

## JS Coverage

- `js/cmd.js` already wakes nearby monsters from blunt force, preserves paralysis and mimic appearance fields, and clears non-unique wait strategy without calling a reveal helper.
- `test/shop-billing-helpers.test.mjs` now covers visible `M_AP_OBJECT` and `M_AP_FURNITURE` mimics during blunt force:
  - wake messages are emitted, matching C `canseemon()` behavior;
  - `msleeping` is cleared;
  - `m_ap_type`, `appearObj`, `appearGlyph`, and `appearColor` remain unchanged;
  - `mcanmove` and `mfrozen` remain unchanged;
  - non-unique wait strategy and `waiting` are cleared.

## Verification

- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "blunt force wakes visible apparent mimics without revealing disguise" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `npm run score`
