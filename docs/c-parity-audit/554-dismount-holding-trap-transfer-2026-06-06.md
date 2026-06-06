# Dismount Holding Trap Transfer

## Scope

Port the C dismount transfer for mounted heroes who are already held by a bear trap, pit, spiked pit, or web. This covers clearing hero `utrap`, marking the former steed trapped on the old square, and running the already-trapped monster `mintrap()` branch rather than normal first-entry trap effects.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/steed.c:583` saves `u.utrap` before dismount.
- `nethack-c/upstream/src/steed.c:668` through `:672` marks the former steed `mtrapped` when `u.utraptype` is `TT_BEARTRAP`, `TT_PIT`, or `TT_WEB`.
- `nethack-c/upstream/src/steed.c:764` through `:772` moves the hero with `teleds()`, which clears hero trap state, then calls `mintrap(mtmp, NO_TRAP_FLAGS)` if `save_utrap` was nonzero.
- `nethack-c/upstream/src/teleport.c:487` and `nethack-c/upstream/src/trap.c:1045` through `:1049` clear hero `u.utrap/u.utraptype` during `teleds()`.
- `nethack-c/upstream/src/trap.c:3739` through `:3790` implements the already-trapped monster branch: reveal visible bear/pit/hole/web traps, roll `rn2(40)` or easy pit escape, optionally pull free, handle pit boulders, bear-trap eating, and spiked-pit spike eating.

## JS Change

- `js/cmd.js` now saves mounted hero trap state during `dismountSteed()`, recognizes numeric and string holding-trap states, clears hero `utrap/utraptype` after moving the hero, and sets the former steed `mtrapped`.
- The former steed immediately runs a local dismount-specific version of the already-trapped monster branch for `PIT`, `SPIKED_PIT`, `BEAR_TRAP`, and `WEB`.
- The branch preserves C RNG ordering for normal dismount landing selection followed by `rn2(40)`, with `rn2(2)` only for the pit-boulder escape/fill subcase.
- Web and bear-trap pull-free messages use steed display wording, so a saddled pony can produce `The saddled pony pulls free of the web.`
- Metallivorous former steeds can eat bear traps or munch spiked-pit spikes from the transferred trapped state.

## Tests

- `#ride dismount transfers mounted holding traps to former steed`
- `#ride dismount can let former steed pull free of transferred web`

The tests drive the real `#ride` command path, assert the landing and `mintrap()` RNG sequence, verify hero trap state is cleared, verify former steed `mtrapped` state, and cover the transferred web pull-free message and web persistence.

## Remaining Work

- The alternate C branch where the hero cannot be moved and the steed is relocated instead is still not modeled by the simplified JS `landingSpot()` failure path.
- Broader `#ride` parity remains open for cursed saddle checks, named steed dismount wording, hallucination follow-up, thrown/fell dismount injury, and exact stealth side effects.
- Failed untrap/NOWEBMSG web-spread behavior remains separate `#untrap` parity.
