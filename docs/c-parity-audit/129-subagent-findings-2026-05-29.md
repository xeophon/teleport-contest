# 129 - Golem stone-to-flesh figurine and statue animation

## Implemented slice

Stone-to-flesh now handles golem corpstat objects before the vegetarian meatball fallback, matching C branch order. Carried and floor golem figurines animate as flesh golems, with non-flesh golems using the `turns to flesh and animates` wording. Non-shop, non-trap floor golem statues now animate as flesh golems, move contents into the created monster's inventory, and use C's `turns into flesh` or `moves` wording.

The slice deliberately keeps ordinary non-golem statue animation, shop statue billing, statue-trap integration, saved `montraits`, and failed-animation corpse fallback deferred.

## C references

- `nethack-c/upstream/src/zap.c:1993` starts `stone_to_flesh_obj()`.
- `nethack-c/upstream/src/zap.c:2002` and `zap.c:2006` apply material and resistance gates before statue or figurine handling.
- `nethack-c/upstream/src/zap.c:2017` checks `is_golem()` before `vegetarian()`, so vegan golems animate instead of becoming meatballs.
- `nethack-c/upstream/src/zap.c:2031` retargets non-flesh golem figurines to `PM_FLESH_GOLEM`.
- `nethack-c/upstream/src/zap.c:2047` prints `The figurine turns to flesh and animates!` for non-flesh golem figurines and plain `The figurine animates!` for flesh golems.
- `nethack-c/upstream/src/trap.c:751` through `trap.c:756` force spell-animated golem statues to flesh golems.
- `nethack-c/upstream/src/trap.c:768` and `trap.c:787` use `NO_MINVENT | MM_NOMSG | MM_ADJACENTOK` for fresh spell-animated statues.
- `nethack-c/upstream/src/trap.c:817` through `trap.c:822` choose `turns into flesh` for non-flesh golem statues and `moves` for flesh golem statues.
- `nethack-c/upstream/src/trap.c:880` through `trap.c:890` transfer statue contents to the monster before deleting the statue.

## JS changes

- `js/cmd.js:12506` adds a flesh-golem target lookup and golem animation classifier.
- `js/cmd.js:12563` routes golem figurines through animation before checking vegetarian fallback.
- `js/cmd.js:12583` and `js/cmd.js:12618` create the classified target monster and preserve golem-specific figurine wording for carried and floor figurines.
- `js/cmd.js:12648` adds non-shop, non-trap golem floor statue spell animation with `MM_ADJACENTOK`, sleep/detection cleanup, content transfer, and C-shaped statue wording.
- `js/cmd.js:12795` removes successfully animated golem statues from the floor loop.
- `test/shop-billing-helpers.test.mjs:3958` adds carried stone/flesh golem figurine coverage.
- `test/shop-billing-helpers.test.mjs:4342` adds floor stone golem figurine coverage.
- `test/shop-billing-helpers.test.mjs:4627` adds floor golem statue identity, wording, and content-transfer coverage.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs` (`42/42 matching tests passing`)
- `node --test test/shop-billing-helpers.test.mjs` (`868/868 passing`)
- `npm run score` (`44/44 passing`)

## Deferred candidates from this subagent round

- Carried shop-billed figurine animation should allow top-level unpaid carried figurines, charge via `stolen_value()` after successful `makemon()`, remove live bill rows, and avoid used-up bill preservation.
- Ordinary non-golem floor statue spell animation needs the same `MM_ADJACENTOK` and content-transfer path, with shop squares and statue traps still deferred until their charging/trap semantics are ported.
- Burning-oil shop-door damage needs terrain damage records, `SHOP_DOOR_COST`, one deferred `pay_for_damage("burn away", FALSE)`-shaped report, and delayed repair; it should stay separate from object billing.
- Projectile migration should gain no-behavior-change metadata for target level, origin level, migration mode, flags, and source before stairs/ladders/special-stairs delivery is added.
- Ordinary thrown-object monster hits are still missing for many non-potion objects. A compact next candidate is horizontal ordinary egg hit parity before the generic noncombat landing branch.
