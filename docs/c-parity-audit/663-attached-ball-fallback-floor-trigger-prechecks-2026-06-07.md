# 663 - Attached Ball Fallback Floor Trigger Prechecks

## C Source

- `nethack-c/upstream/src/ball.c:891-958` relocates the hero after an attached-ball throw, moves the chain to the relocated hero square, then calls `spoteffects(TRUE)` if the hero square changed.
- `nethack-c/upstream/src/hack.c:3375-3395` runs ordinary spot effects after relocation, including `dotrap()` for traps on the new hero square.
- `nethack-c/upstream/src/trap.c:1061-1087` classifies arrow, dart, rust, fire, and rolling-boulder traps as floor triggers.
- `nethack-c/upstream/src/trap.c:1079-1087` treats hero levitation and flying as in-air state for floor-trigger checks.
- `nethack-c/upstream/src/trap.c:3026-3032` skips floor-trigger traps while in air, saying the over-trap message only for already-seen traps.
- `nethack-c/upstream/src/trap.c:3035-3039` applies the ordinary known-trap `rn2(5)` escape prelude before trap-specific effects.
- `nethack-c/upstream/src/trap.c:1262-1288`, `trap.c:1490-1520`, `trap.c:2468-2491`, and `trap.c:2667-2672` provide the dart, bear, polymorph, and rolling-boulder details covered by the new canaries.

## Port Notes

- Added a shared movement floor-trigger precheck for JS movement-style trap entry points.
- Attached-ball fallback relocation now routes arrow, dart, rust, fire, and rolling-boulder traps through that precheck before running existing trap-specific helpers.
- Ordinary movement fire and rolling-boulder handling, plus deferred object-list arrow and dart handling, now use the same precheck path.
- The trap-specific helpers remain unchanged; this slice only restores C's pre-effect in-air and known-trap escape ordering.
- Added attached-ball fallback canaries for hidden in-air floor-trigger skips, hidden bear-trap wound/trap state, known spent dart soft-click deletion after the escape prelude, antimagic polymorph trap persistence, and rolling-boulder launch through the relocated hero square.

## Tests

- `flying attached ball fallback over hidden arrow trap skips floor trigger`
- `flying attached ball fallback over hidden dart trap skips floor trigger`
- `flying attached ball fallback over hidden rust trap skips floor trigger`
- `flying attached ball fallback over hidden fire trap skips floor trigger`
- `flying attached ball fallback over hidden rolling boulder trap skips floor trigger`
- `attached ball fallback hidden bear trap wounds and traps hero`
- `attached ball fallback known spent dart trap can vanish before missile RNG`
- `attached ball fallback polymorph antimagic leaves trap after relocation`
- `attached ball fallback rolling boulder launches across relocated hero`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "attached ball fallback|flying attached ball fallback" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
- Full rust trap parity still needs targeted water damage, lit item splashing, gremlin split, and iron-golem rust fallout beyond the current modeled movement branch.
- Landmine in-air behavior has a separate JS air-current path and should stay in its own source-backed audit instead of being folded into this floor-trigger precheck slice.
