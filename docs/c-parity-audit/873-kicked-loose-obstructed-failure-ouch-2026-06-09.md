# Kicked Loose Obstructed Failure Ouch

## C anchors

- `nethack-c/upstream/src/dokick.c:508` through `:514` make boulders, the iron ball, and the chain return `0` from `really_kick_object()` before the normal `You kick ...` object message.
- `nethack-c/upstream/src/dokick.c:610` emits `You kick <object>.` only after the unsupported-object early return is skipped.
- `nethack-c/upstream/src/dokick.c:615` enters the loose-source branch for `IS_OBSTRUCTED(levl[x][y].typ)` as well as closed doors.
- `nethack-c/upstream/src/dokick.c:616` through `:624` print the failed-loose message, then return `!rn2(3) || martial()`.
- `nethack-c/upstream/src/dokick.c:1452` through `:1461` dispatch objects before doors/non-doors; a false object-kick return calls `kick_ouch()` and still consumes the command.
- `nethack-c/upstream/src/dokick.c:886` through `:903` print `Ouch!  That hurts!`, exercise Dexterity/Strength, optionally wound the right leg, and apply Constitution-sized kick damage.

## JS parity

- Non-door obstructed source terrain now has a command canary for the same loose-object path used by closed doors.
- Failed loose rolls now have a command canary for the `rn2(3)` fall-through into kick-ouch damage while leaving the object in place and preserving shop state.
- Unsupported objects on loose-source squares now consume the object-first branch and apply kick-ouch damage instead of falling through to door kicking.
- The unsupported-object path does not print `You kick ...`, matching C's early return before the object-kick feedback line.

## Canaries

- `command kicked shop object on obstructed wall comes loose to hero and gets live bill` covers `IS_OBSTRUCTED()` non-door loose success, source terrain preservation, live billing, and no `Thump!` or door fallback.
- `command kicked shop object on closed door failed loose roll may hurt hero` covers failed loose state, `rn2(3)` ouch fall-through, wounded-leg timing, damage, and unchanged bill state.
- `command kicked boulder on closed door uses object ouch instead of door kick` covers the unsupported-object early return and prevents object-on-door kicks from mutating the door.

## Remaining follow-up

- Exact `kick_ouch()` death, life saving, blindness feel-location, drawbridge-wall, wake-nearby, and levitation/airlevel hurtle fallout remain broader command-kick work.
- Shared-wall multi-shop ownership remains broader than this loose-source behavior slice.

## Verification

- `node --test --test-name-pattern 'command kicked.*(closed door|obstructed wall)' test/shop-billing-helpers.test.mjs` (`13` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2972` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
