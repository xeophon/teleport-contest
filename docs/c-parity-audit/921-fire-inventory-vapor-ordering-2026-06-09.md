# Fire Inventory Vapor Ordering

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/zap.c:5825` through `nethack-c/upstream/src/zap.c:5857` prepares AD_FIRE item damage before destruction rolls. Potions use `rnd(6)`, scrolls and spellbooks use 1, and green slime globs use `(owt + 19) / 20`.
- `nethack-c/upstream/src/zap.c:5894` through `nethack-c/upstream/src/zap.c:5898` rolls each eligible stack unit with `!rn2(3)`.
- `nethack-c/upstream/src/zap.c:5903` through `nethack-c/upstream/src/zap.c:5918` prints the destruction message before direct carried-potion vapor.
- `nethack-c/upstream/src/zap.c:5919` through `nethack-c/upstream/src/zap.c:5933` performs worn/current-wand cleanup and `useup()` after vapor returns.
- `nethack-c/upstream/src/potion.c:1932` through `nethack-c/upstream/src/potion.c:2108` shows `potionbreathe()` temporarily marks the object `in_use`, applies vapor effects, restores `in_use` when needed, and leaves object cleanup to the caller.

## JS Parity Slice

- Changed `addFireInventoryMessage()` to return the exact event object pushed into `events`, including the armor-message join case.
- Changed generic `fireDamageInventory()` to record the destruction message/event before direct `potionBreathe()` side effects.
- Kept vapor text in `event.insertAfter` and in rendered `messages` after the destruction text.
- Kept destroyed item use-up after vapor side effects so shop used-up billing and C's live-object vapor behavior are preserved.

## Tests

- `inventory fire destroying an unpaid carried potion applies vapor before use-up and preserves the bill`
- `blessed water vapor rehumanize old form death from destroyed inventory potion preserves lifesaving metadata`
- `fire trap command inventory fire that destroys blessed water uses lifesaving for old-form death`

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "inventory fire destroying an unpaid carried potion|blessed water vapor rehumanize old form death|fire trap command inventory fire" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "fireDamageInventory|inventory fire|destroyed inventory potion|carried fire destruction|lava survivor|fire payload|fire breath|wand of fire|fire ray|flaming sphere|fire inventory|blessed water vapor rehumanize old form death|fire trap command inventory fire" test/shop-billing-helpers.test.mjs
git diff --check
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused inventory-fire vapor tests passed; broader fire/inventory and queued-vapor pattern passed; `git diff --check` passed; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Fatal unsaved vapor in `fireDamageInventory()` still consumes the destroyed potion in JS because C's `done()` does not return from `potionbreathe()` when life saving does not resume.
- Hallucinated `hcolor("dark red")` variation for Book glow feedback remains fixed to `dark red`.
- Direct fatal lava rescue still lacks C's repeated `safe_teleds()` failure countermeasures and manual landing `spoteffects(FALSE)` detail.
