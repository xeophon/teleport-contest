# C Parity Audit 774: Direct Melee Egg Bash Sleeping Wakeup Message

## Sources

- `nethack-c/upstream/src/uhitm.c:1186-1256`: wielded ordinary eggs in `hmon()` print the egg-specific hit text and `Splat!`, use nominal one-point damage, and avoid the generic hit text.
- `nethack-c/upstream/src/uhitm.c:1923-1927`: surviving non-destroyed `hmon()` targets run `wakeup(mon, TRUE)` after egg-specific handling.
- `nethack-c/upstream/src/mon.c:4320-4355`: `wakeup(TRUE)` prints the visible sleeper wake message first, then growls and wakes nearby sleepers before `setmangry(TRUE)`.
- `nethack-c/upstream/src/mon.c:4294-4304`: `setmangry()` clears peacefulness and emits visible humanoid anger feedback.

## JS Changes

- Made the direct-melee wielded egg survivor branch use the same sleeping wake-tail deferral as ordinary melee when the post-wake tail has visible follow-up text.
- Preserved the egg path's C-shaped constraints: no weapon conduct/chronicle accounting, no thrown-egg wake mutation change, pyrolisk egg survivor-tail skip, and no ordinary melee passive/RNG tail.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- a force-fought sleeping peaceful goblin hit by a wielded ordinary egg now shows `You hit ... with an egg.  Splat!  The goblin wakes up!` before More;
- after More, the deferred tail emits the sleeper growl, wakes a nearby visible sleeper, and then angers the goblin;
- HP, sleep/eating/wait state, hostility, alignment penalty, inventory use-up, no floor object, no weapon-conduct/chronicle state, and no pre-More ordinary melee RNG tail are asserted.

## Remaining Gaps

- Special social targets such as priests, watchmen, and same-species bystanders remain narrow follow-ups.
- Ordinary consumed-egg survivor low-HP flee and passive-object no-weapon ordering is covered by audit 775.
- Live egg-to-rock transform passive-object ordering is still outside this focused wake-message slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "wielded egg|hero-thrown ordinary egg hits visible monster|hero-thrown cockatrice egg splats on stone-resistant monster|hero-thrown pyrolisk egg direct hit" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs` (pass)
- `npm run score` (`44/44`)
