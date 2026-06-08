# 750 - Direct melee xkilled social penalties

## Implemented Slice

Direct hero melee kills now share the C-shaped `xkilled()` social side effects already used by the projectile death path:

- force-fight against a safe pet bypasses the safe-pet swap/stop guard and reaches direct melee;
- tame non-minion kills mark the pet as killed by the hero before life saving or vampire revival can return;
- peaceful and tame kills use the shared bounded luck helper;
- same-aligned unicorn kills append `You feel guilty...` and apply the extra luck penalty;
- tame direct kills preserve the direct pet-abuse prefix, then apply `xkilled()` poor-pet wording, pet attribution, luck, alignment abuse, and deferred thunder feedback.

C anchors:

- `domove()` and `do_attack()` skip safe-monster displacement/protection when `forcefight` is set: `nethack-c/upstream/src/hack.c:2791`, `nethack-c/upstream/src/uhitm.c:462`.
- Direct pet damage calls `abuse_dog()` even when the pet is about to die: `nethack-c/upstream/src/uhitm.c:1593`.
- `xkilled()` marks tame non-minion pets as killed by the hero before `mondead()` can return for monster life saving: `nethack-c/upstream/src/mon.c:3524`, `nethack-c/upstream/src/mon.c:3543`.
- Peaceful/tame kills and same-aligned unicorn kills call `change_luck()`; `change_luck()` clamps luck to the C min/max bounds: `nethack-c/upstream/src/mon.c:3664`, `nethack-c/upstream/src/attrib.c:411`.
- Tame kill alignment fallout applies after XP and queues the thunder/applause feedback: `nethack-c/upstream/src/mon.c:3703`.

JS changes:

- Reused the projectile tame-kill metadata path through a shared `markHeroKilledTameMonster()` helper.
- Renamed the projectile luck helper to `applyHeroKillLuckSideEffects()` and used it from both projectile and direct melee kill cleanup.
- Let `_force_fight_target` bypass safe-pet movement displacement so `F`/forced direct attacks can actually reach the direct melee branch.
- Updated direct melee to refresh the pending message when a visible luck side effect appends text, preserving the same-aligned unicorn guilt message.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- direct force-fight lethal melee against a tame little dog reaches attack instead of safe-pet displacement, emits the pet-abuse yelp before `You kill the poor little dog!`, records `killed_by_u` on both the monster and `edog`, applies tame luck/alignment penalties, records killer conduct, and queues thunder feedback;
- direct lethal melee against a same-aligned unicorn appends `You feel guilty...`, applies the C luck penalty, records killer conduct, and keeps peaceful random-luck RNG out of the hostile unicorn path.

## Deferred Gaps

- Direct ordinary melee random treasure, remembered-invisible cleanup, and level-up ordering are implemented but still only have stronger projectile canaries.
- Lethal peaceful shopkeeper, priest, and watch anger fallout remains a separate `hmon()` wrapper-tail slice.
- Broader direct-melee special cases such as swallowed hits, jousting, artifacts, and two-weapon sequences should remain source-backed follow-ups.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal tame target records pet kill side effects|direct hero melee lethal same-aligned unicorn applies C guilt luck" test/shop-billing-helpers.test.mjs` - 2 pass, 2694 skipped
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal tame target records pet kill side effects|direct hero melee lethal same-aligned unicorn applies C guilt luck|direct hero melee lethal target uses monster life saving|direct hero melee genocided target consumes life saving|direct hero melee revives shifted vampire|hero-thrown dagger lethal tame target uses poor wording and xkilled luck|hero-thrown dagger lethal same-aligned unicorn applies C guilt luck" test/shop-billing-helpers.test.mjs` - 7 pass, 2689 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
