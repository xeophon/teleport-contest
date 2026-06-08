# 765 - Direct melee setmangry peacefuls respond nonhumanoid same-species growl flee

## Implemented Slice

Ordinary direct hero melee survivor hits now cover the nonhumanoid same-species bystander branch inside C `peacefuls_respond()` after `setmangry(mon, TRUE)` angers a peaceful non-tame target.

This extends audits 762-764. A visible peaceful nonhumanoid bystander that shares the attacked monster's glyph class and `big_little_match()` growth chain can react without becoming hostile: the branch may growl, may flee for `rn2(25) + 15` turns, and preserves the bystander's peaceful state.

Covered behavior:

- the shared `peacefuls_respond()` bystander gates still run before this branch;
- same-species matching requires matching `mlet` plus exact-name or grownup-chain equivalence, not just the same glyph class;
- the branch consumes the C admission `!rn2(3)`, optional growl `!rn2(4)`, flee `rn2(6)`, and `15..39` flee timer rolls in source order;
- a visible growling bystander prints `<Monnam> growls!`, then `And then starts to flee.` when the same reaction also makes it flee;
- a silent same-species bystander can still reuse the attacked target's prior growl message classification and print `And then starts to flee.`, matching C's `iflags.last_msg == PLNMSG_GROWL` check after a silent `growl()` return;
- bystanders stay peaceful and do not get hostile/angry fields or additional alignment penalties.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred queues, swallowed/jousting/artifact melee, monster-moving `setmangry()` calls, or broader tame/humanoid bystander edge cases. Current quest-leader guardian-target anger is covered by audit 766.

C anchors:

- `peacefuls_respond()` iterates the monster list, skips dead monsters and the primary target, and requires a non-mindless peaceful observer that the hero could see, is not sleeping, can see, and can see the hero: `nethack-c/upstream/src/mon.c:4163`, `nethack-c/upstream/src/mon.c:4168`, `nethack-c/upstream/src/mon.c:4174`, `nethack-c/upstream/src/mon.c:4175`, `nethack-c/upstream/src/mon.c:4176`.
- Nonhumanoid bystanders skip the humanoid/watch/special-humanoid branch and reach the same-species branch only when `mlet` matches, `big_little_match(mndx, monsndx(mon->data))` passes, and `!rn2(3)` admits the reaction: `nethack-c/upstream/src/mon.c:4181`, `nethack-c/upstream/src/mon.c:4238`, `nethack-c/upstream/src/mon.c:4239`, `nethack-c/upstream/src/mon.c:4240`.
- `big_little_match()` accepts exact monster indices or matching grownup-chain ancestry after the same-`mlet` guard: `nethack-c/upstream/src/mondata.c:1228`, `nethack-c/upstream/src/mondata.c:1331`, `nethack-c/upstream/src/mondata.c:1334`, `nethack-c/upstream/src/mondata.c:1336`, `nethack-c/upstream/src/mondata.c:1341`.
- Optional bystander growling consumes `!rn2(4)`, calls `growl(mon)`, then checks `iflags.last_msg == PLNMSG_GROWL`: `nethack-c/upstream/src/mon.c:4241`, `nethack-c/upstream/src/mon.c:4242`, `nethack-c/upstream/src/mon.c:4243`.
- Fleeing consumes `rn2(6)`, calls `monflee(mon, rn2(25) + 15, TRUE, !exclaimed)`, and prints `And then starts to flee.` only when a growl-classified message preceded a newly fleeing monster: `nethack-c/upstream/src/mon.c:4245`, `nethack-c/upstream/src/mon.c:4247`, `nethack-c/upstream/src/mon.c:4249`, `nethack-c/upstream/src/mon.c:4252`.
- `growl()` returns silently for helpless or `MS_SILENT` monsters, sets `iflags.last_msg = PLNMSG_GROWL` only when it emits the growl message, and still wakes nearby monsters when a verb exists: `nethack-c/upstream/src/sounds.c:402`, `nethack-c/upstream/src/sounds.c:415`, `nethack-c/upstream/src/sounds.c:416`, `nethack-c/upstream/src/sounds.c:419`.
- `monflee()` with `first=TRUE` preserves already-fleeing behavior, extends bounded timers for non-fleeing or timed-fleeing monsters, emits the ordinary `turns to flee` text only when `fleemsg` is true and the monster is visible, and clears tracking: `nethack-c/upstream/src/monmove.c:475`, `nethack-c/upstream/src/monmove.c:486`, `nethack-c/upstream/src/monmove.c:493`, `nethack-c/upstream/src/monmove.c:529`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a visible peaceful dog bystander reacts to an attacked little dog through the grownup-chain match, growls, flees for the source-shaped `rn2(25) + 15` timer, remains peaceful, and prints `And then starts to flee.`;
- a silent same-species dog bystander preserves the target growl's last-message classification, flees without its own growl text, and prints the C follow-up wording;
- a jackal bystander with the same `mlet` as the attacked little dog does not react because it is not in the same grownup chain.

## Deferred Gaps

- Current quest-leader anger when the attacked target is the role guardian is covered by audit 766.
- Tame humanoid bystanders and humanoid `monflee()` timer/wording are covered by audit 767. Hallucinated growl verb tables, vrock gas-cloud side effects, gremlin light artifacts, and other `flags.verbose` branches remain outside this slice.
- The local `m_canseeu()` approximation covers invisibility and line of sight but does not yet model every telepathy, monster sense, underwater, or special perception condition.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee nonhumanoid" test/shop-billing-helpers.test.mjs` - 3 pass, 2732 skipped
- `node --test --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|peaceful humanoid bystander responds|sleeping peaceful humanoid bystander|blind peaceful humanoid bystander|town watch bystander arrests and angers guards|deaf town watch bystander arrests but suppresses guard feedback|nonhumanoid same-species|nonhumanoid bystander with same glyph|current quest leader bystander can gasp then shrug|shopkeeper bystander can gasp then shrug|cross-aligned priest bystander|sleeping growl wakes nearby sleepers before anger|surviving peaceful target on Elbereth|blind hostile target on Elbereth)" test/shop-billing-helpers.test.mjs` - 15 pass, 2720 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test --test-reporter=dot test/*.mjs` - full suite pass
- `npm run score` - 44/44 passing
