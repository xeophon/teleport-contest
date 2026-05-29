# 130 - Carried shop-billed figurine stone-to-flesh animation

## Implemented Slice

Self-cast stone-to-flesh now animates eligible carried, top-level shop-billed figurines through the C order:

1. mineral/gemstone and figurine monster-kind gates;
2. object resistance before any shop mutation;
3. `makemon(..., NO_MINVENT|MM_NOMSG)`;
4. `stolen_value()`-shaped charging only when the hero is on a costly shop square;
5. transform-timer cleanup and inventory consumption;
6. visible animation message.

C anchors:

- `stone_to_flesh_obj()` material/resistance gates and figurine branch: `nethack-c/upstream/src/zap.c:2002`, `nethack-c/upstream/src/zap.c:2006`, `nethack-c/upstream/src/zap.c:2030`.
- C only calls `stolen_value()` after successful `makemon()` and only on a costly spot: `nethack-c/upstream/src/zap.c:2033`, `nethack-c/upstream/src/zap.c:2035`, `nethack-c/upstream/src/zap.c:2038`.
- C stops timers, then `useup()`s carried figurines: `nethack-c/upstream/src/zap.c:2041`, `nethack-c/upstream/src/zap.c:2043`.
- If a billed carried object is consumed without a prior `stolen_value()`/`subfrombill()` removal, `obfree()` preserves the bill as used-up: `nethack-c/upstream/src/shk.c:1207`, `nethack-c/upstream/src/shk.c:1224`, `nethack-c/upstream/src/shk.c:1226`.

JS changes:

- `stoneToFleshAnimatableCarriedFigurineInfo()` no longer blocks top-level unpaid carried figurines outside the current shop; it only defers figurines with unpaid contents for a later container/content slice: `js/cmd.js:12574`, `js/cmd.js:12586`.
- `stoneToFleshAnimateCarriedFigurine()` now returns ordered charge plus animation messages and consumes the figurine through `useUpInventoryItem()` so outside-shop billed rows become used-up rows: `js/cmd.js:12595`.
- `stoneToFleshChargeFigurineAnimation()` now shares carried/floor debt, credit, and angry-shopkeeper routing while keeping carried `no_charge` objects billable when a live row exists: `js/cmd.js:12610`, `js/cmd.js:12633`.
- Floor figurine charge messaging now only suppresses unseen thief speech for deaf heroes; peaceful debt/credit messages are not accidentally gated by deafness: `js/cmd.js:12619`.

## Tests Added

Added carried shop-billed figurine coverage in `test/shop-billing-helpers.test.mjs`:

- in-shop top-level bill animates, charges debit, clears live bill, clears timer, and creates no used-up row: `test/shop-billing-helpers.test.mjs:3958`;
- carried bill price wins even when the object has `no_charge`: `test/shop-billing-helpers.test.mjs:3989`;
- shop credit is consumed before debit: `test/shop-billing-helpers.test.mjs:4013`;
- angry/non-peaceful shopkeeper loss routes to `robbed`: `test/shop-billing-helpers.test.mjs:4036`;
- resistance is checked before billing or timer cleanup: `test/shop-billing-helpers.test.mjs:4059`;
- outside-shop top-level billed figurine still animates, skips `stolen_value()` debt, and preserves the bill as used-up: `test/shop-billing-helpers.test.mjs:4086`.

## Deferred Gaps From This Agent Round

- Ordinary non-golem, non-vegetarian floor statues still need the `animate_statue()` path, content transfer, and `MM_ADJACENTOK` behavior.
- Burning-oil shop-door damage still needs C-shaped terrain damage records, one `pay_for_damage("burn away", FALSE)` pass, and delayed shop-door repair.
- Projectile/object migration queues still need per-object C-shaped migration metadata while keeping the existing object-array map shape.
- Horizontal ordinary egg hits on monsters still need the C `thitmonst()`/`hmon()` egg path, including `Splat!` and used-up billing.
- Failed stone-to-flesh animation still needs the C corpse fallback for non-unique corpse-leaving targets and preservation for unique/no-corpse targets.
- Deaf shop payment speech still needs the C nonverbal fallbacks for successful payment and partly-used rejection.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs` - 48 pass, 826 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 874/874
- `npm run score` - 44/44
