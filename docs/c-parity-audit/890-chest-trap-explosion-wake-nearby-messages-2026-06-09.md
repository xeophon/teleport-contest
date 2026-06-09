# 890 - Chest trap explosion wake_nearby visible messages

## C source

- `nethack-c/upstream/src/trap.c:6310` prints `You set it off!` when failed `#untrap` disarming triggers a box trap.
- `nethack-c/upstream/src/trap.c:6364` prints `The <box> explodes!` for explosive chest-trap payloads.
- `nethack-c/upstream/src/trap.c:6397` calls `wake_nearby(FALSE)` after deleting the exploded box and affected floor objects, but before `losehp(Maybe_Half_Phys(d(6,6)))` at `:6398` and before the shop-loss message at `:6400` through `:6408`.
- `nethack-c/upstream/src/mon.c:4367` routes `wake_nearby(FALSE)` to `wake_nearto_core(u.ux, u.uy, u.ulevel * 20, FALSE)`.
- `nethack-c/upstream/src/mon.c:4378` emits `wake_msg(mtmp, FALSE)` for visible sleeping monsters before clearing `msleeping`; `:4385` clears non-unique wait strategy and `:4398` disturbs buried zombies.

## Port

- `js/cmd.js` now routes `wakeNearbyMonstersFromChestTrapExplosion()` through `wakeNearbyMonstersAt(game.u.ux, game.u.uy, game.u.ulevel * 20, messages)`.
- `applyChestTrapExplosionPayload()` passes its local message array into the wake helper, preserving the C order: trigger text, explosion text, visible sleeper wake text, then HP damage/death and surviving shop-loss text.
- The helper remains hero-centered for chest traps, matching C `wake_nearby(FALSE)` rather than shared C `explode()`'s explosion-centered `wake_nearto(x, y, ...)` path.
- The shared wake helper now honors both top-level `mon.unique` and `mon.data.unique` when preserving wait strategy, matching the old chest-specific loop and nearby local wakeup conventions.

## Tests

- `#untrap known-box explosion destroys box and floor objects` now covers a visible nearby sleeper wake message after `The large box explodes!`, while retaining the far-sleeper outside-radius canary.
- `#untrap known-box fatal explosion enters death more` now verifies the visible wake message precedes `You die...` and that the sleeper's sleep/wait state is cleared.
- `#untrap known-box explosion charges shop loss after surviving blast` now verifies the visible wake message precedes `You owe ... zorkmids for objects destroyed.`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "#untrap known-box explosion destroys box and floor objects|#untrap known-box fatal explosion enters death more|#untrap known-box explosion charges shop loss after surviving blast" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining nearby gaps

- `wakeNearbyMonstersAt()` still uses the existing JS direct-melee visible predicate for wake text. If the port later grows a shared `canseemon()` equivalent, these generic visible wake messages should be moved to it.
- This slice does not add C's `petcall` handling for `wake_nearby(TRUE)`; chest-trap explosions use `FALSE`.
