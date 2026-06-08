# C Parity Audit 773: Direct Melee Egg Bash Survivor Wakeup

## Sources

- `nethack-c/upstream/src/uhitm.c:1186-1256`: `case EGG` in `hmon()` sets nominal one-point damage, disables ordinary damage bonuses, emits custom egg hit text, consumes or transforms the egg, and only returns early for branches such as pyrolisk explosions or petrification outcomes.
- `nethack-c/upstream/src/uhitm.c:1923-1927`: surviving, non-destroyed `hmon()` targets still run `wakeup(mon, TRUE)` after the egg-specific handling.
- `nethack-c/upstream/src/mon.c:4335-4355`: `wakeup(TRUE)` clears sleep/eating state, reveals hidden targets, handles growl wakeups for sleepers, and calls `setmangry(TRUE)`.

## JS Changes

- Made the shared egg nominal-damage helper keep its previous thrown-egg wake/anger behavior by default, but allow melee egg delivery to defer sleep/peaceful mutation.
- Marked melee ordinary, petrifying-resisted, and live-touch-petrifier egg branches as eligible for the direct-melee survivor wakeup tail; pyrolisk eggs remain early-return branches because C returns after the explosion.
- After a nonfatal eligible wielded egg bash, run the same direct-melee nonlethal wakeup tail used by ordinary hits and potion bashes, preserving no weapon-conduct/chronicle accounting for egg weapons.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- a force-fought peaceful goblin hit by a wielded ordinary egg receives egg text and `Splat!`, then becomes angry through the post-egg melee wakeup tail;
- nominal egg damage remains exactly one HP;
- eating/wait state, alignment penalty, hostility flags, inventory use-up, no floor object, and no weapon-conduct/chronicle state are asserted;
- nearby thrown-egg and pyrolisk canaries stayed in the focused run to preserve non-melee helper behavior.

## Remaining Gaps

- Sleeping egg-bash survivors still need a growl/nearby-wakeup canary.
- Special social targets such as priests, watchmen, and same-species bystanders should remain narrow follow-ups.
- The shared egg helper still mixes thrown and melee delivery details; a future combat-core cleanup should split the delivery contract more explicitly.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "wielded egg|hero-thrown ordinary egg hits visible monster|hero-thrown cockatrice egg splats on stone-resistant monster|hero-thrown pyrolisk egg direct hit" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs` (pass)
- `npm run score` (`44/44`)
