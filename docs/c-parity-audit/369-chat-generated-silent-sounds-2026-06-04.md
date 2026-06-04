# Direct chat generated silent sounds

Date: 2026-06-04

## Summary

Added C-backed generated-monster `MS_SILENT` inference for chat, worn-helmet `#tip`, and potion-hit silence checks. The inference is an exact name set drawn from the active C monster rows that are present in the local generated monster/display metadata, with explicit local `msound` or `sound` values still taking precedence.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:11`: `MS_SILENT` is the zero-valued monster sound.
- `nethack-c/upstream/include/mondata.h:62`: `is_silent(ptr)` is the C predicate used by sound routing.
- `nethack-c/upstream/src/sounds.c:688` through `:693`: `domonnoise()` returns before any invisible mapping when a non-shopkeeper monster is silent.
- `nethack-c/upstream/src/sounds.c:719` through `:720`: invisible mapping happens after the silent early return.
- `nethack-c/upstream/src/sounds.c:1388` through `:1408`: direct `#chat` clears wait strategy, then delegates to `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:1468` through `:1488`: worn-helmet `#tip` only lets an adjacent unseen monster become the selected responder when `responsive_mon_at()` succeeds and the monster is not silent.
- `nethack-c/upstream/src/sounds.c:1503` through `:1533`: selected `#tip` targets clear wait strategy; visible non-speaking targets use the `doesn't respond` fallback, while no selected target uses `Nothing happens`.
- `nethack-c/upstream/src/sounds.c:883`: `MS_SQEEK` provides the rodent comparator message.
- `nethack-c/upstream/include/monsters.h:896` and `:900`: `giant rat` is the same local rodent fallback class but has C `MS_SQEEK`.
- `nethack-c/upstream/include/monsters.h:919` and `:923`: `rock mole` is a generated local rodent row with C `MS_SILENT`.
- `nethack-c/upstream/include/monsters.h:89` through `:358`, `:544` through `:818`, `:919` through `:990`, `:1053` through `:1195`, `:1566` through `:1668`, `:1901` through `:2113`, `:2147` through `:2586`, `:2939` through `:3043`, and `:3260` through `:3299`: active generated/display-backed C `MS_SILENT` rows used for the local exact-name bridge.
- `js/monster_data.js:4` through `:282`: local common generated monster metadata rows that currently omit `msound`.
- `js/monster_data.js:395` through `:396`: local hallucination/display-only demon names included for direct-name inference.

## JS changes

- Added `TIPHAT_GENERATED_SILENT_MONSTER_NAMES` for the exact active source-backed local `MS_SILENT` monster names.
- Updated `tipHatGeneratedMonsterSound()` to return `silent` before non-silent generated sound rows.
- Updated `tipHatMonsterSilent()`, `chatHeroIsSilent()`, and `monsterIsSilentForPotionHit()` to use generated silent inference only when no explicit local `msound` or `sound` exists.
- Preserved explicit local non-silent `msound` values as overrides, and treated explicit numeric `0` as silent to match `MS_SILENT`.

## Tests

- Added `worn helmet tip scans past adjacent invisible generated silent monster`.
  - An adjacent invisible `rock mole` no longer blocks the farther visible dog responder.
  - The silent adjacent monster does not clear wait strategy and does not map an invisible glyph.
- Added `chat with visible generated silent rock mole suppresses rodent fallback`.
  - `rock mole` produces no message despite the broad local rodent fallback.
  - `giant rat` remains the same-class comparator and still squeaks.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated silent|generated humanoid sound|generated special sound|generated nonverbal sound|visible generated-sound|scans past adjacent invisible generated silent" test/shop-billing-helpers.test.mjs` - 8 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1501 pass
- `node --test test/*.mjs` - 1643 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- `monsterFromRndMeta()` still does not emit a general `msound` field; this is a chat-layer bridge until the generated monster metadata pipeline is broadened.
- Shared `domonnoise()`/`#chat` unification remains separate.
- Broader generated monster sound and race metadata remains open beyond the exact covered sound rows.
