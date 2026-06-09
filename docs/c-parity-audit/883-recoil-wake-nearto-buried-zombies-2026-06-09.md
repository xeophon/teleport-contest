# Recoil Wake Nearto Buried Zombies

## Source

- `nethack-c/upstream/src/dothrow.c:834` through `:838`: obstacle recoil damage calls `wake_nearto(x, y, 10)` before returning from `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:842` through `:882`: monster recoil collision reaches `wake_nearto(x, y, 10)` after unhide, wakeup, anger, and nonfatal petrification handling.
- `nethack-c/upstream/src/mon.c:4374` through `:4398`: `wake_nearto_core()` wakes live monsters with `dist2 < distance`, then always calls `disturb_buried_zombies(x, y)`.
- `nethack-c/upstream/src/hack.c:1798` through `:1810`: buried-zombie disturbance scans the 3x3 neighborhood around the wake center and restarts positive zombification timers at `max(1, t * 2 / 3)`.

## JS Change

- `js/cmd.js`: shared `wakeNearbyMonstersAt()` now calls the existing `disturbBuriedZombieCorpseTimersAt(x, y)` after the live-monster wake loop, matching C `wake_nearto_core()` ordering.
- The buried-zombie disturbance remains independent of the live wake distance; it always uses the existing 3x3 corpse-timer helper around the wake center.
- Existing JS storage scans both `level.buriedobjlist` and buried floor objects, preserving the local representation already covered by blunt-force and direct-melee buried-zombie canaries.

## Tests

- `levitating hero-thrown ordinary weapon recoil boulder collision disturbs buried zombies`
- `levitating hero-thrown ordinary weapon recoil wakes nearby sleeper from bump square`
- `levitating hero-thrown ordinary weapon recoil cockatrice collision petrifies hero`

Focused verification:

```sh
node --test --test-reporter=dot --test-name-pattern "levitating hero-thrown ordinary weapon recoil (boulder collision disturbs buried zombies|wakes nearby sleeper from bump square|cockatrice collision petrifies hero)" test/shop-billing-helpers.test.mjs
```

## Remaining Follow-Up

- Visible wake messages from generic `wake_nearto()` are still broader display/senses work.
- Object-impact disturbance through C `impact_disturbs_zombies()` is covered by `884-object-impact-disturbs-buried-zombies-2026-06-09.md`.
