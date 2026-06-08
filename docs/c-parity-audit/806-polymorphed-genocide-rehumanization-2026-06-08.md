# C Parity Audit 806: Polymorphed Genocide Rehumanization

Closed the polyself lifecycle gap left by audit 805. JS now distinguishes base self-genocide while polymorphed from current-form genocide: base race/role genocide delays death until rehumanization, while genociding only the current monster form forces rehumanization immediately.

## Source Anchors

- `nethack-c/upstream/src/read.c:2968` through `:2988`: single-type self-genocide stores the scroll/confusion killer and, when `Upolyd && ptr != gy.youmonst.data`, delays death with `delayed_killer(POLYMORPH, ...)` plus `You feel ... inside.`
- `nethack-c/upstream/src/read.c:2990` through `:2991`: genociding the current polymorphed form rehumanizes the hero when it is not also self-genocide.
- `nethack-c/upstream/src/read.c:2738` through `:2822`: blessed class genocide marks matching current forms for rehumanization and matching base role/race for delayed self-genocide while polymorphed.
- `nethack-c/upstream/src/polyself.c:233` through `:246`: `polyman()` checks `ugenocided()` immediately after the return-form message, restores delayed killer metadata when present, and calls `done(GENOCIDED)` before ordinary old-form HP death.
- `nethack-c/upstream/src/polyself.c:1367` through `:1400`: `rehumanize()` calls `polyman("You return to %s form!", ...)` before the unhealthy-old-form death branch.
- `nethack-c/upstream/src/polyself.c:2265` through `:2288`: `ugenocided()` tests role/race genocide and `udeadinside()` selects `dead`, `condemned`, or `empty` from the current monster form.

## JS Changes

- `js/cmd.js`
  - Added delayed polyself genocide state with the source-shaped inside-feeling message and killer cause preservation.
  - Named and class genocide now delay base self-genocide while the hero is polymorphed instead of killing immediately.
  - `rehumanizeAfterPolyselfDeath()` now checks pending/base genocide after the return-form message and before the unhealthy-old-form branch.
  - Current-form genocide now calls the existing rehumanization path rather than leaving `_polyself_form` intact.
  - Polymorph, debug polyself, trap, and upward falling-object handoffs now propagate an already-armed genocide death prompt without re-running ordinary life-saving or falling-object death logic.

## Tests

- `polymorphed self-genocide waits until rehumanization`
- `genociding current polyself form rehumanizes instead of ignoring form`
- Existing audit 805 self-genocide, confused-genocide, and explore-decline canaries remain active.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter dot --test-name-pattern "polymorphed self-genocide|genociding current polyself|self-genocide consumes|confused genocide consumes|explore self-genocide" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Restore-time feedback for a saved polymorphed hero who is already self-genocided still lacks the C `You're back, but you still feel ... inside.` presentation.
- Broader terminal genocide endgame disclosure remains shared with JS's generic death UI.
- Vampire-shifter-specific genocide reversion and exhaustive class-genocide ordering remain separate polyself/class-genocide slices.
