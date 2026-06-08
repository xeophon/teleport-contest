# C Parity Audit 832: Cursed Confused Genocide Summons Role Monsters

Confirmed and guarded the confused-scroll ordering for cursed scrolls of genocide. C computes the genocide mode as `(!scursed) | (2 * !!Confusion)`, so a cursed confused scroll passes `PLAYER` without `REALLY`. That selects the hero's non-polymorphed role monster, but the actual species genocide and hero death are gated by `REALLY`; cursed confused therefore falls through to the cursed monster creation branch.

The existing JS runtime behavior already matched this branch. This slice adds a tighter canary so future work does not "fix" cursed confused scrolls into the uncursed confused self-genocide path.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads a cursed scroll of genocide in a synthetic non-shop floor state while confused and wearing life saving.

## Source Anchors

- `nethack-c/upstream/src/read.c:1734` through `:1737`: non-blessed scrolls call `do_genocide((!scursed) | (2 * !!Confusion))`.
- `nethack-c/upstream/src/read.c:2826` through `:2830`: `REALLY` is bit 1 and `PLAYER` is bit 2; cursed confused therefore becomes mode `2`.
- `nethack-c/upstream/src/read.c:2838` through `:2842`: `PLAYER` mode chooses the hero's non-polymorphed monster and sets `killplayer`.
- `nethack-c/upstream/src/read.c:2955` through `:2995`: species genocide, the wipeout message, and hero death occur only under `REALLY`; cursed confused skips this block.
- `nethack-c/upstream/src/read.c:2995` through `:3015`: mode `2` reaches the cursed branch, attempts `rn1(3, 4)` monster creation, and prints `Sent in ...` or `Nothing happens.`
- `nethack-c/upstream/src/u_init.c:991`: `u.umonster` starts as the role monster number, so cursed confused creation uses role monsters.

## JS Status

- `js/cmd.js:63274`
  - The confused non-blessed genocide branch resolves the hero genocide target.
  - Cursed scrolls call `createCursedGenocideMonsters(...)`; uncursed confused scrolls still call `genocideMonsterType(..., { killPlayer: true, cause: 'genocidal confusion' })`.
  - No runtime JS change was needed for this audit point.

## Tests

- `test/shop-billing-helpers.test.mjs:13383`
  - Strengthened the cursed confused canary to wear a life-saving amulet and require role-monster summoning, no prompt, no wipeout, no death, no `But wait...`, no amulet consumption, and no `_genocided_monsters` entry.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-name-pattern "self-genocide consumes|confused genocide consumes|cursed confused genocide" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The normal confused-scroll path still depends on JS's compact monster catalog resolver rather than C's full `mons[]` identity table.
