# C Parity Audit 784: Monster-Thrown Cockatrice Egg Hero and Bars Branches

Implemented the remaining production monster-thrown petrifying egg hero delivery and forced iron-bars breaktest branches. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:535` through `:545`: `u_catch_thrown_obj()` gates catches on blindness/confusion/stun/fumbling, hands, capacity, and `rn2(catch_chance)`, then uses the caught object's simple name in the catch or catch-drop message.
- `nethack-c/upstream/src/mthrowu.c:695` through `:716`: monster-thrown objects try hero catch before hero hit handling; petrifying eggs fall through to `thitu(8, 0)`.
- `nethack-c/upstream/src/mthrowu.c:106` through `:121`: `thitu()` consumes `rnd(20)` and emits miss, almost-hit, or hit wording without any hero-side `Splat!`.
- `nethack-c/upstream/src/mthrowu.c:779` through `:789`: egg hits start hero stoning unless stone-resistant or rescued by stone-golem polymorph, then delete the hit egg with `drop_throw(..., ohit=1)`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:810`: missed eggs consume the end-of-flight `rn2(5)` force-hit check and land through `drop_throw(..., ohit=0)`.
- `nethack-c/upstream/src/mthrowu.c:1416` through `:1469`: `hit_bars()` calls `breaks()` before bars sound; surviving flesh-material eggs use `Flapp!`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2604` and `:2640`: egg breaktest consumes `obj_resists()` and, on failure, prints `Splat!`.
- `nethack-c/upstream/src/zap.c:1469`: `obj_resists()` consumes `rn2(100)`.
- `nethack-c/upstream/src/mthrowu.c:1536` through `:1540`: eggs only hit iron bars when the caller's `forcehit` is true; they are not always-stop food-class objects.

## JS Changes

- `js/allmain.js`
  - Keeps the production egg branch's C flight RNG through hero catch, hit, miss, and bars stop paths.
  - Uses the object-name catch helper so known cockatrice eggs say `You catch the cockatrice egg!`.
  - Adds the missed-egg end-of-flight `rn2(5)` before intact landing at the hero square.
  - Routes forced iron-bars egg stops through `projectileTopLevelBreakKind()`: ordinary break failure prints `Splat!` and deletes the egg; break resistance prints `Flapp!` and lands the egg intact before the bars.
  - Reuses the shared polyself stone-golem rescue helper before starting monster-thrown egg stoning.
  - Marks monster-thrown egg stoning with the C generic `killed by petrification` death cause.
- `js/cmd.js`
  - Exports the existing `maybeTurnPolyselfIntoStoneGolem()` helper for reuse by the monster-turn egg branch.
- `test/shop-billing-helpers.test.mjs`
  - Extends the production petrifying-egg helper with `coreRngValues`, `heroFumbling`, and `heroOverrides`.
  - Adds focused canaries for catch, hero hit stoning, golem polyself rescue, hero miss landing, forced bars splat, and forced bars resisted landing.

## Tests

- `production monster cockatrice egg catch uses known species name`
- `production monster cockatrice egg hit starts hero stoning and deletes egg`
- `production monster cockatrice egg hit turns golem polyself into stone golem`
- `production monster cockatrice egg miss lands intact on hero square`
- `production monster cockatrice egg forced iron bars hit splats before hero`
- `production monster cockatrice egg forced iron bars resisted break lands intact before hero`

## Verification

- `node --check js/allmain.js` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "production monster cockatrice egg" test/shop-billing-helpers.test.mjs` - 7 pass, 2771 skipped
- `node --test --test-name-pattern "production monster cockatrice egg|Kop cream pie forced iron bars|kobold dart aimed shot can clonk iron bars" test/shop-billing-helpers.test.mjs` - 9 pass, 2769 skipped
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Cursed/greased monster-thrown egg misfire and sink/ordinary wall stop handling remain separate projectile slices.
- Monster-thrown egg lizard-corpse `munstone()` cure and tiny-monster rock/statue fallout are covered in audit 785; acid potion, tin, and glob cure rows remain separate.
