# Fire Inventory Fatal Vapor No-Return

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/zap.c:5825` through `nethack-c/upstream/src/zap.c:5857` prepares AD_FIRE item damage before the stack destruction rolls.
- `nethack-c/upstream/src/zap.c:5894` through `nethack-c/upstream/src/zap.c:5898` rolls each eligible stack unit with `!rn2(3)`.
- `nethack-c/upstream/src/zap.c:5903` through `nethack-c/upstream/src/zap.c:5918` prints the carried destruction message and calls `potionbreathe(obj)` before item consumption.
- `nethack-c/upstream/src/zap.c:5929` through `nethack-c/upstream/src/zap.c:5941` performs `useup()` and potion explosion `losehp()` only after vapor returns.
- `nethack-c/upstream/src/potion.c:1932` through `nethack-c/upstream/src/potion.c:2108` marks the potion `in_use` while vapor effects run.
- `nethack-c/upstream/src/potion.c:2086` calls `you_unwere(FALSE)` for blessed water vapor while in a matching were-form.
- `nethack-c/upstream/src/polyself.c:1397` through `nethack-c/upstream/src/polyself.c:1404` calls `done(DIED)` if the restored old form is not healthy enough.
- `nethack-c/upstream/src/end.c:1081` through `nethack-c/upstream/src/end.c:1119` returns from `done()` when life saving succeeds, while `nethack-c/upstream/src/end.c:1124` continues to final death when it does not.
- `nethack-c/upstream/src/restore.c:113` through `nethack-c/upstream/src/restore.c:122` cleans up `in_use` inventory objects during final death.

## JS Parity Slice

- Kept the potion fire damage RNG setup before vapor so the C call order remains `rn2(5)`, `rnd(6)`, then per-item `rn2(3)`.
- Deferred applying potion explosion damage to the returned event/result until after direct vapor returns.
- Added an unsaved-fatal vapor return from `fireDamageInventory()` before `useUpInventoryItem()`, the post-vapor `rn2(2)`, later selected stacks, and post-destroy ignition.
- Preserved the life-saving path: when vapor consumes an amulet and resumes, the destroyed potion is still consumed and the normal post-vapor behavior continues.

## Tests

- `fatal inventory fire water vapor stops before potion use-up without lifesaving`
- `blessed water vapor rehumanize old form death from destroyed inventory potion preserves lifesaving metadata`
- `inventory fire destroying an unpaid carried potion applies vapor before use-up and preserves the bill`

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "fatal inventory fire water vapor stops before potion use-up|blessed water vapor rehumanize old form death from destroyed inventory potion|inventory fire destroying an unpaid carried potion" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "fireDamageInventory|inventory fire|destroyed inventory potion|fire payload|fire breath|wand of fire|fire ray|flaming sphere|blessed water vapor rehumanize old form death|fatal inventory fire water vapor" test/shop-billing-helpers.test.mjs
git diff --check
node --check js/cmd.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused fatal-vapor/life-saving/unpaid-potion tests passed; broader fire/inventory pattern passed; `git diff --check` passed; `node --check` passed for `js/cmd.js` and `test/shop-billing-helpers.test.mjs`; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Direct fatal lava rescue still lacks C's repeated `safe_teleds()` failure countermeasures and manual landing `spoteffects(FALSE)` detail.
