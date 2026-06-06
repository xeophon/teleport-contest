# Mounted Hero Web Trap

## Scope

Port the ordinary-movement `WEB` trap path for the hero and mounted steed. This covers normal movement into a web, seen-web escape, flying/levitating still triggering web entry, mounted steed remapping into hero `utrap`, strong-steed timing, and deferred object-list consumption.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:1061` through `:1081` shows `WEB` is not a `floor_trigger()` trap, so the ordinary in-air skip for flying or levitating movement does not apply.
- `nethack-c/upstream/src/trap.c:3036` through `:3050` implements the generic seen-trap escape roll before trap effects, using `rn2(5)` and the plain `web` trap name from `nethack-c/upstream/include/defsym.h:174`.
- `nethack-c/upstream/src/trap.c:2110` through `:2203` implements hero `WEB` entry: reveal first, handle hero webmaker/destroy/flow-through forms before steed handling, set `u.utrap`, and compute final timing from strength.
- `nethack-c/upstream/src/trap.c:2163` through `:2187` remaps mounted steed `mtrapped` into hero `u.utrap/TT_WEB`, using effective strength 17 for strong trapped steeds.
- `nethack-c/upstream/src/trap.c:2204` through `:2273` supplies steed-as-monster web outcomes for caught, burn/dissolve, flow-through, webmaker immunity, and tear-through deletion.
- `nethack-c/upstream/src/hack.c:1587` through `:1601` shows later trapped-web movement remains a hero trap state even while mounted.

## JS Change

- `js/cmd.js` adds `movementWebTrapResult()` and local steed web helpers beside the existing movement trap result functions.
- Ordinary movement into `WEB` now reveals the trap, supports hero webmaker/destruction/flow-through cases, and otherwise sets hero `utraptype` to `'web'` with C-shaped strength timing.
- Seen webs now use the existing movement escape roll and print `You escape a web.` / `You escape your web.` to match C's generic `trapname(WEB)` wording.
- Mounted movement now leads the steed into the web, processes the steed web outcome, clears steed `mtrapped` when caught, and stores the remapped timer on the hero. Strong steeds use the C short nonzero duration branch.
- `WEB` is now queued and consumed through both `objectListMore` and `dismountObjectList` pending-trap paths, including the real dismount object-list setup.

## Tests

- `hero web movement catches hero`
- `known web can be escaped before entanglement`
- `flying hero still triggers hidden web trap`
- `mounted hero web movement remaps trapped steed into hero web state`
- `mounted strong steed web trap uses short nonzero web time`
- `dismount object list consumes pending web trap`
- `object list web trap waits until more is dismissed`

The tests use local trap, hero, steed, object-list, and RNG fixtures through normal command processing. They do not depend on replay maps, hidden tests, fixed seeds, player names, or runtime checks.

## Remaining Work

- Later movement while already web-trapped is covered by `553-hero-trapped-web-movement-2026-06-06.md`.
- Dismounting while holding a web, bear trap, or pit trap and transferring trapped state to the former steed is covered by `554-dismount-holding-trap-transfer-2026-06-06.md`.
- Failed untrap/NOWEBMSG web-spread behavior remains separate `#untrap` parity.
