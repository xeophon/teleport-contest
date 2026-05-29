# Wish Called Range Random Class Parity

Date: 2026-05-29

## C Source

- `readobjnam_postparse1()` splits `" called "` before the normal generic range pass in `nethack-c/upstream/src/objnam.c`.
- If the base text exactly matches an `o_ranges[]` name, C stores the tail in `d->un`, sets `d->oclass` from that range row, and jumps directly to `srch`.
- At `srch`, `readobjnam_postparse3()` tries `rnd_otyp_by_namedesc(d->un, d->oclass, 1)`. Successful positive tails such as `holding` and `plenty` were covered by audit 188.
- If the tail lookup fails, C also tries the truncated original base text with the same retained object class. This catches range bases that are also descriptions, such as `bag`, `lamp`, `candle`, and `horn`, and consumes `rn2(sum(oc_prob + 1))`.
- If both the tail and base namedesc lookups fail, `d->typ` stays zero while `d->oclass` remains set. `typfnd` then creates `mkobj(d->oclass, FALSE)`, a random object from the whole class.
- This means examples such as `bag called plaid`, `lamp called magic`, `candle called wax`, and `horn called brass` do not roll the original narrow `o_ranges[]` range; they run the class-limited namedesc search for the base description. Examples such as `boots called speed`, `shoes called iron`, and `sword called long` fall through to random armor or weapon creation.
- Non-wizard special substitutions such as `MAGIC_LAMP -> OIL_LAMP` still run when the base namedesc lookup selects `MAGIC_LAMP` before object creation.

## JS Gap

- JS already split `called` and handled positive range-tail namedesc matches.
- When a `called` tail did not resolve, JS kept resolving the base text. For range bases, that fell through to `makeWishedObjectRangeObject()`.
- That made `lamp called magic` use the bare `lamp` range, `boots called speed` use the bare `boots` range, and `sword called long` use the bare `sword` range instead of C's base-namedesc-then-class-random path.

## Implemented

- Added `WISH_RANGE_BASE_DESCRIPTIONS` and base namedesc selection for modeled range bases whose C descriptions exactly match the base text.
- Added `WISH_OBJECT_RANGE_CLASSES`, mirroring the C `o_ranges[]` class column for modeled range bases.
- Added `makeWishedObjectClassObject(oclass)`, which creates `mkobj(oclass, false)` and applies normal display fields for wished inventory insertion.
- `wishedBaseObjectFromName()` now handles unresolved range-base `called` tails by trying C's retained-class base namedesc lookup, then returning a random object from the retained class before bare range dispatch can run.
- Positive `called` tail matches still resolve first and keep their audit-188 namedesc RNG behavior.

## Tests

- `test/wishing.test.mjs` now covers unresolved `called` tails:
  - `bag called plaid`, `lamp called magic`, `candle called wax`, and `horn called brass` use base namedesc with `rn2(sum(oc_prob + 1))`.
  - `boots called speed` and `shoes called iron` use random armor creation with `rnd(1000)`.
  - `sword called long` uses random weapon creation with `rnd(1002)`.
- The assertions also verify that each wish succeeds immediately, records wish conduct once, and does not enter the bad-wish retry loop.

## Remaining Gap

- The object-wishing path still has many parser-local tables and ad hoc metadata rows. Registry/factory consolidation remains open, but the modeled `o_ranges[]` `called` control flow now covers both successful namedesc tails and unresolved random-class fallback.

Verification run:

```sh
node --check js/cmd.js
node --check test/wishing.test.mjs
node --test --test-name-pattern 'called wished range bases|unresolved called range bases|generic wished object ranges|wished boots range|generic wished lamp range|generic wished sword range' test/wishing.test.mjs
node --test test/wishing.test.mjs
node --test test/shop-billing-helpers.test.mjs
node --test test/*.mjs
npm run score
```

Final score: 44/44.
