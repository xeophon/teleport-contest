# C Parity Audit 517: Shocking Sphere Monster Explosion

Live hostile shocking spheres now use C-shaped `AT_EXPL`/`AD_ELEC` metadata and share the adjacent monster-turn explosion path with flaming and freezing spheres. The branch preserves the C two-roll shape, skips ordinary melee to-hit, removes the exploding monster before hero damage, and applies electric ring/wand inventory destruction from the original blast damage.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. Canary seeds only set deterministic fixture RNG.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:358`: shocking sphere monster definition.
- `nethack-c/upstream/include/monsters.h:360`: shocking sphere uses `ATTK(AT_EXPL, AD_ELEC, 4, 6)`.
- `nethack-c/upstream/include/monsters.h:362`: shocking sphere has `MR_ELEC`.
- `nethack-c/upstream/src/mhitu.c:839`: adjacent `AT_EXPL` attacks call `explmu()` automatically.
- `nethack-c/upstream/src/mhitu.c:1603`: `explmu()` consumes the first `d(damn, damd)` roll before explosion dispatch.
- `nethack-c/upstream/src/mhitu.c:1618`: `AD_ELEC` explosion attacks dispatch to `mon_explodes()`.
- `nethack-c/upstream/src/explode.c:56`: `Shock_resistance` marks the hero as resisting electric explosion damage.
- `nethack-c/upstream/src/explode.c:608`: invulnerability zeroes base blast damage without stopping the explosion.
- `nethack-c/upstream/src/explode.c:617`: `destroy_items()` is called for the explosion damage type before HP loss.
- `nethack-c/upstream/src/explode.c:990`: electric explosions use the magical explosion display type.
- `nethack-c/upstream/src/explode.c:1025`: `mon_explodes()` rolls the real blast damage from the same dice.
- `nethack-c/upstream/src/zap.c:5637`: `AD_ELEC` item destruction targets rings and wands only.
- `nethack-c/upstream/src/zap.c:5778`: electric item messages are ring dust and wand explosion strings.
- `nethack-c/upstream/src/zap.c:5858`: rings and wands have distinct electric destruction branches.
- `nethack-c/upstream/src/zap.c:5863`: worn rings under nonmetal gloves and shock-resistance rings are skipped.
- `nethack-c/upstream/src/zap.c:5868`: charged rings usually recharge instead of being destroyed.
- `nethack-c/upstream/src/zap.c:5875`: destroyed wands roll `rnd(10)` damage.
- `nethack-c/upstream/src/zap.c:5997`: `destroy_items()` limits destroyed stacks from source damage.

## JS Changes

- `js/mklev.js`
  - Adds generated electric resistance metadata and shocking sphere attack metadata: 4d6 `expl`/`elec`.
- `js/allmain.js`
  - Generalizes the adjacent `AT_EXPL` monster-turn branch from fire/cold to fire/cold/electric.
  - Keeps explosion handling before ordinary melee to-hit, preserving no `rnd(20)` roll.
- `js/cmd.js`
  - Adds electric inventory destruction for carried rings and wands using the same source-damage scaling shape as `destroy_items()`.
  - Adds active shock-resistance gear detection for base blast and exploding-wand damage resistance.
  - Skips shock-resistance rings, lightning wands, artifacts, in-use singleton items, and worn rings protected by nonmetal gloves.
  - Routes charged rings through the existing neutral recharge helper when the C `rn2(3)` branch succeeds.
  - Shock resistance and invulnerability zero only the base blast damage. Electric item destruction still runs from the original damage budget.
  - Wands roll `rnd(10)` before the per-item destruction roll and deal no HP damage when the hero has shock resistance.

## Tests

- `hostile shocking sphere adjacent attack explodes without to-hit roll`
  - Asserts two aggregate `d(4,6)` calls, no `rnd(20)`, monster removal, and hero HP loss from the second roll.
- `shock-resistant hero still suffers shocking sphere electric item destruction`
  - Asserts a shock-resistant hero receives no base blast damage and no ordinary electric melee wording, but a carried non-lightning wand can still break apart, be removed, and roll `rnd(10)`.
- `worn shock-resistance ring blocks shocking sphere blast damage`
  - Asserts active shock-resistance gear blocks the base shocking sphere blast without relying on intrinsic `game.u.shockResistance`.
- `shocking sphere electric destruction can recharge chargeable rings`
  - Asserts charged rings can take the C recharge branch instead of turning to dust.

## Follow-Ups

- Full worn-ring removal fallout beyond object removal remains broader `destroy_items(AD_ELEC)` work.
- Gas spore `AT_BOOM`/`AD_PHYS` is death-triggered rather than adjacent-attack-triggered and should remain a separate lifecycle slice.
- Full 3x3 `explode()` effects for floor objects and nearby monsters remain broader work. This slice covers live exploder removal and hero caught/damage/electric-inventory behavior.
- Electric explosion deaths currently share the existing fatal command-mode path and do not yet route through full C `done()`/life-saving continuation for direct blast plus exploding-wand deaths.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "shocking sphere" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "sphere" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
