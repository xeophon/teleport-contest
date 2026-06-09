# 889 - Generic wake_nearto visible messages

## C source

- `nethack-c/upstream/src/mon.c:4322` through `:4328` defines `wake_msg()`: a sleeping monster that the hero can see prints `The <monster> wakes up.` for non-attack wakes, with the flesh golem ` It's alive!` suffix.
- `nethack-c/upstream/src/mon.c:4374` through `:4398` defines `wake_nearto_core()`: live monsters with `distance == 0` or `dist2 < distance` call `wake_msg(mtmp, FALSE)` before `msleeping` is cleared, then non-unique monsters lose `STRAT_WAITMASK`, and buried zombies are disturbed after the live-monster loop.
- Covered noisy callers in this slice are recoil obstacle and monster collisions (`nethack-c/upstream/src/dothrow.c:834` through `:837`, `:881`), kick-ouch (`nethack-c/upstream/src/dokick.c:886` through `:898`), explosions (`nethack-c/upstream/src/explode.c:689` through `:695`), landmine blasts (`nethack-c/upstream/src/trap.c:3179` through `:3183`), and drawbridge destruction (`nethack-c/upstream/src/dbridge.c:934` through `:940`).

## Port

- `js/cmd.js` now lets the shared `wakeNearbyMonstersAt()` helper accept an optional message sink.
- When a message sink is supplied, visible sleeping monsters emit the existing C-shaped `directMeleeWakeMessage(..., false)` line before JS clears `msleeping`, preserving the C wake-message-before-state-clear order.
- The helper still clears wait strategy for non-unique monsters and disturbs buried zombie timers after the live-monster loop.
- Recoil obstacle/monster collisions, kick-ouch, burning-oil explosions, landmine blasts, and landmine drawbridge destruction now pass their local message arrays into the shared wake helper.

## Tests

- `command kicked object ouch wakes nearby sleepers` now covers the generic non-attack wake message after `Ouch!  That hurts!`.
- `levitating hero-thrown ordinary weapon recoil bumps boulder with C damage and wake` now covers the generic non-attack wake message after obstacle recoil damage.
- `levitating hero-thrown ordinary weapon recoil wakes nearby sleeper from bump square` keeps the recoil monster-collision order covered with a hostile bumped target so the nearby wake can only come from the final generic helper.
- `hero-thrown lit oil explosion wakes visible sleeper outside blast damage` covers the `wakeNearbyMonstersFromExplosion()` message sink after burning-oil monster damage.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "recoil bumps boulder with C damage and wake|recoil wakes nearby sleeper from bump square|command kicked object ouch wakes nearby sleepers|hero-thrown lit oil explosion wakes visible sleeper outside blast damage" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining nearby gaps

- Broad `wake_nearto()` callers that do not route through `wakeNearbyMonstersAt()` still need their own display and state parity slices.
- The current JS visible-monster predicate follows the existing `couldsee()`/invisible-monster gates used by direct-melee wake messages; if broader infravision-style `canseemon()` support is added, generic wake messages should switch to that shared predicate.
- This slice does not model `wake_nearby(petcall)` pet tracking fallout; all covered callers use C's `wake_nearto(..., FALSE)` path.
