# C Parity Audit 297: Chat Shop-Floor Price Quote

## Sources

- `nethack-c/upstream/src/sounds.c:1263-1292`: `dochat()` handles silent, strangled, swallowed, and underwater blockers first, then checks `!Deaf && !Blind && shop_object(u.ux, u.uy)` before prompting for a chat direction. A successful shop-floor quote returns `ECMD_TIME`.
- `nethack-c/upstream/src/shk.c:5383-5401`: `shop_object()` requires the resident shopkeeper to be in the shop, a non-coin object on the hero's square, a costly spot, a peaceful shopkeeper, and a shopkeeper able to speak. No-charge objects still qualify.
- `nethack-c/upstream/src/shk.c:2877-2990`: `get_cost()` defaults zero base-cost objects to 5 zorkmids, then applies unknown-item, dunce/tourist, charisma, artifact, and shopkeeper-surcharge adjustments.
- `nethack-c/upstream/src/shk.c:2995-3045`: `contained_cost()` prices non-coin contained goods recursively and skips no-charge contained floor goods.
- `nethack-c/upstream/src/shk.c:5404-5465`: `price_quote()` lists all non-coin objects on the square, shows `Fine goods for sale:` for multi-object quotes, says a one-object no-charge quote with `!`, and says a one-object priced quote with `price N zorkmids[ each]`.

## JS Changes

- Added the pre-direction shop-floor branch to `beginChatCommand()` after the existing speech blockers and before `Talk to whom?`.
- Added `chatShopFloorQuote()` gating for non-deaf, non-blind heroes, resident shopkeeper presence, costly square, peaceful/non-mute shopkeeper state, and at least one non-coin floor object.
- Added a quote-specific C-shaped cost path instead of reusing pickup pricing, including the zero-base and partly-eaten-food 5-zorkmid fallback, ordinary stack `each` wording, globby unit multiplication, recursive contained prices, no-charge top-item contents-only wording, visible-shirt surcharge, and shopkeeper surcharge.
- Added single-object verbal quote handling and multi-object `Fine goods for sale:` overlay handling that consumes the chat turn after the quote/menu is dismissed.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat on single shop-floor object quotes price before direction prompt`
- `chat shop-floor quote uses C default cost for zero-base objects`
- `chat shop-floor quote uses C default cost for partly eaten food`
- `chat shop-floor quote applies C shopkeeper surcharge`
- `chat shop-floor quote uses C visible-shirt surcharge gates`
- `chat on no-charge shop-floor object quotes no charge before direction prompt`
- `chat on coins-only shop floor reaches direction prompt without quote`
- `chat on multiple shop-floor objects shows C price list before direction prompt`
- `chat shop-floor quote names priced contents of no-charge container`
- `blind and deaf heroes reach chat direction instead of shop-floor quote`
- `strangled hero blocks chat before shop-floor quote`
- `angry or helpless shopkeeper cannot quote chat shop-floor goods`

## Remaining Gaps

- Artifact base prices still depend on the local object metadata available to `shopBaseCost()` rather than a full C `arti_cost()` port.
- Unknown glass gem pseudorandom high-price substitution is not modeled in the quote-specific helper.
- The display is represented with the local overlay system, not a full NetHack menu window implementation.
- Broader directed `#chat` target handling remains covered by earlier chat slices and still has separate mimic/statue/object edge gaps.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "chat on single shop-floor object|chat shop-floor quote uses C default cost|chat on multiple shop-floor objects|chat shop-floor quote names|blind and deaf heroes|strangled hero blocks chat before shop-floor quote|angry or helpless shopkeeper|silent polyform chat|chat up without a steed" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`
