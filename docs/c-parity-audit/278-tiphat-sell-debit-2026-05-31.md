# C Parity Audit 278: Tiphat Resident Debit Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns before speech while deaf, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` unless hallucination takes the GEICO-style branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, angry/following resident states, bill totals, debit, credit, robbery, surcharge, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5563-5574`: bill rows beat debit, bill totals include `eshk->debit`, and debit-only residents remind or indicate that the hero owes them the stated amount.
- `nethack-c/upstream/include/you.h:326`, `nethack-c/upstream/src/mondata.c:1191`, and `nethack-c/upstream/src/role.c:688`: `noit_mhim(shkp)` uses objective pronouns while avoiding invisibility-only "it"; hallucination can randomize pronoun gender.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles the resident debit branch before credit, robbery, surcharge, and cash-threshold chatter.
- Debit remains gated behind the earlier resident states still modeled as unhandled: angry, following/customer, and bill totals.
- The debit branch uses `shopkeeperObjectivePronoun()` and `shopCurrency()` for the C-style object pronoun and singular/plural currency.
- The reachable nonverbal variant is covered through mute shopkeeper state. Directed helmet tipping is caller-blocked while the hero is deaf, matching the upstream `domonnoise()` path.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- invisible resident shopkeepers with `debit` using the reminder line without RNG,
- debit independently winning over credit, robbery, surcharge, low cash, high cash, and the non-Izchak shoplifter tail,
- male and female objective pronouns plus singular and plural currency,
- mute shopkeeper wording using `indicates` rather than `reminds you`,
- avoiding the nonresident line, bill-total line, later resident chatter, and visible humanoid wave/gesture responses.

## Remaining Gaps

- Earlier resident `shk_chat()` branches remain open: angry, following/customer, and bill totals.
- Bill-total chatter must include debit in the displayed total before this area is complete.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech, including hallucinated `noit_mhim()` pronoun randomization.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|debit-holding invisible resident shopkeeper|mute debit-holding invisible resident shopkeeper|credit-holding invisible resident shopkeeper|robbed invisible resident shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1268/1268` tests passed)
- `node --test test/*.mjs` (`1365/1365` tests passed)
- `npm run score` (`44/44` replay sessions passed)
