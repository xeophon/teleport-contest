# Wish Shield Range Parity

Date: 2026-05-29

## C Source

- `o_ranges[]` maps generic `shield` to `{ "shield", ARMOR_CLASS, SMALL_SHIELD, SHIELD_OF_REFLECTION }` in `nethack-c/upstream/src/objnam.c`.
- `readobjnam()` routes that exact generic range through `rnd_class()`, so the generic wish consumes `rnd(50)` using raw shield `oc_prob` values.
- The C shield order and probabilities from `nethack-c/upstream/include/objects.h` are:
  - `small shield`: 6, bucket `1..6`, wooden shield, weight 30, cost 3, AC bonus 1.
  - `shield of drain resistance`: 12, bucket `7..18`, wooden shield, weight 30, cost 50, AC bonus 1.
  - `shield of shock resistance`: 12, bucket `19..30`, wooden shield, weight 30, cost 50, AC bonus 1.
  - `elven shield`: 2, bucket `31..32`, blue and green shield, weight 40, cost 7, AC bonus 2.
  - `Uruk-hai shield`: 2, bucket `33..34`, white-handed shield, weight 50, cost 7, AC bonus 1.
  - `orcish shield`: 2, bucket `35..36`, red-eyed shield, weight 50, cost 7, AC bonus 1.
  - `large shield`: 4, bucket `37..40`, weight 100, cost 10, AC bonus 2.
  - `dwarvish roundshield`: 3, bucket `41..43`, large round shield, weight 100, cost 10, AC bonus 2.
  - `shield of reflection`: 7, bucket `44..50`, polished silver shield, weight 50, cost 50, AC bonus 2.
- `rnd_otyp_by_namedesc()` adds `xtra_prob=1` for normal object-name and description wishes. Single-candidate bounds are `oc_prob + 1`; shared descriptions are weighted across all matching rows.
- `wooden shield` is the only shared shield description and must roll `rn2(33)` with buckets: small `0..6`, drain resistance `7..19`, shock resistance `20..32`.
- C alternate spellings `smooth shield` and `silver shield` resolve directly to `SHIELD_OF_REFLECTION` before namedesc RNG.

## JS Gap

- `WISH_OBJECT_RANGES` had no `shield` entry, so generic `shield` fell through to a generic `ARMOR_CLASS` object with kind `shield`.
- `WISH_BASE_OBJECTS` only had `shield of reflection`; exact wishes for other shields used parser-local armor fallback and lacked concrete type, weight, and cost parity.
- `ARMOR_WISH_APPEARANCES` already covered most shield appearances but omitted the drain and shock shields, both of which share `wooden shield`.

## Implemented

- Added concrete shield wish objects for all nine shield rows, with safe synthetic IDs `10206..10210` for the missing shield types to avoid active `101xx` object-number hazards.
- Added generic `shield` range weights `6,12,12,2,2,2,4,3,7`.
- Added namedesc bounds for exact shield names and a small weighted namedesc-range helper for the shared `wooden shield` description.
- Added C-style shield aliases for `reflection shield`, drain/shock inversion forms, elvish/elfin shield, dwarven roundshield variants, Uruk-hai spacing, and plural `shields`.
- Added missing shield metadata to `mklev.js` `SPECIFIC_ARMOR`, color, and AC maps so concrete shield object creation follows armor initialization paths.
- Marked drain and shock resistance shields as magical armor alongside reflection.

## Tests

- `test/wishing.test.mjs` now covers all generic `shield` buckets, exact and description namedesc bounds, shared `wooden shield` distribution, direct `smooth shield`/`silver shield` aliases, and plural nonmergeable quantity.

Verification run:

```sh
node --test --test-name-pattern 'shield|wished .*range' test/wishing.test.mjs
node --test test/wishing.test.mjs
node --test test/*.mjs
npm run score
```

Final public score remained `44/44`.
