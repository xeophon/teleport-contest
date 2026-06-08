# 763 - Direct melee setmangry peacefuls respond special humanoid bystander shrug/gasp

## Implemented Slice

Ordinary direct hero melee survivor hits now cover the special humanoid bystander branch inside C `peacefuls_respond()` after `setmangry(mon, TRUE)` angers a peaceful non-tame target.

This extends audit 762's ordinary humanoid bystander response. Shopkeepers, priests, and the current role's quest leader can notice the attack and optionally gasp, but they do not become angry from this neighbor-response branch. If `maybe_gasp()` emits text, C prints the exclamation followed by `" then shrugs."`; otherwise the observer remains silent and peaceful.

Covered behavior:

- the special bystander branch runs after the primary target's hit text and anger text;
- shopkeeper and priest bystanders remain peaceful, do not become hostile, keep wait strategy, and do not apply another alignment penalty;
- the current role's quest leader follows the same shrug-and-continue path unless the attacked monster is the current role's quest guardian;
- optional `maybe_gasp()` wording is source-shaped for `"Gasp!"` and is only printed when the outer `!rn2(5)` gate succeeds;
- cross-aligned priest bystanders consume the outer gasp gate when eligible but suppress `maybe_gasp()` text and therefore print no shrug message.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred queues, swallowed/jousting/artifact melee, monster-moving `setmangry()` calls, or tame bystander behavior. Town-watch arrest is covered by audit 764, and the nonhumanoid same-species response branch is covered by audit 765.

C anchors:

- `peacefuls_respond()` iterates the monster list, skips dead monsters and the primary target, and requires a non-mindless peaceful observer that the hero could see, is not sleeping, can see, and can see the hero: `nethack-c/upstream/src/mon.c:4163`, `nethack-c/upstream/src/mon.c:4168`, `nethack-c/upstream/src/mon.c:4174`, `nethack-c/upstream/src/mon.c:4175`, `nethack-c/upstream/src/mon.c:4176`.
- The humanoid branch includes ordinary humanoids, shopkeepers, and priests, with town watch handled before the non-watch special branch: `nethack-c/upstream/src/mon.c:4181`, `nethack-c/upstream/src/mon.c:4182`.
- Non-deaf observers consume `rn2(5)` before calling `maybe_gasp(mon)`; returned `"Gasp!"` text is formatted as `Monnam(mon) gasps`, while other table entries use the exclaims form: `nethack-c/upstream/src/mon.c:4187`, `nethack-c/upstream/src/mon.c:4188`, `nethack-c/upstream/src/mon.c:4191`, `nethack-c/upstream/src/mon.c:4195`.
- Shopkeepers, priests, and the current role's quest leader for non-guardian targets print the optional gasp buffer plus `" then shrugs."` and continue without anger: `nethack-c/upstream/src/mon.c:4201`, `nethack-c/upstream/src/mon.c:4205`, `nethack-c/upstream/src/mon.c:4206`, `nethack-c/upstream/src/mon.c:4207`, `nethack-c/upstream/src/mon.c:4208`, `nethack-c/upstream/src/mon.c:4210`.
- `maybe_gasp()` suppresses other roles' guardians and cross-aligned priests by converting their sound to `MS_SILENT`, then permits the humanoid speech table including `MS_LEADER`, `MS_GUARDIAN`, `MS_SELL`, and `MS_PRIEST`: `nethack-c/upstream/src/sounds.c:544`, `nethack-c/upstream/src/sounds.c:555`, `nethack-c/upstream/src/sounds.c:557`, `nethack-c/upstream/src/sounds.c:567`, `nethack-c/upstream/src/sounds.c:574`, `nethack-c/upstream/src/sounds.c:576`, `nethack-c/upstream/src/sounds.c:578`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a visible peaceful shopkeeper bystander can take the forced `"Gasp!"` path, prints `gasps then shrugs`, remains peaceful, keeps wait strategy, and does not apply a second alignment penalty;
- the current Wizard quest leader bystander can take the same forced gasp-and-shrug path for a non-guardian attacked target while remaining peaceful;
- a cross-aligned priest bystander consumes the outer `rn2(5)` gasp gate but emits no gasp or shrug text and remains peaceful.

## Deferred Gaps

- Town watch arrest and `angry_guards()` are covered by audit 764.
- Current quest-leader anger when the attacked target is the role guardian is covered by audit 766.
- Tame humanoid bystanders, existing-fleeing wording outside the nonhumanoid same-species branch, and all `flags.verbose` branches remain outside this slice. Nonhumanoid same-species growl/flee behavior and its local `monflee()` timer are covered by audit 765.
- The local `m_canseeu()` approximation covers invisibility and line of sight but does not yet model every telepathy, monster sense, underwater, or special perception condition.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee (current quest leader bystander can gasp then shrug|shopkeeper bystander can gasp then shrug|cross-aligned priest bystander)" test/shop-billing-helpers.test.mjs` - 3 pass, 2727 skipped
- `node --test --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|peaceful humanoid bystander responds|sleeping peaceful humanoid bystander|blind peaceful humanoid bystander|current quest leader bystander can gasp then shrug|shopkeeper bystander can gasp then shrug|cross-aligned priest bystander|sleeping growl wakes nearby sleepers before anger|surviving peaceful target on Elbereth|blind hostile target on Elbereth)" test/shop-billing-helpers.test.mjs` - 10 pass, 2720 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test --test-reporter=dot test/*.mjs` - full suite pass
- `npm run score` - 44/44 passing
