# Kicked Loose No-Charge Container Skip Contents

## C anchors

- `nethack-c/upstream/src/dokick.c:607` snapshots the source shop owner and costly state before loose-object handling.
- `nethack-c/upstream/src/dokick.c:633` calls `addtobill()` only when the top kicked object is not `no_charge`.
- `nethack-c/upstream/src/dokick.c:636` clears only the top kicked object's `no_charge` flag when that top flag is set.
- `nethack-c/upstream/src/shk.c:3473` would allow `addtobill()` to bill a top-level `no_charge` container's contents or contained gold if reached.
- `nethack-c/upstream/src/shk.c:3521` only early-returns inside `addtobill()` for `no_charge` non-containers, not containers.
- `nethack-c/upstream/src/shk.c:3538` charges contained gold only inside the `addtobill()` container path, which the kicked-loose top-`no_charge` branch skips.

## JS parity

- `js/cmd.js` already matched the kicked-loose call-site quirk: a top-level `no_charge` object clears that top flag and returns before recursive loose-container billing.
- This is intentionally different from direct pickup-style `addtobill()` semantics; the command-kick branch gates on the top object flag first.
- The new canary prevents a tempting recursive-billing refactor from charging contents or contained gold for this kicked-loose case.

## Canary

- `command kicked no-charge container on closed door skips contents billing` covers a `no_charge` bag on a closed shop door containing a dagger and gold. The bag comes loose to the hero square, clears only the top `no_charge` flag, creates no live bill rows, charges no debt or loan, and emits no `will cost` or `You owe` message.

## Remaining follow-up

- Direct `addtobill()`/pickup-style `no_charge` container contents billing remains a separate path and is not changed by this canary.
- Shared-wall multi-shop ownership remains broader than this single-owner closed-door loose branch.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'command kicked no-charge container on closed door skips contents billing|command kicked no-charge shop object on closed door|command kicked paid container with gold on closed door|command kicked paid container on closed door comes loose' test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44` replay sessions passing)
