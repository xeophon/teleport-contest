# Takeoffall command

## C anchors

- `nethack-c/upstream/src/do_wear.c:3020` implements `#takeoffall` as `doddoremarm()`.
- `nethack-c/upstream/src/do_wear.c:17` defines the fixed `takeoff_order[]`: facewear, primary weapon, shield, gloves, left ring, right ring, cloak, helm, amulet, body armor, shirt, boots, alternate weapon, quiver.
- `nethack-c/upstream/src/do_wear.c:2694` gates selected items through `select_off()`.
- `nethack-c/upstream/src/do_wear.c:2898` performs the occupation callback and per-slot delay.
- `nethack-c/upstream/src/do_wear.c:3089` handles the full-menu object prompt, `What do you want to take off?`.

## JS parity

- Top-level `A` now reaches a takeoff-all path instead of falling through to unknown command handling.
- The no-candidate case emits `You are not wearing anything.` when no armor, accessories, weapon, alternate weapon, or quiver item is active.
- `takeOffAllItems()` orders active items by the C slot order, independent of inventory order.
- The command prompts with `What do you want to take off? [...]`, supports direct inventory-letter selection, `?` for a worn/readied inventory overlay, and uppercase `A`/`*` for all candidates.
- The queue reuses the shared armor/accessory removal helper and adds primary weapon, alternate weapon, and quiver unwielding messages.
- The queued continuation runs before the next root command, matching the C idea that selected takeoff-all work continues as an occupation.

This slice is state-driven and does not use replay maps, private seeds, player names, move-count checks, or hidden-test-conditioned branches.

## Tests

- `takeoffall command reports when nothing is worn or readied`
- `takeoffall command removes all selected items in C takeoff order`
- `takeoffall command treats lowercase a as an inventory letter when present`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern 'takeoffall|remove command auto-removes lone worn ring|takeoff command prompts for facewear|remove command can prompt and take off armor fallback' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Remaining follow-up

- The C category picker (`What type of things do you want to take off?`) is still approximated by an object-level prompt.
- Full `select_off()` blockers for welded hands, slippery gloves, ring access, traps, and cursed outer-layer dependencies remain incomplete.
- Delayed armor still delegates to the existing single-item armor occupation machinery; exact `You continue disrobing.` and `You finish disrobing.` context messages are not yet modeled.
