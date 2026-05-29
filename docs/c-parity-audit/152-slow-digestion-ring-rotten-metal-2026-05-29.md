# Slow-digestion ring rotten metal

Date: 2026-05-29.

## C anchors

- `nethack-c/upstream/src/eat.c:2911` handles metallivorous eating of a ring of slow digestion: it prints "This ring is indigestible!", calls `rottenfood(otmp)`, optionally runs `trycall()`, and returns `ECMD_TIME`.
- `nethack-c/upstream/src/eat.c:1813` implements `rottenfood()`, whose first line uses "Rotten" for rottable food and "Awful" plus `foodword()` for non-rottable objects.
- `nethack-c/upstream/src/eat.c:1817` through `eat.c:1842` shows the rotten side effects: confusion, blindness, or unconsciousness.
- `nethack-c/upstream/src/eat.c:2498` implements `foodword()`, mapping the slow-digestion ring's iron material to "metal".

## JS changes

- `rottenFoodEffect()` now accepts a message adjective and food word while preserving the existing RNG and side-effect behavior for ordinary rotten food callers.
- `eatHeroNonFoodMetal()` now routes slow-digestion rings through that rotten-effect helper with C's "Awful metal" wording.
- The slow-digestion ring remains carried or on the floor, gives no nutrition, and still spends command time.
- Rotten side effects such as confusion can now occur for the slow-digestion ring branch.

## Regression coverage

- `test/shop-billing-helpers.test.mjs` now covers:
  - carried slow-digestion ring remains uneaten with "This ring is indigestible!" and "Blecch!  Awful metal!";
  - deterministic rotten confusion side effect while the ring remains carried;
  - floor slow-digestion ring remains on the floor after the same rotten metal branch.

## Remaining gaps

- This slice does not implement the optional C `trycall()` prompt for known-but-uncalled rings.
- Broader metal-accessory cleanup remains open for cursed non-slow-digestion rotten-food branches, worn-ring cleanup details, exact strangulation recovery, and nonfood fullness interactions.
