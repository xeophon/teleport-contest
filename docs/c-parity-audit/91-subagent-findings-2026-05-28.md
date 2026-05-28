# Audit 91: Forced-Chest Buried Zombie Disturbance

Date: 2026-05-28

## Implemented Slice

This slice completes the remaining `wake_nearby(FALSE)` side effect for blunt `#force`:

- blunt force still wakes nearby sleeping monsters before any success roll;
- after the surface-monster wake pass, nearby buried zombie corpse timers are shortened;
- only live `zombifyTurn` timers are touched, using C's remaining-delay reduction of `max(1, remaining * 2 / 3)`;
- rot and revive timers are left unchanged;
- early give-up paths and blade forcing still do not wake monsters or disturb buried zombie timers.

The JS helper scans `level.buriedobjlist` and also buried corpse entries still present in `level.objects`. C only scans the buried object list, but the extra JS scan covers current local level-generation state where some buried themed-room corpses are represented in `objects`.

## C Anchors

- `nethack-c/upstream/src/lock.c:241`: blunt force calls `wake_nearby(FALSE)` before the force-success roll.
- `nethack-c/upstream/src/mon.c:4398`: `wake_nearto_core()` always calls `disturb_buried_zombies(x, y)` after the nearby monster loop.
- `nethack-c/upstream/src/hack.c:1798`: `disturb_buried_zombies()` scans buried objects around the wake location.
- `nethack-c/upstream/src/hack.c:1803`: only `level.buriedobjlist` objects are considered in C.
- `nethack-c/upstream/src/hack.c:1804`: only corpse objects with active timers are eligible.
- `nethack-c/upstream/src/hack.c:1805`: the affected area is the 3x3 square around the wake point.
- `nethack-c/upstream/src/hack.c:1807`: only live `ZOMBIFY_MON` timers are shortened.
- `nethack-c/upstream/src/hack.c:1808`: `stop_timer()` returns the remaining delay, which is then restarted at two thirds.

## JS Touch Points

- `js/cmd.js:9000`: added `disturbBuriedZombieCorpseTimersAt()` to shorten live buried corpse `zombifyTurn` values from remaining JS time.
- `js/cmd.js:9041`: `wakeNearbyFromForceLock()` now invokes the buried-zombie disturbance after the surface wake loop.
- `test/shop-billing-helpers.test.mjs:785`: added a small zombie corpse fixture helper.
- `test/shop-billing-helpers.test.mjs:10773`: added positive coverage for nearby buried corpse timers, duplicate-list dedupe, far corpses, due timers, rot/revive preservation, unburied floor corpses, and object-list buried corpses.
- `test/shop-billing-helpers.test.mjs:10807`: added early-give-up ordering checks so missing weapons and no-hands forms do not disturb timers.
- `test/shop-billing-helpers.test.mjs:10853`: blade forcing remains a negative path for both monster wake and buried timer disturbance.
- `test/shop-billing-helpers.test.mjs:10878`: the 50-turn give-up path keeps the buried timer unchanged.

## Deferred Gaps

- JS themed-room buried zombies still need generation-time parity: C's Lua helper buries corpses, stops ordinary rot, and starts `ZOMBIFY_MON` roughly 990-1010 turns later; local JS currently creates buried corpse objects without starting that timer.
- Full mimic/disguise naming and wake display remains broader than this slice. `wake_nearby(FALSE)` does not reveal mimics by itself, so any remaining mimic work should be source-anchored separately.
- Ice-box corpse timer details remain a separate timeout/container slice.

## Additional Subagent Follow-Ups

- Stone-to-flesh boulders: C `poly_obj()` applies Sokoban guilt for boulder transforms after resistance fails (`nethack-c/upstream/src/zap.c:1710`; `nethack-c/upstream/src/zap.c:2014`). JS has `applySokobanGuilt()` but stone-to-flesh boulder conversion does not call it yet.
- Projectile shipping: ordinary non-gold hero projectiles still need the post-floor-effect, pre-placement `ship_object()` gate for seen holes/trapdoors, including `rn2(3)` non-ladder drop chance, shop debt before migration, and fragile breakage before queueing (`nethack-c/upstream/src/dokick.c:1639`; `nethack-c/upstream/src/dokick.c:1684`).
- Monster diet metadata: C uses `M1_CARNIVORE`, `M1_HERBIVORE`, `M1_OMNIVORE`, and `M1_METALLIVORE` flags (`nethack-c/upstream/include/monflag.h:114`). JS still has ad hoc diet checks in pet food, polyself stone-to-flesh smell/tripe handling, and metallivore tin consumption.

## Verification

Checks run after code changes:

```bash
node --check js/cmd.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=spec --test-name-pattern 'blunt force|blade force|force occupation give-up' test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
npm run score
```

Result: focused force-lock tests pass, `9` run and `746` skipped under the name filter; full helper suite passes `755/755`; public score remains `44/44`.
