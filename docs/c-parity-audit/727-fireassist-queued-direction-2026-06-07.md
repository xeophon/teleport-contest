# 727 - Fireassist Queued Direction Boundary

## C Source

- `nethack-c/upstream/src/dothrow.c:557-579` handles quivered ammo fireassist after the reachable-polearm branch: matching primary launcher fires directly, matching alternate launcher queues `doswapweapon` then `dofire`, and carried launcher queues optional `doswapweapon`, `dowield`, its inventory key, then `dofire`.
- `nethack-c/upstream/src/cmd.c:252` appends queued commands and `nethack-c/upstream/src/cmd.c:406` pops them FIFO, so the direction prompt is reached only on the later retried `dofire`.
- `nethack-c/upstream/src/wield.c:168-272` has successful `ready_weapon()` spend time after printing the wield line.
- `nethack-c/upstream/src/wield.c:461-500` makes `doswapweapon()` report the old primary as the new secondary after the swap.
- `nethack-c/upstream/src/dothrow.c:85-101` calls `getdir(NULL)` inside `throw_obj()`, after queued launcher lifecycle work has completed.

## Port Notes

- Queued launcher lifecycle now keeps pending fire identity in `_fire_pending_item_letter` and `_fire_pending_launcher_letter`.
- `_fire_item_letter`, `_fire_launcher_letter`, and `fireDirection` are not activated while the launcher/wield/swap More chain is still pending.
- The More continuation activates the pending fire identity only when it displays `In what direction?`.
- Alternate-launcher space/enter continuation still preserves the queued swap message; when the existing non-space continuation path advances directly to direction, it now activates the pending fire identity at that prompt instead of earlier.

## Tests

- `f command fireassist skips known cursed inventory launcher`
- `f command fireassist prefers known non-cursed launcher over unknown BUC match`
- `f command fireassist queued alternate launcher shows swap line before direction prompt`
- `f command basic quivered ammo with polearm range-five target falls through to launcher assist`
- `f command quivered ammo with wielded polearm but no target still uses launcher assist`

## Remaining Follow-Ups

- JS still mutates launcher and primary/alternate equipment inline at fireassist selection time instead of modeling C's actual queued `doswapweapon`/`dowield` command objects.
- Autoquiver ready-message direction timing for already-wielded launcher and no-launcher paths remains broader than this queued-launcher boundary slice.
