# 767 - Direct melee setmangry peacefuls respond tame humanoid bystander flee monflee

## Implemented Slice

Ordinary direct hero melee survivor hits now route low-level humanoid bystander fleeing through the shared C-shaped `monflee()` helper, including tame humanoid bystanders that may flee but must not become angry from this neighbor-response branch.

This extends audits 762-766. A low-level visible humanoid bystander that sees the hero attack a peaceful non-tame target can flee before the ordinary anger fallthrough. If the bystander is tame, C performs the gasp/flee work first but then skips the `mpeaceful` clear, wait-mask cleanup, and bystander alignment penalty.

Covered behavior:

- the shared `peacefuls_respond()` bystander gates still run before this branch;
- humanoid bystanders use the C flee gate `mlevel < rn2(10)`, then `rn2(50) + 25` for a `25..74` flee timer;
- humanoid flee state now goes through `directMeleeMonflee()` instead of direct `mflee`/`mfleetim` field assignment, preserving timer extension, existing untimed-flee behavior, visible flee-message gating, and tracking cleanup;
- a non-tame low-level humanoid bystander can print `turns to flee.`, then still become hostile/angry and apply the second social alignment penalty without an extra `gets angry!` message;
- a tame humanoid bystander can print `turns to flee.` or `gasps and then turns to flee.`, while preserving `mpeaceful`, `mtame`, wait strategy, and target-only alignment penalties;
- an already-fleeing tame humanoid bystander still consumes the source flee-duration roll before `monflee(first=TRUE)`, keeps untimed flee state, and clears monster tracking without duplicate flee text.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon paths beyond audit 770's ordinary sleeping direct-melee ordering, swallowed/jousting/artifact melee, monster-moving `setmangry()` calls, or broader `m_canseeu()` sensing edge cases.

C anchors:

- `peacefuls_respond()` iterates the monster list, skips dead monsters and the primary target, and requires a non-mindless peaceful observer that the hero could see, is not sleeping, can see, and can see the hero: `nethack-c/upstream/src/mon.c:4163`, `nethack-c/upstream/src/mon.c:4168`, `nethack-c/upstream/src/mon.c:4174`, `nethack-c/upstream/src/mon.c:4175`, `nethack-c/upstream/src/mon.c:4176`.
- The non-watch humanoid branch can optionally gasp before any special-case shrug or flee/anger handling: `nethack-c/upstream/src/mon.c:4181`, `nethack-c/upstream/src/mon.c:4187`, `nethack-c/upstream/src/mon.c:4188`, `nethack-c/upstream/src/mon.c:4191`, `nethack-c/upstream/src/mon.c:4195`.
- Low-level non-guardian humanoid bystanders call `monflee(mon, rn2(50) + 25, TRUE, !exclaimed)`, append `and then turns to flee.` to a gasp buffer only when verbose and newly fleeing, and otherwise treat the flee message as the bystander feedback: `nethack-c/upstream/src/mon.c:4213`, `nethack-c/upstream/src/mon.c:4215`, `nethack-c/upstream/src/mon.c:4217`, `nethack-c/upstream/src/mon.c:4218`, `nethack-c/upstream/src/mon.c:4220`.
- The tame branch happens after possible gasp and flee work, and skips the `mpeaceful` clear, `STRAT_WAITMASK` clear, `adjalign(-1)`, and visible anger message: `nethack-c/upstream/src/mon.c:4229`, `nethack-c/upstream/src/mon.c:4230`, `nethack-c/upstream/src/mon.c:4231`, `nethack-c/upstream/src/mon.c:4232`, `nethack-c/upstream/src/mon.c:4233`.
- `monflee()` with `first=TRUE` preserves already-fleeing untimed scare, extends bounded timers for non-fleeing or timed-fleeing monsters, emits ordinary `turns to flee` text only when `fleemsg` is true and the monster is visible, sets `mflee`, and always clears tracking: `nethack-c/upstream/src/monmove.c:475`, `nethack-c/upstream/src/monmove.c:486`, `nethack-c/upstream/src/monmove.c:493`, `nethack-c/upstream/src/monmove.c:528`, `nethack-c/upstream/src/monmove.c:529`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a low-level non-tame gnome bystander flees with a source-shaped timer, clears tracking, then becomes hostile/angry and applies the second alignment penalty without an extra anger message;
- a low-level tame gnome bystander can flee and clear tracking while preserving tame/peaceful/wait state and avoiding the bystander alignment penalty;
- a tame gnome bystander can gasp first and receive the verbose `and then turns to flee.` suffix while still avoiding bystander anger;
- an already-fleeing tame gnome bystander consumes the source duration roll, keeps untimed flee, clears tracking, and does not print duplicate flee text.

## Deferred Gaps

- Other `flags.verbose` branches outside this humanoid gasp-plus-flee wording remain deferred.
- The local `m_canseeu()` approximation covers invisibility and line of sight but does not yet model every telepathy, monster sense, underwater, or special perception condition.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee low-level humanoid|direct hero melee tame humanoid|direct hero melee already-fleeing tame" test/shop-billing-helpers.test.mjs` - 4 pass, 2737 skipped
- `node --test --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|peaceful humanoid bystander responds|sleeping peaceful humanoid bystander|blind peaceful humanoid bystander|low-level humanoid bystander|tame humanoid bystander|already-fleeing tame|town watch bystander arrests and angers guards|deaf town watch bystander arrests but suppresses guard feedback|nonhumanoid same-species|nonhumanoid bystander with same glyph|current quest leader bystander|deaf quest leader bystander|shopkeeper bystander can gasp then shrug|cross-aligned priest bystander|sleeping growl wakes nearby sleepers before anger|surviving peaceful target on Elbereth|blind hostile target on Elbereth)" test/shop-billing-helpers.test.mjs` - 21 pass, 2720 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing at `2026-06-08T04:01:57.118Z`
