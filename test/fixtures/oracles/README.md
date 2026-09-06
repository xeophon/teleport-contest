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
# Reflected spell rays

`spell-rays` was recorded from the unchanged C reference with the local wizard
configuration. It casts vertical magic missile, sleep, cold and finger of death,
then refuses wizard death. The 57 screens include the live beam and the direct
death prompt; all 2,327 RNG calls are compared by the test runner.

`spell-direction-cancel` casts upward and then cancels the next spell's
direction. C clears the previous vertical component and releases the spell
at the hero. All 30 screens and 2,044 RNG calls are compared.

`healing-quaff` wishes for and drinks each of the three blessed healing tiers
at full HP. It checks their distinct maximum-HP bonuses, messages, discovery,
and RNG: 101 screens and 2,792 RNG calls from the unchanged C reference.
