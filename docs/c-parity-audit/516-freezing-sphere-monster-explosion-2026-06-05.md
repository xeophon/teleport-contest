# C Parity Audit 516: Freezing Sphere Monster Explosion

Live hostile freezing spheres now use C-shaped `AT_EXPL`/`AD_COLD` metadata and detonate through the same monster-turn adjacent attack path as flaming spheres. The shared branch preserves the C two-roll shape (`explmu()` rolls attack damage first, then `mon_explodes()` rolls the actual blast), removes the exploding monster before hero injury, and applies cold blast HP damage plus cold inventory shatter side effects.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. Canary seeds only set deterministic fixture RNG.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:341`: freezing sphere monster definition.
- `nethack-c/upstream/include/monsters.h:343`: freezing sphere uses `ATTK(AT_EXPL, AD_COLD, 4, 6)`.
- `nethack-c/upstream/src/mhitu.c:839`: adjacent `AT_EXPL` attacks call `explmu()` automatically.
- `nethack-c/upstream/src/mhitu.c:1603`: `explmu()` consumes the first `d(damn, damd)` roll before explosion dispatch.
- `nethack-c/upstream/src/mhitu.c:1606`: stale-target explosions print the "thin air" variant.
- `nethack-c/upstream/src/mhitu.c:1616`: `AD_COLD` explosion attacks dispatch to `mon_explodes()`.
- `nethack-c/upstream/src/explode.c:999`: `AD_COLD` maps to `EXPL_FROSTY`.
- `nethack-c/upstream/src/explode.c:1025`: `mon_explodes()` rolls the real blast damage from the same dice.
- `nethack-c/upstream/src/explode.c:1052`: the exploding monster is killed before `explode()` runs.
- `nethack-c/upstream/src/explode.c:590`: hero injury is processed after other explosion effects.
- `nethack-c/upstream/src/explode.c:602`: monster-induced explosions print caught-in-explosion wording.
- `nethack-c/upstream/src/explode.c:608`: invulnerability zeroes base blast damage without stopping the explosion.
- `nethack-c/upstream/src/explode.c:617`: `destroy_items()` is called for the explosion damage type before HP loss.
- `nethack-c/upstream/src/zap.c:5997`: `destroy_items()` limits destroyed stacks from source damage.
- `nethack-c/upstream/src/zap.c:5820`: `AD_COLD` destruction targets potion quantities and uses `rnd(4)` shatter damage.

## JS Changes

- `js/mklev.js`
  - Adds freezing sphere attack metadata from the C monster row: 4d6 `expl`/`cold`.
  - Exposes generated `resistsCold` metadata from the existing C-derived cold-resistance set.
- `js/allmain.js`
  - Generalizes the adjacent `AT_EXPL` monster-turn branch from fire-only to fire/cold.
  - Keeps explosion handling before ordinary melee to-hit, preserving no `rnd(20)` roll.
  - Reuses the same exploder removal, stale-target, invulnerability, fatal, and `--More--` handling as audit 515.
- `js/cmd.js`
  - Adds `applyHeroColdExplosionInventoryDamage()`, using existing cold inventory destruction helpers.
  - Cold resistance and invulnerability zero only the base blast damage. Potion shatter damage and inventory removal still apply.

## Tests

- `hostile freezing sphere adjacent attack explodes without to-hit roll`
  - Asserts two aggregate `d(4,6)` calls, no `rnd(20)`, monster removal, and hero HP loss from the second roll.
- `cold-resistant hero still suffers freezing sphere potion shatter damage`
  - Asserts a cold-resistant hero receives no base cold-ray-style message, but a carried potion can still freeze/shatter, be removed, and deal `rnd(4)` item damage.

## Follow-Ups

- Add shocking sphere `AT_EXPL`/`AD_ELEC` after reusable electric explosion inventory damage exists.
- Gas spore `AT_BOOM`/`AD_PHYS` is death-triggered rather than adjacent-attack-triggered and should remain a separate lifecycle slice.
- Full 3x3 `explode()` effects for floor objects and nearby monsters remain broader work. This slice covers live exploder removal and hero caught/damage/inventory-shatter behavior.
- Cold explosion deaths currently share the existing cold fatal command-mode path and do not yet route through full C `done()`/life-saving continuation for direct blast plus shattered-potion deaths.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "freezing sphere" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "sphere" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
