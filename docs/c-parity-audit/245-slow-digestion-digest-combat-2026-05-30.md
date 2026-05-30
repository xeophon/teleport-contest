# C Parity Audit 245: Slow Digestion Digest Combat

## Sources

- `nethack-c/upstream/src/mhitu.c:1419-1425`: monster `AD_DGST` attacks set `u.uswldtim = 0` and `tmp = 0` when `Slow_digestion` is active.
- `nethack-c/upstream/src/mhitu.c:1426-1433`: ordinary digestion prints the progressive `digests you`, `thoroughly digests you`, `utterly digests you`, and fatal `totally digests you` messages when slow digestion is not active.
- `nethack-c/upstream/src/mhitu.c:1573-1582`: a digesting monster regurgitates the hero when the swallowed timer reaches zero, and slow digestion adds `Obviously <monster> doesn't like your taste.`
- `nethack-c/upstream/src/uhitm.c:5047-5051`: hero polyself digestion sets `dam = 0` and breaks out when `Slow_digestion` is active.
- `nethack-c/upstream/src/uhitm.c:5185-5191`: the slow-digestion polyself digest path regurgitates the live monster and prints `Obviously, you didn't like <monster>'s taste.`

## JS Changes

- Marked monster engulf attacks as digesting only when `aatyp=engl` and `adtyp=dgst`, with normalized C-style attack codes.
- Added slow-digestion handling for initial monster swallow completion and already-swallowed digest ticks: the hero is regurgitated, `uswallow`/`ustuck` are cleared immediately, the monster survives, and the C negative-AC one-damage quirk is preserved.
- Factored swallowed-expel cleanup into `finishSwallowExpel()` so direct slow-digestion regurgitation and deferred ordinary expulsion share the same state reset.
- Added a narrow polyself digest path for slow-digestion purple-worm-style forms: the hero swallows and regurgitates the target without killing it, gaining nutrition, or changing food conduct.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Purple worm `AD_DGST` regurgitates a hero with slow digestion from white dragon scale mail.
- The same monster digest path regurgitates a hero wearing a ring of slow digestion.
- An already-swallowed slow-digestion hero is regurgitated on a digest tick.
- Non-digest engulfers do not trigger the slow-digestion taste/regurgitation branch.
- A slow-digestion purple worm polyself regurgitates a live swallowed monster without nutrition or food-conduct changes.

## Remaining Gaps

- Full non-slow hero polyself digest timing and nutrition remains incomplete beyond the guarded slow-digestion branch.
- Broader monster engulf attacks still need additional `AD_*` parity coverage outside the digest-specific paths.
- The full C `expels()` placement/redraw matrix remains broader than the currently modeled shared cleanup helper.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "monster digest attack|already swallowed|slow digestion does not reject|polyself purple worm" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1171/1171` tests passed)
- `node --test test/*.mjs` (`1268/1268` tests passed)
- `npm run score` (`44/44` replay sessions passed)
