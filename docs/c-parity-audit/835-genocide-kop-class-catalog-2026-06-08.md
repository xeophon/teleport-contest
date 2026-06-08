# C Parity Audit 835: Genocide Kop Class Catalog

Closed a normal and blessed class-genocide catalog gap for Keystone Kops. C marks all four Kop ranks as `G_GENO | G_NOGEN`, so ordinary genocide accepts named Kops and blessed class genocide over class `K` wipes out the Kop family. JS already had runtime Kop support for monster behavior, but the genocide catalog did not include those no-random-generation rows, so genocide could treat them as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed Kop names/classes directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2685` through `:2697`: `do_class_genocide()` resolves class input and counts members by exact `mons[i].mlet == class`.
- `nethack-c/upstream/src/read.c:2724` through `:2751`: blessed class genocide wipes each class member that carries `G_GENO` and is not already genocided.
- `nethack-c/upstream/src/read.c:2890` through `:2913`: ordinary genocide resolves named monsters and then checks `G_GENO` eligibility.
- `nethack-c/upstream/include/monsters.h:1829` through `:1836`: `Keystone Kop` is `S_KOP` and has `G_GENO | G_LGROUP | G_NOGEN`.
- `nethack-c/upstream/include/monsters.h:1837` through `:1844`: `Kop Sergeant` is `S_KOP` and has `G_GENO | G_SGROUP | G_NOGEN`.
- `nethack-c/upstream/include/monsters.h:1845` through `:1852`: `Kop Lieutenant` is `S_KOP` and has `G_GENO | G_NOGEN`.
- `nethack-c/upstream/include/monsters.h:1853` through `:1860`: `Kop Kaptain` is `S_KOP` and has `G_GENO | G_NOGEN`.

## JS Changes

- `js/cmd.js:31001`
  - Added supplemental genocide catalog rows for `Keystone Kop`, `Kop Sergeant`, `Kop Lieutenant`, and `Kop Kaptain` with class glyph `K`.

## Tests

- `test/shop-billing-helpers.test.mjs:13652`
  - Added a normal genocide canary for `Keystone Kop`, requiring `Wiped out all Keystone Kops.` and a canonical genocided entry.
- `test/shop-billing-helpers.test.mjs:13848`
  - Added a blessed class-genocide canary for input `kop`, requiring all four Kop ranks to be wiped and rejecting permission/nonexistent-class text.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide catalogs C Keystone Kop|blessed genocide catalogs C Kop class|genocide catalogs C watch captain|blessed genocide refuses C non-G_GENO ghost class" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other `G_GENO | G_NOGEN` rows that only exist in special generation paths may still need supplemental genocide catalog entries.
