# C Parity Audit 296: Chat Pre-Direction Gates

## Sources

- `nethack-c/upstream/src/sounds.c:1263-1279`: `dochat()` blocks before `getdir("Talk to whom? (in what direction)")` for silent hero forms, strangulation, swallowed state, and underwater state; every branch returns `ECMD_OK`.
- `nethack-c/upstream/src/sounds.c:1263-1266`: silent hero forms use `As %s, you cannot speak.` with `an(pmname(...))`.
- `nethack-c/upstream/include/mondata.h:62` and `nethack-c/upstream/include/monflag.h:10-11`: C silence is `ptr->msound == MS_SILENT`, where `MS_SILENT` is zero.
- `nethack-c/upstream/src/sounds.c:1268-1278`: the remaining pre-direction messages are `"You can't speak.  You're choking!"`, `"They won't hear you out there."`, and `"Your speech is unintelligible underwater."`.
- `nethack-c/upstream/src/sounds.c:1280`: shop-floor price quoting follows these gates and remains a separate `ECMD_TIME` path.

## JS Changes

- Added `beginChatCommand()` so `#chat` runs C's pre-direction gates before setting `game._command_mode = 'chatDirection'`.
- Added `chatPreDirectionMessage()` in C order:
  - silent polymorphed hero: `As an acid blob, you cannot speak.`
  - strangled hero: `You can't speak.  You're choking!`
  - swallowed hero: `They won't hear you out there.`
  - underwater hero: `Your speech is unintelligible underwater.`
- Reused the existing strangulation helper and the local underwater state convention (`uinwater`, `underwater`, `uunderwater`) so blocked cases clear command mode without consuming a turn.
- Recognized current polyself silence metadata plus the C `MS_SILENT == 0` convention; a small source-backed fallback set covers silent forms present in the local monster tables that do not yet carry full `msound` metadata.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `silent polyform chat is blocked before direction prompt`
- `strangulation blocks chat before direction prompt`
- `swallowed chat is blocked before direction prompt`
- `underwater chat is blocked before direction prompt`

Each test verifies the exact message, no `Talk to whom?` prompt, no pending chat direction mode, and no consumed move.

## Remaining Gaps

- Shop-floor `#chat` price quoting is still open; C handles it after these gates and before direction input.
- Direction target validation still lacks statue/object/furniture mimic handling and hallucinated wall/object behavior.
- Silent polyself detection should eventually come from complete monster `msound` metadata instead of the fallback name set.
- Individual `domonnoise()` sound classes still inherit the current helper's approximations.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "silent polyform chat|strangulation blocks chat|swallowed chat|underwater chat|chat up without a steed|chat down without a steed|chat with visible dog uses monster noise" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`
