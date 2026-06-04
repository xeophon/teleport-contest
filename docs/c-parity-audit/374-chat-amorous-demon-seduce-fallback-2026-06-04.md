# Direct chat amorous demon seduce fallback

Date: 2026-06-04

## Summary

Added a narrow direct `#chat` bridge for generated `amorous demon` `MS_SEDUCE` fallback speech. C only enters full non-nymph seduction when `could_seduce()` reports compatible genders; same-gender chat falls through to the simple `MS_SEDUCE` message table, which does not require `doseduce()` state changes.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:46`: `MS_SEDUCE`.
- `nethack-c/upstream/include/monsters.h:2932` through `:2939`: `amorous demon` uses `MS_SEDUCE`.
- `nethack-c/upstream/src/sounds.c:1105` through `:1128`: `MS_SEDUCE` calls `doseduce()` only for compatible non-nymph seducers, otherwise uses `"Hello, sailor."`, `comes on to you.`, or `cajoles you.`.
- `nethack-c/upstream/src/mhitu.c:1934` through `:1984`: `could_seduce()` returns `1` only for opposite-gender amorous demon seduction; same-gender non-nymph seduction returns `0`.
- `js/monster_data.js:264`: local generated monster metadata includes `amorous demon` without explicit `msound`.

## JS changes

- `tipHatMonsterSound()` now infers `seduce` for generated `amorous demon` records with no explicit `msound`.
- `tipHatMonsterNoise()` now permits the same-gender non-nymph `MS_SEDUCE` fallback line.
- Compatible non-nymph seduction still falls through unhandled because full `doseduce()` remains out of scope.

## Tests

- Added `chat with same-gender amorous demon uses C seduce fallback`.
- Canary: female hero chatting with female `amorous demon`, no explicit `msound`.
- The test asserts deterministic `The amorous demon cajoles you.` with no RNG consumption and rejects nymph random greeting, empty-space, wall, and undress-style fallbacks.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern="visible nymph uses C seduce|same-gender amorous demon" test/shop-billing-helpers.test.mjs` - 2 pass, 1504 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1506 pass
- `node --test test/*.mjs` - 1648 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Compatible non-nymph `MS_SEDUCE` still needs a separate source-backed `doseduce()` slice.
- The generated monster metadata pipeline still does not emit a general `msound` field.
