# 128 - Shop-billed floor figurine stone-to-flesh animation

## Implemented slice

Downward stone-to-flesh casts now animate eligible floor figurines on shop squares instead of excluding all billed or costly locations. The successful shop-floor path keeps the C order: material and resistance gates first, monster creation next, then a `stolen_value()`-shaped charge while the original figurine still exists, followed by transform-timer cleanup and floor deletion.

The slice is intentionally limited to the already-covered non-golem, non-vegetarian floor figurine animation row. Carried billed figurines, statue animation, golem-to-flesh-golem wording, failed-animation corpse fallback, trap-square cleanup, and broader `poly_obj()` lifecycle effects remain separate.

## C references

- `nethack-c/upstream/src/zap.c:1993` starts `stone_to_flesh_obj()`.
- `nethack-c/upstream/src/zap.c:2002` applies the material gate before resistance or billing.
- `nethack-c/upstream/src/zap.c:2006` applies object resistance before any successful animation side effects.
- `nethack-c/upstream/src/zap.c:2033` creates the figurine monster with `NO_MINVENT | MM_NOMSG`.
- `nethack-c/upstream/src/zap.c:2035` through `zap.c:2038` charge shop loss only after successful monster creation and before object deletion.
- `nethack-c/upstream/src/zap.c:2041` stops object timers before the original object is removed.
- `nethack-c/upstream/src/zap.c:2043` deletes the floor figurine after successful animation.
- `nethack-c/upstream/src/shk.c:3754` starts `stolen_value()`, including bill-owner lookup and floor-position valuation.
- `nethack-c/upstream/src/shk.c:3781` removes existing live bill rows instead of preserving a used-up row.
- `nethack-c/upstream/src/shk.c:3818` routes peaceful loss to debit and non-peaceful loss to robbed value.

## JS changes

- `js/cmd.js:12556` no longer rejects floor figurine animation solely because the object is billed or the square is costly.
- `js/cmd.js:12576` adds `stoneToFleshChargeFloorFigurineAnimation()`, which skips `no_charge` and gold, computes lost value through existing shop-bill helpers, removes live bill rows, and charges debit or robbed value without creating used-up bills.
- `js/cmd.js:12600` charges after `makemon()` succeeds and before `stopFigurineTransformTimeout()` and floor deletion.
- `js/cmd.js:12740` accepts multi-message floor animation results so the debt/thief message and visible animation message are both preserved.
- `test/shop-billing-helpers.test.mjs:4285` adds public coverage for shop-floor charging, existing bill-row removal, `no_charge`, resistance-before-billing, and angry shopkeeper robbed-value routing.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "downward stone to flesh (animates shop-floor figurine|removes existing floor figurine bill|animates no-charge shop-floor figurine|checks shop-floor figurine resistance|charges angry shopkeeper figurine|animates non-shop floor nonvegetarian figurine|checks floor figurine resistance|turns floor vegetarian figurine)|self-cast stone to flesh animates carried nonvegetarian figurine" test/shop-billing-helpers.test.mjs` (`9/9 matching tests passing`)
- `node --test test/shop-billing-helpers.test.mjs` (`863/863 passing`)
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Deferred candidates from this subagent round

- Floor statue stone-to-flesh animation can start with non-shop, non-trap spell animation that uses `MM_ADJACENTOK` and transfers statue contents to the created monster. Shop billing, trap squares, saved monster traits, and failed-animation fallback should stay separate.
- Golem and flesh-golem stone-to-flesh need a focused classifier update: golem figurines/statues animate as flesh golems before vegetarian meatball conversion, with C's distinct `turns to flesh and animates`, `turns into flesh`, and `moves` wording.
- Projectile migration schema should be normalized before adding stairs, ladders, or special-stairs down-gates: wrapper entries need migration type, target level, origin level, origin coordinates, and legacy raw-object compatibility.
- Burning-oil shop-door damage needs terrain-damage records, `SHOP_DOOR_COST`, one `pay_for_damage("burn away", FALSE)`-shaped report after the explosion pass, and delayed repair. It should not reuse object billing.
- Force-lock mimic wake preservation already matches C for the current path: waking clears sleep/wait state without revealing mimic appearance. Useful follow-up is visible wake-message coverage and later canonical mimic appearance fields.
