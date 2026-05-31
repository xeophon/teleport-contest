# C Parity Audit 273: Tiphat Resident Shopkeeper Cash Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns early for deaf heroes, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` outside the hallucination gag branch.
- `nethack-c/upstream/src/shk.c:5521-5598`: `shk_chat()` handles nonresident shopkeeper-types first, then actual resident shopkeeper state.
- `nethack-c/upstream/src/shk.c:5578-5594`: after angry, following, bill, debit, credit, robbed, and surcharge branches, `money_cnt(shkp->minvent) < 50` says business is bad and `> 4000` says business is good.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatShopkeeperSellNoise()` now delegates actual resident shopkeepers to a narrow resident `shk_chat()` model.
- Resident `isshk` monsters defer if they have earlier C `shk_chat()` state: hostile/angry, following, bill rows, debit, credit, robbed, or surcharge.
- If no earlier branch applies, resident shopkeeper cash is read with the existing `shopkeeperCash()` helper:
  - `< 50` produces `<Shknam> complains/indicates that business is bad.`,
  - `> 4000` produces `<Shknam> says/indicates that business is good.`
- The nonresident shopkeeper-type branch from audit 272 remains before resident handling.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- an invisible resident shopkeeper with 49 gold saying business is bad without RNG,
- an invisible resident shopkeeper with 4001 gold saying business is good without RNG,
- the shared `#tip` side effects: wait-strategy clearing and remembered invisible mapping.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry, following/customer, bill totals, debit, credit, robbed, and surcharge.
- Izchak-specific random chatter and generic shoplifter chatter are still deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1262/1262` tests passed)
- `node --test test/*.mjs` (`1359/1359` tests passed)
- `npm run score` (`44/44` replay sessions passed)
