# Full Shop-Bill Limit Audit - 2026-05-27

This note records the C-source and JS audits for `BILLSZ` shop-bill capacity behavior. The implemented slice removes field-only unpaid fallbacks when the bill is full and keeps direct pickup, container take-out, temporary `#tip` rows, and split rows aligned with C.

## Source Anchors

- `include/mextra.h:114` defines `BILLSZ` as 200 and stores `billct` plus fixed `bill[BILLSZ]` rows.
- `shk.c:134` documents the core invariant: `obj->unpaid` is true iff the object is on the bill, except used-up bill entries.
- `shk.c:3308` `add_one_tobill()` refuses a full bill before setting `obj->unpaid`; if the object is `OBJ_FREE`, it is deallocated rather than retained as a dummy row.
- `shk.c:3490` `addtobill()` refuses a full non-coin bill before recursive container content billing, contained gold billing, `no_charge` cleanup, or price quoting. It prints `You got that for free!` only when `silent` is false.
- `shk.c:3622` `splitbill()` first shrinks the parent bill row, then clears the split child's `unpaid` flag if the bill is full.
- `pickup.c:1931` direct pickup calls `addtobill()` before `addinv()`. If the bill is full and pickup reaches this point, the source remains paid and can merge into a paid stack.
- `invent.c:784` full-inventory floor pickup preflight still rejects billable shop goods before billing; it does not check whether the bill is full.
- `pickup.c:2765` shop-floor container take-out calls `addtobill()` after extraction but before `addinv()`, so a full-bill refusal leaves the item paid and still picked up.
- `pickup.c:4009` floor bag-of-tricks `#tip` uses a silent temporary row, and `shk.c:5695` `check_unpaid_usage()` returns immediately if that row was not created.

## Implemented JS Status

- `addObjectToShopBill()` already refused full bills; the slice removes later fallbacks that marked objects unpaid and incremented `billct` after a `null` return.
- Direct pickup and shop-floor container take-out now return a free result, leave objects paid, keep `billct` at `BILLSZ`, and surface `You got that for free!` for non-silent paths.
- Full-bill container pickup now returns before top-level, recursive content, and contained-gold billing, matching C's top-level `addtobill()` capacity gate.
- Pickup and container-takeout merge probes now treat full-bill sources as paid after billing, so they can merge into paid stacks where C `addinv()` would.
- Full-inventory shop-floor pickup preflight still rejects billable floor stock before billing, preserving C's `merge_choice()` ordering.
- Horn-created object billing no longer creates field-only unpaid state when the bill is full.
- Existing split-row behavior is now covered by a full-bill regression: the parent row shrinks and the split child is cleared.
- Floor bag-of-tricks `#tip` now has explicit full-bill coverage proving no temporary usage fee or free message is produced.

## Tests Added

- `addObjectToShopBill refuses a full bill without marking unpaid`
- `full shop bill leaves direct pickup free instead of synthesizing unpaid state`
- `full shop bill leaves shop-floor container takeout free`
- `full shop bill prevents floor bag of tricks #tip temporary usage fee`
- `full bill does not bypass C full-inventory shop pickup preflight`
- `full shop bill lets pickup merge into paid inventory stack as free`
- `full shop bill split clears the child while shrinking the parent row`

## Remaining Follow-Ups

- If a container bill starts with room available but fills during recursive content billing, C's later `add_one_tobill()` calls leave individual contents free while previously computed quote text may still describe the broader contents value. JS currently covers the already-full top-level case; mid-recursion saturation remains a narrower follow-up.
- Generic dummy billing from `costly_alteration()` still needs a full-bill audit separate from floor bag-of-tricks `#tip`; C can print alteration pay messages before a dummy row is refused.
- Full registry-backed ownership work is still needed so all less ordinary `addtobill()` and `subfrombill()` callers share one bill authority instead of path-local helpers.

## Ranked Next Slice

The best bounded continuation is contained due egg expiration. It has source-backed timer semantics, a narrow object graph traversal, and was already identified by the timer audits: contained timed eggs should consume their hatch timer without hatching, while inventory, floor, and monster-inventory eggs remain hatch candidates.
