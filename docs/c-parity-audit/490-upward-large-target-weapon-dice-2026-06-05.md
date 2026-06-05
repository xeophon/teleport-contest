# C Parity Audit 490: Upward Large-Target Weapon Dice

Broadened generic upward falling-weapon damage so supported non-artifact weapons use C's large-target `dmgval()` dice when the hero is polyselfed into a large-or-bigger form. The small-target table remains unchanged for ordinary hero forms; the new branch only changes the weapon base dice and switch extras selected before enchantment, blessed/silver bonuses, erosion, hard-helmet handling, landing, and HP loss.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1349`: generic surviving upward self-hits call `dmgval(obj, &gy.youmonst)`.
- `nethack-c/upstream/include/mondata.h:12`: C `bigmonst(ptr)` is true for `ptr->msize >= MZ_LARGE`.
- `nethack-c/upstream/src/weapon.c:225` through `:261`: `dmgval()` uses `oc_wldam` plus large-target switch extras for big targets.
- `nethack-c/upstream/src/weapon.c:263` through `:326`: non-big targets keep the existing `oc_wsdam` plus small-target switch extras.
- `nethack-c/upstream/src/weapon.c:327` through `:350`: enchantment, vulnerable-form bonuses, and erosion remain after the selected target-size dice.

## JS Changes

- `js/cmd.js`
  - Added a parallel large-target upward weapon damage table for the already supported non-artifact upward weapon rows.
  - Added shared rolling for flat extras, `rnd()` bonus dice, and `d(n,x)` large-target switch extras.
  - Selected the large table when the current upward self-hit target form has explicit big markers or a size value resolving to large-or-bigger through the existing projectile size helper.
  - Kept existing blessed, silver, shade, enchantment, erosion, helmet, and landing order unchanged.

## Tests

- `upward hero-thrown long sword uses large-target damage for large polyself`
- `upward hero-thrown broadsword large polyself uses large flat bonus`
- `upward hero-thrown flail large polyself uses large-target bonus die`
- `upward hero-thrown two-handed sword large polyself uses 2d6 large bonus`

The new tests set an explicit large polyself form and assert HP loss from the logged RNG values rather than fixed seed-derived HP endpoints. They pin `long sword` at `rnd(12)`, `broadsword` at `rnd(6)+1`, `flail` at `rnd(4)+rnd(4)`, and `two-handed sword` at `rnd(6)+d(2,6)`, while preserving the surrounding upward `rn2(5)` and floor-landing RNG shape.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown (long sword|broadsword|flail|two-handed sword)" test/shop-billing-helpers.test.mjs` - pass, 6 matching tests
- `node --test --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass, 110 matching tests
- `node --test` - pass, 1945 tests
- `npm run score` - pass, 44/44 public sessions

## Remaining

- Full C parity still needs additional shade edge canaries, fatal heavy-container canaries, shifted-vampire death channels, and deeper `hitfloor()` landing side effects beyond the currently modeled paths.
