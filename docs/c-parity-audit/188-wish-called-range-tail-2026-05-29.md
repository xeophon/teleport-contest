# Wish Called Range Tail Parity

Date: 2026-05-29

## C Source

- `readobjnam()` splits `named`, then `called`, then `labeled` / `labelled` in `nethack-c/upstream/src/objnam.c`.
- When a `called` base exactly matches an `o_ranges[]` generic name, C does not roll that generic range. It stores the tail in `d->un`, sets only the object class, and jumps to the namedesc search path.
- `rnd_otyp_by_namedesc(..., xtra_prob=1)` then searches the class for exact object names, partial text after `" of "`, descriptions, partial text after `" of "` in descriptions, and user-called names.
- Successful namedesc lookup consumes `rn2(sum(oc_prob + 1))`; bare generic ranges consume `rnd(sum(oc_prob))` through `rnd_class()`.
- Examples:
  - `bag called holding` resolves through the tool-class tail `holding` to `bag of holding` with `rn2(21)`, not bare `bag` with `rnd(80)`.
  - `bag called tricks` resolves to `bag of tricks` with `rn2(21)`.
  - `horn called plenty` resolves to `horn of plenty` with `rn2(3)`.
  - `shield called reflection` resolves to `shield of reflection` with `rn2(8)`.
  - `helm called telepathy` resolves to `helm of telepathy` with `rn2(5)`.

## JS Gap

- `resolveCalledWishName()` only recognized a small hand-coded set: shield/helm/helmet, amulet, and ring.
- Unrecognized range-base `called` wishes silently fell through to the bare range. That meant `bag called holding`, `horn called plenty`, `gloves called power`, and `cloak called magic resistance` could accidentally succeed or fail based on the range roll instead of C's namedesc tail lookup.
- `helmet called telepathy` was forced to `helm of telepathy`. In this C checkout, only `helm` is an `o_ranges[]` base; exact `helmet` is tried before the called tail, so the JS shortcut was too broad.

## Implemented

- Added C-shaped called-tail matching for `WISH_OBJECT_RANGES` bases.
- Matching now checks canonical object names, partial suffixes after `" of "`, shared namedesc ranges such as `conical hat`, and modeled armor/tool appearances.
- Positive called-tail range matches recurse into the normal exact/namedesc wish path, preserving `oc_prob + 1` RNG bounds and existing object metadata.
- Removed the exact `helmet:telepathy` called shortcut so `helmet called telepathy` stays the exact `helmet` path.

## Tests

- `test/wishing.test.mjs` now covers:
  - `bag called holding` and `bag called tricks`
  - `horn called plenty`
  - `gauntlets called power` and `gloves called dexterity`
  - `cloak called magic resistance`
  - `hat called conical hat`
  - `helm called telepathy`
  - `helmet called telepathy` as exact `helmet`
- These assertions check namedesc `rn2(...)` consumption, concrete object identity, quantity, weight, shop cost, and display text.

## Remaining Gap

- C unresolved `called` tails for range bases, such as `lamp called magic` or `boots called speed`, do not fall back to the bare range; they continue as random class creation. JS still falls through to the bare range for unresolved tails. That random-class fallback remains a separate parser/factory slice.

Verification run:

```sh
node --test --test-name-pattern 'called wished range bases|wished helm range uses C helm candidates' test/wishing.test.mjs
node --test test/wishing.test.mjs
node --test test/shop-billing-helpers.test.mjs
node --test test/*.mjs
npm run score
```

Final public score remained `44/44`.
