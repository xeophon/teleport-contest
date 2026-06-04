# Direct chat Wizard cuss sound

Date: 2026-06-04

## Summary

Added source-backed direct `#chat` sound inference for the special `Wizard of Yendor` `MS_CUSS` row. The local special Wizard metadata does not carry `msound`, so adjacent invisible Wizard chat could miss the C `domonnoise()`/`cuss()` branch.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:49`: `MS_CUSS`.
- `nethack-c/upstream/src/sounds.c:1148` through `:1154`: `MS_CUSS` routes hostile monsters through `cuss(mtmp)` and peaceful non-minions to `"We're all doomed."`.
- `nethack-c/upstream/src/sounds.c:1506` through `:1524`: visible humanoids are handled before adjacent `domonnoise()`, so a visible Wizard should still use the generic rude humanoid response until broader direct-chat precedence is unified.
- `nethack-c/upstream/src/wizard.c:846` through `:852`: Wizard-specific `cuss()` uses `mtmp->iswiz`; the first branch is `rn2(5) == 0` and prints that the Wizard laughs fiendishly.
- `nethack-c/upstream/include/monsters.h:2847` through `:2858`: `Wizard of Yendor` uses `MS_CUSS`.
- `js/mklev.js:2649` through `:2655`: local `WIZARD_OF_YENDOR` special metadata exists without explicit `msound`.
- `js/mklev.js:7513` through `:7518`: revived Wizard sets `iswiz`.
- `js/mklev.js:11193` through `:11206`: Wizard Tower creation uses `WIZARD_OF_YENDOR`.

## JS changes

- `tipHatMonsterSound()` now infers `cuss` from `tipHatMonsterIsWizardCuss()` for no-explicit-`msound` Wizard records.
- The change does not bypass visible humanoid precedence in `tipHatDirectedResponse()`; broader direct-chat visible-humanoid unification remains separate.

## Tests

- Added `chat with invisible Wizard of Yendor uses special C cuss row`.
- Canary: hostile invisible no-explicit-`msound` `Wizard of Yendor`, `mlet: '@'`, `glyph: '@'`, `iswiz: true`.
- Seed `1` asserts the deterministic `rn2(5)=0` cuss branch: `It laughs fiendishly.`
- The test rejects generic rude humanoid, threat, no-response, and wave fallbacks.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern="Wizard of Yendor uses special C cuss|generated cuss|generated bark and sqeek|generated hiss|generated silent|generated humanoid sound|generated special sound|generated nonverbal sound|visible generated-sound" test/shop-billing-helpers.test.mjs` - 12 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1505 pass
- `node --test test/*.mjs` - 1647 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Non-nymph `MS_SEDUCE` for `amorous demon` still needs a separate source-backed slice because C can call `doseduce()`.
- C direct `#chat` visible humanoid precedence is not yet unified into the current JS `finishChatMonsterTarget()` path.
- The generated/special monster metadata pipeline still does not emit a general `msound` field.
