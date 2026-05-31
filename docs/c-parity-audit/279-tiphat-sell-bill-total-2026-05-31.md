# C Parity Audit 279: Tiphat Resident Bill Total Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns before speech while deaf, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` unless hallucination takes the GEICO-style branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, angry/following resident states, bill totals, debit, credit, robbery, surcharge, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5563-5569`: resident bill rows beat debit-only chatter and print the bill total as `addupbill(shkp) + eshk->debit`.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles resident bill totals before debit, credit, robbery, surcharge, and cash-threshold chatter.
- `shopBillTotal()` sums modeled JS bill ledger entries via `shopBillEntryTotal(entry)`.
- The bill-total branch adds `debit` separately to mirror C `addupbill(shkp) + eshk->debit`.
- The branch uses `says` for speaking shopkeepers and `indicates` when the reachable mute-shopkeeper variant makes speech unavailable.
- Angry and following/customer resident states remain gated as earlier unhandled states.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- invisible resident shopkeepers with bill rows using the C bill-total line without RNG,
- bill rows winning over debit, credit, robbery, surcharge, low cash, high cash, and generic shoplifter chatter,
- bill ledger sum plus separate debit producing the displayed total,
- singular and plural currency in bill totals,
- mute shopkeeper wording using `indicates` rather than `says`,
- avoiding the nonresident line, debit-only line, later resident chatter, and visible humanoid wave/gesture responses.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry and following/customer.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|billed invisible resident shopkeeper|mute billed invisible resident shopkeeper|debit-holding invisible resident shopkeeper|mute debit-holding invisible resident shopkeeper|credit-holding invisible resident shopkeeper|robbed invisible resident shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1270/1270` tests passed)
- `node --test test/*.mjs` (`1367/1367` tests passed)
- `npm run score` (`44/44` replay sessions passed)
