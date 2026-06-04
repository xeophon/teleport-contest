# Polearm Direct Wish Metadata

Date: 2026-06-04

## Summary

Completed direct construction and wish metadata for the seven polearms that were present in random weapon generation but missing from exact `mksobj()` and wish/name resolution: halberd, bardiche, voulge, fauchard, guisarme, bill-guisarme, and bec de corbin. Random `WEAPON_CLASS` generation was left unchanged because it already had all twelve C polearm probability rows.

## Upstream source anchors

- `nethack-c/upstream/include/objects.h:292` through `:341`: C defines all twelve polearms with names, appearances, probabilities, weights, costs, damage, `P_POLEARMS`, material, and color.
- `nethack-c/upstream/src/mkobj.c:289`: random object generation uses C `oc_prob`, which was already modeled for polearm roll rows.
- `nethack-c/upstream/src/objnam.c:3432` through `:3445`: `rnd_otyp_by_wpnskill(P_POLEARMS)` chooses uniformly with `rn2(n)` across weapon rows sharing the polearm skill.
- `nethack-c/upstream/src/objnam.c:4982` through `:4986`: generic `polearm` wishes use `rnd_otyp_by_wpnskill(P_POLEARMS)`.
- `nethack-c/upstream/src/objnam.c:5037`: the resolved object type is created by `mksobj()`.

## JS changes

- `js/mklev.js`
  - Added synthetic IDs `10172` through `10178` for `HALBERD`, `BARDICHE`, `VOULGE`, `FAUCHARD`, `GUISARME`, `BILL_GUISARME`, and `BEC_DE_CORBIN`.
  - Extended `SPECIFIC_POLEARM_INFO` so exact `mksobj()`/`object_display()` use C appearance names and weights for all twelve polearms.
  - Extended `SPECIFIC_WEAPONS` so exact construction uses weapon initialization.
- `js/cmd.js`
  - Added matching constants and `WISH_BASE_OBJECTS` rows for the seven polearms.
  - Added C namedesc bounds (`oc_prob + 1`) for the seven direct names.
  - Added a zero-probability generic `polearm` range so existing range logic uses uniform `rn2(12)`.
  - Added missing appearance/name aliases for the new polearm descriptions.

## Tests

- Extended `wished polearms use C appearance metadata` to cover all twelve direct polearm wishes with C appearance, weight, and cost.
- Extended `wished polearm appearances resolve to concrete C polearms` to cover all twelve appearance aliases.
- Extended `mksobj initializes exact local-ID polearms with C appearance metadata` to cover all twelve exact local IDs.
- Added `generic wished polearm range uses C uniform P_POLEARMS candidates` to assert `rn2(12)` selection, concrete weapon creation, and C weights.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/wishing.test.mjs`
- `node --test --test-name-pattern "wished polearms use C appearance metadata|wished polearm appearances resolve|mksobj initializes exact local-ID polearms|generic wished polearm range" test/wishing.test.mjs` - 4 pass, 79 skipped
- `git diff --check`
- `node --test test/wishing.test.mjs` - 83 pass
- `node --test test/*.mjs` - 1658 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Broader object registry consolidation remains open; this slice only fills direct polearm construction and wishing metadata.
- Polearm combat/apply behavior was intentionally not changed.
