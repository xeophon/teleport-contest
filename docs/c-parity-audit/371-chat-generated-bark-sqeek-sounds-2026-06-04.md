# Direct chat generated bark and sqeek sounds

Date: 2026-06-04

## Summary

Added C-backed generated-monster `MS_BARK` and `MS_SQEEK` inference for direct chat sound routing. The exact-name bridge now covers local generated/display rows whose C monster entries bark or squeak but whose JS generated monster records do not carry `msound`.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:12`: `MS_BARK` is the monster sound for barking.
- `nethack-c/upstream/include/monflag.h:17`: `MS_SQEEK` is the monster sound for squeaking.
- `nethack-c/upstream/src/sounds.c:837` through `:854`: `MS_BARK` uses the full-moon, tame, peaceful, and hostile bark/growl branches.
- `nethack-c/upstream/src/sounds.c:883` through `:886`: `MS_SQEEK` prints a squeak.
- `nethack-c/upstream/include/monsters.h:297` through `:308`: `hell hound pup` and `hell hound` use `MS_BARK`.
- `nethack-c/upstream/include/monsters.h:1269` through `:1294`: `bat`, `giant bat`, and `vampire bat` use `MS_SQEEK`.
- `js/monster_data.js:26` through `:27`: local hell hound rows exist without explicit `msound`.
- `js/monster_data.js:125` through `:128`: local bat rows exist without explicit `msound`; `raven` is already a separate `MS_SQAWK` row.

## JS changes

- Extended `TIPHAT_GENERATED_SOUND_BY_MONSTER_NAME` with exact source-backed `bark` entries for `hell hound pup` and `hell hound`.
- Extended the same map with exact source-backed `sqeek` entries for `bat`, `giant bat`, and `vampire bat`.
- Left already-covered ordinary dog, rodent, and gecko broad fallbacks unchanged.
- Left broader generated monster `msound` generation in `monsterFromRndMeta()` untouched; this remains a narrow chat-layer bridge.

## Tests

- Added `chat with visible generated bark and sqeek sound monsters uses C msound rows`.
- Peaceful no-explicit-`msound` canary:
  - `hell hound pup` barks.
- Hostile no-explicit-`msound` canaries:
  - `hell hound` growls,
  - `bat` squeaks,
  - `giant bat` squeaks,
  - `vampire bat` squeaks.
- Each canary asserts no RNG consumption, one direct-chat turn, and no fallback `doesn't respond` message.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern="generated bark and sqeek|generated hiss|generated silent|generated humanoid sound|generated special sound|generated nonverbal sound|visible generated-sound" test/shop-billing-helpers.test.mjs` - 10 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1503 pass
- `node --test test/*.mjs` - 1645 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Generated/display `MS_CUSS`, non-nymph `MS_SEDUCE`, and remaining special speech rows still need source-backed slices.
- The generated monster metadata pipeline still does not emit a general `msound` field.
