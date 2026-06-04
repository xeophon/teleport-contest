# Natural Kobold Dart Generation And Runtime

Date: 2026-06-04

## Summary

Natural weapon-using kobolds now have a source-backed generation and runtime regression slice. `kobold`, `large kobold`, and `kobold leader` retain the C `S_KOBOLD` 1-in-4 dart-stack branch, with 3-14 ordinary darts. `kobold shaman` remains excluded because it lacks `AT_WEAP`. Production dart throwing now accepts the modeled kobold family rather than only exact-name `kobold`, requires the JS `armed` marker for the C `AT_WEAP` gate, and splits stacked darts so a one-dart thrown object lands while the carried stack decrements. No replay, seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/include/mondata.h:87`: `is_armed(ptr)` is `attacktype(ptr, AT_WEAP)`.
- `nethack-c/upstream/src/makemon.c:147` through `:158`: `m_initthrow()` creates the object with `mksobj(..., TRUE, FALSE)`, overwrites quantity with `rn1(oquan, 3)`, recomputes weight, and only force-poisons `ORCISH_ARROW`.
- `nethack-c/upstream/src/makemon.c:469` through `:471`: `S_KOBOLD` rolls `rn2(4)` and calls `m_initthrow(mtmp, DART, 12)` on success.
- `nethack-c/upstream/src/makemon.c:1441` through `:1444`: monster weapon initialization only runs when inventory is allowed and `is_armed(ptr)` is true.
- `nethack-c/upstream/include/monsters.h:624` through `:648`: ordinary, large, and leader kobolds are `S_KOBOLD` and have `AT_WEAP`.
- `nethack-c/upstream/include/monsters.h:649` through `:656`: kobold shaman is `S_KOBOLD` but has `AT_MAGC`, so it is not naturally weapon-initialized.
- `nethack-c/upstream/include/objects.h:160` through `:162`: darts are ordinary iron hand-thrown missiles with `-P_DART`.
- `nethack-c/upstream/src/weapon.c:498` through `:503`: `DART` is in the monster ranged-weapon preference list.
- `nethack-c/upstream/src/weapon.c:627` through `:664`: `select_rwep()` resets the propellor to hands for darts and can select an unwelded, non-artifact dart stack.
- `nethack-c/upstream/src/mthrowu.c:593` through `:614`: `m_throw()` extracts a singleton directly, but uses `splitobj(obj, 1L)` for stacks.

## JS Changes

- `js/mklev.js`
  - Already marked `kobold`, `large kobold`, and `kobold leader` as armed natural `S_KOBOLD` monsters.
  - Already left `kobold shaman` unarmed, so natural generation does not call `m_initweap()` for it.
  - Keeps the `S_KOBOLD` `m_initthrow(DART, 12)` branch and shared 3-14 stack quantity handling.
- `js/allmain.js`
  - Adds a kobold-family dart eligibility helper for production monster turns.
  - Requires `data.armed === true` before using the family dart path, matching the C `AT_WEAP` runtime gate.
  - Splits multi-dart stacks by decrementing the carried stack and landing a one-dart thrown object with a separate id.
- `test/mklev-themerooms.test.mjs`
  - Adds natural generation coverage for ordinary, large, and leader kobold dart stacks, plus shaman exclusion.
- `test/shop-billing-helpers.test.mjs`
  - Extends the production dart harness to vary monster name, monster data, and dart quantity.
  - Adds production coverage for large kobold, kobold leader, stack splitting, and shaman exclusion.

## Tests

- `natural weapon-using kobolds generate dart stacks`
- `production large kobold dart hit uses kobold-family ranged path`
- `production kobold leader dart hit uses kobold-family ranged path`
- `production kobold dart stack splits one thrown dart`
- `production kobold shaman does not use kobold dart path`

## Verification

- `node --check js/allmain.js`
- `node --check test/mklev-themerooms.test.mjs`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "natural weapon-using kobolds|production (kobold|large kobold|kobold leader|kobold shaman) dart|production kobold dart stack|monster-thrown dart" test/mklev-themerooms.test.mjs test/shop-billing-helpers.test.mjs` - 11 pass, 1657 skipped
- `node --test test/mklev-themerooms.test.mjs` - 50 pass
- `node --test test/shop-billing-helpers.test.mjs` - 1618 pass
- `node --test test/*.test.mjs` - 1767 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Generic `select_rwep()` unification remains open; this slice keeps the existing bespoke dart branch but broadens it only to the C-backed natural kobold family.
- The dart branch still has simplified visible throw/catch/hit wording compared with full `thrwmu()`/`monshoot()`.
- Keystone Kop cream-pie and club/rubber-hose inventory generation remains open.
