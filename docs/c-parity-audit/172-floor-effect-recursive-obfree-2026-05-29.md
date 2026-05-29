# Floor Effect Recursive Obfree 2026-05-29

Implemented a compact floor-effect shop-billing preservation slice. No private fixtures were inspected or encoded.

## C Anchors

- `delete_contents()` extracts each contained object and frees it through `obfree()`: `nethack-c/upstream/src/shk.c:1173`.
- `obfree()` recursively deletes contents before preserving the object's own shop bill row as used-up: `nethack-c/upstream/src/shk.c:1199`.
- Used-up preservation sets `bp->useup`, clears `obj->unpaid`, and stores the row in `billobjs`: `nethack-c/upstream/src/shk.c:1224`.
- `fire_damage()` dumps burned container contents before deleting the container: `nethack-c/upstream/src/trap.c:4495`.
- Dropped floor effects route lava, water, and hot-ground deletion through the floor-effect pipeline: `nethack-c/upstream/src/do.c:161`, `nethack-c/upstream/src/do.c:270`, `nethack-c/upstream/src/do.c:318`.

## JS Work

- Changed `floorEffectRemoveObject()` to use the existing recursive `markObjectTreeShopBillsUsedUp()` helper when the deletion path requests used-up shop-bill preservation.
- Reordered `fireDamageFloorContainer()` so contents are detached and spilled before the burned container is removed, matching C's `fire_damage()` order and avoiding premature used-up marking for children that survive the spill.

## Public Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `floor-effect intact deletion preserves nested bill rows as used-up`
- `lava-burned floor container does not mark surviving spilled child used-up`

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "floor-effect intact deletion|lava-burned floor container|ordinary unpaid carried.*used-up|tipping shop-floor.*used-up" test/shop-billing-helpers.test.mjs`

## Fresh Follow-Up Findings

A parallel read-only arrival audit found that queued down-gate delivery still skips two C arrival details:

- Delivery-time silent breakage for fragile queued objects. Anchors: `nethack-c/upstream/src/dokick.c:1769`, `nethack-c/upstream/src/dokick.c:1826`, `nethack-c/upstream/src/dokick.c:1845`; JS anchor: `js/cmd.js:3446`.
- Exact stair/ladder delivery should call `stackobj()` after placement. Anchors: `nethack-c/upstream/src/dokick.c:1802`, `nethack-c/upstream/src/dokick.c:1836`, `nethack-c/upstream/src/invent.c:4363`; JS anchor: `js/cmd.js:3446`.

A parallel kicked-object audit found that `#kick` does not route ordinary floor objects at all yet:

- C checks object kicks before door/non-door terrain and starts kicked-object flight with `bhit(..., KICKED_WEAPON, ...)`. Anchors: `nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:489`, `nethack-c/upstream/src/dokick.c:736`.
- During flight, C checks `ship_object()` after the object starts moving, so first tests should place the kicked object adjacent to the hero and the down-gate one square beyond it. Anchors: `nethack-c/upstream/src/zap.c:3846`, `nethack-c/upstream/src/zap.c:4049`.
- JS `kickDirection` currently handles statue traps, doors, hurt terrain, then empty space, without selecting floor objects. JS anchor: `js/cmd.js:52790`.

A parallel monster-thrown audit refined the `drop_throw(ohit)` follow-up:

- C breaks cream pies/venom always, eggs only on hit, and applies `should_mulch_missile()` only on hit. Anchors: `nethack-c/upstream/src/mthrowu.c:162`, `nethack-c/upstream/src/dothrow.c:1976`.
- C hit paths pass `ohit=1`, while miss/end-of-path uses `ohit=0`. Anchors: `nethack-c/upstream/src/mthrowu.c:494`, `nethack-c/upstream/src/mthrowu.c:789`, `nethack-c/upstream/src/mthrowu.c:815`.
- JS `landMonsterThrownObject()` already has an `ohit` option for egg breakage, but current throw callers omit hit state and JS lacks a C-shaped missile mulch helper. JS anchors: `js/cmd.js:27765`, `js/cmd.js:27777`, `js/allmain.js:5932`, `js/allmain.js:6211`.

A parallel floor statue audit refined the stone-to-flesh follow-up:

- C `stone_to_flesh_obj()` sends statues to `animate_statue()`, where `cant_revive()`, saved traits, golem conversion, naming, shop debt, historic conduct, content transfer, and deletion are handled. Anchors: `nethack-c/upstream/src/zap.c:1993`, `nethack-c/upstream/src/trap.c:726`.
- C `montraits()` restores saved monster state and resets unsafe live-state fields; petrified statues receive saved traits via `save_mtraits()`/`monstone()`. Anchors: `nethack-c/upstream/src/zap.c:713`, `nethack-c/upstream/src/mkobj.c:2157`, `nethack-c/upstream/src/mon.c:3287`.
- JS floor statue animation still uses only `item.corpsenm`, and `mkcorpstat()` currently drops the source monster data. JS anchors: `js/cmd.js:13482`, `js/cmd.js:13518`, `js/mklev.js:4985`.

## Remaining Gaps

- Queued down-gate delivery silent breakage and arrival stacking remain separate migration slices.
- Kicked-object floor selection and down-gate shipping remain separate.
- Monster-thrown hit-state egg/mulch/passive behavior remains separate.
- Floor statue saved-traits/cant-revive remains separate.
