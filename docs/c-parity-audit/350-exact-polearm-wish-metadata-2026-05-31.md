# Exact polearm wish metadata

Date: 2026-05-31

## Summary

Added C object-table metadata for exact wished polearms that already have stable local object IDs: partisan, ranseur, spetum, glaive, and lucern hammer. These wishes now create weapon objects with the C unidentified appearance, canonical `actualKind`, weight, shop cost, and namedesc RNG bound. The same appearance names also resolve to the concrete object, including hyphen-insensitive `single edged polearm` for glaive.

Weapon pickup naming now uses the unidentified appearance when `known === false` and an object carries a distinct appearance in `kind`, while keeping `actualKind` available for damage, pricing, and identity checks.

## Upstream source anchors

- `nethack-c/upstream/include/objects.h:292`: polearm rows define object names, descriptions, probabilities, weights, costs, material, and damage dice.
- `nethack-c/upstream/include/objclass.h:47`: `oc_nowish` and related object-class fields.
- `nethack-c/upstream/src/objnam.c:3495`: exact object-name matching through `OBJ_NAME`.
- `nethack-c/upstream/src/objnam.c:3507`: description matching through `OBJ_DESCR`.
- `nethack-c/upstream/src/objnam.c:5001`: normal-mode wish rejection only blocks special or `oc_nowish` objects; these weapons are not `oc_nowish`.

## JS changes

- `js/cmd.js`
  - Added local constants for `RANSEUR`, `PARTISAN`, `SPETUM`, and `LUCERN_HAMMER` alongside existing weapon constants.
  - Added exact `WISH_BASE_OBJECTS` rows for partisan, ranseur, spetum, glaive, and lucern hammer using C appearances and weights.
  - Added namedesc RNG bounds matching C `oc_prob + 1` for those rows.
  - Added C polearm weights to `OBJECT_WEIGHTS`.
  - Added wish aliases for the modeled polearm appearances.
  - Updated weapon display naming so unidentified appearance weapons show their appearance while keeping `actualKind` for mechanics.
- `test/wishing.test.mjs`
  - Added exact-wish assertions for C appearance metadata, weights, costs, and normal-mode wishability.
  - Added appearance-name wish assertions for the modeled polearms.
- `test/shop-billing-helpers.test.mjs`
  - Updated upward appearance-weapon message assertions to keep checking visible names while preserving `actualKind` mechanics checks.

## Verification

- `node --check js/cmd.js`
- `node --check test/wishing.test.mjs`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'wished polearm' test/wishing.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (elven broadsword|glaive|spetum|ranseur|bill-guisarme|bec de corbin)' test/shop-billing-helpers.test.mjs`
- `node --test test/wishing.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` (`44/44 passing`)

## Remaining gaps

- Exact wishes for halberd, bardiche, voulge, fauchard, guisarme, bill-guisarme, and bec de corbin still need a stable local `otyp` model before adding parser entries.
- Direct `mksobj()`/`mongets()` canonical naming and `object_display()` support for concrete polearm IDs remains incomplete outside the wish overlay path.
