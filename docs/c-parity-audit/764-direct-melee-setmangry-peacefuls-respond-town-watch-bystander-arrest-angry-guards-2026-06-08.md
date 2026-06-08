# 764 - Direct melee setmangry peacefuls respond town watch bystander arrest angry guards

## Implemented Slice

Ordinary direct hero melee survivor hits now cover the town-watch bystander branch inside C `peacefuls_respond()` after `setmangry(mon, TRUE)` angers a peaceful non-tame target.

This extends audits 762-763. If a visible peaceful watchman or watch captain sees the hero attack a peaceful monster, that first eligible watch bystander gives the arrest warning, then `angry_guards(!!Deaf)` wakes and angers all peaceful town-watch monsters. Later watch monsters in the same scan do not speak again because `angry_guards()` has already cleared their peaceful state.

Covered behavior:

- the watch bystander branch runs after the primary target's hit text and anger text;
- town-watch bystanders use the C arrest text before other guard fallout;
- `angry_guards()` mutates all living peaceful watchmen/watch captains to hostile/angry in the local JS state;
- adjacent visible watch feedback uses the existing `The guard gets angry!` summary after the arrest warning;
- a Deaf hero still receives the arrest `verbalize()` text, but the `angry_guards()` feedback is silent while the guard-state mutation still happens;
- the watch branch consumes no `peacefuls_respond()` gasp, flee, or timer RNG.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred queues, swallowed/jousting/artifact melee, monster-moving `setmangry()` calls, tame bystander behavior, or current quest-leader guardian-target anger. The nonhumanoid same-species response branch is covered by audit 765.

C anchors:

- `peacefuls_respond()` iterates the monster list and applies the shared bystander gates before any town-watch handling: `nethack-c/upstream/src/mon.c:4163`, `nethack-c/upstream/src/mon.c:4168`, `nethack-c/upstream/src/mon.c:4174`, `nethack-c/upstream/src/mon.c:4175`, `nethack-c/upstream/src/mon.c:4176`.
- The humanoid branch handles watch monsters before the optional gasp/flee/ordinary anger path: `nethack-c/upstream/src/mon.c:4181`, `nethack-c/upstream/src/mon.c:4182`.
- A watch bystander calls `verbalize("Halt!  You're under arrest!")`, then calls `angry_guards(!!Deaf)`: `nethack-c/upstream/src/mon.c:4183`, `nethack-c/upstream/src/mon.c:4184`, `nethack-c/upstream/src/mon.c:4185`.
- `verbalize()` only wraps the text in quotes; callers are responsible for Deaf checks, and this branch does not check Deaf before the arrest text: `nethack-c/upstream/src/pline.c:471`, `nethack-c/upstream/src/pline.c:476`, `nethack-c/upstream/src/pline.c:482`, `nethack-c/upstream/src/pline.c:487`.
- `angry_guards()` scans all monsters, skips dead ones, counts peaceful watch monsters, clears sleeping/frozen state, and clears `mpeaceful`: `nethack-c/upstream/src/mon.c:5711`, `nethack-c/upstream/src/mon.c:5716`, `nethack-c/upstream/src/mon.c:5719`, `nethack-c/upstream/src/mon.c:5727`, `nethack-c/upstream/src/mon.c:5731`.
- Non-silent `angry_guards()` message priority is sleeping/frozen wakeup, adjacent spotted anger, non-adjacent approaching, then whistle feedback: `nethack-c/upstream/src/mon.c:5734`, `nethack-c/upstream/src/mon.c:5738`, `nethack-c/upstream/src/mon.c:5743`, `nethack-c/upstream/src/mon.c:5746`, `nethack-c/upstream/src/mon.c:5751`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a visible adjacent peaceful watchman bystander prints the arrest warning after the attacked goblin gets angry, then `angry_guards()` prints adjacent guard anger and makes the watchman hostile/angry without applying another alignment penalty;
- a Deaf hero still gets the arrest warning, but guard feedback is suppressed while the watchman still becomes hostile/angry.

## Deferred Gaps

- Current quest-leader anger when the attacked target is the role guardian is still deferred.
- Tame humanoid bystanders, existing-fleeing wording outside the nonhumanoid same-species branch, and all `flags.verbose` branches remain outside this slice. Nonhumanoid same-species growl/flee behavior and its local `monflee()` timer are covered by audit 765.
- The local `angry_guards()` helper preserves the current JS hostile/angry fields expected by existing tests, while broader C `canspotmon()` sensory parity remains display/sensing work.
- The local `m_canseeu()` approximation covers invisibility and line of sight but does not yet model every telepathy, monster sense, underwater, or special perception condition.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee (town watch bystander arrests and angers guards|deaf town watch bystander arrests but suppresses guard feedback)" test/shop-billing-helpers.test.mjs` - 2 pass, 2730 skipped
- `node --test --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|peaceful humanoid bystander responds|sleeping peaceful humanoid bystander|blind peaceful humanoid bystander|town watch bystander arrests and angers guards|deaf town watch bystander arrests but suppresses guard feedback|current quest leader bystander can gasp then shrug|shopkeeper bystander can gasp then shrug|cross-aligned priest bystander|sleeping growl wakes nearby sleepers before anger|surviving peaceful target on Elbereth|blind hostile target on Elbereth)" test/shop-billing-helpers.test.mjs` - 12 pass, 2720 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` - 44/44 passing
