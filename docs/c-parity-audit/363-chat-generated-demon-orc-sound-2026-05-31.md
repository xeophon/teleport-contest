# Direct chat generated demon MS_ORC sound

Date: 2026-05-31

## Summary

Extended generated `MS_ORC` sound inference to the named C monsters `Yeenoghu` and `Orcus`. In C, both proper-name unique demons use `MS_ORC`; ordinary direct chat makes them grunt, while hallucination remaps `MS_ORC` to `MS_HUMANOID` before the speech switch.

## Upstream source anchors

- `nethack-c/upstream/include/monsters.h:3072`: `Yeenoghu` is defined with `MS_ORC`.
- `nethack-c/upstream/include/monsters.h:3083`: `Orcus` is defined with `MS_ORC`.
- `nethack-c/upstream/include/monsters.h:3074`: `Yeenoghu` has `M2_PNAME`.
- `nethack-c/upstream/include/monsters.h:3085`: `Orcus` has `M2_PNAME`; `M2_PRINCE` here does not imply bribe speech.
- `nethack-c/upstream/src/sounds.c:705`: `domonnoise()` remaps `MS_ORC` to `MS_HUMANOID` for same-race or hallucinating heroes.
- `nethack-c/upstream/src/sounds.c:987`: plain `MS_ORC` emits `grunts.`
- `nethack-c/upstream/src/sounds.c:1101`: non-special peaceful humanoids fall through to dungeon-exploration speech; hostile humanoids threaten earlier in the same switch.
- `nethack-c/upstream/src/do_name.c:997`: `M2_PNAME` proper-name monsters omit the article when no adjective is present.
- `nethack-c/upstream/src/sounds.c:1141`: `MS_BRIBE`/`MS_CUSS` handling is separate and not reached by these two entries.

## JS changes

- `js/cmd.js`
  - Added `Yeenoghu` and `Orcus` to generated `orc` sound inference, while keeping explicit `msound` metadata first.
  - Added a narrow proper-name display path for these `MS_ORC` proper-name demons plus an opt-in metadata flag.

## Tests

- `chat with visible generated-sound Yeenoghu grunts as MS_ORC` covers ordinary hostile visible direct `#chat` with no explicit `msound`.
- `hallucinating chat with visible generated-sound Orcus maps MS_ORC to humanoid threat` covers the hallucinated `MS_ORC -> MS_HUMANOID` remap for a hostile unique demon.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated-sound (gnome|Yeenoghu|Orcus)" test/shop-billing-helpers.test.mjs` - 4 pass, 1490 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1494 pass
- `node --test test/*.mjs` - 1636 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Hallucinated monster display-name substitution remains separate from this sound-routing slice.
- Broader proper-name `Monnam()` rendering remains separate.
- Broader generated `msound` coverage for the full monster table remains separate.
- Shared `domonnoise()`/`#chat` unification remains separate.
