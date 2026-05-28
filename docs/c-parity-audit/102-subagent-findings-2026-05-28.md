# Subagent Findings 102 - Thrown Gold Shaft Shipping

## Implemented Slice: Remote Seen-Hole/Trapdoor `ship_object()` For Thrown Gold

Extended the remote seen-shaft shipping row to cover horizontal thrown gold. C routes thrown gold through `ship_object()` before floor effects, current-level placement, shop donation, and stacking. JS previously excluded gold from the remote shipping helper, so thrown gold landing on a seen remote shaft could still donate to a shopkeeper and stack on the current level.

C source:

- `nethack-c/upstream/src/dothrow.c:2655`: `throw_gold()` is the dedicated gold throw path.
- `nethack-c/upstream/src/dothrow.c:2711`: gold hitting a monster uses `ghitm()` and does not run shipping in that branch.
- `nethack-c/upstream/src/dothrow.c:2715`: when no monster catches/hits the gold, `ship_object()` runs before floor effects.
- `nethack-c/upstream/src/dothrow.c:2721`: only after shipping declines does gold run `flooreffects()`.
- `nethack-c/upstream/src/dothrow.c:2725`: current-level `place_object()`, shop `sellobj()`, and `stackobj()` happen after shipping has declined.
- `nethack-c/upstream/src/dokick.c:1651`: `ship_object()` starts with `down_gate()`.
- `nethack-c/upstream/src/dokick.c:1657`: holes and trap doors use the ordinary `rn2(3)` stay/fall branch.
- `nethack-c/upstream/src/dokick.c:1684`: visible transit wording precedes debt, breakage, migration, and impact-drop.
- `nethack-c/upstream/src/dokick.c:1717`: successful shipping still runs `breaktest()` before migration; gold does not break but still follows that order.
- `nethack-c/upstream/src/dokick.c:1743`: shipped objects migrate and skip current-level place/sell/stack.

JS now mirrors the covered row:

- `js/cmd.js:21065`: `remoteProjectileShaftTrapAt()` keeps the non-gold default but can opt into gold shipping for the thrown-gold path.
- `js/cmd.js:21079`: `maybeShipRemoteProjectileObject()` now accepts shipping options and reuses the same transit, branch, impact-drop, and migration ordering for gold.
- `js/cmd.js:21145`: `landProjectileObjectWithShopHandling()` initializes one shipping result that can be reused across pre-floor and post-floor paths.
- `js/cmd.js:21146`: thrown gold attempts remote seen-hole/trapdoor shipping before `earthFloorEffects()`.
- `js/cmd.js:21148`: shipped gold returns immediately, skipping shop landing, shop donation, and stacking on the current level.
- `js/cmd.js:21161`: when gold does not ship, floor effects and normal placement/donation/stacking continue with the no-drop shipping result preserved.
- `js/cmd.js:21173`: non-gold projectiles keep their post-floor shipping position.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:20249`: falling thrown gold ships before shop donation and stacking, queues the projectile before the impacted floor gold, and leaves existing shop debit/credit untouched.
- `test/shop-billing-helpers.test.mjs:20277`: a no-drop gold branch can impact existing floor gold before continuing into normal shop donation and placement.
- Existing tests at `test/shop-billing-helpers.test.mjs:20213` and `test/shop-billing-helpers.test.mjs:20233` continue to cover ordinary thrown-gold donation/stacking and shopkeeper-square no-donation behavior.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- Focused `node --test --test-reporter=spec --test-name-pattern 'thrown gold|remote shaft|remote projectile|same-shop projectile|rock projectile' test/shop-billing-helpers.test.mjs`

## Remaining Gold/Shipping Gaps

- Downstairs, down-ladder, and special-stairs `down_gate()` destinations remain separate. C `down_gate()` supports them, and ladders skip the ordinary `rn2(3)` stay roll.
- Kicked gold/object shipping remains separate because `kick_object()` has distinct gold scatter, `ghitm()`, shop, breakage, and placement ordering.
- Monster-thrown ordering remains separate because C monster projectile landing checks shipping in the monster throw/drop path, not the hero gold path.
- Gold hitting/caught-by-monster behavior through `ghitm()` remains separate from the no-monster remote-shaft slice.

## Fresh Follow-Up Audits

### Upward Hero-Thrown Potion Self-Hit

C source:

- `nethack-c/upstream/src/dothrow.c:1579`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1255`: `toss_up()` handles the object falling back onto the hero.
- `nethack-c/upstream/src/dothrow.c:1289`: upward self-hit potions call `potionhit(&gy.youmonst, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1633`: hero-targeted `potionhit()` uses the self-hit branch.
- `nethack-c/upstream/src/potion.c:1679`: bottle crash on the hero causes `rnd(2)` hit point loss.
- `nethack-c/upstream/src/potion.c:1906`: non-oil self-hit evaporation creates distance-zero vapor.

Current JS gap: `movementDirection()` knows `<` and `>`, but the throw command treats every direction as an XY landing. A thrown upward potion lands on the hero square through `landProjectileObjectWithShopHandling()` instead of using C's `toss_up()` and self `potionhit()` path.

Smallest future slice: implement upward non-special potion self-hit with potion of confusion as the representative case. Defer lit oil, acid, polymorph, and other special self effects.

### Carried Figurine Stone-To-Flesh Animation

C source:

- `nethack-c/upstream/src/zap.c:2966`: self-cast stone-to-flesh walks inventory through `bhito()`.
- `nethack-c/upstream/src/zap.c:2002`: mineral/gemstone objects pass the material gate.
- `nethack-c/upstream/src/zap.c:2006`: eligible objects run `obj_resists(obj, 2, 98)`.
- `nethack-c/upstream/src/zap.c:2017`: statues and figurines enter the corpstat branch; vegetarian non-golems become meatballs.
- `nethack-c/upstream/src/zap.c:2031`: figurine golems redirect to flesh golem.
- `nethack-c/upstream/src/zap.c:2033`: successful figurine animation calls `makemon(..., NO_MINVENT | MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2041`: successful animation consumes the figurine and prints the animation message.

Current JS gap: carried vegetarian figurines already become meatballs, but non-vegetarian and golem figurines currently do not animate after passing the C material/resistance gates.

Smallest future slice: non-shop, carried self-cast figurine animation only. Defer floor figurines, statues, shop billing, contents transfer, and failed-animation corpse fallback.

### Forced-Chest Ice-Box Survivor Thaw

C source:

- `nethack-c/upstream/include/obj.h:338`: ice boxes are excluded from normal forceable boxes.
- `nethack-c/upstream/src/lock.c:717`: real `#force` targeting keeps ice boxes out.
- `nethack-c/upstream/src/lock.c:184`: helper-level broken ice-box surviving contents thaw/restart timers during `breakchestlock()`.
- `nethack-c/upstream/src/pickup.c:2644`: inserting corpses into ice boxes freezes corpse aging.
- `nethack-c/upstream/src/pickup.c:2781`: removing corpses from ice boxes restores corpse aging/timers.

Current JS gap: real force targeting already excludes ice boxes, but broken-content placement helpers do not thaw surviving corpse/glob contents if a helper-level destroyed source container is an ice box.

Smallest future slice: keep real `#force` targeting unchanged; only pass the destroyed source container into broken-content placement and call the existing ice-box removal helper for surviving corpse/glob contents from ice boxes.
