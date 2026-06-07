# 648 - Horizontal Throw Attached Ball

## C Source

- `nethack-c/upstream/src/dothrow.c:118` calls `canletgo()` before throwing, while `nethack-c/upstream/src/dothrow.c:257` removes singleton thrown objects from inventory with `freeinv()` after any `remove_worn_item(..., FALSE)` call.
- `nethack-c/upstream/src/steal.c:279` only unpunishes a worn ball/chain when `remove_worn_item()` is called with `unchain_ball`, so throwing the carried ball can remove it from inventory without clearing `uball`.
- `nethack-c/upstream/src/dothrow.c:1562` stores the live object in `gt.thrownobj`, so later landing and `drop_ball()` checks still compare against the same `uball` object.
- `nethack-c/upstream/src/dothrow.c:1613-1633` computes heavy iron ball range with weight divisor `/100`, then caps attached ball range at one when stuck to a monster or at five otherwise.
- `nethack-c/upstream/src/dothrow.c:1668-1672` applies the floor-stuck attached-ball `TT_INFLOOR` override before the final underwater range-one cap.
- `nethack-c/upstream/src/dothrow.c:1680` calls `hurtle()` after `bhit()`, and `nethack-c/upstream/src/dothrow.c:1090-1104` makes the non-carried punished ball tug message preempt ordinary trap-anchor messages.
- `nethack-c/upstream/src/dothrow.c:1823-1839` places the thrown object, skips shop ownership transfer for `uball`, stacks it, and calls `drop_ball()` when the landed object is `uball`.
- `nethack-c/upstream/src/ball.c:891-952` leaves `TT_INFLOOR` and buried-ball traps out of the pull-out reset block, then moves the hero behind the ball on ordinary terrain and moves the chain to the hero's new square.

## Port Notes

- Direct hero `t` throws of the carried attached heavy iron ball now keep the same object identity for `game.u.uball` instead of cloning a separate projectile.
- Attached heavy iron ball range now uses the existing C-style weighted range helper with the attached cap of five, and floor-stuck `TT_INFLOOR` attached-ball throws land adjacent at range one.
- The horizontal landing path now performs the basic C `drop_ball()` relocation for clear-floor attached ball throws: the ball lands at the hit position, the hero moves behind it, and the chain moves to the hero.
- Air/levitation recoil now emits the C tug message when the punished ball is no longer carried, and attached-ball throws use that tug message for ordinary recoil.

## Tests

- `attached hero-thrown heavy iron ball uses C range cap and drags chain behind it`
- `floor-stuck attached hero-thrown heavy iron ball uses C range one`
- Regression context: `levitating hero-thrown loose heavy iron ball uses C ball range divisor`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern="attached hero-thrown heavy iron ball|floor-stuck attached hero-thrown heavy iron ball|loose heavy iron ball|boulder uses C range twenty|heavy ordinary weapon" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Vertical attached-ball throws still need dedicated C parity coverage.
- `drop_ball()` side effects for pits, webs, lava, bear traps, pools, holes, and trap pull-out messages remain open.
- Full buried-ball conversion, blind glyph ordering, and levitation/air recoil canaries for attached-ball landing remain open.
