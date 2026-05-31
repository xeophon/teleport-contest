# C Parity Audit 276: Tiphat Resident Robbery Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns early for deaf heroes, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` outside the hallucination gag branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, resident state branches, robbery chatter, surcharge warnings, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5578-5581`: a resident shopkeeper with `eshk->robbed` complains or indicates concern about a recent robbery.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles the robbery branch before surcharge and cash-threshold branches.
- The branch remains gated behind the earlier resident states still modeled as unhandled: angry, following/customer, bill totals, debit, and credit.
- Spoken shopkeepers use `complains`; mute shopkeepers use the existing nonverbal `indicates concern` fallback.
- The deaf `indicates concern` variant exists in C `shk_chat()`, but directed helmet tipping normally returns before `domonnoise()` while the hero is deaf.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- an invisible resident shopkeeper with ordinary cash and `robbed: 250` using the spoken robbery line without RNG,
- `robbed` winning over `surcharge`, matching C branch order,
- avoiding the nonresident line, surcharge warning, cash-threshold lines, shoplifter tail line, bill total line, and visible humanoid wave/gesture responses,
- the shared `#tip` side effects: wait-strategy clearing and remembered invisible mapping.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry, following/customer, bill totals, debit, and credit.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` remains incomplete; adjacent shopkeeper `#chat` reuses this sell helper as of audit 293.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|robbed invisible resident shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1265/1265` tests passed)
- `node --test test/*.mjs` (`1362/1362` tests passed)
- `npm run score` (`44/44` replay sessions passed)
