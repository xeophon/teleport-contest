# C Parity Audit 277: Tiphat Resident Credit Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns early for deaf heroes, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` outside the hallucination gag branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, resident state branches, credit chatter, robbery chatter, surcharge warnings, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5575-5577`: a resident shopkeeper with `eshk->credit` encourages the hero to use the stated amount of credit.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles the credit branch before robbery, surcharge, and cash-threshold branches.
- The branch remains gated behind the earlier resident states still modeled as unhandled: angry, following/customer, bill totals, and debit.
- The C credit branch does not vary wording for mute shopkeepers; JS mirrors that by emitting the same `encourages you` line once the branch is reached.
- The deaf wording question is normally caller-blocked for directed helmet tipping because `domonnoise()` returns before `shk_chat()` while the hero is deaf.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- invisible resident shopkeepers with `credit: 77` using the credit line without RNG,
- `credit` independently winning over `robbed`, `surcharge`, low cash, high cash, and the non-Izchak shoplifter tail, matching C branch order,
- avoiding the nonresident line, robbery line, surcharge warning, cash-threshold lines, shoplifter tail line, bill total line, and visible humanoid wave/gesture responses,
- the shared `#tip` side effects: wait-strategy clearing and remembered invisible mapping.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry, following/customer, bill totals, and debit.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|credit-holding invisible resident shopkeeper|robbed invisible resident shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1266/1266` tests passed)
- `node --test test/*.mjs` (`1363/1363` tests passed)
- `npm run score` (`44/44` replay sessions passed)
