# 654 - Attached Ball Fallback Trap Effects

## C Source

- `nethack-c/upstream/src/ball.c:891-958` has `drop_ball()` relocate the hero after an attached-ball throw, then call `spoteffects(TRUE)` when the hero square changed.
- `nethack-c/upstream/src/ball.c:931-939` moves the hero onto the ball square only for non-levitating clear pool, pit, hole, or trapdoor landings; otherwise the hero moves behind the ball.
- `nethack-c/upstream/src/hack.c:3376-3399` runs ordinary trap handling during `spoteffects(TRUE)` after relocation, with pit handling ordered before pickup and other traps after pickup.
- `nethack-c/upstream/src/trap.c:2942` dispatches ordinary trap effects through `trapeffect_selector()`.

## Port Notes

- Attached-ball fallback relocation now reuses existing movement trap result helpers for sleep gas, web, bear trap, land mine, polymorph, arrow, and dart traps on the relocated hero square behind the ball.
- Arrow and dart fallback floor-trigger in-air skips, known-trap escape ordering, and spent-dart deletion canaries were later tightened in `663-attached-ball-fallback-floor-trigger-prechecks-2026-06-07.md`.
- Fatal and lifesaving-capable trap results are returned to the throw finalizer, preserving the existing post-message command-mode handling.
- Levitating pool, pit, and hole landings now have canaries proving the hero stays behind the ball and does not trigger ball-square terrain or trap effects.

## Tests

- `attached ball fallback relocation triggers web on new hero square`
- `attached ball fallback relocation triggers sleep gas on new hero square`
- `attached ball fallback relocation triggers land mine on new hero square`
- `attached ball fallback relocation triggers arrow trap on new hero square`
- `attached ball fallback known spent dart trap can vanish before missile RNG`
- `attached ball fallback hidden bear trap wounds and traps hero`
- `attached ball fallback polymorph antimagic leaves trap after relocation`
- `levitating attached ball landing on pool leaves hero behind without ball-square effects`
- `levitating attached ball landing on pit leaves hero behind without ball-square effects`
- `levitating attached ball landing on hole leaves hero behind without ball-square effects`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "attached ball fallback|levitating attached ball landing|attached ball throw into pool|attached ball throw into unseen|attached ball throw onto occupied" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
- Bear, polymorph, dart, and floor-trigger in-air canaries are covered by audit 663.
- Rust, fire, and rolling-boulder fallback traps were added in `655-attached-ball-fallback-floor-traps-2026-06-07.md`; broader extraction of every ordinary `spoteffects(TRUE)` trap class remains open.
