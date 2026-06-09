# Object Impact Disturbs Buried Zombies

## Source

- `nethack-c/upstream/src/hack.c:1787` through `:1793`: `impact_disturbs_zombies(obj, violent)` skips quiet impacts below 10 weight for violent landings or 100 weight for nonviolent drops, skips `is_flimsy()` objects, then calls `disturb_buried_zombies(obj->ox, obj->oy)`.
- `nethack-c/upstream/src/dothrow.c:1824` through `:1833`: a surviving hero projectile is placed, hard-landing container impact runs, buried zombies are disturbed with `violent=TRUE`, then shop handling and stacking run.
- `nethack-c/upstream/src/dokick.c:640` through `:642` and `:785` through `:786`: kicked loose and ordinary kicked landings place the object, disturb buried zombies with `violent=TRUE`, then stack/newsym.
- `nethack-c/upstream/src/do.c:820` through `:833`: carried drops that survive floor effects are placed, optional impact damage runs, and `impact_disturbs_zombies(obj, with_impact)` runs before ball/shop/stack handling.
- `nethack-c/upstream/src/dokick.c:1511` and `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `impact_drop()` and monster `drop_throw()` do not call `impact_disturbs_zombies()`, so this slice intentionally leaves those helpers unwired.

## JS Change

- `js/cmd.js`: added an `impactDisturbsBuriedZombieCorpseTimersForObject()` wrapper around the existing corpse-timer disturbance helper. It applies the C violent/nonviolent weight thresholds and a local flimsy-material gate before shortening timers.
- Hero projectile landing now calls the wrapper after hard-landing container impact and before shop landing/sale/stacking.
- Kicked floor-object placement now calls the wrapper after placement and before stacking, covering ordinary flight, kicked-loose objects, and survivor-after-monster-hit landings.
- Carried drop placement now calls the wrapper with `violent=false` after floor placement and before shop/sale/stacking.
- `impactDropFloorObjects()` and `landMonsterThrownObject()` remain unchanged because C `impact_drop()` and monster `drop_throw()` do not disturb buried zombies.

## Tests

- `command carried hard drop disturbs buried zombies by C impact thresholds`
- `impact drop alone does not disturb buried zombie corpse timers`
- `command kick ordinary floor object stops before blocked same-level terrain`
- `hero-thrown dagger harms ordinary monster and survives landing`

Focused verification:

```sh
node --test --test-reporter=dot --test-name-pattern "command (carried hard drop disturbs buried zombies by C impact thresholds|kick ordinary floor object stops before blocked same-level terrain)|impact drop alone does not disturb buried zombie corpse timers|hero-thrown dagger harms ordinary monster and survives landing" test/shop-billing-helpers.test.mjs
```

## Remaining Follow-Up

- C scans only `buriedobjlist`; JS continues using the local representation already covered by earlier canaries, scanning both `level.buriedobjlist` and floor objects marked buried.
- Exact C object material metadata is still broader registry work; this slice uses the existing local material classifier plus C-shaped food/flimsy guards.
