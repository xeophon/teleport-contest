# Wish Helm Range Parity

Date: 2026-05-29

## C Source

- `o_ranges[]` maps generic `helm` to `{ "helm", ARMOR_CLASS, ELVEN_LEATHER_HELM, HELM_OF_TELEPATHY }` in `nethack-c/upstream/src/objnam.c`.
- `readobjnam()` routes that exact generic range through `rnd_class()`, so bare `helm` consumes `rnd(66)` using the raw helm-family `oc_prob` values.
- The C helm order and probabilities from `nethack-c/upstream/include/objects.h` are:
  - `elven leather helm`: probability 6, bucket `1..6`, `leather hat`, weight 3, cost 8, AC bonus 1, brown leather.
  - `orcish helm`: probability 6, bucket `7..12`, `iron skull cap`, weight 30, cost 10, AC bonus 1, black iron.
  - `dwarvish iron helm`: probability 6, bucket `13..18`, `hard hat`, weight 40, cost 20, AC bonus 2, cyan iron.
  - `fedora`: probability 0, no generic bucket, weight 3, cost 1, AC bonus 0, brown cloth.
  - `cornuthaum`: probability 5, bucket `19..23`, `conical hat`, weight 4, cost 80, AC bonus 0, blue cloth, magical.
  - `dunce cap`: probability 5, bucket `24..28`, `conical hat`, weight 4, cost 1, AC bonus 0, blue cloth, magical.
  - `dented pot`: probability 2, bucket `29..30`, no description, weight 10, cost 8, AC bonus 1, black iron.
  - `helm of brilliance`: probability 6, bucket `31..36`, `crystal helmet`, weight 40, cost 50, AC bonus 1, white glass, magical.
  - `helmet`: probability 10, bucket `37..46`, `plumed helmet`, weight 30, cost 10, AC bonus 1, cyan iron.
  - `helm of caution`: probability 6, bucket `47..52`, `etched helmet`, weight 50, cost 50, AC bonus 1, green iron, magical.
  - `helm of opposite alignment`: probability 10, bucket `53..62`, `crested helmet`, weight 50, cost 50, AC bonus 1, cyan iron, magical.
  - `helm of telepathy`: probability 4, bucket `63..66`, `visored helmet`, weight 50, cost 50, AC bonus 1, cyan iron, magical.
- `rnd_otyp_by_namedesc()` adds `xtra_prob=1` for normal object-name and description wishes. Exact-name namedesc bounds are `rn2(7)` for the probability-6 helms, `rn2(1)` for `fedora`, `rn2(6)` for `cornuthaum`/`dunce cap`, `rn2(3)` for `dented pot`, `rn2(11)` for `helmet` and `helm of opposite alignment`, and `rn2(5)` for `helm of telepathy`.
- C has direct alternate spellings for `helm of esp` and `kabuto`; `wishymatch()` also accepts `helmet of ...` for helm-of names while keeping bare `helmet` as the exact plumed-helmet object.

## JS Gap

- `WISH_OBJECT_RANGES` had no `helm` entry, so bare `helm` could not follow the C `ELVEN_LEATHER_HELM..HELM_OF_TELEPATHY` range.
- Several helm-family objects lacked concrete wish rows, weights, namedesc bounds, and specific armor setup in `mklev.js`.
- `helmet` existed as a partial exact wish object, but it lacked the C object weight and the surrounding helm aliases and spellings needed for parity canaries.

## Implemented

- Added concrete wish objects for the full helm family with C weights, costs, appearances, AC bonuses, and specific object IDs.
- Added generic `helm` range weights `6,6,6,0,5,5,2,6,10,6,10,4`, preserving the C behavior that bare `helm` never generates a fedora.
- Added namedesc bounds for all newly covered helm rows.
- Added helm aliases for `helms`, exact plural `helmets`, `helmet of ...` fuzzy forms, and direct `helm of esp` / `helmet of esp` spellings.
- Extended `mklev.js` specific-armor colors, AC, and `mongets()` display metadata for the new helm IDs.

## Tests

- `test/wishing.test.mjs` now covers every nonzero bare-`helm` bucket with first-roll seeds, exact-name and description paths, `helmet of ...` fuzzy forms, direct spellings, `kabuto`, plural `helms`, and exact plural `helmets`.

Verification run:

```sh
node --test --test-name-pattern 'wished helm range uses C helm candidates' test/wishing.test.mjs
node --test test/wishing.test.mjs
node --test test/shop-billing-helpers.test.mjs
node --test test/*.mjs
npm run score
```

Final public score remained `44/44`.
