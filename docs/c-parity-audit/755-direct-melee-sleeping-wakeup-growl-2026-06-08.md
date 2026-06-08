# 755 - Direct melee sleeping wakeup growl

## Implemented Slice

Ordinary unpolymorphed direct hero melee survivor hits now model the sleeping portion of C's `wakeup(mon, TRUE)` ordering for visible, source-shaped fixtures: the visible hit message is emitted first, then the target wake message, the sleeper growl, and finally peaceful anger from `setmangry(TRUE)`.

This intentionally builds on audit 754's awake peaceful survivor path and keeps the same narrow boundary: no replay maps, no seed-specific behavior, and no broad monster lifecycle rewrite.

Covered behavior:

- ordinary weapon/bare-hand direct melee survivor hits use the pre-hit `msleeping` snapshot as C's `was_sleeping`;
- visible sleepers emit `The <monster> wakes up!` before the sleeper growl and before peaceful anger;
- sleeping state, eating state, and wait strategy are cleared through the wakeup tail;
- C-shaped growl verbs are used for covered sound classes, including default `MS_ORC`-style screams and silent monsters producing no growl text;
- peaceful non-tame targets still clear `mpeaceful`, become hostile/angry, and take the ordinary non-priest alignment penalty after sleeper growl;
- hostile sleepers wake/growl and clear bookkeeping without getting a peaceful anger message or alignment penalty;
- bullwhip apply force-attacks, wielded potion bash, and wielded egg bash remain outside this ordinary direct-melee hook.

C anchors:

- `known_hitum()` sends ordinary direct melee through `hmon()`: `nethack-c/upstream/src/uhitm.c:622`.
- `hmon()` snapshots priest/shopkeeper/watch fallout before calling `hmon_hitmon()`: `nethack-c/upstream/src/uhitm.c:826`.
- Damage and the visible hit message precede survivor wakeup: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1926`.
- `wakeup()` snapshots `was_sleeping`, calls `wake_msg()` before clearing `msleeping`, then handles reveal/eating cleanup, sleeper growl, and `setmangry(TRUE)`: `nethack-c/upstream/src/mon.c:4335`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4339`, `nethack-c/upstream/src/mon.c:4349`, `nethack-c/upstream/src/mon.c:4353`, `nethack-c/upstream/src/mon.c:4355`.
- `wake_msg()` only prints for visible sleepers: `nethack-c/upstream/src/mon.c:4324`.
- `setmangry()` clears wait strategy, returns for already-hostile or tame targets, clears peacefulness, applies non-priest `adjalign(-1)`, then emits anger/growl feedback: `nethack-c/upstream/src/mon.c:4288`, `nethack-c/upstream/src/mon.c:4294`, `nethack-c/upstream/src/mon.c:4296`, `nethack-c/upstream/src/mon.c:4303`, `nethack-c/upstream/src/mon.c:4304`, `nethack-c/upstream/src/mon.c:4308`.
- `growl()` suppresses helpless/silent monsters, maps monster sound classes to verbs, and can wake nearby monsters: `nethack-c/upstream/src/sounds.c:351`, `nethack-c/upstream/src/sounds.c:402`, `nethack-c/upstream/src/sounds.c:416`.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a sleeping peaceful humanoid survivor gets hit text, wake text, `screams!`, then `gets angry!`, with sleep/eating/wait cleanup and ordinary alignment penalty;
- a sleeping peaceful silent nonhumanoid survivor wakes and angers silently, with no growl or visible anger text;
- a sleeping hostile survivor wakes and growls, clears sleep/eating/wait state, and does not receive peaceful anger or alignment penalty.

The focused run also keeps canaries for the awake survivor path, bullwhip apply force-attacks, and wielded potion/egg bash paths.

## Deferred Gaps

- Direct-melee sleeper growl `wake_nearto()` side effects are covered by audit 756; remaining `growl()` gaps are deaf/audible unseen naming, hallucinated sound table, run interruption, and `iflags.last_msg`.
- Bounded `wakeup()` reveal behavior for apparent object mimics and force-fought `mundetected` survivors is covered by audit 768; force-fought sleeping hidden survivor post-reveal growl/anger ordering is covered by audit 769; full mimic light-blocking and exact discovery wording remain deferred.
- `setmangry()` Elbereth hypocrisy and engraving fade/deletion are covered by audits 758-761; bounded `peacefuls_respond()` target/bystander branches are covered by audits 762-767, with broader peaceful-neighbor response behavior still deferred.
- Sleeping priest/shopkeeper special follow-ups beyond existing priest canaries and non-shop non-priest fixtures remain deferred.
- Two-weapon deferred sleeping-hit queues, knockback movement, special apply paths, and potion/egg bash paths remain separate follow-ups.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee sleeping|direct hero melee surviving peaceful non-priest wakes angry|direct hero melee surviving tame target preserves peacefulness|wielded bullwhip reveals hidden armed monster without disarming it|wielded blessed water potion bash vapor rehumanizes lycanthrope after monster hit|wielded confusion potion bash routes through potionhit|wielded ordinary egg hits visible monster" test/shop-billing-helpers.test.mjs` - 8 pass, 2701 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs` - 2871 pass
- `npm run score` - 44/44 passing
