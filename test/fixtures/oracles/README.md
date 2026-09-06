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

The wizard casting fixtures cover all 41 debug-menu entries and page navigation,
then a Barbarian's two self-directed magic-missile casts, fatal damage, the
separate death-message prompt and wizard refusal to die.

The armor fixtures cover the Monk legacy story’s retained initial status and
post-intro equipment AC, plus a Wizard wishing for ordinary plate mail, removing
a cloak, and completing five-turn dressing/removal. They preserve full screen,
cursor and RNG comparison; they are not branch-coverage measurements.
