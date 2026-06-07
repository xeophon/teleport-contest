# 677 - Horizontal Throw Recoil Magic Portal

## C Source

- `nethack-c/upstream/src/dothrow.c:944-947` handles magic portals after a successful recoil `hurtle_step()` move.
- `nethack-c/upstream/src/dothrow.c:947` calls `dotrap(ttmp, NO_TRAP_FLAGS)` and immediately returns `FALSE`, stopping further recoil steps.
- `nethack-c/upstream/src/trap.c:1061-1087` excludes `MAGIC_PORTAL` from floor-trigger checks, so levitation/flying does not skip it.
- `nethack-c/upstream/src/trap.c:2710-2732` reveals the portal with `feeltrap()` and routes to `domagicportal()`.
- `nethack-c/upstream/src/teleport.c:1463-1485` prints `You activated a magic portal!`, stuns the hero briefly, and schedules portal arrival with the dizzy pre-message.

## Port Notes

- `heroHorizontalThrowRecoilTrapEffectAt()` now routes `MAGIC_PORTAL` through `movementTransportTrapResult()`, sharing ordinary movement and attached-ball fallback portal behavior.
- Portal recoil now marks the portal seen, applies stun, schedules deferred portal arrival, preserves `More`, and stops the recoil loop on the portal square.
- The generic `You pass right over ...` recoil text still excludes magic portals because C dispatches the real trap effect instead.

## Tests

- `levitating hero-thrown loose heavy iron ball recoil activates hidden magic portal and stops`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown ordinary weapon recoil passes over seen anti-magic field|levitating hero-thrown ordinary weapon recoil vibrates hidden vibrating square|levitating hero-thrown ordinary weapon recoil skips hidden fire trap|air-level hero-thrown ordinary weapon recoil triggers hidden fire trap|levitating hero-thrown loose heavy iron ball recoil activates hidden magic portal and stops|levitating hero-thrown loose heavy iron ball uses C ball range divisor" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- No remaining special `hurtle_step()` recoil trap effects are currently tracked in this micro-area.
