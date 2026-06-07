# 655 - Attached Ball Fallback Floor Traps

## C Source

- `nethack-c/upstream/src/ball.c:891-958` has `drop_ball()` relocate the hero after an attached-ball throw, then call `spoteffects(TRUE)` if the hero square changed.
- `nethack-c/upstream/src/hack.c:3375-3380` runs pickup before non-pit floor traps inside `spoteffects(TRUE)`, then calls `dotrap()`.
- `nethack-c/upstream/src/trap.c:1061-1087` treats falling rock, squeaky board, rolling boulder, rust, and fire traps as floor triggers that levitation/flying skip.
- `nethack-c/upstream/src/trap.c:1595-1730` handles rust and fire trap effects, and `trap.c:2661` handles rolling-boulder trap launch/no-release behavior.

## Port Notes

- Attached-ball fallback relocation now also triggers rust, fire, and rolling-boulder traps on the relocated hero square behind the ball.
- Rust movement behavior was normalized into `movementRustTrapResult()` so ordinary movement and attached-ball relocation share the current movement-style water-gush behavior.
- Fire traps reuse `heroFireTrapResult(..., { allowLifeSaving: true })`, preserving the existing message-more and fatal/lifesaving result shape for the throw finalizer.
- Rolling-boulder traps reuse `heroRollingBoulderTrapResult()`, including the known no-boulder release message and launch-path side effects when a launch boulder is present.

## Tests

- `attached ball fallback relocation triggers rust trap on new hero square`
- `attached ball fallback relocation triggers fire trap on new hero square`
- `attached ball fallback relocation triggers rolling boulder trap on new hero square`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "attached ball fallback|levitating attached ball landing|attached ball throw into pool|attached ball throw into unseen|attached ball throw onto occupied" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
- Attached-ball fallback relocation still needs canaries for bear, polymorph, dart, and rolling-boulder launch-path details.
- Falling rock, squeaky board, magic trap, anti-magic, teleport, level-teleport, magic portal, and statue-trap relocation effects need separate source-backed slices because their current JS helpers are string-only, async, or carry broader command-flow side effects.
- Full rust trap parity still needs targeted water damage, lit item splashing, gremlin split, and iron-golem rust fallout beyond the current modeled movement branch.
