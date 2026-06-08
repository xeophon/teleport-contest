# C Parity Audit 808: Vampire-Shifter Genocide Reverts

Closed the vampire-shifter polyself ordering gap left by audit 807. JS now treats a shifted vampire hero like C during named and class genocide: named genocide tries to revert the hero before the target species is marked extinct, while class genocide tries the revert only after each species has already been wiped out.

## Source Anchors

- `nethack-c/upstream/src/read.c:1722` and `:1734`: genocide scroll dispatch sends blessed scrolls to class genocide and other non-cursed scrolls to named genocide.
- `nethack-c/upstream/src/read.c:2897`: named genocide calls `polymon(mndx, POLY_REVERT)` before marking the named species when a shifted vampire hero matches either the visible shifted form or stored vampire base.
- `nethack-c/upstream/src/read.c:2685` through `:2724`: class genocide maps the input to a monster class and loops over every genocidable member.
- `nethack-c/upstream/src/read.c:2748` through `:2770`: class genocide marks each species, kills existing monsters, prints the wipeout, then attempts vampire-shifter reversion.
- `nethack-c/upstream/src/polyself.c:500` and `:743`: `POLY_REVERT` routes through `polymon()` and refuses a target form that is already genocided, producing the "rather X-ish" feedback.
- `nethack-c/upstream/src/polyself.c:232` and `:2265`: rehumanization remains the path that resolves a genocided current polyself form or delayed base-role/race genocide.

## JS Changes

- `js/cmd.js`
  - Added helpers to recognize a hero polyself form that is a shifted vampire and normalize its stored vampire base.
  - Named genocide now attempts the vampire-shifter reversion before `markMonsterGenocided()`.
  - Class genocide now passes a `classMode` flag so the same reversion is attempted after the wipeout and cleanup for each class member.
  - If class genocide has already marked the vampire base extinct, the reversion fails with `You feel rather vampire-ish.` and the hero remains in the shifted form.

## Tests

- `genociding visible shifted vampire form reverts before named wipeout`
- `genociding shifted vampire base reverts before named wipeout then rehumanizes`
- `class-genociding shifted vampire visible class reverts after wipeout`
- `class-genociding shifted vampire base fails post-wipeout revert`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "polymorphed self-genocide|genociding current polyself|shifted vampire.*genocid|genociding shifted vampire|class-genociding shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Confused cursed genocide likely still diverges: C self-genocides under confusion even for cursed scrolls, while JS currently summons cursed genocide monsters first.
- Genocide cleanup for existing shifted monsters is still simplified; C can force a shapechanger into another form when only its current form is genocided, while JS generally deletes matching current/base names.
- Broader terminal genocide endgame disclosure remains shared with JS's generic death UI.
- Exhaustive class-genocide immunity/non-genocidable messaging remains separate from this vampire-shifter ordering slice.
