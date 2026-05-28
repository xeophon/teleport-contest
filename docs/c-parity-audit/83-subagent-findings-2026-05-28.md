# Subagent Findings 2026-05-28: Potion Trycall, Visibility, Stone Rows, Oil Collateral, and Vampire Revival

## Implemented Slice: Non-`kn` Potion `trycall()`

C keeps potion naming separate from hard identification. `potionbreathe()` sets `kn` only for self-evident vapor effects such as invisibility, paralysis, sleeping, and blindness; at its tail, dknown potions either `makeknown()` for `kn` effects or reach `trycall(obj)` for non-`kn` effects. Wet towel interception blocks the vapor effect but still reaches that naming tail. Direct `potionhit()` also reaches `trycall(obj)` when the hero does not inhale vapor and the dknown target square is visible. Source anchors: `nethack-c/upstream/src/potion.c:1906`, `nethack-c/upstream/src/potion.c:1943`, `nethack-c/upstream/src/potion.c:2111`, and `nethack-c/upstream/src/do.c:392`.

JS now has shared called-potion helpers mirroring the existing scroll call model where C `trycall()` reaches the prompt. Non-`kn` vapor queues `callPotionAfterMore`, visible dknown no-vapor direct hits queue the same prompt, wet worn towels no longer return before naming, already-known/discovered/called appearances suppress repeat prompts, and trycall-sourced typed potion calls add `Potions` discovery entries such as `potion called visions (magenta)`. Existing quaff taste-call prompts keep their storage-only behavior to preserve the public C screen shape. Direct speed hits no longer hard-identify potion of speed from monster acceleration alone.

Focused tests cover wet-towel unknown vapor naming, visible no-vapor unknown direct hit naming, already-called suppression, and speed direct-hit non-discovery.

## Direct `potionhit()` Visibility Audit

C gates detailed crash text and non-oil evaporation on `cansee(tx, ty)`. Unseen hits say only `Crash!`, and saddle feedback is stricter: `!Blind && canseemon(mon) && cansee(tx, ty)`. Source anchors: `nethack-c/upstream/src/potion.c:1653`, `nethack-c/upstream/src/potion.c:1679`, and `nethack-c/upstream/src/potion.c:1709`.

JS still prints detailed crash and evaporation text for supported direct potion hits regardless of square visibility. The new trycall fallback uses the visible-square gate, but the message text path remains open. Compact tests: blind high-DEX thrown potion hit, wielded potion bash while blind, and blind/out-of-sight saddle water hit.

## Stone-to-Flesh Object Rows and Resistance Audit

C `stone_to_flesh_obj()` first requires material `MINERAL` or `GEMSTONE`, then applies `obj_resists(obj, 2, 98)`. Invocation objects and Rider corpses always resist, ordinary objects resist on `rn2(100) < 2`, and artifacts resist on `< 98`. Covered object rows still missing in JS include `BOULDER -> ENORMOUS_MEATBALL` and eligible `GEM_CLASS -> MEATBALL`; gemstone/mineral rings and marble wands are already covered. Source anchors: `nethack-c/upstream/src/zap.c:1458`, `nethack-c/upstream/src/zap.c:1994`, `nethack-c/upstream/src/zap.c:2002`, and `nethack-c/upstream/include/objects.h:1054`.

JS has local meat food metadata and boulder/gem classifiers, but no shared object material table for these rows. Best next slice: add a local stone-to-flesh resistance helper, boulder replacement factory, and eligible gem replacement factory for self/down paths; defer statues and figurines until the broader monster/statue lifecycle is in place.

## Burning-Oil Explosion Collateral Audit

C lit-oil potion explosions run `zap_over_floor()` across the 3x3 blast before monster damage, so webs, ice, water, fountains, doors, and burnable floor objects can be affected. Source anchors: `nethack-c/upstream/src/explode.c:478`, `nethack-c/upstream/src/explode.c:974`, `nethack-c/upstream/src/zap.c:5162`, and `nethack-c/upstream/src/zap.c:5489`.

JS direct lit-oil hits cover blast damage and wakeup shape but not 3x3 floor/terrain collateral. Existing fire-ray helpers can supply most of the small slice; loose floor potions should remain unaffected by floor-object burning because C's floor burn helper targets scrolls, spellbooks, and green slime.

## Shifted Vampire Lethal Revival Audit

C blessed water can reduce a shifted vampire form to zero HP, but `killed()` routes through `mondead()`, which intercepts vampshifters with `vamprises()` before ordinary death accounting. The monster rises as its base vampire form, gives no XP, does not increment vanquish/death counts, and drops no inventory/corpse; the "first kill" conduct still increments before the fake death is discovered. Source anchors: `nethack-c/upstream/src/potion.c:1831`, `nethack-c/upstream/src/mon.c:2886`, `nethack-c/upstream/src/mon.c:3096`, and `nethack-c/upstream/src/mon.c:3671`.

JS currently sends lethal blessed-water vampshifter hits through ordinary monster death cleanup. A narrow implementation belongs inside `waterPotionHitShapechanger()` before `killMonsterFromPotionHit()`: revive/reform to base vampire data, emit the rise message, and skip XP/vanquish/drop/corpse removal.

## Remaining Identity-Independent Direct Potion Gap

C sends any potion-class direct hit that passes the thrown-object hit roll through `potionhit()`. JS still requires a known supported identity or explicit index mapping before entering the shared route. Source anchors: `nethack-c/upstream/src/dothrow.c:2262`, `js/cmd.js` direct potion support gates, and prior audit 80.

This remains intentionally deferred until the direct-hit route can handle unknown identity defaults without inventing hidden-test behavior. A source-shaped test would throw an unidentified potion-class object with no local `kind` or `potionIndex` and assert common crash/chip/wake/anger/consume behavior without effect-specific messages.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='potion|Potion|speed|towel' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `npm run score`
