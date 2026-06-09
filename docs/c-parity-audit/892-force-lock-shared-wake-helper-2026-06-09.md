# 892 - Force-lock blunt wake uses shared wake_nearby helper

## C source

- `nethack-c/upstream/src/lock.c:228` through `:242` handles ongoing force-lock occupation ticks. Blade forcing only rolls weapon breakage, while blunt forcing calls `wake_nearby(FALSE)` due to hammering on the container.
- `nethack-c/upstream/src/mon.c:4367` routes `wake_nearby(FALSE)` to `wake_nearto_core(u.ux, u.uy, u.ulevel * 20, FALSE)`.
- `nethack-c/upstream/src/mon.c:4378` through `:4387` emits visible wake messages before clearing `msleeping` and non-unique wait strategy.
- `nethack-c/upstream/src/mon.c:4398` disturbs buried zombies after the live-monster loop.

## Port

- `js/cmd.js` now routes `wakeNearbyFromForceLock()` through the shared `wakeNearbyMonstersAt()` helper instead of carrying a duplicate wake loop.
- The shared helper now also clears the JS `waiting` mirror when it clears non-unique wait strategy, preserving the previous force-lock behavior while making the generic helper match local wait-state conventions.
- Force-lock remains hero-centered with distance `ulevel * 20`, matching C `wake_nearby(FALSE)`.

## Tests

- Existing force-lock tests cover the refactor:
  - `blunt force wakes nearby sleepers without anger or paralysis cleanup`
  - `blunt force wakes visible apparent mimics without revealing disguise`
  - `blunt force disturbs nearby buried zombie corpse timers`
  - `blade force does not wake nearby sleepers on an unbroken tick`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "blunt force wakes nearby sleepers without anger or paralysis cleanup|blunt force wakes visible apparent mimics without revealing disguise|blunt force disturbs nearby buried zombie corpse timers|blade force does not wake nearby sleepers on an unbroken tick" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining nearby gaps

- `wake_nearby(TRUE)` pet-call side effects remain unmodeled in the shared helper. Force-lock uses C's `FALSE` path, so this slice intentionally leaves pet-call behavior unchanged.
- The shared helper still uses the existing direct-melee visible predicate for wake text rather than a full C `canseemon()` equivalent.
