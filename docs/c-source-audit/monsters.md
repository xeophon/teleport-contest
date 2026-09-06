# Monster and combat source audit

Audit date: 2026-09-06. Source: this checkout's `nethack-c/upstream/src`,
including its NetHack 5.0 changes. This partition comprises the 30 files below
(48,299 source lines). Every file has a runtime ownership mapping; this is **not**
a claim that every function or branch has been verified. The inspected column
names the function bodies or portions compared with runtime call paths. Other
functions in those files remain unverified unless explicitly listed.

The runtime spreads C subsystems across `allmain.js`, `cmd.js`, `mklev.js`, and
smaller modules. A missing same-named JS file does not establish missing behavior.
Recorded-session scores do not measure C coverage. Tests below construct game
state and derive expected behavior from C; no recording or fixture data was added
to runtime code.

## File-by-file ownership and inspected scope

Paths in the source column are relative to `nethack-c/upstream/src/`. `shop tests`
means `test/shop-billing-helpers.test.mjs`; the test names there identify the
individual behavior, not the entire owning C file.

| C source | Function bodies/call paths inspected | Actual JS owners and existing evidence | Remaining verification or confirmed gap |
| --- | --- | --- | --- |
| `allmain.c` | `u_calc_moveamt:112`, movement allocation in `moveloop_core:205-245`, occupation stopping | `allmain.js:processMonsterTurns`, movement tail; `hero-movement-parity`, `mhitm-status`, `pet-lifecycle` tests | New monster/rider slow/fast/gallop formulas match `mon.c:mcalcmove`; the complete occupation/turn scheduler has not been proved equivalent. |
| `dog.c` | `initedog:45`, `mon_arrive:420` migration boundary, entire `mon_catchup_elapsed_time:627-724`, `dogfood:995`, `tamedog:1143` food/catch branch, `wary_dog:1292` | Pet construction in `allmain.js`/`mklev.js`; migration and taming in `cmd.js`; shared revival bookkeeping in `cmd.js:applyHeroProjectileMonsterLifeSaving`; catchup in `dog.js` called by `cmd.js`/`wizard.js`; pet, catchup, revival and shop food/taming tests | Off-level catchup is implemented for residents, random arrivals and Wizard revival. Thrown/caught food and fresh-taming lifecycle remain separate from the floor-food implementation. Non-random migration modes and limbo retry state need further work. |
| `dogmove.c` | `droppables:28`, `dog_nutrition:156`, `dog_eat:218` nutrition/reward/recovery, `dog_hunger:362`, `dog_invent:400`, mounted `dog_goal:483`, `dog_move:977` hunger/eating boundaries | `allmain.js:petDroppable`, `applyPetFoodNutrition`, `applyPetHunger`, `movePet`; 31 `pet-lifecycle` tests plus independent revival/steed tests | Pet ranged target scoring (`score_targ`, `best_target`) and full `dog_move` combat/path preferences are unverified; pet multiattack routing remains restricted. |
| `makemon.c` | `m_initweap:161` equipment linkage, `m_initinv:589` ownership, `clone_mon:837` state/HP/inventory copying, creation/HP caller paths | `mklev.js:makemon`, `m_initweap`, monster HP and inventory construction; cloning split across `monster_liquid.js` and `cmd.js`; generation and shop polymorph tests | No shared `clone_mon` lifecycle; caller-specific clone implementations need comparison for pet/minion extras, inventory identity, extinction, and HP splitting. General creation distributions were not exhaustively checked. |
| `mcastu.c` | `choose_monster_spell:89`, `castmu:130` selection/cooldown/fumble/order, `mcast_spell:800-895` dispatch, `mcast_destroy_armor`, `mcast_stun_you`, `mcast_psi_bolt`, `m_cure_self`, self haste/invisibility, death-touch/weakening call boundaries | `allmain.js:chooseWizardMonsterSpell`, `maybeCastUndirectedMonsterSpell`, `summonNastiesForMonster`; live `cmd.js:wizardMonsterSpellEffect` through `wizardMonsterCastResolvedAfterTouch` or its deferred message entry; `monster-spell-effects` and shop tests | Corrected live lich effect branches below; death-touch and weakening still lack full HP/attribute-drain implementation. Cleric directed spells do not reach this helper; allmain's separate undirected dispatcher has further differences. Gehennom summoning and wrong-location gates remain incomplete. |
| `mhitm.c` | `mattackm` dispatch, `gazemm:737`, `mdamagem` hit/death flags, `ohit` callers, `passivemm`, sleep/paralysis helpers | `mhitm.js`, runtime hooks from `allmain.js`; `mhitm.test`, `mhitm-status`, equipment tests | Attack dispatch/MC/status slices tested; knockback displacement, artifact effects, broad passive/item destruction remain incomplete. A numeric result flag is not proof that all effects ran. |
| `mhitu.c` | `mattacku` offensive-item boundary, `magic_negation:1089-1145`, `hitmu` damage ordering | Hero attack branches in `allmain.js`; MC metadata shared in `armor.js`; monster MC in `mhitm.js`; equipment and shop attack tests | Hero-side MC callers still implement subsets of full protection semantics; complete monster-to-hero attack dispatch remains unverified. |
| `minion.c` | `msummon:59-158` demon/Angel selection, alignment/extinction/count rules; bribe caller identification | `wizard.js:nasty` has a limited null-summoner branch; `allmain.js`/`cmd.js` demon bribe logic; `offer.js` minion paths; wizard/shop demon tests | General prince/lord/Angel `msummon` is not available as one source-faithful helper. A non-null monster's Gehennom summon can return zero instead. Guardian angel full lifecycle unverified. |
| `mon.c` | `mcalcmove:1126`, distress/movement boundaries, `m_consume_obj:1392`, aggression helpers, `lifesaved_monster:2839`, death/drop call chains, `m_respond:4089-4133` | `allmain.js`, `mhitm.js`, `monster_liquid.js`, `cmd.js`; movement, pet, combat, projectile/shop tests; response work also in `spell.js` | Death paths remain distributed; trap/liquid death paths require a shared life-saving audit. Full object consumption properties, shapechanging and overcrowding remain unverified. |
| `mondata.c` | `defended:91`, `resists_magm:215`, `resists_blnd:248`, `can_blnd:305`, conflict/permonst predicate call paths | `permonst.js`, `mhitm.js`, `allmain.js:monsterResistsMagic`, item helpers in `cmd.js`; status/striking tests | AD_SLOW blue-dragon defense is fixed. Light-blindness artifact defense and other `defended` damage-type users remain incomplete; this is distinct from armor MC. |
| `monmove.c` | `dochug:690` phase gates, `m_digweapon_check:1108`, `m_move:1715` trap/eating/perceived-location entry, `m_move_aggress:2088`, hero tracking lookup | `allmain.js` movement/AI, `mhitm.js:mMoveAggress`, `montrack.js`; combat, movement, pet and shop trap tests | Dig-tool and ranged wield paths remain separate from melee `monWieldItem`; full item-search, hiding, door, displacement, web, and retreat preferences unverified. |
| `monst.c` | Entire 89-line file: table macros, `monst_globals_init`, sentinel and seduction attack tables; table includes `include/monsters.h` | `permonst.js:MONS`, legacy `monster_data.js`, `mklev.js` monster materialization | The owning C file mostly initializes data; all monster rows and the legacy runtime projection have not been exhaustively diffed. Per-species canonical fields should be used instead of hand-maintained name sets. |
| `mplayer.c` | `mk_mplayer:118-176` level/HP/kit setup and role-dependent equipment entry; function inventory through `mplayer_talk:356` | Generic role monsters and shapeshifter placeholders in `mklev.js`/`allmain.js`; role identification in `cmd.js` | Dedicated special endgame fake-player generation/role kits were not found in the inspected creation path. Complete `mk_mplayer` role branches and talk require follow-up, not a claim of global absence. |
| `mthrowu.c` | `ohitmon:321` hit/AC/MR/death ordering, `m_throw`/`thrwmu`/`spitmu`/`breamu` callers and projectile helper boundaries | `allmain.js` throwing/ray loops and `killMonsterFromThrownInterveningHit`; potion effects in `cmd.js`; extensive shop projectile tests and new striking tests | Shared monster-projectile death now invokes life saving. Launcher multishot, returning weapons, deliberate target bonuses and all potion/venom branches were not exhaustively compared. |
| `muse.c` | `find_offensive`/`use_offensive` striking selection, `mbhitm:1597-1652`, `mbhit:1734-1808`, floor-object loop | `allmain.js:processMonsterTurns` offensive wand block; item classification in `cmd.js`; `monster-striking-wand` tests | Intervening striking targets now receive wake/reveal/AC/MR/damage/death. Other offensive/defensive item choices and beam door/drawbridge/object break effects remain incomplete. |
| `priest.c` | `pri_move:177`, `priestini:220` caller, `priest_talk:558-646` poverty/hostility/donation setup | Shrine construction in `mklev.js:priestini` equivalents; `allmain.js` priest movement; priest talk/tip in `cmd.js`; shop priest tests around `5947` | Existing tests cover several speech gates. Donation tiers, full sanctuary/altar retaliation, roaming alignment and temple persistence remain unverified. |
| `quest.c` | `onquest:90`, `chat_with_leader:282-337`, `quest_chat:473`/`quest_talk:495` dispatch | `cmd.js` quest metadata, state, leader/nemesis chat and `maybeQueueQuestTalk`; arrival hooks in `allmain.js`; shop quest tests | Role data and selected quest conversations exist. Every transition, expulsion and leader/nemesis polymorph/death edge has not been verified. |
| `questpgr.c` | `convert_arg:236-285`, `com_pager_core:468-520` data loading/fallback/output, `qt_pager:630` ownership | `cmd.js` embedded quest text, substitution/formatting and paging | C Lua text is embedded in JS rather than loaded at runtime. Full substitutions, fallback IDs, random-message selection and output modes remain unverified; source format difference itself is not a behavior gap. |
| `sounds.c` | `beg:519`, `domonnoise:679-726` dispatch/reveal/deafness, `dotalk`/`dochat:1248`, `tiphat` caller path | `cmd.js:tipHatMonsterNoise`/chat handlers, `allmain.js` noises and hunger feedback; many shop chat/tip tests | Monster speech is much broader than a missing `sounds.js` would suggest. Full ambient sounds and native sound-library backends were not inspected for behavioral parity. |
| `steal.c` | `steal:343-405` eligibility/occupation/empty inventory, `stealarm:165` deferred armor removal, `relobj:875` | `steal.js:planMonsterSteal`, application in `allmain.js`, worn item removal in `cmd.js`; `steal.test`, shop theft tests, pet drop tests | Deferred armor-removal scheduling and all interruption/resume cases need integration audit; helper exports alone do not prove runtime invocation. |
| `steed.c` | `use_saddle:36`, `kick_steed:402`, `dismount_steed:576-647` thrown/flying/damage and chosen-dismount gate | Saddle/kick/mount/dismount in `cmd.js`, mounted tick in `allmain.js`; `steed-kick`, `pet-lifecycle`, `spell-pet-review` | Mounted hunger and feral revived dismount are wired. Full landing search, all dismount reasons, half-physical damage and terrain consequences remain unverified. |
| `track.c` | Entire 107-line file: 100-entry hero circular track, `settrack:24`, `gettrack:42`, `hastrack:63`, save/restore | `allmain.js:_utrack` and backward lookup, `save.js`; `montrack.js` is **monster** history and is a different C structure | Hero trace list/ring representation differs harmlessly when ordered identically. Level-transition resets/restores and `hastrack` call coverage need follow-up. |
| `uhitm.c` | `mhitm_mgc_atk_negated:75`, five status handlers (`blnd`, `slow`, `conf`, `stck`, `wrap`), shared knockback and damage tail | `mhitm.js` monster-to-monster handlers, large hero melee paths in `cmd.js`, hero damage paths in `allmain.js`; status/equipment/melee shop tests | Duplicate zero-MC helper removed. Remaining damage types, armor destruction, contact protection and true knockback displacement need more work. |
| `vault.c` | `invault:317-362`, `gd_move:888-948`, fake-corridor cleanup/guard gold ownership | `vault.js:advanceVaultGuard`, `restVaultFakecorr`, `allmain.js` vault turn timer, `cmd.js` guard interaction; shop vault tests | Full guard death/teleport/witness/concealed-gold behavior remains unverified. |
| `were.c` | `were_change:9-44`, `new_were:96` transformation boundary, `were_summon:142-190`, hero transform callers | `were.js` (explicit moon/time/shape metadata), calls from `allmain.js`/`cmd.js`; `were.test` | Selection and common transformations have tests. Full armor breakage/steed aftermath and hostile summoned helper initialization still depend on shared incomplete owners. |
| `wizard.c` | `strategy:270`/`tactics:369` ownership, `aggravate:494`, `nasty:591` summoning boundary, `resurrect:715-777`, `intervene:785`, `wizdeadorgone:815` | `wizard.js`, covetous movement in `allmain.js`, creation in `mklev.js`; `wizard-machinery` and `monster-catchup` tests | Revival now shares elapsed recovery and honors sleeping/frozen gates with the C waking bound. Full `mon_arrive` metadata/placement-failure handling remains incomplete. Generic monster nasties do not consistently use `wizard.js:nasty`. |
| `worm.c` | `worm_move:196-287` growth/HP scheduler, `cutworm:373-439` split setup, tail placement/geometry ownership | `wormSegments` arrays in `mklev.js`, polearm cuts in `cmd.js`, occupancy/trap handling in `allmain.js`; shop polearm/worm tests | Tail placement/cutting exist. No growth-time/HP scheduler corresponding to inspected `worm_move` was found; cutting manually spreads the monster record rather than using shared clone semantics. |
| `weapon.c` | `select_hwep:705`, `mon_wield_item:801-955`, hit/damage value helpers, dig-tool caller; skill state, practice, enhancement and drain/init bodies at `1070-1811` | `mhitm.js:selectHwep`, `monWieldItem`, weapon damage; dig selection in `allmain.js`, hero weapon logic in `cmd.js`; new `skills.js` state/menu model and `skill-state.test.mjs` | Cursed retention, old/new worn slot and future recheck semantics fixed for the melee route. Skill model and live spell practice are ported; ordinary melee/projectile training, riding exercise and several gift/amnesia/drain callers remain to integrate. Corpse pseudo-weapons, full artifact preferences, ranged/dig selection and tether/light side effects remain incomplete. |
| `worn.c` | `mon_adjust_speed:488`, `find_mac:717`, `m_dowear:757-814`, `mon_break_armor:1177-1240` | `mhitm.js:findMac`/speed status, `allmain.js` gear tick, `mklev.js` initial equipment, `cmd.js` polymorph/equipment | Gear tick currently selects a wearable item and defaults its mask rather than implementing complete slot/preference/extrinsic `m_dowear_type` logic; shape/armor lifecycle remains distributed. |
| `wield.c` | `will_weld` macro:61-69, hero wield/quiver ownership, `mwelded:1078` | Hero wield/quiver in `cmd.js`; monster retention and W_WEP updates in `mhitm.js`; equipment and shop wield/quiver tests | Monster melee weld behavior ported. Wielding nonstandard objects, special body-part messages, all hero two-weapon transitions and artifact light behavior remain unverified. |

## Confirmed implementation slices in this continuation

1. **Armor magic cancellation.** Both old monster negation helpers treated MC as
   zero. `mhitu.c:magic_negation` and `uhitm.c:75` now supply worn-best armor,
   protection, guarding-amulet, cleric and minion behavior. Existing duplicated
   armor tables moved to `js/armor.js`; the C cornuthaum MC1 entry was missing and
   now affects both hero metadata consumers and monsters. Artifact Protection is
   implemented for the two current source artifacts (Mitre and Tsurugi).
2. **Cursed melee weapon retention.** `weapon.c:853`/`wield.c:1078` now prevent a
   welded-weapon switch, consume the attempt, disclose curse only when visible,
   clear the old W_WEP slot on successful switching, and mark the new slot.
   An empty selection leaves `NEED_WEAPON`, allowing future inventory changes.
3. **Monster striking wand hits.** The old intervening-target branch only reduced
   beam range. `muse.c:mbhitm` now wakes/reveals targets, checks actual antimagic,
   rolls AC, damage and MR, identifies witnessed effects, maps unseen survivors,
   and uses monster death/life-saving handling without hero kill credit. The
   reusable resistance helper's object-class attack levels were also corrected.
   Antimagic now includes canonical AD_MAGM/AD_RBRE and baby gray dragon immunity,
   in addition to the existing equipment/artifact cases.
4. **Off-level monster recovery.** New `dog.js:monCatchupElapsedTime` follows
   `dog.c:627-724`: timed ailments stop at one, recovery checks consume RNG in
   source order, completed meals release borrowed mimic disguises, cooldowns
   expire, loyalty decays, starving pets go wild before healing, leashes clear,
   and regeneration/healing updates the last-move timestamp. Resident stairs and
   level teleport use the saved level's elapsed time; independent arrivals use
   `moves - 1 - mlstmv`. Ordinary stairs now process those arrivals after object
   delivery. Ordinary stair-fall damage rolls precede arrival (`do.c:1792`);
   trapdoor falling has a separate later damage boundary. Wizard resurrection uses the
   same recovery, then its separately bounded waking interval and helpless gate.
   Negative elapsed values fail before mutations; very long intervals clamp to
   `LARGEST_INT - 1` as in C.
5. **Live lich spell effects.** `cmd.js:wizardMonsterSpellEffect` is reached
   through the lich touch continuation, including a deferred message entry after
   the caster's spell announcement. It now implements armor erosion/destruction
   through the existing NetHack 5.0 `destroyArm`, guarded by Antimagic; observed
   resistance is remembered/forgotten by monsters in line of sight. Shared
   `destroyArm` now rolls even with no worn armor and interrupts activities on
   success. Stun uses the Dexterity-based dice or resets to one turn when resisted;
   cure rolls its separate 3d6; haste advances slow to normal before fast;
   invisibility is permanent; cloning and aggravation use the existing Wizard
   helpers. Psi bolt applies Half_spell_damage before Antimagic and uses active
   polymorph HP or the existing life-saving/fatal message continuation. The C
   full-health `m_cure_self` damage fall-through is preserved. This is not a full
   `castmu` port: selection, directed cleric attacks and two wizard drain effects
   still require work.

Tests added: `monster-equipment-parity.test.mjs` (24 tests; 21 failed before the
fixes), `monster-striking-wand.test.mjs` (9 tests; original seven failed before
the port, plus a separately reproduced invisible-marker failure), and
`monster-catchup.test.mjs` (18 tests; initial seven failed before the catchup
port, followed by reproduced stair-arrival and Wizard waking failures). These
and existing `mhitm`/`mhitm-status`/`wizard-machinery` tests passed together:
148/148 at this snapshot.
That denominator describes these tests, not the 30-file partition.

The subsequent `monster-spell-effects.test.mjs` adds 20 tests at the actual
`rhack` deferred effect boundary: 13 of the first 14 failed before the port;
occupation interruption was separately reproduced. All 20 passed, and the
combined new monster-spell/catchup/equipment/striking plus existing Wizard suite
passed 85/85. Repository-wide checks are tracked by the parent task.

## Next confirmed gaps

- **Migration modes and failed placement:** shared elapsed recovery is now
  present, but `cmd.js:arriveMigratingMonsters` only supports `MIGR_RANDOM`.
  Full `dog.c:mon_arrive` worm, shop, non-random arrival and limbo-retry state
  still needs a common implementation; Wizard placement remains a separate
  approximation of that function.
- **Gehennom summoning:** `minion.c:msummon` and `wizard.c:nasty` have nontrivial
  alignment, rank, count and extinction behavior. The general monster summoner
  in `allmain.js:summonNastiesForMonster` returns zero in the selected branch.
- **Long-worm growth and cloning:** `worm.c:196-287` grows tails and changes HP on
  a speed-dependent timetable. Current arrays cover placement/cutting but not
  that scheduler. `makemon.c:clone_mon` is also not a shared runtime lifecycle.
- **Equipment lifecycle and broad combat:** `worn.c:m_dowear_type`, armor
  breakage, ranged/dig wielding, artifact light/defenses and remaining attack
  handlers are independent gaps after the MC/melee-retention fixes. Do not count
  an exported helper or a damage-result bit as complete integration.
- **Monster casting dispatch:** the lich continuation and undirected casting
  still use separate selection/effect dispatchers. The latter's wizard cure
  amount is a flat level formula instead of 3d6, and directed cleric effects need
  a live attack caller. `DEATH_TOUCH` and `WEAKEN_YOU` require the C HP/attribute
  drain lifecycles rather than generic damage. Shared occupation clearing now
  interrupts correctly, but some non-eating/non-search activity stop messages
  remain absent because there is no shared C-style occupation text owner.

The concrete gaps above come from inspected bodies and current callers. Rows
marked unverified are follow-up work, not assertions of missing behavior.

## Follow-on bones eligibility slice

Outside the 30-file partition, `bones.c:no_bones_level:18-35` and `getbones:630-650`
were compared with `mklev.js:getbones`. The loader now rejects bottom levels,
multiway branch levels above depth one, the hellish invocation level, and disabled
dungeon/special bone IDs before opening a file. As required by the current C
source, this load gate runs **after** `rn2(3)`; explore/no-bones modes return before
that roll. `dungeon.js` now retains every `bonetag` from `dat/dungeon.lua` as the
runtime `boneid`, including empty disabled IDs, and retains the hellish flag.

`bones-eligibility.test.mjs` adds 16 independent cases (8 failed before fixes),
including both branch endpoints, level-one exceptions, all metadata, file-read
counts and RNG order. Combined bones/save tests pass 37/37. `save.js` was not
changed in this slice. Unique monster cleanup remains pending because
`bones.c:remove_mon_from_bones:390` calls `mon.c:mongone:3267`, which rescues special
inventory using `steal.c:mdrop_special_objs:852` and `zap.c:obj_resists:1458`; simple
filtering would discard required items and omit RNG. `fixuporacle:306` additionally
repairs or relocates the Oracle within her original room. Death-time
`can_make_bones` and the `save_dlevel` override are distinct remaining call paths.

## Hero spell explosions and survival checkpoint

Checkpoint `d84f90d` added the shared fire/cold explosion kernel in `explode.js`
and routed ordinary and skilled hero fireball/cone-of-cold casting through it.
Inspected sources were `spell.c:1419-1468,1655-1740`, `zap.c:zapyourself/buzz`,
and `explode.c:explode`. The port includes fixed fireball impact dice, self and
vertical casts, swallowed rays, skilled target/count/scatter order, elemental
resistance and inventory damage, golem effects, floor fire/freezing, shop damage,
and killed/life-saved engulfers. The shared projectile kill boundary now respects
the fire golem no-corpse flag before random treasure generation and releases a
killed engulfer. All 22 independent explosion cases passed; the parent checkpoint
reported 4,520 unit cases passing. This does not establish all zap/explosion parity.

The following survival slice compares `end.c:savelife:704-758`, the amulet branch
at `end.c:1080-1104`, `attrib.c:minuhpmax/setuhpmax:1147-1170`, and
`zap.c:maybe_destroy_item:5824-5828`. Shared `end.js:restoreLifeSavedBody` now
applies the level/minimum maximum-HP floor, post-Constitution healing cap, monster
HP restoration, and intrinsic Unchanging reset. The command, trap-continuation,
genocide, prayer-refusal, wizard-refusal and monster-turn recovery sites use it.
Generated life-saving and Unchanging amulets are recognized by their canonical
index; lethal Unchanging elemental damage enters ordinary amulet rescue.
Burning-paper HP damage now uses polymorph and equipment fire resistance.
Eleven new independent cases first failed and then passed, including actual
amulet generation/put-on, low maximum HP at four levels, extrinsic versus
intrinsic form locks, and the inventory-protection failure branch. The combined
explosion, endgame, shop/combat and monster-spell tests passed 3,211/3,211.

Remaining inspected follow-ups include
non-fire/cold explosion types and their scroll/wand/monster callers, and the
status/expulsion/message portions of `savelife` outside the spell continuation.
The existing Constitution adjustment helper also lacks the full `adjattrib`
fixed-ability and minimum-attribute rules; the HP recovery helper assumes that
the caller has applied the applicable adjustment.

## Sensed spell targets

`spell.c:throwspell:1681-1697` accepts a monster known through `canspotmon` even
when its square is unseen. The spell dependency now shares the existing rolling
boulder perception path as `cmd.js:heroCanSpotMonster`, including detection,
telepathy and species warning. Generic danger warning does not identify a target.
The visible branch now uses canonical `M3_INFRAVISIBLE` and the worm segment
check from `display.h:canseemon` / `worm.c:worm_known:883`. The shared
`display.js:sensesTelepathically` uses canonical `M1_MINDLESS`, and its worn source
count recognizes generated ESP amulets without a known name. The count is
exported for the camera's separate telepathic-capability check.

Fifteen additional spell/telepathy tests cover accepted and rejected dark
targets, actual generated amulet put-on, blind versus sighted telepathy, squared
range boundaries, mindless species, worm segments and blocked spell paths.
Eight of the first thirteen cases failed before the changes; all 48 explosion
and targeting cases now pass. A broader 3,246-case run passes 3,244, with the two
failures in the concurrent ice-timer migration reported to its owner. Previously
existing rolling-boulder death naming remains covered: C spotting predicates
also operate after lethal HP damage, before cleanup removes the monster.

Artifact `SPFX_ESP` sources and remaining shared rendering/perception callers
still need the complete `worn.c:recalc_telepat_range` / `display.h` property model;
this change does not claim global perception parity.

## Hero water entry and drowning

The water continuation now follows the inspected `hack.c:pooleffects:3233-3308`
and `trap.c:drown:5059-5210` ordering: inventory damage, gremlin/iron-golem
effects, leash release, aquatic immersion, teleport attempt, crawl/disrobe,
and death followed by rescue. `water.js` owns the sequence and serializable
prompt continuation; `cmd.js:heroWaterLandingEffects` binds actual inventory,
terrain, death and relocation operations. `afterMeltHeroSpotEffects(x,y)` is
the asynchronous callback for the timer owner. Normal forced movement and
the shared landing helper now use the same water entry operation.

`trap.c:water_damage:4712-4851` and `water_damage_chain:4855-4890` supply
per-object luck, grease, containers, towel wetness, blanking, dilution, acid
destruction, rust and shared nested-chain acid feedback ordering.
`trap.c:emergency_disrobe:4897-4944` supplies inventory-order random selection
and worn/cursed retention; `rnd_nextto_goodpos:4947-4972` supplies the complete
eight-direction shuffle. Crawl positions use `hack.c:crawl_destination:4079`
geometry and the extracted hero `goodpos` terrain test. Grounded mounted entry
uses the GENERIC/FELL portions of `steed.c:dismount_steed:574-817`, including
the distinction between a dead steed and one revived by an amulet.

Twenty-four new independent water tests pass; the first live movement test
failed because carried scrolls were never damaged. New cursor and mounted
cases also failed before their fixes. Combined water, teleport-position and
explosion tests pass 107/107. A valid rock-stack encumbrance case exposed the
shared missing rock weight; the canonical weight 10 also corrects two older
scatter expectations to `rnd(3)` for six rocks (`explode.c:824-827`). Both
scatter regressions pass with that source-derived expectation.

This checkpoint is not complete water parity. Inspected follow-ups include
the low-level teleport spell fallback and seen-teleport-trap prompts in
`dotele`, wizard disorientation override, full `spoteffects(TRUE)` pickup and
terrain-blocked flight behavior, the remaining legacy polymorph/boots/drop-ball
water callers, shopkeeper diagonal-door blocking, and full generalized steed
landing/float-down behavior. The existing gremlin split dependency also still
needs canonical `cloneu` creation and monster-HP field integration. Timer/main
flow pause/resume integration is pending in the parent work.

## Object identity across timer-bearing transfers

The live drop, comma pickup, pickup menus, autopickup and catch paths now keep
the original object, following `do.c:dropx:786` and `invent.c:addinv:1152` /
`freeinv:1403`. Previously a one-turn lamp could be dropped or picked up and
remain lit forever: its timer extinguished a detached copy. Floor pickup,
container insertion/takeout and bag scatter splits now duplicate timers at
their existing deadlines (`mkobj.c:splitobj:457-507`), with sale previews
remaining views rather than allocating unused split objects.

Monster inventory drops use the existing full stack compatibility and merge
operations. This preserves independently hatching eggs and retires discarded
candle timers as required by `invent.c:merged:807-854`. Destruction of carried
and floor containers, including cursed-bag losses, stops timers throughout
the contents tree (`shk.c:obfree:1187`, `mkobj.c:dealloc_obj:2745-2767`).
Eleven new independent tests cover these transfer and destruction boundaries;
the first eight reproduced failures before implementation. The 3,134 existing
shop tests pass, with one expectation corrected to require the C object
identity on whole-stack pickup.

The ordinary water command and melt callback can now suspend before successful
crawl relocation while the remaining message pages are displayed
(`trap.c:drown:5159-5164`, `win/tty/topl.c:update_topl:251`). A source-derived
state test checks that the hero remains in water at the first More prompt and
that resuming does not repeat escape RNG. The public swimmer session again
matches all 73 screens and all 3,713 RNG calls.

The subsequent ownership slice closes the remaining floor-stack timer
cleanup, deferred nymph/bullwhip object copies, `steal.c:stealarm:165-193`
copy, and both no-hands monster pickup splits. Command floor merges now reuse
the same age/timer/light bookkeeping as monster and container merges, and
honor C's light-state, candle fuel-band, burning-oil and object merge metadata
gates (`invent.c:mergable:4379-4470`). Metadata inspection also corrected the
missing stackable `ya`, athame, scalpel, stiletto and worm tooth cases, while
keeping boulders, statues, lamps and land mines separate. The old land-mine
test's merge expectation conflicted with `objects.h:971` (`mrg=0`).

Theft transfers now remove the whole carried stack and clear canonical hero
equipment references before monster acquisition. Pet fetching and hostile
monster pickup preserve timers on both split stacks, following
`mon.c:mpickstuff:1883-1902` and `can_carry:2010-2027`. Twenty further tests
cover these cases, including live pet pickup and hostile Ixoth pickup;
seventeen reproduced failures before their fixes. All 31 ownership tests,
theft/pet/container-merge tests (103 combined), and shop/burn/save tests
(3,201 combined) pass at this checkpoint.

Monster projectile splits and land-mine scatter splits now duplicate object
timers at their original deadlines (`mthrowu.c:m_throw:612`,
`explode.c:scatter:765`, `mkobj.c:splitobj:457-507`). The monster landing
operation preserves missile identity on a miss and cancels timers when an
egg breaks on impact (`mthrowu.c:drop_throw:162-192`). Seven new tests cover
live stack throws, direct hit/miss landings, candle scatter through expiration,
and egg/oil scatter destruction; six reproduced failures before the changes.
The oil case also caught a live ordering defect: the exploding potion remained
in the floor pile and its own explosion reignited it. Scatter now removes the
breaking object before side effects, and oil stops burning before damage dice,
matching `explode.c:scatter:769` and `explode_oil:974-985`.

The next bounded deletion audit covers `dokick.c:ship_object:1718-1740`,
`obj_delivery:1827-1848`, `do.c:flooreffects:274-299`, and
`trap.c:fire_damage:4455` / `lava_damage:4576`. Shipping breakage now cancels
timers for remote missiles, carried drops and escaped-shaft floor effects;
destination breakage does the same. Shared fire/water/lava deletion stops timers
after contents spill, preserving protected surviving contents. Hero hard-floor
projectile breakage and kicked-egg breakage now cancel their timers, while a
surviving kicked stack duplicates the timer before flight. Eleven additional
tests cover these boundaries, including live drop and kick commands; eight
reproduced failures before their fixes. Controls verify that surviving shipped
containers and protected spilled eggs keep their timers.

Upward hero throws now use one split/free-inventory/continuation path in the
order of `dothrow.c:throw_obj:249-272`, preserving the actual singleton and
copying timers only for a split. The wielded remainder stays equipped while
the thrown portion clears equipment flags. All upward variants reuse their
existing impact effects; ordinary nonweapon tools also reach C's weight-based
`toss_up` damage instead of the unsupported-direction prompt. Shared broken
throw cleanup stops object timers before pyrolisk explosions. Thirteen new
tests cover fertile egg species, rotting corpses, oil, lamps, candle splits,
and active Heart detachment; seven initially reproduced failures. Heart
float-down uses the shared artifact detachment API and serializable projectile
continuation, with a save/restore test proving that water escape retains the
detached object and does not repeat its cooldown before the upward flight.

The ordinary `f` command now detaches each real shot before flight, duplicating
shop billing and timers only when splitting a stack (`dothrow.c:249-272`,
`mkobj.c:457-507`). It retains an unthrown quiver stack, clears the final quiver
slot, and transfers the actual gem to a receiving unicorn (`gem_accept:2373`).
Horizontal landing snuffs candles after floor effects and before shipping
(`dothrow.c:1818`), while lamps retain their burn timers. The flight and bars
impact finish before recoil damage (`dothrow.c:1674-1682`). Ten new independent
tests cover these states, including an actual `moveloop_core` firing turn and
save/restore during an active Heart water escape; seven reproduced failures
before fixes. The 72 ownership tests and existing 3,134 shop command tests pass.

Horizontal `t` now uses the same serializable detached-object handoff before
trajectory or recoil. The multi-shot path shares the firing loop, while its
existing specialized impact effects receive the actual singleton or timed
split. C `return_throw_to_inv:1855-1908` restores caught boomerangs to their
original equipment slot and rejoins a split with its own source stack; the
generic aklys/Mjollnir return restores the wielded object. A pre-flight
boomerang recoil death retains that detached object through life saving and
save/restore, with dual-wielding stopped during detachment and restored on
catch. Egg impact deletion now stops timers before the source's petrification
or pyrolisk explosion (`uhitm.c:1219-1252`). Eighteen new tests cover these
paths, with ten initial ownership failures and three further impact-timer
failures reproduced. Both old poisoned-bolt tests now assert the same object
is unpoisoned and landed, matching `uhitm.c:1528` instead of expecting a stale
poisoned inventory copy. The 90 ownership and 3,134 shop tests pass together.

Failed catches now follow `dothrow.c:1736-1760` for arm/feet messages,
polymorph body parts, half physical damage, and landing at the hero's position
after recoil. Arm damage uses the shared `hack.c:losehp` operation rather than
the chest fire wrapper's prayer-invulnerability gate. A fatal arm hit retains
the actual detached weapon until life saving or wizard death refusal returns,
including across save/restore. The shared HP operation also ends running and
travel and implements `hack.c:maybe_wail:4211-4245`: the strict warning interval,
role/race wording, permanent intrinsic power count, deafness, and the
Unchanging polymorph trigger. Twenty independent tests cover this milestone;
the 20 return, 90 ownership, 3,134 shop, and 21 cursed-book checks pass together.
Initial valid failures established the missing half damage, invulnerability,
post-recoil placement, death suspension, and low-HP warning behavior.

Mjollnir's failed-catch `artifact_hit` now follows `artifact.c:1091-1108,1513-1526`:
shock resistance suppresses the bonus and nearby wakeup, the bonus precedes
inventory destruction, and half physical damage applies to the combined arm
damage after item effects. The shared `applyHeroElectricInventoryDamage`
retains the selected identities and index across each item's death recovery
(`zap.c:maybe_destroy_item:5800-5953`, `destroy_items:5962-6102`). It rechecks
ownership before processing the next item and completes deferred strength
exercise after recovery. Ordinary charged-ring recharge/explosion now feeds
its damage into that same continuation; exploding-ring damage is halved while
exploding-wand damage is not. Actual destruction uses inventory consumption
and object timer cleanup. Glove protection occurs after inventory selection
and equipment protection, and canonical resistance bits and polymorph shock
resistance are recognized. Fifteen new tests cover these changes, including
saved life-saving and wizard refusal, ring effects, mutation of selected
inventory, wakeup radius, and a live turn. The 35 return, 90 ownership, and
3,134 shop checks pass together. Thrown/fired objects also acquire `LOST_THROWN`
at flight entry (`dothrow.c:1563`), cleared when a caught weapon is reinserted.

This is not a complete transfer audit: electrical destruction still needs
full worn-ring property removal and its deferred float-down continuation;
the older aggregate electrical callers do not yet suspend between items.
Remaining returning-weapon details include swallowed returns, shipping before
drop effects, and ordinary recoil death ordering. The curved boomerang's
pre-flight wizard death refusal and generic return merging still need review.
Other outstanding areas include
specialized nonweapon `f` monster impacts, other direct floor-removal destruction callers,
migration mode variations and the remaining non-timer stack compatibility
properties still need review. Full drowning effects between every individual
pline also remain broader than the successful-crawl continuation implemented
here.

Monster projectile traps now share `monsterMissileTrapEffect` between ordinary
and pet movement (`monmove.c:postmov:1509` → `trap.c:mintrap`). It implements
arrow and dart trap branches (`trap.c:1190-1322`) with known-trap avoidance,
aerial avoidance, spent trap removal, trap learning and visibility, source
`find_mac`, and `t_missile` quantity/weight/poison normalization. `thitm` places
and stacks missed projectiles directly; a hit consumes the missile after
source-sized damage, blessing/enchantment and erosion adjustments. Lethal
hits use existing monster life saving and vampire revival before ordinary
inventory/corpse cleanup, without hero XP. Thirteen tests cover live ordinary
and pet movement plus hidden activation, normalization, stacking, avoidance,
death/drop and life saving. Five initially failed; the combined 13 new and
3,134 shop tests pass. Three older damage tests now select actual hit rolls
under source AC instead of depending on a synthetic species-AC override.

A newly generated C oracle and its recipe are preserved under
`test/fixtures/oracles/cursed-book-arrow-trap.*`. It exposed the omitted arrow
trap when a distant jackal stepped onto it during cursed-book helplessness.
The independent regression now matches all 43 screens and all 3,879 RNG calls;
there was no later RNG divergence after porting the trap. This does not assert
full trap parity: other trap families still have separate kill paths, and
forced steed activation is owned by the hero trap code.

Two command-time omissions exposed by the source-correct full-turn immobility
scheduler are also corrected. `do.c:dowipe:2390-2403` spends an action even
when the face is clean; the command now consumes ordinary or spare fast
movement accordingly. `hack.c:unmul:4177` preserves movement credit when
printing the wake message; fountain vomiting no longer installs a later
`--More--` handler that zeroes that credit. Six new live command tests first
failed, then passed, including ordinary/very-fast heroes and save/restore
while the vomiting message is pending. The trap, command-time and timer-phase
suites pass 33/33; all 3,134 shop tests also pass. The Monk replay is restored
to 308/308 screens and 13,878/13,878 RNG entries. The Knight replay again reaches
its previously documented later Sanctum divergence, with 1,760/1,814 screens
and 106,553/108,275 RNG entries matched; that separate monster-driver gap is
not claimed resolved here.

## Priest and Knight undead turning

`js/pray.js` now implements `pray.c:doturn:2414-2490` and
`maybe_turn_mon_iter:2347-2410`, with command-owned message and landing
continuations. Tests cover known and forgotten non-cleric spell fallback;
religious conduct before speech failure; speech, form, anger and hellish
dungeon gates; display-RNG deity selection; geometric visibility and range;
hostile undead, vampire shapechangers and level-16 demon eligibility;
confused wake/unfreeze/unflee; both resistance rolls; all six class-level
thresholds; chaotic peacefulness/malign; ordinary killing and life saving;
and the five level-dependent paralysis durations, including a real turn loop.

The iterator retains monster references and source phases through `--More--`
and saves. `mon.c:xkilled:3478-3530` HP/conduct precedes the kill message;
inventory and experience cleanup follow its dismissal. Unseen kills use
"it". Shared magic resistance reads the canonical species MR, with the C
defender-level bounds. Seven older resistance fixtures now use actual
resistant species and explicit draws instead of impossible goblin/pony MR
overrides. `wizard.c:aggravate` visits reverse creation order, matching fmon.

The required `monmove.c:monflee:462-549` branches include held-hero release,
sticky-form retention, untimed flight, immobile feedback, track clearing and
the vrock gas cloud. `mon.c:unstuck:3438-3469` preserves existing cooldowns
and returns ball/chain identities to the floor. Fog-cloud expulsion resumes
water/death/life-saving and automatic-pickup operations before flight, with
live and saved drowning tests. Numeric vampire shapechanger identities now
work in the shared monster life-saving helper.

All 50 new command tests pass; the combined command, immediate-spell and
shop suite passes 3,213/3,213. This verifies the listed command branches,
not every inherited helper: full `do_name.c:x_monnam` hallucinated monster
names, shield animations and expulsion's monster-telecontrol/overcrowding
branches remain outside this checkpoint. Other prayer/sacrifice operations
are separate from `#turn` and are not claimed complete.

### Chain lightning command and saved queue (2026-09-06)

`spell.c:907-1101,1588` now routes the no-direction spell through
`js/chain_lightning.js`. The bounded 100-square queue follows C direction,
terrain, peaceful-target, deduplication, saved-strength and breadth-first
ordering. Its per-monster power charges never underflow. Hallucination draws
the displayed beam before the swallowed early return; the source TODO to
damage the engulfer remains deliberately unimplemented.

The electrical `zap.c:zhitm:4354-4405` path applies 2d6, INT adjustment,
inventory damage, Knight doubling and the final floored MR reduction in
order. It does not roll to hit, reflect, blind or damage floor objects.
`zap.c:destroy_items/maybe_destroy_item:5613-6096` reuses the existing
electrical reservoir selector and adds monster item effects, including the
source's hero-glove check and monster ring-recharge TODO. Destruction pauses
before removing the selected item and cancels its timers on consumption.

Shared monster death and life saving precede propagation. The command-owned
queue resumes after plain More, saved item destruction, gas-spore injury,
hero life saving and wizard death refusal without repeating hits or power
charges. Fifty independent tests pass, including real `moveloop_core` casting;
the combined chain, turning and immediate-spell suite passes 129/129.

Remaining inherited limitations are explicit: the stale `gb.bhitpos` quirk
is represented by `game.bhitpos`, but the older JS beam/projectile walkers
do not yet populate that global; full hallucinated `x_monnam`, shield
animation and exact transient-display timing are not claimed complete.
The existing death helper's broader explosion behavior remains a separate
source-audit area. No recording fixtures were changed for this slice.

### Skill state, enhancement and completed spell practice (2026-09-06)

`js/skills.js` ports the inspected `weapon.c:1070-1811` state rules:
separate accumulated unsigned-short practice, advancement slots, maximum
levels and the ordered 60-entry upgrade history. Advancing preserves
practice; level loss spends spare slots before reversing the latest upgrade.
Random skill draining removes chosen history entries and rerolls practice
only above the newly lowered threshold. Role limits come from all thirteen
`u_init.c:257-572` tables. Actual new-game inventory establishes initial
weapon training with the C ammunition exclusion, initial spell disciplines,
Knight riding and pauper reset rules. Wizard spellbook discoveries now read
the resulting skill state (`spell.c:864-906`).

The live `#enhance` menu uses current practice and slots, grouped source
skill names, waiting/maxed markers, wizard practice totals and repeated
speedy selection. Advances spend their actual slot cost, update history and
identify newly accessible Wizard spellbooks only for spell disciplines.
Known-spell failure calculations and existing weapon skill consumers read
the same canonical records. Level gain/loss and force-web practice now
call the shared model; confidence feedback follows `weapon.c:give_may_advance_msg`
and the once-only `hack.c:handle_tip` enhancement tip.

Normal spell practice follows `spell.c:1598-1599`: it is initialized only
after a successful cast and awards that spell's level when the whole effect
returns. A serialized command marker survives direction/position prompts,
message pauses, chain/ray continuations, life saving and wizard death refusal.
Forced wizard spells and artifact storms do not train. Independent tests
cover real new-game roles, source table values, thresholds, slot history,
drain RNG order, menus, discoveries and saves, plus actual movement-loop
casting and saved teleport/ray recovery. All 49 new tests pass; the combined
skill, ray, chain, wizard and healing suite passes 208/208.

This checkpoint does not claim all skill callers are ported. The inspected
`uhitm.c:1475-1500` melee/projectile training gates, `steed.c:390-397` riding
practice, gift slots in `pray.c:994`, and skill drain callers in
`read.c:1031`/`uhitm.c:3269` still need live integration. Enhanced-menu
terminal wrapping/tab-separated presentation and every alternate role
reinitialization path have not been independently compared to C. No frozen
recording fixtures were edited.

The next skill integration check exposed two shared identity errors. Samurai
starting weapons now resolve `objnam.c:Japanese_items` aliases through the
same table used by wishes, so a wakizashi grants short-sword proficiency.
`dog.c:initedog:45-51` tameness now uses the canonical `M2_DOMESTIC` predicate
for tame wizard creation and the shared charm/taming helper. Horses and
household pets start at ten; wolves, large wild cats and unicorns start at
five. Thirteen new independent tests pass, including actual Samurai startup,
six genesis species and a tame-dependent saddling threshold. The combined
skill tests pass 62/62 and the shop suite passes 3,134/3,134. The two affected
public sessions now match all 203 screens and 8,829 RNG calls.

## Serial explosions and armor callbacks

The current pass follows explode.c's message, inventory, direct injury, golem,
shop and wakeup order for hero fire/cold spells. Saved child explosions resume
before skilled scatter, including life saving and wizard death refusal. Fire
inventory damage now saves each stack and potion vapor before consumption;
water that can change a lycanthrope's form is deferred as in zap.c:destroy_items.
The continuation and review suites cover 21 cases, including live turn ownership.
A fresh C self-casting fixture matches 29 screens and 2,201 RNG calls.
Remaining work includes aggregate monster-hit callbacks, other explosion types,
other inventory-damage callers and full potion naming/rehumanization fallout.

Source do_wear.c:Helmet_on/Gloves_on/off/adj_abon now owns separate ABON deltas,
cancelled donning, cornuthaum role bonuses and fumbling source masks. Discovery
runs once before brilliance changes Wisdom. Delayed removal occurs after C's
allmain.c engraving draw and uses objnam.c's simple armor names. The 37 focused
armor tests and a fresh 81-screen/2,871-call C fixture cover these callbacks.
Opposite alignment, transformation retouch and other direct ACURR consumers
remain unfinished.

Weapon.c bonuses now use actual weapon identity for dual wielding, bare hands,
and riding. Projectile and polearm practice uses the source raw-damage gate;
steed.c exercise counts 100 eligible tentative movement steps, including failed
pet displacement after tentative positioning. Ordinary melee practice and full
hmon execution remain separate source work.
