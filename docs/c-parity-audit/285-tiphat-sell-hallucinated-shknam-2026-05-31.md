# C Parity Audit 285: Hallucinated Resident Shknam

## Sources

- `nethack-c/upstream/src/sounds.c:688-736`: `domonnoise()` skips silent monsters only when they are not actual shopkeepers, forces actual shopkeepers to `MS_SELL`, and sends silent shopkeepers directly to `shk_chat()` even under hallucination.
- `nethack-c/upstream/src/shk.c:5521-5599`: resident `shk_chat()` uses `Shknam()` for stateful shopkeeper-name lines, while following verbal greetings use `Hello(shkp)` and do not call `Shknam()`.
- `nethack-c/upstream/src/shknam.c:841-897`: `Shknam()` calls `shkname()`, capitalizes the first character, and hallucinated `shkname()` chooses a random non-unique shop type with core `rn2()`, then a random name from that shopkeeper list.
- `nethack-c/upstream/src/shknam.c:209-340`: the non-unique shop types stop before the `prob == 0` lighting store, so hallucinated shopkeeper names exclude Izchak and the lighting list.
- `nethack-c/upstream/src/do_name.c:1389-1408`: the `shkname()` fallback path obtains a modifiable monster-name buffer first; under hallucination this burns display RNG before the core shopkeeper-name rolls.

## JS Coverage

- `randomHallucinatedShopkeeperName()` now shares the JS shopkeeper name lists, picks among non-unique shop types with core `rn2()`, then strips one non-letter prefix from the chosen raw name.
- Resident sell chatter now calls a local sentence-name helper lazily only where C prints `Shknam()`. Following verbal greetings keep using `Hello()` and avoid the hallucinated shopkeeper-name rolls.
- Hallucinated resident bill, debit, credit, robbery, surcharge, cash, angry, tap, and generic shoplifter branches now use randomized shopkeeper names.
- Actual resident shopkeepers with silent current monster data now bypass the non-shopkeeper silent early-return, keep the actual-shopkeeper `MS_SELL` override, and enter `shk_chat()` without the hallucinated GEICO `rn2(2)` split when silent.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- hallucinated town Izchak routing into ordinary `shk_chat()` with a randomized non-lighting shopkeeper name,
- no eager `Shknam()` roll for the hallucinated following-customer `Hello()` branch,
- hallucinated resident bill and debit ordering: resident split, shop type/name, pronoun where applicable, then currency,
- visible silent polymorphed actual shopkeeper reaching the resident bill-total branch and using nonverbal `indicates`.

## Remaining Gaps

- The directed helmet responder scan still does not claim full `dotalk()`/`domonnoise()` scan parity for all unseen/statue/glyph cases.
- `Shknam()` randomization is implemented for the resident directed helmet sell path, not yet every global shopkeeper-name call site.
- Broader display-RNG logging for the hallucinated fallback monster-name buffer burn remains implicit because ordinary RNG logs only capture core RNG.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "(hallucinating worn helmet tip (at actual gecko|routes displayed gecko|at town Izchak|at resident shopkeeper|at billed resident shopkeeper|at debit resident shopkeeper)|hallucinating following resident shopkeeper greeting|worn helmet tip at visible silent polymorphed resident shopkeeper)" test/shop-billing-helpers.test.mjs` (`8/8` selected tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1286/1286` tests passed)
- `node --test test/*.mjs` (`1383/1383` tests passed)
- `npm run score` (`44/44` replay sessions passed)
