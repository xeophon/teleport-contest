# C Parity Audit 468: Hero Projectile Dagger/Knife Skill Damage

Implemented explicit hero weapon-skill damage bonuses for ordinary non-artifact dagger and knife projectile hits. The slice covers both direct thrown and kicked object hits without replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:2021`: `thitmonst()` marks thrown objects as `HMON_THROWN` and the current kicked object as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2036`, `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2156`, `nethack-c/upstream/src/dothrow.c:2184`, `nethack-c/upstream/src/dothrow.c:2190`, and `nethack-c/upstream/src/dothrow.c:2205`: thrown and kicked ordinary dagger/knife hits share the later `hmon()` damage path, while to-hit remains split between thrown-weapon bonuses and kicked-object penalties.
- `nethack-c/upstream/src/dokick.c:736`: kicked non-gold floor objects route successful monster impacts through `thitmonst(mon, gk.kickedobj)`.
- `nethack-c/upstream/src/uhitm.c:819`, `nethack-c/upstream/src/uhitm.c:942`, `nethack-c/upstream/src/uhitm.c:1075`, and `nethack-c/upstream/src/uhitm.c:1415`: ordinary dagger/knife projectile hits route through weapon damage handling rather than launcher/ammo handling.
- `nethack-c/upstream/src/uhitm.c:1435`, `nethack-c/upstream/src/uhitm.c:1461`, `nethack-c/upstream/src/uhitm.c:1484`, and `nethack-c/upstream/src/uhitm.c:1502`: `hmon_hitmon_dmg_recalc()` applies hero damage increase, strength damage, weapon damage skill bonus, then clamps final damage to at least 1.
- `nethack-c/upstream/src/uhitm.c:1845`: final monster HP subtraction uses the recalculated damage.
- `nethack-c/upstream/src/weapon.c:216`, `nethack-c/upstream/src/weapon.c:225`, `nethack-c/upstream/src/weapon.c:297`, `nethack-c/upstream/src/weapon.c:322`, and `nethack-c/upstream/src/weapon.c:344`: `dmgval()` rolls base weapon dice and applies enchantment, material, blessing, artifact-light, and erosion effects before the later skill damage bonus.
- `nethack-c/upstream/src/weapon.c:1644` and `nethack-c/upstream/src/weapon.c:1657`: `weapon_dam_bonus()` returns `-2` for restricted/unskilled, `0` for basic, `+1` for skilled, and `+2` for expert weapon skill.
- `nethack-c/upstream/include/objects.h:200` and `nethack-c/upstream/include/objects.h:218`: ordinary dagger and knife are positive weapon skills with dagger/knife damage dice, not launcher ammunition.
- `nethack-c/upstream/include/obj.h:238` and `nethack-c/upstream/include/obj.h:245`: ammo and missile skill ranges are separate from ordinary dagger and knife.

## JS Changes

- `js/cmd.js`
  - Adds dagger/knife skill metadata to the narrow hero projectile weapon data table.
  - Adds an explicit weapon-skill lookup for testable local state without inferring role defaults or wiring general `#enhance` advancement.
  - Normalizes numeric and named skill levels to C constants, including restricted/unskilled/basic/skilled/expert values.
  - Applies C's weapon damage skill bonus after existing damage-increase and strength bonuses, then keeps the existing minimum-damage clamp.
  - Preserves existing no-explicit-state behavior by treating missing skill state as no bonus rather than restricted skill.
  - Leaves thrown and kicked to-hit differences unchanged.

## Tests

- Added explicit-skill thrown dagger and knife matrices covering unskilled, basic, skilled, and expert damage.
- Added explicit-skill kicked dagger and knife matrices covering unskilled, basic, skilled, and expert damage.
- Each case asserts message punctuation, damage, wake/anger cleanup, surviving object landing, and unchanged RNG label order.
- Existing direct thrown/kicked dagger and knife baselines still assert the no-explicit-state behavior.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter spec --test-name-pattern "explicit weapon skill" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "(hero-thrown (dagger|knife).*skill|command kicked (dagger|knife).*skill|hero-thrown (dagger|knife)|command kicked (dagger|knife))" test/shop-billing-helpers.test.mjs` - pass
- `node --test test/shop-billing-helpers.test.mjs` - pass
- `node --test` - pass
- `node --test test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- General hero skill initialization, skill advancement, and `#enhance` integration remain separate.
- Weapon skill to-hit bonuses remain limited to the already-modeled thrown path; broader `weapon_hit_bonus()` extraction remains separate.
- Artifacts, blessed weapon to-hit/damage, silver/searing behavior, poisoned weapons, launcher/ammo handling, spear-vs-kebabable to-hit, and broader shared `hmon()` extraction remain separate.
