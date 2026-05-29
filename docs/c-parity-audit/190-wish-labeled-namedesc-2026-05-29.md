# Wish Labeled Namedesc Parity

Date: 2026-05-29

## C Source

- `readobjnam_postparse1()` splits wish text in `named`, `called`, then `labeled`/`labelled` order in `nethack-c/upstream/src/objnam.c`.
- The `labeled` and `labelled` clauses store their tail in `d->dn`, the description/name candidate used for object descriptions.
- Class-name parsing recognizes `scroll`, `spellbook`, and `spell book`, retaining `SCROLL_CLASS` or `SPBOOK_CLASS` before the search stage.
- `readobjnam_postparse3()` tries namedesc lookup in order: `actualn`, `dn`, `un`, then the truncated original base text.
- `rnd_otyp_by_namedesc()` matches object names, `" of "` suffixes, descriptions, description suffixes, and user-called names. Successful matches consume `rn2(sum(oc_prob + 1))` because readobjnam passes `xtra_prob = 1`.
- If the label does not resolve but the class word did, C keeps `d->oclass` and creates `mkobj(d->oclass, FALSE)`. Unknown `scroll labeled X` and `spellbook labelled X` therefore create random scroll/spellbook-class objects instead of failing or inventing invalid pseudo-types.

## JS Gap

- JS already split `labeled` and `labelled` after `named` and `called`.
- Successful scroll and spellbook labels already used the local description arrays and consumed the expected namedesc `rn2(...)` bound.
- Unknown labels fell through to synthetic item construction:
  - `scroll labeled NOPE` produced a `scrollIndex: -1` item with `actualKind: "scroll"`.
  - `spellbook labeled NOPE` produced a `spellbookIndex: -1` item shaped like `spellbook of spellbook`.
- Those objects succeeded without retries, but did not match C's retained-class random object fallback.

## Implemented

- `makeWishedObjectClassObject()` now annotates retained scroll and spellbook class results with the corresponding JS class names after `mkobj()`.
- Unknown real-class scroll labels now return `makeWishedObjectClassObject(SCROLL_CLASS)`.
- Unknown real-class spellbook labels now return `makeWishedObjectClassObject(SPBOOK_CLASS)`.
- The successful label path remains unchanged, so real labels still consume namedesc RNG before object construction.

## Tests

- `test/wishing.test.mjs` now covers both spellings for successful labels:
  - `scroll labeled "ELAM EBOW"` and `scroll labelled "ELAM EBOW"` resolve through the scroll description table with `rn2(46)`.
  - `spellbook labeled ragged` and `spellbook labelled ragged` resolve through the spellbook description table with `rn2(46)`.
- Unknown label tests verify C fallback routing:
  - `scroll labeled "NOT A REAL LABEL"` starts with `rnd(1000)` and does not produce `scrollIndex: -1` / `scroll of scroll`.
  - `spellbook labelled "NOT A REAL LABEL"` starts with `rnd(1000)` and does not produce `spellbookIndex: -1` / `spellbook of spellbook`.
- The tests also assert immediate wish success, no bad-wish retry loop, and one wish conduct increment.

## Remaining Gap

- This is still parser-local. Full `readobjnam` parity still needs registry-backed class lookup, `wishymatch`, description/user-called matching across all classes, and object construction from a shared C-like object table.

Verification run:

```sh
node --check js/cmd.js
node --check test/wishing.test.mjs
node --test --test-name-pattern 'labeled wished scrolls|unknown labeled wished scrolls|called wished range bases|unresolved called range bases' test/wishing.test.mjs
node --test test/wishing.test.mjs
node --test test/shop-billing-helpers.test.mjs
node --test test/*.mjs
npm run score
```

Final score: 44/44.
