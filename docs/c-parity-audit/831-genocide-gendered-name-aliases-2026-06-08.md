# C Parity Audit 831: Genocide Gendered Name Aliases

Closed a normal-genocide name resolution gap for C `NAMS(...)` rows. The JS catalog stores neutralized generated names such as `dwarf leader`, `gnome ruler`, and `amorous demon`, but C's `name_to_mon()` also accepts the male and female names in `mons[].pmnames[]`. Before this slice, normal genocide input like `dwarf lord`, `gnome queen`, `incubus`, or `succubi` could be rejected as nonexistent instead of resolving to the neutral row and then applying the normal genocide eligibility rules.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target source-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/mondata.c:1038` through `:1058`: `name_to_monplus()` scans every `mons[i].pmnames[MALE..NEUTRAL]` entry and accepts exact names and ordinary plural suffixes.
- `nethack-c/upstream/src/mondata.c:1007` through `:1008`: C explicitly maps irregular plural `incubi` and `succubi` to `PM_AMOROUS_DEMON`.
- `nethack-c/upstream/src/read.c:2890` through `:2896`: normal genocide resolves input with `name_to_mon()` before testing existence and eligibility.
- `nethack-c/upstream/src/read.c:2913` through `:2927`: a resolved non-`G_GENO` monster is refused by the divine voice rather than reported nonexistent.
- `nethack-c/upstream/include/monsters.h:2931` through `:2932`: `NAMS("incubus", "succubus", "amorous demon")` lacks `G_GENO`.
- `js/cmd.js:27215` through `:27233`: JS already carries the gendered neutral-name table used by corpse/statue/figurine naming.

## JS Changes

- `js/cmd.js:31091`
  - `genocideMonsterByName()` now adds male/female names from the existing gendered-name table to each neutral catalog row's accepted candidates.
  - The resolver also accepts hyphen-to-space variants and explicit `incubi`/`succubi` aliases for the amorous demon row.

## Tests

- `test/shop-billing-helpers.test.mjs:13682`
  - Added normal genocide canaries for `dwarf lord` and `gnome queen`, requiring the neutral rows to be wiped as `dwarf leader` and `gnome ruler`.
- `test/shop-billing-helpers.test.mjs:13705`
  - Added normal genocide canaries for `incubus`, `succubus`, `incubi`, and `succubi`, requiring C's divine non-`G_GENO` refusal rather than nonexistent-monster text.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C gendered neutral monster aliases|genocide resolves C amorous demon aliases|remaining generated C non-G_GENO|blessed genocide refuses generated C non-G_GENO demon class" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name parser rather than C's full `name_to_monplus()` and `makeplural()` machinery.
