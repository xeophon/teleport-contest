# Wish Boots Range

Date: 2026-05-29

## Scope

Implement the C `readobjnam()` full `boots` object range and concrete magical boot wish paths without relying on public or private fixture behavior.

## C Anchors

- `o_ranges[]` maps `boots` to `LOW_BOOTS..LEVITATION_BOOTS`, while `shoes` remains the narrower `LOW_BOOTS..IRON_SHOES` range: `nethack-c/upstream/src/objnam.c:3356`, `nethack-c/upstream/src/objnam.c:3357`.
- `readobjnam_postparse2()` dispatches matching generic ranges through `rnd_class()`: `nethack-c/upstream/src/objnam.c:4671`.
- `rnd_class()` sums candidate `oc_prob` values, rolls `rnd(sum)`, and walks objects in object order: `nethack-c/upstream/src/objnam.c:5403`.
- The full boots range totals 128: low boots 23, iron shoes 7, high boots 14, then speed/water walking/jumping/elven/kicking/fumble/levitation boots at 12 each: `nethack-c/upstream/include/objects.h:700`, `nethack-c/upstream/include/objects.h:727`.
- Boot row metadata supplies weights, costs, AC values, materials, and descriptions; `BOOTS` maps through `ARMOR`, which stores AC as `10 - row_ac`: `nethack-c/upstream/include/objects.h:422`, `nethack-c/upstream/include/objects.h:440`.
- Exact and described names go through `rnd_otyp_by_namedesc(..., xtra_prob=1)`, so bounds are low `rn2(24)`, iron `rn2(8)`, high `rn2(15)`, and every magical boot `rn2(13)`: `nethack-c/upstream/src/objnam.c:3495`, `nethack-c/upstream/src/objnam.c:3517`, `nethack-c/upstream/src/objnam.c:4749`.
- `pair of` / `pairs of` prefixes are stripped before lookup, but boots are non-mergeable armor, so requested quantities remain one object: `nethack-c/upstream/src/objnam.c:4311`, `nethack-c/upstream/src/objnam.c:5071`.
- `wishymatch()` handles spaces, hyphens, `of` inversion, and elvish/elfin aliases for elven objects: `nethack-c/upstream/src/objnam.c:3252`, `nethack-c/upstream/src/objnam.c:3256`, `nethack-c/upstream/src/objnam.c:3282`.

## JS Changes

- Added concrete synthetic IDs for water walking, jumping, elven, kicking, fumble, and levitation boots, plus concrete wish base entries for high boots and all missing magical boots.
- Added `WISH_OBJECT_RANGES` entry for `boots` with the C order and probabilities, producing `rnd(128)`.
- Added namedesc bounds for high and magical boot exact names and description aliases.
- Added C-style `of` inversion aliases for supported boot names, elvish/elfin aliases, and dynamic armor-description matching so shuffled boot descriptions resolve to the current actual object while still consuming namedesc RNG.
- Added missing boot weights and corrected water walking boots from 20 to C weight 15.
- Corrected iron shoes and high boots to AC bonus 2 in the JS armor metadata.
- Added missing boot IDs to `mklev.js` specific armor metadata so direct object creation gets armor initialization, display color, and AC data.

## Tests

- Added public RNG-log coverage for all ten `boots` buckets through `rnd(128)`.
- Added exact and alias coverage for high boots, `boots of speed`, water walking boots, `boots of jumping`, elvish boots, buckled boots, and snow boots.
- Added metadata assertions for concrete `otyp`, class, canonical kind, quantity, weight, shop cost, and pair article display.
- Added `2 pairs of boots` coverage to keep pair-prefix parsing from leaking into non-mergeable armor quantity.

## Remaining Work

- Other generic C armor ranges remain open, including `shield`, `hat`, `helm`, `gloves`/`gauntlets`, and `cloak`.
- Boot metadata is now covered for wish creation, but broader registry consolidation is still needed to remove parser-local armor metadata tables.
