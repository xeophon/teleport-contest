# C Parity Audit 829: Genocide Elemental And Golem Immunity

Closed another `G_GENO` eligibility gap in scroll-of-genocide handling. The generated JS monster table includes elementals and golems with ordinary creation frequencies, but the C `mons[].geno` rows for those monster types omit `G_GENO`; normal genocide must reject them, and blessed class genocide must either skip them with C's per-member permission message or refuse the class when every member is immune.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target source-backed monster names and class glyphs directly.

## Source Anchors

- `nethack-c/upstream/include/monflag.h:200` and `:202`: C stores `G_GENO` separately from the low creation-frequency bits.
- `nethack-c/upstream/src/read.c:2689` through `:2697`: class genocide counts only `G_GENO` members as good targets.
- `nethack-c/upstream/src/read.c:2699` through `:2704`: all-immune classes retry with `You aren't permitted to genocide such monsters.`
- `nethack-c/upstream/src/read.c:2724` through `:2751`: mixed classes still wipe each eligible species in monster order.
- `nethack-c/upstream/src/read.c:2781` through `:2808`: mixed classes print `You aren't permitted to genocide ...` for immune members.
- `nethack-c/upstream/src/read.c:2913` through `:2927`: normal genocide rejects a named non-`G_GENO` monster with the divine refusal.
- `nethack-c/upstream/include/monsters.h:1574` through `:1603`: `air elemental`, `fire elemental`, `earth elemental`, and `water elemental` use `(G_NOCORPSE | 1)`, without `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2509` through `:2587`: every ordinary golem row uses frequency bits without `G_GENO`.
- `js/monster_data.js:153` through `:156` and `:239` through `:249`: local generated monster metadata includes those same rows as common random monsters, so JS previously treated them as genocide-eligible.

## JS Changes

- `js/cmd.js:31009`
  - Expanded the source-backed forbidden genocide name set to include generated common elementals and golems whose C rows lack `G_GENO`.
- `js/cmd.js:31520`
  - Class genocide still refuses all-immune classes before consuming the scroll.
- `js/cmd.js:31525`
  - Mixed class genocide now iterates original class order, wiping eligible members and printing C-style permission messages for immune members instead of silently filtering them out.

## Tests

- `test/shop-billing-helpers.test.mjs:13715`
  - Added normal genocide canaries for `air elemental` and `stone golem`, requiring the divine refusal and an open retry prompt.
- `test/shop-billing-helpers.test.mjs:13747`
  - Added a blessed `E` class canary requiring `stalker` to be wiped while all four elemental rows are skipped with per-member permission messages.
- `test/shop-billing-helpers.test.mjs:13766`
  - Added a blessed golem-class canary for glyph `'`, requiring the all-immune class refusal and leaving every golem unmarked.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide refuses C non-G_GENO (ki-rin|elemental|golem)|blessed genocide (refuses C non-G_GENO angel class|skips C non-G_GENO elemental class members|refuses C non-G_GENO golem class)|genocide catalogs special C normal-genocide monsters" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The generated monster metadata still conflates low C frequency bits with `G_GENO` eligibility. A separate generated eligibility map would remove the need for a narrow source-backed forbidden set.
- Other generated common rows also lack C `G_GENO`, including titan, lycanthropes, generated common demons, and salamander. Those remain separate parity slices.
