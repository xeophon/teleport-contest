# Subagent Findings 116 - Upward Crackable Glass Armor Toss-Up

## Implemented Slice: Crackable Glass Armor Upward Impact

Covered the upward hero-thrown `toss_up()` branch for crackable glass armor, focused on crystal plate mail and the same armor-material predicate C uses for `is_crackable()`. These objects now use the C-shaped roof/self/floor break-test ordering, crack through erosion instead of ordinary object shatter, and preserve the existing projectile landing/shop return path when they survive.

C source:

- `nethack-c/upstream/src/dothrow.c:1256`: `toss_up()` receives the already-decided roof-hit boolean.
- `nethack-c/upstream/src/dothrow.c:1265`: no-ceiling levels use `flies up into`.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit objects run `breaktest()` before the self-hit path.
- `nethack-c/upstream/src/dothrow.c:1270`: a roof break prints the ceiling-hit message, calls `breakmsg()`, then `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-break survivors fall back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1309`: self-hit objects run a second `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/include/objclass.h:201`: `is_crackable()` is glass-material armor.
- `nethack-c/upstream/src/dothrow.c:2489`: `breakobj()` routes crackable armor to `erode_obj(..., ERODE_CRACK, EF_DESTROY | EF_VERBOSE)`.
- `nethack-c/upstream/src/dothrow.c:2582`: `breaktest()` gates breakage and gives crackable glass armor a 90% nonbreak chance.
- `nethack-c/upstream/src/dothrow.c:2616`: `breakmsg()` returns silently for crackable armor.

Subagent findings:

- The C audit confirmed upward throws always consume `rn2(5)` first, then crackable roof/self/floor break tests consume `rn2(100)` in the same order as C.
- Crackable armor differs from ordinary glass/crystal fragile objects: it has a 90% nonbreak chance, can survive as progressively cracked armor, and only shatters once already fully cracked.
- Crack damage uses `erode_obj()` with no `EF_PAY`, so the crack itself is not a costly alteration. If the armor shatters, the unpaid object is preserved through used-up billing; if it survives and lands in its shop, normal projectile landing can return it as no-charge stock.
- The JS audit found that `crystal plate mail` was already recognized as an ordinary shatterable fragile object, so this slice needed a dedicated upward branch before the generic fragile-object branch.
- The test audit selected self-hit crack, roof shatter, and unpaid shop-return cases to cover the high-risk RNG, message, and billing ordering.

Covered JS behavior:

- `js/cmd.js`: added a crackable armor predicate based on armor class plus glass material or crackable erosion metadata.
- `js/cmd.js`: added crackable armor impact helpers for `rn2(100)` break tests, erosion-crack messages, fully cracked shatter, and silent roof `breakmsg()` behavior.
- `js/cmd.js`: upward crackable armor now branches before generic fragile handling so crystal plate mail does not use the ordinary "thousand pieces" path.
- `js/cmd.js`: surviving crackable armor lands through `landProjectileObjectWithShopHandling()` with top-level shatter skipped, allowing C-shaped shop return and floor placement after the crack path has run.
- `js/cmd.js`: floor impacts after roof/self hits can run the second crackable floor break test, matching `hitfloor()`'s hard-ground behavior for this slice.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: crystal plate mail can almost hit the ceiling, fall back on the hero, crack once, land on the hero square, and leave HP unchanged because the break path consumed the self-hit.
- `test/shop-billing-helpers.test.mjs`: fully cracked crystal plate mail can hit the ceiling and shatter without falling back or printing ordinary glass shatter text.
- `test/shop-billing-helpers.test.mjs`: unpaid crystal plate mail that cracks and survives in the shop returns to the shop floor without usage debt, robbery, or a residual bill row.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "upward hero-thrown.*crystal plate mail" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "venom|cream pie|upward hero-thrown scroll|upward hero-thrown harmless|upward hero-thrown unpaid harmless|glass-material wand|unknown glass wand|crystal plate mail" test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering.
- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic damaging upward impacts still need full `dmgval()`, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, and heavier falling-object effects beyond this crackable armor slice.
