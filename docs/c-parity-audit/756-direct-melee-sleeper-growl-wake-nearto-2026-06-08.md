# 756 - Direct melee sleeper growl wake-nearto

## Implemented Slice

Ordinary unpolymorphed direct hero melee survivor hits now carry the C `growl()` wake-nearby side effect for sleeping targets. When the struck sleeper produces a non-silent, non-helpless growl, JS now wakes nearby monsters before the peaceful anger tail, matching the C `wakeup(mon, TRUE)` ordering.

This extends audit 755 without changing replay maps or seed-specific behavior. The new helper is local to the direct-melee sleeper tail, so bullwhip apply force-attacks, wielded potion bash, wielded egg bash, and generic monster sound paths stay outside this slice.

Covered behavior:

- the source sleeper's visible wake message still precedes the source growl;
- non-silent, non-helpless source growls call a direct-melee `wake_nearto()` equivalent with `mlevel * 18`;
- nearby visible sleepers emit `The <monster> wakes up.` after the source growl and before anger;
- nearby non-unique sleepers clear sleep and wait strategy;
- nearby unique sleepers clear sleep but preserve wait strategy;
- silent source monsters still wake and anger through `setmangry()` but do not growl or wake nearby sleepers;
- hostile source sleepers wake, growl, wake nearby sleepers, and do not receive peaceful anger or alignment penalties.

C anchors:

- `known_hitum()` routes ordinary direct melee into `hmon()`: `nethack-c/upstream/src/uhitm.c:622`.
- Damage and visible hit text run before survivor wakeup: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1926`.
- `wakeup()` snapshots `was_sleeping`, calls `wake_msg()`, clears `msleeping`, then calls `growl()` before `setmangry(TRUE)`: `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4353`, `nethack-c/upstream/src/mon.c:4354`, `nethack-c/upstream/src/mon.c:4355`.
- `wake_msg()` prints only for visible sleeping monsters: `nethack-c/upstream/src/mon.c:4322`, `nethack-c/upstream/src/mon.c:4324`.
- `growl()` returns for helpless or silent monsters, otherwise prints a growl message when visible or audible and then calls `wake_nearto(mtmp->mx, mtmp->my, mtmp->data->mlevel * 18)`: `nethack-c/upstream/src/sounds.c:402`, `nethack-c/upstream/src/sounds.c:406`, `nethack-c/upstream/src/sounds.c:415`, `nethack-c/upstream/src/sounds.c:416`, `nethack-c/upstream/src/sounds.c:421`.
- `wake_nearto_core()` visits live monsters with `dist2 < distance` or global `distance == 0`, calls `wake_msg()` before clearing sleep, and clears wait strategy for non-unique monsters: `nethack-c/upstream/src/mon.c:4374`, `nethack-c/upstream/src/mon.c:4378`, `nethack-c/upstream/src/mon.c:4381`, `nethack-c/upstream/src/mon.c:4384`, `nethack-c/upstream/src/mon.c:4385`, `nethack-c/upstream/src/mon.c:4386`, `nethack-c/upstream/src/mon.c:4387`, `nethack-c/upstream/src/mon.c:4402`.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a sleeping peaceful source growl wakes a nearby ordinary sleeper and a nearby unique sleeper before anger, while a farther sleeper remains asleep;
- the ordinary nearby sleeper clears wait strategy, but the unique sleeper preserves it;
- a silent sleeping source does not wake nearby sleepers;
- a hostile sleeping source wakes nearby sleepers without anger text or alignment penalties.

The focused command also keeps the awake survivor, tame survivor, bullwhip apply, wielded potion bash, and wielded egg bash canaries in the same run.

## Deferred Gaps

- Unseen-but-audible source growl naming remains deferred; this slice only preserves visible source growl text while still running wake-nearby.
- Hallucinated growl verb RNG/table, `iflags.last_msg = PLNMSG_GROWL`, and run interruption via `nomul(0)` remain deferred.
- `disturb_buried_zombies()` from this direct-melee growl path is covered by audit 757; other `wake_nearto()` callers remain separate.
- Full `wakeup()` mimic/object/furniture reveal and force-fight `mundetected` behavior remains deferred.
- Full `setmangry()` Elbereth hypocrisy and `peacefuls_respond()` behavior remains deferred.
- Two-weapon deferred sleeping-hit queues, knockback movement, special apply paths, and potion/egg bash paths remain separate follow-ups.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee sleeping|direct hero melee surviving peaceful non-priest wakes angry|direct hero melee surviving tame target preserves peacefulness|wielded bullwhip reveals hidden armed monster without disarming it|wielded blessed water potion bash vapor rehumanizes lycanthrope after monster hit|wielded confusion potion bash routes through potionhit|wielded ordinary egg hits visible monster" test/shop-billing-helpers.test.mjs` - 9 pass, 2701 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs` - 2872 pass
- `npm run score` - 44/44 passing
