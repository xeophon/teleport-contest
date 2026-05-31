# Tiphat peaceful humanoid noise parity

## C anchors
- `nethack-c/upstream/src/sounds.c:1006-1025`: peaceful `MS_BOAST` falls through to `MS_HUMANOID` instead of using the hostile giant boast table.
- `nethack-c/upstream/src/sounds.c:1033-1103`: peaceful `MS_HUMANOID` orders fleeing, injury, confusion, blindness, trapping, healing request, pet hunger, species interests, role-specific lines, and generic exploration speech.
- `nethack-c/upstream/src/sounds.c:1503-1529`: directed `tiphat()` handles visible humanoids first, so these canaries target invisible adjacent responders that reach `domonnoise()`.

## JS coverage
- `tipHatMonsterNoise()` now routes peaceful explicit `MS_HUMANOID` and peaceful `MS_BOAST` responders through the peaceful humanoid table.
- The table preserves C branch priority, including no-RNG fleeing, the `rn2(3)` then optional `rn2(2)` confused speech, trap revelation, tame hunger, and species/role interest lines.
- Focused tests cover the default exploration line, distress priority, confusion RNG shape, trap visibility, wound and hunger gates, species/role interests, and peaceful boast fall-through.

## Remaining gaps
- The blind `"I can't see!"` branch is present in the local helper, but normal directed `tiphat()` filtering does not currently route blind responders into `domonnoise()`.
- Endgame `mplayer_talk()` remains unmodeled for hostile endgame mplayers.
- This remains `tiphat()`-local and does not replace shared `domonnoise()` or `#chat` behavior.
