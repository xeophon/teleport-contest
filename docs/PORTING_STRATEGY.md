# Porting Strategy

The public-session replay layer has been removed from runtime code.
Public sessions remain useful as test fixtures and divergence-analysis
inputs, but recorded screens, cursors, and RNG answers are no longer
embedded under `js/` or selected by runtime control flow.

Runtime code should now produce screens and RNG logs from live game
state only. The old `fastforward_*` scaffold has been deleted rather than
kept as an importable no-op layer.

Priority order for real porting work:

1. PRNG wrapper semantics in `js/rng.js`, especially composite calls.
2. Startup, role/race/gender/alignment, and `u_init` state.
3. Object, monster, and dungeon data tables.
4. Level generation in `mklev` and its dependencies.
5. Display, message windows, menus, prompts, and status lines.
6. Command parsing, movement, turn systems, and persistence through VFS.

Current validation snapshot:

- Runtime replay remnants are absent from `js/` and `tools/`.
- `bash frozen/score.sh` currently reports 44/44 public sessions
  passing. Future regressions should be fixed through real C subsystem ports,
  not by restoring public-session route shims.
- Syntax checks pass for `js/jsmain.js`, `js/cmd.js`, `js/display.js`,
  `js/rng.js`, `js/allmain.js`, `js/mklev.js`, and `js/save.js`.
  `git diff --check` and `git diff --cached --check` are clean.
- RNG still comes only from the ISAAC64 wrapper calls. The cleanup removed
  generated replay modules, fake RNG injection hooks, tracked seed replay
  files, stored public death pages, stored public attribute pages, and the
  unused `currentSeed` game-state field. The old fixed Healer dungeon-level-2
  map entry point is also gone; Healer descent now falls through to the
  ordinary `mklev()` path until a real C-equivalent level transition is ported.
- `display.js` no longer imports replay screen modules and no longer contains
  the public-session Rogue corridor overlays, Monk vault/pet/corpse overlays,
  Caveman move-specific pet/corpse overlay, or the dead Healer DLVL2 shop
  memory overlay. The unreachable `_healer_dlvl2` command, movement, monster
  turn, shop-memory, and cursor branches have also been removed from runtime
  JS. The later cleanup pass also removed exact `game.moves` route gates from
  `allmain.js`, the remaining move-count display color/overlay thresholds
  from `display.js`, the Wizard-only remembered-pet visibility exception, and
  the `_healer_` route state/mode patches from `cmd.js`, `allmain.js`, and
  `display.js`.
- The latest cleanup pass removed the remaining named public-route state for
  Monk vault search/movement, Rogue gold-drop movement, Caveman fire/drop pet
  display, phantom object rendering, and the polymorphed-dragon scripted pet
  combat path. The later Wizard cleanup removed the static wishlist Big Room
  map overlay; level teleport now displays the live generated special level.
  Run continuation now uses a small generic placeholder budget until the C
  `rhack()`/`domove()` running rules are ported.
- The Rogue south-door movement shortcut was removed. Rogue movement now goes
  through the same movement and door handling as other roles.
- Corridor run continuation, locked-door follow-up prompting, and corridor
  run-stop behavior no longer contain Rogue/Wizard/Knight-only route gates.
  They now key off terrain and live inventory tools.
- Exact public-session follow-up suppressions for the Rogue kitten gold
  message, vault/seer turn padding, and bear-trap pony rendering were removed.
- The player melee branch in `cmd.js` no longer contains role/monster public
  fixture cases for sewer rats, goblins, jackals, lichens, foxes, or kobolds.
  It now uses one generic C-shaped hit/damage/kill/corpse flow as an interim
  implementation until `uhitm.c` and monster inventory drops are fully ported.
- Monster attacks in `allmain.js` no longer special-case the public water
  demon, jackal, kobold, or goblin-throw message sequences. Adjacent hostile
  monsters now use one generic attack path, with real `mhitm.c`/`mhitu.c`
  fidelity still outstanding.
- Monster-turn and pet logic no longer carries Wizard/Samurai/Monk/Ranger/Rogue
  public-route gates for resumed pet movement, extra hero movement, door-open
  sound suppression, or pet corpse pickup filtering.
- Pet pit deaths no longer manufacture corpses through a hand-coded RNG
  ladder. They now use the same `mkcorpstat`-based corpse placement shape as
  other live monster deaths.
- Teleport traps no longer route one public coordinate pair to a fixed landing
  room/gold/newt arrangement; they now use the level's random landing helper.
  Fountain quaffing also no longer moves hardcoded monsters during the detect
  outcome, and the undefined `forceDetect` branch has been removed.
- Fountain detect-monsters no longer reuses the Ranger travel-tip detour, a
  fixed `(55,6)` cursor, a key-count threshold, or a recorded guard/RNG finish
  message. It now starts at the first live monster or hero square and exits
  directly.
- The artificial pet gold-pickup follow-up RNG scan flag was removed from
  `allmain.js`; pet pickup now leaves subsequent movement scans to the normal
  pet movement code.
- The `#force` locked-chest path no longer uses embedded `FORCE_CHEST_*_RNG`
  arrays, fixed pet/lamp movements, or drop-time message rewrites. It now
  resolves against the live chest object at the hero's position.
- Wielding no longer has a `p`/Mjollnir-only public route that moves the pet
  and burns a recorded RNG sequence. It now marks the selected inventory item
  as wielded, updates its inventory line, and leaves pet turns to the normal
  turn loop.
- Wizard monster creation no longer hardcodes a jackal at one public
  coordinate or consumes a recorded RNG ladder. It now chooses an open
  adjacent square and goes through `makemon()`.
- Zapping no longer checks one exact random-object roll for the public
  secret-door-detection wand case. That behavior is now keyed by wand type or
  the whole C probability bucket.
- The `i` inventory command no longer selects role-specific static public
  inventory screens. It now formats the current `game.inventory`, and the
  dead static role inventory payloads were removed from `cmd.js`. Farlook's
  inventory submenu now uses the same live formatter.
- The `#enhance` command no longer chooses between static Priest and Samurai
  public skill pages. It now formats a compact live skill summary from current
  role, inventory, spellbooks, two-weapon state, and steed state.
- The `+` known-spells screen no longer selects role/profile-specific static
  spell menus. It now derives the menu from spellbooks in current inventory,
  and the dead static known-spell payloads were removed.
- The `Z` cast-spell menu no longer uses a fixed Priest healing/detect-monsters
  menu or fixed casting RNG sequence. It now lists current spellbooks and
  applies a simple live selected-spell effect.
- The `\` discoveries screen no longer selects role/profile-specific static
  discoveries pages. It now derives discovered item names from current
  inventory, and the dead static discovery payloads were removed.
- The `)`, `[`, `=`, and `"` equipment-status commands now answer from live
  inventory state instead of hardcoded role/letter cases.
- The `W`, `T`, `P`, ring-finger, and `z` command paths now operate on live
  armor/ring/wand inventory for every role instead of Wizard/Healer-only
  letter shims.
- The quaff object picker now lists live carried potions, and the public
  Healer ruby-potion call path was removed. The drink prompt now uses the
  shared inventory-letter compaction helper instead of exact public-session
  `defgnq`/`defguw` prompt strings.
- Directional wand zapping no longer has a Wizard-only south-ray branch with
  fixed RNG burns. The selected live wand is now carried through to a generic
  directional ray effect.
- Fire wand self-hits no longer replay the fixed public cloak/invisibility/oil
  after-more sequence. They now apply a live interim C-shaped
  `burnarmor()`/`destroy_items()` path over worn armor and eligible carried
  potions, scrolls, and spellbooks; the full `zap.c`/`trap.c` inventory-fire
  semantics remain outstanding.
- Zapping a polymorph wand at an object pile no longer consumes a recorded RNG
  ladder or replaces the pile with a fixed ruby-potion/two-scroll public
  answer. It now creates live randomized replacement objects.
- The `Q`, `f`, and `t` command paths no longer have Ranger/Caveman/Tourist
  public-route prompts, fixed projectile messages, or recorded RNG burns.
  They now choose ammunition and thrown objects from live inventory.
- The `w`, `o`, and `d` command paths no longer use Wizard/Monk/Rogue
  letter-specific branches for public fixtures. They now prompt from current
  inventory and drop the actual selected object.
- Travel, search cleanup, `#name`, `#loot` abbreviation, and `#chat` handling
  no longer contain Ranger/Tourist/Priest/Monk/Healer/Samurai-only UI
  shortcuts for public routes. They now use the same command flow for all
  roles.
- Wizard wishing no longer depends on generated replay modules or
  wish-specific RNG ladders. The interim resolver now sends typed wishes
  through live `mksobj()` paths and applies BUC/enchantment/quantity parsing,
  and named exact-object wishes consume the C
  `objnam.c:rnd_otyp_by_namedesc()` probability roll before object creation.
  It is still not a full C `readobjnam()`/artifact-selection port.
- Wizard `#polyself` no longer whitelists only the public `gnome`, `red
  dragon`, and `human` answers or burns their recorded RNG ladders. It now
  resolves names through the live monster catalog, with red-dragon data taken
  from `monsters.h`, applies a generic polymorph form update, and derives
  rehumanized HP, energy, and AC from the saved live base form instead of fixed
  public-looking values.
- Wizard level-teleport menu handling no longer calls the handpicked Big Room
  or Sokoban builders directly from `cmd.js`. Those menu choices now set the
  target dungeon coordinates and enter through the ordinary `mklev()` path.
- Quest arrival and leader rejection no longer carry Archeologist-only
  `dlevel == 3/5` tests, fixed `rn2(3); rn2(2)` padding, or a hardcoded
  `z`-key rejection route. The controller now uses C-shaped Quest level
  kinds, role quest text ids, live alignment values, and the wizard-mode
  `adjust?` prompt shape. Full role quest text and all non-Archeologist
  special/filler level builders remain outstanding.
- Help-menu version pages and `#version` no longer burn fixed `rn2(3); rn2(2)`
  padding; C `doversion()` and `doextversion()` do not consume RNG for these
  static pages. Death-score overlay cursor placement is now producer metadata,
  so `display.js` no longer branches on exact score/death page text.
- Debug attributes no longer have an Archeologist-only fixed page for the public
  Grayswandir/dragon-scale/life-saving fixture. The `^X` path now falls through
  to the live generic attributes renderer until a fuller `insight.c` port lands.
- The discovery overlay no longer injects Healer or Archeologist public-session
  object lists at render time. `\` now shows only entries recorded through the
  live discovery tracking path.
- Wielding Grayswandir no longer consumes a fixed `rn2(4)` call. Melee now uses
  the object's `artifact` and `actualKind` fields for Grayswandir's current
  interim artifact bonus instead of regexing the rendered weapon name.
- Travel command state is no longer named after the Ranger public route, and
  travel cursor input no longer has an exact `i`-key branch. Direction keys now
  move the travel target cursor through the shared travel path lookup.
- The `a` apply command no longer selects role-specific public apply prompts
  or the Wizard cream-pie letter shim. It now prompts from live applicable
  inventory and applies simple generic behavior.
- The old Monk bag/vault path no longer hardcodes `1163` gold pieces or
  private `monkBag*` command modes. Applying a bag now opens generic live
  container handling for put-in, take-out, and contents views.
- Ice-box contents no longer come from a fixed public corpse list. Level
  generation now stores objects added to containers, and the ice-box menu
  formats the live container contents.
- Sack contents no longer special-case early non-`mklev` creation by checking
  the current move count. Container contents now follow the same object-type
  rule regardless of turn number.
- Eating no longer has public role-specific Valkyrie, Monk, Rogue, Healer,
  or Tourist branches. The `e` command now checks live edible floor objects,
  otherwise prompts from live edible inventory.
- Grave creation no longer burns a fixed large RNG range for public cemetery
  alignment. It now follows the C flow more closely by validating the square,
  setting the terrain to `GRAVE`, and choosing random headstone text from
  `dat/epitaph.txt`.
- Pet movement no longer contains fixed coordinate scans or a forced
  polymorphed-dragon lamp-drop branch. Pet inventory drops now go through the
  ordinary apport checks.
- The fixed public farlook/chronicle text for Wizard/Priest fixtures has been
  replaced with live hero, monster, object, and engraving state. Public names
  such as `Adjama`, `David`, and `Ermenak` are no longer embedded in runtime
  command handling.
- The `:` look command now formats the live square contents generically. The
  old Samurai, Knight, Tourist, Monk, and Ranger public-session text branches
  were removed.
- Display rendering no longer has a Big Room variant-9 object-over-monster
  exception or a Sokoban-distance mimic shortcut. Visible monsters now render
  from live monster state, including mimic appearance glyphs.
- Pet movement no longer forces a saddled pony one square north when the hero
  is in a bear trap. The pet path now stays inside the ordinary dog-move
  candidate selection.
- Pet follow pressure no longer uses south-run doorway memory or adjacent-hostile
  run shims. The approach decision follows the C-shaped room/RNG/whistle/inventory
  checks.
- Monster line-up checks now include the C `mthrowu.c:m_lined_up()` polymorphed
  hero concealment roll before path testing, cached alongside the existing
  boulder line-up roll to avoid duplicate RNG consumption during item-search
  decisions. Full monster ranged attack and `monmove.c` turn-order fidelity
  remain outstanding.
- Tutorial-specific door and kick topology is now centralized in metadata
  created by `make_tutorial1_level()`. Generic movement and kick code consume
  that metadata instead of knowing tutorial map coordinates directly.
- The generic travel help constant no longer carries a Ranger-specific name.
- The unused `js/fastforward.js` no-op placeholder was deleted, and README text
  was updated so it no longer describes active seed8000 fast-forward replay
  scaffolding.
- Ranger displacement now comes from the live worn starting cloak instead of a
  role-name flag, with the elven Ranger substitution producing an elven cloak
  without displacement.
- Tutorial entry no longer burns a recorded RNG script, no longer consumes
  coordinate-triggered `rn2(19)` calls, and no longer freezes redraws or
  snapshots the pre-tutorial screen for the tutorial transition.
- Tutorial engraving handling no longer uses smudge skip flags or scheduled
  `rnd(5)` calls for `nowipeout` engravings.
- Removed additional replay-shaped runtime burns and branches: route-conditioned
  suppression of the ordinary every-10th-turn `rn2(19)`, shopkeeper coordinate
  movement with `rn2(1/2/3)`, forced-chargen `rn2(1)` calls,
  Archeologist/Wizard startup `rn2(100)`, Tourist inventory `rn2(1)` calls,
  pet pit-death monster skipping, h-run pet blocking, and string-specific
  queued-kill handling.
- Removed the remaining session-shaped Rogue run-stop shortcut and lichen
  coordinate RNG branches. The seed0013 public sessions now diverge again until
  the real `rhack()`/`domove()` running and monster movement paths are ported.
- Dart traps now use the live `mksobj(DART, true, false)` path instead of a
  hand-spelled object-initialization RNG ladder.
- Browser games no longer default to public deterministic seeds when callers
  omit a seed.
- Full public-score smoke after the latest cleanup reports `35/44`,
  with no runtime errors. Formerly screen-perfect public sessions may still
  diverge after removing static menu, command, route, and wish-RNG payloads.
- Removed the final seed0014/date/move-number runtime shims from fountain
  exploration. Fountain bath gold loss, town watchman warning, and dry-up
  messages now follow the live `fountain.c`/`steal.c` flow instead of public
  session branches. Stair-fall damage also uses the live `rnd(3)` roll again.
- Vault guard escorting now keeps C-shaped `egd` fake-corridor state and uses
  the `gd_move()` axis fallback instead of public-route wait/reappear fields;
  fake-corridor terrain updates also refresh the vision block table like C's
  `unblock_point()`/`recalc_block_point()` path. The public vault replay is
  screen-perfect again without seed/session branches.
- Floor lichen corpse eating now uses the C `eatcorpse()` timing
  `3 + (cwt >> 6)`, keeping seed0004's pet movement and RNG stream aligned
  without a session branch.
- Known weapon floor and inventory names now include their signed enchantment,
  following `objnam.c:doname_base()` rather than hiding `+0` for unwielded
  weapons.
- Status-line AC holds for armor removal are now cleared on the next non-More
  status render, so stale AC does not leak into unrelated later prompts.
- Rush movement now runs the closed-door portion of C `hack.c:lookaround()`
  even when the current square is a room, while keeping corridor turn counting
  corridor-scoped. This prevents a continued `Ctrl+j`/LF rush from attempting
  the blocking door and emitting an extra door message.
- Visible monster and pet combat top-line overflow now resumes the interrupted
  monster turn after `--More--` when C would continue the same turn, instead
  of forcing the overflowed line to become a standalone prompt.
- Deferred full-map redraws are no longer applied before an interrupting
  `--More--` prompt. This matches C's habit of stopping at the message input
  boundary before later redraw work, preserving hallucinated display order.
- Status-line rendering now lives in `GameDisplay.renderStatus()` and is
  reused by map redraws instead of carrying a dead runtime TODO in
  `game_display.js`.
- Queued visible pet-combat messages now resume room running after the
  intervening `--More--` prompt, while queued after-more combat still blocks
  the pre-prompt continuation. This restores the seed0060 public session
  without regressing the seed0012 RNG-perfect match.
- Newt-corpse energy buzz now runs after monster/end-turn work like C's
  `done_eating()` tail, normal death `--More--` screens hold pre-death HP while
  debug death prompts display HP 0, and death-identified weapons suppress
  implicit `uncursed`. Together these restore seed0007 without adding
  seed/session routing.
- First-step pet swaps during capital corridor runs can continue when the
  destination terrain permits it, while later run-continuation pet encounters
  and door/stair/fountain/sink destinations still stop running.
- Floor object naming for armor now separates C's object-type discovery
  state from item-specific enchantment knowledge. This fixes the live
  `orcish helm` naming path and restores the seed0104 public session.
- The first-search saddled-pet doorway display flag has been removed; visible
  pets now render through the ordinary monster display path.
- Saved-level restoration no longer burns exact Sokoban-index `rn2(3)` calls.
  Revisits consume the C `restore.c:getlev()` monster catch-up `rnd(10)` roll
  for live restored monsters instead of public-route padding.
- The stale `bones_monster_order_forward` reader has been removed; monster
  turn order now comes from the live level monster list rather than an unused
  public-route flag.
- The fake `/bones-marker` and `/bones-state` restore path has been removed.
  Wizard-mode death now leaves only a per-level VFS bones presence file, and
  `getbones()` follows the C `rn2(3)`, `Get bones?`, and `Unlink bones?`
  prompt shape. Actual bones map/object/monster loading remains outstanding,
  so seed5006 now diverges where C restores the saved bones level.
- Death scoring no longer has a Tourist/grid-bug fallback. The visible score
  now follows the C `end.c` shape for net gold gain, including the death
  penalty before the existing depth/experience contribution.
- Medusa level generation no longer carries the public-route petrified-statue
  random-position table or the Medusa-only weapon artifact erosion flag.
  Random Medusa statues now use the C-shaped `sp_lev.c` loop that creates a
  monster, rejects stone-resistant or stone-polymorphing candidates, and moves
  inventory into the statue. The real generic artifact-selection port remains
  outstanding.
- Corpse eating no longer has name-specific coyote/newt timing shims. Coyote
  and newt weights are now data entries, floor corpse timing uses the shared
  corpse delay formula, and rotten-food interruption follows the generic
  `eat.c` branch instead of a public-session special case.
- The latest monster-turn recovery pass made queued visible pet kills resume the
  remaining C monster-turn/run tail, restoring the seed0060 public session.
- The latest C-shaped recovery pass fixed pet object naming for ordinary
  zero-enchantment weapons, debug-mode inventory burden reporting from live
  object weights and carrying capacity, and normal prayer turn hunger timing
  while preserving the wizard-mode forced-prayer exception.
- The latest startup/inventory pass made normal inventory overlays use live
  inventory lines and marked startup armor as known, matching `u_init.c`'s
  `ini_inv_adjust_obj()` behavior for objects whose full description depends
  on `known`.
- Tourist startup inventory now uses the shared `ROLE_INVENTORY`/`iniInv()`
  setup path modeled on `u_init.c`, including random food quantities and
  optional tin opener/leash/towel/magic marker selection. The hand-built
  Tourist inventory/menu caches and item-letter maps were removed.
- Quivered inventory suffixes now follow the C `objnam.c` categories, so bow
  ammunition stays `in quiver`, small non-bow items use `in quiver pouch`, and
  darts/non-ammo weapons are `at the ready`.
- The Barbarian level-15 stealth message no longer has a private exact-level
  branch; it now falls through the shared role ability message path.
- Role level-up abilities now carry their `attrib.c`-style intrinsic effect
  beside the rendered message, so state updates no longer parse English words
  like `quick`, `stealthy`, or `controlled` out of the output text.
- Attribute pages now report `You are warded.` from live worn armor magic
  cancellation, matching the `insight.c` source, instead of using a Tourist
  role exception or treating shirts as warding armor.
- The tutorial low-energy spellcasting engraving now uses an explicit
  `u.uenmax < 5`-style condition from `dat/tut-1.lua` instead of recognizing
  the English text prefix.
- Spell failure display now follows `spell.c:percent_success()` role data,
  initial spell skills, metal armor penalties, and heavy-shield penalty instead
  of patching exact Healer spell/shield percentages.
- Attribute status rows now add deafness, hunger, and encumbrance as independent
  `insight.c` status facts instead of using a Healer+Deaf shortcut.
- Mines' End variant 2 now keeps the `dat/minend-2.lua` teleport region through
  the normal special-level flip/finalize path instead of overwriting it with a
  post-finalize absolute rectangle and repainting nearby terrain/gem colors.
- Travel cursor handling now records prompt/target state explicitly, so
  retravel, `You are already here.`, and staircase finish messages no longer
  depend on exact pending prompt or terrain-description strings.
- Monster-turn bullwhip resume after a hero fumble now uses the fumble timeout
  state emitted by the turn tail instead of matching a merged `You hear
  crashing rock.  You trip...` pending message.
- Monster tunneling now tags the C `You_hear("crashing rock.")` topline when
  it starts a message, so travel continuation and after-capture clearing no
  longer compare against the rendered `You hear crashing rock.` string.
- Pet/noise resume after a hero fumble now tags the pending/topline fumble
  message at creation time, so run-resume and noise-combine decisions no longer
  parse the rendered `You hear some noises.  You trip...` text.
- Fumble duplicate/topline handling also records the rolled fumble message
  kind, so repeated fumble handling no longer compares `You trip...` /
  `You slip...` / `You flounder.` text.
- Pet combat noise now distinguishes "pending starts with monster noise" from
  "pending is exactly this near/far noise line" with explicit flags, removing
  the last `You hear some noises` pending-message comparisons from the monster
  turn combiner.
- Dismissing a pet-pickup `--More--` while the hero is asleep now lets the
  pending helpless turns continue toward `timeout.c`'s wakeup `nomovemsg`,
  so the wake message can join the pickup topline instead of forcing a second
  pickup-only `--More--`.
- Explore-mode life-saving continuation now tags the pending survival flow
  explicitly, so message coalescing and follow-up monster attack timing no
  longer branch on exact `OK, so you don't die.` / `You survived...` text.
- Prayer finish handling now carries an explicit pending finish-message flag
  for the C `gn.nomovemsg = "You finish your prayer."` phase, so turn timing
  and angry-god deferral no longer search the rendered prayer text.
- Force-lock startup now tags the `lock.c:forcelock()` occupation-start
  message directly, so monster-turn continuation no longer checks whether the
  topline starts with `You start bashing it with your`.
- Starting spell power now uses the C `num_spells() && uenmax < 5` condition
  for the delayed startup power floor, instead of a Monk/Healer-only patch.
- Search safety repeat suppression now uses explicit `cmd_safety_prevention()`
  style state instead of comparing the rendered `You already found a monster`
  warning text.
- Pet inventory drops during rotten-food eating now use an explicit eating
  message state instead of parsing the `Blecch!  Rotten food!` top-line text.
- Shopkeeper names now use the C `shknam.c` name lists and `nameshk()` selection
  shape, including `ubirthday / 257`, ledger number, duplicate-name fallback,
  and prefix-based gender/personal-name handling. The old local name-index
  adjustment and tool-shop RNG padding were removed.
- Tribute novel stocking now creates a direct novel object in the C
  `mkshobj_at(..., mkspecl)` shape instead of creating a random spellbook and
  burning a fixed `rn2(41)` padding call.
- The latest monster-turn pass made pet carrying checks prefer live `owt`
  values and aligned fast-hero turn scheduling with `allmain.c`, where
  monsters stop after one scan once the hero has enough movement for another
  action and the end-of-turn tail is not forced early.
- The latest hallucination-session pass synced legacy random-monster `mmove`
  fields from the generated C monster table, corrected human-vs-gnome race
  hostility to follow C `peace_minded()`, and deferred visible monster-pickup
  post-move work across `--More--` at the same `pline()` boundary C reaches in
  `mpickstuff()`.
- Counted search now mirrors C's occupation interruption more closely: after a
  search tick, a visible adjacent hostile monster that can attack stops the
  remaining search occupation and prints `You stop searching.`.
- Stair level-change messages now preserve the previous terminal grid under
  `--More--` and redraw the destination level only after dismissal, matching
  `do.c:goto_level()`'s delayed vision redraw. Saved-level up/down reloads
  also consume the C `getlev()` restored-monster catch-up roll for tame and
  untame monsters, restoring the vault escort replay without seed branches.
- Final death attributes now use the same final move count that C
  `insight.c:background_enlightenment()` reads from `svm.moves`, rather than
  an earlier local death snapshot when the status line has already advanced.
- Domestic dog corpse glyphs now use the C `HI_DOMESTIC`/white color path for
  little dog, dog, and large dog corpses, fixing pet pit-death display without
  changing RNG.
- Version/about help now lazily consumes the `nhlib.lua` alignment-table shuffle
  reached by C through `version.c:doextversion()` and `nhlua.c:get_lua_version()`,
  keeping later pet/search RNG aligned after version pages.
- Tutorial entry now preserves the old terminal grid under `Entering the
  tutorial.` until `--More--` is dismissed, matching C's delayed
  `schedule_goto()`/`deferred_goto()` redraw. The tutorial broken-door lesson
  also updates the live wall topology when the kicked door becomes broken.
- Zero-point deaths now follow `topten.c`: they display as an unranked current
  score entry and are not written to `/record` or preceded by `You made the top
  ten list!`.
- The seed0014 bear-trap/fumble pass now follows the visible top-line boundary
  instead of exact move/date checks, generated weapons keep unknown enchantment
  until C would reveal it, and monster flee/teleport paths clear `mtrack` like
  C `mon_track_clear()`. The remaining seed0014 mismatch is hidden rock mole
  movement around screen 655, pointing at `mfndpos()`/track state as the next
  monster-turn target.
- The follow-up mole audit found C-shaped state gaps rather than a seed
  condition: hero scent tracking now observes worn stealth rings, ordinary
  wall tunneling now uses C's `DOOR`/`D_NODOOR` result outside maze/cavern
  cases, and rock mole carrying now uses its C body weight of 30. This moves
  seed0014's first RNG mismatch later within screen 655; the remaining issue
  is that JS starts the fumble timeout before C has completed the same batch
  of monster moves.
- The next seed0014 trap pass matched C land-mine behavior for monsters:
  light monsters roll damage, learn the trap, and can leave the mine armed
  instead of always detonating it. Minefill trap placement now rejects existing
  traps, and `minetn` no longer burns an extra pre-loader `rn2(2)` beyond the
  Lua `align` shuffle. Seed0014 now reaches screen 668; the remaining
  level-generation blocker is not an absent Minetown-3 builder anymore, but the
  hand-coded builder and shared special-level helpers still need C-shaped parity
  around room/corridor/shop/monster generation before stair-fall damage.
- Mines-style `des.level_init({ style = "mines" })` now follows C's option
  defaults and `mkmap()` pass order: pass one/two always run, the two pass-three
  smoothing iterations run only when `smoothed=true`, default `joined`/`walled`
  are false, lit joined rooms set `rlit`, tree backgrounds light correctly, and
  generated ice records pool-vs-moat metadata.
- The shared terrain replacement primitive now supports C-shaped inclusive
  regions, `MATCH_WALL`, optional lit state, random lit state, lava auto-lighting,
  and matching-cell-only chance rolls while preserving the existing hand-coded
  special-level width/height call sites.
- The terrain replacement descriptor helper now parses C special-level
  mapchars, accepts `fromterrain`/`toterrain`, simple selection masks, and
  centered `mapfragment` matching with `x` transparency, `w` wall matching,
  live-map scans, and C-shaped mapfragment validation.
- Explicit empty `replace_terrain` selections now stay empty instead of falling
  through to whole-map replacement. New no-replay canaries also lock Minetown-3
  as a room/corridor special level and keep deferred monster-turn fumble timeout
  rerolls behind visible `--More--` dismissal.
- Object-shaped `replace_terrain` selections now accept C-style bounds and
  predicate methods (`bounds()`/`get(x,y)` or `has(x,y)`) plus iterator masks,
  and invalid explicit selection objects fail instead of silently becoming
  whole-map replacements.
- A reusable special-level selection mask now covers the first C/Lua producer
  layer: inclusive `selection.area()`, live-map `selection.match()`, x-major
  `percentage()` RNG filtering, all-direction `grow()`, iteration, bounds, and
  set operations for future translated descriptors. Malformed explicit
  `replace_terrain` selectors and bounds now fail instead of falling back to
  whole-map mutation.
- The shared selection mask now also covers `selection.room()`,
  `filter_mapchar()`, and `rndcoord(remove)`, with x-major iteration aligned to
  C. The simple `themerms.lua` fills for Boulder room, Trap room, Statuary, and
  Light source are now modeled through those helpers instead of being absent.
- Spider nest themed fills now use the same room-percentage selection and C's
  difficulty-gated `spider_on_web` roll, creating web traps without spiders on
  easier levels and web spiders only when the Lua helper would request them.
- The themed-room Lua `align` shuffle is now stored per branch, and `Temple of
  the gods` consumes that shuffled table to place three plain altars without
  shrine or sanctum bits.
- `Ice room` themed fills now convert the room selection to ice and use the Lua
  `percent(25)` melt-timer branch with one `rn2(1000)` timeout roll per room
  point.
- `Massacre` themed fills now create `d(5,5)` explicit role/guardian corpses,
  preserve the Lua species list and 10% reroll behavior, and leave the room's
  terrain/trap/monster state untouched.
- `Cloud room` themed fills now create sleeping fog clouds from the room point
  count and add a C-style selection gas-cloud region without point-cloud spread
  RNG or TTL rolls.
- `Teleportation hub` themed fills now use the shared selection helpers and have
  coverage for delayed seen teleport traps plus C's x/y-different destination
  selection rule.
- The Brown Mold/post-heal route cleanup removed the last public-trace state
  machines named `_brown_mold*`, `_post_heal*`, and `POST_HEAL*` from runtime
  JS. Level teleporting, Quest-goal arrival, fountain quaffing, punishment
  ball/chain display, cockatrice attacks, debug wizmap, attributes, object
  lists, and dungeon sounds now fall through to live state instead of fixed
  depth/turn/coordinate scripts. Public parity can drop here until the real C
  polymorph, quest special-level, fountain, punishment, and monster-attack
  code paths are ported.
- The follow-up cleanup removed Brown Mold rank/name gates from command
  handling, discovery display, and self-polymorph. Polyself command limits now
  read monster-form capabilities, self-zapping polymorphs through live monster
  selection, and the status line uses live `moves` rather than a display-only
  override. The capture-time crashing-rock message latch was also removed.
- The capture hook in `NethackGame` now only records the live terminal/RNG
  boundary. Topline clearing, deferred overlays, and map redraws are no longer
  mutated inside the capture hook, and healing potions no longer arm a special
  monster-turn tail flag.
- Teleport/menu command paths no longer use `_redraw_map_before_flush`; they
  redraw explicitly when they mutate hero position or clear a full-screen menu.
  The remaining redraw deferral is a generic map-dirty flag for pet movement
  and eating cleanup.
- Public sessions should now be treated strictly as divergence tests. A
  score recovery is only acceptable when it comes from porting C subsystems
  such as `u_init`, object data, level generation, display, command parsing,
  movement, monster turns, save/restore, and tty menu/window behavior.
