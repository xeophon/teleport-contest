# Hero Dart Trap Thitu Feedback

## Scope

Align hero-facing dart trap hit and miss wording with C `thitu()` feedback. This follows audits 528 and 529: generated dart damage, poison ordering, death routing, and life saving were already ported, but blind and non-verbose feedback still always named the dart.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:1271` prints `A little dart shoots out at you!` before the generated dart is sent through `thitu()`.
- `nethack-c/upstream/src/trap.c:1278` calls `thitu(7, Maybe_Half_Phys(dam), &otmp, "little dart")` for the unmounted hero path.
- `nethack-c/upstream/src/mthrowu.c:106` through `:115` emits `It misses.` for blind or non-verbose misses, otherwise choosing either `A little dart misses you.` or `You are almost hit by a little dart.` from the hit-roll margin.
- `nethack-c/upstream/src/mthrowu.c:118` through `:121` emits generic `You are hit.` / `You are hit!` for blind or non-verbose hits, otherwise `You are hit by a little dart.` / `!`.
- `nethack-c/upstream/src/zap.c:3547` defines `exclam(dam)`: damage greater than 4 uses `!`, otherwise `.`.

## JS Change

- `js/cmd.js` now routes hero dart-trap hit/miss text through a small `heroDartTrapThituMessage()` helper.
- Blind heroes and `flags.verbose=false` now receive C's generic `It misses.` and `You are hit.` feedback.
- Visible verbose far misses now use `A little dart misses you.`, preserving the existing almost-hit line for close misses.
- Visible and generic hit messages now use the C damage punctuation threshold without changing generated dart RNG, floor placement, poison, death, or life-saving control flow.

## Tests

- `hero dart trap verbose far miss names the little dart`
- `hero dart trap nonverbose far miss uses generic thitu feedback`
- `hero dart trap blind hit uses generic thitu feedback`

The existing hero dart-trap generated-dart, poison, and fatal/life-saving tests continue to cover RNG order and control flow.

## Remaining Work

Mounted hero dart traps remain a separate path. C rolls the steed interception branch before `thitu()`, so that should be handled as its own slice rather than folded into this wording-only pass.
