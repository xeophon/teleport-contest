# Direct chat generated special sounds

Date: 2026-05-31

## Summary

Added C-backed generated-monster sound inference for special `domonnoise()` rows whose JS generated monster records do not currently carry `msound`. Direct `#chat` now recovers C behavior for Kops, guards, soldiers, nurses, djinn/water demons/prisoners, and spell-muttering monsters without adding fixture-local `msound` fields.

## Upstream source anchors

- `nethack-c/upstream/src/sounds.c:991`: `MS_DJINNI` handles tame djinn, peaceful water demons, other peaceful djinn, hostile prisoners, and other hostile djinn separately.
- `nethack-c/upstream/src/sounds.c:1025`: `MS_HUMANOID` remains separate; this slice intentionally does not add a generic humanoid fallback.
- `nethack-c/upstream/src/sounds.c:1129`: `MS_ARREST` emits the peaceful facts line or the hostile arrest warning table.
- `nethack-c/upstream/src/sounds.c:1156`: `MS_SPELL` emits `seems to mutter a cantrip.`
- `nethack-c/upstream/src/sounds.c:1160`: `MS_NURSE` emits the C nurse advice table.
- `nethack-c/upstream/src/sounds.c:1173`: `MS_GUARD` emits the follow/drop-gold guard lines.
- `nethack-c/upstream/src/sounds.c:1179`: `MS_SOLDIER` emits peaceful and hostile soldier tables.
- `nethack-c/upstream/include/monsters.h:1829`: Keystone Kops use `MS_ARREST`; adjacent Kop rows cover `Kop Sergeant`, `Kop Lieutenant`, and `Kop Kaptain`.
- `nethack-c/upstream/include/monsters.h:2722`: `guard` uses `MS_GUARD`; `monsters.h:2863` covers `Croesus`.
- `nethack-c/upstream/include/monsters.h:2772`: `soldier` uses `MS_SOLDIER`; adjacent rows cover `sergeant`, `lieutenant`, `captain`, `watchman`, and `watch captain`.
- `nethack-c/upstream/include/monsters.h:2790`: `nurse` uses `MS_NURSE`.
- `nethack-c/upstream/include/monsters.h:2732`: `prisoner` uses `MS_DJINNI`; `monsters.h:2915` covers `water demon`, and `monsters.h:3192` covers `djinni`.
- `nethack-c/upstream/include/monsters.h:1249`: `ki-rin` uses `MS_SPELL`; `monsters.h:1781`, `2331`, `2349`, and `3020` cover `titan`, `barrow wight`, `Nazgul`, and `nalfeshnee`.

## JS changes

- `js/cmd.js`
  - Extended `TIPHAT_GENERATED_SOUND_BY_MONSTER_NAME` with source-backed entries for `MS_ARREST`, `MS_GUARD`, `MS_SOLDIER`, `MS_NURSE`, `MS_DJINNI`, and `MS_SPELL`.
  - Kept the inference after explicit `msound` and existing shop/priest/orc/laugh handling, before broad shape or `mlet` fallbacks.
  - Left generated `MS_HUMANOID` out of this slice; a subagent audit confirmed `tipHatMonsterHumanoid(mon)` is too broad for sound inference.

## Tests

- Added `chat with visible generated special sound monsters uses C msound rows`.
- Covered no-explicit-`msound` direct `#chat` canaries for:
  - hostile Kop arrest table RNG,
  - guard follow line,
  - hostile and peaceful soldier tables,
  - relaxed nurse advice,
  - peaceful water demon gurgle,
  - hostile prisoner line,
  - nalfeshnee and Nazgul spell cantrip lines.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated special sound|generated nonverbal sound|visible generated-sound" test/shop-billing-helpers.test.mjs` - 5 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1498 pass
- `node --test test/*.mjs` - 1640 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Generated `MS_HUMANOID` should use an exact C-backed name set rather than `tipHatMonsterHumanoid(mon)`.
- Generated silent metadata remains separate and affects target selection as well as response routing.
- `monsterFromRndMeta()` still does not generate a general `msound` field; chat-layer inference remains a narrow bridge until the monster metadata pipeline is broadened.
- Shared `domonnoise()`/`#chat` unification remains separate.
