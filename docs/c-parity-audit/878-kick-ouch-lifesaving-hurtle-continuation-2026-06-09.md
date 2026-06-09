# Kick Ouch Lifesaving Hurtle Continuation

## C anchors

- `nethack-c/upstream/src/dokick.c:881` through `:905` make `kick_ouch()` continue after `losehp()` returns, then call `hurtle(-u.dx, -u.dy, rn1(2, 4), TRUE)` on Air levels or while levitating.
- `nethack-c/upstream/src/hack.c:4279` through `:4288` subtract HP, print `You die...`, and call `done(DIED)` when damage is lethal.
- `nethack-c/upstream/src/end.c:1081` through `:1119` let ordinary amulet life saving consume the amulet, print the medallion recovery messages, apply Constitution loss, call `savelife()`, clear killer state, and return to the original caller.
- `nethack-c/upstream/src/end.c:704` through `:717` restore positive HP in `savelife()` before `kick_ouch()` reaches the post-save `hurtle()` call.
- `nethack-c/upstream/src/hack.h:1535` defines `rn1(2, 4)` as `rn2(2) + 4`, so the post-save recoil range is four or five squares and the visible message is the range-greater-than-one hurtle wording.

## JS parity

- `applyKickOuchDamage()` now queues a kick-specific life-saving recoil only when lethal `kick_ouch()` damage is rescued by amulet life saving and the hero is on an Air level or levitating.
- The queued continuation stores only the kick direction. The `rn1(2, 4)` recoil range is deliberately consumed from `lifeSavingMore`, after the medallion crumble message and HP/death-state restoration, matching the C return point after `done(DIED)`.
- `lifeSavingMore` now consumes this kick-specific continuation after applying the ordinary life-saving cleanup, appends `You hurtle in the opposite direction.` to the recovery line, and applies any recoil trap result through the existing life-saving/fatal command-mode handoff.
- No-save fatal `kick_ouch()` still does not queue recoil, does not consume `rn1(2, 4)`, and does not move the hero.

## Canaries

- `levitating command kicked object ouch life saving hurtles after rescue` covers failed object `kick_ouch()` damage that is lethal, amulet-rescued, and then resumes into delayed `rn1(2, 4)` recoil after the life-saving More prompt.
- `levitating command kick at drawbridge wall life saving hurtles after rescue` covers the no-object terrain/drawbridge-wall `kick_ouch()` caller, bridge maploc rewrite, life-saving recovery, delayed recoil RNG, and final hero movement.
- Existing `levitating fatal command kicked object ouch does not consume recoil range` and `fatal command kick at drawbridge wall dies from kicking a drawbridge` remain the no-save fatal guards: death is final, no recoil message appears, and the recoil RNG is not consumed.

## Remaining follow-up

- Standard recoil obstacle collision deaths and life saving are covered by `879-recoil-obstacle-collision-death-lifesaving-2026-06-09.md`. Boomerang pre-recoil still needs a separate source-backed slice because it resumes into curved `boomhit()` flow after life saving.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "levitating command kicked object ouch life saving hurtles after rescue|levitating command kick at drawbridge wall life saving hurtles after rescue|levitating fatal command kicked object ouch does not consume recoil range|fatal command kick at drawbridge wall dies from kicking a drawbridge|levitating command kicked object ouch hurtles after nonfatal damage|command kicked object ouch uses life saving" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` (`2974` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
