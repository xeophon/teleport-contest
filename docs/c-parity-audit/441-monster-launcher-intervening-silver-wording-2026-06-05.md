# Monster Launcher Intervening Silver Wording

Date: 2026-06-05

## Summary

Monster-fired silver launcher arrows that hit an intervening silver-hating monster now use the C-shaped `ohitmon()` flesh predicate for silver searing wording. The branch treats monsters as flesh-bearing unless their monster type is noncorporeal (`S_GHOST`) or amorphous. Focused coverage now pins visible non-flesh shade wording, unseen flesh wording, and unseen non-flesh wording without replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:418` through `:429`: `ohitmon()` prints silver searing feedback after poison side effects and uses `!noncorporeal(mtmp->data) && !amorphous(mtmp->data)` to decide whether to append flesh wording.
- `nethack-c/upstream/include/mondata.h:30` through `:31`: `amorphous()` checks `M1_AMORPHOUS`; `noncorporeal()` checks `mlet == S_GHOST`.
- `nethack-c/upstream/src/mondata.c:517` through `:527`: `mon_hates_silver()` covers vampshifters, werecreatures, vampires, demons, shade, and imp-class monsters except tengu.
- `nethack-c/upstream/src/uhitm.c:1992` through `:2008`: silver-aware thrown objects can affect shades rather than passing harmlessly through them.
- `nethack-c/upstream/src/mthrowu.c:680` through `:686`: `m_throw()` only skips `ohitmon()` when `shade_miss()` says the projectile passes harmlessly through the intervening shade.

## JS Changes

- `js/allmain.js`
  - Narrows `monsterSilverSearsFlesh()` to the C predicate shape: local noncorporeal or ghost-mlet metadata and amorphous metadata suppress flesh wording.
  - Keeps the local `shade` fallback because local fixtures and generated monster data can identify shades by name while C identifies the same monster through `S_GHOST`.
- `test/shop-billing-helpers.test.mjs`
  - Adds visible shade coverage for `The silver sears the shade!` without `shade's flesh`.
  - Adds unseen vampire coverage for `Its flesh is seared!` without leaking the monster name.
  - Adds unseen shade coverage for `It is seared!` without flesh wording or monster-name leakage.

## Tests

- `production monster silver launcher arrow intervening hit uses non-flesh shade searing`
- `production monster silver launcher arrow unseen intervening hit uses generic flesh searing`
- `production monster silver launcher arrow unseen intervening hit uses generic non-flesh searing`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "silver launcher arrow intervening hit|silver launcher arrow unseen intervening hit" test/shop-billing-helpers.test.mjs` - 5 pass
- `node --test --test-name-pattern "launcher arrow.*intervening|poisoned launcher arrow intervening|silver launcher arrow intervening|silver launcher arrow unseen intervening" test/shop-billing-helpers.test.mjs` - 9 pass
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1676 pass
- `node --test test/*.test.mjs` - 1827 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Intervening monster hits still use the current minimal monster-damage branch and do not perform full `xkilled()`/`mondied()` cleanup.
- Intervening monster blinding, egg, acid-venom, mimic-reveal, and broader passive side effects remain separate source-backed slices.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
- Broader silver-weapon coverage outside launcher-arrow intervening hits remains separate from this slice.
