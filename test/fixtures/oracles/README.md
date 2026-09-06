# Source recordings

These recordings were generated with the repository's C recorder and NetHack
reference `16ff59115315917b93185d026aeefea06db9b0f4`. Each companion recipe stores
the input used by `scripts/record-session.mjs`. They are additional regression
fixtures; the contest recordings and frozen comparator remain unchanged.

The missile trap fixture follows a cursed-book teleport and its immobilization
through an unseen jackal activating an arrow trap. Spell menu fixtures exercise
sorting, retained order, swapping, cancellation, traditional selection and the
ten-invalid-answer retry limit. The tests run the frozen comparator against the
JavaScript entry point and require complete screen, cursor and RNG agreement.
