# Book Glow Hcolor

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/do_name.c:1441` through `nethack-c/upstream/src/do_name.c:1457` defines the hallucinated color table used by `hcolor()`.
- `nethack-c/upstream/src/do_name.c:1460` through `nethack-c/upstream/src/do_name.c:1465` returns `colorpref` normally, but under `Hallucination` or a null preference returns `hcolors[rn2_on_display_rng(SIZE(hcolors))]`.
- `nethack-c/upstream/src/rnd.c:66` through `nethack-c/upstream/src/rnd.c:74` keeps `rn2_on_display_rng()` on the display RNG, separate from core gameplay RNG.
- `nethack-c/upstream/src/zap.c:5829` through `nethack-c/upstream/src/zap.c:5834` uses `hcolor("dark red")` for the Book of the Dead carried-inventory fire glow, guarded by hero blindness for carried inventory.
- `nethack-c/upstream/src/trap.c:6897` through `nethack-c/upstream/src/trap.c:6900` uses the same `hcolor("dark red")` Book glow when fatal lava inventory cleanup will be survived and the hero is not blind.

## JS Parity Slice

- Added the C hallucinated color table and a local `hcolor(colorpref)` helper using `rn2_on_display_rng()`.
- Routed generic carried fire inventory, visible monster fire inventory, and fatal lava survivor Book-of-the-Dead glow messages through `hcolor("dark red")`.
- Preserved the existing blind guards, so blind hero Book glow paths still suppress the message and consume no display RNG.

## Tests

- `hallucinating inventory fire Book glow uses hcolor display rng`
- `hallucinating fatal lava Book glow uses hcolor display rng`

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "Book of the Dead branch|hallucinating inventory fire Book glow|Book of the Dead before glow|fatal lava life saving shows Book|blind m-prefix fatal lava life saving suppresses Book|hallucinating fatal lava Book glow|explore m-prefix fatal lava reports survivor inventory burn" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "fireDamageInventory|inventory fire|Book of the Dead|fatal lava|lava survivor|fire inventory|hallucinating.*Book glow" test/shop-billing-helpers.test.mjs
git diff --check
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused Book hcolor tests passed; broader fire/lava/Book pattern passed; `git diff --check` passed; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Direct fatal lava rescue still lacks C's repeated `safe_teleds()` failure countermeasures and manual landing `spoteffects(FALSE)` detail.
