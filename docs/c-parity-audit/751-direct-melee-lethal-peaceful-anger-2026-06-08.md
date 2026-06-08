# 751 - Direct melee lethal peaceful guard anger

## Implemented Slice

Direct hero melee hits now preserve the C `hmon()` wrapper-tail behavior that snapshots whether a peaceful priest, shopkeeper, watchman, or watch captain should anger the town watch before damage is applied, then runs the guard anger fallout after the hit resolves.

This matters for lethal hits: the killed monster is already cleaned up through `xkilled()`, but the pre-hit peaceful-special snapshot still makes surviving peaceful watchmen and watch captains hostile.

C anchors:

- `do_attack()` reaches `hitum()` and `known_hitum()` for direct hero melee, with force-fight bypassing the safe-monster protection gate: `nethack-c/upstream/src/uhitm.c:462`.
- `hmon()` snapshots guard anger before damage for peaceful priests, shopkeepers, and town watch, then calls `hmon_hitmon()`: `nethack-c/upstream/src/uhitm.c:826`, `nethack-c/upstream/src/uhitm.c:828`.
- Fatal direct hits enter `killed()`/`xkilled()` from `hmon_hitmon()`: `nethack-c/upstream/src/uhitm.c:1908`, `nethack-c/upstream/src/mon.c:3503`.
- After the hit returns, `hmon()` invokes `angry_guards(!!Deaf)` when the pre-hit snapshot requested it: `nethack-c/upstream/src/uhitm.c:831`.
- `angry_guards()` wakes and angers living peaceful watchmen/captains, skips dead guards, and selects visible, approaching, or whistle feedback based on sensing and deafness: `nethack-c/upstream/src/mon.c:5711`.

JS changes:

- Added direct-melee helper predicates for town-watch monsters and peaceful-special guard-anger triggers.
- Added a shared direct-melee town-watch anger helper that mutates living peaceful watchmen/captains to hostile/angry and emits adjacent/approaching/whistle feedback unless the hero is deaf.
- Threaded the pre-hit snapshot through direct melee nonlethal hits, life-saving survivals, and lethal cleanup so the post-hit guard anger is not lost when the attacked peaceful special dies.

## Tests Added

Focused regression coverage in `test/shop-billing-helpers.test.mjs` now asserts:

- direct lethal melee against a peaceful watchman kills the target and angers a surviving adjacent peaceful watchman;
- direct lethal melee against a peaceful shopkeeper kills the target and still angers a surviving adjacent peaceful watch captain from the pre-hit snapshot.

## Deferred Gaps

- Priest-specific `ghod_hitsu()` retaliation, lightning, and divine voice ordering remain a separate direct-melee `hmon()` tail slice.
- The visible/approaching/whistle branches use the current JS visibility model; broader C `canspotmon()` sensory parity remains display/sensing work.
- Broader direct-melee `hmon()` wrapper behavior, including two-weapon sequencing, jousting, swallowed hits, and artifact branches, remains follow-up work.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal tame target records pet kill side effects|direct hero melee lethal same-aligned unicorn applies C guilt luck|direct hero melee lethal peaceful watchman angers surviving watch|direct hero melee lethal peaceful shopkeeper angers town watch by snapshot" test/shop-billing-helpers.test.mjs` - 4 pass, 2694 skipped
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee lethal peaceful watchman angers surviving watch|direct hero melee lethal peaceful shopkeeper angers town watch by snapshot|direct hero melee lethal tame target records pet kill side effects|direct hero melee lethal same-aligned unicorn applies C guilt luck|direct hero melee lethal target uses monster life saving|direct hero melee genocided target consumes life saving|direct hero melee revives shifted vampire|automatic prisoner speech frees prisoner and angers watch" test/shop-billing-helpers.test.mjs` - 8 pass, 2690 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
