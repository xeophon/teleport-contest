# Lava Safe Teleport Failure Countermeasures

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6925` through `nethack-c/upstream/src/trap.c:6936` loops over up to two returning fatal lava deaths, calls `done(BURNING)`, and then calls `safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT)`.
- `nethack-c/upstream/src/teleport.c:717` through `nethack-c/upstream/src/teleport.c:765` makes `safe_teleds()` return a boolean after 40 random non-trap attempts, an expanding map scan, and a trap fallback.
- `nethack-c/upstream/src/trap.c:6936` prints `You're still burning.` when a returning death cannot be rescued by `safe_teleds()`.
- `nethack-c/upstream/src/trap.c:6944` through `nethack-c/upstream/src/trap.c:6955` grants short temporary fire resistance and water walking after two returning failures, then jumps to survivor inventory fire handling.
- `nethack-c/upstream/src/timeout.c:63` and `nethack-c/upstream/src/timeout.c:845` define the timeout-end messages for those temporary abilities.

## JS Parity Slice

- Added an opt-in structured result mode to `safeTeleportHeroSameLevel()` so lava continuations can distinguish failed rescue from successful silent relocation, while existing string-return callers remain unchanged.
- Tracked fatal lava-entry rescue failures across life-saving and wizard/explore refusal continuations.
- On failed rescue, JS now reports `You're still burning.` and arms another fatal lava `--More--` pass.
- After the second returning failure, JS grants temporary fire resistance and water walking for five turns, clears the fatal lava retry state, and runs survivor inventory fire handling instead of leaving the hero in an unmodeled failed-teleport state.
- Added turn-timeout cleanup and C timeout-end messages for those temporary abilities.

## Tests

- `explore m-prefix fatal lava failed safe teleports twice grants temporary countermeasures`
- `explore m-prefix fatal lava prompts and decline teleports to safety`
- `m-prefix fatal lava consumes life saving and teleports to safety`
- `already lava-trapped countdown death uses life saving and safe teleport`
- `explore lava-trapped countdown death decline clears trap and teleports`

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "m-prefix fatal lava consumes life saving and teleports to safety|explore m-prefix fatal lava prompts and decline teleports to safety|failed safe teleports twice|already lava-trapped countdown death uses life saving and safe teleport|explore lava-trapped countdown death decline clears trap and teleports" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "lava safe|safe teleports twice|fatal lava|lava-trapped countdown|m-prefix.*lava|drum earthquake lava|land mine adjacent lava|temporary ability to survive burning|temporary ability to walk on liquid" test/shop-billing-helpers.test.mjs
git diff --check
node --check js/cmd.js
node --check js/allmain.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused lava rescue retry/countermeasure tests passed; broader lava pattern passed; `git diff --check` passed; `node --check` passed for `js/cmd.js`, `js/allmain.js`, and `test/shop-billing-helpers.test.mjs`; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Direct fatal lava rescue still lacks C's manual landing `spoteffects(FALSE)` detail after successful rescue.
