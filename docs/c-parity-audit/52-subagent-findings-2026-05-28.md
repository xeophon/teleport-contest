# C Parity Audit 52: Floor Polymorph Shop-Helper Cleanup

## Purpose

Record the floor polymorph shop-helper cleanup after Audit 51 and keep the remaining floor stone-to-flesh boundary explicit.

## Implemented Slice

C floor polymorph reaches floor objects through `bhitpile()` and `bhito()`. This slice covers the existing JS adjacent floor-object wand path, not full C beam traversal, boulder terrain updates, polymorph golem creation, or spell object hits.

JS now handles two C-backed floor polymorph billing branches:

- Shudder destruction removes one floor unit, bills same-shop stock as a used-up bill row, routes outside-shop loss to `robbed`, and preserves the surviving stack unit.
- Ordinary replacement preserves any live bill rows from the old object and contents as used-up debt, strips stale bill state from the replacement, drops replacement contents, preserves `no_charge`, and angers or furiates the shopkeeper without creating dummy alteration debt.

## C Anchors

- `nethack-c/upstream/src/zap.c:2173-2220`: `bhito()` floor-object polymorph gate, conduct increment, box-lock invalidation, shudder, and `poly_obj()`.
- `nethack-c/upstream/src/zap.c:2428-2495`: `bhitpile()` floor-pile traversal and post-polymorph pile restacking.
- `nethack-c/upstream/src/zap.c:1635-1674`: `do_osshock()` shudder destruction billing through `addtobill()` or `stolen_value()`.
- `nethack-c/upstream/src/zap.c:1702-1988`: `poly_obj()` replacement, preserved fields, replacement-content deletion, boulder terrain updates, and shopkeeper anger checks.
- `nethack-c/upstream/src/shk.c:1187-1260`: `obfree()` marks live bill rows used-up when deleted objects are still on the bill.

## JS Anchors

- `js/cmd.js:20226`: floor polymorph shudder use-up routing for same-shop used-up rows and outside-shop loss.
- `js/cmd.js:20243`: floor polymorph shopkeeper anger predicate for ordinary replacement.
- `js/cmd.js:20281`: replacement cleanup for old live bill rows, stale bill state, and generated contents.
- `js/cmd.js:40081`: adjacent floor polymorph command path using identity-based removal so stack remnants survive shudder.
- `test/shop-billing-helpers.test.mjs:4548`: focused floor polymorph shop billing coverage.

## Follow-Up Findings

Floor stone-to-flesh costly alteration remains the next floor alteration caller. Direct ice/cold-ray burial, direct hero-thrown sleeping `potionhit()`, boulder push shop-boundary transitions, shared `sellobj()`, generic `obfree()`, polymorph boulder/golem behavior, and full beam traversal remain open.

## Ranking

1. Floor stone-to-flesh costly alteration.
2. Direct hero-thrown sleeping `potionhit()`.
3. Direct ice/cold-ray burial callback or shop-helper extraction.
4. Boulder push shop-boundary transitions and shared `sellobj()`.
5. Generic `obfree()` and ownership consolidation.
