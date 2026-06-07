# 721 - Bullwhip Pit Boulder Anchor

## C Source

- `nethack-c/upstream/src/apply.c:3065-3068` handles the Fumbling/Glib drop gate before the pit branch.
- `nethack-c/upstream/src/apply.c:3070-3088` enters the pit branch for `u.utrap && u.utraptype == TT_PIT` and documents that pit use attempts to get out before ordinary monster handling.
- `nethack-c/upstream/src/apply.c:3089-3091` chooses an adjacent boulder as `a boulder`, otherwise adjacent furniture as `something`.
- `nethack-c/upstream/src/apply.c:3093-3103` lets a visible big monster override those anchors; if a monster exists and no anchor is selected, C falls through to the normal `whipattack` monster branch.
- `nethack-c/upstream/src/apply.c:3106-3121` prints `You wrap your bullwhip around <anchor>.`, then succeeds only when `proficient && rn2(proficient + 2)` is nonzero. Success prints `You yank yourself out of the pit!`, clears the trap with `reset_utrap(TRUE)`, and relocates with `teleds(...)`; failure prints `The bullwhip slips free.`
- `nethack-c/upstream/src/apply.c:3122-3124` prints `Snap!` for no anchor and no monster.

## Port Notes

- The JS pit branch now runs after the Fumbling/Glib drop gate and before the existing monster branch.
- A trapped hero with no anchor and no monster gets the C `Snap!` message, spends the turn, and remains trapped without consuming RNG.
- No-monster boulder and furniture anchors print the C wrap message. Unproficient use slips free without RNG; proficient use consumes `rn2(proficient + 2)`, and a nonzero roll clears pit trap state, marks the hero moved, and moves the hero to the anchor square.
- The implementation keeps the existing monster branch as the fallback when there is a monster but no pit anchor, matching C's `goto whipattack` shape for small/medium targets without boulder or furniture.
- The new canaries use explicit local RNG queues for the pit escape roll and do not depend on replay maps, seed-derived branches, player names, hidden tests, or runtime shortcuts.

## Tests

- `wielded bullwhip snaps in pit when there is no escape anchor`
- `unproficient wielded bullwhip slips free from pit boulder anchor`
- `unproficient wielded bullwhip slips free from pit furniture anchor`
- `wielded bullwhip pit anchor chooses boulder before furniture`
- `proficient wielded bullwhip can yank hero out of pit via boulder`
- `proficient wielded bullwhip can yank hero out of pit via furniture`
- Existing audit 704, 716, 717, 718, 719, and 720 bullwhip canaries were rerun with the focused bullwhip pattern.

## Remaining Follow-Ups

- Visible big monster anchor override remains deferred, including exact `enexto()` destination selection and RNG.
- Pit-branch wakeup/anger for monsters on anchored squares remains deferred with the monster-anchor work.
- `teleds(..., TELEDS_ALLOW_DRAG)` side effects are represented by direct same-level relocation for the no-monster anchor case; ball-and-chain drag, post-relocation trap effects, and vision details remain broader work.
- Broader `use_whip()` follow-ups remain mimic reveal, invisible mapping, proficient `force_attack()`, floor snaring, dead-horse feedback, self/down steed mistakes, underwater/swallowed details, and exact wakeup visibility.
