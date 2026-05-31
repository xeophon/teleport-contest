# Direct chat generated gnome MS_ORC sound

Date: 2026-05-31

## Summary

Added generated monster sound metadata for the small `MS_ORC` race family subset already modeled by local race helpers, and covered visible direct `#chat` with a gnome. In C, ordinary gnomes have `MS_ORC`; that normally grunts, but same-race heroes remap the sound to `MS_HUMANOID` before the speech switch.

## Upstream source anchors

- `nethack-c/upstream/include/monsters.h:1681`: the gnome monster group begins with ordinary generated gnomes.
- `nethack-c/upstream/include/monsters.h:1685`: ordinary gnomes are defined with `MS_ORC`.
- `nethack-c/upstream/src/sounds.c:705`: `domonnoise()` remaps `MS_ORC` to `MS_HUMANOID` for same-race or hallucinating heroes.
- `nethack-c/upstream/src/sounds.c:987`: plain `MS_ORC` emits `grunts.`
- `nethack-c/upstream/src/sounds.c:1062`: peaceful humanoid gnomes use the sunlit-lands verbal line, with RNG only for the hallucinated alternate.

## JS changes

- `js/cmd.js`
  - Added a generated `orc` sound inference for modeled orc, gnome, and kobold race families after explicit sound, shopkeeper, and priest checks.
  - Reused the existing `tipHatMonsterNoise()` same-race `orc -> humanoid` remap and existing peaceful gnome humanoid speech branch.

## Tests

- `chat with visible generated-sound gnome grunts for non-gnome hero` covers a visible peaceful gnome without explicit `msound`, proving the generated `MS_ORC` path reaches `grunts.` and consumes chat time.
- `chat with visible same-race generated-sound gnome uses gnome humanoid speech` covers the same setup with a gnome hero, proving the same-race remap reaches the C gnome humanoid speech line with no RNG.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated-sound gnome" test/shop-billing-helpers.test.mjs` - 2 pass, 1490 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1492 pass
- `node --test test/*.mjs` - 1634 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Broader generated `msound` coverage for the full monster table remains separate.
- Broader shared `domonnoise()`/`#chat` unification remains separate.
- Hallucinated generated `MS_ORC` direct chat remains separate.
