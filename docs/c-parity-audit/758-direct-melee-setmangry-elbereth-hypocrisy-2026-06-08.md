# 758 - Direct melee setmangry Elbereth hypocrisy

## Implemented Slice

Ordinary direct hero melee survivor hits now model the Elbereth hypocrisy branch at the start of C `setmangry(mon, TRUE)`.

This extends the direct-melee survivor wakeup work from audits 754-757. After a successful ordinary direct hit and after the command-level pre-hit engraving wipe, the JS survivor tail now checks for a strict, intact `Elbereth` engraving at the hero square. Qualifying attacks print the hypocrisy message, apply the C high-record or low-record alignment penalty, optionally print the fade message, and delete the engraving before the later wait-mask cleanup, hostile early return, or peaceful anger transition.

Covered behavior:

- strict `Elbereth` text only; substring variants such as `Elbereth!` do not trigger the branch;
- high-record alignment uses the fixed `-5` hypocrisy penalty and does not consume `rnd(5)`;
- low-record alignment consumes the C-shaped `rnd(5)` penalty;
- the hypocrisy penalty stacks with the ordinary non-priest peaceful attack penalty;
- hostile, Elbereth-vulnerable survivor hits can trigger hypocrisy without becoming newly angry;
- hostile human-shaped targets are treated as not vulnerable to written Elbereth and preserve the engraving;
- direct deletion is used for the fade branch rather than gradual `wipe_engr_at()` erosion;
- ordinary hostile survivor hits now pass through the same direct-melee wakeup/setmangry tail so C's pre-return side effect is reachable.

This remains local to ordinary direct melee survivor hits. It does not enable the branch for bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, or other special helpers.

C anchors:

- Direct attack checks wipe the hero-square engraving before the hit path: `nethack-c/upstream/src/uhitm.c:521`, `nethack-c/upstream/src/uhitm.c:553`.
- Ordinary unpolymorphed hero melee reaches `hitum()` and then `known_hitum()`: `nethack-c/upstream/src/uhitm.c:565`, `nethack-c/upstream/src/uhitm.c:568`, `nethack-c/upstream/src/uhitm.c:778`, `nethack-c/upstream/src/uhitm.c:786`.
- Successful ordinary melee hits call `hmon(mon, weapon, HMON_MELEE, dieroll)`: `nethack-c/upstream/src/uhitm.c:609`, `nethack-c/upstream/src/uhitm.c:622`.
- Survivor damage and hit feedback precede `wakeup(mon, TRUE)`: `nethack-c/upstream/src/uhitm.c:1845`, `nethack-c/upstream/src/uhitm.c:1870`, `nethack-c/upstream/src/uhitm.c:1923`, `nethack-c/upstream/src/uhitm.c:1926`.
- `wakeup(TRUE)` handles wake text, reveal/eating cleanup, sleeper growl, then `setmangry(TRUE)`: `nethack-c/upstream/src/mon.c:4333`, `nethack-c/upstream/src/mon.c:4337`, `nethack-c/upstream/src/mon.c:4338`, `nethack-c/upstream/src/mon.c:4349`, `nethack-c/upstream/src/mon.c:4353`, `nethack-c/upstream/src/mon.c:4355`.
- `setmangry()` checks strict Elbereth and `onscary()` or peacefulness before wait-mask cleanup and before hostile/tame returns: `nethack-c/upstream/src/mon.c:4265`, `nethack-c/upstream/src/mon.c:4267`, `nethack-c/upstream/src/mon.c:4270`, `nethack-c/upstream/src/mon.c:4287`, `nethack-c/upstream/src/mon.c:4290`, `nethack-c/upstream/src/mon.c:4295`.
- The branch prints the hypocrisy message, applies `record > 5 ? -5 : -rnd(5)`, optionally prints the fade message, and deletes the engraving: `nethack-c/upstream/src/mon.c:4271`, `nethack-c/upstream/src/mon.c:4280`, `nethack-c/upstream/src/mon.c:4282`, `nethack-c/upstream/src/mon.c:4283`, `nethack-c/upstream/src/mon.c:4284`.
- Strict `sengr_at(..., TRUE)` ignores headstones, requires a finished engraving, and requires the entire actual text to equal `Elbereth` case-insensitively: `nethack-c/upstream/src/engrave.c:243`, `nethack-c/upstream/src/engrave.c:251`, `nethack-c/upstream/src/engrave.c:255`, `nethack-c/upstream/src/engrave.c:256`.
- `onscary()` supplies the vulnerable-to-Elbereth side of the condition and excludes resistant classes such as Angels, human-shaped monsters, shopkeepers/guards, blind monsters, minotaurs, Gehennom, and endgame branches: `nethack-c/upstream/src/monmove.c:240`, `nethack-c/upstream/src/monmove.c:249`, `nethack-c/upstream/src/monmove.c:259`, `nethack-c/upstream/src/monmove.c:295`, `nethack-c/upstream/src/monmove.c:299`, `nethack-c/upstream/src/monmove.c:302`.
- `del_engr_at()` deletes the engraving directly, unlike smudging through `wipe_engr_at()`: `nethack-c/upstream/src/engrave.c:459`, `nethack-c/upstream/src/engrave.c:461`, `nethack-c/upstream/src/engrave.c:466`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- peaceful survivor on intact burned `Elbereth` gets hit text, hypocrisy text, fade text, then anger text;
- high-record hypocrisy stacks with ordinary peaceful anger and consumes no `rnd(5)`;
- nonexact `Elbereth!` text does not trigger the branch and leaves the engraving intact;
- hostile vulnerable survivor on `Elbereth` uses the low-record `rnd(5)` penalty, deletes the engraving, clears wait/eating state, and does not become newly angry;
- hostile human-shaped survivor preserves the exact `Elbereth` engraving and consumes no low-record penalty roll.

The focused command keeps the adjacent direct-melee sleeping/wakeup/tame/priest canaries plus bullwhip, wielded potion bash, and wielded egg bash canaries.

## Deferred Gaps

- Full `onscary()` parity remains broader: displacement, `guardobjects`, altar/vampire interactions, lawful-minion details, full shop/temple residency, and movement/pathing need separate coverage. The direct hero-square scare-monster scroll subcase is covered by audit 759.
- Blind fade-message suppression is covered by audit 761.
- Exact `adjalign()` threshold side effects such as Erinys adjustments remain outside this local direct-melee alignment model.
- Bounded direct ordinary-humanoid `peacefuls_respond()` bystanders are covered by audit 762; full town watch, shopkeeper, priest, quest-leader, tame, and nonhumanoid same-species response behavior remains deferred.
- Bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectile hits, two-weapon deferred wake queues, and other special helpers remain separate from this ordinary direct-melee hook.
- Full knockback movement, trap collisions, stun, and wording are still represented only by the existing RNG placeholder.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee (surviving peaceful non-priest wakes angry|surviving peaceful target on Elbereth|nonexact Elbereth|hostile vulnerable target on Elbereth|hostile human-shaped target|sleeping|surviving tame target preserves peacefulness|nonlethal peaceful temple priest wakes angry and triggers ghod_hitsu)|wielded bullwhip reveals hidden armed monster without disarming it|wielded blessed water potion bash vapor rehumanizes lycanthrope after monster hit|wielded confusion potion bash routes through potionhit|wielded ordinary egg hits visible monster" test/shop-billing-helpers.test.mjs` - 14 pass, 2700 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test test/*.mjs` - 2876 pass
- `npm run score` - 44/44 passing
