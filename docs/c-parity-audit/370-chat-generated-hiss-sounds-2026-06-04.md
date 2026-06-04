# Direct chat generated hiss sounds

Date: 2026-06-04

## Summary

Added C-backed generated-monster `MS_HISS` inference for direct chat sound routing. The exact-name bridge now covers active local generated/display rows whose C monster entries hiss but whose JS generated monster records do not carry `msound`, including cockatrices, mind flayers, couatls, and the snake names that the old broad fallback missed.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:20`: `MS_HISS` is the monster sound for hissing.
- `nethack-c/upstream/src/sounds.c:895` through `:901`: `MS_HISS` prints `hisses!` only when the monster is not peaceful; peaceful hissers return with no sound.
- `nethack-c/upstream/include/monsters.h:170` through `:191`: `chickatrice`, `cockatrice`, and `pyrolisk` use `MS_HISS`.
- `nethack-c/upstream/include/monsters.h:521` through `:536`: `mind flayer` and `master mind flayer` use `MS_HISS`.
- `nethack-c/upstream/include/monsters.h:1205` through `:1211`: `couatl` uses `MS_HISS`.
- `nethack-c/upstream/include/monsters.h:2167` through `:2217`: generated snake rows use `MS_HISS`; `python` and `water moccasin` were not covered by the old name fallback.
- `js/monster_data.js:11` through `:13`, `:49` through `:50`, `:120`, and `:207` through `:212`: local generated monster metadata includes these names without explicit `msound`.

## JS changes

- Extended `TIPHAT_GENERATED_SOUND_BY_MONSTER_NAME` with exact source-backed `hiss` entries.
- Kept the existing `tipHatMonsterNoise()` `hiss` branch unchanged, so hostile generated hissers consume a turn and print `hisses!`, while peaceful hissers stay quiet and do not consume a direct-chat turn.
- Left broader generated monster `msound` generation in `monsterFromRndMeta()` untouched; this remains a narrow chat-layer bridge.

## Tests

- Added `chat with visible generated hiss sound monsters uses C msound rows`.
- Hostile no-explicit-`msound` canaries:
  - `chickatrice`,
  - `pyrolisk`,
  - `mind flayer`,
  - `master mind flayer`,
  - `couatl`,
  - `python`,
  - `water moccasin`.
- Peaceful no-explicit-`msound` canary:
  - `cockatrice` returns no message, consumes no RNG, and does not take a direct-chat turn.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="generated hiss|generated silent|generated humanoid sound|generated special sound|generated nonverbal sound|visible generated-sound" test/shop-billing-helpers.test.mjs` - 9 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1502 pass
- `node --test test/*.mjs` - 1644 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Generated `MS_BARK` hell hounds and generated/display-backed bat `MS_SQEEK` rows remain separate follow-up candidates.
- Generated/display `MS_CUSS`, non-nymph `MS_SEDUCE`, and other special speech rows still need source-backed slices.
- The generated monster metadata pipeline still does not emit a general `msound` field.
