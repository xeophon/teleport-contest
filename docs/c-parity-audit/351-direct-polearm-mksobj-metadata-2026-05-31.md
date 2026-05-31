# Direct polearm mksobj metadata

Date: 2026-05-31

## Summary

Added C object-table metadata for direct `mksobj()` creation of the local-ID polearms that are already modeled in JS: partisan, ranseur, spetum, glaive, and lucern hammer. These direct objects now carry weapon class, weapon glyph, C unidentified appearance, canonical `actualKind`, `known: false`, and C weight before downstream display or inventory handling.

This also covers `mongets()` paths for troll and strong-monster inventory because the JS helper creates via `mksobj()` and then applies `object_display()`. The old lucern-hammer-only `mongets()` override was removed so lucern hammer no longer loses its C unidentified `pronged polearm` appearance.

## Upstream source anchors

- `nethack-c/upstream/include/objects.h:114`: `WEAPON(...)` rows feed `OBJECT(...)` with `WEAPON_CLASS`, probability, weight, cost, material, and display color.
- `nethack-c/upstream/include/objects.h:294`: partisan, ranseur, spetum, and glaive C rows define their object names, unidentified descriptions, weights, costs, and `HI_METAL` color.
- `nethack-c/upstream/include/objects.h:335`: lucern hammer C row defines `pronged polearm`, weight 150, cost 7, iron material, and `HI_METAL` color.
- `nethack-c/upstream/src/mkobj.c:867`: C `mksobj_init()` applies `WEAPON_CLASS` initialization for quantity, enchantment, bless/curse, poison, and artifact chance.
- `nethack-c/upstream/src/mkobj.c:1179`: C `mksobj()` copies `objects[otyp].oc_class` into `otmp->oclass`, stores `otyp`, calls `unknow_object()`, then runs type initialization.
- `nethack-c/upstream/src/makemon.c:452`: troll inventory can directly create ranseur, partisan, glaive, or spetum through `mongets()`.
- `nethack-c/upstream/src/makemon.c:558`: strong-monster inventory can directly create lucern hammer through `mongets()`.
- `nethack-c/upstream/src/makemon.c:2181`: C `mongets()` delegates object creation to `mksobj(otyp, TRUE, FALSE)`.

## JS changes

- `js/mklev.js`
  - Added `SPECIFIC_POLEARM_INFO` for the five local-ID polearms with C unidentified appearance, canonical identity, and weight.
  - Applied that metadata in `mksobj()` for direct concrete polearm creation.
  - Updated `object_display()` so all five local-ID polearms render as cyan weapon glyphs.
  - Removed the lucern-hammer-only `mongets()` canonical-name override so monster inventory keeps the C unidentified appearance from `mksobj()`.
- `test/wishing.test.mjs`
  - Added a direct `mksobj()` regression covering all five local-ID polearms, including class, glyph, appearance, `actualKind`, unknown state, quantity, weight, display color, and shop base cost.

## Verification

- `node --check js/mklev.js`
- `node --check test/wishing.test.mjs`
- `node --test --test-name-pattern 'mksobj initializes exact local-ID polearms|wished polearm' test/wishing.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (glaive|spetum|ranseur|bill-guisarme|bec de corbin)' test/shop-billing-helpers.test.mjs`
- `node --test test/wishing.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` (`44/44 passing`)
- `git diff --check`

## Remaining gaps

- Halberd, bardiche, voulge, fauchard, guisarme, bill-guisarme, and bec de corbin still need stable local object IDs before direct exact-object creation can mirror their C rows.
- Weight and cost are still split across local metadata and command-side pricing tables; broader registry-backed object metadata remains open.
- C probability, material, and full object-class metadata are not yet consolidated into one JS object registry.
