# 641 - Underwater Horizontal Throw Range

## C Source

- `nethack-c/upstream/src/dothrow.c:1601-1604` sends hero-thrown boomerangs through `boomhit()` only when `!Underwater`. Underwater boomerangs therefore use the ordinary `bhit()` path.
- `nethack-c/upstream/src/dothrow.c:30-34` includes boomerangs in `AutoReturn()`, and `dothrow.c:1564-1566` records that returning missile before the horizontal-routing branch.
- `nethack-c/upstream/src/dothrow.c:1613-1648` computes ordinary throw range from launcher/ammo, strength, and object weight.
- `nethack-c/upstream/src/dothrow.c:1650-1658` applies air-level/levitation range reaction before later special range cases.
- `nethack-c/upstream/src/dothrow.c:1660-1672` applies boulder, Mjollnir, tethered aklys, and buried-ball range adjustments, then forces `range = 1` when `Underwater`.
- `nethack-c/upstream/src/dothrow.c:1674-1678` passes the final range to `bhit()`.
- `nethack-c/upstream/src/dothrow.c:1710-1763` still applies generic returning-missile behavior after `bhit()`: `rn2(100)` for the return attempt, then a second `rn2(100)` for a clean catch when unimpaired. A failed return falls through to ordinary landing.
- `nethack-c/upstream/src/dothrow.c:1794-1803` suppresses splash/plop landing sounds while underwater; ordinary hard-landing breaktest remains before that at `dothrow.c:1780-1789`.

## Port Notes

- C’s final underwater range cap is now mirrored in the JS horizontal throw loop by using `heroIsUnderwaterForThrow() ? 1 : ...` for direct throw range.
- Because `heroThrownBoomerangFlightResult()` already returns unhandled underwater, boomerangs now correctly skip curved `boomhit()` return/catch behavior and use one-square ordinary flight.
- Underwater boomerangs now enter the same generic returning-object branch as wielded aklys throws, matching C’s `AutoReturn()` behavior after ordinary `bhit()`.
- The range cap is applied before gold/projectile object construction uses the final `ox, oy`, so ordinary carried objects and gold share the same capped destination.

## Tests

- `underwater hero-thrown boomerang uses ordinary range one and generic auto-return`
- `underwater hero-thrown boomerang failed generic return lands at range-one square`
- `underwater hero-thrown ordinary weapon range is capped at one square`
- Focused verification: `node --test --test-name-pattern "underwater hero-thrown|boomerang" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Air-level and levitation recoil before/after horizontal throws (`dothrow.c:1602-1603`, `dothrow.c:1680-1682`).
- Underwater landing sound suppression for pool/lava destinations if JS emits those messages in a future covered path.
- More precise strength/weight-derived horizontal throw ranges outside the currently modeled fixed direct-throw distance.
