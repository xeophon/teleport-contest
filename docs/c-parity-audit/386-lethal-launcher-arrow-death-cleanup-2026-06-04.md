# Lethal Launcher Arrow Death Cleanup

Date: 2026-06-04

## Summary

Monster-fired launcher arrows that hit the hero lethally now keep the thrown arrow available for death/bones cleanup as a real floor object instead of leaving only the transient in-flight marker. The lethal path still does not call the normal `drop_throw()` landing helper, so hit-only mulch, blessed survival, and deletion-resistance RNG are not consumed before death.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:608` through `:616`: `m_throw()` extracts the fired object and stores it in `gt.thrownobj` while it is in free/in-flight state.
- `nethack-c/upstream/src/mthrowu.c:742`: hero hits call `thitu(...)`.
- `nethack-c/upstream/src/mthrowu.c:150`: `thitu()` applies damage with `losehp(...)` before returning.
- `nethack-c/upstream/src/hack.c:4283` through `:4288`: lethal `losehp()` calls `done(DIED)`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:789`: ordinary hit landing calls `drop_throw(singleobj, hitu, u.ux, u.uy)` only after `thitu()` returns.
- `nethack-c/upstream/src/mthrowu.c:170` through `:178`: `drop_throw()` is where hit-only missile mulch and deletion happen.
- `nethack-c/upstream/src/end.c:855` through `:883`: `done_object_cleanup()` places `gt.thrownobj` on the map for bones, bypassing floor effects and `drop_throw()` details.
- `nethack-c/upstream/src/end.c:1154` through `:1157` and `:1363` through `:1365`: death cleanup runs before bones are saved.

## JS changes

- `js/allmain.js`
  - Carries the fired arrow object on the deferred lethal launcher-arrow record.
- `js/cmd.js`
  - Adds a death-cleanup placement helper for deferred lethal thrown objects.
  - Uses the hero's current `dx`/`dy` plus fallback-to-hero-square rule from `done_object_cleanup()`.
  - Materializes the in-flight transient projectile as a non-transient floor object before `prepareDeathBones()`.
  - Intentionally bypasses `landMonsterThrownObject()` so lethal death does not run `drop_throw()` mulch, floor effects, or deletion-resistance RNG.
- `js/save.js`
  - Counts materialized death-cleanup thrown objects in restore identity accounting, matching the extra `next_ident()` draw the saved bones object receives without keeping it transient.
- `test/shop-billing-helpers.test.mjs`
  - Adds a production launcher-arrow lethal hit regression covering deferred death, object persistence, transient cleanup, and absence of `rn2(3)`/`rn2(100)` drop-throw RNG.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check js/save.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` (38 pass, 1502 skipped)
- `node --test test/shop-billing-helpers.test.mjs` (1540 pass)
- `node --test test/*.mjs` (1683 pass)
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` (RNG 105529/105529, Screen 1953/1953)
- `npm run score` (44/44 passing)

## Remaining gaps

- Iron-bars, sink, and broader `MT_FLIGHTCHECK` obstacle flight remain separate.
- Stacked blessed enchanted launcher-arrow landing remains separate.
- Life-saving after a lethal launcher-arrow hit remains a separate message/RNG-order slice because upstream can resume and then reach `drop_throw()`.
