# Port state and next work

Source audit: 2026-09-06. Reference: NetHack 5.0.0, submodule commit
`16ff59115315917b93185d026aeefea06db9b0f4`.

Upstream `davidbau/teleport-contest` main at `364e9d6` was merged first in
`995c7f0`. Verified conversion work is being committed in successive checkpoints.

## Audit scope

The [source audit](c-source-audit/README.md) assigns all 130 C translation
units to JavaScript owners and records inspected functions, changes, and
remaining gaps. Its generated inventory covers 250,249 C lines and 5,210
lexical function entries. Those are inventory counts, not proof that every
function or branch has been reviewed or implemented. Three parallel agents
worked through subsystem audits, implementations, new tests, and independent
reviews over several rounds.

The port now has 66 JavaScript modules and approximately 164,000 lines;
about 79% are in `cmd.js`, `allmain.js`, and `mklev.js`. Missing filenames do
not establish missing behavior: many C subsystems live inside these modules.
Runtime entry points are `jsmain.js` for recorded segments, `nethack.js` for
interactive startup, `allmain.js` for turns, and `cmd.js` for commands.
`permonst.js` supplies canonical monster data.

## Latest continuation checkpoint

The latest source-driven checkpoint has **4,785 passing tests**, with no failures,
skips or TODOs, up from 4,309 at the previous checkpoint. Public recordings
remain 53/53 with 12,712/12,712 screens and 832,102/832,102 RNG calls.
Supplemental recordings remain 12/19 with 3,070/3,346 screens and
137,929/141,728 RNG calls; both corpora have zero worker errors. These are
separate measures, not evidence that the whole C port is complete.

This checkpoint adds source-ordered timer queue primitives and live burn
callbacks; lamp/candle/oil thresholds, ownership, save identity and off-level
catch-up; shared object hiding checks; fireball and skilled fire/cold bursts;
and artifact invocation cooldown, healing, energy, ammunition, charging,
untrap, property toggles, banishment and dungeon portals. It also adds ten
named quest maps: Barbarian/Caveman/Healer/Ranger goals and
Caveman/Healer/Knight/Ranger/Rogue/Valkyrie locates. All 26 fillers and 21 of
39 named stages dispatched at that checkpoint. The next group adds Rogue, Monk
and Valkyrie goals, bringing dispatch to 50/65 (26 fillers and 24/39 named
stages), with 15 named maps still absent.

The next group also adds candle/Candelabrum application, timer-preserving
stack splits and merge cleanup, shared camera/Sunsword flash combat, and C
life-saving HP restoration including generated amulets, Unchanging and
fire-resistant paper damage. Its combined suite passes 4,589/4,589. The
recording counts above were last rerun at the preceding 4,520-test checkpoint.

The latest batch puts burn and ice-melt callbacks on the same ordered queue,
including cancellation, inactive levels, restored identity, map flips and
lowered drawbridges. It also expands source-derived spell targeting, camera
illumination, photography records and experience, flash continuation after
life saving, and petrification checks against the correct genocide flag.

The next checkpoint adds egg and figurine callbacks to that queue, including
container/migration behavior, source retry and blocked-hatching RNG order,
genocide cancellation and all creation callers. It also adds ordinary
player-monster equipment for all 13 roles, retaining C's unused armor draws,
plus Samurai locate/goal and Wizard goal. Quest dispatch is now 53/65
(26 fillers and 27/39 named stages).

All nine timer callback kinds now use the shared queue. Source-derived
regressions cover silent floor/container decay, wielded-corpse cleanup,
migrating and buried globs, organic container rot, revival failure, repeated
ice adjustment, mixed-family messages and arrival callbacks after delivery.
Grimtooth uses shared venom throwing and projectile death handling. The water
entry operation covers inventory damage, controlled teleport, escape and
disrobing, life-saving continuations and grounded-mounted entry. Its melt
callback API still needs integration with the main loop's prompt continuation.
The same checkpoint adds endgame player-monster equipment and creation armor,
shared role ranks, and first Astral arrival hostility, player population and
guardian-angel behavior. Artificial Astral stair entry and later guardian
loss under conflict remain follow-ups.

Still open in these slices: the main turn's timer phase and prompt resumption,
remaining object destruction/transfer lifecycle,
automatic artifact light activation, remaining artifact powers and property
loss, immediate hero water landing after ice melts, and broader
explosion/hero-death branches. The independent reviews
found and fixed bulk timer cancellation, inactive level ownership, numeric
artifact lights, container weight and hiding state. Source quirks are retained,
including the missing on-time oil hiding recheck in this C revision.

## Previous checkpoint measurements

| Check | Before this continuation | Current result |
| --- | ---: | ---: |
| Tests | 3,865 passed, 1 TODO | 4,309 passed, 0 failed, 0 TODO |
| Public sessions | 53/53 | 53/53 |
| Public screens, including cursor | 12,712/12,712 | 12,712/12,712 |
| Public RNG calls | 832,102/832,102 | 832,102/832,102 |
| Supplemental sessions | 12/19 | 12/19 |
| Supplemental screens, including cursor | 3,070/3,346 | 3,070/3,346 |
| Supplemental RNG calls | 137,906/141,728 | 137,929/141,728 |
| Public playability smoke check | 53/53 | 53/53 |

This continuation adds 443 tests and resolves the existing shrieker-response
TODO. The post-merge starting point was 3,660 passing tests, so the combined
conversion work adds 649 tests. New tests exercise source rules and live
command paths; several suites first reproduced failures before their fixes.
The armor data check compares all 84 enabled C armor definitions. Individual
suite totals overlap the aggregate and must not be added to it again.

Both recording corpora completed without worker errors. The only recording
change in this continuation is 23 additional matching RNG calls in
`seed9007-valley-sacrifice`, which still fails. The seven failing supplemental
recordings have seeds 9006, 9007, 9008, 9012, 9150, 9162, and 9163. The earlier
conversion pass removed non-C arrival and speed overrides; its supplemental
comparison differs from this continuation's baseline for that reason.

The final playability run processed 10,394 moves without failures. There are
also 28 supplemental recipes, which are recording inputs rather than scored
recordings. Animation matching remains a separate incomplete metric. These
results establish progress on available checks, not hidden-test success or
a percentage of the C game implemented.

## Previous checkpoint implementations

| Area | Source behavior added or corrected |
| --- | --- |
| Quest generation | The remaining 18 filler maps, generated from ordered C-reference Lua operations. All 26 filler dispatches now exist; with 11 named stages, quest dispatch coverage is 37/65. |
| Hero spell effects | Death and life-saving completion for immediate effects, cancellation, lateral stone-to-flesh, survivor responses, and death/cold ray effects. |
| Monster equipment and magic | Shared armor magic cancellation, cursed weapon retention, striking-wand hits on intervening monsters, and live lich spell effects including armor destruction, psi bolt, stun, cure, haste and invisibility. |
| Returning monsters | Elapsed-time status recovery, feeding/disguise expiry, tameness/starvation, leash release and healing for returning residents, migrants and the Wizard. |
| Teleport positions | Terrain, form, water/lava, drawbridge, boulder and trap exceptions; restricted-region crossing; holding and trap-state reset. |
| Pits | Entry damage/messages, reciprocal conjoined-pit links, movement and explicit climbing, phasing, flying/clinging, large forms, boulder crevices/filling, Sokoban exceptions and hallucinated trap names. |
| Command bindings | A generated C command-key table, source key parsing and precedence, normal and extended dispatch, disabled bindings, and prompt/repeat handling. |
| Unicorn horns and sickness | Cure eligibility and rolls, blessed/cursed outcomes, sickness countdown and warnings, prayer pause, food-poisoning recovery, death and life saving. |
| Light and anatomy | Active object and monster light radii, source positions, circle geometry and LOS; canonical body-part and locomotion language. |
| Experience and armor class | Canonical attack, damage, level, speed and AC bonuses; eel and mail-daemon cases; revived/cloned discounts; worn armor, erosion, enchantment and guarding; generated amulet identity and live kill ordering. |
| Persistence and bones | Stable root references through saved graphs, and source bones-loading eligibility and RNG order. |

The preceding pass also repaired save graph aliases, bones observation
stripping, pet hunger/feeding/life-saving state, lateral drain life,
configuration parsing, monster statuses and riding speed. Its fixed arrival
coordinates, predetermined speed results and artificial xorn speed were
removed. C behavior remains authoritative even when a recording diverges.

Source review also checked non-obvious sequencing: trapped walking reaches
C's pit-climb path with a null destination; kill XP is calculated after
inventory is dropped; monster catch-up status timers stop at one; falling
down stairs rolls damage before pets arrive. These rules are covered by
regressions rather than sample-specific outcomes.

## Remaining source-backed work

The subsystem reports contain source locations, JavaScript owners and limits
for each finding. Major unfinished areas include:

1. **Spells and combat:** remaining ray
   callbacks, directed cleric spells, wizard death-touch/weakening effects,
   and broader attack/damage dispatch.
2. **Timers and arrival:** source ordering between timers, intrinsic expiry, regions and regeneration,
   prompt continuation, automatic light activation, and the complete terrain/region/spot-effects arrival
   pipeline.
3. **Quest and artifacts:** 12 named quest maps and remaining artifact invocation branches.
   Existing builder dispatch does not itself prove map parity.
4. **Regions and movement:** region callbacks, broader level scripting and
   remaining movement/trap ordering beyond the tested pit paths.
5. **Monster lifecycle:** other migration modes, source population rules for
   some summoning paths, worm growth, and true-form normalization before
   death bookkeeping and XP.
6. **Bones:** unique-monster cleanup and special item handling, fresh ID
   allocation/relinking, invocation-item substitutions and artifact state.
7. **Hero and item state:** full polymorph armor-class recomputation,
   stack knowledge, amnesia/detection details and extended command effects
   such as turning undead.
8. **World and interfaces:** Water-plane occupant behavior, remaining vision
   details, configuration symbols and other command/window behavior.

Platform-specific C services can be replaced by browser equivalents. Those
replacements are distinguished from missing game rules in the audit.

## Reproducing checks

```sh
npm test
node tools/audit-c-sources.mjs --check
node tools/generate-command-keys.mjs --check
node tools/generate-quest-fillers.mjs --check
npm run progress -- --baseline .cache/port-progress/sept06/baseline.json
node frozen/playability_runner.mjs sessions
```

The three generated-data checks and `git diff --check` pass. The progress
runner writes `.cache/port-progress/latest.json` and separates test, session,
screen, RNG and worker-error counts. It exits 1 while supplemental recordings
remain incomplete. The local baseline is
`.cache/port-progress/sept06/baseline.json`; final logs are
`.cache/port-progress/sept06/progress-final.log` and
`.cache/port-progress/sept06/playability-final.log`.

Frozen runtime files, recordings and the C reference were not changed by the
conversion. Continue from C rules and general state-based tests; keep
recording answers outside the runtime.
