# Pet Seen-Trap Pathing And Leash Warning

## Scope

Port the C `dog_move()` candidate-selection rule for pets considering a harmful trap square before movement. This covers seen-trap avoidance for unleashed pets, leashed pet whimper feedback, and deaf suppression of that warning.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monster movement through `dog_move()` and then `postmov()`.
- `nethack-c/upstream/src/monmove.c:1508` runs `mintrap()` after `dog_move()` reports movement.
- `nethack-c/upstream/src/dogmove.c:1188` through `:1207` handles harmful trap candidates in `dog_move()`: leashed pets whimper when the hero can hear, while unleashed pets avoid only a concrete `tseen` trap on a nonzero `rn2(40)`.
- `nethack-c/upstream/src/sounds.c:477` through `:507` defines `whimper()` species wording for mew/growl, bark, and squeak sounds.

## JS Change

- `js/allmain.js` adds `petAvoidsTrapCandidate()` for the pet candidate loop.
- Unleashed pets now keep the existing C-shaped `trap.tseen && rn2(40)` avoidance for harmful dart, bear, pit, and spiked-pit candidates.
- Leashed pets no longer consume that `rn2(40)` avoidance roll for those candidates. Instead, they can continue toward the trap square and emit the matching non-hallucinated whimper wording when the hero is not deaf.
- Deaf heroes do not receive the leashed-pet trap warning.

## Tests

- `unleashed pet avoids seen harmful trap candidate with C dog-move roll`
- `leashed pet whimpers but can step onto seen harmful trap candidate`
- `deaf hero does not hear leashed pet trap-candidate whimper`

The tests use local pet, trap, visibility, and RNG fixtures through the normal monster-turn loop. They do not depend on replay maps, hidden tests, fixed seeds, player names, or runtime checks.

## Remaining Work

- Hallucinated `whimper()` sound-table randomization remains part of broader monster sound parity.
- Full leash distance pulling, breaking, teleport slack/yelp handling, and post-move leash recovery remain broader `dog_move()` and relocation parity.
