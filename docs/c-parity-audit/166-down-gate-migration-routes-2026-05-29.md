# Down-Gate Migration Routes 2026-05-29

Implemented the next object-shipping slice after a fresh six-agent audit round. No private fixtures were inspected.

## C Anchors

- `down_gate()` checks down stairs and down ladders before seen holes/trap doors, returning `MIGR_STAIRS_UP`, `MIGR_SSTAIRS`, `MIGR_LADDER_UP`, or `MIGR_RANDOM`: `nethack-c/upstream/src/dokick.c:1943`.
- `ship_object()` uses that gate, skips the `rn2(3)` stay roll for ladders, records the migration destination in `owornmask`, and keeps origin-level metadata through `add_to_migration()`: `nethack-c/upstream/src/dokick.c:1638`, `nethack-c/upstream/src/dokick.c:1657`, `nethack-c/upstream/src/mkobj.c:2698`.
- `obj_delivery()` decodes `MIGR_STAIRS_UP`, `MIGR_LADDER_UP`, and `MIGR_SSTAIRS`, finds the reciprocal stair/ladder from the origin level, and places arriving objects there before break/scatter handling: `nethack-c/upstream/src/dokick.c:1769`, `nethack-c/upstream/src/dokick.c:1802`, `nethack-c/upstream/src/stairs.c:64`.
- `goto_level()` invokes object delivery after level arrival, with a later with-hero delivery pass for trapdoor cases: `nethack-c/upstream/src/do.c:1815`, `nethack-c/upstream/src/do.c:1978`.

## JS Work

- Added a shared `downGateAt(x, y)` route helper in `js/cmd.js` that recognizes down stairs, down ladders, branch/special stairs, then trap holes/trap doors.
- Extended projectile, thrown-gold, and monster-thrown terminal shipping to use those route records while preserving existing seen-hole/trapdoor behavior.
- Added ladder-specific always-drop behavior by skipping the `rn2(3)` no-drop roll for `MIGR_LADDER_UP`.
- Added per-object migration metadata while preserving the existing raw-object queue shape used by public tests.
- Delivered route-tagged queued objects to reciprocal stairs/ladders on level arrival and from the test hook; ordinary random shaft deliveries remain random.
- Drained queued object deliveries during ordinary `>` and `<` stair transitions as well as the broader level-teleport path.

## Public Tests

Added focused tests in `test/shop-billing-helpers.test.mjs`:

- Down stairs are selected before a co-located seen hole and queue `MIGR_STAIRS_UP`.
- Down ladders skip the `rn2(3)` stay roll, queue `MIGR_LADDER_UP`, and deliver on the reciprocal ladder.
- Branch stairs queue `MIGR_SSTAIRS` metadata.

## Fresh Subagent Findings Kept For Next Slices

- `getobj()` extraction remains useful, but `#tip` has public compatibility around gold filtering. Safest path is an apply-only selection-model extraction before changing `#rub *` or `#tip *` behavior.
- `tiphat()` still needs conflict derived from worn rings/intrinsics, C-shaped hostile/conflicted RNG wording, and focused tests for peaceful humanoid helmet responses. Steeds, statues, unseen monsters, and nonhumanoid sounds need later scan/audio work.
- Lateral wand polymorph still needs true `bhit()` traversal: range `rn2(8)+6`, monster-first hits, affected-only pile range accounting, floor amulet-of-unchanging unpolyability, and C pile ordering.
- Monster-thrown `drop_throw(ohit)` still needs production hit-state threading, hit-only missile mulch, and passive-object effects after surviving hit objects land.
- Stone-to-flesh/object polymorph leftovers remain: upward hiding-under pile targeting, `cant_revive` fallback, saved monster traits for petrified statue/corpse revival, and boulder/restack cleanup.

## Verification

- `node --check js/cmd.js`
- `node --test --test-name-pattern='down stairs|down ladder|branch stairs|remote shaft|falling through remote|monster-thrown dagger falling through remote' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` -> `44/44 passing`
