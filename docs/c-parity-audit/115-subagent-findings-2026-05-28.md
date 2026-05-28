# Subagent Findings 115 - Upward Harmless Missile Toss-Up

## Implemented Slice: Harmless Upward Self-Hit and Landing

Covered the upward hero-thrown `toss_up()` branch for objects C treats as `harmless_missile()`: scrolls, the explicit harmless object list, uncharged rubber hoses and bags of tricks, empty sacks/oilskin sacks/bags of holding, and cloth-material objects. These objects now use the ceiling/no-ceiling trajectory wording, print `It doesn't hurt.`, skip hero damage, and then land through the shared projectile shop/floor placement path.

C source:

- `nethack-c/upstream/src/dothrow.c:1220`: `harmless_missile()` defines the exact harmless predicate.
- `nethack-c/upstream/src/dothrow.c:1226`: always-harmless explicit list includes slings, eucalyptus leaves, kelp fronds, sprigs of wolfsbane, fortune cookies, and pancakes.
- `nethack-c/upstream/src/dothrow.c:1233`: rubber hoses and bags of tricks are harmless only while `spe < 1`.
- `nethack-c/upstream/src/dothrow.c:1236`: sacks, oilskin sacks, and bags of holding are harmless only when empty.
- `nethack-c/upstream/src/dothrow.c:1241`: scroll-class objects are harmless, but not every paper object is.
- `nethack-c/upstream/src/dothrow.c:1243`: cloth-material objects are harmless.
- `nethack-c/upstream/src/dothrow.c:1256`: `toss_up()` receives the already-decided roof-hit boolean.
- `nethack-c/upstream/src/dothrow.c:1265`: no-ceiling levels use `flies up into`.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit objects first run `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1284`: survivors fall back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1337`: harmless survivors print `It doesn't hurt.` and call `hitfloor(obj, FALSE)`.
- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`.

Subagent findings:

- The C audit confirmed the predicate ordering matters: charged rubber hoses/bags of tricks and nonempty sacks/bags do not fall through to the cloth-material fallback.
- The C audit also confirmed ordinary harmless nonbreak cases consume `rn2(5)`, then one `rn2(100)` self-hit break test, plus an additional roof `rn2(100)` and floor `rn2(100)` when applicable.
- The JS audit identified the existing upward branches for potions, cream pies, venom, melons, eggs, and fragile objects; harmless nonbreak objects were falling through to direction assist.
- The test audit selected scroll, harmless food, and unpaid-stack shop-return cases as the public-facing smoke surface.

Covered JS behavior:

- `js/cmd.js`: added `isHeroThrownHarmlessUpwardObject()` with the C harmless predicate, including the special charged/contents exclusions before material fallback.
- `js/cmd.js`: harmless upward objects now share the established ceiling/no-ceiling/underwater wording helpers.
- `js/cmd.js`: harmless self-hits run top-level break checks before deciding the object did not hurt, matching C's `breaktest()` ordering.
- `js/cmd.js`: surviving harmless objects land with `landProjectileObjectWithShopHandling()` so shop-floor return, bill-row splitting, and floor placement stay on the existing projectile path.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: scrolls can almost hit the ceiling, fall back, print `It doesn't hurt.`, and land on the hero square.
- `test/shop-billing-helpers.test.mjs`: scrolls can hit the ceiling first and consume the extra roof break-test RNG call before harmless self-hit landing.
- `test/shop-billing-helpers.test.mjs`: harmless food does not damage the hero and lands as an object after the self-hit.
- `test/shop-billing-helpers.test.mjs`: throwing one unpaid pancake from a billed stack splits one unit, returns that unit to the shop floor as no-charge stock, and leaves the parent bill row at one unit.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "upward hero-thrown unpaid harmless" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "venom|cream pie|upward hero-thrown scroll|upward hero-thrown harmless|upward hero-thrown unpaid harmless" test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Crackable glass armor remains separate because C gives glass armor a 90% nonbreak chance and routes breakage through `is_crackable()`/`erode_obj()` instead of deleting it.
- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic damaging upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, and survivor `hitfloor()` disposition.
