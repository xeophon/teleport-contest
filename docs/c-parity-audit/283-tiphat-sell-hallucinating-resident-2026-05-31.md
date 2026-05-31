# C Parity Audit 283: Tiphat Hallucinating Resident Sell Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:678-744`: `domonnoise()` returns for deaf heroes, skips silent non-shopkeepers, assigns actual resident shopkeepers `MS_SELL` before the hallucinated gecko override, then lets hallucinating actual shopkeepers call `shk_chat()` only when `!rn2(2)`.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` keeps the same angry, following, bill, debit, credit, robbed, surcharge, cash, Izchak, and generic shoplifter ordering after the hallucination gate.
- `nethack-c/upstream/src/shknam.c:908-922`: `is_izchak(shkp, FALSE)` returns false under hallucination, so a hallucinating town Izchak who reaches `shk_chat()` falls through to ordinary resident chatter unless an earlier branch applies.
- `nethack-c/upstream/include/you.h:326-331`, `nethack-c/upstream/src/mondata.c:1191-1203`, and `nethack-c/upstream/src/role.c:688-694`: `noit_mhe()` and `noit_mhim()` randomize among he/she/it/they pronoun sets under hallucination.

## JS Coverage

- `tipHatMonsterNoise()` now keeps nonresident/hallucinated-gecko `MS_SELL` on the existing GEICO-style response with no resident RNG, while actual resident shopkeepers consume `rn2(2)` under hallucination and enter `tipHatShopkeeperSellNoise()` on the zero roll.
- `tipHatResidentShopkeeperSellNoise()` now suppresses Izchak's special table while hallucinating, matching `is_izchak(shkp, FALSE)`.
- The sell chatter branches that use C `noit_mhe()`/`noit_mhim()` now use sell-local hallucinated pronoun helpers, so angry, debit, and surcharge resident chatter consume one `rn2(4)` under hallucination without changing ordinary payment messages.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- hallucinating town Izchak with `rn2(2)=0` entering ordinary `shk_chat()` and not rolling Izchak's `rn2(9)` table,
- hallucinating resident shopkeeper with `rn2(2)=1` using the GEICO-style line,
- hallucinating debit resident shopkeeper using the `rn2(2)=0` resident path and then a randomized `noit_mhim()` objective pronoun,
- existing hallucinated actual/displayed gecko sell speech still using the nonresident GEICO-style path.

## Remaining Gaps

- C hallucinated `Shknam()` randomizes shopkeeper names in resident chatter; this slice keeps the JS shopkeeper display name stable.
- C `currency()` randomizes currency names under hallucination; this slice keeps existing JS `shopCurrency()` behavior.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "hallucinating worn helmet tip at (town Izchak|resident shopkeeper|debit resident shopkeeper)|hallucinating worn helmet tip (at actual gecko|routes displayed gecko)" test/shop-billing-helpers.test.mjs` (`5/5` selected tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1283/1283` tests passed)
- `node --test test/*.mjs` (`1380/1380` tests passed)
- `npm run score` (`44/44` replay sessions passed)
