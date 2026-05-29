# Carried Drop Down Gate 2026-05-29

Implemented a focused migration slice from the fresh carried-drop audit. No private fixtures were inspected.

## C Anchors

- `dropx()` removes the object from inventory, then calls `ship_object()` before altar handling or `dropy()`: `nethack-c/upstream/src/do.c:786`.
- `dropy()`/`dropz()` only call `flooreffects()` after `ship_object()` declines: `nethack-c/upstream/src/do.c:800`.
- `ship_object()` uses `down_gate()`, applies the ladder-aware stay roll, handles shop debt, runs `breaktest()`, then queues migration metadata before impact-drop pile fallout: `nethack-c/upstream/src/dokick.c:1638`.
- `down_gate()` checks down stairs, down ladders, and branch/special stairs before seen holes/trapdoors: `nethack-c/upstream/src/dokick.c:1943`.
- Ladders skip the `rn2(3)` stay roll: `nethack-c/upstream/src/dokick.c:1657`.
- Arrival uses the stored `MIGR_STAIRS_UP`, `MIGR_LADDER_UP`, or `MIGR_SSTAIRS` route to place objects on reciprocal stairs/ladders before random scatter fallback: `nethack-c/upstream/src/dokick.c:1769`.

## JS Work

- Added a carried-only down-gate shipping helper for non-gold inventory drops.
- Reused existing route-aware migration helpers so command-dropped objects carry `MIGR_STAIRS_UP`, `MIGR_LADDER_UP`, or `MIGR_SSTAIRS` metadata to the target level.
- Matched the C order by running carried shipping before `earthFloorEffects()` for ordinary command drops.
- Shared the same helper with `dropCarriedObjectAtHero()`, covering slippery-fingers grease drops without touching projectile, kicked-object, monster-thrown, or carried-gold paths.
- Preserved C ladder RNG shape by skipping the `rn2(3)` stay roll on ladders while still running the break-resistance check.
- Kept seen-hole/trapdoor fallback available through the existing floor-effects path when carried shipping declines.

## Public Tests

Added focused tests in `test/shop-billing-helpers.test.mjs`:

- Command drop on a down stair co-located with a seen hole chooses the stair gate and queues `MIGR_STAIRS_UP`.
- Command drop on a down ladder always falls, omits the stay roll, and delivers on a reciprocal ladder.
- Command drop on branch/special stairs queues `MIGR_SSTAIRS`.
- Command drop on stairs can stay local on the C `rn2(3)` branch.
- Unpaid fragile carried potion on stairs charges shop debt before muffled breakage and never queues migration.
- Slippery-fingers can-of-grease drops use the same carried down-gate shipping helper.

## Fresh Subagent Findings Kept For Next Slices

- Kicked-object down-gate shipping and carried-gold command drops remain separate migration slices.
- Migrated-pile arrival scatter/break refinements remain open.
- Monster-thrown `drop_throw(ohit)` still needs hit-state threading, hit-only missile mulch, and passive-object follow-ups.
- Object polymorph still needs floor amulet-of-unchanging unpolyable parity, affected return semantics, lateral range traversal, and monster-first `bhit()` ordering.
- Stone-to-flesh still needs `cant_revive()` doppelganger fallback, saved monster traits, vertical hiding-under selection, and boulder/restack cleanup.
- `#rub` `getobj()` extraction and remaining `tiphat()` scan/noise reactions remain open command/menu candidates.

## Verification

- `node --check js/cmd.js`
- `node --test --test-name-pattern "command carried drop down|unpaid fragile carried potion down stairs|slippery grease drop uses carried" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "carried object falling through a hole|fragile carried object falling through a hole|projectile down|branch stairs|remote projectile shaft no-drop|slippery grease drop uses carried" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` -> `44/44 passing`
