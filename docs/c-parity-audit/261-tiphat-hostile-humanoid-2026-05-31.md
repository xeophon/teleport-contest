# Tiphat hostile humanoid noise parity

## C anchors
- `nethack-c/upstream/src/sounds.c:1025-1032`: `MS_HUMANOID` hostile monsters say `threatens you.` unless the hero is in the endgame and the monster data is an mplayer.
- `nethack-c/upstream/src/mplayer.c:356-377`: hostile endgame mplayers use `mplayer_talk()` and pick one of three same-class or other-class lines with `rn2(3)`.
- `nethack-c/upstream/src/sounds.c:1503-1529`: directed `tiphat()` handles visible humanoids before adjacent `domonnoise()`, so this slice targets invisible adjacent fallback responders.

## JS coverage
- `tipHatMonsterNoise()` now handles explicit `MS_HUMANOID` hostile monsters with the C generic `threatens you.` line.
- Marked mplayers are excluded from that generic line while `In_endgame(game.u?.uz)` is true, leaving the mplayer talk table for a dedicated slice.
- Focused tests cover invisible hostile `MS_HUMANOID` threatening without RNG and marked mplayers outside endgame still using the generic threat path.

## Remaining gaps
- Peaceful `MS_HUMANOID` and peaceful `MS_BOAST` fall-through behavior still need the broad humanoid speech table.
- Endgame `mplayer_talk()` same-class/other-class role messages are not modeled yet.
- No new species fallback infers `MS_HUMANOID`; this slice only handles explicit sounds already routed to humanoid speech.
