# 760 - Direct melee setmangry altar vampire onscary

## Implemented Slice

Ordinary direct hero melee survivor hits now model the C `onscary(u.ux, u.uy, mon)` altar/vampire branch inside `setmangry(mon, TRUE)`'s Elbereth hypocrisy check.

Audit 759 added the hero-square scare-monster scroll source. This slice adds the earlier altar terrain source: after hard scare immunities and shop/temple residency, but before scare-monster scrolls and before the final written-Elbereth-only restrictions, an altar under the hero makes hostile vampires and vampire shifters vulnerable to the hypocrisy branch.

Covered behavior:

- strict hero-square `Elbereth` remains required before `setmangry(TRUE)` can run the hypocrisy branch;
- an `ALTAR` terrain square under the hero makes `onscary(u.ux, u.uy, mon)` true for hostile vampires and vampire shifters without a scare-monster scroll;
- the altar branch is checked before the final written-Elbereth restrictions, so blind hostile vampires and vampire shifters can still trigger hypocrisy from the altar source in Gehennom or endgame branches;
- the altar source is terrain-only for this branch: altar alignment, shrine flags, and floor-object state do not affect the scare source;
- hard pre-altar scare immunities still win because the branch remains below direct scare resistance, magical human/unique resistance, and own-shop/own-temple checks;
- non-vampire monsters do not gain the altar bypass, so final written-Elbereth restrictions such as Gehennom and endgame still reject them without a scroll.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectiles, two-weapon paths beyond audit 770's ordinary sleeping direct-melee ordering, swallowed/jousting/artifact melee, or broader monster movement/flee decisions.

C anchors:

- `setmangry()` first checks `via_attack`, strict `sengr_at("Elbereth", u.ux, u.uy, TRUE)`, then `onscary(u.ux, u.uy, mon) || mon->mpeaceful`: `nethack-c/upstream/src/mon.c:4265`, `nethack-c/upstream/src/mon.c:4267`, `nethack-c/upstream/src/mon.c:4270`.
- `onscary()` rejects monsters directly resistant to any scare, then human-shaped/unique magical-scare targets, then shopkeepers in their own shop and priests in their own temple: `nethack-c/upstream/src/monmove.c:249`, `nethack-c/upstream/src/monmove.c:259`, `nethack-c/upstream/src/monmove.c:266`.
- The altar/vampire source returns true for `IS_ALTAR(levl[x][y].typ)` and either `S_VAMPIRE` or `is_vampshifter(mon)`: `nethack-c/upstream/src/monmove.c:274`, `nethack-c/upstream/src/monmove.c:275`.
- The altar/vampire source is above the scare-monster scroll branch and final written-Elbereth restrictions: `nethack-c/upstream/src/monmove.c:278`, `nethack-c/upstream/src/monmove.c:295`, `nethack-c/upstream/src/monmove.c:299`, `nethack-c/upstream/src/monmove.c:302`.
- C's vampire shifter predicate is keyed off the monster's base vampire `cham` identity, not ordinary undead status: `nethack-c/upstream/include/monst.h:217`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- a hostile blind vampire on exact `Elbereth` while the hero is on an altar in Gehennom feels hypocritical, deletes the engraving, and uses the low-record penalty;
- a hostile blind shifted vampire bat with vampire shifter metadata gets the same altar bypass;
- a hostile blind vampire on exact `Elbereth` while the hero is on an altar in the endgame gets the same altar bypass;
- hostile nonvampires on exact `Elbereth` while the hero is on an altar in Gehennom and the endgame do not get the altar bypass and preserve the engraving.

The focused command keeps adjacent written-Elbereth and scare-scroll canaries from audits 758-759.

## Deferred Gaps

- Full `onscary()` breadth outside this direct-melee `setmangry(TRUE)` hook remains deferred: displacement, `guardobjects`, auditory scare, movement/flee logic, `goodpos_onscary()`, and monster pathing.
- Full vampire-shifter lifecycle fidelity remains broader than this check; this slice relies on existing local vampire/vampshifter metadata.
- Full shopkeeper/priest room-boundary edge cases remain broader than the current direct helpers, especially C `inhishop()` boundary semantics and all `inhistemple()` level/room cases.
- Broader altar semantics outside C's simple `IS_ALTAR()` scare check, including level generation, conversion, desecration, and shrine behavior, remain covered elsewhere.
- Bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectiles, two-weapon paths beyond audit 770's ordinary sleeping direct-melee ordering, swallowed/jousting/artifact melee, and other special helpers remain separate.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee (hostile blind vampire on Elbereth altar|hostile blind shifted vampire on Elbereth altar|hostile nonvampire on Elbereth altar|hostile vulnerable target on Elbereth|hostile human-shaped target|hostile blind target on Elbereth and scare scroll|hostile minotaur on Elbereth and scare scroll)" test/shop-billing-helpers.test.mjs` - 10 pass, 2713 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` - 44/44 passing
