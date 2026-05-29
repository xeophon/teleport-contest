# Wish Gloves Range

Date: 2026-05-29

## Scope

Implement the C `readobjnam()` `gloves` and `gauntlets` object ranges, exact-name RNG paths, and glove metadata without relying on public or private fixture behavior.

## C Anchors

- `o_ranges[]` maps both `gloves` and `gauntlets` to `ARMOR_CLASS, LEATHER_GLOVES..GAUNTLETS_OF_DEXTERITY`: `nethack-c/upstream/src/objnam.c:3354`.
- The generic range path dispatches through `rnd_class()`, which sums `oc_prob`, rolls `rnd(sum)`, and walks object order: `nethack-c/upstream/src/objnam.c:4671`, `nethack-c/upstream/src/objnam.c:5403`.
- The C range total is 39 in this order: leather gloves 15, gauntlets of fumbling 8, gauntlets of power 8, and gauntlets of dexterity 8: `nethack-c/upstream/include/objects.h:686`, `nethack-c/upstream/include/objects.h:696`.
- Glove object rows supply descriptions, weights, costs, materials, and AC values; the `ARMOR` macro stores worn AC as `10 - row_ac`, so each glove type contributes AC 1: `nethack-c/upstream/include/objects.h:422`, `nethack-c/upstream/include/objects.h:686`.
- Exact names and description names use `rnd_otyp_by_namedesc(..., xtra_prob=1)`, producing `rn2(16)` for leather gloves and `rn2(9)` for each gauntlet kind: `nethack-c/upstream/src/objnam.c:3491`, `nethack-c/upstream/src/objnam.c:3516`, `nethack-c/upstream/src/objnam.c:4749`.
- `pair of` / `pairs of` prefixes are parsed before lookup, but boots, gloves, lenses, and similar non-mergeable objects remain a single final object: `nethack-c/upstream/src/objnam.c:4311`, `nethack-c/upstream/src/objnam.c:5071`.
- `wishymatch()` treats a wished `gloves` token as matching canonical `gauntlets`, so `gloves of fumbling`, `gloves of power`, and `gloves of dexterity` follow the namedesc path for their gauntlet rows: `nethack-c/upstream/src/objnam.c:3291`.
- Alternate power names `gauntlets of ogre power` and `gauntlets of giant strength` are explicit aliases for gauntlets of power, and `wishymatch()` extends those to `gloves of ...` forms: `nethack-c/upstream/src/objnam.c:3392`.

## JS Changes

- Added concrete synthetic IDs and wish base rows for gauntlets of fumbling and gauntlets of dexterity.
- Added `WISH_OBJECT_RANGES` entries for both `gloves` and `gauntlets`, sharing the C order and probabilities and producing `rnd(39)`.
- Added namedesc bounds for fumbling, power, and dexterity gauntlets while keeping leather gloves at `rn2(16)`.
- Added `gloves of fumbling` and `gloves of dexterity` aliases to the namedesc-consuming alias map; existing ogre/giant power aliases remain explicit skip-namedesc spellings.
- Added missing AC, wear delay, weight, cost-backed creation, specific armor, display color, and `mklev` AC metadata for the new gauntlet IDs.
- Extended pair-prefix normalization so `pairs of gauntlets` behaves like `pairs of gloves` and remains one non-mergeable armor object.

## Tests

- Added public RNG-log coverage for all four `gloves` buckets through `rnd(39)`.
- Added `gauntlets` range coverage showing that it shares the C range and can return leather gloves.
- Added exact and description coverage for leather gloves, old gloves, gauntlets of fumbling, padded gloves, gloves of power, riding gloves, gauntlets of dexterity, and fencing gloves.
- Added explicit ogre-power alias coverage to keep the C alt-spelling path from consuming namedesc RNG.
- Added metadata assertions for concrete `otyp`, class, canonical kind, quantity, weight, shop cost, and pair article display.
- Added `2 pairs of gloves` and `2 pairs of gauntlets` coverage to prevent non-mergeable pair-prefix quantity leakage.

## Remaining Work

- Other generic C armor/clothing ranges remain open: `shield`, `hat`, `helm`, and `cloak`.
- Glove metadata is now covered for wish creation and direct object creation, but broader registry consolidation is still needed to remove parser-local armor metadata tables.
