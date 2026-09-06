# Core, commands, interface, and support code

Reference: NetHack `16ff59115315917b93185d026aeefea06db9b0f4`, inspected
2026-09-06. This partition contains 40 C files. The table identifies the
actual JavaScript owners, the inspected interface or named function bodies,
and remaining work. It does not certify every branch in a file.

The generated [inventory](inventory.json) records every reference source
file's hash and lexical function locations. It is an index for further
review, not a behavioral coverage metric. Public recording success is not
used to mark a subsystem complete.

## Changes driven by source inspection

- `spell.c:rejectcasting/getspell/dovspell/dospellmenu/sortspells` and
  `mondata.c:can_chant`: casting now rejects stunned, strangled, silent,
  buzzing, burbling and headless forms before selection, and applies C's
  welded-arm gate with its quarterstaff exception. Spell menus use all 52
  casting letters, tty pagination, current trained skills, seven sort orders,
  retained ordering and full spell-slot swaps. Saved swapping and traditional
  selection preserve their prompts. Two fresh C recordings verify every
  screen, cursor and RNG call for sorting/swapping and traditional invalid
  selection/retry limits; 34 independent tests exercise additional branches.
  The wizard turns-column indexing quirk is preserved. `#wizcast` now lists
  all 41 spells with C's per-page accelerators, bypasses knowledge and normal
  casting gates, and uses actual skill levels. Direct known-spell calls repeat
  casting rejection before forgotten-memory backfire. Fifteen further tests
  include two fresh C recordings of debug menus and wizard death refusal;
  all 44 screens, cursors and 5,656 RNG calls match. Menu search is still open.
  The old stone-golem self-casting assertion
  was corrected: the C monster is silent and cannot chant an incantation.
- `spell.c:spelleffects`, `zap.c:zapyourself/zap_updown`, and
  `potion.c:healup/make_blinded/make_deaf`: physical self-spells and falling
  rocks use shared current-form damage, life saving and low-HP warnings.
  Falling-rock creation waits for saved death recovery. Healing uses the
  active HP pool, preserves the human lifetime peak, cures hearing after
  vision, and retains permanent blindness, blindfolds and eyeless forms.
  C's Eyes of the Overworld feedback is preserved; book blindness shares the
  same timeout setter. Cure sickness preserves healup's vomiting/sickness
  feedback before spell feedback, and light shares the existing gremlin
  damage owner. Self-sleep uses C's shared sleep/occupation state, including
  the timestamp used by combat wakeups. Twenty-four new tests cover these branches, with 13 initial
  failures demonstrating missing behavior. Reflected-ray and multiple-blast
  HP/inventory continuation, skill practice, and broader healing-potion
  consumers still need their source passes.
- `cfgfiles.c:cnf_line_BINDINGS`, `options.c:parsebindings/txt2key/escapes`,
  and `cmd.c:bind_key/rhack`: parse binding lists and byte/control/Meta
  syntax, preserve right-to-left precedence, ignore invalid bindings, and
  dispatch existing commands directly. `nothing` unbinds. Repeating a
  resolved command does not follow a new binding on its canonical key.
  [Command tests](../../test/command-bindings-parity.test.mjs) reproduced
  32 failures, including that repeat interaction, before their fixes.
- `teleport.c:teleok/goodpos/tele_jump_ok/teleds`: harmless/airborne trap
  exceptions; hero liquid and form eligibility; restricted arrival boxes;
  and trap/holder/swallow resets. [Position tests](../../test/teleport-position-parity.test.mjs)
  reproduced 25 failures before the fixes. The complete region callback,
  ball-dragging, terrain-switch, and arrival `spoteffects` sequence remains
  broader than this change.
- `trap.c:dotrap/trapeffect_pit/conjoined_pits/adj_nonconjoined_pit`:
  connected and disconnected neighboring pits have different escape rolls,
  damage dice, messages, and death reasons. [Pit tests](../../test/pit-movement-parity.test.mjs)
  reproduced 12 failures before the fixes, including actual command input.
  `climb_pit` now also handles movement/up attempts, boulders, phasing,
  clinging, flying, huge forms, Sokoban and repeated messages. Its 23 tests
  include polymorph anatomy and hallucinated trap names. Ordinary walking
  passes no destination trap to C `trapmove`, so it climbs even toward a
  neighboring pit; the direct transition tests do not imply that walking
  reaches that helper branch. Falling self-touch and the complete ordered
  movement/trap/terrain pipeline remain unfinished.

## File-by-file assessment

| C file | JavaScript owner | Inspected scope and outstanding work |
| --- | --- | --- |
| `alloc.c` | JavaScript allocation/GC | Allocation and pointer interface; C heap monitoring and pointer formatting are platform diagnostics. Integer conversion limits still need auditing at source-data boundaries. |
| `botl.c` | `display.js:drawGrid`, `cmd.js` status helpers | `botl_score`, status formatting, percentage/highlighting interfaces. `bot()` is empty because rendering happens in `drawGrid`; it is not evidence that status is absent. General `statushilites` threshold parsing/application is missing. |
| `cfgfiles.c` | `options.js`, `jsmain.js` | `parse_conf_buf`, OPTIONS/BINDINGS handlers and abbreviation table. Bindings repaired. Configuration sections, AUTOPICKUP_EXCEPTION, MSGTYPE and MENUCOLOR handlers are not represented by the current parser. |
| `cmd.c` | `cmd.js:rhack`, `allmain.js`, `input.js` | Command table, `bind_key`, `commands_init`, repeat and movement interfaces. General bound commands repaired, including rejection of inherited JavaScript object property names. Command queues still use ad hoc state; mouse/special/menu bindings, parameterized toggle, run/rush named aliases, and many extended commands need work. |
| `coloratt.c` | `terminal.js`, `display.js`, `options.js` | Color-name and menu-color interfaces. Built-in rendering colors exist, but configurable color matching, menu regex rules and palette changes lack a general owner. |
| `dbridge.c` | `cmd.js` drawbridge and movement helpers | `is_pool/is_lava/is_ice`, underlying drawbridge terrain and entity-effect interfaces. Teleport now reuses the existing underlying-terrain helper. Full multi-entity close/open/destroy outcomes still need branch tests. |
| `decl.c` | `gstate.js`, `jsmain.js`, `allmain.js` | Global-state initialization interface. C's globals are combined in `game`; Lua callback registration and initialization/reset completeness need broader checks. |
| `display.c` | `display.js`, `vision.js`, `cmd.js` | `newsym`, observation, temporary glyph and rendering interfaces. Existing map rendering is substantial. Temporary animations and observation transitions remain partial; frozen animation metrics are separate from screen scores. |
| `do.c` | `cmd.js`, `save.js`, `allmain.js` | `goto_level`, drop/floor effects, trap state, arrival timer interfaces. Earlier arrival overrides were removed. All nine callback kinds now use the shared queue, and level arrival runs it after object/monster delivery. The turn clock now advances at C turn setup; intrinsic expiries and queued callbacks run before regions/regen. Fourteen live-turn tests cover prompt suspension through melt/teleport/crawl/life saving/wizard refusal, saved continuation, slow heroes, blocked turn setup and timed life-saving resumption. Arrival now retains a serializable continuation before destination setup, including stairs/portals, controlled rescue, crawl prompts, life saving, wizard refusal, quest rejection and main-loop input (17 new tests). Complete region/shop/holding order and unusual floor effects require further comparison. |
| `do_name.c` | `cmd.js`, `mklev.js`, `end.js` | Monster/object naming interfaces and name-generation call sites. Names are handled by many distinct helpers; unified hallucination, article/pronoun, species/given-name rules remain a risk. |
| `drawing.c` | `const.js`, `display.js`, `permonst.js` | Default class-symbol table and conversion interface. Most data is present; customized symbol-set interpretation is separate unfinished work. |
| `earlyarg.c` | `jsmain.js`, browser startup | Native CLI option interface. Browser/recording startup replaces process arguments. Native diagnostic and filesystem switches are not gameplay features to emulate blindly. |
| `end.c` | `end.js`, `cmd.js`, `save.js`, `topten.js` | `done`, `savelife`, score/disclosure and death-cleanup interfaces. Existing endgame tests cover several results; complete disclosure and delayed-killer cleanup across all death sources remains unverified. |
| `getpos.c` | `cmd.js` cursor/travel modes | Cursor selection, coordinate truncation, location collection interfaces; existing cursor/travel tests. Complete interesting-location filtering, floodfill and customized keys remain partial. |
| `glyphs.c` | `display.js`, `const.js` | Glyph lookup/customization interfaces. Fixed glyph rendering exists; dynamic glyph IDs, custom colors and symbol customization are not generally implemented. |
| `hack.c` | `cmd.js:moveHero`, `allmain.js` | Trap transitions, movement refusal and paranoid-trap interfaces. Connected pit effects and `climb_pit` repaired. Full `spoteffects`, non-pit `trapmove`, capacity, rooted forms, and running state still need broader state-based coverage. |
| `hacklib.c` | JavaScript string/math operations, `cmd.js`, `hacklib.js` | String/distance helper interfaces. Much is inlined or library-provided; the small same-name module is not the whole implementation. Locale/case/pluralization assumptions need call-site review. |
| `iactions.c` | `cmd.js` inventory/action modes | Item action classification and command queue interface. Inventory commands exist individually; the general item-action menu with source classifications and queued object references is incomplete. |
| `insight.c` | `cmd.js` attributes/conduct/overview pages | Enlightenment interfaces and armor MC reporting path. Existing pages/tests are extensive but do not prove every property source, blocked property or conduct presentation. |
| `isaac64.c` | frozen `isaac64.js` | Core/display RNG interface and seed representation. Runtime is frozen; no edits. Recordings exercise streams, while wrapper tests should separately cover luck and distribution boundaries. |
| `mail.c` | no browser mail service | MAIL-conditional native daemon and reader interfaces. External mail delivery is not available in the browser runtime; any enabled in-game mail-object behavior would need separate implementation. |
| `mdlib.c` | generated data, `version.js`, `dat_files.js` | Build metadata/version generation interface. C compile-time utility logic is largely replaced by generated JS data; metadata consistency is not a game-parity claim. |
| `options.c` | `options.js`, `cmd.js` option menus | Binding/escape parsing bodies and boolean-toggle interface. Main binding subset repaired. Menu/special keys, parameterized toggle, autopickup regexes, message rules, comprehensive option validation and option side effects remain incomplete. |
| `pager.c` | `cmd.js` farlook/help modes | Look/whatdoes/help interfaces. Farlook/help implementation exists; `whatDoesCommand` only describes inventory, so arbitrary command help remains missing. |
| `pline.c` | `cmd.js:setMessage`, `display.js`, `input.js` | Message/prompt and logging interfaces. Message ordering is distributed among state fields. General MSGTYPE suppression, Norep behavior and history need source-based tests. |
| `report.c` | JavaScript errors/tool logs | Native crash reporting and trace interface. No corresponding network crash-report submission is required for local game semantics. |
| `rip.c` | `rip.js` | `genl_outrip`/centering interface; existing endgame tests. Tombstone formatting is present; unusual long death strings still require broader tests. |
| `rnd.c` | `rng.js` | `rnl`, `rnd`, `d`, `rne`, `rnz` bodies compared to wrappers. Their standard arithmetic follows C. Invalid-argument debug paths and complete RNG-state persistence were not certified. |
| `role.c` | `jsmain.js`, `allmain.js`, `mklev.js`, `cmd.js` | `str2role/str2race`, role selection and initialization interfaces. `roles.js` now owns shared rank names and quest-species role overrides used by player-monster and quest generation. Abbreviations, filters and race/gender/alignment combinations need systematic startup tests. |
| `rumors.c` | `mklev.js`, `dat_files.js`, `cmd.js` | Rumor/oracle and random text interfaces. Data-backed rumor selection exists. Oracle exhaustion/payment and persistent oracle state need additional checks. |
| `shk.c` | `cmd.js`, `allmain.js`, `mklev.js` | Billing/pricing, item ownership and shopkeeper interfaces; existing large shop suite. The number of shop tests is not a proof of repair-damage, robbery, container ownership or migration completeness. |
| `shknam.c` | `mklev.js`, `cmd.js` | Shop type/name/stock and saleability interfaces. Source data is present in several tables; vegan stocking, special stock and rare shop geometry need separate checks. |
| `strutil.c` | JavaScript strings and regexes | String-buffer and wildcard-matching interfaces. JS removes buffer allocation; C wildcard semantics must be checked at actual pattern consumers rather than assumed equal to regex. |
| `symbols.c` | `display.js`, `options.js`, `const.js` | Symbol-set initialization and parsing interfaces. Basic/rogue display paths exist. Full custom symbol definitions and load/save round trips are missing. |
| `sys.c` | `jsmain.js`, host/browser environment | Native system configuration interface. Server paths, support contacts and process switches differ from browser capabilities; gameplay-affecting flags still require explicit startup mapping. |
| `topten.c` | `topten.js`, `end.js`, `storage.js` | Score selection/format, persistent entries, corpse-name interface. Existing tests cover end scoring and record selection. Extended conduct/achievement logs and all native leaderboard policies remain unverified. |
| `utf8map.c` | `terminal.js`, `display.js` | Unicode mapping/custom symbol interfaces. Terminal can hold characters; C configurable glyph-to-Unicode registration is not generally wired. |
| `version.c` | `cmd.js`, `version.js` | Version/build banner and save-validation interface. Some live banners are hardcoded and `version.js` still has skeleton metadata. Versioned C binary-save compatibility is not needed for the JSON save format. |
| `windows.c` | `game_display.js`, `terminal.js`, `input.js`, `cmd.js` | Window/message/menu interface. Browser/frozen terminal owns platform I/O. Generic menu inversion, color and mixed-glyph behavior need focused tests; native window backend selection is not a missing game rule. |
| `wizcmds.c` | `cmd.js` wizard modes | Debug wish/genesis/level-change/teleport and diagnostics interfaces. Several live commands exist; arbitrary Lua loading, diagnostics, full migration controls and some map manipulation commands do not. |

These interface scans locate ownership and known gaps across all 40 files.
Named function-body comparisons above are deeper than the remaining table
entries. The inventory must not be reported as exhaustive branch review.
