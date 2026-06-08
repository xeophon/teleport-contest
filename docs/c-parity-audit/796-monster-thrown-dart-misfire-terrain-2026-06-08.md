# C Parity Audit 796: Monster-Thrown Dart Misfire Terrain

Closed the next production dart follow-up after audit 795: cursed or greased monster-thrown darts now use C's thrown-object slip gate after singleton extraction and before ordinary flight. Redirected slips cover zero-vector launcher-square drops, visible sink feedback, ordinary wall stops, forced iron-bars `Clonk!` stops, and redirected intervening-monster hits without adding replay-map or seed-specific production logic.

## Source Anchors

- `nethack-c/upstream/src/weapon.c:498`, `:627`, and `:661`: hand-thrown darts are selected as ranged weapons with `gp.propellor = &hands_obj` and the `DART` ranged-weapon entry.
- `nethack-c/upstream/include/objects.h:159` and `nethack-c/upstream/include/obj.h:238` through `:245`: darts are `-P_DART` missiles, not launcher ammo, so they use the non-ammo slip wording.
- `nethack-c/upstream/src/mthrowu.c:274` through `:300`: visible monster throw wording is emitted before each dart reaches `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:615`: `m_throw()` extracts or splits a singleton object before the slip gate.
- `nethack-c/upstream/src/mthrowu.c:622` through `:633`: cursed or greased non-zero-vector throws have a `!rn2(7)` slip chance, visible non-ammo objects use "slips as ... throws it!" wording, redirected `dx/dy` come from `rn2(3) - 1`, and zero-vector slips drop at the launch square.
- `nethack-c/upstream/src/mthrowu.c:552` through `:567`, `:798` through `:814`, and `:1517`: redirected flight keeps the original range, checks ordinary blocking terrain, visible sinks, and forced iron-bars stops; darts normally pass through bars unless the caller's force-hit roll stops them.
- `nethack-c/upstream/src/mthrowu.c:679` through `:687`: intervening monsters and hero-square delivery are checked before post-step terrain; final-square monster misses drop there through `ohitmon()` rather than continuing into the ordinary force-hit roll.
- `nethack-c/upstream/src/mthrowu.c:162` through `:170` and `nethack-c/upstream/src/dothrow.c:1976`: `drop_throw()` only applies missile mulch behavior when `ohit` is true; zero-vector, wall, sink, and terrain stops use `ohit=0`.

## JS Changes

- `js/allmain.js`
  - Added a local dart `finishDartThrowAction()` so normal and misfire paths share the existing search/run/travel cleanup and visible-throw More resume behavior.
  - Added the C `cursed || greased` `!rn2(7)` slip gate after the production dart singleton split/extract and before ordinary flight.
  - Added visible non-ammo slip wording, redirected `rn2(3) - 1` vectors, zero-vector thrower-square landing, redirected sink/wall/iron-bars stops, and redirected intervening-monster hit reuse.
  - Reused the normal dart intervening-hit body through `finishDartInterveningHit()` so redirected slips and ordinary dart hits share damage, poison/silver feedback, passive-object landing, and mulch behavior.
- `test/shop-billing-helpers.test.mjs`
  - Extended `runMonsterDartHitLanding()` with the existing test-only `coreRngValues` hook for deterministic source-shaped misfire canaries.
  - Added production canaries for cursed zero-vector dart slips, greased redirected sink drops, greased redirected wall stops, and greased redirected forced iron-bars `Clonk!` stops.

## Tests

- `production visible kobold cursed dart zero-vector slip lands at thrower`
- `production visible kobold greased dart redirected slip drops onto visible sink`
- `production visible kobold greased dart redirected slip stops before ordinary wall`
- `production visible kobold greased dart redirected slip can clonk iron bars`
- Existing production kobold dart hit, catch, stack split, intervening passive, and aimed iron-bars canaries.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The ordinary non-misfire production dart path still lacks broader C terrain-stop fidelity for sinks and ordinary walls outside redirected slips.
- Production dart delivery still lacks full `thitu()` AC/range/bigmon/`Maybe_Half_Phys()` details, additional poison side effects, and broader passive-object variants.
