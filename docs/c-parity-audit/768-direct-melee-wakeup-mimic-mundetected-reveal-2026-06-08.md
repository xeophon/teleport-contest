# 768 - Direct melee wakeup mimic mundetected reveal

## Implemented Slice

Ordinary direct hero melee now models the bounded C `wakeup()` reveal behavior for apparent mimics and force-fought hidden survivors.

This extends audits 755-767 without adding replay, seed, player-name, or fixture-specific branches. The change stays inside ordinary direct movement melee and the existing survivor wakeup tail.

Covered behavior:

- non-force direct movement into an apparent object mimic still stops before a real hit, but now reveals through the same C-shaped cleanup path, clearing mimic appearance, sleep, and eating state without consuming combat RNG;
- force-fight direct melee bypasses the pre-hit apparent-mimic stumble branch, reaches the normal hit, then silently reveals object/furniture mimic appearance during the survivor `wakeup()` tail;
- apparent-monster mimics remain disguised by the wakeup reveal helper, matching C's `M_AP_MONSTER` exception;
- force-fought `mundetected` survivors reveal during the `wakeup()` tail, clear stale remembered invisible markers at the target square, and still finish eating and wait-state cleanup;
- reveal itself consumes no RNG; non-force visible object mimic discovery consumes only the temporary fake-object `next_ident()` needed for C's `that_is_a_mimic()` naming path, not combat hit RNG.

This remains local to direct movement melee. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred queues, swallowed/jousting/artifact melee, full mimic light-blocking, or exact furniture/object discovery wording for every map glyph. Post-reveal sleeping hidden target growl/anger ordering is covered by audit 769.

C anchors:

- Direct survivor hits reach `wakeup(mon, TRUE)` after damage and hit text: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`.
- `attack_checks()` returns early for force-fight before the normal hidden/apparent mimic stumble checks: `nethack-c/upstream/src/uhitm.c:201`, `nethack-c/upstream/src/uhitm.c:254`, `nethack-c/upstream/src/uhitm.c:6282`.
- `wakeup()` snapshots sleep, calls `wake_msg()`, clears sleep, reveals non-monster mimics through `seemimic()`, reveals force-fought `mundetected` monsters through `newsym()`, then finishes eating and runs the attack tail: `nethack-c/upstream/src/mon.c:4333`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4339`, `nethack-c/upstream/src/mon.c:4342`, `nethack-c/upstream/src/mon.c:4344`, `nethack-c/upstream/src/mon.c:4349`.
- `seemimic()` clears `m_ap_type` and `mappearance`, handles blocker appearance cleanup, and redraws the square without a message or RNG: `nethack-c/upstream/src/mon.c:4409`, `nethack-c/upstream/src/mon.c:4415`, `nethack-c/upstream/src/mon.c:4416`, `nethack-c/upstream/src/mon.c:4417`, `nethack-c/upstream/src/mon.c:4424`.
- `that_is_a_mimic()` formats object-glyph discovery text before reveal; `object_from_map()` can create a temporary `mksobj(..., FALSE, FALSE)` fake object, whose `next_ident()` call consumes `rnd(2)` even though no real object remains: `nethack-c/upstream/src/uhitm.c:6213`, `nethack-c/upstream/src/uhitm.c:6228`, `nethack-c/upstream/src/uhitm.c:6233`, `nethack-c/upstream/src/pager.c:284`, `nethack-c/upstream/src/pager.c:313`, `nethack-c/upstream/src/mkobj.c:521`, `nethack-c/upstream/src/mkobj.c:1187`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a force-fought hidden hostile survivor with a remembered `I` marker is hit as `it`, clears `mundetected`, clears the stale map marker, finishes eating, and clears wait state without alignment changes;
- a force-fought awake object mimic bypasses the pre-hit discovery prompt, receives normal hit text, loses object mimic appearance in the survivor wakeup tail, and finishes eating/wait cleanup;
- a non-force object mimic stumble reveals the mimic, clears sleep/eating/appearance state, does not damage the monster, and consumes only the fake-object `rnd(2)` identity RNG used for object-glyph naming.

## Deferred Gaps

- Sleeping hidden force-fight post-reveal visible `growl()`/anger wording is covered by audit 769; this slice covers awake hidden survivor reveal and mimic-discovery cleanup.
- Furniture/light-blocking mimic details are represented by appearance cleanup, but full `is_lightblocker_mappear()`/`unblock_point()` parity remains broader display/vision work.
- Exact `that_is_a_mimic()` wording for every remembered object/furniture/monster glyph remains broader mimic discovery text work.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "direct hero melee (force-fought hidden survivor|force-fought object mimic|object mimic stumble)" test/shop-billing-helpers.test.mjs` - pass
- `bash frozen/score.sh sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing; RNG 105529/105529, Screen 1953/1953
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `npm run score` - 44/44 passing
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
