# 754 - Direct melee surviving wakeup setmangry

## Implemented Slice

Direct hero melee surviving hits now run the ordinary non-priest `wakeup(mon, TRUE)` anger transition for awake peaceful non-tame targets. This extends the priest-specific wakeup slice from audit 753 into the shared `setmangry()` behavior while preserving the C ordering boundary: target wakeup/anger happens after the visible hit message, the knockback RNG placeholder follows, and the `hmon()` wrapper priest/watch tail runs after that and before low-HP flee/passive fallout.

The implemented helper covers the source-visible state for this narrow slice:

- surviving ordinary weapon/bare-hand melee hits snapshot peacefulness before damage and still run wakeup/anger after the hit message;
- eating and wait-strategy state are cleared as part of the awake wakeup path;
- tame peaceful targets stop after the bookkeeping cleanup and keep peacefulness, matching `setmangry()`'s tame return;
- ordinary peaceful non-tame targets clear `mpeaceful`, become hostile/angry, apply the non-priest alignment penalty, and emit visible humanoid anger feedback;
- nonhumanoid targets use a source-shaped growl fallback table for currently modeled monster sound metadata;
- priest wakeup retaliation remains owned by audit 753, but the wrapper `!rn2(2)` and town-watch anger tail now run after the knockback placeholder rather than inside the wakeup helper.

C anchors:

- `known_hitum()` calls `hmon(mon, weapon, HMON_MELEE, dieroll)`, and low-HP flee is only checked after that wrapper returns: `nethack-c/upstream/src/uhitm.c:622`, `nethack-c/upstream/src/uhitm.c:625`.
- `hmon()` snapshots priest/shopkeeper/watch anger, calls `hmon_hitmon()`, then runs priest wrapper retaliation and guard anger: `nethack-c/upstream/src/uhitm.c:826`, `nethack-c/upstream/src/uhitm.c:828`, `nethack-c/upstream/src/uhitm.c:829`, `nethack-c/upstream/src/uhitm.c:831`.
- Inside `hmon_hitmon()`, damage and hit messages happen before survivor wakeup, and knockback is after `wakeup(mon, TRUE)`: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1926`, `nethack-c/upstream/src/uhitm.c:1927`.
- `wakeup()` records whether the monster was sleeping, emits the wake message, clears sleeping, ends eating, optionally growls for a sleeper, and calls `setmangry(TRUE)`: `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4349`, `nethack-c/upstream/src/mon.c:4353`, `nethack-c/upstream/src/mon.c:4355`.
- `setmangry()` clears `STRAT_WAITMASK`, returns for already-hostile or tame monsters, clears peacefulness for non-tame peaceful targets, applies the non-priest `adjalign(-1)`, and emits visible humanoid anger or `growl()`: `nethack-c/upstream/src/mon.c:4288`, `nethack-c/upstream/src/mon.c:4289`, `nethack-c/upstream/src/mon.c:4294`, `nethack-c/upstream/src/mon.c:4296`, `nethack-c/upstream/src/mon.c:4303`, `nethack-c/upstream/src/mon.c:4304`, `nethack-c/upstream/src/mon.c:4308`.
- `growl()` maps monster sound classes to hostile noise verbs and may wake nearby monsters: `nethack-c/upstream/src/sounds.c:351`, `nethack-c/upstream/src/sounds.c:402`, `nethack-c/upstream/src/sounds.c:416`.

JS changes:

- Split the direct-melee survivor helper into a wakeup/setmangry tail and a later wrapper tail.
- Generalized peaceful survivor anger beyond priests/shopkeepers/watchmen.
- Gated new non-priest survivor anger to ordinary direct weapon/bare-hand hits, leaving bullwhip apply force-attacks and wielded potion/egg bash paths on their existing semantics until those paths are audited directly.
- Preserved tame peaceful targets while still clearing eating/wait bookkeeping for the awake fixtures covered here.
- Moved nonlethal priest wrapper retaliation and town-watch anger after the knockback RNG placeholder and before flee/passive handling.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a visible peaceful non-priest humanoid survivor gets the hit message first, then becomes angry/hostile, clears waiting/eating state, and applies the ordinary peaceful attack alignment penalty;
- a tame peaceful survivor keeps peacefulness and receives no anger message, while still clearing waiting/eating state.

The existing priest survivor tests continue to cover the specialized priest wakeup and wrapper retaliation ordering.

## Deferred Gaps

- Elbereth hypocrisy handling in `setmangry()` is covered for ordinary direct melee by audit 758; full `onscary()` breadth and special attack helpers remain separate.
- Remaining peaceful-neighbor responses from `peacefuls_respond()` remain deferred because they scan many monsters and have multiple RNG/message/flee branches; ordinary/special humanoid bystander subsets, town-watch arrest, and nonhumanoid same-species growl/flee are covered by audits 762-765.
- Sleeping wake messages and sleeper growl ordering for ordinary direct melee are covered by audit 755; two-weapon sleeping direct-melee wake/offhand ordering is covered by audit 770, while special attack helpers remain broader wakeup work.
- Special attack helpers that borrow melee hit plumbing, including bullwhip apply force-attacks and wielded potion/egg bash, need source-specific follow-ups before broad non-priest anger is enabled there.
- Full knockback movement, trap collisions, stun, and wording are still represented only by the existing RNG placeholder.
- Full `growl()` side effects, including nearby wakeups and hallucinated sound tables, remain partial.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "wielded bullwhip reveals hidden armed monster without disarming it|wielded blessed water potion bash vapor rehumanizes lycanthrope after monster hit|direct hero melee surviving peaceful non-priest wakes angry|direct hero melee surviving tame target preserves peacefulness|direct hero melee nonlethal peaceful temple priest wakes angry and triggers ghod_hitsu|direct hero melee nonlethal peaceful temple priest can trigger wakeup and wrapper ghod_hitsu|direct hero melee nonlethal peaceful temple priest requires shrine for ghod_hitsu" test/shop-billing-helpers.test.mjs` - 7 pass, 2699 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs` - 2868 pass
- `npm run score` - 44/44 passing
