# C Parity Audit 466: Hero Thrown Dagger/Knife Direct Hit

Implemented ordinary non-artifact hero-thrown dagger and knife direct monster hits through the existing projectile impact path. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/include/objects.h:114`: weapon object data includes small damage, large damage, and hit bonus fields.
- `nethack-c/upstream/include/objects.h:200`: ordinary daggers have `1d4` small-target damage, `1d3` large-target damage, and `+2` object hit bonus.
- `nethack-c/upstream/include/objects.h:218`: ordinary knives have `1d3` small-target damage, `1d2` large-target damage, and no object hit bonus.
- `nethack-c/upstream/src/dothrow.c:1428-1435`: dagger/knife style blades qualify as `throwing_weapon()`.
- `nethack-c/upstream/src/dothrow.c:2036`, `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2184`, and `nethack-c/upstream/src/dothrow.c:2193`: `thitmonst()` computes the projectile hit value, rolls `rnd(20)`, applies thrown/kicked adjustments, and compares the result.
- `nethack-c/upstream/src/dothrow.c:2205-2226`: a successful projectile monster hit calls `hmon()`, exercises Dexterity, checks hit-only missile mulch, then calls `passive_obj()` for surviving objects.
- `nethack-c/upstream/src/uhitm.c:942` and `nethack-c/upstream/src/weapon.c:225`: ordinary weapon damage routes through `dmgval()` and uses small/large target dice.
- `nethack-c/upstream/src/uhitm.c:1436`: hero damage increase and strength bonuses are applied after base object damage; broader skill bonuses remain outside this local slice.
- `nethack-c/upstream/src/zap.c:3547`: hit punctuation uses `exclam(dmg)`, with damage up to 4 producing `.` and larger damage producing `!`.
- `nethack-c/upstream/src/dothrow.c:1780-1838`: surviving direct hero projectiles land, place, and stack after the monster impact path returns.

## JS Changes

- `js/cmd.js`
  - Adds direct monster-impact metadata for ordinary non-artifact dagger and knife projectiles.
  - Applies C object hit bonuses for dagger/knife projectile hit values when no explicit object hit bonus is present.
  - Adds the thrown-weapon `+2` hit adjustment for the supported direct path.
  - Uses C small/large damage dice, enchantment, erosion, hero damage-increase, and strength modifiers for direct dagger/knife hits.
  - Applies C-style hit punctuation for the new weapon-hit messages.
  - Threads successful dagger/knife hits through the existing wake/anger, Dexterity exercise, hit-only mulch, passive-object, hard-landing, floor-effect, placement, and stacking pipeline.

## Tests

- Added a direct hero-thrown dagger hit against a sleeping peaceful goblin, asserting damage, wake/anger cleanup, survival, landing coordinates, and RNG order.
- Added a direct hero-thrown knife hit against the same ordinary-monster baseline, asserting knife damage dice, survival, landing, and RNG order.
- Kept adjacent direct gem/passive tests in the focused verification set to catch ordering regressions around the shared projectile landing path.

## Verification

- `node --test --test-name-pattern "hero-thrown (dagger|knife|ruby|glass gem)" test/shop-billing-helpers.test.mjs` - pass
- `node --test` - pass
- `node --test test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Kicked ordinary dagger/knife monster hits remain separate because kicked object selection/range handling uses a different floor-object path.
- Full shared `thitmonst()`/`hmon()` extraction, weapon skill bonuses, artifact hit/damage behavior, blessed weapon to-hit, spear-vs-kebabable to-hit, launcher/ammo handling, and missile mulch remain separate.
- Additional direct ordinary weapon families beyond dagger/knife should be added only with object-table anchors and focused tests.
