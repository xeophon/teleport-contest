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

The latest source-driven checkpoint has **4,846 passing tests**, with no
failures, skips or TODOs. All four generated-data/source-inventory checks pass.
These checks establish progress, not whole-game parity or hidden-test success.

All nine object/level timer kinds now share C's deadline ordering, including
newest-first ties, cancellation, object identity, inactive levels, and catch-up.
The main loop advances the clock at C's turn-setup point, then runs intrinsic
expiries, timers, regions and regeneration. Melting under the hero suspends the
remaining queue during controlled teleport, crawl messages, life saving and
wizard death refusals. Saved continuations retain data and resume the same turn.
Eleven live-turn tests cover these phases, slow heroes and prayer invulnerability.
Arrival still needs a complete continuation for timer prompts before the rest
of the destination-level setup proceeds.

Object transfers now preserve live identity for ordinary drop, pickup and
caught items; partial floor/container stacks copy timers; monster inventory
merges and carried-container destruction cancel discarded timers. Some deferred
theft, floor-merge and monster partial-pickup callers remain to be audited.
Sunsword and gold dragon armor now start/stop untimed light through ordinary
wield, swap, removal, dressing, quiver and tool-driven weapon changes. Thirty
new tests cover equipment state, BCU light radii and welded-weapon refusal.
Retouch, invoked-property loss and transformation callers remain unfinished.

Quest dispatch is **56/65 maps**: all 26 fillers and 30/39 named stages.
Monk locate and Tourist locate/goal are newly implemented; nine named start
maps remain. Source-ordered player-monster equipment, first Astral arrival
population and guardian creation are present. Artificial Astral stair entry
and later guardian loss under conflict remain follow-ups.

The last complete recording run, at preceding commit f98b4e1, passed 52/53
public sessions (12,708/12,712 screens, 832,102/832,102 RNG calls) and 12/19
supplemental sessions (3,070/3,346 screens, 137,929/141,728 RNG calls), with
zero worker errors. The four public screen mismatches were in swimming:
messages and hero relocation crossed a More prompt too early. That source
behavior is now fixed and the individual recording matches 73/73 screens and
3,713/3,713 RNG calls. The current full corpora will be rerun after this commit.

Still open across the repository are the broader source-audit gaps below and
in the per-subsystem audit files. Implemented callback kinds or dispatched
maps do not certify every branch in their owning C files. C quirks are retained;
changes to the reference behavior belong upstream.

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
