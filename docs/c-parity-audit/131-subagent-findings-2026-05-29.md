# 131 - Ordinary floor statue stone-to-flesh animation

## Implemented Slice

Downward stone-to-flesh now animates ordinary non-shop, non-trap floor statues for non-golem, non-vegetarian monster data. The path shares the existing corpstat animation classification with figurines, then follows the C `animate_statue()` spell shape for this ordinary case:

1. mineral/gemstone object gate;
2. no statue-trap or shop-square handling in this narrow slice;
3. unique/no-corpse/cant-revive non-golem statues deferred instead of guessed;
4. object resistance before `makemon()`;
5. `makemon(..., NO_MINVENT|MM_NOMSG|MM_ADJACENTOK)`;
6. clear sleeping and hidden state;
7. transfer statue contents into monster inventory;
8. remove the statue and redraw the statue and monster squares;
9. visible ordinary wording such as "The statue of a goblin comes to life!"

C anchors:

- `stone_to_flesh_obj()` applies mineral/gemstone and resistance gates before checking boulder/statue/figurine cases: `nethack-c/upstream/src/zap.c:1993`, `nethack-c/upstream/src/zap.c:2002`, `nethack-c/upstream/src/zap.c:2006`.
- C calls `animate_statue()` for statues and notes that stone-to-flesh golem statues become flesh golems: `nethack-c/upstream/src/zap.c:2017`, `nethack-c/upstream/src/zap.c:2027`, `nethack-c/upstream/src/zap.c:2029`.
- `animate_statue()` handles `cant_revive()`, golem retargeting, saved traits, spell `MM_ADJACENTOK`, sleeping/undetected clearing, message verbs, shop charging, contents transfer, wearing, and deletion: `nethack-c/upstream/src/trap.c:725`, `nethack-c/upstream/src/trap.c:751`, `nethack-c/upstream/src/trap.c:787`, `nethack-c/upstream/src/trap.c:817`, `nethack-c/upstream/src/trap.c:834`, `nethack-c/upstream/src/trap.c:861`, `nethack-c/upstream/src/trap.c:880`.
- Downward object hits run through `bhitpile()` and dispatch stone-to-flesh object effects through `stone_to_flesh_obj()`: `nethack-c/upstream/src/zap.c:2412`, `nethack-c/upstream/src/zap.c:2428`.

JS changes:

- Added shared `stoneToFleshCorpstatAnimationInfo()` so figurines and ordinary statues use one golem/vegetarian/ordinary classification path: `js/cmd.js:12563`.
- Added a conservative ordinary-statue guard for unique/no-corpse/cant-revive non-golem corpstats, leaving the doppelganger/corpse-fallback rows for their own source-backed slice: `js/cmd.js:12571`.
- Generalized floor statue animation selection from golem-only to ordinary floor statues while retaining trap/shop/material gates: `js/cmd.js:12666`, `js/cmd.js:12671`, `js/cmd.js:12672`.
- Existing floor statue animation now exercises `MM_ADJACENTOK`, sleeping/undetected cleanup, content transfer, redraw, and C-style ordinary/golem wording for the broader ordinary case: `js/cmd.js:12681`, `js/cmd.js:12682`, `js/cmd.js:12829`.

## Tests Added

Added ordinary floor statue coverage in `test/shop-billing-helpers.test.mjs`:

- ordinary non-golem floor statue animates, transfers contents to monster inventory, removes the statue, and avoids meat smell output: `test/shop-billing-helpers.test.mjs:4784`;
- blocked statue square may place the monster on an adjacent square through `MM_ADJACENTOK`: `test/shop-billing-helpers.test.mjs:4812`;
- object resistance is checked before animation and preserves the statue without messages or smell output: `test/shop-billing-helpers.test.mjs:4841`.

## Deferred Gaps From This Agent Round

- Shop-floor and statue-trap statue animation still need the full C `stolen_value()`/`animate_statue()` ordering and billing message placement.
- Saved monster traits, named statues, historic statues, mimic visibility, worn statue cleanup, and `m_dowear()` remain in the broader `animate_statue()` parity bucket.
- Unique/no-corpse/cant-revive statue fallback still needs the C doppelganger/no-monster/corpse-preservation behavior.
- Failed stone-to-flesh animation still needs the C corpse fallback for eligible non-unique corpse-leaving targets.
- Horizontal ordinary egg hits on monsters still need the direct `thitmonst()`/`hmon()` egg path, including `Splat!` and used-up billing.
- Burning-oil shop-door terrain damage still needs damage records, `pay_for_damage("burn away", FALSE)`, and delayed repair.
- Projectile/object migration queues still need per-object C-shaped migration metadata.
- Deaf shop payment speech still needs nonverbal C fallbacks for successful payment and partly-used rejection.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs` - 51 pass, 826 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 877/877
- `npm run score` - 44/44
