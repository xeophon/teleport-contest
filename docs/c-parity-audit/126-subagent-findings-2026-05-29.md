# 126 - Floor figurine stone-to-flesh animation

## Implemented slice

Downward `stone to flesh` now animates non-shop, floor-based figurines whose monster identity is neither a golem nor vegetarian. The floor branch uses the same C-shaped material and resistance gates as carried figurines, creates the monster with `NO_MINVENT | MM_NOMSG`, stops any figurine transform timer, removes the floor object, redraws the square, and prints `The figurine animates!` only when the created monster is visible.

The slice also pins that floor vegetarian figurines still use the existing meatball replacement path and meat smell wording, proving vegetarian corpstat handling remains before animation. Shop-billed and costly-shop floor figurines are intentionally left unchanged in this slice because C runs separate `stolen_value()` handling before deletion.

## C references

- `nethack-c/upstream/src/spell.c:1478` routes `SPE_STONE_TO_FLESH` through the wand-like spell direction path.
- `nethack-c/upstream/src/spell.c:1500` sends self-casts to `zapyourself()` and non-self directions to `weffects()`.
- `nethack-c/upstream/src/zap.c:3355` through `zap.c:3382` handle stone-to-flesh direction flavor and the downward `bhitpile()` call.
- `nethack-c/upstream/src/zap.c:2466` walks the floor pile through `bhitpile()`.
- `nethack-c/upstream/src/zap.c:2412` delegates `SPE_STONE_TO_FLESH` floor-object hits to `stone_to_flesh_obj()`.
- `nethack-c/upstream/src/zap.c:2002` gates stone-to-flesh object effects to mineral or gemstone materials.
- `nethack-c/upstream/src/zap.c:2006` performs object resistance after the material gate.
- `nethack-c/upstream/src/zap.c:2017` through `zap.c:2021` route statues and figurines through corpse-stat monster handling, with golems before vegetarian meatball conversion.
- `nethack-c/upstream/src/zap.c:2030` animates qualifying figurines via `makemon(ptr, oox, ooy, NO_MINVENT | MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2035` charges shop-billed figurines through `stolen_value()` before deletion.
- `nethack-c/upstream/src/zap.c:2041` through `zap.c:2047` stop figurine timers, delete the object, and print visible animation feedback.
- `nethack-c/upstream/src/zap.c:2097` limits smell feedback to meat replacement branches.

## JS changes

- `js/cmd.js` adds a floor figurine animation classifier that excludes unpaid/costly-shop objects, golems, and vegetarian identities.
- `stoneToFleshFloorEffect()` is now async so floor animation can await `makemon()`.
- The floor loop now handles replacements and animation in one pass, removes animated figurines from `game.level.objects`, keeps meat smell limited to replacement branches, and preserves existing shop anger behavior for meat replacements.
- The spell direction handler now awaits the downward floor effect.
- `test/shop-billing-helpers.test.mjs` adds focused coverage for successful non-shop floor figurine animation, resistance-before-animation, and floor vegetarian figurine meatball deferral.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "downward stone to flesh (animates non-shop floor nonvegetarian figurine|checks floor figurine resistance before animation|turns floor vegetarian figurine|turns vegetarian statue|turns floor gemstone stack|turns floor boulder|leaves worthless)" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`853/853 passing`)
- `npm run score` (`44/44 passing`)

## Deferred candidates from this subagent round

- Burning-oil shop-door repair/damage needs a real terrain-damage scheduler and `pay_for_damage("burn away")` analogue; object shop-bill helpers are not equivalent.
- Projectile down-gates for stairs, ladders, and special stairs need migration records with source level, destination code, and stair/ladder placement metadata before implementation.
- Ordinary non-petrifying corpse upward `toss_up()` needs roof RNG, breaktest ordering, weight-derived damage, helmet mitigation, and landing-before-HP-loss handling.
- Destroyed ice-box survivor corpse timers remain a helper-level gap only; real `#force` should still not target ice boxes.
- Monster-thrown remote seen hole/trapdoor shipping is a compact future slice, with C `drop_throw()` shipping before floor effects.
- Remaining stone-to-flesh rows: shop-billed floor figurine animation, golem/flesh-golem wording, statue animation and contents transfer, failed-animation corpse fallback, and broader `poly_obj()` fallout.
