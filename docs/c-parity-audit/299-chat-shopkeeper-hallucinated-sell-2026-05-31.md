# C Parity Audit 299: Chat Hallucinated Shopkeeper Sell Speech

## Sources

- `nethack-c/upstream/src/sounds.c:688-744`: `domonnoise()` forces actual shopkeepers to `MS_SELL`, maps unseen responders before speech, and under hallucination only calls `shk_chat()` on a resident shopkeeper when `!rn2(2)` or when the current monster form is silent.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` orders resident branches as angry, following/customer, bill total, debit, credit, robbed, surcharge, cash, Izchak, then shoplifter chatter.
- `nethack-c/upstream/src/shknam.c:841-897`: `Shknam()` randomizes the displayed shopkeeper name under hallucination by selecting a non-unique shop type and then a name from that list.
- `nethack-c/upstream/src/shknam.c:908-922`: `is_izchak(shkp, FALSE)` is false while hallucinating, so hallucinated Izchak falls through to ordinary resident chatter unless an earlier state branch applies.

## JS Status

- Adjacent `#chat` already reuses the shared sell helper through `finishChatMonsterTarget()` and `tipHatMonsterNoise()`.
- That shared helper now covers the later directed-helmet refinements for hallucinated shopkeeper names, hallucinated currency, randomized `noit_mhim()` pronouns, and the following/prior-customer branch that uses `Hello()` rather than `Shknam()`.
- This audit adds focused `#chat` canaries so the chat path is explicitly protected rather than relying on helmet-tip coverage.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `hallucinating billed resident shopkeeper chat uses randomized Shknam and currency`
- `hallucinating debit resident shopkeeper chat randomizes Shknam pronoun and currency`
- `hallucinating prior-customer shopkeeper chat does not roll Shknam`
- `hallucinating ordinary resident shopkeeper chat randomizes Shknam`

The tests assert the C branch ordering, visible chat turn consumption, wait-strategy clearing, and RNG shape for the hallucinated `rn2(2)` gate, `Shknam()`, pronoun, and `currency()` calls.

## Remaining Gaps

- `Shknam()` randomization is still local to current shopkeeper sell helpers rather than every shopkeeper-name call site.
- Some individual non-shopkeeper `domonnoise()` sound classes remain approximate in the shared helper.
- Broader command/menu unification for reusable `getpos()` and `getobj()` contracts remains separate from this chat canary slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "hallucinating (chat with resident shopkeeper|billed resident shopkeeper chat|debit resident shopkeeper chat|prior-customer shopkeeper chat|ordinary resident shopkeeper chat)" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44` replay sessions passed)
- `git diff --check`
