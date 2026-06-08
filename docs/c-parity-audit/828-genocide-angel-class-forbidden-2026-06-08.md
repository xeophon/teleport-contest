# C Parity Audit 828: Genocide Angel Class Forbidden

Closed a blessed class-genocide eligibility gap for the angel class. In C, class genocide counts only `G_GENO` members as wipeable; all ordinary `S_ANGEL` rows visible to this JS catalog lack `G_GENO`, so attempting to genocide class `A` is refused with `You aren't permitted to genocide such monsters.` and the prompt retries. JS previously treated generated angel rows as ordinary class members and wiped out `couatl`, `Aleax`, `Angel`, `ki-rin`, and `Archon`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads a blessed scroll of genocide in synthetic non-shop floor state and targets the source-backed class symbol directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2685` through `:2688`: C resolves class genocide input through `name_to_monclass()` or a known monster's class.
- `nethack-c/upstream/src/read.c:2689` through `:2697`: C separates class members into immune, already-gone, and good counts, with `goodcnt` requiring `G_GENO`.
- `nethack-c/upstream/src/read.c:2699` through `:2704`: if a class has no good members and has immune members, C prints `You aren't permitted to genocide such monsters.` and retries.
- `nethack-c/upstream/include/monsters.h:1206` through `:1260`: `couatl`, `Aleax`, `Angel`, `ki-rin`, and `Archon` are `S_ANGEL` rows without `G_GENO`.
- `js/monster_data.js:120` through `:124`: local generated monster metadata includes the same `A` rows, so JS class genocide previously saw them as wipeable catalog members.

## JS Changes

- `js/cmd.js:31009`
  - Expanded the narrow forbidden normal/class genocide set to cover all cataloged non-`G_GENO` angel-class names.
- `js/cmd.js:31514`
  - Class genocide now builds an eligible member list excluding forbidden names before wiping anything.
- `js/cmd.js:31515`
  - If a class has catalog members but none are eligible, JS now retries with C's `You aren't permitted to genocide such monsters.` message.

## Tests

- `test/shop-billing-helpers.test.mjs:13698`
  - Added a blessed scroll-of-genocide canary for class `A`, requiring the all-immune class refusal, keeping the prompt in `genocideText`, and leaving every angel-class name unmarked.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "blessed genocide refuses C non-G_GENO angel class|genocide refuses C non-G_GENO ki-rin|genocide catalogs special C normal-genocide monsters|genocide keeps C as-is plural monster names|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- The generated monster metadata still conflates low C frequency bits with `G_GENO` eligibility; this audit keeps the current narrow forbidden set rather than reworking the generator.
