# Mounted Hero Pit And Spiked Pit

## Scope

Port the C hero `PIT` and `SPIKED_PIT` floor-trigger path far enough to cover ordinary movement, `#sit`, mounted steed damage/death, flying/levitating avoidance, Sokoban air-current handling, iron-shoe spike protection, poison-spike side effects, and the object-list/dismount pending routes.

Before this slice, JS only had a narrow sit-only pit branch, so ordinary movement into pits was not consistently dispatched and mounted heroes did not route pit or spike damage through their steed.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:2013` through `:2070` covers the hero pit and spiked-pit effect body.
- `nethack-c/upstream/src/trap.c:2020` through `:2027` handles clingers seeing or discovering pits without falling in.
- `nethack-c/upstream/src/trap.c:2035` through `:2046` sets pit trap state and routes mounted heroes through `steedintrap()`.
- `nethack-c/upstream/src/trap.c:2050` through `:2068` applies hero pit damage, spiked-pit damage, iron-shoe spike protection, poison, and STR/DEX exercise.
- `nethack-c/upstream/src/trap.c:3137` through `:3140` is the `steedintrap()` `PIT`/`SPIKED_PIT` branch, damaging the steed with `rnd(6)` or `rnd(10)`.
- `nethack-c/upstream/src/trap.c:3163` through `:3167` dismounts if the steed was killed.
- `nethack-c/upstream/src/trap.c:2996` through `:3063` is `dotrap()`, including the Sokoban air-current exception, flying/levitating over-message path, known-trap escape chance, and shared floor-trigger dispatch.

## JS Change

- `js/cmd.js` now has a shared pit result helper used by movement and `#sit`.
- Ordinary movement into `PIT` now marks the trap seen, sets `u.utrap`/`u.utraptype`, rolls C-shaped pit damage, applies half-physical damage reduction, exercises STR/DEX, and routes fatal/life-saving handling through the existing trap result pipeline.
- Ordinary movement into `SPIKED_PIT` now handles spike damage, iron-shoe spike protection, poison-spike branches, and the same pit trap state/fatal pipeline.
- Mounted pit movement now sets the pit trap state but damages only the steed: `rnd(6)` for `PIT`, `rnd(10)` for `SPIKED_PIT`. Steed death uses the existing trap-death cleanup and dismount path.
- Flying or levitating heroes crossing hidden non-Sokoban pits avoid the effect without consuming RNG; crossing known pits reports the existing "fly/float over" wording.
- Sokoban pits now use the C-style air-current message and still apply the pit effect.
- Object-list and dismount object-list pending routes now consume `_pending_pit_trap` through the same shared movement result.

## Tests

- `hero pit movement traps and damages hero`
- `hero spiked pit movement applies spike damage and poison branch`
- `iron shoes protect hero from spiked pit spike branch`
- `mounted hero pit damages steed without hurting hero`
- `mounted hero spiked pit killing steed dismounts without hero damage`
- `flying hero crosses hidden pit without triggering`
- `flying hero crosses known pit with over message`
- `sokoban pit movement uses air current message`
- `dismount object list consumes pending pit trap`

The tests use local trap, steed, armor, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Monster-side pit and spiked-pit behavior still needs a separate `mintrap()` parity slice.
- Non-movement forced pit entry points beyond the shared `#sit` route, such as plunge/recursive/forced variants, still need a narrower C audit.
- Already-trapped `#sit` behavior inside an existing spiked pit remains outside this slice.
- Ball/chain, self-touch, and extra mounted death flavor hooks are still deferred.
- The remaining mounted floor-trap case from the prior audit is `POLY_TRAP`.
