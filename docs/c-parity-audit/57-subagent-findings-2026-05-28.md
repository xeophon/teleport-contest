# Direct Speed Potionhit And Boulder-Push Follow-Up

## Scope

Parallel read-only audits checked the remaining direct `potionhit()` families and the next compact shop-helper slice. The implemented code slice in this note is direct hero-thrown potion of speed hitting a monster. The boulder-push notes are retained as the next ranked shop-ledger candidate.

## C Anchors

- `potionhit()` starts at `nethack-c/upstream/src/potion.c:1623`. It performs the crash message, optional saddle handling, the `rn2(5)` HP chip, evaporation, family-specific potion effect, wake/anger handling, adjacent vapor, and shop billing/freeing.
- Potion of speed is handled at `nethack-c/upstream/src/potion.c:1817`. It sets `angermon = FALSE`, calls `mon_adjust_speed(mon, 1, obj)`, and still clears `msleeping` in the common survivor block without angering the monster.
- `mon_adjust_speed()` is in `nethack-c/upstream/src/worn.c:502`. A speed adjustment changes a slowed monster back to normal speed, otherwise sets permanent fast speed. The observed "suddenly moving faster" message is emitted only when the speed state changed, the monster can move, is not asleep/frozen, and can be seen.
- Adjacent hero vapor still runs from the common potionhit tail, so a speed potion can speed the monster before applying the hero's direct speed vapor.
- Boulder push shop-boundary transitions are in `nethack-c/upstream/src/hack.c:216` and `hack.c:347`, with the source costly spot captured before movement. C can add/remove a zero-value boulder bill row even though the boulder price is zero.
- Shared-shop owner priority flows through `find_objowner()` in `nethack-c/upstream/src/shk.c:1082`. It prefers the shopkeeper whose bill already owns the object at shared locations.

## JS Status

- `js/cmd.js` now includes `speed` in `supportsHeroThrownPotionHit()`.
- The direct hit path tracks whether the potion effect should anger the target. Speed sets this false, updates monster speed, and leaves a surviving peaceful target peaceful while still waking it.
- Monster speed state now recognizes local string states and numeric compatibility states. Slowed monsters are restored to normal; normal monsters become fast.
- Visible observed speed changes call the existing discovery helper, matching the C `learnwand(obj)`-style "known by observed effect" intent for this port's potion discovery model.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- A visible non-adjacent monster becomes fast, the potion is discovered, the target remains peaceful, and no hero vapor fires.
- An already-fast monster is not described as newly faster and does not discover the potion from an unchanged observed effect.
- Adjacent speed potionhit applies monster speed before the direct hero speed vapor.

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "speed potion|potionhit" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `npm run score` (`44/44`)

## Remaining Potionhit Work

The next compact direct `potionhit()` families are still invisibility and acid. Broader remaining families include healing/gain ability, sickness, hallucination, water, oil, polymorph, and the exact `trycall()`/discovery prompts that depend on fuller object naming and visibility contracts.

## Boulder-Push Follow-Up

Superseded by `58-subagent-findings-2026-05-28.md`: the best next shop-ledger slice was boulder push billing. A follow-up C audit corrected the initial zero-price-row assumption: boulder `oc_cost` is zero, but `get_cost()` floors that to a positive 5-zorkmid base before charisma/knowledge adjustment.

The implemented follow-up kept `addObjectToShopBill()` positive-price-only and added a boulder-specific C-shaped push transition instead.
