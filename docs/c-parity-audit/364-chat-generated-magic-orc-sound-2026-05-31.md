# Direct chat generated magic MS_ORC sound

Date: 2026-05-31

## Summary

Added generated magic-user metadata for the `MS_ORC` monsters that C marks with `M2_MAGIC`: kobold shaman, orc shaman, and gnomish wizard. They still grunt on ordinary generated `MS_ORC` direct chat, but after same-race/current-form remap to `MS_HUMANOID`, peaceful chat reaches the C spellcraft line instead of generic humanoid or gnome speech.

## Upstream source anchors

- `nethack-c/upstream/include/monsters.h:649`: `kobold shaman` entry.
- `nethack-c/upstream/include/monsters.h:653`: `kobold shaman` is defined with `MS_ORC`.
- `nethack-c/upstream/include/monsters.h:654`: `kobold shaman` has `M2_MAGIC`.
- `nethack-c/upstream/include/monsters.h:779`: `orc shaman` entry.
- `nethack-c/upstream/include/monsters.h:783`: `orc shaman` is defined with `MS_ORC`.
- `nethack-c/upstream/include/monsters.h:785`: `orc shaman` has `M2_ORC | M2_GREEDY | M2_JEWELS | M2_MAGIC`, but is not intrinsically `M2_HOSTILE`.
- `nethack-c/upstream/include/monsters.h:1695`: `gnomish wizard` entry.
- `nethack-c/upstream/include/monsters.h:1699`: `gnomish wizard` is defined with `MS_ORC`.
- `nethack-c/upstream/include/monsters.h:1700`: `gnomish wizard` has `M2_MAGIC`.
- `nethack-c/upstream/include/monflag.h:154`: `M2_MAGIC` is the monster flag backing magic-item interest.
- `nethack-c/upstream/include/mondata.h:146`: `likes_magic(ptr)` tests `ptr->mflags2 & M2_MAGIC`.
- `nethack-c/upstream/src/sounds.c:705`: `domonnoise()` remaps `MS_ORC` to `MS_HUMANOID` for same-race or hallucinating heroes.
- `nethack-c/upstream/src/mondata.c:771`: `same_race()` handles gnome, orc, and kobold-family matching.
- `nethack-c/upstream/src/sounds.c:987`: unremapped `MS_ORC` emits `grunts.`
- `nethack-c/upstream/src/sounds.c:1025`: remapped hostile humanoids use `threatens you.`
- `nethack-c/upstream/src/sounds.c:1058`: peaceful humanoid `likes_magic()` monsters talk about spellcraft before centaur and gnome special cases.
- `nethack-c/upstream/src/sounds.c:1062`: the gnome-specific line is after `likes_magic()`, so peaceful remapped `gnomish wizard` chat uses spellcraft.

## JS changes

- `js/cmd.js`
  - Added generated magic-user inference for `kobold shaman`, `orc shaman`, and `gnomish wizard`.
  - Left generated `MS_ORC` sound routing intact; the new metadata only affects the humanoid speech branch after remap.

## Tests

- `chat with same-race generated-sound magic MS_ORC monsters uses spellcraft` covers all three generated magic `MS_ORC` monsters with matching polyself families and no explicit `msound` or magic flag.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="same-race generated-sound magic MS_ORC" test/shop-billing-helpers.test.mjs` - 1 pass, 1494 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1495 pass
- `node --test test/*.mjs` - 1637 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Hallucinated monster display-name substitution remains separate.
- Magic-item pickup parity for generated kobold shaman, orc shaman, and gnomish wizard remains separate from this direct-chat metadata shim.
- Broader generated `msound`, race, and `M2_MAGIC` coverage for the full monster table remains separate.
- Shared `domonnoise()`/`#chat` unification remains separate.
