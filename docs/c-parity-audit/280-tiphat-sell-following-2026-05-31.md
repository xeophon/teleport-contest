# C Parity Audit 280: Tiphat Resident Following Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns before speech while deaf, skips silent non-shopkeepers, and forces actual shopkeepers to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` unless hallucination takes the GEICO-style branch.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles nonresident shopkeeper-types, angry resident state, following/customer state, bill totals, debit, credit, robbery, surcharge, cash thresholds, Izchak chatter, then generic shoplifter chatter.
- `nethack-c/upstream/src/shk.c:5545-5561`: resident following state beats bill/debit/later chatter; a mismatched stored customer clears `eshk->following`, and a mute/deaf current-customer shopkeeper taps the hero on the arm.
- `nethack-c/upstream/src/role.c:2120-2137`: `Hello(shkp)` is role-sensitive, including Samurai shopkeepers using `Irasshaimase`.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` clears wait strategy, intercepts visible peaceful humanoids before `domonnoise()`, and maps invisible responders after handled noise.

## JS Coverage

- `tipHatResidentShopkeeperSellNoise()` now handles resident `following` before bill totals, debit, credit, robbery, surcharge, and cash-threshold chatter.
- Matching-current-customer following state verbalizes the C payment reminder and leaves `following` set.
- Mismatched stored-customer following state clears `following` and, when speech is available, verbalizes the C "I was looking for" line.
- Mute mismatched-customer state clears `following` silently, leaving only the helmet doff message.
- Mute current-customer state uses the C nonverbal tap message.
- `shopkeeperHello()` mirrors the C role greeting used by both shop entry and resident following chatter.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- current-customer following chatter winning over bill, debit, credit, robbery, surcharge, cash-threshold, and shoplifter chatter,
- Samurai shopkeeper greeting parity for `Hello(shkp)`,
- prior-customer following chatter clearing `following` before later branches,
- mute current-customer following using the arm tap message,
- mute prior-customer following clearing `following` silently,
- avoiding visible humanoid wave/gesture responses and generic invisible-target fallbacks.

## Remaining Gaps

- Earlier resident `shk_chat()` angry branch remains open.
- Izchak-specific random chatter remains deferred.
- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` remains incomplete; adjacent shopkeeper `#chat` reuses this sell helper as of audit 293.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (nonresident invisible shopkeeper|following resident shopkeeper|mute following resident shopkeeper|billed invisible resident shopkeeper|mute billed invisible resident shopkeeper|debit-holding invisible resident shopkeeper|mute debit-holding invisible resident shopkeeper|credit-holding invisible resident shopkeeper|robbed invisible resident shopkeeper|surcharging invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper|ordinary invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1274/1274` tests passed)
- `node --test test/*.mjs` (`1371/1371` tests passed)
- `npm run score` (`44/44` replay sessions passed)
