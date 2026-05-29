# `#apply` getobj candidates and coin flip

Date: 2026-05-29.

## C anchors

- `nethack-c/upstream/src/apply.c:4151-4209` classifies `#apply` candidates in `apply_ok()`: tools/wands/spellbooks and supported weapon tools are suggested, coins and unknown potions are downplayed, and known invalid objects can be selected from a full menu but are not prompt suggestions.
- `nethack-c/upstream/src/apply.c:4226-4241` calls `getobj("use or apply", apply_ok, GETOBJ_NOFLAGS)` and dispatches selected coins through `flip_coin()`.
- `nethack-c/upstream/src/apply.c:4527-4555` implements `flip_coin()`: print the flip line, lose one coin underwater or on slippery/fumbling/low-Dex mishaps, otherwise roll hallucinated edge/double-header or ordinary heads/tails.
- `nethack-c/upstream/src/invent.c:1872-2095` keeps `getobj()` prompt letters to suggested objects, shows downplayed objects through the fallback list/menu, and exposes full inventory through `*`.

## JS changes

- Added a local `#apply` selection classifier in `js/cmd.js` so the initial prompt, `?`, `*`, direct letter handling, and invalid-object rejection use one candidate contract.
- Coins now count as downplayed apply candidates. A gold-only inventory prompts with `[*]`, direct `$` is accepted, and normal flips consume a turn without changing the purse.
- Implemented coin mishaps for underwater/slippery/fumbling/low-Dex cases; mishaps remove one carried gold piece and put one gold piece on the hero square.
- Unknown potions are downplayed. Unknown oil can still be applied by direct letter, while unknown non-oil potions and known invalid full-menu selections are rejected with the C-shaped "Sorry" message without spending a move.
- `?` now shows only suggested apply objects when any exist and falls back to downplayed objects only when there are no suggestions. `*` shows the full inventory, including downplayed and selectable-invalid objects.

## Regression coverage

- `test/shop-billing-helpers.test.mjs` now covers gold-only apply prompts, normal and underwater coin flips, `?` versus `*` menu contents, unknown oil direct apply, unknown non-oil direct rejection, full-menu known-invalid rejection, and no prompt for only known-invalid inventory.

## Remaining gaps

- This is still a local `#apply` contract, not a reusable `getobj()` primitive. Other commands still need source-backed prompt/downplay/full-menu migration one command at a time.
- The gray-stone/touchstone branch from `apply_ok()` is not completed here because the corresponding apply behavior is not yet implemented in JS.
- Coin slip handling covers the C-visible branches but does not yet route through a shared object-drop/shop placement primitive.
