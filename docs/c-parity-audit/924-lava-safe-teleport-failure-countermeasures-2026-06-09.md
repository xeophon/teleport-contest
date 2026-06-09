# Lava Safe Teleport Failure Countermeasures

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6925` through `nethack-c/upstream/src/trap.c:6936` loops over up to two returning fatal lava deaths, calls `done(BURNING)`, and then calls `safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT)`.
- `nethack-c/upstream/src/teleport.c:717` through `nethack-c/upstream/src/teleport.c:765` makes `safe_teleds()` return a boolean after 40 random non-trap attempts, an expanding map scan, and a trap fallback.
- `nethack-c/upstream/src/trap.c:6936` prints `You're still burning.` when a returning death cannot be rescued by `safe_teleds()`.
- `nethack-c/upstream/src/trap.c:6944` through `nethack-c/upstream/src/trap.c:6955` grants short temporary fire resistance and water walking after two returning failures, then jumps to survivor inventory fire handling.
- `nethack-c/upstream/src/trap.c:6942` through `nethack-c/upstream/src/trap.c:6961` clears the lava-effects recursion guard after a successful rescue and manually calls `spoteffects(FALSE)`, so landing traps still run while pickup/autopickup remains disabled.
- `nethack-c/upstream/src/hack.c:3352` calls `check_special_room(FALSE)` before sink, trap, pickup, and melting-ice handling.
- `nethack-c/upstream/src/hack.c:3657` through `nethack-c/upstream/src/hack.c:3795` handles shop entry, special-room entry messages, room discovery, one-shot room type clearing, and wake-room fallout.
- `nethack-c/upstream/src/hack.c:3402` through `nethack-c/upstream/src/hack.c:3414` runs the Warning + melting-ice messages after trap handling and pickup-gated sections.
- `nethack-c/upstream/src/timeout.c:63` and `nethack-c/upstream/src/timeout.c:845` define the timeout-end messages for those temporary abilities.

## JS Parity Slice

- Added an opt-in structured result mode to `safeTeleportHeroSameLevel()` so lava continuations can distinguish failed rescue from successful silent relocation, while existing string-return callers remain unchanged.
- Tracked fatal lava-entry rescue failures across life-saving and wizard/explore refusal continuations.
- On failed rescue, JS now reports `You're still burning.` and arms another fatal lava `--More--` pass.
- After the second returning failure, JS grants temporary fire resistance and water walking for five turns, clears the fatal lava retry state, and runs survivor inventory fire handling instead of leaving the hero in an unmodeled failed-teleport state.
- Added turn-timeout cleanup and C timeout-end messages for those temporary abilities.
- Successful direct fatal-lava rescues now run a current-square landing trap pass after the safe teleport in both life-saving and wizard/explore refusal continuations. The hook reuses the movement trap result helpers, appends trap messages to the rescue message, and routes fatal/life-saving trap outcomes through the normal command-mode handling.
- The rescue landing hook intentionally avoids movement pickup, autopickup, object-list, and floor-object helpers, matching the `spoteffects(FALSE)` pickup-disabled constraint for this trap slice.
- Rescue landing now runs the modeled pickup-independent special-room entry effects before traps: shopkeeper greetings, untended temple entry text/ghost rolls, and current morgue entry text. The modeled morgue entry clears the one-shot room type after messaging; broader room discovery, shop accounting state, and wake-room fallout remain outside this slice.
- Rescue landing now also runs the pickup-independent melting-ice Warning tail from `spoteffects(FALSE)` when the safe teleport lands on timed ice.

## Tests

- `explore m-prefix fatal lava failed safe teleports twice grants temporary countermeasures`
- `explore m-prefix fatal lava prompts and decline teleports to safety`
- `m-prefix fatal lava consumes life saving and teleports to safety`
- `m-prefix fatal lava life saving warns on melting ice landing`
- `explore m-prefix fatal lava rescue triggers landing trap without pickup`
- `explore m-prefix fatal lava rescue reports morgue landing without pickup`
- `explore m-prefix fatal lava rescue warns on melting ice landing`
- `already lava-trapped countdown death uses life saving and safe teleport`
- `explore lava-trapped countdown death decline clears trap and teleports`

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "m-prefix fatal lava consumes life saving and teleports to safety|explore m-prefix fatal lava prompts and decline teleports to safety|failed safe teleports twice|already lava-trapped countdown death uses life saving and safe teleport|explore lava-trapped countdown death decline clears trap and teleports" test/shop-billing-helpers.test.mjs
node --test --test-reporter dot --test-name-pattern "m-prefix fatal lava life saving warns on melting ice landing" test/shop-billing-helpers.test.mjs
node --test --test-reporter dot --test-name-pattern "explore m-prefix fatal lava rescue triggers landing trap without pickup" test/shop-billing-helpers.test.mjs
node --test --test-reporter dot --test-name-pattern "explore m-prefix fatal lava rescue reports morgue landing without pickup" test/shop-billing-helpers.test.mjs
node --test --test-reporter dot --test-name-pattern "explore m-prefix fatal lava rescue warns on melting ice landing" test/shop-billing-helpers.test.mjs
node --test --test-reporter dot --test-name-pattern "fatal lava" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "lava safe|safe teleports twice|fatal lava|lava-trapped countdown|m-prefix.*lava|drum earthquake lava|land mine adjacent lava|temporary ability to survive burning|temporary ability to walk on liquid" test/shop-billing-helpers.test.mjs
git diff --check
node --check js/cmd.js
node --check js/allmain.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused lava rescue retry/countermeasure tests passed; broader lava pattern passed; `git diff --check` passed; `node --check` passed for `js/cmd.js`, `js/allmain.js`, and `test/shop-billing-helpers.test.mjs`; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Direct fatal lava rescue now covers the landing trap, pickup-disabled, modeled special-room entry, and melting-ice Warning parts of C's manual `spoteffects(FALSE)`. Remaining broader landing effects include sink handling, defensive hidden-monster cues where applicable, and fuller special-room fallout such as room discovery, shop accounting state, and wake-room behavior.
