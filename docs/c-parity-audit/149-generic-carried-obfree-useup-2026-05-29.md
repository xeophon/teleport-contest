# Generic carried `obfree()` used-up billing

Date: 2026-05-29.

## C anchors

- `nethack-c/upstream/src/shk.c:1173` implements `delete_contents()`, recursively extracting and freeing each contained object.
- `nethack-c/upstream/src/shk.c:1187` implements `obfree()`, which deletes contents before preserving the object's own unpaid bill row as used-up debt.
- `nethack-c/upstream/src/invent.c:1312` routes `useupall()` through `obfree(obj, NULL)`, so a fully consumed carried container also processes billed contents.
- `nethack-c/upstream/src/invent.c:1428` routes normal object deletion through `delobj_core()` and then `obfree()`, preserving unpaid rows instead of converting them to stolen-value debt.

## JS changes

- `useUpInventoryItem()` now calls `markObjectTreeShopBillsUsedUp(item)` on final consumption instead of marking only the top-level carried object.
- This preserves existing live bill rows for billed contents before the carried container is removed from inventory.
- Stale `unpaid` fields without a real bill row still do not synthesize used-up debt.
- Stolen/lost merchandise paths remain separate and continue to use explicit lost-value helpers.

## Regression coverage

- `test/shop-billing-helpers.test.mjs` now covers:
  - final use-up of a carried container with a billed nested object;
  - final use-up when both the container and nested object have live bill rows;
  - stale nested unpaid fields without live bill rows.

## Remaining gaps

- Floor-effect destruction still has some top-level-only used-up wrappers; those need a separate source-backed pass because floor objects often route through lost-merchandise, environmental damage, or sale/stacking paths.
- This slice does not change `stolen_value()`-style debt conversion.
