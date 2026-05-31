# C Parity Audit 294: Generic Chat Domonnoise

## Sources

- `nethack-c/upstream/src/sounds.c:1379-1408`: direct `#chat` rejects helpless non-priests before clearing wait strategy, then handles tame eating, deaf responses, and `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:688-744`: `domonnoise()` skips deaf and silent non-shopkeepers, maps unseen responders before the sound switch, and returns either `ECMD_OK` or `ECMD_TIME`.
- `nethack-c/upstream/src/sounds.c:837-922`: animal sound branches include no-message time-consuming cases and peaceful hiss as a mapped no-time no-response case.
- `nethack-c/upstream/src/sounds.c:1090-1135`: seducing nymph speech uses C direct verbal wording, including the bare `"Hello, sailor."` line.

## JS Changes

- Replaced separate adjacent `#chat` shopkeeper, pet, nymph, and priest branches with a shared `finishChatMonsterTarget()` path.
- The shared path preserves C `dochat()` ordering:
  - helpless non-priests return "seems not to notice you" without clearing wait strategy or consuming time,
  - priests bypass the helpless gate and continue into priest speech,
  - nonhelpless targets clear wait strategy before tame-eating, deaf, or speech handling,
  - tame eating maps invisible pets and returns without consuming time,
  - deaf responses return before monster sound speech or RNG,
  - handled `domonnoise()` responses consume a move, including no-message dingo/groan-style responses.
- Invisible monster mapping now happens for generic direct `#chat` when C would enter `domonnoise()` or the tame-eating branch.
- The nymph `#chat` local wording now comes from the C-shaped sound helper, so `"Hello, sailor."` is no longer prefixed as `The nymph says:`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat with visible dog uses monster noise before empty-space fallback`
- `chat with invisible tame eating pet maps it without consuming time`
- `chat with visible saddled tame eating pet uses C saddle wording`
- `chat with visible nymph uses C seduce wording`
- `chat with invisible peaceful snake maps it without response or time`
- `deaf chat with visible ordinary monster reports response before monster noise`
- `chat with helpless non-priest does not clear wait or consume time`

The focused run also included representative priest and shopkeeper chat tests to keep the unified path honest.

## Remaining Gaps

- Pre-direction `#chat` gates still need separate parity work: silent hero, strangled, swallowed, underwater, and shop-floor price quote.
- Direction target validation still lacks several C details, including steed/down handling, vertical no-hear cases, statue/object/furniture target wording, and hallucinated wall/object behavior.
- Some individual `domonnoise()` sound classes are still approximate in the reused helper; this slice only wires direct `#chat` through that table with the correct high-level ordering.
- C hallucinated shopkeeper names and currency remain only partially modeled by the sell helper.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "chat with visible dog|chat with invisible tame eating pet|chat with visible saddled tame eating pet|chat with visible nymph|chat with invisible peaceful snake|deaf chat with visible ordinary monster|chat with helpless non-priest|chat with visible coaligned temple priest|deaf chat with visible priest|chat with nonresident visible shopkeeper|deaf chat with visible resident shopkeeper|chat with helpless shopkeeper|hallucinating chat with resident shopkeeper" test/shop-billing-helpers.test.mjs`
