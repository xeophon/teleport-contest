# 04 Monsters, Combat, Pets C-Parity Audit

Scope: monster creation and placement, monster turn scheduling, standard movement, pet
`dog_move`, hero/monster combat (`uhitm` and `mhitm`), passive effects,
projectile/object hits, and cross-level follower behavior.

Method: this audit only uses repo-visible upstream C and current JS. It does not infer
private-suite requirements, and it does not recommend hardcoded transcript fixes.

## Upstream C Shape

- Monster creation is centralized in `makemon()` with placement, extinction/genocide,
  extended data allocation, gender, HP, trap knowledge, peacefulness, hidden state,
  inventory, equipment, groups, long-worm tails, strategy flags, appearance messages,
  and occupation interruption (`nethack-c/upstream/src/makemon.c:1147`). Group creation
  is recursive and enforces placement, low-level size reduction, and no peaceful groups
  (`nethack-c/upstream/src/makemon.c:77`). Birth limits and extinction are handled by
  `propagate()` (`nethack-c/upstream/src/makemon.c:957`), and HP/level by `newmonhp()`
  (`nethack-c/upstream/src/makemon.c:1009`).
- Monster position legality is shared through `goodpos()` and `enexto_core()`, including
  hero/monster occupancy, water/lava, walls/passwall, closed doors, scary squares,
  accessibility, boulders, and exclusion flags (`nethack-c/upstream/src/teleport.c:85`,
  `nethack-c/upstream/src/teleport.c:219`). Random monster placement tries invisible
  random squares first, then scans the map (`nethack-c/upstream/src/makemon.c:1075`).
- Turn scheduling separates per-turn distress from movement. `mcalcmove()` handles slow,
  fast, steed gallop, and randomized speed rounding (`nethack-c/upstream/src/mon.c:1124`).
  `mcalcdistress()` handles once-per-turn liquid checks for speed-0 monsters, regen,
  shapechange, lycanthropy, blindness, freeze, and flee timeouts
  (`nethack-c/upstream/src/mon.c:1170`). `movemon_singlemon()` then runs every-turn
  effects, spends movement, handles liquid, equipment, hiding, conflict, and `dochugw()`
  (`nethack-c/upstream/src/mon.c:1211`). `movemon()` iterates safely and frees dead
  monsters after the pass (`nethack-c/upstream/src/mon.c:1324`).
- Monster movement is split across `dochug()` and `m_move()`. `dochug()` handles wait
  masks, waking, engravings, confusion/stun timeouts, fleeing teleport, responses,
  covetous tactics, defensive/offensive item use, mind blasts, weapon wielding, eating,
  movement/attack choice, undirected spells, movement, and post-move ranged attacks
  (`nethack-c/upstream/src/monmove.c:690`). `m_move()` handles trap/eating/hider state,
  `set_apparxy()`, pet delegation to `dog_move`, covetous/priest/shop/guard behavior,
  teleporting monsters, pathfinding, digging, doors, traps, pickup, and hiding
  (`nethack-c/upstream/src/monmove.c:1715`).
- Pets are created with `newedog()`/`initedog()` and tame/peaceful state
  (`nethack-c/upstream/src/dog.c:22`, `nethack-c/upstream/src/dog.c:45`).
  `makedog()` uses `makemon(... MM_EDOG | NO_MINVENT)` for the starting pet
  (`nethack-c/upstream/src/dog.c:217`). Figurines/familiars also go through
  `makemon(... MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG)` and then set the
  familiar outcome (`nethack-c/upstream/src/dog.c:137`).
- `dog_move()` covers hunger death, conflict/steed handling, pet inventory drop/eat/pickup,
  goal selection, `mfndpos`, trap and cursed-object avoidance, pet melee through
  `mattackm()`, return attacks, displacement, ranged attacks, combined move/eat, and leash
  catch-up (`nethack-c/upstream/src/dogmove.c:977`). Its helper stack handles food scoring,
  nutrition, apport, floor inventory, and ranged target scoring
  (`nethack-c/upstream/src/dogmove.c:156`, `nethack-c/upstream/src/dogmove.c:400`,
  `nethack-c/upstream/src/dogmove.c:483`, `nethack-c/upstream/src/dogmove.c:838`,
  `nethack-c/upstream/src/dogmove.c:887`).
- Hero-vs-monster combat uses `find_roll_to_hit()`, `hitum()`, `hmon()`, and the
  `hmon_hitmon_*` family for hit chance, double attacks, weapon/barehand/object handling,
  artifacts, poison, silver, erosion, conducts, shop/guard/priest retaliation, cutworms,
  death, and passive effects (`nethack-c/upstream/src/uhitm.c:365`,
  `nethack-c/upstream/src/uhitm.c:758`, `nethack-c/upstream/src/uhitm.c:819`,
  `nethack-c/upstream/src/uhitm.c:934`, `nethack-c/upstream/src/uhitm.c:1754`).
- Monster-vs-monster combat is centralized in `fightm()` and `mattackm()`. The latter
  handles weapon/ranged attacks, multiattack loops, hidden defender reveal, visibility,
  `mlstmv`, gaze, explosion, engulf, breath/spit, passive `passivemm()`, death/off-map
  results, and helpless cutoffs (`nethack-c/upstream/src/mhitm.c:93`,
  `nethack-c/upstream/src/mhitm.c:293`).
- Passive effects are a first-class combat hook. `passive()` handles hero consequences
  from fire, acid, stoning, rust/corrosion/disenchant, Oracle magic missiles, paralysis,
  cold/mold growth and splitting, stun, fire, and shock (`nethack-c/upstream/src/uhitm.c:5865`).
  `passive_obj()` erodes or drains the attacking object (`nethack-c/upstream/src/uhitm.c:6127`).
- Object/projectile hits are also centralized. `thitmonst()` covers hero-thrown, kicked,
  and applied objects, with distance modifiers, ammo/launcher skill, unicorn gems,
  quest leader special handling, `hmon()`, projectile mulch, `passive_obj()`, heavy balls,
  boulders, eggs, cream pies, venom, potions, taming food, and swallowed cases
  (`nethack-c/upstream/src/dothrow.c:2011`). `ohitmon()` covers non-player projectiles
  against monsters, including mimic reveal, potion hits, damage, poison, silver, acid,
  petrifying eggs, xkilled/mondied, blinding, anger, and object landing/breaking
  (`nethack-c/upstream/src/mthrowu.c:321`).
- Followers move off-level through `keepdogs()`, `migrate_to_level()`, `losedogs()`,
  `mon_arrive()`, and `mon_catchup_elapsed_time()`, preserving exact/approximate arrivals,
  special stair/portal locations, leash behavior, traps/eating/amulet stay-behind rules,
  long-worm state, and off-level hunger/status catch-up (`nethack-c/upstream/src/dog.c:787`,
  `nethack-c/upstream/src/dog.c:887`, `nethack-c/upstream/src/dog.c:303`,
  `nethack-c/upstream/src/dog.c:420`, `nethack-c/upstream/src/dog.c:627`).

## Current JS Shape

- `js/mklev.js` has local placement helpers: `makemon_goodpos()` checks occupancy,
  water/lava, closed doors, accessibility, and boulders (`js/mklev.js:6039`);
  relocation helpers cover scary checks and shop/priest room constraints
  (`js/mklev.js:6077`, `js/mklev.js:6110`). `makemon()` handles random placement,
  occupied/hero relocation, `rndmonst_adj`, genocide/extinction checks, IDs, HP, gender,
  shapechangers, birth counts, special inventory, sleep/invisibility, peacefulness, hiders,
  long worms, groups, and inventories (`js/mklev.js:6653`).
- Starting pets are hand-built by `initializePet()` rather than created through
  `makemon()` (`js/allmain.js:1530`). Figurines call `makemon(... MM_EDOG ...)` and then
  explicitly add pet/edog state for tame outcomes (`js/figurine.js:105`,
  `js/figurine.js:119`).
- `processMonsterTurns()` is the JS scheduler. It filters dead monsters, reverses the
  current monster list, maintains more-prompt resume state, spends `movement`, calls liquid
  checks, then routes pets to `movePet()` and hostiles through adjacent attack, movement,
  and post-move ranged logic (`js/allmain.js:3631`, `js/allmain.js:3826`,
  `js/allmain.js:4310`, `js/allmain.js:4379`, `js/allmain.js:5773`). Turn-tail regen,
  status decrement, movement accrual, and random monster generation occur near the end
  (`js/allmain.js:6548`, `js/allmain.js:6555`, `js/allmain.js:6573`).
- Standard movement lives mostly in `moveMonsterTowardHero()`, with hider staying,
  apparent hero targeting, tengu teleport, ranged balks, item goals, `mfndpos`-style
  candidates, digging, simple monster-vs-monster target handling, movement, doors, traps,
  pickup, and post-move effects (`js/allmain.js:8718`). `set_apparxy`-like targeting is
  spread through the scheduler and movement path (`js/allmain.js:4005`,
  `js/allmain.js:8808`).
- `movePet()` implements a JS `dog_move` analogue: edog defaults, trapped handling,
  inventory dropping, floor eating/pickup, nearby goal selection, unseen-master fallback,
  conflict allowances, `mfndpos`, pet melee and return attacks, trap/cursed avoidance,
  ranged target scoring, movement, combined eat/move, and trap consequences
  (`js/allmain.js:9426`, `js/allmain.js:9456`, `js/allmain.js:9499`,
  `js/allmain.js:9613`, `js/allmain.js:9779`, `js/allmain.js:9811`,
  `js/allmain.js:10131`, `js/allmain.js:10198`, `js/allmain.js:10326`).
- Hero melee is implemented inline in command movement: safe-pet displacement, target
  reveal, to-hit, two-weapon, weapon/barehand damage, tameness loss, death/drop/corpse,
  gas spore handling, luck, and experience (`js/cmd.js:22089`, `js/cmd.js:22219`,
  `js/cmd.js:22316`, `js/cmd.js:22378`, `js/cmd.js:22441`, `js/cmd.js:22519`).
- Monster-to-hero adjacent attacks are inline in `processMonsterTurns()`, including
  per-monster special cases, multiattack support, to-hit, damage, hit/miss messages,
  nymph theft/seduction, engulf-ish handling, brown mold/cockatrice passive follow-ups,
  and death (`js/allmain.js:4379`, `js/allmain.js:4510`, `js/allmain.js:4572`,
  `js/allmain.js:5199`). Pet/monster return attacks are implemented with separate
  one-off blocks (`js/allmain.js:3715`, `js/allmain.js:10086`).
- Passive support exists in fragments: contact petrification helpers
  (`js/allmain.js:2439`, `js/allmain.js:2485`), brown mold passive handling in monster
  attacks (`js/allmain.js:5199`), a deferred brown mold resume mode (`js/cmd.js:25611`),
  and pet avoidance of a small passive-damage set (`js/allmain.js:9799`).
- Monster projectiles are implemented in post-move branches for breath, rocks, launcher
  ammo, thrown daggers, offensive potions, orcish daggers, and darts (`js/allmain.js:5773`,
  `js/allmain.js:5837`, `js/allmain.js:6003`, `js/allmain.js:6143`,
  `js/allmain.js:6200`, `js/allmain.js:6249`, `js/allmain.js:6359`). Hero throw/fire
  handling is command-local and mainly traces a short line, handles cream pies/non-combat
  misses, lands the object, and removes inventory (`js/cmd.js:36860`,
  `js/cmd.js:37035`).
- Follower handling is local to level-change commands. `followsHeroAcrossLevels()`,
  `levelChangeFollowerNearHero()`, and `placeFollowerAfterLevelChange()` carry nearby
  eligible monsters and place them near the hero (`js/cmd.js:2814`, `js/cmd.js:2824`,
  `js/cmd.js:2834`). General level change carries followers from the old level and
  re-adds them on the target (`js/cmd.js:3632`, `js/cmd.js:3746`); stair commands have
  separate pet/water-demon paths (`js/cmd.js:37782`, `js/cmd.js:37896`).

## Concrete Gaps

### Monster Creation And Placement

- `makemon_goodpos()` is narrower than C `goodpos()`: it lacks the shared flag model used
  by `MM_IGNOREWATER`, `GP_CHECKSCARY`, `GP_AVOID_MONPOS`, exclusion zones, accessibility
  nuances, passwall/scary handling for initial placement, and the C random-placement
  fallback scan. JS has scary checks for relocation, but not the same unified placement
  path (`js/mklev.js:6039`, `js/mklev.js:6077`; C `teleport.c:85`, `makemon.c:1075`).
- `makemon()` partially mirrors C but does not visibly initialize `MM_EDOG` itself.
  Starting pets are hand-built, and figurines patch edog/tame state after creation
  (`js/mklev.js:6653`, `js/allmain.js:1530`, `js/figurine.js:105`). In C, `MM_EDOG`
  allocates pet extension data during `makemon()` (`nethack-c/upstream/src/makemon.c:1245`).
- Group creation is simplified. JS reproduces small/large group sizing and recursion, but
  does not share C's `enexto_gpflags()` behavior or full `goodpos()` constraints for
  every group member (`js/mklev.js:6843`; C `makemon.c:77`).
- Initial inventory/equipment is broad but still incomplete relative to C's `m_initinv()`,
  `m_dowear()`, special migrating-object delivery, saddle chance, strategy bit flags, and
  role/quest/demon/minion special cases (`js/mklev.js:6908`; C `makemon.c:1441`,
  `makemon.c:1460`).

### Scheduling

- JS accrues movement at the tail of `processMonsterTurns()` and consumes existing
  movement at the next pass (`js/allmain.js:3826`, `js/allmain.js:6555`). C's model runs
  per-turn distress separately and then safe-iterates current monsters with movement already
  available (`nethack-c/upstream/src/mon.c:1170`, `nethack-c/upstream/src/mon.c:1211`).
  This can be made equivalent, but today the responsibilities are interleaved with prompt
  resume state and command-specific flags.
- C applies `m_everyturn_effect()` before the movement threshold for every on-map live
  monster (`nethack-c/upstream/src/mon.c:1248`). JS has fog-cloud and hezrou-like effects
  in selected movement paths, not a single every-turn hook (`js/allmain.js:3870`,
  `js/allmain.js:5770`).
- C `mcalcdistress()` covers speed-0 liquid checks, regen, shapechange, were-change,
  blindness recovery, freeze recovery, and flee timeout once per turn
  (`nethack-c/upstream/src/mon.c:1179`). JS implements regen every 20 moves and a subset
  of status decrements/movement accrual (`js/allmain.js:6548`, `js/allmain.js:6555`), but
  not a unified distress phase.
- Safe iteration/dead cleanup is more ad hoc in JS. It snapshots/reverses `level.monsters`
  and filters dead entries up front or in branches (`js/allmain.js:3660`), while C
  `iter_mons_safe()` plus `dmonsfree()` is the central cleanup boundary
  (`nethack-c/upstream/src/mon.c:1330`, `nethack-c/upstream/src/mon.c:1340`).

### Standard Monster Movement

- JS movement is functional but not yet the C `dochug()`/`m_move()` phase model. Item use,
  covetous behavior, spell decisions, tactical waits, `m_respond`, engravings/scary checks,
  fleeing teleport, door/dig/trap/pickup/hiding, and post-move attacks are spread across
  scheduler and movement code (`js/allmain.js:3923`, `js/allmain.js:8718`,
  `js/allmain.js:5773`; C `monmove.c:690`, `monmove.c:1715`).
- Monster-vs-monster combat outside pets/conflict is simplified. JS has direct target
  blocks and return attacks in movement/resume paths (`js/allmain.js:3715`,
  `js/allmain.js:9025`, `js/allmain.js:10086`) instead of calling a single `mattackm()`
  equivalent with result flags, `mlstmv`, passives, special attack types, and off-map/death
  semantics (C `mhitm.c:293`).
- Apparent hero targeting is implemented with local `mux`/`muy` heuristics, but not the
  complete C `set_apparxy()` contract for stuck monsters, pets, displacement, invisibility,
  and guesses (`js/allmain.js:4005`, `js/allmain.js:8808`; C `monmove.c:2198`).

### Pet `dog_move`

- JS `movePet()` covers the major visible flows, but pet creation and off-level catch-up are
  outside that model. In C, edog state is allocated at creation and consumed by
  `dog_hunger()`, `dog_invent()`, `dog_goal()`, and `dog_move()` (`dog.c:22`,
  `dogmove.c:362`, `dogmove.c:400`, `dogmove.c:483`, `dogmove.c:977`).
- Pet hunger/nutrition is approximate. JS updates `hungrytime` with fixed increments when
  eating (`js/allmain.js:9525`, `js/allmain.js:10361`), while C uses `dog_nutrition()`,
  food class/race/body-size scaling, apport updates, and starvation/confusion/tameness loss
  (`nethack-c/upstream/src/dogmove.c:156`, `nethack-c/upstream/src/dogmove.c:362`).
- Pet target avoidance is only partial. JS filters passive-damage monsters via a small set
  and HP check (`js/allmain.js:9799`), while C checks `max_passive_dmg()`, floating eye,
  gelatinous cube, touch petrification, leader/guardian/peaceful cases, and ranged-only
  viability (`nethack-c/upstream/src/dogmove.c:1121`).
- Pet melee and return attacks are bespoke JS branches instead of the shared C
  `mattackm()` path, so they miss general attack records, passive result bits, weapon
  handling, gaze/engulf/explosion/breath/spit, and exact return-attack constraints
  (`js/allmain.js:9811`, `js/allmain.js:10086`; C `dogmove.c:1149`, `mhitm.c:293`).
- Leash, steed, tame minion, guardian angel, and conflict behavior are only partly modeled
  (`js/allmain.js:9426`, `js/allmain.js:10387`; C `dogmove.c:1015`,
  `dogmove.c:1046`, `dogmove.c:1322`).

### Combat (`uhitm` / `mhitm`)

- There is no shared JS `hmon()` equivalent. Hero melee in `cmd.js` computes hit chance,
  damage, tame abuse, kills, drops, and XP inline (`js/cmd.js:22219`). This makes it hard
  to reuse C behavior for thrown/applied objects, polearms, traps, polymorphed attacks,
  artifact effects, silver, poison, erosion, passive object effects, shop billing, cutworms,
  priest/guard retaliation, and conduct tracking (`nethack-c/upstream/src/uhitm.c:819`,
  `nethack-c/upstream/src/uhitm.c:934`, `nethack-c/upstream/src/uhitm.c:1754`).
- There is no shared JS `mattackm()` equivalent. Monster-to-hero, pet-to-monster,
  monster-to-monster, and return attacks are separate implementations with different
  formulas and special cases (`js/allmain.js:4379`, `js/allmain.js:3715`,
  `js/allmain.js:9811`, `js/allmain.js:10086`). C uses one result-bit protocol across
  all monster-vs-monster attacks (`nethack-c/upstream/src/mhitm.c:293`).
- Multiattack support exists for monster-to-hero (`js/allmain.js:4510`), but C attack
  semantics are much broader: weapon fallback, `AT_HUGS`, gaze, explosion, engulf,
  breath/spit, passive `passivemm()`, clone/split effects, and off-map interrupts
  (`nethack-c/upstream/src/mhitm.c:392`).
- JS contains useful special cases, but they are transcript-shaped islands rather than a
  C-parity combat surface. Examples include water demon, nymph, soldier ant, straw golem,
  raven, cockatrice, brown mold, and gas spore paths (`js/allmain.js:4387`,
  `js/allmain.js:4990`, `js/allmain.js:5288`, `js/cmd.js:22573`).

### Passive Effects

- JS implements contact petrification and brown mold in selected paths, but C passive
  effects are a general hook called from hero melee, monster melee, and object hits
  (`js/allmain.js:2485`, `js/allmain.js:5199`; C `uhitm.c:5865`, `mhitm.c:572`).
- Missing or partial passive families include acid splash and armor corrosion, fire object
  burn, rust/corrosion/disenchant of attacking objects, Oracle magic missiles, floating eye
  paralysis, gelatinous cube paralysis, yellow mold stun, red mold heat, electric shock,
  golem effects, mold healing/splitting, and `passive_obj()` on projectile hits
  (`nethack-c/upstream/src/uhitm.c:5894`, `nethack-c/upstream/src/uhitm.c:6127`).
- Pet passive avoidance should be driven from the same passive-damage calculator used for
  actual combat. The current `PET_PASSIVE_DAMAGE_MONSTERS` gate is necessarily incomplete
  (`js/allmain.js:9799`; C `dogmove.c:1121`).

### Projectiles And Object Hits

- Hero thrown/fired object handling is not routed through a `thitmonst()` equivalent.
  Current command code traces up to eight squares, handles a few non-combat/cream-pie
  outcomes, lands the object, and spends no shared combat hit path (`js/cmd.js:37035`).
  It misses many C object-hit behaviors: launcher/ammo skill details, unicorn gems,
  leader special handling, `hmon()`, mulch, `passive_obj()`, heavy ball/boulder handling,
  eggs, venom, potions, taming food, swallowed monster cases, and shop billing
  (`nethack-c/upstream/src/dothrow.c:2011`).
- Monster projectile handling is mostly hero-targeted post-move logic. Rocks, arrows,
  daggers, potions, orcish daggers, darts, and breath are separate branches with their own
  to-hit/damage/landing behavior (`js/allmain.js:5837`, `js/allmain.js:6003`,
  `js/allmain.js:6143`, `js/allmain.js:6200`, `js/allmain.js:6249`,
  `js/allmain.js:6359`). C uses shared object-hit/drop behavior for accidental monster
  targets and non-player projectiles (`nethack-c/upstream/src/mthrowu.c:321`).
- Projectile-vs-monster interactions are especially incomplete. JS has an orcish dagger pet
  interception path (`js/allmain.js:6275`), but no general `ohitmon()` equivalent for mimic
  reveal, poison, silver, acid venom, petrifying eggs, blinding, anger, and xkilled/mondied
  across all thrown objects (`nethack-c/upstream/src/mthrowu.c:321`).

### Followers And Migration

- JS carries nearby followers directly between saved/current levels (`js/cmd.js:3632`,
  `js/cmd.js:3746`, `js/cmd.js:37782`, `js/cmd.js:37896`). This covers common nearby pet
  movement but not C's off-map `mydogs`/`migrating_mons` state, arrival modes, failed
  arrivals, or status catch-up (`nethack-c/upstream/src/dog.c:787`,
  `nethack-c/upstream/src/dog.c:303`, `nethack-c/upstream/src/dog.c:420`).
- C follower eligibility includes `levl_follower()`, amulet/wizard behavior, wait masks,
  helpless/steed exceptions, trapped/eating/amulet stay-behind, leash messages, worm segment
  preservation, accessibility migration, and exact old-level migration
  (`nethack-c/upstream/src/dog.c:811`, `nethack-c/upstream/src/dog.c:825`,
  `nethack-c/upstream/src/dog.c:860`, `nethack-c/upstream/src/dog.c:875`). JS eligibility is
  a smaller local predicate (`js/cmd.js:2814`, `js/cmd.js:2824`).
- Off-level pet hunger and tameness changes are not represented by an equivalent of
  `mon_catchup_elapsed_time()` (`nethack-c/upstream/src/dog.c:627`).

## Recommended Slices

1. Create a shared monster placement/lifecycle slice: port the `goodpos()`/`enexto_core()`
   flag model, random-placement fallback scan, `MM_EDOG` initialization, and birth/extinction
   checks into one JS path used by `makemon()`, figurines, random spawns, and groups.
2. Split scheduling into C-like phases: per-turn distress, safe monster pass, every-turn
   effects, movement spending, dead cleanup, and random spawn. Keep prompt resume state at
   the edges of those phases instead of inside each behavior branch.
3. Refactor standard movement around `dochug`/`m_move` phases: wait/wake, distress response,
   item use, covetous/shop/priest/guard hooks, target selection, `mfndpos`, movement,
   doors/dig/traps/pickup/hiding, and post-move ranged attacks.
4. Build shared combat cores before adding more special cases: a JS `hmon()` path for hero
   attacks and object hits, and a JS `mattackm()` path for all monster-vs-monster/pet/return
   attacks with C-style result bits and passive hooks.
5. Move pet combat onto `mattackm()` and then finish `dog_move`: nutrition/hunger,
   apport/drop/fetch, passive-aware target avoidance, ranged target selection, conflict,
   leash/steed/minion behavior, combined eat/move, and return attacks.
6. Add shared projectile/object-hit functions equivalent to `thitmonst()` and `ohitmon()`.
   Route hero throw/fire, monster throws, trap missiles, rolling boulders, and pet
   interception through them so landing, breaking, passive object effects, poison/silver,
   potions, eggs, venom, and anger are consistent.
7. Replace direct follower carry with migration state: model `mydogs`, `migrating_mons`,
   `keepdogs()`, `losedogs()`, `mon_arrive()`, and catch-up elapsed time, then make stairs,
   level teleport, portals, quest ejection, and saved-level restoration use that path.

## Audit Risk Notes

- The current JS has many targeted behaviors that may be valuable and should not be deleted
  during refactors. The slices above should wrap or migrate them behind shared primitives,
  with visible-regression tests for the behavior already implemented.
- The highest-leverage parity gap is not one missing monster special case; it is the absence
  of shared `makemon`, scheduler, `hmon`, `mattackm`, passive, and projectile contracts.
  Adding more isolated branches will make future parity harder.
