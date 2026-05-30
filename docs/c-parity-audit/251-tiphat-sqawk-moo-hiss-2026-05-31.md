# C Parity Audit 251: Tiphat Sqawk Moo Hiss

## Sources

- `nethack-c/upstream/src/sounds.c:710-711`: untame `MS_MOO` responders are promoted to `MS_BELLOW` before `domonnoise()` dispatch.
- `nethack-c/upstream/src/sounds.c:719-720`: unseen responders are mapped before the sound-specific switch runs.
- `nethack-c/upstream/src/sounds.c:887-893`: hostile ravens use the verbal `"Nevermore!"` branch; other `MS_SQAWK` responders squawk.
- `nethack-c/upstream/src/sounds.c:895-900`: peaceful `MS_HISS` responders return success with no sound.
- `nethack-c/upstream/src/sounds.c:923-931`: tame `MS_MOO` responders still moo; promoted `MS_BELLOW` responders bellow.
- `nethack-c/upstream/src/sounds.c:1222-1238`: `pline_msg` uses `Monnam(mtmp)` while `verbl_msg` is emitted through `verbalize1()`.
- `nethack-c/upstream/src/sounds.c:1526-1533`: adjacent `tiphat()` treats successful `domonnoise()` as the response path, maps unseen responders on truthy return, and otherwise falls through to visible nonresponse or `Nothing happens.`
- `nethack-c/upstream/include/monsters.h:581-585,1284-1288`: tengu and raven use `MS_SQAWK`.
- `nethack-c/upstream/include/monsters.h:831-835,1786-1790`: rothe and minotaur use `MS_MOO`.

## JS Changes

- Added local `tiphat()` sound inference for raven/tengu `MS_SQAWK` and rothe/minotaur `MS_MOO` so explicit test fixtures are not required.
- Added `MS_SQAWK` handling with the hostile-raven `"Nevermore!"` verbal branch and ordinary squawk fallback.
- Promoted local untame `MS_MOO` handling to `MS_BELLOW` before the animal-noise switch while leaving tame mooing responders unchanged.
- Changed peaceful `MS_HISS` handling to report the C-shaped unsuccessful no-message response while still carrying the pre-switch invisible mapping side effect.
- Counted only non-empty `tiphat()` message parts when deciding whether the combined message should require `--More--`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes hostile raven say nevermore`
- `worn helmet tip makes peaceful raven squawk`
- `worn helmet tip makes peaceful tengu squawk`
- `worn helmet tip promotes non-tame mooing monsters to bellow`
- `worn helmet tip maps invisible non-tame mooing monster after bellow`
- `worn helmet tip leaves tame mooing monsters as moo`
- `worn helmet tip maps invisible peaceful hiss before fallback message`
- `worn helmet tip makes visible peaceful hiss fall back to nonresponse`

## Remaining Gaps

- The helper remains `tiphat()`-local and still does not replace full shared `domonnoise()`/`#chat` behavior.
- Focused trumpet wake and shriek aggravation canaries are covered by `docs/c-parity-audit/252-tiphat-wake-aggravate-2026-05-31.md`.
- Focused laugh and groan canaries are covered by `docs/c-parity-audit/253-tiphat-laugh-groan-2026-05-31.md`.
- Broader shopkeeper, priest, quest, vampire, werecreature, Rider, Oracle, and hallucinated gecko branches remain open.
- Generic monster-data `msound` generation remains incomplete; this slice only adds narrow source-backed name fallbacks for covered species.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip" test/shop-billing-helpers.test.mjs` (`28` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1193/1193` tests passed)
- `node --test test/*.mjs` (`1290/1290` tests passed)
- `npm run score` (`44/44` replay sessions passed)
