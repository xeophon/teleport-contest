# C Parity Audit 53: Floor Stone-To-Flesh Marble Wand Cleanup

## Purpose

Record the first floor stone-to-flesh object transform after Audit 52 and keep broader beam/statue/material coverage explicit.

## Implemented Slice

C `SPE_STONE_TO_FLESH` reaches floor objects through `bhito()` and `stone_to_flesh_obj()`. This slice covers a narrow modeled row: downward stone-to-flesh on the hero square transforms floor marble/make-invisible wands into meat sticks. It does not cover horizontal beam traversal, boulders, statues, figurines, rings, gems, object resistance, or golem creation.

JS now reuses the carried marble-wand replacement for floor objects, preserves quantity, BUC state, `no_charge`, `recharged`, and floor coordinates, marks any old live bill row used-up before replacement, clears stale bill state from the new meat stick, and uses the floor polymorph shopkeeper anger helper for ordinary chargeable shop stock. Ordinary shop-floor replacement does not create immediate debit or dummy alteration debt.

## C Anchors

- `nethack-c/upstream/src/spell.c:1478-1500`: spell dispatch sends non-self stone-to-flesh through wand-style effects and self-cast through `zapyourself()`.
- `nethack-c/upstream/src/zap.c:2408-2414`: `bhito()` dispatches `SPE_STONE_TO_FLESH` to `stone_to_flesh_obj()`.
- `nethack-c/upstream/src/zap.c:1993-2110`: `stone_to_flesh_obj()` material gate, resistance, transform rows, smell, and redraw.
- `nethack-c/upstream/src/zap.c:2079-2083`: wand-class objects become meat sticks through `poly_obj(obj, MEAT_STICK)`.
- `nethack-c/upstream/src/zap.c:1702-1988`: `poly_obj()` preserves fields, deletes replacement contents, performs floor replacement, handles shopkeeper anger, and deletes the old object.
- `nethack-c/upstream/src/shk.c:1187-1260`: `obfree()` preserves live bill rows as used-up when the old object is deleted.

## JS Anchors

- `js/cmd.js:11975`: marble/make-invisible wand predicate shared by carried and floor stone-to-flesh.
- `js/cmd.js:11987`: meat-stick replacement preserving the C-relevant fields currently modeled.
- `js/cmd.js:12073`: floor stone-to-flesh transform for current-square marble wands.
- `js/cmd.js:40232`: downward stone-to-flesh spell-direction hook.
- `test/shop-billing-helpers.test.mjs:3415`: focused downward floor stone-to-flesh shop billing coverage.

## Follow-Up Findings

Broader stone-to-flesh still needs horizontal beam traversal, downward full-pile semantics, `obj_resists(obj, 2, 98)`, boulder to enormous meatball, ring to meat ring, gem/stone to meatball, statue/figurine animation and corpse fallback, bypassed dropped contents, and exact `stolen_value()` ordering for animation cases.

## Ranking

1. Direct ice/cold-ray burial callback or shop-helper extraction.
2. Direct hero-thrown sleeping `potionhit()`.
3. Boulder push shop-boundary transitions and shared `sellobj()`.
4. Remaining stone-to-flesh object rows and beam traversal.
5. Generic `obfree()` and ownership consolidation.
