# C Parity Audit 799: Monster-Thrown Dart Hero Poison

Closed the next production dart hero-delivery follow-up after audit 798. Successful poisoned monster-thrown dart hits now use poisoned object naming, queue thrown-weapon poison effects after the physical hit, keep poison effects before hit landing and mulch, suppress the redundant "was poisoned" line, skip poison on catch/miss, and preserve `opoisoned` when the dart survives.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:687` through `:742`: hero-square delivery checks catch before ordinary dart damage and `thitu()` hit resolution.
- `nethack-c/upstream/src/mthrowu.c:745` through `:753`: after a successful `thitu()` hit, C calls `poisoned(xname(singleobj), A_STR, killer_xname(singleobj), fatal, TRUE)` for `opoisoned && is_poisonable` objects.
- `nethack-c/upstream/src/mthrowu.c:786` through `:789`: hit landing and dart mulch happen after the poison/blind/egg tails.
- `nethack-c/upstream/src/mthrowu.c:75` through `:151`: `thitu()` formats the visible hit object with `mshot_xname()`, so poisoned darts appear as `a poisoned dart`, then applies physical damage and Strength exercise.
- `nethack-c/upstream/src/objnam.c:685` and `:1969`: `xname()` prefixes poisoned poisonable weapons, while `killer_xname()` clears `opoisoned` to avoid redundant poison death wording.
- `nethack-c/upstream/src/attrib.c:317` through `:405`: `poisoned()` suppresses the "was poisoned" line when the reason already contains `poison`, skips poison RNG for poison resistance, uses thrown-weapon `rn2(30)`, applies `d(4,6)` severe poison, `rnd(6)` HP poison, or one-point Strength loss, and records poison deaths.

## JS Changes

- `js/allmain.js`
  - Reused existing poison-aware projectile naming for monster-thrown dart hero hit, clear-miss, and near-miss text.
  - Queued `_poisoned_projectile_after_topline_more` only after successful poisoned dart hero hits, with `reason` retaining `poisoned dart` and the killer name stripped to `a dart`.
  - Deferred poisoned dart hero-hit landing even when the thrower is unseen, keeping poison before `drop_throw()`/mulch.
  - Left caught and missed poisoned darts on the no-poison path and preserved surviving `opoisoned` state.

## Tests

- `production visible poisoned kobold dart hit respects poison resistance`
- `production visible poisoned kobold dart hit applies thrown-weapon poison before landing`
- `production visible poisoned kobold dart miss skips poison effects`
- `production visible poisoned kobold dart catch skips poison effects`
- Existing production kobold dart hit, catch, miss, terrain, `thitu()`, and intervening-poison canaries.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Physical-damage lethal cleanup, lifesaving handoff, and the C `oldumort` poison fatality gate are still broader hero-damage/death work.
- Launcher-arrow hero poison currently shares the older deferred ordering in which poison RNG precedes deferred Strength exercise; broader projectile poison ordering should be handled as a separate source-backed slice.
- Hard-wall ordinary dart stops remain limited by the production dart `clearShot` selection gate from audit 797.
