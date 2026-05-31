# Direct chat hallucinated humanoid subject

Date: 2026-05-31

## Summary

Aligned direct `#chat` hostile humanoid output with C `Monnam()` hallucination behavior. When a visible hallucinating hero chats with a hostile humanoid, including an `MS_ORC` monster remapped to `MS_HUMANOID`, the threat message keeps the C suffix but uses a display-RNG hallucinated subject instead of the true monster name.

## Upstream source anchors

- `nethack-c/upstream/src/sounds.c:705`: `domonnoise()` remaps `MS_ORC` to `MS_HUMANOID` for same-race or hallucinating heroes.
- `nethack-c/upstream/src/sounds.c:1025`: hostile `MS_HUMANOID` sets `pline_msg = "threatens you."`
- `nethack-c/upstream/src/sounds.c:1222`: final `pline_msg` output formats through `pline("%s %s", Monnam(mtmp), pline_msg)`.
- `nethack-c/upstream/src/sounds.c:1379`: direct `#chat` identifies the adjacent monster target before `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:1408`: direct `#chat` calls `domonnoise(mtmp)` after wake, visibility, deaf, and eating checks.
- `nethack-c/upstream/src/do_name.c:861`: `x_monnam()` enables hallucinated naming unless suppressed.
- `nethack-c/upstream/src/do_name.c:863`: unseen monsters return `it` before hallucinated name substitution, so this display RNG only applies to visible subjects.
- `nethack-c/upstream/src/do_name.c:950`: hallucinated monster names come from `rndmonnam()`.
- `nethack-c/upstream/src/do_name.c:1074`: `Monnam()` calls `mon_nam()` and capitalizes the result.
- `nethack-c/upstream/src/do_name.c:1399`: `rndmonnam()` uses display RNG for hallucinated monster-name selection.
- `nethack-c/upstream/src/do_name.c:1407`: real hallucinated monster names consume display RNG again for gendered `pmname()`.
- `nethack-c/upstream/src/rnd.c:66`: display RNG is explicitly separate from gameplay RNG.

## JS changes

- `js/cmd.js`
  - Added `tipHatMonsterPlineName()` for the hostile humanoid `pline_msg` equivalent.
  - Kept invisible subjects as `It`, matching C's early unseen-monster return before hallucinated substitution.
  - Kept spoken/verbalized branches unchanged; this is only for final `Monnam()` + `pline_msg` output.

## Tests

- Hardened the hallucinated direct Orcus `MS_ORC` remap canary so it rejects the true `Orcus` subject and records display RNG, not core RNG.
- Added direct hostile `MS_HUMANOID` soldier coverage for the same hallucinated subject rule independent of `MS_ORC` remapping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="hallucinating chat with visible" test/shop-billing-helpers.test.mjs` - 2 pass, 1494 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1496 pass
- `node --test test/*.mjs` - 1638 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Broader `Monnam()` hallucinated article/personal-name exactness remains separate.
- Broader generated `msound`, race, and `M2_MAGIC` monster-table coverage remains separate.
- Shared `domonnoise()`/`#chat` unification remains separate.
- Worn helmet `#tip` visible-humanoid reactions remain deliberately separate because C intercepts visible humanoids before `domonnoise()`.
