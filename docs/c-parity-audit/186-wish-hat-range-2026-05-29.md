# Wish Hat Range Parity

Date: 2026-05-29

## C Source

- `o_ranges[]` maps generic `hat` to `{ "hat", ARMOR_CLASS, FEDORA, DUNCE_CAP }` in `nethack-c/upstream/src/objnam.c`.
- `readobjnam()` routes that exact generic range through `rnd_class()`, so bare `hat` consumes `rnd(10)` using raw hat `oc_prob` values.
- The C hat order and probabilities from `nethack-c/upstream/include/objects.h` are:
  - `fedora`: probability 0, no generic bucket, weight 3, cost 1, AC bonus 0, brown cloth.
  - `cornuthaum`: probability 5, bucket `1..5`, `conical hat`, weight 4, cost 80, AC bonus 0, blue cloth, magical.
  - `dunce cap`: probability 5, bucket `6..10`, `conical hat`, weight 4, cost 1, AC bonus 0, blue cloth, magical.
- `rnd_otyp_by_namedesc()` adds `xtra_prob=1` for normal object-name and description wishes. That makes exact `fedora` legal despite its generation probability 0.
- Exact-name namedesc bounds are `rn2(1)` for `fedora`, `rn2(6)` for `cornuthaum`, and `rn2(6)` for `dunce cap`.
- The shared description `conical hat` rolls `rn2(12)`, with `0..5` selecting `cornuthaum` and `6..11` selecting `dunce cap`.
- C does not define `wizard cap` or `wizzard cap` as wish spellings. The Tourist read-message lore is not a `readobjnam()` alias.

## JS Gap

- `WISH_OBJECT_RANGES` had no `hat` entry, so bare `hat` did not follow the C `FEDORA..DUNCE_CAP` range.
- `fedora` existed in scattered armor metadata, but `cornuthaum` and `dunce cap` lacked concrete wish object rows and `mklev.js` specific-armor initialization.
- `conical hat` resolved through appearance lookup to one concrete kind instead of C's weighted shared-description selection.

## Implemented

- Added concrete `fedora`, `cornuthaum`, and `dunce cap` wish objects with C weights, costs, appearances, and AC bonuses.
- Added safe synthetic IDs `10211` and `10212` for `cornuthaum` and `dunce cap` in the JS-specific armor maps.
- Added generic `hat` range weights `0,5,5`, preserving the C behavior that bare `hat` never generates a fedora.
- Added exact namedesc bounds for the three hats and a shared `conical hat` namedesc range weighted `6,6`.
- Added plural `hats` as a generic range alias while keeping unsupported `wizard cap` spellings rejected.
- Marked `cornuthaum` as magical armor alongside the existing `dunce cap` entry.

## Tests

- `test/wishing.test.mjs` now covers both generic `hat` buckets, exact `fedora` with `rn2(1)`, exact `cornuthaum`/`dunce cap`, shared `conical hat` distribution, plural nonmergeable quantity, and rejected `wizard cap` spellings.

Verification run:

```sh
node --test --test-name-pattern 'hat|wished .*range' test/wishing.test.mjs
node --test test/wishing.test.mjs
node --test test/shop-billing-helpers.test.mjs
node --test test/*.mjs
npm run score
```

Final public score remained `44/44`.
