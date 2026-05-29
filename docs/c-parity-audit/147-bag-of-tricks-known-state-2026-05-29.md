# 147 - Bag-of-tricks known-state discovery

## Implemented Slice

Bag-of-tricks `#tip` and `#loot` now follow the C distinction between a known object instance and a globally known tool type. Empty zero-charge use only marks the contents known when the bag is described and the type is known, and a known bag of tricks is no longer offered as a destination container for `#tip`.

C anchors:

- `bagotricks()` makes the tool known only when visible/sensed monster creation happens and the bag is described: `nethack-c/upstream/src/makemon.c:2589`.
- Empty bag-of-tricks use sets `cknown` only when the bag is described and the object type is globally known: `nethack-c/upstream/src/makemon.c:2563`.
- `#tip` excludes bag-of-tricks targets only when `dknown` and the object type is name-known: `nethack-c/upstream/src/pickup.c:3908`.
- Tipping into an unknown bag of tricks applies the target before checking the source container: `nethack-c/upstream/src/pickup.c:3959`.
- `#loot` identifies a bag of tricks through the bite path: `nethack-c/upstream/src/pickup.c:2150`.

JS changes:

- `recordKnownToolDiscovery()` now upgrades existing Tools discovery records to known instead of leaving stale unknown entries unchanged: `js/cmd.js:12086`.
- Charged-tool identification records the global Tools discovery for the identified type: `js/cmd.js:30269`.
- Bag-of-tricks target eligibility now uses a C-shaped `dknown && type-known` predicate instead of only the item-local `known` field: `js/cmd.js:30164`.
- Empty bag-of-tricks use now sets `cknown` only through that same known-type predicate: `js/cmd.js:30903`.

Tests:

- A known bag of tricks is excluded from `#tip` destination selection and the source tips to the floor instead: `test/shop-billing-helpers.test.mjs:2480`.
- Zero-charge known bag-of-tricks use still learns empty contents and avoids shop debt: `test/shop-billing-helpers.test.mjs:2607`.
- Zero-charge described but undiscovered bag-of-tricks use reports nothing and does not learn contents: `test/shop-billing-helpers.test.mjs:2626`.
- Zero-charge described bag-of-tricks use learns contents once the Tools discovery is known: `test/shop-billing-helpers.test.mjs:2645`.
- Floor `#loot` bite records the bag-of-tricks Tools discovery without usage billing: `test/shop-billing-helpers.test.mjs:2680`.

## Fresh Audit Backlog

- Apply/getobj prompt parity: split suggested, downplayed, and selectable apply candidates; make `?` show C's suggested subset and `*` show full inventory; add coin apply/flip behavior. C anchors include `nethack-c/upstream/src/apply.c:4151`, `nethack-c/upstream/src/apply.c:4226`, and `nethack-c/upstream/src/invent.c:1885`.
- Down-gate migration: add C-shaped records for `MIGR_STAIRS_UP`, `MIGR_LADDER_UP`, `MIGR_SSTAIRS`, and `MIGR_RANDOM` before broadening projectile/kick shipping. C anchors include `nethack-c/upstream/src/dokick.c:1638`, `nethack-c/upstream/src/dokick.c:1769`, and `nethack-c/upstream/src/stairs.c:64`.
- Generic `obfree(obj, NULL)` preservation: recurse billed contents before marking live bill rows used-up, without synthesizing rows from stale `unpaid` fields. C anchors include `nethack-c/upstream/src/shk.c:1173`, `nethack-c/upstream/src/shk.c:1187`, and `nethack-c/upstream/src/mkobj.c:697`.
- Polymorph wand immediate traversal: replace adjacent-only JS handling with `bhit()`-style range traversal that hits monsters and floor piles along the path. C anchors include `nethack-c/upstream/src/zap.c:3440`, `nethack-c/upstream/src/zap.c:4031`, and `nethack-c/upstream/src/zap.c:4045`.

## Deferred Gaps

- Carried horn-of-plenty `#tip` source visibility still needs the broader getobj/downplayed-candidate command contract; floor horn selection remains excluded.
- `bagotricks()` monster-creation discovery now records Tools discovery through charged-tool identification, but broader monster visibility/sensing parity remains part of monster placement and display work.
- Unknown bag-of-tricks destination behavior is preserved, including applying the target before locked-source checks, but full C `#tip` menu/downplay behavior remains separate.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "bag of tricks|#tip destination|horn of plenty" test/shop-billing-helpers.test.mjs` - 11 pass, 930 skipped.
- `node --test test/shop-billing-helpers.test.mjs` - 941 pass.
- `node --test test/*.mjs` - 1022 pass.
- `npm run score` - 44/44 pass.
