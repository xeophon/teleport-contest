# Kicked object mid-flight web

Date: 2026-06-08.

## C anchors

- `nethack-c/upstream/src/dokick.c:521` handles the separate source-square web/pit refusal before kicked-object flight.
- `nethack-c/upstream/src/dokick.c:733` extracts movable kicked objects and launches them through `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/zap.c:3846` starts `KICKED_WEAPON` flight on the source object square and decrements range before the loop advances.
- `nethack-c/upstream/src/zap.c:3926` checks later-square web traps only when there is no monster and uses `!rn2(3)` for the stuck chance.
- `nethack-c/upstream/src/zap.c:3931` reports `<object> gets stuck in a web!`, sets `tseen`, and redraws when the web square is visible.
- `nethack-c/upstream/src/zap.c:4076` backs up before blocked terrain, unlike the web branch, so a stuck object lands on the web square.
- `nethack-c/upstream/src/dokick.c:771` lands surviving kicked objects at `gb.bhitpos` through floor effects, placement, stacking, and redraw.

## JS update

- `js/cmd.js` now checks for web traps on later squares during same-level kicked-object flight.
- A web consumes `rn2(3)`; on zero, the object stops and lands on the web square.
- If the web square is visible, the command appends `A dagger gets stuck in a web!`, marks the trap seen, and redraws it.
- If the web roll fails, or if the stopped web is unseen, JS follows C by leaving `tseen` alone and keeping feedback silent beyond the base `You kick ...` message.
- `test/shop-billing-helpers.test.mjs` adds command-level canaries for visible stuck webs, failed web rolls, and unseen silent web catches.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stuck in visible web mid-flight|passes web when stuck roll fails|stuck in unseen web silently" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "command kick ordinary floor object|command kicked ordinary floor object|command kicked shop-floor ordinary object|command kicked fragile|same-level floor object stacks|Mjollnir floor object" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44 passing`)
