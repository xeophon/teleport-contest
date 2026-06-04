# Direct chat generated cuss sounds

Date: 2026-06-04

## Summary

Added C-backed generated-monster `MS_CUSS` inference for direct chat sound routing. The exact-name bridge now covers active local generated rows whose C monster entries cuss but whose JS generated monster records do not carry `msound`.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:49`: `MS_CUSS` is the monster sound for berating or intimidating the hero.
- `nethack-c/upstream/src/sounds.c:1148` through `:1154`: direct monster noise routes peaceful cussers to the doomed/redemption lines and hostile cussers to `cuss(mtmp)`.
- `nethack-c/upstream/include/monsters.h:1234`: `Angel` uses `MS_CUSS`.
- `nethack-c/upstream/include/monsters.h:1259`: `Archon` uses `MS_CUSS`.
- `nethack-c/upstream/include/monsters.h:2975`: `marilith` uses `MS_CUSS`.
- `nethack-c/upstream/include/monsters.h:3039`: `sandestin` uses `MS_CUSS`.
- `js/monster_data.js:122`, `:124`, `:265`, and `:272`: local generated monster metadata includes those names without explicit `msound`.

## JS changes

- Extended `TIPHAT_GENERATED_SOUND_BY_MONSTER_NAME` with exact source-backed `cuss` entries for `Angel`, `Archon`, `marilith`, and `sandestin`.
- Left the existing broad `imp` fallback unchanged; `imp` was already covered locally.
- Left non-nymph `MS_SEDUCE` rows unchanged. C can enter full `doseduce()` behavior for amorous demons, while the current JS `seduce` branch intentionally handles only nymph-style chat text.
- Left broader generated monster `msound` generation in `monsterFromRndMeta()` untouched; this remains a narrow chat-layer bridge.

## Tests

- Added `chat with visible generated cuss sound monsters uses C msound rows`.
- Deterministic no-explicit-`msound` canaries:
  - peaceful `Angel` and `Archon` with lawful-minion metadata say `"It's not too late."`,
  - peaceful `marilith` and `sandestin` say `"We're all doomed."`.
- Each canary asserts no RNG consumption, one direct-chat turn, and no fallback `doesn't respond` message.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern="generated cuss|generated bark and sqeek|generated hiss|generated silent|generated humanoid sound|generated special sound|generated nonverbal sound|visible generated-sound" test/shop-billing-helpers.test.mjs` - 11 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1504 pass
- `node --test test/*.mjs` - 1646 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Non-nymph `MS_SEDUCE` for `amorous demon` needs a separate source-backed slice because C may call `doseduce()` instead of printing simple nymph text.
- Special `Wizard of Yendor` `MS_CUSS` metadata remains separate from the generated/common monster bridge.
- The generated monster metadata pipeline still does not emit a general `msound` field.
