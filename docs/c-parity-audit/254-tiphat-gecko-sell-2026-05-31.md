# C Parity Audit 254: Tiphat Gecko Sell Speech

## Sources

- `nethack-c/upstream/src/sounds.c:657-674`: `mon_is_gecko()` accepts both actual geckos and monsters whose current display glyph decodes to `PM_GECKO`.
- `nethack-c/upstream/src/sounds.c:688-714`: `domonnoise()` returns early for deaf heroes or silent non-shopkeepers, then maps hallucinated geckos to `MS_SELL`.
- `nethack-c/upstream/src/sounds.c:733-743`: `MS_SELL` emits `15 minutes could save you 15 %s.` under hallucination unless the shopkeeper RNG branch delegates to `shk_chat()`.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `verbl_msg` is emitted through `verbalize1()` and `domonnoise()` returns `ECMD_TIME`.
- `nethack-c/upstream/src/sounds.c:1465-1529`: directed `tiphat()` reaches `domonnoise()` only after scan filtering, wait-strategy clearing, and visible humanoid interception.
- `nethack-c/upstream/include/monsters.h:3268-3274`: geckos are lizards with `MS_SQEEK`, so nonhallucinating geckos squeak normally.

## JS Changes

- Added a `tiphat()`-local gecko detector that recognizes actual geckos and displayed hallucination indices whose hallucinated monster name is `gecko`.
- Stored hallucinated monster indices on level cells when display rendering picks a hallucinated monster glyph, avoiding a broad `:`/color approximation for apparent geckos.
- Routed hallucinating gecko `tiphat()` noise to the quoted C sell-speech gag without touching shop billing, `#chat`, or shopkeeper state.
- Added gecko `MS_SQEEK` name fallback so nonhallucinating directed `#tip` still produces `The gecko squeaks.`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `hallucinating worn helmet tip at actual gecko uses sell speech`
- `hallucinating worn helmet tip routes displayed gecko through sell speech`
- `nonhallucinating worn helmet tip at gecko squeaks normally`

## Remaining Gaps

- The helper remains `tiphat()`-local and still does not replace full shared `domonnoise()`/`#chat` behavior.
- Actual hallucinating shopkeeper `MS_SELL` RNG delegation to `shk_chat()` remains open.
- Broader priest, quest, vampire, werecreature, Rider, Oracle, and other special speakers remain open.
- Generic monster-data `msound` generation remains incomplete; this slice only adds the source-backed gecko fallback and apparent-gecko display bridge needed by covered `tiphat()` paths.

## Verification

- `node --check js/cmd.js`
- `node --check js/display.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'gecko|displayed gecko|actual gecko|nonhallucinating worn helmet tip at gecko' test/shop-billing-helpers.test.mjs` (`3` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1203/1203` tests passed)
- `node --test test/*.mjs` (`1300/1300` tests passed)
- `npm run score` (`44/44` replay sessions passed)
