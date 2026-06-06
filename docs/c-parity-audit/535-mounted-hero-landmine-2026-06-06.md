# Mounted Hero Land Mine

## Scope

Port the C hero `LANDMINE` floor-trigger path far enough to cover ordinary movement, `#sit`, mounted steed damage/death, in-air hidden-mine avoidance, and the object-list/dismount pending routes. Before this slice, JS only had a sit-only land mine effect, so ordinary movement could step onto a land mine without triggering it and mounted heroes never routed the blast through their steed.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:2528` through `:2599` is the hero `trapeffect_landmine()` body.
- `nethack-c/upstream/src/trap.c:2533` rolls the hero blast damage with `rnd(16)`.
- `nethack-c/upstream/src/trap.c:2537` through `:2538` reduces hero blast damage for iron shoes.
- `nethack-c/upstream/src/trap.c:2548` through `:2562` handles levitating/flying non-forced triggers, including the hidden-mine `rn2(3)` avoidance.
- `nethack-c/upstream/src/trap.c:2572` through `:2579` marks the mine seen, prints the normal trigger message, and calls `steedintrap()` for mounted heroes.
- `nethack-c/upstream/src/trap.c:2580` through `:2582` wounds both legs and exercises dexterity.
- `nethack-c/upstream/src/trap.c:2587` through `:2597` converts the mine to a pit, applies hero damage, updates the map, and recursively processes the resulting pit.
- `nethack-c/upstream/src/trap.c:3141` through `:3144` is the `steedintrap()` `LANDMINE` branch, which damages the steed with a separate `rnd(16)`.
- `nethack-c/upstream/src/trap.c:3163` through `:3167` dismounts if the steed was killed.
- `nethack-c/upstream/src/trap.c:2979` through `:2980` routes ordinary floor-trigger dispatch to `trapeffect_landmine()`.

## JS Change

- `js/cmd.js` now has a shared land mine result helper used by movement and `#sit`.
- Ordinary hero movement into a land mine now rolls blast damage, marks the trap seen, converts the trap to `PIT`, wounds both legs, applies pit trap state, exercises DEX, applies half-physical damage reduction, and routes fatal/life-saving handling through the existing trap result pipeline.
- Mounted land mine movement now damages the steed with a separate `rnd(16)` before applying the hero blast effects, and it uses the existing steed trap-death cleanup path when the steed dies.
- Hidden levitating/flying movement now matches the C avoidance gate: the hero blast damage roll is consumed first, then an unseen mine can remain hidden and untriggered on `rn2(3)`.
- Object-list and dismount object-list pending routes now consume `_pending_landmine_trap` through the same shared movement result.
- The environmental `blow_up_landmine()` blast details remain outside this slice; JS preserves the existing narrower pit conversion behavior.

## Tests

- `hero land mine movement explodes into pit and wounds hero`
- `mounted hero land mine damages steed and hero`
- `mounted hero land mine killing steed dismounts and still hurts hero`
- `flying hero may cross hidden land mine without triggering`
- `dismount object list consumes pending land mine trap`

The tests use local trap and steed fixtures with explicit RNG queues. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

Mounted `PIT` and `SPIKED_PIT` are covered in audit 536, and mounted `POLY_TRAP` is covered in audit 537 with the steed-learning follow-up in audit 573. Remaining land-mine work is limited to broader environmental `blow_up_landmine()` blast details outside this slice.
