# C Parity Audit 830: Remaining Common Genocide Immunity

Closed the remaining generated-common `G_GENO` eligibility gap identified after the elemental/golem slice. JS generated common random-monster rows still included titan, lycanthropes, generated common demons, and salamander as ordinary genocide targets because the table preserved C creation frequency bits but not the separate `G_GENO` flag. C omits `G_GENO` for those rows, so normal genocide must reject them and blessed class genocide must either refuse all-immune classes or skip immune members in mixed classes with a per-member permission message.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target source-backed monster names and class glyphs directly.

## Source Anchors

- `nethack-c/upstream/include/monflag.h:200` and `:202`: C stores `G_GENO` separately from low creation-frequency bits.
- `nethack-c/upstream/src/read.c:2689` through `:2697`: class genocide counts only `G_GENO` members as good targets.
- `nethack-c/upstream/src/read.c:2699` through `:2704`: all-immune classes retry with `You aren't permitted to genocide such monsters.`
- `nethack-c/upstream/src/read.c:2724` through `:2751`: mixed classes wipe eligible species in monster order.
- `nethack-c/upstream/src/read.c:2781` through `:2808`: mixed classes print `You aren't permitted to genocide ...` for immune members.
- `nethack-c/upstream/src/read.c:2913` through `:2927`: normal genocide rejects named non-`G_GENO` monsters with the divine refusal.
- `nethack-c/upstream/include/monsters.h:1777` through `:1779`: `titan` has frequency `(1)`, without `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2609` through `:2628`: the generated human lycanthrope rows use frequency `(1)`, without `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2931` through `:3044`: generated common demons use frequency bits without `G_GENO`.
- `nethack-c/upstream/include/monsters.h:3316` through `:3317`: `salamander` uses `(G_HELL | 1)`, without `G_GENO`.
- `js/monster_data.js:174`, `:250` through `:252`, `:264` through `:273`, and `:281`: local generated monster metadata includes those same common rows.

## JS Changes

- `js/cmd.js:31009`
  - Expanded the source-backed forbidden genocide set to include titan, generated human lycanthropes, generated common demons, and salamander.
- `js/cmd.js:31525`
  - Reused the mixed-class per-member permission path added in audit 829 so `H` and `:` wipe eligible members while skipping titan and salamander.

## Tests

- `test/shop-billing-helpers.test.mjs:13787`
  - Added normal genocide coverage for titan, wererat, werejackal, werewolf, all generated common demon rows, and salamander, requiring the divine refusal and open retry prompt.
- `test/shop-billing-helpers.test.mjs:13814`
  - Added a blessed `H` class canary requiring eligible giants and minotaur to be wiped while titan is refused and left unmarked.
- `test/shop-billing-helpers.test.mjs:13830`
  - Added a blessed `&` class canary requiring all-generated-common demon class refusal and no marked demon rows.
- `test/shop-billing-helpers.test.mjs:13852`
  - Added a blessed `:` class canary requiring lizards to be wiped while salamander is refused and left unmarked.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "remaining generated C non-G_GENO|blessed genocide (skips C non-G_GENO titan|refuses generated C non-G_GENO demon class|skips C non-G_GENO salamander|skips C non-G_GENO elemental|refuses C non-G_GENO golem class|refuses C non-G_GENO angel class)|genocide refuses C non-G_GENO" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The generated monster metadata still lacks explicit `G_GENO` eligibility. A generated eligibility map remains the cleaner long-term fix.
- This closes the known generated-common non-`G_GENO` drift list, but C `G_GENO` rows absent from the JS common table still need separate catalog work when they are not already covered by existing extras.
