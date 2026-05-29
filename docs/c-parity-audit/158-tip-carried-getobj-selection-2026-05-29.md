# Tip Carried Getobj Selection

## C Anchors

- `nethack-c/upstream/src/pickup.c:3481` implements `tip_ok()`.
- `nethack-c/upstream/src/pickup.c:3485` suggests containers.
- `nethack-c/upstream/src/pickup.c:3490` suggests a horn of plenty only when it is described and globally known.
- `nethack-c/upstream/src/pickup.c:3495` downplays all other non-coin inventory.
- `nethack-c/upstream/src/pickup.c:3624` calls `getobj("tip", tip_ok, GETOBJ_PROMPT)` after floor-container handling.
- `nethack-c/upstream/src/pickup.c:3628` spends time for containers and horns.
- `nethack-c/upstream/src/pickup.c:3633` handles wax/oil/grease/crumbs/venom spillage.
- `nethack-c/upstream/src/pickup.c:3667` reports potion sealed, hat tipping, statue, and generic no-effect branches without spending time.
- `nethack-c/upstream/src/invent.c:1872` splits `getobj()` candidates into suggested prompt letters and downplayed `altlets`.
- `nethack-c/upstream/src/invent.c:1931` uses `[*]` when only downplayed choices exist.
- `nethack-c/upstream/src/invent.c:1963` makes `?` show suggestions or a downplayed fallback, while `*` shows full inventory.
- `nethack-c/upstream/src/invent.c:2007` rejects direct gold selection with `You cannot tip gold.`

## JS Change

- Replaced the carried `#tip` source list with `tipSelectionKind()`: coins are excluded, containers and known horns are suggested, and all other carried inventory is downplayed.
- `#tip` now opens a getobj-style carried prompt instead of auto-confirming one carried source.
- `?` shows suggested candidates or downplayed fallback; `*` shows all non-coin inventory.
- Direct ordinary carried choices now follow C no-effect branches: potions are securely sealed, statues are uninteresting, generic objects do nothing, and spillage still spends a turn.
- Unknown horns of plenty remain selectable but downplayed; known horns are suggested only when described and globally discovered.
- Direct gold selection prints `You cannot tip gold.` and cancels without a move.
- Destination-menu cancellation after source selection now spends the selected-source action.
- Crumb spillage on water/lava now uses C's plural verb shape.

## Tests

- `tip question menu shows suggested sources while star menu exposes downplayed inventory`
- `unknown horn of plenty is downplayed but directly selectable for tip`
- `known horn of plenty is suggested as a tip source`
- `ordinary carried tip selections use C no-effect branches without a move`
- `potion tip selections report sealed bottles without a move`
- `tip excludes gold and rejects direct gold selection`
- `tip with only gold has no carried source prompt`
- `canceling tip destination after source selection spends the action`
- `tip crumbs use plural water and lava spillage verbs`
- Focused command used during development: `node --test --test-name-pattern "tip|horn of plenty|bag of tricks|can of grease|spillage" test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Helmet `tiphat()` behavior remains open.
- The carried prompt is still local `#tip` code rather than a reusable `getobj()` callback primitive.
- Broader container destination fidelity, including every C menu edge, remains separate container work.
