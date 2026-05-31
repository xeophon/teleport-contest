# C Parity Audit 281: Tiphat Resident Angry Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns before speech while deaf, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` unless hallucination takes the GEICO-style branch.
- `nethack-c/upstream/src/shk.c:54-55`: `ANGRY(mon)` is `!mon->mpeaceful`.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, angry resident state, following/customer state, bill totals, debit, credit, robbery, surcharge, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5540-5544`: angry resident shopkeepers mention or indicate how much they dislike `non-paying` customers if `robbed` is set, otherwise `rude` customers.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles angry resident state before following, bill totals, debit, credit, robbery, surcharge, and cash-threshold chatter.
- `tipHatShopkeeperIsAngry()` treats hostile, false/zero `mpeaceful`, and the modeled JS `angry` flag as angry-state signals.
- Robbed angry shopkeepers use the C `non-paying customers` wording; unrobbed angry shopkeepers use `rude customers`.
- Speaking shopkeepers use `mentions`; mute shopkeepers use `indicates`.
- The branch preserves following, customer, bill, debit, credit, robbed, and surcharge state, matching C's non-mutating angry line.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- angry robbed resident shopkeeper chatter winning over following, bill, debit, credit, robbery, surcharge, cash-threshold, and shoplifter chatter,
- angry unrobbed resident shopkeeper chatter selecting `rude customers` and the female subject pronoun,
- mute angry resident shopkeeper chatter selecting `indicates`,
- avoiding visible humanoid wave/gesture responses and generic invisible-target fallbacks.

## Remaining Gaps

- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` remains incomplete; adjacent shopkeeper `#chat` reuses this sell helper as of audit 293.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|angry robbed resident shopkeeper|angry unrobbed resident shopkeeper|mute angry robbed resident shopkeeper|following resident shopkeeper|mute following resident shopkeeper|billed invisible resident shopkeeper|mute billed invisible resident shopkeeper|debit-holding invisible resident shopkeeper|mute debit-holding invisible resident shopkeeper|credit-holding invisible resident shopkeeper|robbed invisible resident shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1277/1277` tests passed)
- `node --test test/*.mjs` (`1374/1374` tests passed)
- `npm run score` (`44/44` replay sessions passed)
