# Wand Polymorph Vertical Pile

## C Anchors

- `nethack-c/upstream/src/zap.c:3440` routes immediate wands through `zap_updown()` for `<` and `>`.
- `nethack-c/upstream/src/zap.c:3219` implements `zap_updown()`.
- `nethack-c/upstream/src/zap.c:3382` handles downward zaps by calling `bhitpile(obj, bhito, u.ux, u.uy, u.dz)`.
- `nethack-c/upstream/src/zap.c:3391` leaves upward zaps with no pile effect unless the hero is hiding under an object.
- `nethack-c/upstream/src/zap.c:2428` walks the floor pile with `bhitpile()`.
- `nethack-c/upstream/src/zap.c:2191` applies object polymorph through `bhito()`.

## JS Change

- Extracted the existing adjacent floor-pile polymorph body into `polymorphFloorPileAt()`.
- Lateral wand polymorph continues to consume the existing exercise and range rolls, then uses the shared helper for the adjacent pile.
- Downward `z w >` now consumes the exercise roll and polymorphs the pile at the hero square.
- Upward `z w <` now consumes the action and exercise roll but leaves the pile untouched unless a later hiding-under model is added.

## Tests

- `floor polymorph downward hits the hero-square pile`
- `floor polymorph upward without hiding does not hit the hero-square pile`
- Focused command used during development: `node --test --test-name-pattern "floor polymorph|floor wand of polymorph" test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Lateral wand polymorph still needs C `bhit()` range traversal and monster-first ordering.
- Upward hiding-under top-object behavior is deferred until the JS hero hiding-under state is modeled.
- Floor boulders and post-polymorph boulder restacking remain separate pile-fidelity work.
