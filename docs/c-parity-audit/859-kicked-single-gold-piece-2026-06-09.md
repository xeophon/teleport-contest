# Kicked Single Gold Piece

## C anchors

- `nethack-c/upstream/src/dokick.c:558` marks kicked coins with `isgold`.
- `nethack-c/upstream/src/dokick.c:612` uses `doname()` directly for coins in the kick message, rather than `singular(..., doname)`.
- `nethack-c/upstream/src/dokick.c:692` enters the coin scatter branch only when `quan > 1L`, so a single floor gold piece follows ordinary kicked-object flight.
- `nethack-c/upstream/src/zap.c:4049` stops a kicked coin on the first square where `OBJ_AT(x, y)` is true.
- `nethack-c/upstream/src/dokick.c:771` places the kicked coin at `gb.bhitpos` and then calls `stackobj()`.

## JS parity

- `js/cmd.js` now permits quantity-one gold through the kicked floor-object support gate while leaving multi-coin stacks unsupported for the later scatter branch.
- Kicked coin messages use `pickupObjectName()` directly, matching C's no-article coin `doname()` route for `You kick gold piece.`.
- Same-level kicked coin flight now stops on the first occupied floor square before remote gate and terrain checks, then reuses the existing placement and stack merge path.

## Verification

- `node --test --test-name-pattern "command kick single gold piece|command kicked single gold piece" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
