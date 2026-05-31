# C Parity Audit 336: Polyself Levitation Pool Boot Fallout

## Sources

- `nethack-c/upstream/src/polyself.c:1273-1284`: boot-incompatible polyself forms print the boot falloff message, call `Boots_off()`, then drop the boots.
- `nethack-c/upstream/src/do_wear.c:262-307`: `Boots_off()` clears worn boots before running water-walking or levitation side effects.
- `nethack-c/upstream/src/trap.c:4024-4117`: levitation boot removal calls `float_down()`, which checks pool/lava fallout before ordinary float-down messages.
- `nethack-c/upstream/src/trap.c:5059-5165`: pool fallout prints the fall/sink messages, can crawl the hero out to an adjacent square, and relocates before control returns to the caller.
- `nethack-c/upstream/src/do.c:786`: after `Boots_off()` returns, `dropp()` drops the boots at the hero's current coordinates.

## JS Changes

- Added the ordinary pool branch for polyself levitation-boot loss, reusing the existing successful crawl-out relocation path that water-walking boot fallout uses.
- Levitation boots are now learned and active levitation is cleared when the pool fall is triggered, matching `Boots_off()` plus `float_down()`.
- Polyself equipment drops can now target the queued crawl-out destination. That keeps the local More/relocation UI contract while matching C's side-effect-before-drop ordering for both water-walking and levitation boots.

## Tests

- `successful centaur polyself losing water walking boots falls into pool and crawls out` now asserts the boots land on the crawl-out destination.
- `successful centaur polyself losing levitation boots over pool falls in and crawls out` covers levitation loss over a pool, identity learning, relocation queuing, and destination-square boot placement.

## Remaining Gaps

- Water-walking boot loss over lava is covered in audit 338; levitation boot loss over lava remains a separate slice.
- Levitation `float_down()` trap, Sokoban, steed, swallowed/engulfed, blocked-levitation, hallucination, emergency-disrobe failure, and broader water-entry branches remain deferred.
