# C Parity Audit 847: Genocide Master Title Alias Refusal

Closed an ordinary genocide parser gap for C's `Master of Thieves` and `Master Assassin` title aliases. C maps `master of thief`, `master thief`, and `master of assassin` before falling back to rank-title parsing; the resolved targets are real unique quest monsters but lack `G_GENO`, so ordinary scroll genocide takes the divine refusal path. JS previously did not expose these quest monsters to the genocide catalog and could report those inputs as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters take the divine refusal path.
- `nethack-c/upstream/src/mondata.c:936` through `:941`: C pre-normalizes terminal `ies` and `ves`, which turns `master of thieves` into `master of thief` and `master thieves` into `master thief`.
- `nethack-c/upstream/src/mondata.c:962` through `:966`: `name_to_monplus()` maps `master of thief` and `master thief` to `PM_MASTER_OF_THIEVES`, and maps `master of assassin` to `PM_MASTER_ASSASSIN`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept only end, space, or apostrophe remainders.
- `nethack-c/upstream/src/mondata.c:1038` through `:1067`: canonical monster names use C's broader prefix rules, which accept `Master of Thieves` with trailing corpse text.
- `nethack-c/upstream/src/mondata.c:1073`: C falls back to `title_to_mon()` only after alternate and canonical matching fail.
- `nethack-c/upstream/include/monsters.h:3566` through `:3575`: `Master of Thieves` is `G_NOGEN | G_UNIQ` and lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:3723` through `:3732`: `Master Assassin` is `G_NOGEN | G_UNIQ` and lacks `G_GENO`.

## JS Changes

- `js/cmd.js:31001`
  - Added genocide-only catalog rows for `Master of Thieves` and `Master Assassin`, matching the C-backed quest monster metadata needed by lookup.
- `js/cmd.js:31017`
  - Marked normalized `master of thief` and `master assassin` as forbidden ordinary genocide targets so they take C's divine refusal before unique-monster refusal.
- `js/cmd.js:31027`
  - Added `master of thieves` to the as-is plural set to avoid malformed class-genocide wording if the unique target is encountered through the `@` class.
- `js/cmd.js:31031`
  - Added C title aliases for `master of thief`, `master thief`, and `master of assassin`.
  - Added a targeted `master of thieves` row so JS preserves C's trailing-text behavior for the canonical `Master of Thieves` name despite JS's terminal `ves` normalization.

## Tests

- `test/shop-billing-helpers.test.mjs:13884`
  - Added ordinary genocide canaries for `master of thieves`, `master of thief`, `master thieves`, `master thief`, `master assassin`, `master assassins`, `master of assassin`, and trailing corpse/possessive text cases, requiring divine refusal, retry mode, no nonexistent message, no unique-monster refusal, and no wipeout.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C master title aliases before G_GENO refusal|genocide resolves C priest title aliases before G_GENO refusal|genocide resolves C djinni aliases before G_GENO refusal|genocide refuses C non-G_GENO ki-rin aliases" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader `title_to_mon()` rank-title fallback remains intentionally out of scope for this slice.
