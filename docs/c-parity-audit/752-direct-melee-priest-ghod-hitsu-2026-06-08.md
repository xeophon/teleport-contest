# 752 - Direct melee priest ghod_hitsu tail

## Implemented Slice

Direct hero melee kills against priests now model the C `hmon()` wrapper-tail retaliation gate: after the lethal hit has gone through kill cleanup and live XP, but before town-watch anger, the priest can trigger shrine retaliation on the C `!rn2(2)` roll.

The implemented helper covers the source-visible gate and low-blast side effects for currently modeled state:

- target must still be a priest object;
- the hero must occupy the priest's temple room;
- the priest must have a valid shrine altar with matching alignment;
- the shrine must already be lined up with the hero for the lightning origin;
- one of the three deity messages is selected by `rn2(3)`;
- Wisdom is exercised negatively after the retaliation;
- the lightning origin/direction is recorded for the later shared `buzz()` ray implementation.

C anchors:

- Direct hero melee calls `hmon(..., HMON_MELEE, dieroll)` only after a hit: `nethack-c/upstream/src/uhitm.c:609`, `nethack-c/upstream/src/uhitm.c:622`.
- `hmon()` resolves `hmon_hitmon()` first, then calls `ghod_hitsu(mon)` for priests on `!rn2(2)`, then runs guard anger: `nethack-c/upstream/src/uhitm.c:828`, `nethack-c/upstream/src/uhitm.c:829`, `nethack-c/upstream/src/uhitm.c:831`.
- Fatal melee damage calls `killed(mon)` from inside `hmon_hitmon()`, so priest kill side effects happen before returning to the wrapper tail: `nethack-c/upstream/src/uhitm.c:1908`, `nethack-c/upstream/src/mon.c:3470`, `nethack-c/upstream/src/mon.c:3696`.
- `ghod_hitsu()` returns unless the hero is in a temple and the priest has a valid shrine, lines up a lightning origin, selects one of three deity messages, fires monster-spell lightning, and exercises Wisdom negatively: `nethack-c/upstream/src/priest.c:802`, `nethack-c/upstream/src/priest.c:804`, `nethack-c/upstream/src/priest.c:811`, `nethack-c/upstream/src/priest.c:846`, `nethack-c/upstream/src/priest.c:850`, `nethack-c/upstream/src/priest.c:870`, `nethack-c/upstream/src/priest.c:873`.

JS changes:

- Added direct-melee shrine, deity, line-alignment, and priest-retaliation helpers beside the existing direct-melee town-watch anger helpers.
- Hooked the lethal direct-melee priest wrapper roll after live XP and before town-watch anger.
- Kept the helper source-gated and non-fixture-specific; tests build synthetic temple state and fixed RNG values rather than replay maps or seed checks.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a lethal direct melee hit against a peaceful temple priest can trigger the wrapper-tail `ghod_hitsu()` message, records the shrine-to-hero lightning vector, exercises Wisdom negatively, and removes the killed priest;
- the same lethal temple-priest kill respects the C `rn2(2)` wrapper gate and emits no divine retaliation when the roll fails;
- a temple priest on a plain aligned altar without the shrine bit does not trigger the wrapper-tail retaliation.

## Deferred Gaps

- Full `buzz()` lightning physics remain a shared ray-work follow-up: reflection, collision, range RNG, flash blindness, shock resistance, inventory destruction, terrain, and monster interception are not modeled by this narrow helper.
- Surviving peaceful priest hits still need the C `wakeup(mon, TRUE)` path: make the priest angry, run the unconditional temple `ghod_hitsu()`, then allow the wrapper `!rn2(2)` second retaliation.
- Priest-specific `xkilled()` alignment/protection cleanup from `mon.c` remains separate from this `hmon()` wrapper-tail slice.
- The C room-edge fallback for non-lined-up shrine lightning origins is deferred until room geometry and ray traversal are centralized.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal tame target records pet kill side effects|direct hero melee lethal same-aligned unicorn applies C guilt luck|direct hero melee lethal peaceful watchman angers surviving watch|direct hero melee lethal peaceful shopkeeper angers town watch by snapshot|direct hero melee lethal temple priest can trigger ghod_hitsu tail|direct hero melee lethal temple priest respects ghod_hitsu wrapper roll|direct hero melee lethal temple priest requires shrine altar for ghod_hitsu tail|direct hero melee life saving keeps monster alive and skips kill cleanup|direct hero melee revived vampshifter survives lethal hit and suppresses kill cleanup" test/shop-billing-helpers.test.mjs` - 7 pass, 2694 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs` - 2863 pass
- `npm run score` - 44/44 passing
