# Objects, player magic, and attributes

## Swallowed armor callback follow-up (2026-09-06)

The existing swallowed-cold completion branch now retains the armor-on callback
through the shared pending completion field, following `hack.c:unmul`'s
message-before-`afternmv` boundary. Four tests cover body armor, brilliance,
ignored input and saved state; the 219-screen affected recording fully matches
again. This fixes dropped completion state, not the broader swallowed-cold
damage/timing approximations still present in the turn loop.

## Digging-wand knowledge follow-up (2026-09-06)

`zap.c:weffects/learnwand` now applies Wisdom exercise before digging and type
learning after its effects, preserving instance charge knowledge and the
observable-effect score. Sixteen direct command tests cover repeated use and
sight/hallucination combinations; a fresh C recording covers two actual zaps,
inventory and discovery (45 screens/cursors, 2,104 random calls). This does not
establish full `dig.c:zap_dig` terrain, engulfing or message-continuation parity.

## Shop quote follow-up (2026-09-06)

`shk.c:439-491/3362/4057/4153`, `objnam.c:1645-1685` and
`o_init.c:690-721` now have shared per-type buy/sell quote history in `shk.js`.
Billing, inventory, floor quotes, prompted sales and discoveries use it with
option, type-knowledge and suppressed-price gates. The independent generator
compiles the original C quote functions unchanged for 704 range/buffer cases;
26 added tests cover those answers, actual commands and save restoration.
Canonical object costs replace missing base prices. `shk.c:4275-4360` now shares
the complete intrinsic-price calculation across buying/selling, including the
`eat.c:intrinsic_possible` predicate and correct human/animal werecreature
identity. The C compiler oracle covers 20,796 cases using original C tables.
Twenty-two additional tests cover these answers and live price/billing gates.
Zero intrinsic cost still receives `get_cost`'s minimum charge; partly eaten
food can be quoted while `billable` excludes new pickup/loss charges.
Unknown-gem valuation and serial sale prompt timing remain open.
Reflection shield sightings preserve unknown type state; actual reflection
learning preserves instance enchantment knowledge. Remaining duplicated wand
reflection branches still need consolidation.

## Type-state follow-up (2026-09-06)

`mkobj.c:925-940`, `u_init.c:1208-1250`, `eat.c:1462-1511` and
`mkobj.c:1104-1113` now supply tin contents, stored preparation and Samurai
rustproofing to the shared name owner. Canonical lookup resolves the generator's
class tags and localized names before inventory classification. Discovery
lookup keeps the C class when resolving ambiguous names such as protection.
The 39 added state tests and two fresh C recordings cover these integrations.
The complete 72-recording run reports 47/53 public and 12/19 supplemental
passes, with no worker errors. Four naming/state regressions remain relative
to the earlier checkpoint and are listed in `../PORT_STATE.md`. A separate
Samurai swap probe (`/tmp/samurai-swap-time.recipe.json`) exposes missing swap
turn timing; completion and C artifact/contact gates still need a wield pass.

Reference: `nethack-c/upstream` commit `16ff59115315917b93185d026aeefea06db9b0f4` (NetHack 5.0.0). This partition contains 31 C translation units. Each has a source-body inspection below and an identified JS owner. The inspection is of the named functions/slices, **not every branch of these 31 files**. Functions outside those slices remain unverified. A mapped owner, matching name, or passing recording does not establish implementation completeness.

The main ownership issue is that most player behavior lives in `js/cmd.js`, with initialization and turn processing in `js/allmain.js`. There is no one-C-file/one-JS-file relationship. Monster species also have both canonical `permonst.js` records and runtime records with different field names; a predicate tested against one representation does not establish the other representation works.

## File-by-file inspection

All C paths below are relative to `nethack-c/upstream/src/`. “No new gap established” means the inspected slice did not establish an omission; it is not a completeness claim. Test references identify actual assertions read, rather than inferring coverage from file names.

| C file and inspected body | JS owner / reachable path | Finding and test evidence |
|---|---|---|
| `apply.c:2259` `use_unicorn_horn`, plus towel branches at 130 | `cmd.js` `rhack` → `applyObject`; `figurine.js`, `dig.js` own other applications | Unicorn horn was selectable but reached the generic “Nothing happens” branch. C collects seven timed troubles, randomizes their order, limits cures by blessing, and has seven cursed outcomes. Horn continuation is tracked below. Towel slice was read but not exhaustively compared. |
| `artifact.c:1726–2226` invocation selection, cooldown, powers and property toggles; `898` touch and `2508` retouch | `artifact.js` → `cmd.js` invocation prompts and common combat/terrain operations; `flash.js` shared camera/Sunsword flash | **Continuation in progress.** Actual inventory selection, healing/energy arithmetic, ammo creation, banishment, portal selection, recharge/untrap cancellation, property toggles and expert storm dispatch are implemented; `artifact-invocation.test.mjs` has 39 command tests. Sunsword/camera flash now shares direction impairment, resistance, waking/blinding, temporary illumination cleanup, mimic/tail handling, gremlin death/life saving, vertical light and camera photograph/experience state (`artifact-flash.test.mjs`, 36 tests). Grimtooth now creates owned venom and uses the shared ordinary venom throw operation for direction impairment, range/recoil, swallowed and vertical throws, collision/breakage, canonical resistance, and hero kill/life-saving/experience handling (`artifact-venom.test.mjs`, 35 command tests; C `artifact.c:2026`, `dothrow.c:1510/2019/2256`, `zap.c:3877`). Sunsword wield/swap/unwield, replacing a weapon through apply/fireassist, quivering and inventory removal now activate or extinguish its untimed light; gold dragon armor activates after dressing and extinguishes after removal/destruction, with BCU radii/adverbs and blindness behavior (`artifact-equipment-light.test.mjs`, 30 tests; C `wield.c:95/169`, `do_wear.c:887–964`, `light.c:882–932`). Explicit wield and invoke now share C touch/retouch alignment, role-gift startup adjustment, racial/class banes, silver-hatred predicates, antimagic and half-physical damage, polymorph HP handling and carried-item refusal. Fatal touch suspends before exercise/removal and resumes once after life saving or wizard refusal; refused worn objects use immediate removal and extinguish artifact light (`artifact-touch.test.mjs`, 42 command tests; C `artifact.c:87–111/898–971/1006–1040/2508–2590`, `steal.c:213–290`). Invoked conflict/invisibility now turn off after inventory detachment through the same property operation as `arti_invoke`, bypassing retouch, starting cooldown once and preserving current independent sources. Drop, container and deferred theft callers report the loss messages (`artifact-property-loss.test.mjs`, 27 tests; C `invent.c:1356–1409`, `artifact.c:880–884/2179–2227`). Heart of Ahriman drop now implements the source floor-before-hero-landing exception without cooldown; ordinary deactivation retains cooldown. Shared landing handles current levitation sources, blocked levitation, resumed flight, swallowed/trap exclusions, water/lava and fatal-trap continuations, and one-turn command accounting across water cursor input. Punishment now pulls the hero and chain to the floor ball over pools, pits and holes before water/trap effects, preserves C's retained trap-pointer branch, and rechecks hiding under the moved chain (`artifact-levitation.test.mjs`, 45 tests; C `artifact.c:2236–2259`, `do.c:758–773`, `trap.c:4024–4184`). Carried-bag insertion and upward hero throws now share awaited inventory detachment: ordinary Heart loss starts cooldown, finishes landing before insertion/toss effects, and preserves detached object identity through saved water/death prompts. Bag selections retain their next entry and spend one turn across continuation; ring and timed intrinsic sources prevent landing (C `pickup.c:2558–2715`, `invent.c:1403`, `dothrow.c:toss_up`; upward projectile tests are in `object-timer-transfers.test.mjs`). Floor boxes and ice boxes now continue the same detached object through landing, light snuffing, shop sale, freezing/explosion and insertion; saved partial selections and y/n/a/q sale responses preserve order, with separate cash and credit acceptance. Fuel-relative ages stay unchanged while other ice-box ages use moves-age, including negative frozen Heart cooldowns (`artifact-container-levitation.test.mjs`, 39 tests; C `pickup.c:2558–2715/2783`, `apply.c:1472–1522`, `obj.h:388`). All 33 enabled canonical artifacts now retain their C intrinsic costs; buying and shop quotations share the same charisma, identification, clothing and anger adjustments with the artifact multiplier applied after rounding, while selling applies the source quarter-value before enchantment and buyer discounts. Named and numeric identities, every artifact cost and live Heart-to-container sale are covered (`artifact-pricing.test.mjs`, 52 tests; C `include/artilist.h`, `artifact.c:2309`, `shk.c:2877/3148/4319`). Sokoban float-down now applies wind damage and shared corpse selftouch before trap activation, with saved wind/riding/petrification continuations, canonical corpse and weapon identities, glove-dependent post-survival unwielding, and golem transformation. Mounted falls reuse the common dismount operation, preserve damage-before-wounded-legs ordering, then run nested W_SADDLE landing without duplicate wind; flying mounts suppress liquid effects. Hole/trapdoor eligibility precedes trap revelation and escape RNG (`artifact-landing-source.test.mjs`, 30 tests; C `trap.c:3844–3910/4024–4184`, `steed.c:572–815`). Remaining: touch integration for pickup/apply/swap and whole-equipment retouch after transformations/alignment changes; complete equipment-off property fallout including levitation landing; Heart levitation loss during remaining inventory transfers; remaining check_here decoration/engraving feedback and full dismount relocation/terrain parity, and full elevated-drop altar/impact handling; carried artifact extrinsics and remaining property-loss message consumers; full ammo delivery; automatic artifact-light loss message propagation through every caller; full getdir help/mouse UI and shield animations. This is not a whole-artifact-file completeness claim. |
| `ball.c:882` `drop_ball` trap-release branch | `cmd.js` `heroDropAttachedBallAfterThrow`, `heroDropBall…` helpers | Pit/web/lava/bear-trap release branches exist, including leg wound RNG. JS bear-trap injury writes base HP directly; full C `losehp` polymorph/life-saving equivalence remains unverified. Blind glyph ordering and full ball movement are outside this slice. |
| `detect.c:1792` `findit`, initial aggregation and `do_clear_area` call | `spell.js` `spellDetectUnseenEffect`; `cmd.js` scroll detection helpers | **Confirmed geometric omission:** spell detect-unseen examines eight radial spokes for secret terrain, while C traverses a clear area and also invokes `findone` for concealed monsters. Non-spoke secret doors and hidden-monster discovery are not handled by this spell helper. Current generic “hidden passage” message also omits C's discovered-category counts. No direct non-spoke assertion identified. |
| `dig.c:1548` `zap_dig`, swallowed/vertical/pit setup | `dig.js`; `cmd.js` wand/dig helpers; `spell.js` `spellDigBeam`/`spellZapUpDown` | **Spell path missing swallowed behavior:** C wounds a non-whirly engulfer and expels the hero before map digging; spell beam edits terrain. Spell up-dig also lacks C's air/water/underwater guard. `digging.test.mjs` asserts pick occupations, effort, nondiggable walls, pits, holes and flooding; `spell-effects.test.mjs` asserts horizontal spell dig-depth RNG, not those missing branches. |
| `do_wear.c:1190–1459` `learnring`, `adjust_attrib`, `Ring_on`, `Ring_off_or_gone`; `2473` `find_ac` | `ring.js` metadata; `cmd.js` equipment and electrical destruction; `do_wear.js` shared AC calculation; `armor.js` armor bonus | Normal ring wear/removal and asynchronous electrical destruction share property masks, hand references, stat changes, discovery and awaited levitation landing; recharge pairs removal/replacement. The 35 ring tests and 47 hero AC tests are detailed below. Shared AC now includes current canonical species, all armor, both protection rings, guarding, intrinsic and spell protection, and C’s ±99 clamp. Startup and per-action/input recalculation now share the same owner; the legacy story retains the earlier status snapshot. Further armor completion/property callbacks and other equipment properties remain separate work. |
| `dokick.c:412` `container_impact_dmg` | `cmd.js` `projectileContainerImpactDmg`, kick/throw/drop callers | Normal-container contents breakage, stack splitting, knowledge clearing and shop-debt paths exist. C body and JS helper were compared; no new concrete omission established in this slice. `steed-kick.test.mjs` is about mounted kicking, not evidence for container impacts. |
| `dothrow.c:1976` `should_mulch_missile` | `cmd.js` `shouldMulchHeroProjectileMissile`; monster counterpart in `allmain.js` | Hero helper has C erosion/enchantment chance, blessed `rnl(4)` rescue and hard-gem coin flip. No new gap established in this slice. Projectile death, hit, recoil, return, and delivery branches outside the reviewed slice remain unverified. |
| `eat.c:325` `obj_nutrition`, 338 `adj_victual_nutrition` | `cmd.js` `foodObjectNutrition`, `adjustedDelayedFoodBiteHunger`; `allmain.js` eating ticks | Lembas elf/orc and cram dwarf per-bite adjustments match the inspected formulas. Corpse/glob nutrition and interrupted eating require further cross-path review. No whole-eating coverage claim. |
| `engrave.c:120` `wipeout_text` | `mklev.js` `wipeout_text` → random engraving generation/erosion; `cmd.js` engraving commands | **Unported function mode:** JS accepts only text/count and always consumes RNG; C also supports a deterministic nonzero `seed` mode. JS random mode follows character/substitution draws. `castle-wishing-engraving.test.mjs:39` asserts an unrevealed castle Elbereth engraving, not seeded erosion. Reachability of a nonzero-seed caller still needs tracing. |
| `explode.c:118` engulfer message helper; `194–230` `explode` setup | `explode.js` shared fire/cold kernel; `spell.js` and `cmd.js` spell/artifact consumers; separate oil, scroll and wand helpers | Fireball and skilled fire/cold target selection and multi-blast effects are implemented, with source-derived explosion and sensed-target tests detailed in [the monster audit](monsters.md#hero-spell-explosions-and-survival-checkpoint). Remaining work includes serial hero-death/multi-blast continuation and full parity for other explosion types and callers. The setup inspection does not establish all explosion branches. |
| `invent.c:814` `merged` age/quantity/knowledge portion | `mklev.js` `mergeStackableObject` → `add_to_container`/`add_to_minv`; `cmd.js` inventory merges | **Knowledge merge omission:** shared JS helper merges age/name/quantity and cancels source timers, but does not combine differing `known`, `rknown`, `bknown` as C does. Existing `mklev-container-merge.test.mjs` assertions cover age, species, food state, names and merge gates; none establish knowledge propagation. |
| `lock.c:1103` `doorlock` secret-door and locking setup | `cmd.js` `spellDoorlock`, wand helpers, pick-lock command; `spell.js` beam caller | Source secret-door behavior, Rogue doorway and obstruction branches were inspected. Separate wand/spell entry points exist; full cross-path equivalence is unverified. `spell-effects.test.mjs` stubs `spellDoorlock`, so its beam tests cannot prove actual door semantics. |
| `mkobj.c:1389` `start_corpse_timeout` | `mklev.js` object creation; `cmd.js` corpse revival; `ice.js`, `egg_timers.js`, `allmain.js` timers | C selects rot/revive/zombify with rider/troll special handling. Creation/timer owners are present; no new concrete omission established without a fuller corpse timer trace. `egg-timers.test.mjs` asserts nested/buried/migrating egg handling, which does not establish corpse timeout parity. |
| `music.c:196` `charm_monsters` | `cmd.js` `charmMonstersWithMagicHarp` and instrument application | JS routes harp targets through scroll taming; C performs TOOL_CLASS resistance first and has a swallowed-distance override plus a shopkeeper exception. JS helper lacks the swallowed-distance override. Resistance equivalence through `tameMonsterWithScroll` remains unverified. |
| `o_init.c:454` `discover_object` | `o_init.js` appearance initialization; `cmd.js` `learn…`/discovery helpers | C combines encountered/known discovery, Samurai names, wisdom exercise and gem billing refresh. JS has distributed learning paths rather than this common operation. Some exercise branches are tested (`misc-effect-rolls.test.mjs:209` genocide discovery); centralized equivalence, encounter state and gem pricing were not established. |
| `objects.c:32` `objects_globals_init` (entire 38-line file) | `o_init.js`, `const.js`, `mklev.js` and `cmd.js` object tables | C copies tables generated from `include/objects.h`; JS uses multiple tables. Entire wrapper read; full `objects.h` field-by-field metadata comparison was **not** done here. Monster-table tests do not cover object-table completeness. |
| `objnam.c:2836` `makeplural` prefix/pronoun/compound portion | `cmd.js` object display, `pluralizeMonsterName`, wish parsing; `mklev.js` object display | Multiple JS formatters and wish singularization paths exist. No full pronoun/compound comparison established. `wishing.test.mjs` asserts plural money, plural ration foods, pair-of-lenses and quantity gates; those assertions cover those inputs only. |
| `pickup.c:2488` `mbag_explodes` | `cmd.js` `magicBagExplodesWithObject` → insertion | JS preserves empty cancellation/trick exemptions, depth-dependent chance and recursive contents. No new gap established in this slice. Scatter, loss billing, pickup burden and quantum containers remain outside the inspected body. |
| `polyself.c:1421` `dobreathe` | `cmd.js` extended-command dispatch, polymorph helpers; `fire_breath.js` | C charges 15 energy and routes self/directional breath using the form's attack. JS `#monster` dispatch still uses generic form messages for some abilities; complete breath-energy/direction routing was not established. Polymorph equipment AC now uses the shared calculation described under `do_wear.c`; other transformation behavior remains separately scoped. |
| `potion.c:2122` `mixtype` | `cmd.js` `mixtypePotionResultName`, dip neutralization helpers and potion commands | Healing quaff effects and lost-level restoration use shared HP/property/level operations, with 55 effect tests, 19 serial continuation tests and a fresh C oracle; details and limits are below. Potion-potion recipe helper matches the inspected healing/gain/fruit/enlightenment cases and RNG. Horn/amethyst dip neutralization lives elsewhere. No complete quaff/throw/breathe/alchemy equivalence claim. |
| `pray.c:2414` `doturn` | `pray.js` and `cmd.js` saved `#turn` command; `offer.js` sacrifice; `spell.js` separate spell | Priest/Knight checks, monster iteration, resistance, destruction/pacification/fleeing, spell fallback, recovery and engulfing-vampire release now have 50 source-derived tests. See [the monster audit](monsters.md#priest-and-knight-undead-turning) for implemented scope and remaining branches; this does not establish all prayer or sacrifice behavior. |
| `read.c:1020` `forget` | `cmd.js` `amnesiaScrollEffect`, `loseAmnesiaSpells` | **State omission:** JS consumes the skill-drain `rnd(3/5)` but does not apply `drain_weapon_skill`; it resets `meverseen` only for current-level monsters, not C's migrating chain. Spell forgetting is separate and present. No direct skill-loss/migrating-memory assertion identified. |
| `sit.c:358` `lay_an_egg` | `cmd.js` `sitLayEgg`/`createHeroLaidEgg`; `egg_timers.js` | Sex, hunger, aquatic spawning and eel refusal branches exist. No new gap established in these guards. Existing egg timer tests verify lifecycle cases, not all player laying branches. Throne effects were not comprehensively compared. |
| `spell.c:1419` fireball/cold branch of `spelleffects`, direction handling | `cmd.js` casting menus/cost/failure; `spell.js` effects; `explode.js` fire/cold kernel | Fireball explosions and skilled fire/cold target selection and 2–9 blasts are implemented. Lateral cold/death and immediate-spell continuations are described below; current casting and hero-effect checks are documented in [the core audit](core.md). Serial hero-death and multi-blast continuation, swallowed rays and complete environmental equivalence remain separate work. Isolated dependency tests alone do not establish command-path parity. |
| `u_init.c:1118` `ini_inv_mkobj_filter`, substitution helper | `allmain.js` `initInventoryObject`/`iniInv`, `roles.js` | Random class exclusions, no-create state, spell discipline checks and racial substitutions have JS owners. No new concrete omission established in inspected slice; C's 1000-try pancake fallback and all role/race item combinations need dedicated comparison. |
| `write.c:14` `cost`, 55 `write_ok` | `cmd.js` `MARKER_SCROLL_INK_COSTS`, marker paper selection / `finishMarkerWriting` | Inspected base scroll costs and blank-paper preference are represented. Spellbook level cost, charges, failed writing and description completion were not exhaustively checked. No new concrete omission established in inspected slice. |
| `zap.c:160` `bhitm`, 3150 `cancel_monst`, 3431 `weffects`, 4238 `zhitm`, 4780 beam loop, 6100 `resist` | `spell.js`; `cmd.js` wand/item helpers; `ice.js`; shared deaths in `cmd.js`/`monster_death.js` | Largest inspected slice. Fixed lethal immediate spells bypassing death, incorrect cancellation, message-only cold/death rays and missing shared harmful-spell monster response. Remaining: monster-inventory `unturn_dead`, swallowed ray handling, full hero ray damage/life saving and object/pile cancellation equivalence. |
| `fountain.c:558` `wash_hands`, 582 sink conversion | `fountain.js`, `cmd.js` fountain/sink dip dispatch | C clears slippery hands and applies water damage to gloves, counting either as successful use. Fountain module and dip dispatch were located; an equivalent empty-hand command route was not established. No absence inferred solely from helper names. Remaining fountain cases unverified in this pass. |
| `attrib.c:317` `poisoned` through damage branches | `cmd.js` `applyChestTrapPoison` and projectile poison; `allmain.js` attacks | Chest trap helper models resistance, deadly-poison dice, CON loss and gas-cloud wet-towel reduction. C uses HP maximum/scaled-loss helpers; JS direct HP writes require further polymorph/minimum-max-HP comparison. Other attribute functions remain unverified. |
| `exper.c:85–169` `experience` | `exper.js` `monsterExperienceValue`, re-exported by `cmd.js` → `recordVanquished` / live kill XP; `mhitm.js` `findMac` | **Inspected arithmetic now ported:** equipment AC, speed, attack/damage bonuses, extra-nasty and level>8 bonuses, eel drowning, mail daemon override and repeated revived/cloned kill discounts. Source-derived XP tests cover numerical boundaries and actual force-bolt kills; details and the separate true-form death gap are below. The later healing continuation also inspects and reuses the HP/energy/history part of `pluslvl`; complete `adjabil`, debug level-down and remaining experience functions are not claimed complete. |

## Ring equipment and electrical destruction

C `do_wear.c:1190–1459` now supplies a shared ring on/off operation for normal
`P`/`R`, charged-ring recharge and asynchronous electrical inventory damage.
The 28 ring definitions retain their source property and stat identities.
Canonical hand pointers and property source masks change before effects;
paired rings, intrinsic levitation, boots and invoked Heart sources survive
removal of an independent ring. Attribute, accuracy, damage and protection
bonuses reverse exactly once. Source discovery distinguishes observable
attribute changes, saturated attributes, known zero enchantments, and the
accuracy/damage rings which do not reveal enchantment merely by being worn.
Terrain-blocked levitation does not discover the ring.

C `zap.c:5789–6009` removes a worn ring before destroying it and waits for
landing before continuing inventory damage. Mjollnir's failed return and
cleric lightning now use that saved electrical operation. The ring remains
carried but unworn during water, trap death, life saving and wizard-refusal
prompts; destruction and the parent attack resume once afterward.
`read.c:801–833` recharge removes the old stat effect before changing charges
and reapplies the new effect without a wish-enchantment cap.
`electric-ring-effects.test.mjs` has 35 passing tests: the initial 11 failed
before implementation, and six later source-boundary tests failed before
their corrections. Live command tests include saved Mjollnir water/pit
landings and ordinary ring removal over water.

This is a bounded ring-owner port. Ring-on sink `spoteffects`, full float-up
and flight-block synchronization, shape-changer suppression/restart, mimic
blocking and complete monster refresh remain to be integrated. Legacy
synchronous chest and explosion electrical consumers still need conversion
to the saved operation. Other forced equipment removal, normal accessory
on/off properties and canonical property production by all older armor/intrinsic
consumers remain separate work. The shared armor-class calculation follows below.

## Hero armor class

C `do_wear.c:2473–2506` now supplies the shared `do_wear.js:findAc`
calculation. It recomputes from the current canonical form, seven armor slots,
both protection rings, guarding amulet, intrinsic protection and spell
protection before clamping to ±99. Human/beast were-forms retain their distinct
natural AC. `hack.h:ARM_BONUS` is shared with monster armor calculation and
uses the greater of the two erosion values, capped by the armor's base bonus.
Recomputation replaces deltas in the inspected ring/recharge, armor wear/remove,
destruction, erosion, enchantment, polymorph/rehumanization and protection-spell
paths, preserving their existing command continuation boundaries.

C `timeout.c:620/650–662` also supplies spell-protection decay before blindness
expiry, including invulnerability, repeated-message suppression and display-RNG
hallucinated colors. Timer/death resumption does not repeat the decrement.
`hero-armor-class.test.mjs` has 47 passing source-derived tests, including
live commands, paired saturated rings, real polymorph transitions, all armor
slots, source masks and decay ordering. Fifteen cases were observed failing
before their corresponding fixes; the other boundary cases are not claimed
as pre-fix failures. Six older rehumanization assertions now expect naked
human AC 10 instead of restoring an unsupported cached AC 7; their original
cached input remains to test that recomputation uses current equipment.

The startup and timing continuation now removes fixed role AC and the
post-intro overwrite. Internal startup AC is computed from actual equipment,
while the legacy story retains C's pre-discovery status display of AC 0.
`allmain.c:453` recomputation runs after action time and before the next real
input, including commands which use no time; nested prompts and unfinished
messages retain their earlier phase. `setworn` sets armor slots before dressing,
while recalculation follows command time. Ordinary armor enchantment becomes
known at completion, with saved continuation when the finishing message waits
behind More. `polyself.c:887–890` recalculates after armor and weapon fallout:
a retained tool-drop message now keeps the earlier AC until release, then
recomputes all current sources instead of assigning a dragon-specific value.

`hero-armor-timing.test.mjs` adds 26 passing cases. Ten of the initial 20
failed before implementation; six later live/save phase cases failed before
their corrections. Two new C recordings preserve the existing Monk legacy
intro and plate-mail dressing/removal behavior: all 33 screens and 5,032 RNG
calls match. The public seed0108 regression that exposed early polymorph AC
also now matches all 303 screens; no reference output was changed. Three old
accessory-command assertions retain pre-time AC, and the two armor-corrosion
command tests now advance the owning turn before asserting recalculation.

This remains a bounded calculation/timing port. Complete armor-on/off callback
ordering through every message, armor cancellation/interruption, and remaining
legacy producers of intrinsic protection still require source work. Passing
these tests does not establish every equipment property or caller.

## Landing automatic pickup

C `trap.c:4157–4176` now enters a shared `pickup(1)` command operation after
landing traps, excluding air/water planes, swallowing and level changes.
`pickup.c:664–909/930–1010/1803–1894` provides the full-pile selection,
shop ownership, thrown/stolen/dropped/exploding provenance, class and first
matching exception filters. Original object identity, stack/timer splitting,
existing billing and inventory merging remain owned by the shared pickup loop.
Burden y/n/q, scare-scroll naming, fatal corpse contact and the remaining-pile
menu preserve serial completion owners through save/restore before float-down
or another caller continues. `invent.c:4104–4315` supplies pile-limit wording,
blind contact and menu order. The new `artifact-autopickup.test.mjs` has 40
passing tests, including a live moveloop assertion that a saved burden prompt
consumes one turn. Fifteen of the first 20 tests and five of the next eight
failed before their changes. Two old container assertions now include the
source floor description and following insertion message pagination.

This is a bounded pickup/landing port. Older movement and arrival paths still
contain separate single-object pickup implementations. Full decoration and
engraving feedback, every carried-artifact touch refusal/death branch during
pickup, engulfed inventory pickup and all pickup_prinv encumbrance messages
remain outside this checkpoint. Autopickup exception evaluation is supported
for serialized patterns; the complete source exception configuration UI/parser
has not been ported here. Normal ring removal and asynchronous electrical
ring destruction now share landing as described above; remaining equipment
and legacy damage owners still require integration.

## Casting prerequisites and costs

C `attrib.c:acurr`, `spell.c:spelleffects_check/spelleffects`, and
`eat.c:newuhs` now govern effective casting attributes, the overtaxed load gate,
Wizard nutrition reductions, detect-food exemption, the three-point hunger
floor, positive hunger-state transitions and peak-energy failure wording.
`test/spell-casting-costs.test.mjs` adds 43 passing source-derived tests;
20 of the first 26 failed before implementation. The tests also cover equipment
attribute overrides, rock-thrower boulder weight and experience peak retention.
General hunger processing, all energy-peak producers and full occupation
scheduling remain separate source audits.

## Spellbook study continuation

The `spell.c:study_book/learn` continuation now implements the KEEN/10 refresh
threshold and answers, effective intelligence and worn lenses in reading
ability, Wizard warnings, per-tick lens acceleration, read-count fading and
object identity. The main loop calls study once per hero action after the
full-turn loop, including the completing action, so hero speed controls the
number of time phases without duplicating study ticks. Deferred messages keep
C's separate first-learning/relearning wisdom-exercise and memory order.
The 30 new source tests pass; 17 of the first 21 failed before the changes.
One old direct-call shop test now performs C's two delay ticks plus completion.

Dull-book sleep, interruption/restart, disappearance of the current object,
width-dependent completion messages and discovery exercise have since expanded
the study suite to 56 tests. Distant-monster interruption remains incomplete.

The separate cursed-book suite adds 30 tests for `spell.c:cursed_book`,
`attrib.c:losestr/poison_strdmg/setuhpmax` and `wizard.c:aggravate`. Poison
and explosions use current-form HP and saved death continuations; poison
resumes excess-strength damage, maximum-HP reduction, attribute adjustment and
direct HP damage in source order. Tests also cover half physical damage,
fixed abilities, blindness sources, gloves, gold/quiver ownership and the
Wizard tower boundary. Eighteen further tests cover controlled teleport,
restrictions/disorientation/override, saved getpos and landing pickup/death/menu
continuations, and full-turn recovery at slow/normal/fast speeds. The shared
immobility counter now advances in the full-turn tail and holds input until
recovery. C `unmul(NULL)` uses the default recovery message; the live recorder
confirmed it. Complete terrain/region/monster-notice ordering after teleport
and the full random-curse callback still need their own completion audit.

## Implemented spell slice and its evidence

`test/spell-effects-continuation.test.mjs` adds command-path state tests rather than recording edits. Initial 18-case run before implementation had 13 failures. The final 29 cases include lethal force bolt/turn undead/healing against Pestilence; inventory dropping and monster life saving; cancellation resistance, invisibility/cooldown preservation, shapeshifter and were-beast normalization, clay golem death; lateral stone-to-flesh for a stone golem and floor boulder; cold immunity/damage; death immunity, Death absorption, multiple targets and monster life saving; shrieker distance/deafness, Erinys response, and Medusa blindness/resistance/reflection/hero life saving.

These fixes reuse the existing monster death and item-defense helpers. `test/spell-effects.test.mjs`'s isolated dependency mocks were updated for the shared death and wake hooks; its existing RNG assertions are retained. The previously TODO shrieker response test in `test/spell-pet-review.test.mjs` now runs normally. The four spell test files pass **107/107**, with zero skipped/TODO, in the targeted run. This is an assertion count, not a C function/branch coverage percentage.

The spell response tail is shared within harmful immediate spells. It does not yet provide a general `m_respond` API to every attack caller. Self, vertical, swallowed, skilled and environmental variants need separate C-derived cases; a lateral-ray test cannot establish them. Fireball and skilled fire/cold explosions have since gained shared target and blast handling, as documented in [the monster audit](monsters.md#hero-spell-explosions-and-survival-checkpoint); serial death and multi-blast continuation still need completion. No public/extra corpus scores are claimed by this document; the root integration report owns those denominators.

## Unicorn horn continuation

The initial command path accepted the tool but did no curing. `cmd.js:applyUnicornHorn` now collects the seven timed troubles in C order, shuffles before drawing the cure count, distinguishes blessing, preserves cream-only/engulfer/facewear blindness, cures status state and messages, and implements the seven cursed outcomes. Attribute loss, petrification and slime are not horn-curable. Existing sickness/status helpers are reused; sickness cleanup also removes its cause and subtype flags.

`allmain.js:finishMonsterTurnTail` now advances sickness before regeneration, warns at remaining times 7/5/3, exercises CON, pauses under prayer invulnerability, checks food-poisoning recovery, and enters shared death/life-saving handling. A refused explore-mode death clears the expired illness and resumes the interrupted turn. Terminal illness from a cursed horn gets no food-poisoning survival roll. This implements the relevant `timeout.c:323`/692 lifecycle rather than leaving a timer with no consumer.

`test/unicorn-horn.test.mjs` had 20 failures out of its initial 22 command cases before implementation. Its final **34 tests pass**, including the actual monster-turn timeout caller, terminal death, life saving, food-poisoning recovery/failure, hallucinated warning RNG, invulnerability, cure-before-expiry, explore refusal and mixed sickness types when already vomiting. The five spell/horn test files together pass **141/141**. No recordings or expected session outputs were changed.

Remaining adjacent work: a complete C property-bit/intrinsic model is not present, so the horn cure filter uses the represented timeout fields; permanent flags without a timeout remain untouched. Cursed forced vomiting still lacks yellow-dragon self-acid, altar wrath and acidic-form ice melting. All other `apply.c` tools and general `timeout.c` branches still require their own review. The concurrently added `mondata.js` anatomy/locomotion helpers have separate 53-case source-derived tests; that evidence does not establish other polymorph abilities.

## Experience arithmetic continuation

`exper.js` now calculates the inspected `exper.c:85–169` formula from canonical attack codes and species flags, while preserving runtime monster level. Both score bookkeeping and live kill experience use it. `mhitm.js:findMac` uses the shared armor table, enchantment, greatest erosion, guarding amulet and the C AC clamp. C `xkilled` calls `mondead` → `m_detach` → `relobj` before calculating experience, so a killed monster's equipment no longer affects its award; living-monster calculations still include worn armor. Wielded weapons are excluded, and an amulet of magical breathing suppresses the eel bonus only when worn in its amulet slot.

The initial `test/monster-experience-parity.test.mjs` run had **45 failures out of 50 cases** before the formula implementation. The expanded suite passes **64/64**: canonical species including mail daemon, speed 12/13/18/19/24, damage 23/24, numeric attack/damage codes, level 8/9, all repeated-kill discount thresholds for both revived and cloned monsters, worn/carried equipment, amphibious versus merely breathless heroes, and real force-bolt kills with score/count/inventory assertions. The 13 boundary review cases were first run after the fixes and are not claimed as observed failures. A final integration case creates and wears an indexed amulet of magical breathing through the live command path. The separate armor suite passes 12 tests, including comparison with all 84 enabled C armor definitions and a generated guarding amulet; those are not included in the 64 XP tests.

Remaining death-pipeline gap: `mon.c:3112–3136` restores a dead chameleon or werebeast to its true species before recording deaths, and `xkilled` calculates experience afterward at 3672. The shared JS projectile death path still records and awards against the current form. A beast-form wererat, for example, has different attack XP from its human form. This is a distinct missing lifecycle transition, not an omitted term in the newly ported formula. Species identity/count equivalence for all alternate runtime names and other XP callers remains unverified.

## Spell memory and rotten-food continuation

C `spell.c:age_spells/losespells/spelleffects_check` and book completion now
use a per-spell knowledge counter. It ages once per full turn, starts at KEEN,
restores to KEEN+1 during study completion, and remains in its casting slot
when forgotten. Fading warnings and all ten backfire choices execute before
hunger/strength/energy gates. The 21 source-derived spell-memory tests passed
after reproducing lifecycle and casting failures. Casting nutrition/capacity
and the full spell-menu ordering remain separate work.

C `eat.c:rottenfood` now adds full deafness and blindness durations, preserves
the blind-branch random draw, handles Eyes of the Overworld sight, and uses
the floor/saddle/air/water fainting descriptions (seven tests). Timed stoning
and sickness life saving now resume the remaining once-per-turn tail instead
of starting a new monster turn; two new phase tests verify clock, queued burn,
region and spell-memory state. General intrinsic ordering and other fatal
timeouts still need a full source pass.

## Healing quaff and experience restoration

The three healing potion effects now follow `potion.c:1119–1169`: ordinary
healing uses 8 plus BCU-dependent d4s, extra healing uses 16 plus d8s, and full
healing restores a fixed 400 HP. Overflow alone increases maximum HP. They use
the shared `healHero` active-body operation, preserving the separate C rule that
inhaled healing vapor can heal both bodies. Blindness, deafness, vomiting,
sickness, hallucination resistance, physical exercise order, and the distinct
mounted/wounded-leg cure gates now follow those source branches. Consumption
uses the ordinary used-up billing/timer path after the effect and discovery;
discovery grants the actual potion type and exercises Wisdom once when seen.
Canonical sickness and vomiting properties now participate in the shared cure
owner as well as the runtime aliases.

Blessed full healing uses a shared state operation extracted from level gain,
without entering the debug command's message scheduler. It decrements the
restoration ceiling before `pluslvl`, so successive potions recover the C
ceil-half share of multiple drained levels. Startup and actual level gains
produce `ulevelmax` and `ulevelpeak`; drain preserves them, and `newman` adjusts
the ceiling by the source level difference (`polyself.c:337–360`). Gains retain
HP/energy increments, update the inactive human body while polymorphed, and add
a skill slot through the shared skill owner. The source monster-HP increment
consumes its default d8 before species overrides; `pluslvl` then calls
`setuhpmax(mhmax,FALSE)`, which preserves the monster maximum while clamping its
healed HP (`exper.c:309–373`, `makemon.c:986–1008`).

`test/healing-potions.test.mjs` passes 55 cases. The first 45 source-state cases
had 32 failures before implementation; the ten follow-up boundaries and oracle
were added afterward and are not claimed as observed pre-fix failures. Coverage
includes all nine tier/BCU combinations, exact-fill versus overflow, blindness
and deafness sources, illness/vomiting/hallucination cure gates, mounted legs,
both polymorph HP representations, repeated saved quaffs after level drain,
and discovery. A fresh unmodified C recording covers all three blessed tiers,
with 101/101 screens and 2,792/2,792 RNG calls matching. This is a regression
measurement, not a completeness percentage for `potion.c` or `exper.c`.

Healing quaffs now retain an explicit saved continuation across intermediate
More prompts. `make_blinded` changes its timed source after its message returns;
deafness and vomiting change before their messages, and `make_sick` clears type
bits before its relief message but the timeout afterward (`potion.c:137–335`,
`443–468`). Leg healing restores Dexterity before the message and clears wound
properties afterward (`do.c:2449`). Level restoration pauses before gain RNG at
the experience message, then after HP/energy/level changes at Welcome; ability,
skill-slot and restoration-history changes follow that boundary
(`exper.c:309–373`). Discovery, billing and consumption remain after the effect.
Worn singleton potions lose their equipment references before drinking; worn
stacks split the opened item while the remaining stack stays equipped.

`test/healing-potion-continuation.test.mjs` passes 19 cases, including saves at
different cure boundaries, strict terminal-width message fitting, Escape and
invalid input, level/skill ordering, exactly-once dice, equipment identity, and
one completed turn through the live movement loop. The initial 13 cases had
12 failures before implementation; the six follow-up cases expand boundaries
and are not counted as that initial pre-fix measurement.

Remaining: full potion command preflight (including bottle occupants), serial
effects for other potion families, complete `adjabil` racial and intrinsic
transitions, debug level-down scheduling, and remaining throw/vapor branches.
Regaining sight still lacks the complete `toggle_blindness` →
`learn_unseen_invent` → `addinv_core2` operation: observation of inventory
acquired blind, including Archeologist scroll messages/discovery, needs its
shared source owner rather than a healing-only exception (`potion.c:338–363`,
`invent.c:1025–1052`, `2750–2778`). The existing death pipeline's restoration of
a monster's true species before XP remains a separate gap. This increment does
not claim those functions or files are complete.

The armor timing suite now passes 28 cases. Ordinary dressing records
`chargeKnown` separately from type discovery: C reveals an item's enchantment
without automatically identifying shuffled fumbling boots or telepathy helms.
The source-derived regression tests retain their appearances in inventory, and
the unchanged public seed0014 recording again matches all 714 screens. Armor
property callback ordering beyond the previously bounded timing changes remains
unfinished.

## Effective attributes and carrying capacity

`js/attrib.js` owns `attrib.c:acurr` and `acurrstr`. Equipment overrides preserve
base attributes; every scalar calculation previously reading base attributes in
command/turn code now uses effective values. Spell hit chance uses Dexterity.
`hack.c:weight_cap` now handles exceptional Strength, monster body weight/size,
nymphs, strong mounts, levitation source timing, flight and wounded sides.
The 52 source-state tests cover saved equipment, loss while wearing power
gloves, life saving with Ogresmasher, combat/spell/digging consumers and capacity
boundaries. The fresh C equipment oracle matches 119 screens and 2,949 RNG calls.
Full attribute mutation and wounded-leg production remain separate work.

## Artifact wish contact continuation (2026-09-06)

C `invent.c:1208-1320 hold_another_object` now calls shared
`artifact.c:908-982 touch_artifact` behavior in wish delivery. The incoming
object is temporarily on the floor, with saved blast/refusal and damage
continuations. Fatal feedback finishes before the death prompt; revival resumes
before Wisdom abuse without rerolling generation or damage. Refusal drops
without an Oops; polymorph reversion drops after its own feedback. Contact
permits the C silver/bane cases that the later retouch handling operation
rejects. Divine notice follows the complete holding operation.

The shared routine has eight additional tests, the command integration has
thirty new state tests, and three unchanged-C recordings match 73 screens
and 8,208 random calls. The recordings include accepted contact, fatal contact
with wizard refusal, and a refused quest helm. Source base-type descriptions
(`objects.h`, `objnam.c:xname`) and possessives (`hacklib.c:s_suffix`)
are retained while artifacts remain unidentified. Full artifact discovery
and personal-name formatting, contact integration in pickup/apply/swap,
carried intrinsic effects, and general serial drop/life-saving effects remain
open; these tests do not establish whole-artifact-file parity.
