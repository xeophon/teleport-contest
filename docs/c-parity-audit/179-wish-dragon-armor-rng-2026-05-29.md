# Wish Dragon Armor RNG

Date: 2026-05-29

## Scope

Tighten `readobjnam()` parity for dragon scale/mail wishes where C takes different RNG paths for generic ranges, exact colored mail, `scale armor` retries, and `grey` alternate spellings.

## C Anchors

- `o_ranges[]` includes `dragon scales` and `dragon scale mail`, but not `dragon scale armor`: `nethack-c/upstream/src/objnam.c:3346`.
- `rnd_class()` uses `rn1(last - first + 1, first)` when every candidate has zero `oc_prob`: `nethack-c/upstream/src/objnam.c:5403`.
- `rn1(x, y)` is `rn2(x) + y`: `nethack-c/upstream/include/hack.h:1535`.
- Dragon armor rows use the `DRGN_ARMR` weight argument `40`; their generation probability field is zero in the `ARMOR(...)` macro call: `nethack-c/upstream/include/objects.h:497`.
- `grey dragon scale mail` and `grey dragon scales` are explicit alternate spellings: `nethack-c/upstream/src/objnam.c:3370`.
- Colored `dragon scale armor` strips `armor`, appends `mail` after the failed armor-class lookup, then resolves `scale mail` via `rnd_otyp_by_namedesc(..., xtra_prob=1)`: `nethack-c/upstream/src/objnam.c:4555`, `nethack-c/upstream/src/objnam.c:4773`, `nethack-c/upstream/src/objnam.c:4749`.
- The final `SCALE_MAIL` object is rewritten to matching dragon scale mail via the saved dragon monster prefix: `nethack-c/upstream/src/objnam.c:5246`.

## JS Changes

- Kept generic `dragon scales`, `dragon scale mail`, and `dragon scale armor` on the existing `rn2(10)` color path because that matches C's zero-probability `rnd_class()` fallback.
- Changed exact colored `dragon scale armor` from the placeholder `rn2(1)` to the same `rn2(67)` namedesc path used for colored `dragon scale mail`.
- Marked `grey` dragon armor spellings as alternate spellings so `grey dragon scale mail` and `grey dragon scale armor` resolve directly without the namedesc `rn2(67)` roll.

## Tests

- Added RNG-log coverage for generic dragon armor range wishes: `dragon scales`, `dragon scale mail`, and `dragon scale armor` start with `rn2(10)` and do not consume `rn2(67)`.
- Added exact-name coverage for `red dragon scale mail` and `red dragon scale armor` starting with `rn2(67)`.
- Added alternate-spelling coverage for `grey dragon scale mail` and `grey dragon scale armor` skipping `rn2(67)` and resolving to gray dragon scale mail.

## Remaining Work

- Broader armor/clothing object ranges such as shirts, shoes, boots, cloaks, shields, helms, and gloves still need registry-backed objects and source-backed tests.
- Dragon armor metadata remains parser-local and should eventually move into the canonical object registry with shared weight, cost, merge, material, and probability data.
