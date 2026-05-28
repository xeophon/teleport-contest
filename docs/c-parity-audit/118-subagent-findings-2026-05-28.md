# Subagent Findings 118 - Upward Lit Oil Potion Toss-Up

## Implemented Slice: Hero-Thrown Lit Oil Potion Upward Impact

Covered the upward hero-thrown `toss_up()` path for lit oil potions. Lit oil now participates in the same roof/self-hit branch as other supported potions, explodes through the burning-oil helper on self-hit or ceiling break, and bills the single exploded potion when it was unpaid.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`, so `rn2(5)` is consumed before any potion impact details.
- `nethack-c/upstream/src/dothrow.c:1256`: `toss_up()` receives the precomputed roof-hit boolean.
- `nethack-c/upstream/src/dothrow.c:1267`: roof hits call `breaktest()`; potion break resistance consumes `obj_resists(obj, 1, 99)`.
- `nethack-c/upstream/src/dothrow.c:1269`: a breaking roof hit prints the ceiling-hit message before `breakmsg()` and `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: nonbreaking or non-roof upward objects fall back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1289`: upward potion self-hits call `potionhit(&youmonst, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1633`: self-hit potion crashes on the hero's head before potion effects.
- `nethack-c/upstream/src/potion.c:1638`: self-hit potion head damage is `rnd(2)`.
- `nethack-c/upstream/src/potion.c:1683`: lit oil self-hit calls `explode_oil(obj, u.ux, u.uy)`.
- `nethack-c/upstream/src/potion.c:1913`: unpaid self-hit potions convert to shop debt before deletion.
- `nethack-c/upstream/src/dothrow.c:2493`: broken lit oil potions call `explode_oil()` from `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2542`: broken shop objects are checked for billing before `breakobj()` deletes them.
- `nethack-c/upstream/src/explode.c:962`: lit oil explosion damage is `d(4,4)` unless diluted.
- `nethack-c/upstream/src/explode.c:974`: `explode_oil()` extinguishes the object and marks it lost by exploding.

Subagent findings:

- The C audit confirmed upward lit oil is ordinary `toss_up()` delivery plus `explode_oil()`, not the direct horizontal `potionhit()` attack-roll path.
- Self-hit ordering is fall-back wording, bottle crash, `rnd(2)` head damage, burning-oil explosion, then potion cleanup and shop debt conversion.
- Ceiling break ordering is ceiling-hit wording, shatter wording, burning-oil explosion, then broken-object shop/deletion handling.
- C removes the thrown object from inventory before `toss_up()`, so JS must remove the thrown lit oil unit before resolving blast inventory fire effects. Remaining stack items are still eligible for fire damage.
- Unlit oil remains distinct: it can self-hit without evaporation and without a burning-oil explosion.

Covered JS behavior:

- `js/cmd.js`: upward potion support no longer excludes lit oil.
- `js/cmd.js`: lit oil self-hit uses `explodeBurningOilPotion()` after the head-crash damage path.
- `js/cmd.js`: lit oil ceiling break uses `explodeBurningOilPotion()` instead of ordinary broken-potion vapor handling.
- `js/cmd.js`: upward lit oil removes the thrown unit before resolving messages and explosion side effects, preserving C's already-detached thrown object state.
- `js/cmd.js`: unpaid upward lit oil broken by the hero still converts the exploded potion's bill row to shopkeeper debit.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: self-hit lit oil prints fall-back, bottle-crash, `Boom!`, and burning-oil hero damage messages, removes the thrown potion, and consumes `rn2(5)`, bottle-name `rn2(7)`, `rnd(2)`, and `d(4,4)` in order.
- `test/shop-billing-helpers.test.mjs`: ceiling-hit lit oil prints ceiling-hit and shatter messages, explodes, damages the hero, and does not fall back or use ordinary vapor wording.
- `test/shop-billing-helpers.test.mjs`: unpaid upward lit oil converts the broken potion bill entry into shopkeeper debit.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "lit oil|unlit oil" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "venom|cream pie|upward hero-thrown scroll|upward hero-thrown harmless|upward hero-thrown unpaid harmless|melon|ordinary egg|pyrolisk egg|glass-material wand|unknown glass wand|crystal plate mail|upward hero-thrown.*oil" test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem rescue, helmet wording, and corpse-specific falling-object handling before they are safe to implement.
- Generic damaging upward impacts still need full `dmgval()`, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, and heavier falling-object effects.
- Broader burning-oil terrain collateral for fountains, doors, drawbridges, and hero-on-liquid fallout remains with terrain work.
