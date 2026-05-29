# Wand polymorph shudder feedback

Date: 2026-05-29.

## C anchors

- `nethack-c/upstream/src/zap.c:1476` implements `obj_shudders()`: wands and cursed objects use odds 3, blessed objects use odds 12, ordinary objects use odds 8, and stacks with quantity greater than 4 halve the odds.
- `nethack-c/upstream/src/zap.c:2191` handles polymorph object hits through `bhito()`, including the unpolyable-object gate before conduct and shudder logic.
- `nethack-c/upstream/src/zap.c:2206` calls `obj_shudders()` from that path and only runs `do_osshock()` when the object shudders apart.
- `nethack-c/upstream/src/zap.c:3420` implements `zapwrapup()`, which prints "You feel shuddering vibrations." only when `do_osshock()` set the delayed object-zapped flag.

## JS changes

- `polymorphShudderOdds()` now mirrors the C odds table and the large-stack quantity adjustment.
- Floor wand-polymorph now uses the existing polymorph unpolyable identity helper before conduct/shudder rolls, so polymorph wands, potions, spellbooks, and amulets of unchanging are not altered by spelling-sensitive display names.
- Floor wand-polymorph handling now tracks whether an object actually shuddered apart.
- Successful floor polymorph still allows shopkeeper anger feedback, but no longer prints the delayed shuddering-vibrations message unless a shudder destruction occurred.

## Regression coverage

- `test/shop-billing-helpers.test.mjs` keeps the existing shop-floor shudder billing tests.
- Added coverage for quantity greater than 4 halving ordinary-object shudder odds.
- Added coverage for a floor wand of polymorph remaining unpolyable by identity without conduct or shudder feedback.
- Tightened the successful shop-stock polymorph test so it rejects a false shuddering-vibrations message.

## Remaining gaps

- This slice does not implement full `bhit()` beam traversal, vertical `<`/`>` pile handling, monster-first polymorph beam hits, boulder eligibility, or exact pile chain ordering.
- Broader `poly_obj()` replacement details and golem creation remain separate C-backed slices.
