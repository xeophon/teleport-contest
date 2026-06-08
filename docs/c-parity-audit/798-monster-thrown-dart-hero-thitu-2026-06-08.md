# C Parity Audit 798: Monster-Thrown Dart Hero `thitu()`

Closed the next production dart hero-delivery follow-up after audit 797. Clean, non-misfired monster-thrown darts now use C-shaped `thitu()` hit/miss resolution for the hero, including armor class, range, big-polyself hit bonus, large-target dart damage dice, `Maybe_Half_Phys()` damage reduction, near-miss wording, and miss landing without hit-only mulch.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:265` and `:299`: `monshoot()` aims at the target square and passes `distmin()` range into `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:691` through `:718`: hero-square object handling checks gem/unicorn and generic catch before ordinary object damage or hit rolling.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: ordinary object hero delivery rolls `dmgval()`, computes `hitv = max(3 - distmin(hero, thrower), -4) + 8 + spe`, adds the big hero bonus, floors damage to at least 1, applies `Maybe_Half_Phys()`, and calls `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:106` through `:122`: `thitu()` misses when `u.uac + hitv <= rnd(20)` and uses distinct blind/non-verbose, clear-miss, near-miss, and hit messages.
- `nethack-c/upstream/include/objects.h:160`, `nethack-c/upstream/include/objclass.h:96`, and `nethack-c/upstream/src/weapon.c:225` through `:344`: darts have small-target `1d3`, large-target `1d2`, hit bonus 0, and `dmgval()` selects large-vs-small dice from `bigmonst(gy.youmonst.data)` before enchantment, erosion, and floor handling.
- `nethack-c/upstream/src/mthrowu.c:787` through `:815`: hero hits break immediately into `drop_throw(..., ohit=1)`, while hero misses consume the normal `rn2(5)` force-hit roll and then drop at range end with `ohit=0`.

## JS Changes

- `js/allmain.js`
  - Replaced natural-20-only dart hero misses with `uac + hitv <= rnd(20)` using C's range floor, enchantment, and big-polyself hit bonus.
  - Added C-shaped clear-miss and near-miss message routing while preserving deferred visible throw messaging.
  - Added dart damage dice selection for big polyself forms and shared `Maybe_Half_Phys()` handling for dart and rolling-boulder physical damage.
  - Kept catch before damage/hit rolls and kept miss landing as `ohit=false` with no hit-only `rn2(3)` mulch roll.

## Tests

- `production visible kobold dart armor-class miss is not limited to natural 20`
- `production visible kobold dart armor-class near miss uses almost-hit wording`
- `production visible kobold dart hero half physical damage applies after damage roll`
- `production visible kobold dart large polyself uses large target die and hit bonus`
- Existing production kobold dart hit, catch, misfire, stack split, terrain, and intervening passive canaries.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Poisoned monster-thrown dart hero-hit side effects still need a separate source-backed slice for `opoisoned` handling and `poisoned()`/blindness details after successful `thitu()` hits.
- Lethal dart hit cleanup, lifesaving propagation, and death-cause text are still limited to the current generic damage queue behavior.
- Hard-wall ordinary dart stops remain limited by the production dart `clearShot` selection gate from audit 797.
