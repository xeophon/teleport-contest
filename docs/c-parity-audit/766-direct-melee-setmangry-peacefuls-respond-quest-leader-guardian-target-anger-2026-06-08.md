# 766 - Direct melee setmangry peacefuls respond quest leader guardian target anger

## Implemented Slice

Ordinary direct hero melee survivor hits now cover the current quest leader bystander branch inside C `peacefuls_respond()` when the attacked target is the current role's quest guardian.

This extends audits 762-765. A current quest leader bystander still follows the special no-anger shrug branch for non-guardian targets, but when the hero attacks the role guardian the leader falls through to ordinary bystander anger: optional `maybe_gasp()` text can be printed first, then the leader loses peacefulness, clears wait strategy, and applies the second social alignment penalty.

Covered behavior:

- the shared `peacefuls_respond()` bystander gates still run before this branch;
- the current quest leader no-shrug exception only applies when the attacked target is not the current role guardian;
- a non-Deaf leader can consume the `maybe_gasp()` rolls, print `gasps.`, and still become angry without an additional `gets angry!` message;
- a Deaf hero bypasses the optional gasp path and gets the visible leader anger message;
- the leader bystander clears peaceful/wait state, becomes hostile/angry in local JS state, and adds the second `adjalign(-1)`-shaped social penalty;
- the covered Wizard leader has level 20, so the ordinary low-level bystander flee branch cannot fire before anger.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon paths beyond audit 770's ordinary sleeping direct-melee ordering, swallowed/jousting/artifact melee, monster-moving `setmangry()` calls, tame bystander behavior, or broader `m_canseeu()` sensing edge cases.

C anchors:

- `peacefuls_respond()` iterates the monster list, skips dead monsters and the primary target, and requires a non-mindless peaceful observer that the hero could see, is not sleeping, can see, and can see the hero: `nethack-c/upstream/src/mon.c:4163`, `nethack-c/upstream/src/mon.c:4168`, `nethack-c/upstream/src/mon.c:4174`, `nethack-c/upstream/src/mon.c:4175`, `nethack-c/upstream/src/mon.c:4176`.
- The humanoid branch runs `maybe_gasp()` behind `!Deaf && !rn2(5)`, with `"Gasp!"` becoming `Monnam(mon) gasps` and other entries becoming `exclaims`: `nethack-c/upstream/src/mon.c:4181`, `nethack-c/upstream/src/mon.c:4187`, `nethack-c/upstream/src/mon.c:4188`, `nethack-c/upstream/src/mon.c:4191`, `nethack-c/upstream/src/mon.c:4195`.
- Shopkeepers, priests, and current quest leaders only shrug and continue when the leader is not seeing an attack against the current role guardian: `nethack-c/upstream/src/mon.c:4201`, `nethack-c/upstream/src/mon.c:4205`, `nethack-c/upstream/src/mon.c:4206`, `nethack-c/upstream/src/mon.c:4207`, `nethack-c/upstream/src/mon.c:4210`.
- The low-level flee branch is checked after the no-shrug branch and excludes quest guardian bystanders; the covered Wizard leader's level is too high for `mlevel < rn2(10)`, so it falls through to anger state mutation: `nethack-c/upstream/src/mon.c:4213`, `nethack-c/upstream/src/mon.c:4215`, `nethack-c/upstream/src/mon.c:4217`.
- Non-tame bystanders clear `mpeaceful`, clear `STRAT_WAITMASK`, call `adjalign(-1)`, and print `gets angry!` only when no earlier gasp/flee message was emitted: `nethack-c/upstream/src/mon.c:4231`, `nethack-c/upstream/src/mon.c:4232`, `nethack-c/upstream/src/mon.c:4233`, `nethack-c/upstream/src/mon.c:4234`, `nethack-c/upstream/src/mon.c:4236`.
- `maybe_gasp()` permits `MS_LEADER` and `MS_GUARDIAN` speech, while suppressing other roles' guardians before the table: `nethack-c/upstream/src/sounds.c:544`, `nethack-c/upstream/src/sounds.c:555`, `nethack-c/upstream/src/sounds.c:567`, `nethack-c/upstream/src/sounds.c:574`, `nethack-c/upstream/src/sounds.c:576`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- Wizard quest leader Neferet the Green gasps, does not shrug, and becomes hostile/angry when the attacked peaceful target is a Wizard apprentice guardian;
- the same guardian-target branch with a Deaf hero bypasses the gasp path and prints `Neferet the Green gets angry!`;
- both cases apply the target's social penalty plus the leader bystander's social penalty, for `record === -2` and `abuse === 2`.

## Deferred Gaps

- Tame humanoid bystanders and humanoid `monflee()` timer/wording are covered by audit 767. Other `flags.verbose` branches remain outside this slice.
- The local guardian identity helper is name/marker based; C compares monster indices, so polymorphed/disguised quest guardian edge cases remain broader role/monster metadata work.
- The local `m_canseeu()` approximation covers invisibility and line of sight but does not yet model every telepathy, monster sense, underwater, or special perception condition.
- Monster-moving `setmangry()` callers and special direct-attack helpers remain separate from this ordinary hero-melee hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee current quest leader bystander|direct hero melee deaf quest leader" test/shop-billing-helpers.test.mjs` - 3 pass, 2734 skipped
- `git diff --check`
- `node --test --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|peaceful humanoid bystander responds|sleeping peaceful humanoid bystander|blind peaceful humanoid bystander|town watch bystander arrests and angers guards|deaf town watch bystander arrests but suppresses guard feedback|nonhumanoid same-species|nonhumanoid bystander with same glyph|current quest leader bystander|deaf quest leader bystander|shopkeeper bystander can gasp then shrug|cross-aligned priest bystander|sleeping growl wakes nearby sleepers before anger|surviving peaceful target on Elbereth|blind hostile target on Elbereth)" test/shop-billing-helpers.test.mjs` - 17 pass, 2720 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test --test-reporter=dot test/*.mjs` - full suite pass
- `npm run score` - 44/44 passing
