# Natural Kop Inventory Generation

Date: 2026-06-04

## Summary

Keystone Kops now have source-backed named monster rows and natural inventory generation. All four Kop ranks are modeled as `S_KOP`/glyph `K`, armed hostile wanderers with C rank metadata. Their `m_initweap()` branch now rolls the C 1-in-4 cream-pie stack path independently from the C 1-in-3 club-or-rubber-hose path. Cream pies are generated as 3-4 food stacks through `m_initthrow(CREAM_PIE, 2)`, and clubs/rubber hoses are concrete generated weapon objects. No replay, seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/include/monsters.h:1829` through `:1860`: `Keystone Kop`, `Kop Sergeant`, `Kop Lieutenant`, and `Kop Kaptain` are `S_KOP`, `G_NOGEN`, humanoid hostile male wanderers with `AT_WEAP`.
- `nethack-c/upstream/include/mondata.h:87`: `is_armed(ptr)` is `attacktype(ptr, AT_WEAP)`.
- `nethack-c/upstream/src/makemon.c:402` through `:409`: `S_KOP` rolls `rn2(4)` for `m_initthrow(CREAM_PIE, 2)` and separately rolls `rn2(3)` for either `CLUB` or `RUBBER_HOSE`.
- `nethack-c/upstream/src/makemon.c:147` through `:158`: `m_initthrow()` creates the object with `mksobj(..., TRUE, FALSE)` and sets quantity to `rn1(oquan, 3)`, so `CREAM_PIE, 2` yields 3-4.
- `nethack-c/upstream/src/makemon.c:1441` through `:1444`: natural weapon initialization only runs when inventory is allowed and `is_armed(ptr)` is true.
- `nethack-c/upstream/include/objects.h:371` through `:376`: club is a wooden `P_CLUB` weapon and rubber hose is a plastic `P_WHIP` weapon.
- `nethack-c/upstream/include/objects.h:1100`: cream pie is a white food object.
- `nethack-c/upstream/src/weapon.c:540` through `:545`: `select_rwep()` prefers cream pies for `S_KOP`; full runtime pie selection/blinding remains separate from this generation slice.

## JS Changes

- `js/mklev.js`
  - Adds `S_KOP` and explicit no-random-generation lookup rows for the four Kop ranks.
  - Includes `K` in glyph-to-symbol conversion and marks `S_KOP` rows armed for the C `AT_WEAP` gate.
  - Adds the C `S_KOP` `m_initweap()` branch: independent cream-pie and club/rubber-hose rolls.
  - Adds rubber hose as a generated specific weapon and gives generated club/rubber-hose inventory concrete class, kind, and material metadata.
  - Adds cream pie to `SPECIFIC_FOOD_INFO`, so specific cream-pie objects created through `mksobj()` carry food class/name/plural metadata.
- `test/mklev-themerooms.test.mjs`
  - Adds Kop row coverage for the four ranks.
  - Adds natural generation coverage for 3-4 cream-pie stacks and for both Keystone Kop club and rubber-hose branches.

## Tests

- `Keystone Kop monster rows are armed no-random-generation wanderers`
- `natural Kops generate cream pies and club or rubber hose branches`

## Verification

- `node --check js/mklev.js`
- `node --check test/mklev-themerooms.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "Kop" test/mklev-themerooms.test.mjs` - 2 pass, 50 skipped
- `node --test test/mklev-themerooms.test.mjs` - 52 pass
- `node --test test/shop-billing-helpers.test.mjs` - 1618 pass
- `node --test test/*.test.mjs` - 1769 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Runtime `select_rwep()` parity for Kop cream-pie throwing remains open. This slice generates the natural cream-pie stacks; it does not yet add production monster-turn selection, hero blinding, or one-pie stack splitting for Kops.
- Broader object-registry consolidation remains open for fully canonical weapon and food metadata.
