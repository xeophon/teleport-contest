# Hero Rolling Boulder Shifted Vampire Revival

## C anchors

- `nethack-c/upstream/src/trap.c:3395` through `:3412`: hero-triggered rolling boulder monster collisions call `ohitmon(mtmp, singleobj, -1, FALSE)` and stop the launch if `ohitmon()` reports the object is used up.
- `nethack-c/upstream/src/mthrowu.c:451` through `:464`: lethal `ohitmon()` hits print `destroyed` for `is_vampshifter(mtmp)` and route hero-triggered unknown rolling boulders through `mondied()` instead of `xkilled()`.
- `nethack-c/upstream/src/mon.c:2886` through `:2946`: `vamprises()` revives shifted vampires as their base vampire form, keeps them alive, resets movement blockers, and emits the "seemingly dead" transformation message when spotted.
- `nethack-c/upstream/src/mon.c:3091` through `:3098`: `mondead()` gives `vamprises()` the chance to return before ordinary death cleanup.
- `nethack-c/upstream/src/mthrowu.c:494` through `:499`: after a surviving hit, `drop_throw()` runs; for `range == -1`, a gone boulder stops the launch.
- `nethack-c/upstream/src/do.c:49` through `:152`: boulder liquid floor effects can consume the boulder and report it as gone.

## JS parity

- `js/cmd.js` now revives shifted vampires killed by hero-triggered rolling boulders before inventory drop, monster removal, corpse creation, or vanquish accounting.
- The local rolling-boulder helper mirrors the existing projectile and potion shifted-vampire revival state reset: base vampire data, HP floor of 10, movement thawing, cleared shift metadata, redraw, and no inventory drop.
- Because the revived monster remains alive, the existing rolling-boulder post-hit path can still run `drop_throw()`-style floor effects. A boulder that sinks in the impact square stops before downstream boulder chaining.

## Replay-free coverage

- `hero rolling boulder revives shifted vampire lethal target before cleanup`

## Remaining candidates

- Broaden the repeated JS shifted-vampire revival helpers into a shared monster-death lifecycle only after more C death paths are covered.
- Door smash/explosion side effects from a vampire rising in a doorway remain outside this slice.
- Broader `canspotmon()` infravision parity should be covered in a central sensing helper; rolling-boulder hit text is separately gated by impact-square `cansee()`.
