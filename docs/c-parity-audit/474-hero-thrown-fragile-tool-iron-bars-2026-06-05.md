# C Parity Audit 474: Hero-Thrown Fragile Tool Iron Bars

Implemented a focused direct hero-thrown `IRONBARS` impact branch for fragile class-hit tools. The slice covers visible crystal ball and mirror breakage against bars without relying on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/zap.c:3839` through `:3852`: `bhit()` tracks `point_blank` and starts thrown objects from the hero square.
- `nethack-c/upstream/src/zap.c:3900` through `:3912`: thrown and kicked objects reaching `IRONBARS` call `hits_bars()` with the previous square as the impact coordinate, consume the non-point-blank `!rn2(5)` force-hit expression, and rewind `bhitpos` before stopping.
- `nethack-c/upstream/src/zap.c:4121` through `:4122`: `point_blank` becomes false after the first traveled square, so bars two or more squares away consume the force-hit roll.
- `nethack-c/upstream/src/mthrowu.c:1417` through `:1433`: `hit_bars()` calls `hero_breaks()` for hero-caused impacts and suppresses bar sounds when breakage succeeds.
- `nethack-c/upstream/src/mthrowu.c:1499` through `:1530`: `hits_bars()` makes most `TOOL_CLASS` objects hit bars; mirrors and crystal balls are not in the excluded small-tool list.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2493` through `:2495`: mirror breakage caused by the hero applies `change_luck(-2)`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: `breaktest()` consumes the object-resistance roll and breaks ordinary non-artifact glass tools.
- `nethack-c/upstream/src/dothrow.c:2626` through `:2638`: mirror and crystal ball visible break messages use `into a thousand pieces`.

## JS Changes

- `js/cmd.js`
  - Records direct hero-thrown `IRONBARS` impacts separately from generic obstructions during the throw scan.
  - Adds a narrow class-hit fragile helper for mirror, crystal ball, expensive camera, and glass/crystal wands; lenses remain excluded from this deterministic class-hit slice.
  - Preserves the C RNG order for bars beyond point blank: `rn2(5)` before the `rn2(100)` breaktest.
  - Reuses existing top-level projectile break messages and fragile side effects, including mirror bad luck.
  - Allows camera demon release helpers to receive an explicit impact coordinate for future floor/bars breakage slices while preserving existing upward-throw behavior by default.

## Tests

- `hero-thrown crystal ball shatters against iron bars before landing`
  - Throws a crystal ball east at bars on `(7,5)`.
  - Asserts `A crystal ball shatters into a thousand pieces!`, no `Clonk!`, no floor landing, no fall-through message, and no surviving object.
  - Asserts the RNG label sequence is exactly `rn2(5)`, then `rn2(100)`.
- `hero-thrown mirror shatters against iron bars and gives bad luck`
  - Throws a looking glass east at bars on `(7,5)`.
  - Asserts the C break message, object removal, no landing/sound message, `uluck == -2`, and the same RNG label sequence.

## Verification

- `git diff --check` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "hero-thrown (crystal ball|mirror) shatters against iron bars" test/shop-billing-helpers.test.mjs` - pass, 2 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1758/1758
- `node --test` - pass, 1909/1909
- `node --test test/*.mjs` - pass, 1909/1909
- `npm run score` - pass, 44/44

## Remaining

- The 1% break-resistance continuation is only partially modeled for the newly handled class-hit fragile branch; broader pass-through and force-hit behavior for small tools, potions, food, armor, and other object classes remains a separate `hits_bars()` slice.
- Kicked camera demon release, kicked potion breathing, kicked eggs, and shop-owned floor-object break billing remain separate from this direct hero-thrown bars branch.
- Full monster-thrown fragile-object `hits_bars()` behavior remains separate from this hero-thrown branch.
