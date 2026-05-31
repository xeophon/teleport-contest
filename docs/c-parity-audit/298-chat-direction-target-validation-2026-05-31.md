# C Parity Audit 298: Chat Direction Target Validation

## Sources

- `nethack-c/upstream/src/sounds.c:1297-1329`: after `getdir()`, `dochat()` handles downward steed chat, other vertical directions, self-direction, and out-of-bounds target squares before looking at map contents.
- `nethack-c/upstream/src/sounds.c:1331-1341`: when there is no monster or the monster is `mundetected`, a visible top object that is a `STATUE` says it seems not to notice the hero; blind heroes get no statue message, and hallucinating heroes see a random monster name instead of `statue`.
- `nethack-c/upstream/src/sounds.c:1342-1370`: wall chat only applies to `IS_WALL(typ)` or `SDOOR`, excludes `STONE`, is skipped while deaf, requires mapped wall memory while blind, and uses the weighted hallucinated wall-talk table under hallucination.
- `nethack-c/upstream/src/sounds.c:1374-1377`: no monster, `mundetected` monsters, `M_AP_FURNITURE`, and `M_AP_OBJECT` all return silently before monster speech or wait-strategy clearing.
- `nethack-c/upstream/src/sounds.c:1379-1406`: only accepted real monster targets continue to helpless/eating/deaf/domonoise handling, including the existing invisible-monster mapping branches.

## JS Changes

- Added C-shaped helpers for directed `#chat` no-target clearing, wall qualification, top visible statue detection, blind mapped-wall memory, hallucinated statue naming, and hallucinated wall-talk text.
- Reordered the `chatDirection` target path so no monster or `mundetected` monster checks floor statue and wall/secret-door responses before falling through to a silent no-target return.
- Made object and furniture mimics return silently without clearing their wait strategy or producing monster speech, matching the C `M_AP_TYPE()` gate.
- Changed wall fallback from broad `IS_OBSTRUCTED()` handling to the C `IS_WALL() || SDOOR` rule, leaving solid stone, passable empty squares, deaf wall targets, and unmapped blind wall targets silent.
- Kept real invisible monsters on the accepted target path so existing domonnoise/eating branches still map invisible markers.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat at empty passable square is silent without time`
- `chat at visible floor statue reports C no-notice response`
- `hallucinating chat at floor statue uses random monster no-notice response`
- `blind chat at floor statue is silent`
- `chat at object mimic is silent and leaves wait strategy intact`
- `chat at furniture mimic is silent and leaves wait strategy intact`
- `chat at wall uses C wall response while stone remains silent`
- `hallucinating chat at wall uses C wall-talk table`
- `blind chat at wall requires mapped wall memory`
- `deaf chat at wall is silent`

## Remaining Gaps

- The hallucinating statue branch uses the local random monster data path as an approximation of C `rndmonnam()`, so exact random-name details may still differ.
- Top floor object selection follows the local `topFloorObjectAt()` stack convention as an approximation of C `vobj_at()`.
- The accepted monster path still inherits the broader `domonnoise()` approximation gaps tracked by earlier chat audits.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "chat at empty passable square|chat at visible floor statue|hallucinating chat at floor statue|blind chat at floor statue|chat at object mimic|chat at furniture mimic|chat at wall uses C wall response|hallucinating chat at wall|blind chat at wall|deaf chat at wall|chat with invisible peaceful snake|chat with invisible tame eating pet" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`
