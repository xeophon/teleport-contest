# C Parity Audit 275: Tiphat Resident Surcharge Warning

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns early for deaf heroes, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` outside the hallucination gag branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, resident state branches, surcharge warnings, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5582-5585`: a resident shopkeeper with `eshk->surcharge` warns or indicates that the shopkeeper is watching the hero carefully.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles the surcharge branch before the resident cash-threshold branches.
- The branch remains gated behind the earlier resident states still modeled as unhandled: angry, following/customer, bill totals, debit, credit, and robbed.
- Spoken shopkeepers use `warns you`; mute shopkeepers use the existing nonverbal `indicates` fallback.
- The deaf `indicates` variant exists in C `shk_chat()`, but directed helmet tipping normally returns before `domonnoise()` while the hero is deaf.
- The warning uses the shopkeeper subject pronoun, matching C's `noit_mhe(shkp)` role in this branch.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- an invisible female resident shopkeeper with ordinary cash and `surcharge: 1` using the spoken warning line without RNG,
- avoiding the nonresident line, cash-threshold lines, shoplifter tail line, bill total line, robbery line, and visible humanoid wave/gesture responses,
- the shared `#tip` side effects: wait-strategy clearing and remembered invisible mapping.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry, following/customer, bill totals, debit, credit, and robbed.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1264/1264` tests passed)
- `node --test test/*.mjs` (`1361/1361` tests passed)
- `npm run score` (`44/44` replay sessions passed)
