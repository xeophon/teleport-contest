# C Parity Audit 45: Stone-To-Flesh Marble Wand Self-Cast

## Purpose

This note records the implemented narrow stone-to-flesh object-transform slice and the fresh follow-up findings from the parallel C-source audits. It covers the first source-backed wand row only: self-cast `SPE_STONE_TO_FLESH` on carried marble wands of make invisible.

## Implemented Slice

C routes `SPE_STONE_TO_FLESH` through the wand-like direction flow; self-cast walks inventory through `bhito()`, transforms eligible non-worn mineral/gemstone objects, then repeatedly merges compatible inventory results. The smallest safe JS port now handles the ordinary mineral wand row: a carried marble wand of make invisible becomes `MEAT_STICK` when the player casts stone to flesh at self.

The JS path now branches before generic healing-spell handling, replaces each carried make-invisible/marble wand with a meat stick, preserves quantity, inventory letter, BUC state, `no_charge`, and `recharged`, drops wand charge metadata, marks the old unpaid wand bill row used-up, and runs a repeated inventory merge pass for resulting meat sticks. The slice intentionally does not preserve the local `bknown` display flag; the preserved C-relevant state here is actual BUC, and retaining `bknown` on the local food display duplicates the BUC adjective.

## C Anchors

- `nethack-c/upstream/src/spell.c:1478`, `nethack-c/upstream/src/spell.c:1486`, `nethack-c/upstream/src/spell.c:1500`: stone to flesh is dispatched as an immediate wand-like spell and self-cast routes through `zapyourself()`.
- `nethack-c/upstream/include/objects.h:1406`: `SPE_STONE_TO_FLESH` is a level-3 healing-skill immediate spell.
- `nethack-c/upstream/src/zap.c:2966-2990`: self-cast stone to flesh walks inventory and restarts merging until no compatible transformed results remain.
- `nethack-c/upstream/src/zap.c:2002`, `nethack-c/upstream/src/zap.c:2080`: `stone_to_flesh_obj()` gates on mineral/gemstone material and maps mineral wands to `MEAT_STICK`.
- `nethack-c/upstream/include/objects.h:1466`: the wand of make invisible has the marble appearance/material row used by this first JS slice.
- `nethack-c/upstream/include/objects.h:1056`: `MEAT_STICK` is the mergeable one-weight, five-nutrition food result for wands.
- `nethack-c/upstream/src/zap.c:1739-1786`: `poly_obj()` preserves quantity, inventory letter, `no_charge`, BUC state, and `recharged` while reinitializing result-type fields.
- `nethack-c/upstream/src/zap.c:1987`, `nethack-c/upstream/src/shk.c:1224`: deleting an unpaid transformed object marks the old shop bill row used-up before replacement.

## JS Notes

- `js/cmd.js:1154`: adds the make-invisible wand object id used by the local object-row guard.
- `js/cmd.js:11829-11900`: adds helpers to recognize the covered marble wand row, build the meat-stick replacement, transform inventory, preserve C fields, mark old unpaid bills used-up, and merge compatible inventory results.
- `js/cmd.js:39824-39839`: stone to flesh now handles `.` self-cast before the generic healing branch.
- `test/shop-billing-helpers.test.mjs:3196-3291`: covers the command path, ordinary transform, preserved fields, merge pass, and unpaid used-up bill preservation.

## Remaining Follow-Ups

- Broaden stone to flesh from the covered carried marble-wand row to rings, gems/stones, boulders, statues, figurines, floor/beam targets, golem effects, and petrification rescue.
- Replace the local material/name guard with registry-backed material and object-class metadata instead of recognizing this one ordinary wand row in command code.
- Fill out full `poly_obj()` result initialization, object resistance, attached-data cleanup, display/discovery behavior, and shop routing for non-inventory transformations.
- Keep forced chest potion shattering as the next compact vapor/destruction candidate: fix the blade destroy-roll short-circuit, call direct potion vapor for potion contents, decrement one stack unit, place survivors, and then add destroyed-content shop loss.
- Keep direct hero-thrown `potionhit()` as a larger hit-delivery slice, starting with a known confusion potion hitting a visible ordinary monster before widening.
- Keep statue-trap shatter debt as a compact shop slice: charge statue and contents before moving contents to the animated monster when `shatter` is true.
- Defer lycanthropy water vapor until the local were-form runtime model is source-shaped enough to support `you_were()`/`you_unwere()` semantics.

## Ranking

1. Forced chest-content potion shattering is still the closest continuation of the recent vapor work.
2. Statue-trap shatter debt is isolated and source-backed in one trap path.
3. Direct hero-thrown `potionhit()` is high impact but should start with one monster-hit row.
4. Broader stone-to-flesh transformations should wait for registry-backed material/object metadata after the marble-wand row.
