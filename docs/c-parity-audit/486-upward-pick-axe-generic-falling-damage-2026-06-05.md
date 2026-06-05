# C Parity Audit 486: Upward Pick-Axe Weapon-Tool Falling Damage

Implemented the ordinary hero-thrown pick-axe slice of C `toss_up()` generic falling-object damage. A pick-axe thrown upward now hits or almost hits the ceiling, falls back onto the hero's head, uses weapon-tool `dmgval()` damage, lands before damage is applied, and no longer falls through to direction command assist.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1216` through `:1246`: `harmless_missile()` excludes only the listed harmless objects, empty sacks, uncharged bags of tricks, scrolls, and cloth-material objects; ordinary pick-axes are not harmless.
- `nethack-c/upstream/src/dothrow.c:1256` through `:1285`: `toss_up()` performs the ceiling `breaktest()` when the object hits the roof, otherwise records the `hits` or `almost hits` fall-back action.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1360`: generic non-potion, non-breaking, non-harmless upward objects call `dmgval()`, then fall back to weight-derived damage capped at 6 only when `dmgval()` is zero.
- `nethack-c/upstream/src/dothrow.c:1374` through `:1423`: hard-helmet cap, damage-increase adjustment, `Maybe_Half_Phys()`, and `hitfloor(obj, TRUE)` run before `losehp()`.
- `nethack-c/upstream/src/dothrow.c:603` through `:647`: `hitfloor()` prints the floor-hit message, performs floor break handling, then places or stacks the surviving object.
- `nethack-c/upstream/include/objects.h:1007` through `:1009`: pick-axe is an iron weapon-tool with small-target damage 6, large-target damage 3, weight 100, and `P_PICK_AXE` skill.
- `nethack-c/upstream/src/weapon.c:263` through `:265`: `dmgval()` rolls `rnd(objects[otyp].oc_wsdam)` for normal-size targets when small-target damage is present.

## JS Changes

- `js/cmd.js`
  - Added pick-axe to the generic upward weapon damage table with small-target `d6`.
  - Guarded the generic damaging upward predicate with the modeled C harmless-object predicate before admitting tin openers or supported weapon objects.
  - Reused the existing generic upward object path for ceiling/self/floor breaktest ordering, floor landing, and HP loss.

## Tests

- `upward hero-thrown pick-axe self-hits with weapon-tool damage and lands`

The test covers ceiling roll, self-hit breaktest, `rnd(6)` weapon-tool damage, floor breaktest, landing on the hero square before damage resolution, and absence of command-assist or harmless-object wording.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown pick-axe|upward hero-thrown tin opener|upward hero-thrown plain dagger" test/shop-billing-helpers.test.mjs` - pass, 4 matching tests
- `git diff --check` - pass
- `node --test` - pass, 1930 tests
- `npm run score` - pass, 44/44

## Remaining

- Broader generic upward falling-object damage remains incomplete for non-harmless charged bags of tricks, nonempty sacks, additional weapon-tools, artifacts, silver/blessed form bonuses, special polyself target forms, soft terrain, and full landing side effects beyond the currently modeled paths.
