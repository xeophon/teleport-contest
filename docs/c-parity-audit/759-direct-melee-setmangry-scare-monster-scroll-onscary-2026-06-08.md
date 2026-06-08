# 759 - Direct melee setmangry scare monster scroll onscary

## Implemented Slice

Ordinary direct hero melee survivor hits now model the C `onscary(u.ux, u.uy, mon)` scare-monster scroll branch inside `setmangry(mon, TRUE)`'s Elbereth hypocrisy check.

Audit 758 added the strict `Elbereth` hypocrisy branch for direct survivor hits. This slice extends the hostile-target gate so exact `Elbereth` is still required first, but a top-level unburied `SCR_SCARE_MONSTER` floor object under the hero can make `onscary()` true before the final written-Elbereth-only restrictions.

Covered behavior:

- a scare-monster scroll alone is not enough; `setmangry(TRUE)` still requires exact `Elbereth` at the hero square;
- a hero-square scare-monster floor scroll is observed as a scare source without pickup, dusting, billing, BUC, `spe`, or consumption side effects during melee;
- hard pre-scroll scare immunities remain before the scroll check: Wizard, lawful minions, Angels, Riders, human-shaped monsters, uniques, own-shop shopkeepers where modeled, and own-temple priests where modeled;
- the scroll branch bypasses the final written-Elbereth-only restrictions, including blind monsters, minotaurs, vault/shopkeeper final blocks, and branch predicates;
- hostile survivor hits that qualify through the scroll still print hit text, hypocrisy text, fade text, delete the engraving, clear wait/eating state, and do not newly anger an already-hostile monster.

This remains local to ordinary direct melee survivor hits. It does not extend bullwhip apply force-attacks, wielded potion bash, wielded egg bash, projectiles, two-weapon deferred queues, swallowed/jousting/artifact melee, or broader monster movement/flee decisions.

C anchors:

- `setmangry()` first checks `via_attack`, strict `sengr_at("Elbereth", u.ux, u.uy, TRUE)`, then `onscary(u.ux, u.uy, mon) || mon->mpeaceful`: `nethack-c/upstream/src/mon.c:4265`, `nethack-c/upstream/src/mon.c:4267`, `nethack-c/upstream/src/mon.c:4270`.
- Qualifying hypocrisy prints the message, applies the high-record or low-record alignment penalty, optionally prints the fade message, and deletes the engraving: `nethack-c/upstream/src/mon.c:4271`, `nethack-c/upstream/src/mon.c:4280`, `nethack-c/upstream/src/mon.c:4282`, `nethack-c/upstream/src/mon.c:4284`.
- `onscary()` rejects monsters directly resistant to any scare, then human-shaped/unique magical-scare targets, then shopkeepers in their own shop and priests in their own temple before any scare-scroll branch: `nethack-c/upstream/src/monmove.c:249`, `nethack-c/upstream/src/monmove.c:259`, `nethack-c/upstream/src/monmove.c:266`.
- The scare-monster scroll branch returns true before the final written-Elbereth restrictions: `nethack-c/upstream/src/monmove.c:278`, `nethack-c/upstream/src/monmove.c:280`.
- The final written-Elbereth block is where blind monsters, peaceful monsters, minotaurs, Gehennom, and endgame branches are rejected; the scroll branch is intentionally above that block: `nethack-c/upstream/src/monmove.c:295`, `nethack-c/upstream/src/monmove.c:299`, `nethack-c/upstream/src/monmove.c:302`.
- C's shopkeeper and priest residency helpers are `inhishop()` and `inhistemple()`: `nethack-c/upstream/src/shk.c:1039`, `nethack-c/upstream/src/priest.c:161`.

## Tests Added

Focused direct-melee coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- hostile blind goblin on exact `Elbereth` plus a hero-square scare-monster floor scroll feels hypocritical, deletes the engraving, and leaves the scroll on the floor;
- scare-monster scroll plus nonexact `Elbereth!` does not trigger the hypocrisy branch;
- hostile minotaur on exact `Elbereth` plus a hero-square scare-monster floor scroll feels hypocritical despite minotaurs being rejected by the final written-Elbereth block;
- hostile human-shaped target with the same scroll still ignores the branch because human-shaped magical scare immunity is checked before the scroll.

The focused command keeps the adjacent Elbereth hypocrisy canaries from audit 758.

## Deferred Gaps

- Full `onscary()` breadth outside this direct-melee hero-square scroll hook remains deferred: displacement, `guardobjects`, auditory scare, movement/flee logic, `goodpos_onscary()`, and monster pathing. The direct hero-square altar/vampire subcase is covered by audit 760.
- Full shopkeeper/priest room-boundary edge cases remain broader than the current direct helpers, especially C `inhishop()` boundary semantics and all `inhistemple()` level/room cases.
- Scare-monster scroll pickup/read/dust/shop billing lifecycle remains covered elsewhere in the shop/pickup stream, not this melee hook.
- Branch-predicate bypass through the scroll is implemented by ordering but does not have separate Gehennom/endgame canaries in this slice.
- Blind fade-message suppression, exact `adjalign()` side effects such as Erinys adjustments, full `peacefuls_respond()`, knockback/trap collisions, and special melee helpers remain separate.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "direct hero melee (surviving peaceful target on Elbereth|nonexact Elbereth engraving|hostile vulnerable target on Elbereth|hostile human-shaped target|hostile blind target on Elbereth and scare scroll|scare scroll still requires exact Elbereth|hostile minotaur on Elbereth and scare scroll|hostile human-shaped target with scare scroll)" test/shop-billing-helpers.test.mjs` - 8 pass, 2710 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file pass
- `node --test test/*.mjs` - 2880 pass
- `npm run score` - 44/44 passing
