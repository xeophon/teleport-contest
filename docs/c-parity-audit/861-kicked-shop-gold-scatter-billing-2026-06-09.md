# Kicked Shop Gold Scatter Billing

## C anchors

- `nethack-c/upstream/src/dokick.c:604` computes `costly` after range/path checks; shop-floor gold is not refused before the kick message.
- `nethack-c/upstream/src/dokick.c:692` sends multi-coin stacks into the `rn2(20)` scatter branch before later intact-object travel billing.
- `nethack-c/upstream/src/dokick.c:757` charges intact kicked gold with `costly_gold(x, y, quan, FALSE)` when the costly-origin object lands outside the same shop room.
- `nethack-c/upstream/src/explode.c:744` marks a scatter as `shop_origin` only when the source square has a shopkeeper and is costly.
- `nethack-c/upstream/src/explode.c:746` snapshots credit/debit/loan silently before resolving scatter pieces.
- `nethack-c/upstream/src/explode.c:907` only considers pieces that ended away from the source square.
- `nethack-c/upstream/src/explode.c:909` treats a scattered piece as leaving the shop only when its landing square is not costly.
- `nethack-c/upstream/src/explode.c:911` bills after `flooreffects(..., "land")` declines to consume the piece.
- `nethack-c/upstream/src/explode.c:926` bills only `GOLD_PIECE` pieces in this scatter path, via `addtobill(..., TRUE)`.
- `nethack-c/upstream/src/explode.c:944` emits one final `credit_report(shkp, 1, FALSE)` message if any scattered gold was billed.
- `nethack-c/upstream/src/shk.c:3504` routes `addtobill()` coin objects to `costly_gold()` rather than ordinary bill rows.
- `nethack-c/upstream/src/shk.c:645` gives `credit_report()` snapshot wording such as `Your credit has been reduced...` or `Your debt has increased...`.

## JS parity

- `js/cmd.js` now exempts billable gold from the existing costly-floor kick refusal while preserving the non-gold shop-floor block.
- Kicked shop-floor gold scatter now charges only scattered pieces that move off the source square, survive landing floor effects, and land outside costly shop squares.
- The scatter accounting uses C's snapshot-style final report wording, so a partial credit-consumption case reports only the credit reduction, matching `credit_report()`.
- Intact kicked gold flight from a costly source now charges at the source square when the landing square is outside the same shop room.

## Remaining follow-up

- Kicked gold down-gate migration remains a separate projectile/floor-effect slice. This audit covers same-level scatter and intact same-level flight billing.
- Non-gold arbitrary `scatter()` shop-origin billing remains intentionally unimplemented, matching C's current gold-only special case in this path.

## Verification

- `node --test --test-name-pattern "command kick single gold piece|command kicked single gold piece|command kicked multi gold stack|command kicked shop-floor gold|command kicked small multi gold stack|command kicked large multi gold stack" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`
