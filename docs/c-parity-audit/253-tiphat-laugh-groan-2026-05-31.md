# C Parity Audit 253: Tiphat Laugh Groan

## Sources

- `nethack-c/upstream/include/monflag.h:34,59`: `MS_LAUGH` and `MS_GROAN` sound constants.
- `nethack-c/upstream/src/sounds.c:688-693`: `domonnoise()` returns early when the hero is deaf or the monster is silent.
- `nethack-c/upstream/src/sounds.c:719-720`: unseen responders are mapped before the sound-specific switch runs.
- `nethack-c/upstream/src/sounds.c:941-946`: `MS_GROAN` consumes `rn2(3)` and only emits `groans.` on zero.
- `nethack-c/upstream/src/sounds.c:976-983`: `MS_LAUGH` selects `giggles.`, `chuckles.`, `snickers.`, or `laughs.` with `rn2(4)`.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `pline_msg` is emitted with `Monnam(mtmp)` prepended, and `domonnoise()` still returns `ECMD_TIME` when no groan text was produced.
- `nethack-c/upstream/src/sounds.c:1503-1529`: directed `tiphat()` clears wait strategy first, handles visible humanoids before `domonnoise()`, and reaches sound handling only for adjacent non-deaf responders after that.
- `nethack-c/upstream/include/monsters.h:448-453,660-664`: gremlins and leprechauns use `MS_LAUGH`.
- `nethack-c/upstream/include/monsters.h:2421-2490`: zombie species use `MS_GROAN`; ghouls remain `MS_SILENT`.

## JS Changes

- Added local `tiphat()` sound inference for gremlins, leprechauns, and zombie-shaped monsters while excluding ghouls from the groan fallback.
- Treated gremlins, leprechauns, and zombies as humanoid for visible directed `#tip`, matching C's visible humanoid interception before `domonnoise()`.
- Added `MS_LAUGH` handling with the exact four-message `rn2(4)` table.
- Added `MS_GROAN` handling with the C one-in-three emitted groan and handled-but-empty response on nonzero rolls.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes adjacent invisible leprechaun laugh randomly`
- `worn helmet tip visible leprechaun uses humanoid response before laugh`
- `worn helmet tip adjacent invisible zombie may groan`
- `worn helmet tip adjacent invisible zombie silent groan roll still consumes response`

## Remaining Gaps

- The helper remains `tiphat()`-local and still does not replace full shared `domonnoise()`/`#chat` behavior.
- Broader shopkeeper, priest, quest, vampire, werecreature, Rider, Oracle, hallucinated gecko sell-routing, and broader special speakers remain open.
- Generic monster-data `msound` generation remains incomplete; this slice only adds narrow source-backed name fallbacks for covered species.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip.*(laugh|groan|leprechaun|zombie)|deaf worn helmet tip|worn helmet tip trumpet|worn helmet tip shriek" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1200/1200` tests passed)
- `node --test test/*.mjs` (`1297/1297` tests passed)
- `npm run score` (`44/44` replay sessions passed)
