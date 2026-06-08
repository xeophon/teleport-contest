# 770 - Direct melee two-weapon sleeper wakeup offhand order

## Implemented Slice

Ordinary direct hero melee with active two-weapon combat now follows the C ordering for sleeping survivors: the first attack resolves through hit text and `wakeup(mon, TRUE)`, then the offhand attack is attempted against the target's current state.

This extends audits 754-769 without adding replay, seed, player-name, or fixture-specific branches. The change remains inside ordinary direct movement melee and uses the existing survivor wakeup/growl/anger tail.

Covered behavior:

- two-weapon direct melee attempts the offhand attack even when the target started asleep;
- a primary hit wakes the target, runs sleeper growl, wakes nearby sleepers, and applies peaceful anger before any offhand hit text;
- a primary miss leaves the target asleep, so the offhand can still hit, wake, growl, and anger the target;
- offhand to-hit recalculates target state after the first attack, so a target awakened by the primary hit no longer contributes the sleeping hit bonus to the offhand roll;
- ordinary two-weapon melee does not spend the single-weapon knockback placeholder RNG, matching C's `maybe_knockback` guard while `u.twoweap` is active;
- active two-weapon combat is detected from an actually wielded left-hand item, not a stale alternate weapon marker;
- the old JS deferred sleeper queue is no longer used for active two-weapon direct movement melee, so target anger and nearby wake side effects happen before the offhand through the same source-shaped wakeup tail as one-weapon direct melee.

C anchors:

- `hitum()` sets `gt.twohits = 1` for active `u.twoweap`, runs the first `known_hitum()`, then conditionally switches to `uswapwep` for the second `known_hitum()`: `nethack-c/upstream/src/uhitm.c:773`, `nethack-c/upstream/src/uhitm.c:776`, `nethack-c/upstream/src/uhitm.c:791`, `nethack-c/upstream/src/uhitm.c:800`, `nethack-c/upstream/src/uhitm.c:807`.
- The first survivor hit applies damage and visible hit text before `wakeup(mon, TRUE)`: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1927`.
- `maybe_knockback` is disabled while two-weapon combat is active, so ordinary two-weapon melee skips the single-weapon post-wakeup knockback branch: `nethack-c/upstream/src/uhitm.c:1829`, `nethack-c/upstream/src/uhitm.c:1831`.
- `wakeup()` emits visible wake text, clears sleep, handles reveal/eating cleanup, runs sleeper growl, then `setmangry(TRUE)`: `nethack-c/upstream/src/mon.c:4333`, `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4353`, `nethack-c/upstream/src/mon.c:4355`.
- The second attack's roll is made after that first wakeup tail, so `find_roll_to_hit()` only includes the sleeping bonus if the monster is still sleeping: `nethack-c/upstream/src/uhitm.c:386`, `nethack-c/upstream/src/uhitm.c:392`, `nethack-c/upstream/src/uhitm.c:804`.
- `growl()` wakes nearby sleepers through `wake_nearto()`, which emits nearby wake text before clearing sleep and clears wait strategy for non-unique monsters: `nethack-c/upstream/src/sounds.c:402`, `nethack-c/upstream/src/sounds.c:421`, `nethack-c/upstream/src/mon.c:4374`, `nethack-c/upstream/src/mon.c:4384`, `nethack-c/upstream/src/mon.c:4387`, `nethack-c/upstream/src/mon.c:4402`.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a two-weapon primary hit on a sleeping peaceful humanoid prints first hit text, wake text, source growl, nearby sleeper wake text, target anger, then offhand hit text, with no queued follow-up wake message and no two-weapon knockback placeholder `rn2(6)`;
- a two-weapon primary miss still allows the offhand to hit and wake the sleeping target, with two attack rolls, one damage roll, sleep/eating/wait cleanup, and ordinary peaceful-hit alignment penalty.

The focused sleeping direct-melee run keeps the one-weapon wake/growl/nearby-wake canaries green.

Existing one-weapon and force-fought hidden sleeper canaries now assert the C pager boundary explicitly: the hit/wake text appears first, then the queued continuation runs the growl, nearby wake, and anger tail after `--More--`.

## Deferred Gaps

- Non-sleeping two-weapon damage, skill, artifact, and lethal edge-case parity remains broader combat work.
- Full second-weapon object effects beyond the ordinary modeled weapon-hit path remain deferred.
- Knockback movement, trap collision, stun, and wording remain represented only by existing single-weapon placeholders where already audited.
- Bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectiles, swallowed/jousting/artifact melee, and monster-moving `setmangry()` callers remain separate.
- Hallucinated growl sound RNG/table, full blind/deaf sensing wording, and broader peaceful-neighbor fallout outside the bounded direct-melee target path remain separate.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "direct hero melee two-weapon" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "direct hero melee sleeping|direct hero melee two-weapon" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score -- sessions/seed4500-knight-coverage.session.json` - pass, 1/1
- `npm run score` - pass, 44/44
- `git diff --check` - pass
