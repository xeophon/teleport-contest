# 757 - Direct melee sleeper growl disturb buried zombies

## Implemented Slice

Ordinary unpolymorphed direct hero melee survivor hits now carry the buried-zombie disturbance tail of C `wake_nearto_core()` when a sleeping target's non-silent growl wakes nearby monsters. The same direct-melee growl helper from audit 756 now shortens adjacent buried corpse zombification timers after the live-monster wake loop and before peaceful anger.

This remains local to the direct-melee sleeping survivor growl path. It does not change replay maps, seed-specific behavior, bullwhip apply force-attacks, wielded potion bash, wielded egg bash, or other `wake_nearto()` callers.

Covered behavior:

- non-silent, non-helpless direct-melee sleeper growls run buried-zombie disturbance from the awakened monster's square;
- adjacent buried corpses with future zombification timers shorten remaining time to two thirds, minimum one turn;
- buried corpses outside the 3x3 disturbance square remain unchanged;
- unburied corpses and due zombification timers remain unchanged;
- JS floor-buried corpse representation uses the same helper as existing blunt-force wake-nearby coverage;
- silent source monsters still wake and anger without growl, nearby-sleeper wakeup, or buried-zombie disturbance.

C anchors:

- Ordinary direct melee reaches `hmon()` through `hitum()`/`known_hitum()`: `nethack-c/upstream/src/uhitm.c:565`, `nethack-c/upstream/src/uhitm.c:568`, `nethack-c/upstream/src/uhitm.c:619`, `nethack-c/upstream/src/uhitm.c:622`.
- Surviving direct melee calls `wakeup(mon, TRUE)` before knockback: `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1926`, `nethack-c/upstream/src/uhitm.c:1927`.
- `wakeup()` snapshots sleep, prints the wake message, clears `msleeping`, and calls `growl()` for formerly sleeping attack targets before `setmangry()`: `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4350`, `nethack-c/upstream/src/mon.c:4353`, `nethack-c/upstream/src/mon.c:4354`, `nethack-c/upstream/src/mon.c:4355`.
- `growl()` returns early for helpless or silent monsters, otherwise calls `wake_nearto(mtmp->mx, mtmp->my, mtmp->data->mlevel * 18)`: `nethack-c/upstream/src/sounds.c:406`, `nethack-c/upstream/src/sounds.c:407`, `nethack-c/upstream/src/sounds.c:421`.
- `wake_nearto()` calls `wake_nearto_core(..., FALSE)`, so the wake center is the source monster's current square and petcall behavior is disabled: `nethack-c/upstream/src/mon.c:4402`, `nethack-c/upstream/src/mon.c:4404`.
- `wake_nearto_core()` wakes live monsters with `dist2 < distance`, calls `wake_msg()` before clearing sleep, clears non-unique wait strategy, then always calls `disturb_buried_zombies(x, y)`: `nethack-c/upstream/src/mon.c:4378`, `nethack-c/upstream/src/mon.c:4381`, `nethack-c/upstream/src/mon.c:4384`, `nethack-c/upstream/src/mon.c:4385`, `nethack-c/upstream/src/mon.c:4386`, `nethack-c/upstream/src/mon.c:4387`, `nethack-c/upstream/src/mon.c:4398`.
- `disturb_buried_zombies()` scans buried corpse objects within `x +/- 1`, `y +/- 1` and restarts positive `ZOMBIFY_MON` timers at `max(1, t * 2 / 3)`: `nethack-c/upstream/src/hack.c:1798`, `nethack-c/upstream/src/hack.c:1803`, `nethack-c/upstream/src/hack.c:1804`, `nethack-c/upstream/src/hack.c:1805`, `nethack-c/upstream/src/hack.c:1806`, `nethack-c/upstream/src/hack.c:1807`, `nethack-c/upstream/src/hack.c:1808`, `nethack-c/upstream/src/hack.c:1809`, `nethack-c/upstream/src/hack.c:1810`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- non-silent sleeping source growl shortens an adjacent buried-list corpse timer from 190 to 160 at move 100;
- a JS floor-buried corpse representation adjacent to the source shortens from 160 to 140;
- a farther buried corpse, an unburied corpse, and an already-due zombification timer remain unchanged;
- silent sleeping source monsters do not disturb an adjacent buried zombie timer.

The focused command still keeps the direct-melee sleeping/awake/tame canaries plus bullwhip, potion bash, and egg bash canaries.

## Deferred Gaps

- Other `wake_nearto()` callers still need separate `disturb_buried_zombies()` coverage where their local JS helpers do not already call it.
- Object drop/throw impact disturbance via C `maybe_disturb_buried_zombies()` remains separate.
- Exact timer API parity beyond the modeled `zombifyTurn` shortening remains deferred.
- Unseen/audible growl naming, hallucinated growl table, `iflags.last_msg`, and run interruption remain deferred.
- Full `wakeup()` mimic/reveal and broader `setmangry()` peaceful-neighbor fallout remain deferred.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee sleeping|direct hero melee surviving peaceful non-priest wakes angry|direct hero melee surviving tame target preserves peacefulness|wielded bullwhip reveals hidden armed monster without disarming it|wielded blessed water potion bash vapor rehumanizes lycanthrope after monster hit|wielded confusion potion bash routes through potionhit|wielded ordinary egg hits visible monster" test/shop-billing-helpers.test.mjs` - 9 pass, 2701 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test test/*.mjs` - 2872 pass
- `npm run score` - 44/44 passing
