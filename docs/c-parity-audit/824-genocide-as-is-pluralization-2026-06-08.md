# C Parity Audit 824: Genocide As-Is Pluralization

Closed a family of normal genocide monster-name pluralization gaps. C's `makeplural()` consults `as_is[]` before suffix/default rules, so names like `manes`, `tengu`, `Uruk-hai`, `Olog-hai`, and `Nazgul` remain unchanged in `Wiped out all ...` messages. JS previously fell through to default plural forms such as `maneses`, `tengus`, `Uruk-hais`, `Olog-hais`, and `Nazguls`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads ordinary scrolls of genocide in synthetic non-shop floor state and targets current catalog monster names directly.

## Source Anchors

- `nethack-c/upstream/src/objnam.c:2689` through `:2698`: C's `as_is[]` table includes the unchanged plural names and suffixes used here: `fish`, `-hai`, `manes`, `tengu`, `ki-rin`, `Nazgul`, and `piranha`.
- `nethack-c/upstream/src/objnam.c:2718`: `singplur_lookup()` applies `as_is[]` as a suffix match, so `fish` and `-hai` cover full names like `jellyfish`, `Uruk-hai`, and `Olog-hai`.
- `nethack-c/upstream/src/objnam.c:2912`: `makeplural()` applies `singplur_lookup()` before generic suffix/default pluralization.
- `nethack-c/upstream/src/read.c:2936` through `:2966`: normal genocide sets `which = "all "` and prints the selected monster through `makeplural()` for the `Wiped out all ...` form.
- `nethack-c/upstream/include/monsters.h:544`: `manes` is normal-genocidable.
- `nethack-c/upstream/include/monsters.h:581`: `tengu` is normal-genocidable.
- `nethack-c/upstream/include/monsters.h:770`: `Uruk-hai` is normal-genocidable.
- `nethack-c/upstream/include/monsters.h:2258`: `Olog-hai` is normal-genocidable.
- `nethack-c/upstream/include/monsters.h:2345`: `Nazgul` is normal-genocidable.
- `nethack-c/upstream/include/monsters.h:1244` through `:1245`: `ki-rin` is an as-is `makeplural()` name but is not normal-genocidable in C.
- `nethack-c/upstream/include/monsters.h:3205` and `:3213`: `jellyfish` and `piranha` are C normal-genocidable as-is names.
- `js/monster_data.js:51`, `:56`, `:76`, `:216`, and `:222`: local generated monster metadata includes the tested as-is names in the genocide catalog source.
- `js/mklev.js:878`, `:881`, `:5962`, and `:5965`: local JS has special data/lookup for `piranha` and `jellyfish`, but those rows are not currently part of the JS genocide catalog.

## JS Changes

- `js/cmd.js:31001`
  - Added compact C `as_is[]` name and suffix mirrors for monster plural output.
- `js/cmd.js:31004`
  - Added `isCAsIsMonsterPlural()` so suffix-aware as-is matching stays explicit.
- `js/cmd.js:31033`
  - `pluralizeMonsterName()` now returns exact as-is names and C as-is suffixes before suffix/default pluralization.

## Tests

- `test/shop-billing-helpers.test.mjs:13580`
  - Added a normal scroll-of-genocide table canary for current catalog as-is names, requiring unchanged `Wiped out all ...` forms and rejecting the previous JS fallback plurals.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide pluralizes homunculus|genocide pluralizes baluchitherium|genocide pluralizes violet fungus|genocide pluralizes mumak|genocide pluralizes lurker above|genocide keeps C as-is plural monster names|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- `watchman -> watchmen` remains a reachable normal-genocide follow-up from C's `man/men` rule.
- `ki-rin` is still present in the JS genocide catalog even though C rejects normal ki-rin genocide because it lacks `G_GENO`; this is a separate eligibility gap.
- `jellyfish` and `piranha` are source-backed C as-is normal-genocide cases, but the current JS genocide catalog does not include those rows.
