# C Parity Audit 827: Genocide Ki-rin Forbidden

Closed a normal genocide eligibility gap for `ki-rin`. C knows the monster name but its row omits `G_GENO`, so attempting normal genocide of `ki-rin` is refused by the divine voice and the prompt remains active. JS previously cataloged `ki-rin` from generated random-monster metadata and would wipe it out with `Wiped out all ki-rin.`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads an ordinary scroll of genocide in synthetic non-shop floor state and targets the source-backed monster name directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:1244` through `:1245`: `ki-rin` has `(G_NOHELL | G_NOCORPSE | 1)` and lacks `G_GENO`.
- `nethack-c/upstream/src/read.c:2890` through `:2896`: normal genocide resolves known names through `name_to_mon()` before eligibility checks.
- `nethack-c/upstream/src/read.c:2913` through `:2927`: C refuses known monsters without `G_GENO`, printing the thunderous voice and `No, mortal!  That will not be done.` before retrying.
- `js/monster_data.js:123`: local generated random-monster data includes `ki-rin`, so JS previously treated it as a normal genocide target.
- `docs/c-parity-audit/824-genocide-as-is-pluralization-2026-06-08.md`: the as-is pluralization audit noted `ki-rin` as a pending normal-genocide eligibility gap.

## JS Changes

- `js/cmd.js:31009`
  - Added `ki-rin` to a narrow known-but-forbidden normal genocide set.
- `js/cmd.js:31103`
  - Added `isMonsterForbiddenForGenocideName()` to keep the check normalized.
- `js/cmd.js:31540`
  - Normal genocide now refuses forbidden known monsters with the C-style divine message instead of wiping them out.

## Tests

- `test/shop-billing-helpers.test.mjs:13682`
  - Added a normal scroll-of-genocide canary for `ki-rin` requiring the thunderous-voice refusal, keeping the prompt in `genocideText`, and leaving `_genocided_monsters` unchanged.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide refuses C non-G_GENO ki-rin|genocide catalogs special C normal-genocide monsters|genocide keeps C as-is plural monster names|genocide pluralizes watchman|genocide accepts C watchmen plural alias|genocide catalogs C watch captain|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- The generated monster metadata still conflates low C frequency bits with normal-genocide eligibility; this audit uses a narrow forbidden set rather than reworking the generator.
- Class genocide still needs to filter non-`G_GENO` class members; C refuses the all-non-genocidable `A` class with `You aren't permitted to genocide such monsters.`
