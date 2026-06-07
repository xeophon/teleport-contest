# 659 - Attached Ball Fallback Teleport And Magic Traps

## C Source

- `nethack-c/upstream/src/dothrow.c:1823-1838` places a thrown iron ball, then calls `drop_ball()` when the thrown object is the punished ball.
- `nethack-c/upstream/src/ball.c:891-958` relocates the hero behind the thrown ball, moves the chain to the new hero square, then calls `spoteffects(TRUE)`.
- `nethack-c/upstream/src/hack.c:3375-3395` performs pickup before non-pit traps and then calls `dotrap()`.
- `nethack-c/upstream/src/trap.c:3009` forces fixed-destination teleport traps, bypassing the known-trap escape prelude.
- `nethack-c/upstream/src/trap.c:2070-2078` marks hero teleport traps seen before `tele_trap()`.
- `nethack-c/upstream/src/teleport.c:1491-1535` handles blocked, one-shot, fixed-destination, and ordinary same-level teleport traps.
- `nethack-c/upstream/src/trap.c:2292-2313` marks magic traps seen, then runs the explosion branch or `domagictrap()`.
- `nethack-c/upstream/src/trap.c:4317-4445` defines the non-explosion magic-trap fates.

## Port Notes

- Added a result-returning movement teleport trap helper for attached-ball fallback relocation.
- Fixed-destination `TELEP_TRAP` fallback now marks the trap seen, bypasses the known-trap escape roll, and applies same-level materialization on the relocated hero square.
- Added a movement magic-trap wrapper so fallback relocation can reuse the existing magic-trap effect and preserve `afterMore` top-line follow-up state.
- Attached-ball fallback teleport skips immediate full vision recalculation in the synchronous throw-finalization path; the helper still redraws the old and new hero/ball/chain squares.
- `trapResultHasEffect()` now accepts an explicit `effect` marker so message-less magic-trap fates still count as trap activation.

## Tests

- `attached ball fallback relocation triggers fixed teleport trap on new hero square`
- `attached ball fallback relocation triggers magic trap on new hero square`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball fallback relocation triggers fixed teleport|attached ball fallback relocation triggers magic trap|attached ball fallback relocation triggers level teleporter|attached ball fallback relocation activates magic portal|attached ball fallback relocation triggers anti-magic" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Statue-trap attached-ball fallback relocation is covered by audit 660.
- One-shot vault teleport trap fallback and ordinary random teleport-trap fallback still need narrower canaries beyond the fixed-destination branch.
- Magic-trap fate 20 still needs remove-curse/unpunish parity for punished heroes.
- Blind ball/chain glyph ordering after attached-ball relocation remains open.
