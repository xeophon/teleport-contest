# C Parity Audit 295: Chat Vertical And Steed Direction

## Sources

- `nethack-c/upstream/src/sounds.c:1292-1308`: after `#chat` direction input, mounted downward chat targets `u.usteed`; all other vertical directions print "They won't hear you up/down there." and return `ECMD_OK`.
- `nethack-c/upstream/src/sounds.c:1297-1302`: helpless mounted steeds print `"%s seems not to notice you."` and return `ECMD_TIME`; nonhelpless mounted steeds go directly through `domonnoise(u.usteed)`.
- `nethack-c/upstream/src/sounds.c:688-693`: `domonnoise()` returns without message or time for deaf heroes and silent non-shopkeeper monsters.
- `nethack-c/upstream/src/sounds.c:911-922`: equine `MS_NEIGH` responses use the normal `domonnoise()` turn-consuming sound path.

## JS Changes

- Added a small shared `commandDirection()` decoder for direction-taking commands that need C-style `<` and `>` support without changing `movementDirection()`'s horizontal-only contract.
- Routed `#chat` vertical input through C's direction ordering:
  - `#chat <` and unmounted `#chat >` now say "They won't hear you up/down there." without consuming time.
  - mounted `#chat >` now targets `game.u.usteed` before the generic vertical branch.
  - helpless mounted steeds use chat's "seems not to notice you" wording and consume a turn.
  - active mounted steeds call the shared `domonnoise()`-like helper directly, bypassing adjacent-target tame-eating and deaf-response chat branches.
- Reused the existing saddle-aware chat name helper for mounted chat so steed `Monnam()`-style messages stay aligned with the adjacent eating pet path.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat up without a steed uses C vertical no-hear response without time`
- `chat down without a steed uses C vertical no-hear response without time`
- `chat down at mounted pony uses steed domonnoise and consumes time`
- `chat down at helpless mounted pony still consumes time before domonnoise`
- `deaf chat down at mounted pony is silent and does not consume time`

## Remaining Gaps

- Pre-direction `#chat` gates still need separate parity work: silent hero, strangled, swallowed, underwater, and shop-floor price quote.
- Direction target validation still lacks statue/object/furniture mimic handling and hallucinated wall/object behavior.
- Individual `domonnoise()` sound classes still inherit the current helper's approximations; this slice only fixes vertical and mounted target ordering.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "chat up without a steed|chat down without a steed|chat down at mounted pony|deaf chat down at mounted pony|chat with visible saddled tame eating pet|chat with visible dog uses monster noise|chat with helpless non-priest|deaf chat with visible ordinary monster" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
