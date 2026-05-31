# C Parity Audit 274: Tiphat Resident Shoplifter Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns early for deaf heroes, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` outside the hallucination gag branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, resident state branches, resident cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5594-5599`: if the resident shopkeeper is not Izchak and can speak, the tail branch says `<Shknam> talks about the problem of shoplifters.`
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now models the generic non-Izchak tail branch after the cash thresholds.
- The branch only runs for actual `isshk` residents with no earlier `shk_chat()` state and cash in the ordinary `50..4000` range.
- Izchak remains deferred because his tail branch is RNG-driven.
- Muted non-Izchak shopkeepers consume the response with no message, matching the C branch's `if (!Deaf && !muteshk(shkp))` guard.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- an invisible resident non-Izchak shopkeeper with 100 gold saying the shoplifter line without RNG,
- avoiding the nonresident line, cash-threshold lines, generic nonresponse, and visible humanoid wave/gesture responses,
- the shared `#tip` side effects: wait-strategy clearing and remembered invisible mapping.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry, following/customer, bill totals, debit, credit, robbed, and surcharge.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` remains incomplete; adjacent shopkeeper `#chat` reuses this sell helper as of audit 293.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1263/1263` tests passed)
- `node --test test/*.mjs` (`1360/1360` tests passed)
- `npm run score` (`44/44` replay sessions passed)
