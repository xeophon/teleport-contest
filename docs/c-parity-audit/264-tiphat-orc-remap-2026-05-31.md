# Tiphat orc-sound remap parity

## C anchors

- `nethack-c/upstream/src/sounds.c:695-713`: `domonnoise()` applies quest/shopkeeper overrides, then remaps `MS_ORC` to `MS_HUMANOID` when the hero's current form or base race matches the monster race, or when the hero is hallucinating. This happens before untame `MS_MOO` and hallucinated gecko sell routing.
- `nethack-c/upstream/src/mondata.c:771-790`: `same_race()` handles exact monster matches and player-race families including orc and gnome; kobolds are a separate family.
- `nethack-c/upstream/src/sounds.c:987-990`: unremapped `MS_ORC` still grunts with no RNG.
- `nethack-c/upstream/src/sounds.c:1025-1106`: remapped hostile humanoids threaten with no RNG; remapped peaceful humanoids use the generic humanoid speech table.
- `nethack-c/upstream/src/sounds.c:1495-1529`: directed `tiphat()` only reaches this noise path for adjacent non-visible responders after visible humanoid interception.

## JS coverage

- `tipHatMonsterNoise()` now applies the `MS_ORC` pre-switch remap before moo/gecko fallbacks.
- The local same-race bridge recognizes the relevant currently modeled `MS_ORC` families: orc, gnome, kobold, and demon. Hallucination still remaps any `MS_ORC` monster, matching C.
- The remap remains local to the current `tiphat()` helper; it does not claim shared `domonnoise()` or `#chat` coverage.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- unremapped invisible `MS_ORC` grunting,
- hallucinated invisible `MS_ORC` remapping to hostile humanoid threat,
- same-race orc and gnome remapping to humanoid speech,
- current orc-form remapping,
- preserving the gnome `G` vs gremlin `g` class distinction for current forms,
- nonmatching orc hero vs kobold `MS_ORC` staying on the grunt path.

All canaries are seed-free and assert no RNG consumption for the covered branches.

## Remaining gaps

- Full `same_race()` parity is still broader than this local bridge; only the `MS_ORC` families visible in this sound path are modeled.
- Shopkeeper, quest, priest, vampire, werecreature, Rider, Oracle, seduction, bribe, bones, and hostile cuss speech remain separate `domonnoise()` gaps.
- Broad `#chat` still does not share this `domonnoise()` table.
