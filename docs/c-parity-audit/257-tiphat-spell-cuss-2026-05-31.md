# C Parity Audit 257: Tiphat Spell Cuss

## Sources

- `nethack-c/upstream/src/sounds.c:688-692`: `domonnoise()` returns early when the hero is deaf or the monster is silent.
- `nethack-c/upstream/src/sounds.c:719-720`: unseen responders are mapped before sound-specific output.
- `nethack-c/upstream/src/sounds.c:1148-1155`: `MS_CUSS` delegates hostile monsters to `cuss()`, but peaceful lawful minions verbalize `It's not too late.` and other peaceful cussers verbalize `We're all doomed.`.
- `nethack-c/upstream/src/sounds.c:1156-1159`: `MS_SPELL` emits `seems to mutter a cantrip.` without casting or RNG.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `pline_msg` is emitted with `Monnam(mtmp)` and `verbl_msg` is emitted through `verbalize1()`.
- `nethack-c/upstream/src/sounds.c:1503-1529`: directed `tiphat()` clears wait strategy, intercepts visible humanoids, and only then reaches `domonnoise()` for adjacent fallback responders.
- `nethack-c/upstream/include/monsters.h:559-565`: imps are non-humanoid `MS_CUSS` monsters.
- `nethack-c/upstream/include/monsters.h:1244-1253`: ki-rin are non-humanoid `MS_SPELL` monsters.

## JS Changes

- Added `tiphat()` sound inference for `ki-rin` as `spell` before broader animal fallbacks.
- Added `tiphat()` sound inference for `imp` as `cuss`.
- Added deterministic `spell` handling in `tipHatMonsterNoise()` with the C `pline_msg` wording.
- Added only the peaceful `cuss` branches in `tipHatMonsterNoise()`, including the lawful-minion quote hook. Hostile `MS_CUSS` remains deliberately unmodeled because C enters broader `cuss()` pager/RNG behavior.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes visible ki-rin mutter a cantrip`
- `worn helmet tip makes peaceful imp cuss about doom`
- `worn helmet tip makes peaceful lawful minion cuss about redemption`

## Remaining Gaps

- Hostile `MS_CUSS` remains open; C routes that through `cuss(mtmp)` rather than the deterministic peaceful messages.
- Visible humanoid `MS_SPELL`/`MS_CUSS` monsters are still expected to use the existing visible humanoid `tiphat()` response path before noise handling.
- Broader shared `domonnoise()`/`#chat` behavior remains unmodeled.
- Generic monster-data `msound` generation remains incomplete; this slice only adds source-backed local fallbacks for covered `tiphat()` paths.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'ki-rin|peaceful imp|lawful minion|naga|mumble' test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1210/1210` tests passed)
- `node --test test/*.mjs` (`1307/1307` tests passed)
- `npm run score` (`44/44` replay sessions passed)
