# 722 - Bullwhip Pit Monster Anchor

## C Source

- `nethack-c/upstream/src/apply.c:3089-3091` selects boulder or furniture as the initial pit escape anchor.
- `nethack-c/upstream/src/apply.c:3093-3103` lets a `bigmonst(mtmp->data) && canspotmon(mtmp)` target override boulder or furniture; small or medium monsters without a physical anchor fall through to ordinary `whipattack`.
- `nethack-c/upstream/include/mondata.h:12` defines big monsters as `msize >= MZ_LARGE`.
- `nethack-c/upstream/include/display.h:123-129` defines `canspotmon()` as visual sight or sensing.
- `nethack-c/upstream/src/apply.c:3110-3118` uses `proficient && rn2(proficient + 2)` for escape success, then uses `enexto(&cc, rx, ry, gy.youmonst.data)` when a monster occupies the anchor square.
- `nethack-c/upstream/src/apply.c:3122-3123` calls `wakeup(mtmp, TRUE)` after any wrapped pit-anchor attempt with a monster.

## Port Notes

- Spotted large-or-bigger monsters now override boulder/furniture pit anchors. The JS predicate accepts ordinary sight, `seeInvisible` sight, and telepathic sensing rather than relying on a replay fixture.
- Small and medium monsters with no boulder/furniture anchor still fall through to the existing monster branch, preserving the C `goto whipattack` shape.
- Monster-occupied physical anchors now relocate the hero through the shared `enextoMonsterSpot()` helper instead of printing the yank message without moving.
- Wrapped monster-anchor attempts wake the monster and route peaceful anger through the existing hero-object-hit helper.
- If the success roll passes but no adjacent landing exists, JS now matches C's observable shape by printing only the wrap message and still waking/angering the monster.

## Tests

- `proficient wielded bullwhip yanks hero near monster-occupied pit boulder anchor`
- `spotted big monster pit anchor overrides boulder and furniture`
- Existing focused bullwhip pit canaries from audit 721 were rerun.

## Remaining Follow-Ups

- Exact C `enexto()` coordinate shuffle and full-map fallback RNG are approximated by the existing JS `enextoMonsterSpot()` implementation.
- Full `teleds(..., TELEDS_ALLOW_DRAG)` side effects remain broader than this slice: ball-and-chain drag, region effects, trap landing effects, shop/vault fallout, and full vision redraw semantics.
- Full `wakeup(TRUE)` side effects remain broader than this slice, including mimic reveal details, priest/shop/Elbereth alignment fallout, and exact growl/noise messages.
- Broader `use_whip()` follow-ups remain mimic reveal, invisible mapping, proficient `force_attack()`, floor snaring, dead-horse feedback, self/down steed mistakes, underwater/swallowed details, and exact ordinary wakeup visibility.
