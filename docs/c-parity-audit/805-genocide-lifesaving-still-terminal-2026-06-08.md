# C Parity Audit 805: Genocide Lifesaving Remains Terminal

Closed the `GENOCIDED` life-saving gap left by audit 804. JS now consumes a worn amulet of life saving for hero self-genocide, applies the Constitution loss and temporary HP restoration, prints the C "still genocided" follow-up, and still routes into terminal death instead of `lifeSavingMore`. Wizard/explore death-decline can still save the hero from genocide and clears the abandoned death state.

## Source Anchors

- `nethack-c/upstream/src/read.c:2968` through `:2988`: deliberate, throne, or confused self-genocide sets a caller-specific killer and calls `done(GENOCIDED)`.
- `nethack-c/upstream/src/end.c:1061` through `:1079`: `done(GENOCIDED)` preserves caller killer metadata when present, increments mortality, and forces HP to zero before survival handling.
- `nethack-c/upstream/src/end.c:1081` through `:1096`: life saving runs for `how <= GENOCIDED`, consumes the amulet, applies Constitution loss, calls `savelife()`, and then prints `Unfortunately you are still genocided...`.
- `nethack-c/upstream/src/end.c:1095` through `:1102`: `GENOCIDED` deliberately does not set `survive = TRUE`, so amulet life saving alone remains terminal.
- `nethack-c/upstream/src/end.c:1105` through `:1122`: wizard/explore "Die?" decline still applies to `GENOCIDED`, calls `savelife()`, sets `survive = TRUE`, clears killer metadata, and returns.
- `nethack-c/upstream/src/end.c:1201`: bones are only allowed for `how < GENOCIDED`.

## JS Changes

- `js/cmd.js`
  - `finishHeroGenocide()` now marks genocide deaths as no-bones terminal deaths and arms the normal death prompt.
  - Hero self-genocide now consumes a worn life-saving amulet, applies the shared Constitution-loss helper, restores HP using the C `50 + 10 * CON/2` shape, and appends `Unfortunately you are still genocided...` without entering `lifeSavingMore`.
  - Confused genocide now uses the same terminal genocide-death arming after its direct scroll branch.
  - Explore mode now shares the wizard `Die?` decline branch.
  - Wizard/explore decline uses the same `savelife()` HP cap helper and clears transient no-bones, bones-preparation, and pending-genocide-death state when the hero survives.
  - Generic `lifeSavingMore` dismissal reuses the shared Constitution-loss helper added for this slice.

## Tests

- `self-genocide consumes life saving but still dies`
- `confused genocide consumes life saving but still dies from genocidal confusion`
- `explore self-genocide death decline survives and clears death state`
- `explore self-genocide life saving decline uses savelife hp cap`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "self-genocide|confused genocide|explore self-genocide|life saving|lifesaving|life-saving|wizard or explore" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The broader terminal genocide endgame presentation still shares JS's generic death disclosure UI; this audit only covers the life-saving and wizard/explore survival rules.
- Polymorphed delayed self-genocide (`ugenocided()` after rehumanization) remains a separate `polyself()` lifecycle slice.
