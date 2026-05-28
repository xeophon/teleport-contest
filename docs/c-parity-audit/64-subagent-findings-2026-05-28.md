# Forced Chest Material Wording

## Scope

Parallel audits checked the planned ordinary-drop `sellobj()` owner-routing slice and the independent forced-chest content wording gap. The implemented slice covers material-specific messages for non-potion contents destroyed when forcing a box.

## C Anchors

- `dropz()` places an ordinary dropped object and calls `sellobj(obj, u.ux, u.uy)` before stacking at `nethack-c/upstream/src/do.c:807`.
- `sellobj()` is square/room-first: it selects `shop_keeper(*in_rooms(x, y, SHOPBASE))`, requires `costly_spot(x, y)`, and passes that shopkeeper to `sub_one_frombill()`/`subfrombill()` at `nethack-c/upstream/src/shk.c:3927`, `nethack-c/upstream/src/shk.c:3942`, `nethack-c/upstream/src/shk.c:3946`, and `nethack-c/upstream/src/shk.c:3975`.
- `find_objowner()` is the shared-shop owner-aware helper at `nethack-c/upstream/src/shk.c:1082`, but ordinary `sellobj()` does not call it. The prior owner-first ordinary-drop plan item is therefore not source-backed as written.
- Forced-box destruction extracts contents, destroys potions or a one-in-three roll, prints `chest_shatter_msg()`, then removes one unit at `nethack-c/upstream/src/lock.c:184`.
- `chest_shatter_msg()` maps object material to wording at `nethack-c/upstream/src/lock.c:1294`: paper tears, wax crushes, veggie pulps, flesh mashes, glass shatters, wood splinters, and all other materials are destroyed.
- The material enum lives at `nethack-c/upstream/include/objclass.h:12`.

## JS Status

- `brokenChestContentDestroyedMessage()` already handled potion bottle/vapor messages separately.
- Non-potion contents now use a small material classifier before choosing the C disposition string.
- The forced-box sequencing is unchanged: the content message still happens before shop-loss recording, stack survivor placement, and final debt text.
- The existing contained-container test was corrected from the old paper-like wording to C's default material wording for sacks/bags.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks forced-box non-potion destruction messages for:

- paper scroll: `is torn to shreds`
- tallow candle: `is crushed`
- cream pie: `is pulped`
- meat ring: `is mashed`
- looking glass: `shatters`
- quarterstaff: `splinters to fragments`
- lock pick: `is destroyed`

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "destroyed.*box" test/shop-billing-helpers.test.mjs`

## Remaining Work

- Ordinary drop `sellobj()` still has sale/prompt parity gaps, but owner-first routing should not be implemented for that path without a new C anchor; C uses the square-selected shopkeeper there.
- Forced chest still has independent gaps around blade breakage during long forcing and blunt-tool wake-nearby behavior.
- Broader object registry work would let material checks come from canonical object metadata instead of localized fallback classification.
