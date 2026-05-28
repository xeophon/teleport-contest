# Subagent Findings 70: Direct Sickness Potionhit

## Scope

Audit and implement the direct hero-thrown `potionhit()` branch for potion of sickness hits against monsters. This slice covers ordinary illness, poison/disease/pest resistance feedback, and Pestilence healing inversion. It does not add bash delivery or broader water, acid, lit-oil, or polymorph monster branches.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` through `potion.c:1675` handle the common crash message and one-HP shard chip before the monster effect.
- `nethack-c/upstream/src/potion.c:1679` prints visible non-oil evaporation before the monster switch.
- `nethack-c/upstream/src/potion.c:1759` starts the `POT_SICKNESS` monster branch.
- `nethack-c/upstream/src/potion.c:1760` sends Pestilence to the healing path, which clears default anger.
- `nethack-c/upstream/src/potion.c:1762` through `potion.c:1768` leave disease/pest/poison-resistant monsters unharmed with visible feedback.
- `nethack-c/upstream/src/potion.c:1771` through `potion.c:1775` halve ordinary monster HP above two and print the illness message when visible.
- `nethack-c/upstream/src/potion.c:1897` applies the surviving-monster wake/anger tail.
- `nethack-c/upstream/src/potion.c:1906` applies adjacent hero vapor or description-known `trycall()` after the monster effect.

## JS Findings

- `js/cmd.js` already had the common direct-hit `potionhit()` helper used by confusion, booze, paralysis, sleeping, blindness, speed, invisibility, hallucination, healing-family, common no-effect potions, and unlit oil.
- Sickness was still excluded from `supportsHeroThrownPotionHit()`, so direct throws could fall through to generic thrown-object landing behavior.
- Existing healing-family code already had the C Pestilence inversion in the opposite direction. The sickness branch can reuse the same visible healing message and anger clearing for Pestilence.
- Existing monster fixtures expose poison resistance as direct or `data` flags; JS monster attack metadata can also represent damage types with `adtyp`, so the disease/pest resistance probe can stay narrow without adding a full monster registry.

## Implementation

- Normalized direct potion effect names so objects whose `actualKind` is `potion of sickness` still route by bare effect name.
- Added sickness to the direct hero-thrown potion support gate.
- Added poison/disease/pest resistance helpers for sickness potion hits.
- Added `sicknessPotionHitMonster()`:
  - Pestilence is healed to max HP and not angered.
  - Poison/disease/pest-resistant monsters keep only the common shard chip, print `looks unharmed`, and are angered.
  - Ordinary monsters above two HP are halved after the common shard chip, print `looks rather ill`, and are angered.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- ordinary visible monsters become ill, wake, anger, and consume the potion with no floor object;
- poison-resistant monsters show `looks unharmed` while still taking only the common shard chip and becoming angry;
- Pestilence is healed by sickness, remains blind when previously blinded, wakes, and is not angered;
- sickness identity can come from `potionIndex` while preserving appearance-based evaporation text.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Bash delivery and saddle-hit redirection remain outside the direct helper.
- Water should only be enabled through target-aware slices; ordinary neutral water is small, but blessed/cursed special monsters, gremlin split, iron golem rust, and saddle BUC handling need separate helpers.
- Lit oil remains deferred until a reusable burning-oil explosion primitive exists.
- Acid, harming-family damage/death, and polymorph object-hit behavior remain unported direct `potionhit()` branches.
- Exact non-`kn` `trycall()` prompting and broader adjacent hero vapor behavior remain incomplete.
