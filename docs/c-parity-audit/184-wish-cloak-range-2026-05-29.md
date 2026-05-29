# Wish Cloak Range

Date: 2026-05-29

## Scope

Implement the C `readobjnam()` generic `cloak` range, concrete cloak exact/description wish paths, and missing cloak metadata without relying on public or private fixture behavior.

## C Anchors

- `o_ranges[]` maps `cloak` to `ARMOR_CLASS, MUMMY_WRAPPING..CLOAK_OF_DISPLACEMENT`: `nethack-c/upstream/src/objnam.c:3358`.
- `readobjnam_postparse2()` dispatches the matched range through `rnd_class()`: `nethack-c/upstream/src/objnam.c:4671`.
- `rnd_class()` sums `oc_prob`, rolls `rnd(sum)`, and walks object order: `nethack-c/upstream/src/objnam.c:5407`.
- The C selectable range total is 98: mummy wrapping 0, elven/orcish/dwarvish/oilskin/leather cloaks 8 each, robe 6, alchemy smock 11, cloak of protection 11, cloak of invisibility 12, cloak of magic resistance 6, and cloak of displacement 12: `nethack-c/upstream/include/objects.h:611`, `nethack-c/upstream/include/objects.h:650`.
- `CLOAK()` expands through `ARMOR()`, which stores worn AC as `10 - row_ac`: `nethack-c/upstream/include/objects.h:422`, `nethack-c/upstream/include/objects.h:431`.
- Cloak row metadata gives C weights, costs, descriptions, materials, and AC values. Notable corrections: mummy wrapping AC 0, orcish cloak AC 0, dwarvish cloak AC 0, and robe AC 2: `nethack-c/upstream/include/objects.h:611`, `nethack-c/upstream/include/objects.h:650`.
- Exact names and description names use `rnd_otyp_by_namedesc(..., xtra_prob=1)`, so bounds are `oc_prob + 1`, including `mummy wrapping` at `rn2(1)`: `nethack-c/upstream/src/objnam.c:3516`, `nethack-c/upstream/src/objnam.c:3521`, `nethack-c/upstream/src/objnam.c:4749`.
- The four magical cloak descriptions/colors are shuffled together without material shuffling: `nethack-c/upstream/src/o_init.c:284`, `nethack-c/upstream/src/o_init.c:330`, `nethack-c/upstream/src/o_init.c:343`.
- `wishymatch()` accepts spaces/hyphens/case variants, `of` inversion such as `magic resistance cloak`, and elvish/elfin/dwarven aliases: `nethack-c/upstream/src/objnam.c:3252`, `nethack-c/upstream/src/objnam.c:3259`, `nethack-c/upstream/src/objnam.c:3279`.

## JS Changes

- Added concrete synthetic IDs and wish base rows for the missing cloak family members.
- Added `WISH_OBJECT_RANGES` entry for `cloak` with C object order and probabilities, producing `rnd(98)`.
- Added namedesc bounds for all cloak exact names and description aliases.
- Added `alchemy smock` appearance alias for `apron`; existing cloak appearance resolution now covers fixed and shuffled cloak descriptions.
- Added C-style elvish/elfin/dwarven and `of` inversion aliases for covered cloak names.
- Filled missing cloak weights and corrected string AC metadata for mummy wrapping, orcish cloak, dwarvish cloak, and robe.
- Added missing `mklev.js` specific armor, display color, and AC metadata for concrete cloak IDs.

## Tests

- Added public RNG-log coverage for all selectable `cloak` buckets through `rnd(98)`.
- Added exact-name and description coverage for mummy wrapping, racial cloaks, robe, alchemy smock/apron, and magical cloak descriptions.
- Added alias coverage for dwarven cloak and `of` inversion forms like `magic resistance cloak`.
- Added metadata assertions for concrete `otyp`, class, canonical kind, quantity, weight, shop cost, and visible cloak appearance.
- Added `2 cloaks` coverage to keep plural quantity from leaking into non-mergeable armor.

## Remaining Work

- Other generic C armor ranges remain open: `shield`, `hat`, and `helm`.
- Cloak metadata is now covered for wish and direct object creation paths, but broader registry consolidation is still needed to remove parser-local armor metadata tables.
