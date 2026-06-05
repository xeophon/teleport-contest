# Monster Thrown Silver Intervening Sear

Date: 2026-06-05

## Summary

Monster-thrown silver spear and silver dagger intervening hits now run the same silver-hater `dmgval()` bonus and searing feedback already covered for launcher arrows. After a confirmed intervening hit, silver thrown weapons add `rnd(20)` damage before reveal/wakeup and hit-message punctuation, then emit the visible or unseen searing message after the hit message and before hit-drop landing. The implementation is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: `m_throw()` walks flight squares, checks intervening monsters with `m_at()`, and calls `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382`: ordinary non-potion intervening hits call `dmgval(otmp, mtmp)` before mimic reveal and `mtmp->msleeping = 0`.
- `nethack-c/upstream/src/weapon.c:322` through `:332`: `dmgval()` adds the silver `rnd(20)` bonus for silver weapons when `mon_hates_silver()` is true.
- `nethack-c/upstream/src/mthrowu.c:418` through `:431`: after hit messaging and poison handling, silver material emits `The silver sears <monster>[’s flesh]!` for visible targets or generic `Its flesh is seared!`/`It is seared!` for unseen targets.
- `nethack-c/upstream/src/mondata.c:517` through `:528`: `mon_hates_silver()` covers vampshifters, werecreatures, vampires, demons, shades, and imp-class monsters except tengu.
- `nethack-c/upstream/src/weapon.c:498` through `:502`: monster ranged weapon preference includes `SILVER_SPEAR`, `SILVER_ARROW`, and `SILVER_DAGGER`; silver saber and silver mace are melee preferences, not `rwep[]` thrown preferences.
- `nethack-c/upstream/include/objects.h:186` and `:209`: silver spear and silver dagger object rows have silver material.

## JS Changes

- `js/allmain.js`
  - Generalizes projectile silver detection into `monsterThrownObjectIsSilver()` while preserving the existing launcher-arrow call site.
  - Adds a shared two-phase silver hit helper: roll the silver `rnd(20)` bonus before hit punctuation, then emit the C-shaped searing message after the hit message.
  - Wires the helper into the existing non-potion monster-thrown intervening-hit branches for spear, shuriken, plain/silver dagger, crude/orcish dagger, knife, and dart.
- `test/shop-billing-helpers.test.mjs`
  - Adds a table-driven silver thrown-weapon intervening-hit test for production silver spear and silver dagger paths against a visible vampire.
  - Asserts silver damage ordering, searing feedback, no hero damage, no iron-bars stop, hit-square landing, and monster inventory consumption.

## Tests

- `production monster thrown silver weapons sear silver-hating intervening monsters`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "thrown silver weapons sear|silver launcher arrow intervening hit" test/shop-billing-helpers.test.mjs` - 4 pass, 1685 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1689 pass
- `node --test test/*.mjs` - 1840 pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Blessed thrown-weapon bonus damage, poisoned thrown-weapon side effects, acid venom, eggs, blinding venom, and cream-pie post-hit effects remain separate `ohitmon()` slices.
- Full monster death cleanup for non-launcher thrown intervening hits remains narrower than `xkilled()`/`mondied()` and should stay source-backed.
- Unseen silver-searing wording for non-launcher thrown weapons remains covered by the shared helper shape but not by a dedicated non-launcher fixture row in this slice.
