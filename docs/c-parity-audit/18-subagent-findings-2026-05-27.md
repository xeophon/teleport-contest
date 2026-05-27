# C Parity Audit: Recursive Shop Bill Saturation

## Scope

Audited NetHack C shop billing for containers whose contents fill `BILLSZ` while `addtobill()` is already recursing through the object tree. The JS target is the recursive container billing path in `js/cmd.js`.

## C Behavior

- `BILLSZ` is a fixed 200-row shopkeeper bill cap (`include/mextra.h`).
- `addtobill()` checks for a full bill only once before starting. If the bill is already full, it optionally prints `You got that for free!` and returns.
- For containers, `addtobill()` computes full non-gold contained cost with `contained_cost()` and contained gold with `contained_gold()` before inserting child rows.
- `bill_box_content()` then walks contents depth-first. It skips coins, attempts each non-`no_charge` object with `add_one_tobill()`, and always recurses into nested containers afterward.
- If `BILLSZ` fills during this recursion, `add_one_tobill()` refuses only that object, prints `You got that for free!`, does not set `obj->unpaid`, and returns. The recursive walk continues.
- `picked_container()` clears `no_charge` recursively after the attempts, even for contents that were refused because the bill was full.
- Contained gold is charged later through `costly_gold()` and is not limited by `BILLSZ`.
- Final quote text uses the precomputed top-plus-contents value, not the sum of rows that actually fit.

## JS Gap

Before this slice, `addContainedObjectsToShopBill()` still traversed after the bill became full, but it silently ignored failed child insertions and only added successfully inserted rows to `billing.price` / `billing.itemPrice`.

That meant overflowed contents correctly stayed unbilled, but the user-facing free signal was missing and the returned container quote could undercount relative to C.

## Porting Decision

Keep the C partial-bill behavior rather than preflighting capacity:

- Top-level already-full containers remain free at the existing guard.
- Mid-recursion overflowed contents stay paid/free with no stale unpaid state.
- Each overflowed priced child appends `You got that for free!`.
- Container item price uses the full non-gold contained value computed during traversal, matching C quote semantics.
- Contained gold is still charged after the recursive object attempts.

## Regression Coverage

Added focused helper tests for:

- Charged top container at `BILLSZ - 2`: top and first content fit, later content is free, quote includes all non-gold contents.
- No-charge top container at `BILLSZ - 1`: first content fits, later content is free, contained gold is still charged.
- Nested container at `BILLSZ - 2`: recursion continues after saturation and the grandchild remains unbilled.
