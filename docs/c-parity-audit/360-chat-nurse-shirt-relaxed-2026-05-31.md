# Direct chat nurse shirt and relaxed speech

Date: 2026-05-31

## Summary

Added direct `#chat` coverage for the `MS_NURSE` branches that worn-helmet `#tip` cannot reach: a nurse asking the hero to remove only a worn shirt, and an unmasked nurse giving the relaxed examination line. This keeps the broad `domonnoise()` sharing work separate while locking down the direct chat path that already reaches the shared local monster-noise helper.

## Upstream source anchors

- `nethack-c/upstream/src/sounds.c:1160`: `MS_NURSE` uses the cancelled fallback before ordinary nurse advice.
- `nethack-c/upstream/src/sounds.c:1163`: wielded weapons or weapon-tools trigger the weapon warning.
- `nethack-c/upstream/src/sounds.c:1165`: worn armor other than a shirt triggers the undress/cooperate advice.
- `nethack-c/upstream/src/sounds.c:1168`: a worn shirt alone triggers `"Take off your shirt, please."`
- `nethack-c/upstream/src/sounds.c:1170`: with no blocking equipment, the nurse says `"Relax, this won't hurt a bit."`
- `nethack-c/upstream/src/sounds.c:1408`: direct monster chat calls `domonnoise()` after direction validation and deaf/eating/helpless gates.

## JS coverage

- `test/shop-billing-helpers.test.mjs`
  - Added visible direct `#chat` coverage for a nurse while the hero wears only a `T-shirt`.
  - Added visible direct `#chat` coverage for an unmasked nurse with no blocking worn armor.
  - Both rows assert no RNG use, wait-strategy clearing, command-time consumption, and absence of the visible-humanoid `#tip` wave/fallback wording.

## Verification

- `node --test --test-name-pattern="chat with visible unmasked nurse|chat with visible nurse wearing" test/shop-billing-helpers.test.mjs`

## Remaining gaps

- Broad shared `domonnoise()`/`#chat` unification remains separate.
- Full C equipment-slot modeling for nurse checks remains separate from the current inventory-flag bridge.
