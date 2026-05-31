# C Parity Audit 293: Chat Shopkeeper Speech

## Sources

- `nethack-c/upstream/src/sounds.c:1246-1408`: `#chat` selects a single adjacent target, rejects helpless non-priests before speech, clears `STRAT_WAITMASK`, handles deaf responses before `domonnoise()`, and otherwise delegates to `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:688-744`: `domonnoise()` lets actual shopkeepers speak even when their current monster form is silent, forces `isshk` monsters to `MS_SELL`, maps unseen responders, and calls `shk_chat()` for sell speech outside the hallucinated GEICO branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` covers nonresident shopkeeper-types, angry, following/customer, bill total, debit, credit, robbed, surcharge, cash, Izchak, and shoplifter branches.
- `nethack-c/upstream/src/shk.c:58`: `muteshk()` treats helpless or animal-sound shopkeepers as nonverbal; direct `#chat` still rejects helpless shopkeepers before `shk_chat()`.

## JS Changes

- Added an adjacent shopkeeper `#chat` path in `chatDirection`, before pet/nymph/priest local branches and before the passable-floor fallback.
- Reused the existing C-shaped `tipHatMonsterNoise()`/shopkeeper sell helpers instead of adding a second local `shk_chat()` implementation.
- Preserved direct `#chat` ordering:
  - helpless shopkeepers report not noticing the hero and do not clear wait strategy or consume a move,
  - nonhelpless shopkeepers clear wait strategy before deaf handling,
  - deaf chat reports the C-shaped `Any response...` line without calling shopkeeper speech or consuming a move,
  - non-deaf shopkeeper speech consumes a move even when the reused helper emits no visible message.
- Kept directed helmet `#tip` behavior unchanged.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat with nonresident visible shopkeeper asks about untended shops`
- `chat with billed visible resident shopkeeper states total before later chatter`
- `chat with following resident shopkeeper handles current and prior customer`
- `chat with angry robbed resident shopkeeper wins before following and billing`
- `deaf chat with visible resident shopkeeper reports response before shop speech`
- `chat with helpless shopkeeper does not clear wait or reach shop speech`
- `hallucinating chat with resident shopkeeper can use GEICO speech`

The tests assert branch ordering, state preservation, wait-strategy behavior, command-time behavior, and RNG shapes without using replay maps or seed-specific shortcuts.

## Remaining Gaps

- Standing on shop goods and using `#chat` should route to C `price_quote()` before direction; that remains separate prompt/shop work.
- Broad non-shopkeeper, non-priest `#chat` still has local special cases instead of a shared `domonnoise()` implementation.
- Silent-polyform, underwater, swallowed, wall hallucination, statue, steed, and generic monster sound `#chat` parity remain separate slices.
- C hallucinated shopkeeper names and currency are still only partially modeled by the existing sell helper.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern='chat with .*shopkeeper|deaf chat with visible resident shopkeeper|hallucinating chat with resident shopkeeper|chat with billed visible resident shopkeeper|chat with following resident shopkeeper|chat with angry robbed resident shopkeeper' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (`44/44` replay sessions passed)
- `git diff --check`
