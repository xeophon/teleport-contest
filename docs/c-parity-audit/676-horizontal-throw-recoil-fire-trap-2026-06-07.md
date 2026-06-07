# 676 - Horizontal Throw Recoil Fire Trap

## C Source

- `nethack-c/upstream/src/dothrow.c:937-965` handles traps after each successful recoil `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:953-954` calls `dotrap(ttmp, NO_TRAP_FLAGS)` for `FIRE_TRAP` during recoil.
- `nethack-c/upstream/src/trap.c:3026-3034` still applies the normal in-air floor-trigger skip inside `dotrap()`: levitating or flying heroes pass over seen fire traps and silently skip hidden ones.
- `nethack-c/upstream/src/trap.c:1730-1738` routes hero fire traps through `seetrap(trap)` and `dofiretrap(NULL)`.
- `nethack-c/upstream/src/trap.c:4233-4308` prints the tower-of-flame message, applies fire damage and max-HP loss, burns inventory/floor objects, and marks fatal fire damage as a tower-of-flame death.

## Port Notes

- `heroHorizontalThrowRecoil()` now has a structured result so trap effects can preserve message text, `More`, and fatal/lifesaving metadata while existing callers can still use the string wrapper.
- Recoiling over a fire trap now routes through the existing movement fire trap result, which mirrors C's `dotrap()` prechecks before reaching the shared fire-trap helper.
- Levitating recoil silently skips hidden fire traps and does not reveal them; seen fire traps report the normal in-air pass-over message from the movement precheck.
- Air-level recoil without levitation/flying still triggers hidden fire traps, reveals them through the shared fire-trap helper, and appends the tower-of-flame message after `You float/hurtle in the opposite direction.`
- Generic `You pass right over ...` text still excludes fire traps, because C delegates that trap type to `dotrap()`.

## Tests

- `levitating hero-thrown ordinary weapon recoil skips hidden fire trap`
- `air-level hero-thrown ordinary weapon recoil triggers hidden fire trap`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown ordinary weapon recoil passes over seen anti-magic field|levitating hero-thrown ordinary weapon recoil vibrates hidden vibrating square|levitating hero-thrown ordinary weapon recoil skips hidden fire trap|air-level hero-thrown ordinary weapon recoil triggers hidden fire trap" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- No remaining special `hurtle_step()` recoil trap effects are currently tracked in this micro-area.
- The direct fire-trap branch reuses the current JS fire-trap helper; finer C gaps inside that helper, if any, remain outside this recoil-specific slice.
