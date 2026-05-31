# C Parity Audit 282: Tiphat Izchak Sell Chatter

## Sources

- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` dispatches to `shk_chat()` for non-hallucinating shopkeepers; hallucinating resident shopkeepers remain a separate `rn2(2)` split.
- `nethack-c/upstream/src/shk.c:5508-5519`: `Izchak_speaks` contains nine possible shop chatter lines.
- `nethack-c/upstream/src/shk.c:5521-5599`: `shk_chat()` handles resident angry/following/bill/debit/credit/robbery/surcharge/cash states before the Izchak tail, then generic shoplifter chatter.
- `nethack-c/upstream/src/shknam.c:908-922`: `is_izchak()` requires non-hallucination, a real resident shopkeeper, town location, and the Izchak shopkeeper name.
- `nethack-c/upstream/include/hack.h:1493`: `ROLL_FROM(array)` selects `array[rn2(SIZE(array))]`, so Izchak chatter consumes one `rn2(9)` only when the line is emitted.

## JS Coverage

- `TIPHAT_IZCHAK_SELL_MESSAGES` now models the full nine-entry C `Izchak_speaks` table.
- `tipHatResidentShopkeeperSellNoise()` now handles the Izchak tail after cash thresholds and before generic shoplifter chatter.
- `shopkeeperInTown()` keeps Izchak's special chatter town-gated for this sell path; out-of-town Izchak falls through to the ordinary shoplifter line, matching C.
- Mute/deaf Izchak consumes the response silently without rolling `rn2(9)`, because the C `ROLL_FROM()` call is guarded by `!Deaf && !muteshk(shkp)`.
- Hallucinating actual resident shopkeepers remain on the existing deferred path, so this slice does not change the C `rn2(2)` resident-vs-GEICO split.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- town Izchak selecting a deterministic C table line with `rn2(9)=8`,
- mute town Izchak consuming the sell response with no RNG,
- out-of-town Izchak using generic shoplifter chatter with no RNG,
- the surrounding cash-poor, cash-rich, and ordinary non-Izchak sell-tail branches.

## Remaining Gaps

- Hallucinating actual resident shopkeepers still need the C `rn2(2)` split between `shk_chat()` and GEICO-style speech.
- Silent/polymorphed actual shopkeeper handling is still incomplete in the directed helmet responder scan.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip makes (ordinary invisible Izchak|mute ordinary invisible Izchak|out-of-town ordinary invisible Izchak|ordinary invisible resident shopkeeper|cash-poor invisible resident shopkeeper|cash-rich invisible resident shopkeeper)" test/shop-billing-helpers.test.mjs` (`6/6` selected tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1280/1280` tests passed)
- `node --test test/*.mjs` (`1377/1377` tests passed)
- `npm run score` (`44/44` replay sessions passed)
