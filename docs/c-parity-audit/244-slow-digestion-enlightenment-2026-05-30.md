# C Parity Audit 244: Slow Digestion Enlightenment

## Sources

- `nethack-c/upstream/src/insight.c:418-422`: ordinary `^X` only shows the detailed `Attributes:` section when magic enlightenment is enabled.
- `nethack-c/upstream/src/insight.c:2009-2017`: wizard/debug or explore mode `^X` adds `MAGICENLIGHTENMENT`, so detailed attributes are shown during an in-progress game.
- `nethack-c/upstream/src/zap.c:2525`, `nethack-c/upstream/src/potion.c:707`, and `nethack-c/upstream/src/fountain.c:287`: wand, potion, and fountain enlightenment use magic-only enlightenment during play.
- `nethack-c/upstream/src/end.c:594` and `nethack-c/upstream/src/end.c:651`: end-of-game disclosure uses basic plus magic enlightenment.
- `nethack-c/upstream/include/youprop.h:289-291`: `Slow_digestion` is the union of intrinsic and extrinsic slow digestion.
- `nethack-c/upstream/src/insight.c:1767-1771`: the physical-attributes portion prints `You have slower digestion.` when `Slow_digestion` is active.
- `nethack-c/upstream/src/insight.c:105-108` and `nethack-c/upstream/src/insight.c:148`: final disclosure uses the past-tense `You had slower digestion.` line shape.
- `nethack-c/upstream/src/attrib.c:911-961`: source attribution from `from_what()` is limited to wizard/debug mode and chooses one source by priority.

## JS Changes

- Routed live debug/explore attributes through `heroHasSlowDigestion()` so intrinsic state, worn rings, worn white dragon armor, and embedded matching white dragon skin all produce the C enlightenment line.
- Added the matching final/death attribute line using past tense.
- Kept ordinary non-debug `^X` unchanged; the current JS detailed attributes section is only shown for debug/explore in-progress attributes, matching the C gate for magic enlightenment.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Debug attributes list `You have slower digestion.` for worn white dragon scale mail.
- Debug attributes list the same line for a worn ring of slow digestion.
- White dragon form alone does not list slower digestion.

## Remaining Gaps

- Full wizard-mode `from_what()` source priority and source wording are still only partially modeled across the attributes page.
- Magic-only enlightenment from potions, wands, and fountains remains incomplete beyond currently modeled attribute-page routes.
- Digest combat and monster stomach slow-digestion interactions are covered separately in `docs/c-parity-audit/245-slow-digestion-digest-combat-2026-05-30.md`.
- Broader `set_uasmon()` property parity remains incomplete beyond currently modeled form antimagic, reflection, and cold-resistance slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "debug attributes|slow digestion|white dragon cold resistance|white dragon polyself|white dragon scales clears cold" test/shop-billing-helpers.test.mjs` (`14` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1166/1166` tests passed)
- `node --test test/*.mjs` (`1263/1263` tests passed)
- `npm run score` (`44/44` replay sessions passed)
