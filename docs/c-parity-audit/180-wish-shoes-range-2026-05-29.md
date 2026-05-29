# Wish Shoes Range

Date: 2026-05-29

## Scope

Implement the C `readobjnam()` shoes range and concrete low/iron shoe wish paths without relying on public or private fixture behavior.

## C Anchors

- `o_ranges[]` maps `shoes` to `LOW_BOOTS..IRON_SHOES`: `nethack-c/upstream/src/objnam.c:3357`.
- `readobjnam_postparse2()` dispatches matching ranges through `rnd_class()`: `nethack-c/upstream/src/objnam.c:4671`.
- `rnd_class()` uses weighted `rnd(sum)` when candidate `oc_prob` values are nonzero: `nethack-c/upstream/src/objnam.c:5403`.
- Low boots have `oc_prob=23`, delay 2, weight 10, cost 8, AC 1, and description `walking shoes`: `nethack-c/upstream/include/objects.h:700`.
- Iron shoes have `oc_prob=7`, delay 2, weight 50, cost 16, AC 1, and description `hard shoes`: `nethack-c/upstream/include/objects.h:702`.
- Concrete namedesc lookup adds one to the matched object's probability and consumes `rn2(maxprob)`: `nethack-c/upstream/src/objnam.c:3455`, `nethack-c/upstream/src/objnam.c:3516`.
- `pair of` / `pairs of` prefixes are stripped before lookup, and non-mergeable boots ignore requested quantity during final object count handling: `nethack-c/upstream/src/objnam.c:4312`, `nethack-c/upstream/src/objnam.c:5071`.

## JS Changes

- Added wish constants and `WISH_BASE_OBJECTS` entries for low boots and iron shoes, preserving concrete `otyp`, display description, weight, and armor class.
- Added `WISH_OBJECT_RANGES` entry for `shoes` with C weights 23/7, so generic `shoes` consumes `rnd(30)` before specific object creation.
- Added concrete namedesc bounds: `low boots` consumes `rn2(24)` and `iron shoes`/`hard shoes` consumes `rn2(8)`.
- Added description aliases for `walking shoes` and `hard shoes` that still take the concrete namedesc RNG path.
- Included `shoes` in pair-prefix quantity normalization so `2 pairs of shoes` remains a single non-mergeable pair object.

## Tests

- Added public RNG-log coverage for generic `shoes` selecting both low boots and iron shoes through `rnd(30)`.
- Added exact-name coverage for `low boots` and `hard shoes`, including concrete RNG, `otyp`, description, quantity, weight, shop cost, and pair article behavior.
- Added `2 pairs of shoes` coverage to keep C-style pair-prefix stripping from leaking into item quantity.

## Remaining Work

- Full `boots` range remains open because it spans several magical boot types that still need registry-backed metadata.
- `shirt` remains open; C uses a simple `HAWAIIAN_SHIRT..T_SHIRT` range, but JS still needs concrete shirt object IDs in the factory before the wish parser can safely target those objects.
