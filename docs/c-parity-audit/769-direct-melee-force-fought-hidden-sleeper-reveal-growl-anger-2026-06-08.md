# 769 - Direct melee force-fought hidden sleeper reveal growl anger

## Implemented Slice

Ordinary direct hero melee now models the bounded C `wakeup()` ordering for force-fought sleeping `mundetected` survivors.

This extends audits 755-768 without adding replay, seed, player-name, or fixture-specific branches. The change remains inside ordinary direct movement melee and the existing survivor wakeup tail.

Covered behavior:

- force-fought direct melee bypasses the pre-hit hidden-monster stop branch and emits hit text while the target is still hidden, so the target is named as `it`;
- `wake_msg()` visibility remains pre-reveal, so a sleeping `mundetected` target does not gain a visible `wakes up!` line merely because forcefight reveals it later in `wakeup()`;
- force-fight `mundetected` reveal happens before the sleeping-target `growl()` tail, so revealed visible or audible survivors can growl and wake nearby sleepers;
- peaceful revealed sleepers run target anger after the post-reveal growl, including visible humanoid `gets angry!` wording and alignment penalty;
- reveal, wake-message suppression, ordinary growl, and target anger add no new RNG in the non-hallucinating, no-Elbereth, no-bystander fixtures.

This remains local to ordinary direct movement melee. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon paths beyond the ordinary sleeping direct-melee ordering covered by audit 770, swallowed/jousting/artifact melee, hallucinated growl tables, full blind/deaf sensing wording, or broader monster-moving `setmangry()` callers.

C anchors:

- `attack_checks()` returns `FALSE` immediately under `forcefight`, bypassing the ordinary hidden-monster stop/reveal branches: `nethack-c/upstream/src/uhitm.c:201`, `nethack-c/upstream/src/uhitm.c:521`.
- Hit text is emitted before the survivor `wakeup()` tail, and hidden `mundetected` targets are named as `it`: `nethack-c/upstream/src/uhitm.c:1648`, `nethack-c/upstream/src/uhitm.c:1651`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/do_name.c:863`, `nethack-c/upstream/src/do_name.c:880`, `nethack-c/upstream/src/do_name.c:1041`, `nethack-c/upstream/include/display.h:92`.
- `wakeup()` calls `wake_msg()` before clearing sleep and before revealing force-fought `mundetected`, so the wake message still uses pre-reveal visibility: `nethack-c/upstream/src/mon.c:4322`, `nethack-c/upstream/src/mon.c:4324`, `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4344`.
- After reveal, `wakeup()` calls `growl()` for targets that were sleeping, then `setmangry(TRUE)`: `nethack-c/upstream/src/mon.c:4350`, `nethack-c/upstream/src/mon.c:4354`, `nethack-c/upstream/src/mon.c:4355`.
- `growl()` prints if the revealed target can be seen or heard, then wakes nearby monsters; `setmangry()` prints humanoid anger if the target square can be seen: `nethack-c/upstream/src/sounds.c:402`, `nethack-c/upstream/src/sounds.c:415`, `nethack-c/upstream/src/sounds.c:421`, `nethack-c/upstream/src/mon.c:4296`, `nethack-c/upstream/src/mon.c:4304`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a force-fought hidden hostile sleeper is hit as `it`, does not print `wakes up!`, reveals before growling, wakes a nearby visible sleeper from that growl, clears `mundetected`/remembered `I`/wait/eating state, and avoids peaceful alignment changes;
- an actual `F` prefix force-fight against a hidden peaceful sleeping humanoid is hit as `it`, suppresses the pre-reveal wake line, reveals before growl, then emits target anger and applies the ordinary peaceful-hit alignment penalty.

## Deferred Gaps

- Bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectiles, swallowed/jousting/artifact melee, and other special helpers remain separate; ordinary two-weapon sleeping direct-melee wake/offhand ordering is covered by audit 770.
- Hallucinated growl sound RNG/table, run interruption via `nomul(0)`, and `iflags.last_msg` remain broader growl fidelity work.
- Full blind/deaf naming and sensing parity for hidden post-reveal growl/anger remains broader display/senses work beyond this visible/audible direct-melee slice.
- Monster-moving `setmangry()` callers and broader peaceful-neighbor fallout outside the bounded direct-melee target path remain separate.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "direct hero melee (force-fought hidden sleeper|F prefix hidden peaceful sleeper|force-fought hidden survivor|sleeping peaceful humanoid wakes|sleeping growl wakes nearby|sleeping hostile survivor)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "direct hero melee" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `npm run score` - 44/44 passing
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
