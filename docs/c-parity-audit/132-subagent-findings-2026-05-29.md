# 132 - Shop-floor statue stone-to-flesh animation

## Implemented Slice

Downward stone-to-flesh now animates eligible shop-floor ordinary statues instead of skipping costly spots. The spell path follows the C `animate_statue()` ordering for the covered no-trap, no-saved-traits case:

1. material, corpstat, trap, and resistance gates;
2. allow costly spots instead of rejecting shop floors;
3. `makemon(..., NO_MINVENT|MM_NOMSG|MM_ADJACENTOK)`;
4. clear sleeping and hidden state;
5. print the visible statue animation message;
6. convert live bill rows and billable contents into shop debt;
7. transfer statue contents into monster inventory;
8. delete the statue and redraw the statue and monster squares.

C anchors:

- `stone_to_flesh_obj()` dispatches statues to `animate_statue()` for stone-to-flesh: `nethack-c/upstream/src/zap.c:1991`, `nethack-c/upstream/src/zap.c:2017`, `nethack-c/upstream/src/zap.c:2027`.
- `animate_statue()` creates the monster, prints the animation message, charges costly shop squares, transfers contents, and deletes the statue in that order: `nethack-c/upstream/src/trap.c:713`, `nethack-c/upstream/src/trap.c:817`, `nethack-c/upstream/src/trap.c:825`, `nethack-c/upstream/src/trap.c:861`, `nethack-c/upstream/src/trap.c:867`, `nethack-c/upstream/src/trap.c:880`, `nethack-c/upstream/src/trap.c:890`.
- `stolen_value()` snapshots top object and contents billing, removes live bill rows, charges unbilled non-`no_charge` objects, and uses debt/robbed wording based on shopkeeper state: `nethack-c/upstream/src/shk.c:3661`, `nethack-c/upstream/src/shk.c:3694`, `nethack-c/upstream/src/shk.c:3754`, `nethack-c/upstream/src/shk.c:3781`, `nethack-c/upstream/src/shk.c:3800`, `nethack-c/upstream/src/shk.c:3743`, `nethack-c/upstream/src/shk.c:3818`, `nethack-c/upstream/src/shk.c:3857`.

JS changes:

- `stoneToFleshFloorStatueAnimationInfo()` no longer rejects shop-floor statues just because a resident shopkeeper owns the square: `js/cmd.js:12666`.
- `stoneToFleshAnimateFloorStatue()` now emits the animation message before invoking the existing statue shop-debt helper, then transfers contents after debt conversion: `js/cmd.js:12681`, `js/cmd.js:12691`.
- `stoneToFleshFloorEffect()` accepts the statue animation result as a message list, matching the existing figurine multi-message path: `js/cmd.js:12833`.

## Tests Added

Added shop-floor ordinary statue coverage in `test/shop-billing-helpers.test.mjs`:

- existing live bill plus contents animates, removes the bill row, charges debt after the animation message, and transfers contents to the monster: `test/shop-billing-helpers.test.mjs:4860`;
- unbilled zero-price shop-floor statue animates without debt, bill rows, or used-up preservation: `test/shop-billing-helpers.test.mjs:4893`;
- `no_charge` shop-floor statue animates without shop debt: `test/shop-billing-helpers.test.mjs:4917`;
- resistance failure happens before shop debt and preserves the statue: `test/shop-billing-helpers.test.mjs:4940`.

## Deferred Gaps From This Agent Round

- Statue-trap statue animation still needs C `animate_statue()` parity.
- Saved monster traits, historic/named statues, mimic visibility, worn statue cleanup, `m_dowear()`, directed doppelganger retargeting, and full `cant_revive()` handling remain deferred.
- Failed stone-to-flesh animation still needs the C corpse/no-corpse fallback matrix for carried figurines and floor figurines/statues.
- Horizontal ordinary egg hits on monsters still need the direct `thitmonst()`/`hmon()` egg path, including `Splat!`, live-egg petrifier conversion, and used-up billing.
- Burning-oil shop-door terrain damage still needs damage records, `pay_for_damage("burn away", FALSE)`, and delayed repair.
- Thrown-gold stairs/ladders/special-stairs migration, kicked-object shipping, and richer migration records remain open.
- Deaf shop payment speech still needs its source-backed C fallback audit because the subagent round hit the thread cap before assigning it.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs` - 55 pass, 826 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 881/881
- `npm run score` - 44/44
