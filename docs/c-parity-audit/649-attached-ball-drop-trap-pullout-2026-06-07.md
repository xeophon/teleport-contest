# 649 - Attached Ball Drop Trap Pull-Out

## C Source

- `nethack-c/upstream/src/dothrow.c:1823-1839` places the surviving thrown object at `gb.bhitpos`, stacks it, and calls `drop_ball()` when the object is `uball`.
- `nethack-c/upstream/src/ball.c:891-896` only runs pull-out handling when the ball lands away from the hero, and excludes `TT_INFLOOR` and `TT_BURIEDBALL`.
- `nethack-c/upstream/src/ball.c:899-910` prints the pit, web, and lava pull-out messages; the web case destroys the web trap with `deltrap(t_at(u.ux,u.uy))`.
- `nethack-c/upstream/src/ball.c:911-920` handles bear-trap pull-out with `rn2(3)` side selection, `rn1(1000,500)` wounded-leg duration, the severe leg-damage message, and `Maybe_Half_Phys(2)` HP loss when unmounted.
- `nethack-c/upstream/src/ball.c:925-926` resets the hero trap state after included pull-out cases, then calls `fill_pit(u.ux,u.uy)`.
- `nethack-c/upstream/src/trap.c:4008-4017` shows `fill_pit()` only affects a pit or hole when a boulder is present, so ordinary pit traps are not deleted by ball pull-out alone.
- `nethack-c/upstream/src/ball.c:929-952` records the old hero square, moves the hero onto the ball square only for non-levitating pool/pit/hole landings with no monster and no active trap, otherwise moves the hero behind the ball, then moves `uchain` to the hero.

## Port Notes

- Attached ball landing now returns C pull-out messages and appends them to the direct throw command result.
- `drop_ball()`-style pull-out now clears hero trap state for pit, web, lava, and bear-trap cases while preserving the `TT_INFLOOR`/buried-ball exclusions from audit 648.
- Web pull-out deletes the web trap; pit and bear-trap records remain unless a separate C condition removes them.
- Bear-trap pull-out now uses the C `rn2(3)`/`rn1(1000,500)` RNG profile, wounds a leg, and applies fixed half-physical-aware 2 HP damage when unmounted.
- Pool/pit/hole ball landings now pull the hero and chain onto the ball square when the C conditions allow it.

## Tests

- `attached ball throw pulls hero out of web and destroys web`
- `attached ball throw pulls hero out of pit without deleting pit trap`
- `attached ball throw pulls hero out of lava trap state`
- `attached ball throw pulls hero out of bear trap and wounds leg`
- `attached ball throw into pool pulls hero onto ball square`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern="attached ball throw|attached hero-thrown heavy iron ball|floor-stuck attached hero-thrown heavy iron ball" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Mounted bear-trap pull-out should keep the C wounded-leg timer while skipping unmounted HP loss and wording.
- Blind ball/chain glyph ordering and `spoteffects(TRUE)` after hero relocation remain open.
- Pit/hole landing with a monster on the ball square, levitating pool/pit/hole landing, and dedicated hole/trapdoor landing canaries remain open.
- Vertical hard-floor attached-ball throws are covered by audit 650; vertical soft/liquid/down-gate effects and buried-ball conversion remain open.
