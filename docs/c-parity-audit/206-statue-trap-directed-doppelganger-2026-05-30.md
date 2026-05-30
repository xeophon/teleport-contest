# C Parity Audit 206: Statue-Trap Directed Doppelganger

## Sources

- `nethack-c/upstream/src/trap.c:725-880`: `animate_statue()` is the shared animation path for normal statue traps, shatter-triggered statue traps, and stone-to-flesh spell hits.
- `nethack-c/upstream/src/trap.c:746-785`: animation runs `cant_revive()` before golem conversion or saved-trait restoration. Unique statues without saved traits create a doppelganger with `MM_NOCOUNTBIRTH | MM_ADJACENTOK`, then `newcham()` retargets it to the original monster form.
- `nethack-c/upstream/src/trap.c:907-935`: `activate_statue_trap()` deletes the trap first, then calls `animate_statue(..., ANIMATE_NORMAL/ANIMATE_SHATTER, ...)`.
- `nethack-c/upstream/src/read.c:3112-3132`: `cant_revive()` maps guards, high clerics, aligned clerics, and angels to human zombies; long worm tails to long worms; and unique no-trait corpstats to doppelgangers.

## JS Changes

- Shared the recent statue `cant_revive()` resolver between floor stone-to-flesh and statue-trap activation.
- Moved floor stone-to-flesh saved-trait deferral after `cant_revive()` so cant-revive substitutions take precedence, matching C ordering.
- Updated `activateStatueTrap()` to create directed doppelgangers for unique no-traits statues, apply the original form, christen named non-unique statues, clear sleep/hidden state, and preserve trap-specific hostile alignment.
- Normal trap search text now omits indefinite articles for visible unique monsters, matching C-style unique naming.
- Added trap historic-statue side-effect reporting through the same helper used by stone-to-flesh animation.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Normal statue-trap activation on a unique Medusa statue removes the statue and trap, creates a monster displayed as Medusa, preserves `chamBase: 'doppelganger'`, clears sleep/hidden state, makes it hostile, and reports `You find Medusa posing as a statue.`

## Remaining Gaps

- Saved `omonst`/`montraits()` restoration is still not implemented; non-cant-revive saved-trait statues still do not restore full petrified monster state.
- Statue-trap activation still only handles the first visible statue object at the square instead of C's loop over same-square statues when unique animation fails.
- Protection-from-shape-changers and exact doppelganger generation RNG remain tied to the broader shapechanger lifecycle gap.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "statue trap animates unique no-traits statue as directed doppelganger" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1071/1071`)
- `node --test test/*.mjs` (`1168/1168`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
