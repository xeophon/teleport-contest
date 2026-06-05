# C Parity Audit 492: Upward Polyself Falling-Object HP

Added C-backed handling and canaries for upward falling-object damage while the hero is polymorphed. In C, `losehp()` subtracts monster-form HP (`u.mh`) when `Upolyd`; if that drops below 1, ordinary cases rehumanize instead of recording the falling-object killer. If `Unchanging` blocks that reversion, C kills the hero as stuck in creature form.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used. The canaries use ordinary test RNG control and underwater flags only in tests.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1589`: upward hero throws route to `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1420` through `:1423`: the object lands via `hitfloor(obj, TRUE)` before `losehp(dmg, "falling object", KILLED_BY_AN)`.
- `nethack-c/upstream/src/hack.c:4267` through `:4276`: `losehp()` subtracts `u.mh` while polymorphed, calls `rehumanize()` when monster HP reaches zero, and returns before installing a killer.
- `nethack-c/upstream/src/hack.c:4279` through `:4284`: only the non-polymorphed branch records the falling-object killer and prints `You die...`.
- `nethack-c/upstream/src/polyself.c:1371` through `:1378`: `Unchanging` plus depleted monster HP kills as `killed while stuck in creature form` and does not rehumanize.
- `nethack-c/upstream/src/polyself.c:1393` through `:1400`: ordinary rehumanization prints `You return to <race> form!`; the unhealthy old-form death remains a broader rehumanization completeness edge.

## JS Changes

- `js/cmd.js`
  - Added `heroTossUpActiveHp()` so hard-helmet self-hit wording can compare against active monster-form HP when C-style `mh/mhmax` state is present, while preserving the existing JS `uhp`-as-form-HP model.
  - Extended `applyHeroThrownCorpseFallingDamage()` to drain active polyself HP first, then either rehumanize without setting `_death_cause` or, when `Unchanging`, set `killed while stuck in creature form` and mark the message fatal.
  - Renamed `rehumanizeAfterRoyalJelly()` to `rehumanizeAfterPolyselfDeath()` and reused it for royal jelly and blessed-water lycanthropy reversion.

## Tests

- `upward hero-thrown tin opener fatal polyself self-hit rehumanizes after landing`
  - Pins the ordinary JS polyself model: 1 form HP is depleted by a fixed 1-damage tin opener self-hit, the opener lands first, the hero returns to base form, no falling-object killer is recorded, and base HP/energy/AC/rank are restored.
- `upward hero-thrown heavy container kills unchanging polyself as stuck in creature form`
  - Pins the C-style `mh/mhmax` path: a hard-helmet-capped heavy sack still does not protect at `mh=1`, lands before death, and records `killed while stuck in creature form` rather than `killed by a falling object`.
- Existing `cursed royal jelly rehumanizes a fatally damaged polyself` and blessed-water lycanthropy reversion tests continue to cover the shared rehumanization helper.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown tin opener fatal polyself|upward hero-thrown heavy container kills unchanging polyself" test/shop-billing-helpers.test.mjs` - pass, 2 matching tests
- `node --test --test-name-pattern "cursed royal jelly rehumanizes" test/shop-billing-helpers.test.mjs` - pass, 1 matching test
- `node --test --test-name-pattern "blessed water vapor reverts matching were-beast" test/shop-billing-helpers.test.mjs` - pass, 1 matching test
- `node --test --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass, 115 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1799 tests
- `node --test` - pass, 1950 tests
- `npm run score` - pass, 44/44 public sessions

## Remaining

- The C branch where rehumanization exposes an old form with `u.uhp < 1` is covered by audit 493.
- Broader `rehumanize()` fallout such as equipment retouching, bare-handed petrification checks, and shifted-vampire form routing remains outside this narrow falling-object slice.
