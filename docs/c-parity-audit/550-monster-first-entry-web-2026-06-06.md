# Monster First-Entry Web

## Scope

Port the first-entry `WEB` effect for ordinary monsters and pets after movement. This covers C ordering for known-trap avoidance, trap learning, visible caught messages, unseen owlbear/bugbear roar feedback, webmaker immunity, flow-through, web destruction, and tear-through web deletion.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3733` through `:3839` implements `mintrap()` first-entry handling: known traps avoid 3/4 of the time, triggering monsters learn before the trap effect, and nearby eligible monsters can learn via `mons_see_trap()`.
- `nethack-c/upstream/src/trap.c:1061` through `:1081` shows `WEB` is not a floor-trigger trap, so generic in-air skipping does not apply to it.
- `nethack-c/upstream/src/trap.c:972` through `:1013` implements `mu_maybe_destroy_web()`: flaming or acidic pass-through deletes the web with visible burn/dissolve feedback, while amorphous/whirly/unsolid/cube flow-through can reveal the web without trapping.
- `nethack-c/upstream/src/trap.c:2204` through `:2273` implements monster `WEB` effects: webmakers are unaffected, unseen owlbears/bugbears roar and become trapped, ordinary visible monsters are caught, giants/adult nasty dragons/long worms and listed huge monsters tear through and delete the web.
- `nethack-c/upstream/include/mondata.h:147` through `:148` defines webmakers as cave spiders and giant spiders.
- `nethack-c/upstream/src/monmove.c:1455` through `:1516` and `:1771` through `:1774` show ordinary monsters and tame pets both run the same post-move `mintrap()` first-entry path.

## JS Change

- `js/allmain.js` replaces the split inline/special WEB code with shared `monsterWebTrapEffect()` used by both ordinary monster movement and pet post-move trap handling.
- First-entry WEB now learns the trap before effect outcomes, including webmaker immunity, flow-through, burn/dissolve, and tear-through cases.
- Ordinary visible monsters and visible pets become `mtrapped` and print the C-shaped caught-in-spider-web message.
- Unseen bugbears and owlbears now print `You hear the roaring of a confused bear!` and remain caught without revealing the trap.
- Webmakers leave the web intact and are not trapped. Flow-through forms reveal but keep the web. Flaming/acidic forms and web-tearing monsters delete the web without becoming trapped.
- The existing deferred `More` handling for long visible WEB caught messages remains in the ordinary monster turn path.

## Tests

- `monster first-entry web catches ordinary and strong non-giant monsters visibly`
- `unseen bugbear first-entry web roars and stays caught without revealing web`
- `pet first-entry web catches pet visibly`
- `monster first-entry webmaker learns web without being trapped`
- `monster first-entry web flow-through reveals web without trapping`
- `monster first-entry web destruction removes web without trapping`
- `monster first-entry web tear-through removes web without trapping`

The tests use local monster, pet, trap, visibility, and turn-processing fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Mounted hero/steed WEB duration remapping remains separate mounted-trap parity.
- Pet seen harmful-trap pathing and leashed whimper behavior are covered by audit 551.
- The port currently treats existing JS noncorporeal aliases as WEB flow-through candidates where they model C `unsolid()` monsters.
