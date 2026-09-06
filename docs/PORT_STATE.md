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

The port now has 78 JavaScript modules and approximately 172,000 lines;
most handwritten behavior is in `cmd.js`, `allmain.js`, and `mklev.js`. Missing filenames do
not establish missing behavior: many C subsystems live inside these modules.
Runtime entry points are `jsmain.js` for recorded segments, `nethack.js` for
interactive startup, `allmain.js` for turns, and `cmd.js` for commands.
`permonst.js` supplies canonical monster data.

## Latest continuation checkpoint

The latest source-driven checkpoint has **6,554 passing tests**, with no
failures, skips or TODOs. All five generated-data/source-inventory checks pass.
These checks establish progress, not whole-game parity or hidden-test success.

HP/power regeneration now uses canonical property sources, temporary attribute
bonuses, movement/load gates, sleeping regeneration, separate active monster HP
and eel dehydration with source draw order. Power distinguishes extrinsic
magical breathing from an intrinsic source. Fifty-eight new tests cover these
branches and live turn integration. Two wound follow-ups remove empty status
tokens and the C forced More on refused kicks; both affected recordings again
match all 1,547 screens and 179,817 random calls. Zero-HP rehumanization and full turn interruption scheduling remain source work.

The turn now applies all `u_calc_moveamt` load fractions after hero/steed speed.
Moving with a heavy load loses one active HP at the C 30/10-turn intervals;
at one HP, fainting pauses before Constitution abuse and `fall_asleep`. Saved
continuations resume before power regeneration without repeating regions or
HP regeneration, and More input preserves the current turn's movement flag.
Forty-five new tests pass. Combat overexertion and the remaining full
`interrupt_multi` scheduling are separate follow-ups.

Wish delivery now applies `hold_another_object` load, inventory-letter,
fumbling, cursed-loadstone and dangerous-corpse gates. Rejected potion/gold
merges retain the original inventory quantity, and fumbling keeps the incoming
gold identity. Comparison, landing and load feedback have saved continuations
before divine notice; accepted missiles/ammunition follow C's autoquiver gates.
Missing ordinary weapon wishes reuse the class generator's source tables.
Twenty-nine new state tests pass, including save/restore and ignored More keys.
Three fresh C recordings match all 138 screens and 8,270 random calls. Artifact
touch, levitated/swallowed drops and full serial floor effects remain open.
Weapon name/quantity edge cases need a wider pass.
Load status now commits after its report returns, as `encumber_msg` does;
this restores both affected recordings (612 screens and 14,068 random calls).
Coins independently invalidate status in `addinv_core1`, so their new burden
can already be displayed during that pause; the accepted-gold oracle and a
separate ordinary-object test cover that distinction.

Wish stacks now use the common inventory merge gates across weapons, food,
gems, scrolls, potions and candles, including quiver preference, impaired
knowledge, attached data, names and worn stacks. Merging copies knowledge,
names and bypass state, updates weight, and retains the original timer while
cancelling the incoming timer. Rejected split children keep no worn slot.
Wish delivery preserves the generated object pointer so timers remain attached
to the carried object. Wizard wishes temporarily suppress verbose output;
ordinary wishes retain C's verbose stack totals. Exact real gems bypass the
namedesc roll and receive their C initialization. Forty-eight new state tests
and a fresh 189-screen/2,772-call C recording pass. Globs, general object
knowledge/observation, full floor/monster merge predicates and the remaining
addinv intrinsic side effects still require source passes.
Amulet observation and the worn-item discovery view now share type identity,
so repeated sightings do not duplicate a row or suppress another amulet type.
Four new tests pass; the four affected recordings again match all 1,742 screens
and 241,544 random calls.

Effective attributes now share `attrib.c:acurr` and `acurrstr`: base, equipment
and temporary values, source clamps, power gloves, dunce caps, Ogresmasher and
Charisma form overrides. Calculations across combat, spells, regeneration,
digging, shops and status use that owner. Power gloves preserve changes to
base Strength, and spell accuracy uses Dexterity. Carrying capacity now applies
compressed Strength, monster weight/size, strong mounts, wounded sides, flight
and delayed levitation boots. Fifty-two new source-state tests pass; a fresh C
recording matches all 119 screens and 2,949 random calls. Attribute mutation and the remaining combat branches still need source passes.

Wound producers now share `do.c:set_wounded_legs`, preserving base Dexterity,
accumulating sides and extending a shared timeout. Healing restores temporary
Dexterity before feedback and clears wounds afterward. Timeout healing retains
a saved continuation before object timers/regions and stops occupations after
load feedback. Mounted healing, petrification and actual remaining encumbrance
follow their C gates. Twenty-nine new tests pass; a fresh ordinary C kick/wait
recording matches 23 screens and 3,097 random calls. Message suspension inside
wound-producing attacks and other general intrinsic expiry order remain open.

All nine object/level timer kinds now share C's deadline ordering, including
newest-first ties, cancellation, object identity, inactive levels, and catch-up.
The main loop advances the clock at C's turn-setup point, then runs intrinsic
expiries, timers, regions and regeneration. Melting under the hero suspends the
remaining queue during controlled teleport, crawl messages, life saving and
wizard death refusals. Saved continuations retain data and resume the same turn.
Fourteen live-turn tests cover these phases, slow heroes, prayer invulnerability,
blocking monster messages and resumption after timed life saving.
Arrival now suspends its remaining setup through those timer prompts too,
including stairs, portals, saved games, quest rejection and main-loop input
(17 new tests). Full collision/region/shop/spot-effect order remains unfinished.

Object transfers now preserve live identity for ordinary drop, pickup and
caught items; partial floor/container stacks copy timers; monster inventory
merges and carried-container destruction cancel discarded timers. Deferred theft, floor merges and monster partial pickups now preserve or split
timers through the shared ownership operations. Monster projectile and landmine scatter splits now copy timers; surviving
missiles retain identity, and destroyed missiles cancel their timers. Burning
oil is extracted before its explosion, preventing self-reignition (seven tests).
Projectile shipping, kicked-stack splitting and terrain destruction now retain
or cancel timers correctly (11 further tests). Upward hero throws now use the
actual detached object, split timers and resume after artifact landings (13
tests). Horizontal throw/fire transfers remain.
Sunsword and gold dragon armor now start/stop untimed light through ordinary
wield, swap, removal, dressing, quiver and tool-driven weapon changes. Thirty
new tests cover equipment state, BCU light radii and welded-weapon refusal.
Explicit wield/invoke now use source touch/retouch predicates, damage and
refusal, including death/life-saving continuation (42 new tests). Invoked conflict/invisibility now clear on inventory detachment, with cooldown,
messages and independent property sources retained (27 new tests). Other touch
callers and transformation retouch remain unfinished. Heart of Ahriman drop and
invocation now follow C's floor-first special case, cooldown rules, independent
sources and suspended water/lava/trap landings (22 tests). Other Heart transfers
and the remaining float-down branches are still open. Carried-bag insertion
now waits for Heart landing before insertion or subsequent selections, including
saved prompts and life saving (13 tests). Floor boxes and ice boxes remain.

Spell memory now ages per full turn, restores on relearning, survives amnesia
as an empty retained slot, warns while fading and backfires when forgotten
(21 new tests). Rotten food now gives full cumulative deafness/blindness
timeouts and C blindness/fainting behavior (seven new tests).
Casting now uses C's effective attributes, role/intelligence nutrition costs,
hunger-state transitions, load gate and peak-energy messages (43 tests).
Spell study now follows the C refresh threshold and confirmations, effective
reading ability, Wizard difficulty warnings, lens speed rolls, book fading,
object identity and per-action occupation scheduling (56 tests). New learning
and relearning preserve their distinct wisdom-exercise/message order, including
the separate exercise for discovering a book type. Dull books can cause sleep;
interrupted study retains its object and remaining delay. Adjacent threats use
C's attack, disguise, awareness and visibility gates. General hunger and
distant-monster study interruption still require their source passes;
cursed-book teleport callbacks now have saved landing continuations below.
Prayer completion preserves earned movement, as C's `unmul` does; resetting
it to normal speed delayed the next spellbook study. The installed C recorder
was checked with an isolated wizard-enabled configuration, and live movement
traces identified that earlier cause. Starting spellbooks also resolve their
shuffled appearance for discovery and dullness checks.

All 33 enabled artifacts now carry their C prices. Shared shop valuation uses
the source buying/selling order and rounding, including artifact multipliers
(52 new tests). Levitation loss follows the floor ball/chain pull and captured
trap pointer, including C's non-pit trap quirk (10 tests). Horizontal throws
and returning weapons retain actual object identities, timers, slots and
saved continuations (18 tests). Pet carrying capacity uses canonical species
data; worn saddles count toward load but do not prevent fetching (five tests).

Cursed books now use current-form HP, half physical explosion damage, source
contact-poison strength and maximum-HP loss, sensory blindness sources and
glove erosion. Thirty new tests include saved life-saving/wizard refusals,
gold ownership and aggravation across the Wizard tower boundary. Failed weapon
returns now suspend landing through death recovery and use source low-HP
warnings (20 tests). Levitation landings now cover hole eligibility, Sokoban
wind damage and self-touch, mounted falls and saved nested landings (30 tests).
Forty new automatic-pickup tests cover full-pile selection, source filters,
object identity, burden prompts, remaining-pile menus, blind corpse contact
and saved death continuations. Float-down and spellbook teleport use this
shared owner; movement and arrival still have older pickup paths to migrate.
Fifteen more returning-weapon tests now cover Mjollnir shock, resistance and
sequential electrical inventory damage with saved per-item death recovery.
Worn-ring property removal is covered below; old aggregate electrical callers remain open.

The cursed-book suite now has 48 tests. Controlled teleport respects level
restrictions, Amulet/tower disorientation, wizard override, shared getpos tips,
saved targeting and landing pickup/death/menu continuations. Non-pit pickup
precedes trap activation; pit pickup follows it. Shared immobility now counts
full turns, correcting recovery for slow and fast heroes. A newly generated
C trace confirms the 80-turn recovery and default unmul message; all 43 screens
and all 3,879 RNG calls now match after porting unseen monster arrow-trap
handling. Ordinary and pet arrow/dart traps share source AC, missile creation,
stacking, life saving and death/drop behavior (13 new tests). Six additional
tests cover clean `#wipe` action cost and preservation of earned movement after
fountain vomiting; the previous scheduler had masked both omissions.

Spell selection now applies C's pre-selection casting restrictions and uses
all 52 casting letters, tty pages, current trained skills, sorting, retained
ordering and full spell-slot swaps. Thirty-four independent tests cover these
branches; two additional freshly recorded C fixtures match all 41 screens,
cursors and RNG calls across sorting/swapping and traditional retry prompts.
C's wizard-only turns-column indexing quirk remains intact. Debug casting now
offers all 41 spells with C's per-page accelerators, bypassing normal casting
gates while using current skills. Two more fresh C recordings verify all 44
screens, cursors and 5,656 RNG calls for debug selection and fatal self-casting;
13 independent tests cover debug gates, saving and direct known-spell calls.
Twenty-four new spell-health tests cover current-form HP, life saving, saved
falling-rock recovery, hearing/vision cures, sickness and permanent blindness
sources; light uses the shared gremlin damage owner, and self-sleep uses C's
shared occupation and combat-wakeup state.
Menu search and the remaining spell-effect continuations still need source work.

Shared ring on/off/gone handling now owns property masks, charged bonuses,
recharging and discovery. Electrical destruction retains the worn object
through float-down, trap/water landings and saved death continuations before
using it up (35 new tests). Shared AC recomputation now uses current-form
base AC, seven armor slots, erosion, protection rings, guarding, intrinsic and
spell protection before C's ±99 clamp (47 new tests). Wear/removal, equipment
changes and polymorphs use this owner; spell protection decays on C's clock.
Startup and per-input recalculation now follow C's cached display boundary.
Dressing retains immediate extrinsics while delaying armor discovery, and
polymorph AC waits for weapon/tool fallout (26 further tests and two fresh C
recordings). Sink/shapechanger/mimic callbacks and older aggregate electrical
consumers remain separate work.

Skill state now initializes all 38 records from C's role maxima, starting
inventory, racial adjustments and initial spells. Training, advancement,
slot gain/loss and drain retain source history and limits; enhancement lists
the actual records and preserves saved selection and wizard advancement.
Normal spells train once after their effects and saved prompts finish, while
forced wizard/artifact casts skip training. Forty-nine tests cover this work.
Projectile and polearm callers now use canonical weapon/dual-wield/riding bonuses and
source practice eligibility. Riding exercises after 100 eligible movement attempts,
including refused pet displacement after tentative movement. Ordinary melee now uses actual weapon identity, trained hit/damage bonuses, raw-damage
practice gates, dual-wield skill, double punches and rounded Strength scaling.
Twenty-three new tests cover this slice (21 failed on the preceding commit).
The full melee effect/continuation pipeline, gifts, amnesia and drain callers
still need their source integration.

The role `#turn` ability now follows C's conduct, chanting/divine rejection,
confusion, monster ordering, resistance, thresholds, fleeing, pacification,
killing and paralysis. Fifty new tests include known-spell fallback for other
roles, saved messages, expulsion, drowning, life saving and pickup. Shared
monster resistance uses canonical species data; synthetic per-instance MR
overrides in older tests were replaced with source-valid species and draws.
Chain lightning now follows the source breadth-first queue, terrain and
peaceful-target gates, strength and energy rules, electrical inventory
destruction, resistance, killing and wakeups. Fifty independent tests
include saved message, item-destruction and life-saving continuations. The
upstream swallowed-casting TODO is deliberately retained.

Reflected rays retain their position, direction, remaining range and current
effect across message prompts and saved death recovery. Hero damage uses the
current body, half spell damage, equipment reflection and resistance memory.
Cold inventory damage is applied separately per shattered stack. Direct
finger-of-death calls preserve C's different death prompt and status snapshot.
A fresh C recording matches all 57 screens and 2,327 RNG calls. Cancelled
directions now clear the previous vertical component, bypass confusion and
publish release feedback before effect RNG; a second recording matches 30
screens and 2,044 calls. Ray messages draw canonical hallucinated blast names
without changing death causes. Complete monster-hit, terrain, monster naming
and other elemental callers remain open.

Normal, extra and full healing potions now use source BCU amounts, overflow,
current-body healing, cures, exercise and wounded-leg rules. Blessed full
healing restores lost levels with C's decreasing restoration ceiling. Level
gains share the human/monster HP and energy operation; startup records level
history. Fifty-five potion tests and a fresh C recording of 101 screens and
2,792 RNG calls cover this work. Nineteen additional tests cover saved quaff
phases, cure and level-gain message boundaries, invalid input, Escape, exactly
one completed turn and worn stack ownership. Other potion families and the
complete racial/intrinsic ability-change operation remain open.

Fire/cold spell explosions now retain each blast, cell, hero inventory stack,
injury and scatter phase through saved message and death prompts. Direct fatal
feedback, resistance observation, invulnerability, role damage and golem healing
follow C order. Fire inventory destruction retains in-use objects through vapor
feedback; confusion, paralysis, sleeping, speed, blindness and healing vapor
resume before their next RNG or status mutation. Lycanthrope water is deferred
to C's second inventory pass. Twenty-one new explosion continuation/review tests
and a fresh C fixture (29 screens, 2,201 RNG calls) cover these branches. Other
explosion elements/callers and aggregate monster-hit effects remain incomplete.

Armor callbacks now keep brilliance, dexterity and cornuthaum bonuses separate
from base attributes, honor cancelled dressing and preserve independent fumbling
sources. Discovery exercises Wisdom once, before attribute bonuses; delayed
removal runs after the turn tail. Effective Dexterity feeds engraving wear, and
physical exercise is suppressed while polymorphed. Thirty-seven focused tests
and a fresh C fixture (81 screens, 2,871 RNG calls) cover these changes. Other
armor callbacks and direct base-attribute consumers still need source review.

Archon blinding gaze now uses source visibility, awareness, range, resistance,
hallucination and cancellation gates, with saved feedback before status RNG.
Twenty-three new tests cover this attack; canonical Eyes blindness blocking
also clears on ordinary removal and covetous theft.

The scripted Sanctum combat sequence and display clock offsets have been
removed. Canonical wizard/cleric spell selection now shares a source owner;
resident monsters and temple entry drive combat and hostility (11 new tests).
Five cleric spell effects and the real Sanctum Amulet now follow C (24 further
tests including spell feedback/visibility). C's paralysis duration also reaches
its damage caller; that executable behavior is intentionally preserved.
Canonical serial attack slots now drive 37 of the 42 magic-casting species,
including physical/cold contact and cleric lightning, with saved inventory,
landing and death continuations (33 new tests). The driver preserves attack
armor rolls, protection, sleeping wakeups, occupation interruption and queued
death-message order. Elemental casting preflight and contact stun, confusion
and paralysis now use source rules for Angel, Asmodeus, Yeenoghu and abbot,
with 41 additional tests. Existing Asmodeus bribery tests now use its C 4d4
claw damage. Canonical special-object theft now preserves target identity,
equipment removal, artifact levitation loss, saved death recovery and monster
pickup before relocation (19 tests). The remaining five caster arrays, polymorph passives,
special weapons and unfinished spell effects require continued source work.
Twenty more tests cover live attack/death turn resumption and shared sleep
state. The main loop parks a suspended attack pass and resumes its remaining
sweep without taking a second movement debit; death messages get C's separate
line. Genuine sleep sets the combat-wakeup timestamp while rotten-food
unconsciousness remains separate. Six further tests cover counted-search and
mixed-actor revival ownership; the arch-lich recording now matches every
screen and all 2,391 RNG calls.

Quest dispatch is **65/65 maps**: all 26 fillers and all 39 named stages.
Knight, Ranger and Rogue starts now execute their source operations, including
map alignment, mimic furniture and saddle ownership (13 new tests). Generated
C map symbols are shared by disguises and flash messages. This dispatch count
does not establish every level-generation branch or seed matches C.
Source-ordered player-monster equipment, first Astral arrival
population and guardian creation are present. Artificial Astral stair entry
and later guardian loss under conflict remain follow-ups.
Fixed teleport-region arrivals now relocate blocking monsters or preserve them
in same-level limbo. Approximate returns retain position/wandering state and
failed placement retries keep their destination (12 tests). Other migration
modes and complete worm/shapechanger/punishment departure remain open.

The last complete recording run, at commit c86eb3f, passed 51/53 public
sessions (11,899/12,712 screens, 809,608/832,102 RNG calls) and 12/19
supplemental sessions (3,067/3,346 screens, 136,092/141,728 RNG calls), with
zero worker errors. These measurements precede the latest turn-rule changes.
The two failing public recordings remain seeds 0116 and 4500; restoring all
passing-session counts does not imply every trace within failing sessions
improved. These measurements do not establish full C behavior.

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
2. **Timers and arrival:** remaining intrinsic expiry ordering and continuations,
   equipment-light transfer callers, and the complete terrain/region/spot-effects arrival
   pipeline. The shared turn boundary and tested timer continuations are implemented.
3. **Quest and artifacts:** remaining level-script branches and artifact invocation/transfer behavior.
   Existing builder dispatch does not itself prove map parity.
4. **Regions and movement:** region callbacks, broader level scripting and
   remaining movement/trap ordering beyond the tested pit paths.
5. **Monster lifecycle:** other migration modes, source population rules for
   some summoning paths, worm growth, and true-form normalization before
   death bookkeeping and XP.
6. **Bones:** unique-monster cleanup and special item handling, fresh ID
   allocation/relinking, invocation-item substitutions and artifact state.
7. **Hero and item state:** attribute mutation, polymorph transitions,
   overexertion, stack knowledge, amnesia/detection details and remaining
   extended command effects. Effective attributes, AC and role turning have source-backed slices.
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
node tools/generate-quest-levels.mjs --check
node tools/generate-defsym.mjs --check
npm run progress -- --baseline .cache/port-progress/sept06/baseline.json
node frozen/playability_runner.mjs sessions
```

The five generated-data/source-inventory checks and `git diff --check` pass. The progress
runner writes `.cache/port-progress/latest.json` and separates test, session,
screen, RNG and worker-error counts. It exits 1 while supplemental recordings
remain incomplete. The local baseline is
`.cache/port-progress/sept06/baseline.json`; final logs are
`.cache/port-progress/sept06/progress-final.log` and
`.cache/port-progress/sept06/playability-final.log`.

Frozen runtime files, recordings and the C reference were not changed by the
conversion. Continue from C rules and general state-based tests; keep
recording answers outside the runtime.
