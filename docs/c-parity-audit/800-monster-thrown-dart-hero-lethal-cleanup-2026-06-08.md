# C Parity Audit 800: Monster-Thrown Dart Hero Lethal Cleanup

Closed the next production dart hero-delivery follow-up after audit 799. Ordinary physical monster-thrown dart hits that kill the hero now use the projectile-specific death cause, skip normal `drop_throw()`/mulch before death, and salvage the thrown dart through the death cleanup path. Visible hits remain staged behind the visible throw/hit topline, while unseen hits convert the current hit `--More--` directly into the death prompt.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:702`: C snapshots `oldumort = u.umortality` before hero-square object handling.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: ordinary monster-thrown object hero hits compute `dmgval()`, floor damage to at least 1, apply `Maybe_Half_Phys()`, and call `thitu(hitv, dam, &singleobj, NULL)`.
- `nethack-c/upstream/src/mthrowu.c:75` through `:151`: `thitu()` formats hit text with `mshot_xname()`, builds the killer string with `killer_xname()`, and calls `losehp(dam, knm, KILLED_BY)`.
- `nethack-c/upstream/src/hack.c:4256`: `losehp()` sets the killer, prints `You die...`, and calls `done(DIED)` when HP drops below 1.
- `nethack-c/upstream/src/end.c:1070` through `:1081`: `done()` increments `u.umortality`; with no lifesaving it does not return to the later poison/drop logic.
- `nethack-c/upstream/src/mthrowu.c:745` through `:753`: poison is after `thitu()`, and its fatal gate is `(u.umortality > oldumort) ? 0 : 10`, so final non-lifesaved physical death skips poison continuation.
- `nethack-c/upstream/src/mthrowu.c:787`: normal `drop_throw(singleobj, hitu, u.ux, u.uy)` only happens if execution returns after the hero-hit tail.
- `nethack-c/upstream/src/objnam.c:1942`: `killer_xname()` strips poisoned-object death wording and gives ordinary darts a killer phrase of `a dart`.
- `nethack-c/upstream/src/end.c:881`: `done_object_cleanup()` salvages `gt.thrownobj` for bones when final death occurs before `drop_throw()`.

## JS Changes

- `js/allmain.js`
  - Detects physical lethal monster-thrown dart hero hits immediately after C-shaped `thitu()` hit resolution.
  - Stores the thrown dart in the existing lethal projectile cleanup payload with `deathCause: killed by a dart`.
  - Skips `finishMonsterThrownHeroLanding()` for physical lethal hits so the dart is not normally dropped, passively processed, or mulched before death.
  - Preserves the unseen-hit more prompt so hidden lethal darts do not bypass the visible `You are hit.` message.
- `js/cmd.js`
  - Extracted lethal projectile promotion into `promoteLethalProjectileAfterMore()`.
  - Promotes non-topline lethal projectile payloads before the deferred-attack resolver, letting an unseen hit `--More--` become the death prompt on that same dismissal.
  - Keeps the existing visible-topline behavior, where the first more promotes the lethal payload and the next more resolves death.

## Tests

- `production visible lethal kobold dart uses projectile death cleanup without drop-throw`
- `production unseen lethal kobold dart uses deferred death cleanup after hit more`
- Existing production kobold dart hit, poison, catch, miss, terrain, `thitu()`, and intervening canaries.

## Verification

- `node --check js/cmd.js` - pass
- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "production visible lethal kobold dart|production unseen lethal kobold dart" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Lifesaving continuation for lethal physical dart hits is still broader hero-death work: C returns from `done()`, then the poison fatal gate observes `u.umortality > oldumort`, poison becomes nonfatal, and later `drop_throw()` can still run.
- Poisoned lethal dart plus lifesaving/resistance variants need a separate source-backed slice to avoid overfitting the final-death path.
- The shared `_lethal_arrow_after_topline_more` field name still reflects its launcher-arrow origin; renaming it to a generic projectile name should be a mechanical cleanup only after more projectile users are audited.
- Hard-wall ordinary dart stops remain limited by the production dart `clearShot` selection gate from audit 797.
