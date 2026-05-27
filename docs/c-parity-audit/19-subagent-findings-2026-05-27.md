# C Parity Audit: Dummy Alteration Billing at Full BILLSZ

## Scope

Audited NetHack C shop billing when `costly_alteration()` needs a dummy used-up bill row while the shopkeeper bill is already at `BILLSZ`. The JS target is the covered dummy alteration paths in `js/cmd.js`: carried used-up preservation, same-shop floor food bites, floor tins, and non-destroying shop box lock breaks.

## C Behavior

- `include/mextra.h:114` fixes each shopkeeper bill at `BILLSZ` rows.
- `src/mkobj.c:712-740` `bill_dummy_object()` removes an existing unpaid row with `subfrombill()` before creating the dummy duplicate, then calls `addtobill(..., silent=TRUE)`. It clears `otmp->unpaid` and sets `otmp->no_charge` only for floor or contained originals.
- `src/shk.c:3329-3339` refuses a full bill before setting `obj->unpaid`; an `OBJ_FREE` dummy refused by this gate is deallocated.
- `src/shk.c:3360-3362` sets `obj->unpaid` only after a bill row is actually appended.
- `src/shk.c:3622-3658` `splitbill()` shrinks the parent row first, then clears the split child's `unpaid` flag if the bill is full instead of appending another live row.
- `src/shk.c:3660-3689` `sub_one_frombill()` can convert an existing partly used row into a used-up residual without allocating a new bill slot.
- `src/mkobj.c:752-826` `costly_alteration()` may print the shopkeeper pay message before `bill_dummy_object()` silently fails to add a dummy row.
- `src/eat.c:358-372` first food bites call `costly_alteration(COST_BITE)` before setting `oeaten`.
- `src/eat.c:1386-1400` tin opening/destruction splits one tin if needed and then calls `costly_alteration()`.
- `src/lock.c:161-170` non-destroying box lock breaks hide contents, call `costly_alteration(COST_BRKLCK)`, then mark the box unlocked and broken.

## Porting Decision

Preserve C's difference between existing live rows and brand-new dummy rows:

- A carried object with an existing one-object bill row frees a slot via `subfrombill()`, so its dummy used-up row can still be added at full bill capacity.
- A carried split-stack child whose parent row was shrunk stays free if appending the child row would exceed `BILLSZ`; no stale field-only unpaid state is retained.
- A same-shop floor object with no existing bill row can fail to add the dummy row silently when the bill is full. The altered floor object is marked `no_charge` and cleared of unpaid fields, matching `bill_dummy_object()` cleanup.

## JS Status

- `billDummyAlteredCarriedObject()` already removed the real row before adding the dummy row, so the C one-row replacement path stayed capacity-neutral.
- Added `markAlteredShopObjectNoCharge()` and routed failed full-bill floor dummy attempts through it for covered same-shop floor alteration paths.
- `billDummyAlteredShopObject()`, floor `costlyBiteFood()`, and floor `costlyTinAlteration()` now mark the altered object no-charge when the dummy add fails only because the bill is full.
- Split carried food/tin alteration tests now assert the parent bill row shrinks and the split child remains free when the bill is full.

## Regression Coverage

Added focused helper tests for:

- Existing carried live row at `BILLSZ` converting into one dummy used-up row.
- Split carried food bite shrinking the parent row while leaving the bitten child free.
- Split carried tin opening shrinking the parent row while leaving the opened child free.
- Full-bill same-shop floor box lock break marking the box no-charge without adding a dummy row.
- Full-bill same-shop floor tin opening marking the tin no-charge without adding a dummy row.
- Full-bill same-shop floor food bite marking the food no-charge without adding a dummy row.

## Remaining Follow-Ups

- Generic `costly_alteration()` remains partial outside the currently covered JS caller families.
- Full shared `addtobill()`/`subfrombill()` integration is still needed so future alteration callers do not need path-local billing glue.
