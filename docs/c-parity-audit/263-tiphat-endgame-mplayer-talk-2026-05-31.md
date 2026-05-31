# Tiphat endgame mplayer talk parity

## C anchors
- `nethack-c/upstream/src/sounds.c:1025-1031`: hostile `MS_HUMANOID` monsters use `mplayer_talk()` only when the hero is in the endgame and the monster data is an mplayer; otherwise they use `threatens you.`
- `nethack-c/upstream/src/mplayer.c:356-377`: `mplayer_talk()` emits one quoted `Talk? -- ...` line, selecting either the same-class or other-class table with exactly one `rn2(3)`.
- `nethack-c/upstream/src/sounds.c:1495-1529`: directed `tiphat()` reaches `domonnoise()` after visible humanoid interception, so this slice covers invisible adjacent responders.

## JS coverage
- `tipHatMonsterNoise()` now routes hostile endgame mplayers to a local `mplayer_talk()` equivalent instead of falling through unhandled.
- The class comparison accepts C-style mplayer monster indexes when present and falls back to canonical role names for the current lightweight JS monster metadata.
- Focused tests cover non-endgame mplayers still threatening, same-class endgame talk, other-class endgame talk, and endgame non-mplayer humanoids staying on the generic threat path.

## Remaining gaps
- Visible endgame mplayers still use the existing visible humanoid rude-response path before monster noise, matching directed `tiphat()` ordering but not broad `domonnoise()`/`#chat`.
- The role metadata bridge is local to `tiphat()` until the port has a generated C monster/role registry.
- Shared `domonnoise()` remains unmodeled outside the current `tiphat()` helper.
