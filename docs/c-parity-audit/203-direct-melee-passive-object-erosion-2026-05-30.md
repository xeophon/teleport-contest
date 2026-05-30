# C Parity Audit 203: Direct Melee Passive Object Erosion

## Sources

- `nethack-c/upstream/src/uhitm.c:6127-6184`: `passive_obj()` selects the attacking object and handles passive `AD_FIRE`, `AD_ACID`, `AD_RUST`, `AD_CORR`, and `AD_ENCH` only after successful direct hits.
- `nethack-c/upstream/src/uhitm.c:6160-6177`: fire and acid passives gate erosion with `rn2(6)`; fire still spends that roll before cancelled/steam-vortex suppression, while acid ignores cancellation.
- `nethack-c/upstream/src/trap.c:171-308`: `erode_obj()` applies inventory resistance, grease protection, material/proof/blessed checks, erosion messages, and inventory refresh for carried objects.
- `nethack-c/upstream/src/zap.c:5676-5717`: inventory resistance from worn/wielded resistance gear gives carried objects a 99% protection roll; worn dwarvish cloaks give 90% heat/cold protection.

## JS Changes

- Extended the direct-melee passive-object wrapper beyond `AD_ENCH` to handle carried weapon erosion for `AD_RUST`, `AD_CORR`, `AD_FIRE`, and `AD_ACID`.
- Added a C-shaped carried-item erosion helper for direct melee: grease protection/dissolve, proof revelation, blessed avoidance, max-erosion no-op, inventory line refresh, and no shop billing because C calls `erode_obj()` here without `EF_PAY`.
- Moved direct passive-object handling before the trailing live-passive `rn2(3)` gate, matching C `passive()` ordering where `passive_obj()` runs before the still-living passive effect block.
- Preserved C RNG ordering for fire and acid passive object attacks, including cancelled fire passives consuming the `rn2(6)` gate before skipping erosion.
- Added inventory-resistance rolls for fire/acid/corrosion when active resistance gear is modeled in inventory.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- Direct melee against a rust monster rusts a wielded dagger and updates its inventory line.
- Cancelled rust monster passive object erosion is suppressed.
- Direct melee against a black pudding corrodes a wielded dagger.
- Direct melee against an acid passive can corrode a wielded dagger after the `rn2(6)` gate.
- Direct melee against a fire passive can burn a flammable wielded bow.
- Cancelled fire passive object erosion still spends the fire gate roll and skips the burn.
- Disenchanter drain and fire/acid erosion tests assert object-passive RNG happens before the final live-passive `rn2(3)` gate.

## Remaining Gaps

- Direct passive-object grease/proof/blessed/resistance edge cases are implemented but only indirectly covered; add focused tests if hidden coverage starts probing those rows.
- Worn-glove fallback for unarmed `AD_ENCH` remains implemented but still lacks a command-path regression test.
- Monster-thrown passive object landing is covered for current slices, but broader launcher-arrow and lethal hit persistence remain separate risks.
- Clean `+1` launcher arrows on nonlethal hit and miss are covered in `docs/c-parity-audit/204-plus-one-launcher-arrow-drop-throw-2026-05-30.md`; keep blessed, eroded, greased, cursed, higher-enchanted, and lethal cases separate until `seed0030` and bones/persistence ordering are verified.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'direct hero melee.*(rust|black pudding|acid passive|fire passive|disenchanter)' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1065/1065`)
- `node --test test/*.mjs` (`1162/1162`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
