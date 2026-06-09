# Fatal Lava Book Glow

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6881` through `nethack-c/upstream/src/trap.c:6883` sets fatal-lava survival for life saving, explore/discover, and wizard mode.
- `nethack-c/upstream/src/trap.c:6892` through `nethack-c/upstream/src/trap.c:6919` walks carried inventory in order during fatal-lava cleanup. The Book of the Dead is checked before `obj->in_use` destruction, so it survives and can print feedback even though it was not selected for burning.
- `nethack-c/upstream/src/trap.c:6897` through `nethack-c/upstream/src/trap.c:6900` prints the Book message only when fatal lava will be survived and the hero is not blind. The normal message uses `dark red`; `hcolor("dark red")` can vary under hallucination.
- `nethack-c/upstream/src/trap.c:6933` through `nethack-c/upstream/src/trap.c:6936` prints the fatal burn line after inventory cleanup and then lets life saving or wizard/explore refusal continue.

## JS Parity Slice

- Added a shared `LAVA_BOOK_OF_THE_DEAD_GLOW_MESSAGE` constant for the existing generic fire-inventory Book feedback and the fatal carried-lava path.
- Changed `destroyLavaFatalInventorySelection()` to iterate a snapshot of carried inventory rather than only the selected burn list.
- During fatal carried-lava cleanup, a non-blind surviving hero now gets `The Book of the Dead glows a strange dark red, but remains intact.` before the burn-to-a-crisp line.
- Blind surviving fatal lava still suppresses the Book glow and keeps the blind medallion wording.
- Ordinary fatal lava without life saving, explore, or wizard survival still does not print the Book glow.

## Tests

- `m-prefix fatal lava preserves invocation objects without obj_resists rng` now asserts ordinary fatal death does not print the Book glow.
- `m-prefix fatal lava life saving shows Book of the Dead glow before burning`
- `blind m-prefix fatal lava life saving suppresses Book of the Dead glow`
- `explore m-prefix fatal lava reports survivor inventory burn before prompt` now asserts non-amulet survivor Book feedback before the burn summary and burn line.

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "m-prefix fatal lava preserves invocation objects without obj_resists rng|m-prefix fatal lava life saving shows Book of the Dead glow before burning|blind m-prefix fatal lava life saving suppresses Book of the Dead glow|explore m-prefix fatal lava reports survivor inventory burn before prompt|m-prefix fatal lava consumes life saving and teleports to safety" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "lava|LAVA" test/shop-billing-helpers.test.mjs
git diff --check
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused fatal-lava Book set passed; broader lava-name slice passed; `git diff --check` passed; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Direct fatal lava rescue still lacks C's suppressed landing `spoteffects(TRUE)` followed by manual `spoteffects(FALSE)` detail.
- Potion vapor effects still happen before the destruction message in the JS generic helper.
