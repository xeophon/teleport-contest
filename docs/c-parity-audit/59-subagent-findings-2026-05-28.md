# Direct Hero-Thrown Invisibility Potionhit

## Scope

Parallel read-only audits compared upstream C `potionhit()` with the JS hero-thrown potion dispatcher. The implemented slice adds direct monster-hit behavior for potion of invisibility without broadening into acid, polymorph, healing, or other potion families.

## C Anchors

- Hero-thrown potions reach `potionhit(mon, obj, POTHIT_HERO_THROW)` from `nethack-c/upstream/src/dothrow.c:2262`; `potionhit()` treats that as the hero's fault at `nethack-c/upstream/src/potion.c:1631`.
- The shared hit ordering is crash message, optional one-HP impact chip, evaporation, potion effect, survivor wake/anger, then adjacent vapor at `nethack-c/upstream/src/potion.c:1653`, `nethack-c/upstream/src/potion.c:1675`, `nethack-c/upstream/src/potion.c:1679`, `nethack-c/upstream/src/potion.c:1897`, and `nethack-c/upstream/src/potion.c:1906`.
- `POT_INVISIBILITY` records `sawit = canspotmon(mon)`, uses `cursed_potion = obj->cursed`, and sets special anger as `mon->minvis && cursed_potion` at `nethack-c/upstream/src/potion.c:1783`.
- `mon_set_minvis()` sets `perminvis` from BUC and copies it to `minvis` unless `invis_blkd` is set at `nethack-c/upstream/src/worn.c:474`.
- Visibility outcomes are C-specific: seen-to-unseen maps invisible, seen cursed potion says the monster briefly seems transparent, and unseen-to-seen says the monster appears at `nethack-c/upstream/src/potion.c:1789`.
- The monster invisibility branch does not call `makeknown()`. Adjacent `potionbreathe()` handles transient hero vapor and discovery at `nethack-c/upstream/src/potion.c:2033` and `nethack-c/upstream/src/potion.c:2108`.

## JS Status

- `supportsHeroThrownPotionHit()` now admits `invisibility`.
- `heroThrownPotionHitMonster()` now has a local invisibility branch with a `canspotmon`-style helper that respects `game.u.seeInvisible`, `mundetected`, blindness, and line of sight.
- The branch mirrors `mon_set_minvis()`: uncursed/blessed potions set `perminvis` and current `minvis` unless `invis_blkd`; cursed potions clear `perminvis` and current `minvis` unless blocked.
- C's special anger rule is preserved: ordinary invisibility does not anger a peaceful monster, while a cursed potion angers only a monster that was already currently invisible.
- Seen-to-unseen hits set `map_invisible`; seen cursed hits print "briefly seems to be transparent"; unseen-to-seen hits print "appears!".
- Direct monster invisibility does not discover the potion. Adjacent vapor still can discover a description-known potion through the existing vapor path.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- Visible monsters hit by uncursed invisibility potion become invisible, leave map-invisible memory, wake, and do not become angry or discover the potion.
- Cursed hits on visible monsters clear permanent invisibility and print the transparent message without angering a merely visible peaceful target.
- Cursed hits on already-invisible unseen monsters reveal them, print "appears!", and anger them.
- `invis_blkd` monsters gain permanent invisibility without changing current visibility.
- Adjacent direct hits apply monster invisibility before transient hero vapor, and vapor discovery remains the only learning path in this slice.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "invisibility potion|invisibility-blocked" test/shop-billing-helpers.test.mjs`

## Remaining Work

The next compact direct `potionhit()` families are acid, hallucination, healing/harming, water/oil, polymorph, and less common discovery/`trycall()` prompt paths. Acid is still riskier because it needs acid resistance, potion resistance, damage dice, wake-nearby messaging, and kill attribution.
