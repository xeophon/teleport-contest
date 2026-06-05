# C Parity Audit 491: Upward Fatal Heavy-Container Canaries

Added source-backed regression canaries for fatal upward heavy-container self-hits. The existing JS path already computes generic falling-object damage, lands the object through the projectile floor/shop helper, and only then applies fatal HP loss; these tests pin that C ordering for ordinary sacks, magic-bag weight adjustment, shop content impact, and hard-helmet fatal wording.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used. The canaries force the upward self-hit path with underwater hero flags where possible and use logged RNG values to assert damage shape rather than seed-derived HP endpoints.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1589`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`, so underwater still consumes the toss-up `rn2(5)` but forces the non-roof-hit self-hit path.
- `nethack-c/upstream/src/dothrow.c:1291`: surviving non-potion upward self-hits run a second `breaktest(obj)` before generic falling damage.
- `nethack-c/upstream/src/dothrow.c:1356` through `:1359`: non-weapon generic falling damage uses `ceil(obj->owt / 100)`, rolls `rnd(max)` when the bucket is above one, then caps the result at 6.
- `nethack-c/upstream/src/mkobj.c:1911` and `:1950`: bag-of-holding contents adjust object weight by cursed double, blessed quarter, or uncursed half rules before weight damage.
- `nethack-c/upstream/src/dothrow.c:1374` through `:1376`: hard helmets cap positive non-silver damage to 1 before `u.udaminc` and half-physical damage.
- `nethack-c/upstream/src/dothrow.c:1420` through `:1423`: `hitfloor(obj, TRUE)` occurs before `losehp(dmg, "falling object", KILLED_BY_AN)`.
- `nethack-c/upstream/src/do.c:827` and `nethack-c/upstream/src/dokick.c:422`: hard floor placement can run container content impact before the fatal `losehp()` call.

## JS Coverage

- `js/cmd.js`
  - `heroThrownGenericObjectFallingDamage()` already uses the C-shaped weapon-or-weight fallback, weight bucket roll, max-6 cap, hard-helmet cap, `u.udaminc`, and half-physical ordering.
  - `heroThrownGenericObjectSelfHitMessages()` already emits the self-hit message, top-level breaktest, damage calculation, helmet/silver messages, floor landing, `landProjectileObjectWithShopHandling()`, and finally fatal HP loss.
  - `landProjectileObjectWithShopHandling()` already places hard-landing projectiles and runs `projectileContainerImpactDmg()` before later death handling.

## Tests

- `upward hero-thrown heavy sack bills broken contents before fatal falling-object damage`
  - Pins ordinary sack hard landing in a shop: floor message, contained potion break/debt, and content removal all occur before `You die...`.
  - Asserts the toss-up RNG prefix `rn2(5)`, `rn2(100)`, `rnd(6)`, `rn2(100)` and derives HP loss from the logged `rnd(6)` value.
- `upward hero-thrown cursed bag of holding fatal self-hit rolls adjusted contents weight before cap`
  - Pins fatal magic-bag weight damage using cursed bag-of-holding contents, including the adjusted `rnd(11)` bucket before the max-6 cap and landing-before-death order.
- `upward hero-thrown heavy container hard helmet can still be fatal at one HP`
  - Pins the hard-helmet fatal branch: damage is capped to 1, the message is `Your helm does not protect you.`, the heavy sack lands before death, and the helmet remains worn.

## Verification

- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown (heavy sack|cursed bag of holding fatal|heavy container hard helmet|cursed bag of holding doubles)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass, 113 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1797 tests
- `node --test` - pass, 1948 tests
- `npm run score` - pass, 44/44 public sessions

## Remaining

- Full C parity still needs additional shade edge canaries, shifted-vampire death channels, and deeper `hitfloor()` landing side effects beyond the currently modeled paths.
