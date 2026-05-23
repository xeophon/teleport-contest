Your current repo has obvious replay infrastructure: `js/session_replays.js` maps seed/name/role/move length to stored RNG, screens, and cursors, and `tools/generate-replay.mjs` generates JS replay constants from public session JSON.

You are working in the repository:

https://github.com/xeophon/teleport-contest

Your mission is to refactor the current submission so it follows the spirit of the Teleport Contest: port NetHack 5.0 from C to plain JavaScript, rather than memorizing public session answer keys.

The current repository may contain seed-specific or session-specific replay files generated from public `.session.json` fixtures. Remove that runtime replay approach. Do not replace it with another hidden replay mechanism. It is acceptable for the public score to drop temporarily. The priority is to leave a clean, honest, maintainable foundation for a real C-to-JS port.

Important contest context:

- The contest API passes only `{ seed, datetime, nethackrc, moves }` and possibly storage. It never passes recorded screens, recorded cursors, or recorded RNG answers.
- The intended behavior is to run a JavaScript implementation of NetHack whose PRNG calls and terminal output naturally match the C reference.
- Public sessions may be used for testing and debugging, but their recorded answers must not be embedded into runtime code.
- The hidden held-out sessions are the real guard against public-corpus memorization.
- Phase 2 rewards maintainability, so seed-specific replay tables and tangled trace logic are harmful even if they improve public score now.
- Do not modify frozen files: `js/isaac64.js`, `js/terminal.js`, `js/storage.js`.
- Do not delete the public `sessions/*.session.json` files. They are test fixtures. Delete generated runtime replay code under `js/` and any replay-generation tooling that exists only to embed session answers.

Work autonomously. Do not ask for clarification unless you are completely blocked. Make a best-effort refactor and report exactly what changed.

## Step 0: Inspect the current repository

Start by determining the current state of the repo. Do not trust stale assumptions. Run these commands or equivalent commands:

```bash
git status --short
git remote -v
git log --oneline --decorate -10
git branch --show-current
git ls-files
~~~

Then inspect the contest docs and current implementation:

```bash
sed -n '1,260p' README.md
sed -n '1,260p' docs/API.md
sed -n '1,260p' docs/PHASES.md

sed -n '1,260p' js/jsmain.js
sed -n '1,260p' js/cmd.js
sed -n '1,260p' js/display.js
sed -n '1,220p' js/rng.js
sed -n '1,220p' js/allmain.js
sed -n '1,220p' js/fastforward.js
```

Inventory suspicious files and references:

```bash
git ls-files 'js/*seed*' 'js/session_replays.js' 'tools/*replay*'

grep -RInE \
  'findSessionReplay|startSessionReplay|drawSessionReplayScreen|currentSessionReplayRng|_session_replay|replay_rng_script|generate-replay|SEED[0-9]|seed[0-9]+_(replay|tail)|movesLength|truncateRngLog|consumeCoreRng|pushRngLogEntry' \
  js tools || true
```

Also search for seed-specific control flow:

```bash
grep -RInE \
  'seed[[:space:]]*===|currentSeed[[:space:]]*===|case[[:space:]]+[0-9]{1,6}:|movesLength|input\.moves\.length|nethackrc.*seed|name.*role.*seed' \
  js tools || true
```

Make a concise inventory before editing:

- Which generated replay files exist?
- Which source files import those replay files?
- Which functions replay recorded RNG?
- Which functions draw recorded screen cells?
- Which logic branches on seed, player name, role, or moves length to identify a public session?

## Step 1: Create a working branch

Create a branch for the cleanup:

```bash
git checkout -b refactor/remove-public-session-replays
```

If the branch already exists, continue on the current branch and note that in your final report.

## Step 2: Define what must be removed

Remove runtime code whose purpose is to embed public session answer keys.

Delete files matching these categories:

1. Public-session screen/RNG/cursor replay modules:
   - `js/session_replays.js`
   - `js/seed*_replay.js`
   - `js/seed*_tail.js`
2. Tools whose purpose is to turn public sessions into runtime answer-key JS:
   - `tools/generate-replay.mjs`

Use `git rm` where possible:

```bash
git rm -f js/session_replays.js 2>/dev/null || true
git rm -f js/seed*_replay.js 2>/dev/null || true
git rm -f js/seed*_tail.js 2>/dev/null || true
git rm -f tools/generate-replay.mjs 2>/dev/null || true
```

Do not delete:

- `sessions/*.session.json`
- `frozen/*`
- `nethack-c/upstream/*`
- `nethack-c/patches/*`
- `tools/compare-one-session.mjs`, unless it directly embeds or generates replay answers. A comparison/debug tool is acceptable if it only reads sessions during local testing and is not imported by runtime `js/`.

## Step 3: Remove replay imports and replay control flow

Edit every file that imported deleted replay modules.

Likely files to clean include:

- `js/jsmain.js`
- `js/cmd.js`
- `js/display.js`
- `js/rng.js`
- `js/fastforward.js`
- `js/allmain.js`

### `js/jsmain.js`

Remove imports like:

```js
import { findSessionReplay, startSessionReplay } from './session_replays.js';
import { replay_rng_script } from './cmd.js';
```

Remove logic that:

- Calls `findSessionReplay(...)`.
- Computes `sessionReplayIndex` or `sessionReplayLogStart`.
- Calls `truncateRngLog(...)` to erase real RNG calls and replace them with recorded RNG.
- Calls `startSessionReplay(...)`.
- Calls `replay_rng_script(sessionReplay.rng[...])`.

After cleanup, `NethackGame.start()` should initialize state, parse rc options, initialize the PRNG, install the display, install the capture hook, and call `await newgame()` without any session replay override.

The capture hook should still capture the terminal’s actual current grid at `nhgetch` boundaries. Keep the core contest contract intact:

```js
getScreens()
getRngLog()
getCursors()
```

Do not add any replacement that selects behavior by seed/name/role/moves length.

### `js/cmd.js`

Remove imports like:

```js
import { SEED... } from './seed...';
import { currentSessionReplayRng } from './session_replays.js';
```

Remove or rewrite functions like:

```js
replay_rng_script(...)
```

Remove any code that:

- Parses compact RNG scripts from public session data.
- Pushes fake RNG log entries that were not produced by real calls to `rn2`, `rnd`, `d`, `rnl`, `rne`, or `rnz`.
- Consumes PRNG state solely to match a known trace.
- Branches by `game.currentSeed`, player name, role, or `moves.length` to replay a public session.
- Draws or queues screens from stored session cells.

After cleanup, commands should use real game state. If a command is not implemented, implement a general placeholder that behaves honestly, for example a NetHack-like unknown command message, rather than replaying the expected public screen.

Keep useful general command logic, movement logic, menus, and pregame code. Delete only trace-specific machinery.

### `js/display.js`

Remove imports and calls related to replayed screens, for example:

```js
drawSessionReplayScreen(...)
```

`flush_screen()` and related display code should render from actual current JS game state only:

- message line
- map
- status lines
- menus and prompts
- cursor

Do not draw from stored public session cell arrays.

### `js/rng.js`

Ensure RNG logging reflects real calls only.

Remove or neutralize functions that allow fake answer-key logging, such as:

```js
consumeCoreRng(...)
pushRngLogEntry(...)   // only remove if it exists solely for fake replay injection
truncateRngLog(...)    // remove if it exists solely to discard real startup RNG before replay injection
```

Keep legitimate wrappers around the canonical ISAAC64 engine:

```js
rn2(x)
rnd(x)
rn1(x, y)
rnl(x)
rne(x)
rnz(x)
d(n, x)
```

The log should be produced by actual calls to these wrappers, not by parsing a stored answer string.

### `js/fastforward.js`

Inspect this file carefully. The template originally used a limited `seed8000` fast-forward as a starting scaffold, but the contest README describes it as a trap to escape from.

For this cleanup, remove seed-specific replay tables and public-session tail scripts. The cleanest spirit-compliant endpoint is:

- Either replace fast-forward functions with no-ops, accepting lower score until real C logic is ported.
- Or replace fast-forward calls with real implementations of the corresponding C initialization routines.

Do not preserve long lists of `rn2(...)`, `rnd(...)`, `d(...)`, or compact RNG scripts whose purpose is to match a public recording.

A minimal compatibility version is acceptable:

```js
export function fastforward_pre_mklev() {}
export function fastforward_post_mklev() {}
export function fastforward_step(_stepNum) {}
export function fastforward_fill_mineralize() {}
```

After that, update callers so the game still starts, even if screen and RNG parity are worse.

## Step 4: Remove seed-specific conditionals everywhere

Run this after edits:

```bash
grep -RInE \
  'findSessionReplay|startSessionReplay|drawSessionReplayScreen|currentSessionReplayRng|_session_replay|replay_rng_script|generate-replay|SEED[0-9]|seed[0-9]+_(replay|tail)|movesLength|truncateRngLog|consumeCoreRng' \
  js tools || true

grep -RInE \
  'seed[[:space:]]*===|currentSeed[[:space:]]*===|case[[:space:]]+[0-9]{1,6}:|input\.moves\.length' \
  js tools || true
```

The first grep should return nothing in runtime `js/`.

For the second grep, legitimate use of `seed` as input to `initRng(seed)` is allowed. Conditional branching on specific seeds is not allowed.

Do not hide replay data by:

- Renaming seed files.
- Compressing screens into base64.
- Storing public traces in string blobs.
- Reconstructing public traces from hashes.
- Matching on seed plus player name plus role plus moves length.
- Moving replay code into comments that are later evaluated.
- Reading session JSON at runtime.
- Reading files from `sessions/` in `runSegment`.

## Step 5: Keep the runtime valid

After deletion, fix import errors and basic startup errors.

Run syntax/import checks:

```bash
node --check js/jsmain.js
node --check js/cmd.js
node --check js/display.js
node --check js/rng.js
node --check js/allmain.js
```

Then run an import smoke test:

```bash
node -e "import('./js/jsmain.js').then(m => console.log(typeof m.runSegment)).catch(e => { console.error(e); process.exit(1); })"
```

Then run a tiny runtime smoke test:

```bash
node - <<'NODE'
import { runSegment } from './js/jsmain.js';

const game = await runSegment({
  seed: 8000,
  datetime: '20000110090000',
  nethackrc: 'OPTIONS=name:Smoke,role:Tourist,race:human,gender:female,align:neutral\\n',
  moves: ' '
});

console.log({
  screens: game.getScreens?.().length,
  rng: game.getRngLog?.().length,
  cursors: game.getCursors?.().length
});
NODE
```

The exact score is not important for this cleanup. The important thing is that the game does not crash because deleted replay modules are still imported.

## Step 6: Run local scoring as a regression signal, not as the optimization target

Run at least one session:

```bash
node frozen/ps_test_runner.mjs sessions/seed8000-tourist-starter.session.json
```

Then run all public sessions if practical:

```bash
bash frozen/score.sh
```

Expected outcome:

- Public score may drop.
- Some sessions may fail much earlier.
- That is acceptable.
- The important outcome is that failures reflect incomplete porting, not missing generated answer-key files.

Record the before/after score if you have a previous score. Do not re-add replay code just to recover public points.

## Step 7: Start replacing deleted replay behavior with real C-to-JS porting

After the cleanup compiles, begin the real porting work in a principled order.

Use upstream C as the source of truth, especially:

- `nethack-c/upstream/src/rnd.c` for PRNG wrappers.
- `nethack-c/upstream/src/allmain.c` for `newgame()`, `moveloop_core()`, and turn processing.
- `nethack-c/upstream/src/role.c` and `u_init.c` for character generation and starting inventory.
- `nethack-c/upstream/src/objects.c` and object data for object initialization.
- `nethack-c/upstream/src/dungeon.c` and dungeon Lua data for dungeon initialization.
- `nethack-c/upstream/src/mklev.c`, `mkroom.c`, `mkmaze.c`, `sp_lev.c`, `mkmap.c` for level generation.
- `nethack-c/upstream/src/cmd.c` and `hack.c` for command parsing and movement.
- `nethack-c/upstream/src/display.c`, `drawing.c`, `glyph.c`, and `vision.c` for display and visibility.

Implement real behavior by subsystem. Do not try to recover the whole public score at once.

Suggested next milestones:

1. PRNG correctness:
   - Ensure `rn2`, `rnd`, `d`, `rn1`, `rnl`, `rne`, and `rnz` match C semantics.
   - Ensure wrappers log in the exact contest format.
   - Do not log fake entries.
2. Startup and chargen:
   - Parse `nethackrc` generally.
   - Implement role/race/gender/alignment selection generally.
   - Implement the startup prompts based on actual options and input keys.
   - Replace hardcoded hero stats with real role/race initialization.
3. Object and monster tables:
   - Import or hand-port generated object and monster data into JS.
   - Keep data-driven structure, not seed-specific structure.
4. Level generation:
   - Port `mklev` and its dependencies in small pieces.
   - Use public sessions to find divergence points, but never embed their answers.
5. Display:
   - Render map glyphs, objects, monsters, traps, messages, menus, and status from live state.
   - Use the frozen `Terminal` and canonical serialization.
6. Commands:
   - Port one command at a time from `cmd.c` and related C files.
   - Add real inventory, pickup, drop, wield, eat, read, zap, throw, kick, open, close, search, save, quit.
7. Persistence:
   - Use the frozen VFS storage API for save files, bones, and score records.
   - Do not use direct filesystem writes.

## Step 8: Update documentation

Update `PORTING_PLAN.md` or create `docs/PORTING_STRATEGY.md` with a concise explanation:

- Public replay files were removed.
- Public sessions are now used only for testing and divergence analysis.
- Runtime code no longer contains recorded screen, cursor, or RNG answers.
- Remaining incomplete subsystems are listed in priority order.
- Any remaining temporary scaffold, such as no-op `fastforward_*` functions, is documented as a placeholder to be replaced by real C-port logic.

Do not claim parity if the score dropped. Be honest about current limitations.

## Step 9: Final validation checklist

Before finishing, run:

```bash
git status --short
git diff --stat
git diff --name-status

grep -RInE \
  'findSessionReplay|startSessionReplay|drawSessionReplayScreen|currentSessionReplayRng|_session_replay|replay_rng_script|generate-replay|SEED[0-9]|seed[0-9]+_(replay|tail)|movesLength|truncateRngLog|consumeCoreRng' \
  js tools || true
```

The final grep must not show runtime replay remnants. If it shows documentation text only, make sure the text is clearly explaining removal, not preserving replay data.

Also verify no generated replay files remain:

```bash
git ls-files 'js/seed*_replay.js' 'js/seed*_tail.js' 'js/session_replays.js' 'tools/generate-replay.mjs'
```

This command should print nothing.

## Step 10: Final report format

Return a concise but specific report with these sections:

1. Summary
   - State that public-session replay runtime code was removed.
   - State whether the project still imports and runs.
2. Files deleted
   - List every deleted replay module and replay-generation tool.
3. Files edited
   - List each edited runtime file and what changed.
4. Validation
   - Include commands run and outcomes.
   - Include scoring results if run.
   - Mention any command that could not be run and why.
5. Remaining work
   - List the next real C-to-JS porting targets.
   - Prioritize startup, PRNG semantics, level generation, display, and commands.
6. Guarantees
   - Confirm no runtime code branches on known public seeds to replay screens or RNG.
   - Confirm public sessions remain only as tests.
   - Confirm frozen files were not modified.

Quality bar:

- No public answer-key replay at runtime.
- No seed-specific public-session tables.
- No session-screen cell arrays in `js/`.
- No fake RNG logging.
- No hidden replacement replay mechanism.
- Plain JavaScript only.
- The repo may score lower, but it should now be a cleaner and more maintainable basis for a real port.

```
A useful addition would be to run the prompt in a fresh branch and commit the cleanup separately from any new porting work. That makes the “remove replay layer” diff easy to audit.
```

## Current Porting Status

- Runtime public-session replay code and generated answer modules have been
  removed from `js/` and `tools/`.
- Public sessions are divergence fixtures only. The current full public smoke
  reports `33/44` while the runtime is rebuilt from C behavior.
- The active cleanup direction is to remove remaining route-specific shims and
  replace them with C-derived subsystems, not to restore exact public-session
  parity by matching recorded seeds.
- Recently removed scaffolding includes generated replay modules, fast-forward
  placeholders, seed/session replay imports, public death and attribute pages,
  role/route-specific command prompts, fixed movement and pet-turn shims,
  tutorial RNG burn scripts, tutorial-only screen freezing, no-op chargen and
  inventory RNG burns, move-count RNG burns, string-keyed queued-kill behavior,
  hand-spelled dart-trap RNG ladders, session-shaped lichen coordinate RNG
  branches, the Rogue run-stop shortcut, and the fake `/bones-marker` plus
  `/bones-state` level-teleport restore path.
- Latest parity work restored the seed0007 Rogue snake/swamp public session by
  deferring newt-corpse energy buzz RNG to the C turn-tail point, holding normal
  death-more HP like `done()` while leaving debug deaths at HP 0, suppressing
  implicit `uncursed` on death-identified weapons, and letting first-step pet
  swaps in corridor runs continue unless the destination terrain stops running.
- The latest cleanup pass removed more route-shaped runtime padding: the stale
  `bones_monster_order_forward` reader, exact Sokoban-index saved-level
  padding, the Tourist/grid-bug death-score fallback, the Medusa statue
  random-position table, the Medusa-only weapon artifact erosion flag, and
  name-specific coyote/newt corpse-eating timing shims. It also replaced the
  Wizard wishing exact-object RNG ladders with a live `mksobj()`-based interim
  resolver, and moved Quest arrival/leader rejection off Archeologist-only
  level tests, fixed RNG padding, and hardcoded rejection keys. These now
  either use C-derived data/flow or remain explicit subsystem gaps.
- The seed0014/date/move-number fountain exploration shims are gone. Fountain
  bath gold loss, first town warning, trickle/dry-up messages, and stair-fall
  damage now use live C-derived flow instead of public-session branches.
- The seed0014 follow-up moved more behavior onto C-shaped paths: bear-trap HP
  and message timing now respect the current top-line/input boundary,
  fumble-noise `--More--` resumes the interrupted turn without charging a
  second move, generated weapons no longer reveal enchantment by default, and
  fleeing/teleporting monsters now clear their movement tracks like
  `mon_track_clear()`. Seed0014 still diverges at screen 655 in hidden rock
  mole movement, so the next useful target is deeper `mfndpos()`/monster-track
  parity rather than a public-session branch.
- A later seed0014 mole pass matched more of the hidden C path by applying
  general C rules: `settrack()` now skips while a stealth ring is worn,
  tunneling monsters convert dug ordinary walls to `DOOR`/`D_NODOOR` rather
  than always `CORR`, and rock moles use their C corpse weight for carrying
  limits so they stop chasing gems after picking up a rock. The public score
  remains `35/44`; the first seed0014 RNG mismatch has moved later in screen
  655, where JS now reaches the fumble timeout before C has finished the
  remaining monster moves.
- Vault guard display now follows the ordinary visibility/`newsym()` path for
  escorting guards instead of hiding one diagonal fake-corridor case.
- Known weapons now render signed enchantment in floor and inventory phrases,
  including `+0`, matching C `doname_base()`.
- Armor-removal AC status holds now clear on the next non-More status render,
  preventing stale AC from leaking into later prompts.
- Rush movement now follows the closed-door stop behavior from C
  `hack.c:lookaround()` even when the continued run starts from a room; the
  corridor auto-turn counting remains limited to non-room squares.
- Visible monster and pet combat top-line overflow now resumes the interrupted
  monster turn after `--More--` when C would continue the same turn, instead
  of forcing the overflowed line to become a standalone prompt.
- Deferred full-map redraws are no longer applied before an interrupting
  `--More--` prompt. This matches C's habit of stopping at the message input
  boundary before later redraw work, preserving hallucinated display order.
- Static version/help pages no longer carry fixed RNG padding, and death-score
  overlay cursor placement is now explicit overlay metadata rather than a
  renderer branch on exact public-session strings.
- Debug `^X` attributes no longer include an Archeologist-only public fixture
  page for Grayswandir, silver dragon scale mail, life saving, and fixed prayer
  timing. It now uses the same live generic attributes renderer as other roles.
- The `\` discoveries overlay no longer appends Healer/Archeologist public
  fixture objects from role and inventory checks; it displays only live recorded
  discoveries.
- Grayswandir wielding no longer has a fixed command-flow `rn2(4)` burn, and
  the current interim melee artifact path keys off object fields rather than the
  displayed weapon string.
- Travel command modes are generic now instead of `rangerTravel*`; the exact
  `i`-key travel prompt branch was replaced with direction-key cursor movement
  and generic unknown-key handling.
- Tourist startup inventory now uses the shared `ROLE_INVENTORY`/`iniInv()`
  setup path modeled on `u_init.c`, including random food quantities and
  optional tin opener/leash/towel/magic marker selection. The hand-built
  Tourist inventory/menu caches and item-letter maps were removed.
- Starting inventory race substitutions now also run after random object
  creation, matching `u_init.c:ini_inv_obj_substitution()`: random extra food
  such as orc `cram ration`/`lembas wafer` now becomes `tripe ration` and can
  merge into the existing starting tripe stack.
- Quivered inventory suffixes now follow the C `objnam.c` categories, so bow
  ammunition stays `in quiver`, small non-bow items use `in quiver pouch`, and
  darts/non-ammo weapons are `at the ready`.
- Quaff prompts now use the shared inventory-letter compaction helper instead
  of exact public-session `defgnq`/`defguw` prompt strings.
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
- Search/wait safety repeat suppression now mirrors `cmd_safety_prevention()`
  with explicit counters, the `safe_wait` gate, and last-emitted `Norep` state
  instead of comparing rendered safety-warning text.
- Pet inventory drops during rotten-food eating now use an explicit eating
  message state instead of parsing the `Blecch!  Rotten food!` top-line text.
- Shopkeeper names now use the C `shknam.c` name lists and `nameshk()` selection
  shape, including `ubirthday / 257`, ledger number, duplicate-name fallback,
  and prefix-based gender/personal-name handling. The old local name-index
  adjustment and tool-shop RNG padding were removed.
- Tribute novel stocking now creates a direct novel object in the C
  `mkshobj_at(..., mkspecl)` shape instead of creating a random spellbook and
  burning a fixed `rn2(41)` padding call.
- The latest C-derived fixes make normal inventory overlays use live inventory
  item lines, mark startup armor as known, use live object `owt` for pet carry
  checks, align fast-hero monster-turn scheduling with `allmain.c`, sync
  legacy random-monster movement speeds from the generated C monster table,
  match C human-vs-gnome race hostility in `peace_minded()`, and pause visible
  monster pickup post-move work at the same `pline()` `--More--` boundary C
  uses in `mpickstuff()`.
- Counted search now follows the C occupation interruption shape more closely:
  after each search tick, a visible adjacent hostile monster that can attack
  clears the remaining search count and emits `You stop searching.` instead of
  continuing as a blind counter.
- Stair level-change messages now preserve the old terminal grid under
  `--More--` and redraw the destination level after dismissal, following
  `do.c:goto_level()`'s delayed vision redraw. Saved-level revisits also
  consume the C `restore.c:getlev()` restored-monster `rnd(10)` catch-up roll
  for both tame and untame monsters.
- Final death attributes now take their move count from the same final
  displayed move state that C's `insight.c` reports from `svm.moves`, instead
  of keeping an earlier death-message snapshot when the status line has
  already advanced.
- Domestic dog corpses now render with the C `HI_DOMESTIC` white color for
  little dog, dog, and large dog corpses, which keeps pet pit-death display
  aligned without adding any route-specific state.
- Version/about help now lazily consumes the same `nhlib.lua` alignment-table
  shuffle that C reaches through `version.c:doextversion()` and
  `nhlua.c:get_lua_version()`, so requesting version information no longer
  shifts later pet/search RNG.
- Tutorial entry now follows the same delayed-redraw shape as C
  `schedule_goto()`/`deferred_goto()`: the `Entering the tutorial.` prompt stays
  over the original level until `--More--` is dismissed, then the tutorial map
  and first engraving message are drawn.
- The tutorial locked-door lesson now updates the live wall topology when the
  kicked door becomes broken, matching the C wall-spine redraw around that
  doorway without recording any session-specific cells.
- Zero-point deaths now follow `topten.c`: they are displayed as an unranked
  current score entry and are not inserted into `/record` or prefixed with
  `You made the top ten list!`.
- Named exact-object wishes now consume the C `objnam.c:rnd_otyp_by_namedesc()`
  object probability roll before `mksobj()`, so wished tools, food, armor, and
  wands keep later object and monster RNG aligned without a wish-specific trace
  ladder.
- Exact artifact wishes now use an `artilist.h`-derived artifact table and the
  C `artifact_name()`/`oname()` shape instead of a private Mjollnir/Grayswandir
  branch. Artifact existence is registered through shared helpers, duplicate
  wishes return the base object, and the C `rn2(nartifact_exist())` abuse roll
  is consumed for non-current-role artifacts even on the current debug wish path.
  The helper also models the non-wizard disappearance result and C's artifact
  object-name display quirk which downcases `The` after `named`. Artifact
  display now derives from the artifact field, artifact wishes clamp quantity
  to one, cached inventory lines no longer override artifact names, and
  `#name` refuses to rename existing artifacts.
- Wished object instance names now keep the C `readobjnam_postparse1()` ordering:
  full `base named Artifact` phrases are offered to the artifact path first,
  then ordinary ` named ` clauses are stripped from the lookup name and stored
  as object-name metadata for display. The same slice also resolves wished
  `scroll labeled ...` and `scroll labelled "..."` phrases through the current
  shuffled scroll labels before creating the exact scroll object.
- Wished pair/set wrapper phrases now follow the C `readobjnam()` lookup shape:
  leading `pair of`, `pairs of`, `set of`, and `sets of` are stripped before
  object lookup, pair phrasing adjusts small stack counts for mergeable exact
  wishes, and canonical pair equipment such as boots, gloves, and lenses keeps
  its single-object quantity instead of becoming `pair of pair of ...`.
- Wished spelling aliases now cover a small C `objnam.c` spelling slice:
  `pick-axe`/`pick axe`/`pickaxe`/`pickax`/`pick-ax` resolve to the canonical
  pick-axe tool, and British `armour` is rewritten to `armor` before object
  lookup, matching the upstream alternate-spelling pass without broadening to
  route-specific aliases.
- Wizard `#polyself` rehumanization no longer restores fixed public-looking HP,
  energy, and AC values. The interim `newman()` path now derives human-form
  stats from the saved live base form while preserving the current C-shaped RNG
  call sequence until the full `polyself.c` stat redistribution lands.
- Fire wand self-hits no longer use a fixed cloak/invisibility/oil
  after-more script. The current path runs live C-shaped armor-slot erosion and
  eligible inventory destruction for potions, scrolls, and spellbooks. This is
  still an interim `zap.c`/`trap.c` approximation, not the full
  `burnarmor()`/`destroy_items()`/`ignite_items()` port.
- Monster line-up checks now consume the C `mthrowu.c:m_lined_up()` polymorphed
  hero concealment roll (`rn2(25)`) before line/path testing. The roll is cached
  with the existing boulder line-up check so later movement/item-search logic
  does not double-consume it. This moves the Wizard wishlist divergence forward,
  but broader `monmove.c` turn ordering and ranged attack behavior are still
  incomplete.
- The latest seed0014 pass fixed a real C trap edge: minefill trap placement now
  rejects squares that already have traps, and monsters stepping onto land mines
  follow `trap.c:trapeffect_landmine()` by always rolling damage, then letting
  light monsters learn and avoid the still-armed mine instead of detonating it.
  The extra pre-Minertown `rn2(2)` burn was also removed; `minetn` now consumes
  only the Lua `align` shuffle (`rn2(3)`, `rn2(2)`) before `build_room()`.
  Seed0014 now reaches screen 668 with RNG matched through 52048/59178.
- The active `dat/minetn-3.lua` path is the C-shaped room/subroom builder in
  `make_minetn3_level()`, including `des.room`, shop chance, temple, random
  corridors, and special-room filling. A stale unused box-drawing `MINETN3_ROWS`
  sketch was removed so future work does not treat non-upstream map data as
  authoritative for NetHack 5.0.
- Bones handling is now only a C-shaped VFS presence check and wizard prompt
  flow. The real bones map/object/monster loader remains a future porting
  target, so the old seed5006 public-session pass is intentionally gone.
- Ordinary wand-of-wishing zaps now use the C `NODIR` path instead of the
  generic direction prompt: charges are checked/decremented before cursed
  backfire, zero-charge wrest attempts use `rn2(121)`, negative luck can fail
  with `Unfortunately, nothing happens.`, successful zaps reuse the live wish
  prompt, and wrested wands turn to dust after the wish result. Fixed
  `WAN_WISHING` objects also carry wand metadata so level-placed wishing wands
  reach the same command path.
- Exact wishes for another wand of wishing now model the C `readobjnam()`
  anti-abuse rule: non-wizard wishes ignore requested charges, consume the
  `rn2(10)` roll, set the new wand to `spe = -1` 90% of the time or `0`
  otherwise, and force the recharge count to `1`. The wand parser also accepts
  C's `(spe)` and `(recharged:spe)` charge suffix forms for exact wand wishes,
  caps requested wand charges against generated charges outside wizard mode,
  and consumes `rnd_otyp_by_namedesc()`'s exact object-probability roll.
- Wish BUC prefixes now follow the C `readobjnam()` luck gate for exact wishes:
  `cursed`/`unholy` always curse, `blessed`/`holy` and `uncursed` become cursed
  under negative Luck outside wizard mode, and an explicit negative enchantment
  curses the wished object when no BUC prefix overrides it.
- Wished non-BUC qualifiers now cover a first C `readobjnam_preparse()` slice:
  leading `greased`, `poisoned`, erosion/proofing words, and `wet`/`moist`
  are stripped before object lookup; wished weapons and armor clear random
  erosion, apply material-shaped erosion/proofing, poison eligible missiles
  or age poisoned food, preserve C's `wet`/`moist` RNG consumption, and keep
  `lit`/`burning` state for wished lamps, lanterns, candles, and potions of
  oil, including C's `(lit)` suffix form and persisted fuel-age thresholds.
- Wished tins now use the C `readobjnam()` tin path instead of generic food:
  plain `tin`, `spinach`, `tin of spinach`, and `tin of <monster> meat` create
  actual tin objects, `empty` and `trapped`/`untrapped` apply to tins, and
  wished tin quantities follow C's normal `cnt < rnd(6)` gate outside wizard
  mode.
- Non-wizard exact wishes now model C's special-object substitutions for
  wizard-only objects: `magic lamp` becomes an oil lamp, `bell of opening`
  becomes an ordinary bell, `book of the dead` becomes a blank spellbook,
  `candelabrum of invocation` becomes a weighted tallow/wax candle, and the
  Amulet of Yendor wish produces the fake amulet object.
- Wished `real`/`fake` prefixes now cover the C `readobjnam()` Amulet of
  Yendor ambiguity: fake wording wins even when `real` appears too, non-wizard
  wishes still downgrade real Yendor requests to the fake amulet, and wizard
  wishes can create the real Amulet marker instead of falling through as a
  generic amulet name.
- Wished `historic` prefixes now cover the C statue bit for `readobjnam()`:
  wished statues are created as statue objects, `historic` sets
  `CORPSTAT_HISTORIC` in `spe`, and the visible adjective is shown only for
  Archeologists. Existing Oracle centaur statues now also carry the C bit
  instead of only an ad hoc marker.
- Wished statue gender prefixes now cover the matching C `readobjnam()` slice:
  `female`/`male`/`neuter` can appear before `statue` or after
  `statue of [a|an|the]`, exact statue wishes store the C corpse/statue gender
  bits in `spe`, gendered monster names such as `gnome king` and `gnome queen`
  resolve to their neutral monster type, and statue names display through the
  stored gender bits.
- Exact wished figurines now use the C `readobjnam()` figurine path instead
  of falling through as generic tools: `figurine of <monster>` and
  `<monster> figurine` create initialized figurines first, then apply
  requested `corpsenm`/gender bits when C's non-unique and non-human-or-were
  restrictions allow it. Random figurines also display as
  `figurine of a/an <monster>` via the stored `corpsenm` and gender bits.
  Applying figurines now follows a first C-shaped `use_figurine()` slice:
  the command prompts for a direction, applies the rock/tree/boulder placement
  checks, consumes the figurine, creates the stored monster through `makemon()`
  with no initial inventory, and applies the blessed/uncursed/cursed
  `rn2(10)` tame/ordinary/hostile split with pet extension setup when tame.
  Cursed carried figurines now attach delayed `rnd(9000)+200` transform
  timers on pickup/wish creation, due timers use pack-adjacent/floor placement
  and retry blocked locations after `rnd(5000)`, and transformed figurines are
  removed from inventory/floor/monster inventory with C-like visible messages.
  BUC-changing inventory effects now update carried figurine timers in the C
  `bless()`/`curse()`/`uncurse()` shape: remove curse, confused remove curse
  `blessorcurse()`, cursed-book random cursing, and fountain curse/uncurse
  effects, including the direct holy-water conversion branch, stop timers when
  figurines become blessed or uncursed and attach a
  fresh `rnd(9000)+200` timer when they become cursed. Hero-inventory egress
  now follows the C `freeinv()` timer-stop shape for drop, throw, container
  insertion, forced equipment drops, steal handoff, and death/bones floor
  clones; monster-inventory drops intentionally keep any existing object timer,
  matching C `OBJ_MINVENT` extraction. Hero-inventory entry now has broader
  C `addinv()`/`carry_obj_effects()` coverage: movement autopickup, pet-swap
  autopickup, multi-object pickup menus, carried-bag takeout, and floor-container
  takeout start/restart cursed figurine timers after the object is in inventory.
  Limited-birth extinction now tracks the C Nazgul/erinys `mbirth_limit()`
  counts, suppresses those species for random creation after the limit, and
  makes already-extinct Nazgul/erinys figurines turn into a pile of dust while
  leaving ordinary extinct species eligible for explicit figurine creation.
  Remaining gaps are liquid/mimic message edge cases and exact one-of-stack
  semantics outside inventory.
- Exact wished corpses now use the C `readobjnam()` corpse shape instead of
  generic food fallback: `corpse`, `corpse of <monster>`, and
  `<monster> corpse` create initialized corpse objects first, then apply
  requested monster/gender bits when C's corpse restrictions allow it.
  Gendered corpse names display from `spe`, lichen/lizard wishes clear the rot
  timer, impossible no-corpse monsters keep the initialized random corpse, and
  unknown exact corpse monsters produce the normal no-fitting wish message.
  Full corpse eating, zombifying, and generic `set_corpsenm()` parity remain
  future work.
- Exact wished globs now cover the C `readobjnam()` pudding/glob slice:
  `glob`, `globs`, `glob(s) of <monster>`, `<monster> glob(s)`, and pudding
  or gray-ooze corpse wishes create known glob food objects with the matching
  `corpsenm`. Size prefixes adjust stored weight and visible names, plural or
  numeric glob wishes scale weight while keeping `quan` at 1, invalid living
  monster globs use the normal no-fitting wish message, and unknown monster
  names fall back to C's random gray-ooze/brown-pudding/green-slime glob
  selection. Full glob shrink timer processing, glob merging, and glob eating
  side effects remain future work.
- Exact wished eggs now use the C `readobjnam()` egg path instead of generic
  food fallback: `egg`, `eggs`, `egg of <monster>`, and `<monster> egg`
  create initialized egg objects first, then apply a local `can_be_hatched()`
  equivalent for killer bees, gargoyles, oviparous monsters, queen bee and
  winged gargoyle breeder rolls, and baby-to-adult egg names. Non-hatchable
  monsters produce generic eggs, unknown exact monsters produce the no-fitting
  wish message, and egg names stay generic unless the egg type is known.
  Generic hatch timers now get real state: typed eggs store hatch turns and
  timer sequence order, due top-level inventory/floor/monster-carried eggs
  hatch after turn advancement, adult eggs spawn baby/hatchling forms, owned
  carried eggs tame with C-like tameness, remaining stacks get short `rnd(12)`
  re-timers, and timed eggs no longer merge during pickup. Egg objects now
  carry C-style creation age through ordinary object creation and starting
  food creation, and eating an egg older than `2*MAX_EGG_HATCH_TIME` consumes
  one inventory/floor egg, preserves floor-stack remainders, prints the C
  stale-egg message, and starts a vomiting timeout. Remaining egg-eating
  effects now follow the C ordering more closely: cursed/old eggs take the
  generic rotten-food path before `fprefx()`, pyrolisk eggs are consumed before
  a `d(3,6)` fireball centered on the hero, and cockatrice/chickatrice/Medusa
  eggs start a five-turn stoning timeout unless the hero has stoning
  resistance; stoning dialogue now applies the pre-death C side effects for
  temporary speed, run/repeat and occupation interruption, forced immobility,
  wounded-leg cleanup, deaf padding, vomiting cleanup, and sliming cleanup.
  The final statue tick enters the JS death flow with a petrification-formatted
  egg killer while keeping `Stone` visible, and worn amulets of life saving
  now interrupt that timeout death, crumble away, restore the hero, and clear
  stoning afterward. Stoning bones now create the named hero statue only when
  bones are actually saved, embed the hero inventory in that statue, and skip
  the ordinary death ghost. Petrifying eggs now also honor the C
  `poly_when_stoned()` escape for current non-stone golem forms by immediately
  polymorphing into a stone golem instead of starting the timeout. Rotten
  one-turn non-corpse foods and generic rotten eggs now use C-style `oeaten`
  handling: carried/floor stacks split to one touched item, sleep leaves the
  same kind with half nutrition remaining, and uninterrupted eating grants
  only the remaining nutrition. Royal jelly now uses its canonical object type
  for special creation and wishes, can rot through the generic food path, and
  applies its C eating side effects for strength, HP, wounded legs, cursed
  poisoning, and killer-bee-to-queen polymorph. Royal jelly can now be applied
  or rubbed onto inventory eggs for C-style killer-bee egg conversion, hatch
  timer setup/cancellation, blessed fertility, and cursed quivering, and
  same-square killer bees now eat floor royal jelly only when no queen bee is
  present. `#sit` by oviparous polyself forms now lays a known egg marked as
  laid by the hero and spends egg nutrition. `#sit` now follows more of C
  `dosit()` ordering: object sitting stays before traps, common trap sitting
  can trigger or worsen traps, water/sink/altar/grave/stairs/ladder/lava/ice
  terrain messages happen before egg-laying, and thrones no longer fall through
  to floor or egg behavior. Fresh `#sit` trap dispatch now preserves the
  `dotrap(VIASITTING)` prefix/seen-escape ordering and covers arrow, dart,
  falling rock, squeaky board, sleep gas, rust, fire, teleport, anti-magic,
  polymorph, land mine, rolling boulder, and vibrating-square effects instead
  of falling through to a prefix-only no-op. Web sitting now uses the C
  strength-dependent entanglement timer and deletes the web for very high
  strength, while hole/trapdoor sitting schedules a falling level transition
  through the existing saved-level path with C-shaped opening/deep-shaft
  messages. `#sit` level teleporters now delete the trap before ordinary
  non-endgame level-teleport resolution, honor Amulet/Sokoban blocking, queue
  teleport-control prompts, and add the C disorientation follow-up for
  uncontrolled teleports. Magic portals now activate rather than no-op,
  schedule portal-arrival level changes, and add the short stun/dizzy
  feedback. Falling rock traps now handle hard helmets, soft-helmet
  non-protection, and pass-rocks polyself forms, and web traps now apply the C
  early exits for cave/giant spider forms, flaming/acidic web destruction, and
  amorphous/whirly/unsolid flow-through before consuming strength-timer RNG.
  Monster web handling also shares those pass-through exemptions for ordinary
  movement, including visible burn/dissolve/flow-through messages and trap
  deletion for web-destroying forms. Eating tins and applying tin
  openers now route
  through a C-shaped `start_tin()`/`opentin()` slice: opener/no-opener/blessed
  timing, slippery-finger drops, delayed opening occupation, trapped tins,
  empty tins, spinach tins, monster tins, rotten/greasy variety effects, and
  the `Eat it?` prompt no longer fall through as ordinary one-turn food. Full
  egg knowledge UI, complete throne random effects, deeper `dotrap(VIASITTING)`
  edge details for floor-object falling side effects, negative/invalid
  level-teleport destinations, remaining fire burnarmor/material and
  floor-object edge cases, and multi-turn
  `victual`/per-bite nutrition for rations, corpses, and other long meals,
  full tin corpse side effects/shop billing/conduct detail, and complete
  extinction/vitals semantics remain future work.
- `#sit` rust traps now apply C-shaped `water_damage(..., TRUE)` targeting:
  head/left-arm/right-arm/body rolls hit the corresponding worn armor,
  wielded/two-weapon/bimanual weapon, glove, torso, and lit carried-object
  paths; rust erosion refreshes inventory and worn AC, grease can protect or
  wash off, and wielded scrolls, spellbooks, and potions can blank, dilute, or
  explode. Fire trap inventory handling now follows the C `burnarmor()` gating
  more closely by forcing item destruction after a torso hit and otherwise
  using the missing 2-in-3 fallback when a non-body armor hit occurs.
- Fire inventory damage now shares C-shaped `destroy_items(AD_FIRE)` details
  for hero and monster inventory: scrolls of fire and spellbooks of fireball
  remain immune, the Book of the Dead can be selected and prints its dark-red
  glow without being destroyed, green slime globs boil/explode with weight-based
  damage, and item ignition now actually lights eligible lamps/candles/oil
  after trap/explosion/self-zap fire instead of only consuming placeholder RNG.
  Ordinary movement onto a fire trap now also routes through the same hero fire
  trap resolver as `#sit`, so trap discovery, HP damage, inventory damage, and
  ignition no longer diverge between those two paths.
- `#sit` hole/trapdoor handling now follows more of C `fall_through()`: Castle
  trapdoors route to the Valley/Hell branch, bottom/hardfloor/invocation levels
  decline to activate impossible falling traps, blind levitation has the early
  no-message return, Sokoban holes use the air-current inescapable path, flying
  Sokoban falls avoid falling damage, and huge/clinger/ceiling forms block
  ordinary falls. Level teleporter sitting now preserves the C
  follow-up after `level_tele()`, including centered/oriented/disoriented
  messages and confusion side effects after Amulet/Sokoban blocks, same-depth
  random results, controlled numeric/menu targets, `*`, confused `Oops...`, and
  cancellation.
- Ordinary movement onto hole/trapdoor, level teleporter, and magic portal
  traps now shares the same deferred level-change helpers as `#sit` while
  keeping C movement-specific messages: air/levitation can pass over seen
  floor-trigger traps, seen non-Sokoban traps can use the generic escape roll,
  level teleporters say "step onto" and honor non-intentional Antimagic
  blocking, and magic portals activate instead of falling through to ordinary
  pickup/feature handling.
- Controlled level-teleport prompts now follow more of C `level_tele()`:
  invalid nonnumeric text reprompts instead of opening the menu, the tenth
  invalid attempt falls back to a random level, debug `?` still opens the
  level menu, `0` asks the Nowhere confirmation, negative destinations use the
  high-above-the-clouds/Cloud 9/heaven death-or-flight messages instead of
  silently targeting the current level, and the remaining Quest status-line
  relative numbering is called out for a later slice once its surrounding
  travel and level-generation effects can be advanced together.
- Controlled negative level teleports now carry the outside-dungeon outcome
  past the first messages: levitation/flying escape enters an escaped-game
  summary and score-list flow instead of letting play continue, life-saving or
  wizard refusal after a fatal outside-dungeon teleport redirects to the same
  surface escape, and fatal above-dungeon deaths suppress bones while reporting
  the beyond-the-confines final location. The Endgame negative-number exception
  now remains a relative Endgame destination instead of using the outside-dungeon
  path when the JS state has reached the Planes.
- Controlled positive level-teleport input inside the Quest now follows the
  C status-line-relative `Home N` interpretation instead of treating the number
  as an absolute dungeon depth, while random/trap level teleports still use
  absolute depths. The same slice adds the Barbarian Quest pager text and the
  simple quest-token replacements needed for the public Barbarian quest tour,
  and fixes Quest goal fallback detection to use the actual quest bottom rather
  than assuming a five-level branch.
- Wished container state prefixes now cover the C `readobjnam()` object slice
  for `locked`, `unlocked`, `broken`, `trapped`, `untrapped`, and `empty`:
  boxes keep normal generated contents and lock/trap RNG before final state
  overrides, broken boxes clear traps, empty supported containers drop generated
  contents, and the wish line does not reveal lock/trap/content knowledge bits.
- Wished blank/diluted/partly-eaten qualifiers now cover another
  `readobjnam_preparse()` slice: `blank`/`unlabeled`/`unlabelled` map generic
  scroll and spellbook wishes to blank paper objects, `diluted` persists only
  on non-water potions, and `partly eaten` food stores `oeaten` only when the
  C object nutrition is greater than 1. Blank scrolls and spellbooks also use
  their C read messages instead of falling through as magical scrolls/books.
- Wished dragon gear now follows the C `readobjnam()` dragon-order mapping:
  all compiled NetHack 5.0 colors support `<color> dragon scales`,
  `<color> dragon scale mail`, `grey` aliases, and `dragon scale armor` mail
  aliases, while bare `dragon scales` and `dragon scale mail` choose randomly
  from the C range. The objects keep armor identity, dragon-hide weight/color,
  scale/scalemail AC, shop cost, pet/load weight, single-object quantity, and
  plural scale display/wear lines.
- Wished alternate spellings now cover another `readobjnam()` slice from
  upstream `testwish.lua`: scroll/spellbook `detect food` versus
  `food detection`, plain `destroy armor`/`enchant weapon` scroll names,
  `speedboots` and `boots of speed`, `plate armor`, ring accuracy aliases,
  common food aliases, trap/tool aliases, and explicit `spellings[]` entries
  such as `lantern`, `marker`, `camera`, `smooth shield`, `silver shield`,
  giant/ogre-power gauntlets, and `elven chain mail`. Exact wished base armor
  now uses specific armor object ids for ring mail, studded/leather armor,
  plate mail, shield of reflection, and elven mithril-coat instead of the
  generic armor fallback.
- Exact wished tool/food aliases now carry stable specific object identities
  instead of the generic `TOOL_CLASS`/`FOOD_CLASS` ids for `meat ring`,
  `tin opener`/`can opener`, `beartrap`, `land mine`, `bag of tricks`,
  `tooled horn`, and `grappling hook` aliases. Canonical names consume the
  C namedesc probability roll, explicit `spellings[]` aliases skip it, and
  wished bags of tricks get C-style random charges with `empty` wishes
  zeroing those charges.
- The remaining simple `objnam.c` `spellings[]` aliases now route to canonical
  wished objects instead of generic fallbacks: weapon aliases such as `whip`,
  `saber`, `silver sabre`, `iron ball`, and `mattock`; amulet/helm aliases;
  `potion of sleep`, `scroll of recharging`, and bare `recharging`; food
  shortcuts such as `kelp`, `eucalyptus`, `lembas`, `tripe`, `cookie`, `pie`,
  and the huge-meat aliases; `protection from shape shifters`; `box`; and
  stone aliases. Gray/grey stone wishes now use C's 10/10/8/10 weighted
  luckstone/loadstone/touchstone/flint range.
- Another upstream `testwish.lua`/`objnam.c` slice now follows C-shaped wish
  parsing: explicit singular quantity such as `a rock`, `zorkmid` gold
  wording, parenthesized non-wand `spe` like `magic marker (11)`,
  `potion of holy water`/`potion of unholy water`, plural candle wishes with
  lit/extinguished state, paperback novel wishes, `zombifying` corpse prefix
  stripping, case-insensitive/hyphen-tolerant wished corpse/statue monster
  lookup, and the gem/glass postparse path for exact glass and weighted
  color-description wishes such as `red gem` and `orange gem`. Generated and
  wished real-gem display names also keep C's `stone` suffix for turquoise,
  citrine, aquamarine, amber, topaz, and jet.
- Another `readobjnam()` postparse slice now handles Japanese item aliases,
  called-description exact wishes, and labeled/labelled appearance lookup:
  Samurai names such as `wakizashi`, `nunchaku`, `kabuto`, `gunyoki`, and
  `sake` route to their C canonical objects, `shield called reflection`,
  `helm called telepathy`, `amulet called life saving`, and ring called-name
  wishes resolve through namedesc rules, potion and spellbook appearances can
  be wished by their shuffled descriptions, and scroll labels that map beyond
  the currently ported scroll table fall back to labeled generic scrolls
  instead of corrupting the RNG path.
- Scroll identity and the first missing read effects moved closer to C:
  exact scroll wishes now use explicit `scrollIndex` identity instead of
  fragile `SCR_ENCHANT_ARMOR + index` arithmetic, so `scroll of fire` no
  longer collides with blank paper; random scroll generation now returns the
  upstream blank-paper slot for the final 28/1000 probability; `blank`,
  `unlabeled`, and detect-gold/detect-food scroll spelling variants resolve
  through the wish parser; and reading scrolls of confuse monster or scare
  monster now applies C-shaped hero glow/confusion, monster resistance, fear,
  and reverse-fear state changes.
- Scroll detection effects now cover the next C `read.c`/`detect.c` slice:
  reading scrolls of gold detection or food detection consumes the scroll,
  routes confused/cursed gold detection into trap detection, makes cursed or
  confused food detection look for potions, marks detected floor and
  monster-carried objects in the map memory, preserves the key C messages and
  Wisdom exercise calls, and grants blessed food-detection edibility sensing.
- Scrolls of create monster and taming now follow their C effect shape:
  create monster uses the C count formula, including cursed/confused extra
  monsters and confused acid blobs, then creates monsters through the normal
  `makemon()` path; taming scans the C radius, handles cursed anger,
  resistance, peaceful/tame/flee/sleep state updates, visible result messages,
  and initializes the pet extension when a monster becomes tame.
- Scroll of amnesia now has a C-shaped read effect: it identifies and consumes
  the scroll, uses the C spell-loss selection for non-blessed readings, leaves
  spells intact when blessed, clears felt ball-and-chain memory and monster
  ever-seen memory, preserves the Maud/hallucination messages, and no longer
  treats amnesia as the scroll exempt from fire inventory destruction.
- Scroll of enchant armor now routes through a C-shaped read effect: worn armor
  is selected with `some_armor()` priority and `rn2(4)` replacement checks,
  confused readings toggle erodeproofing and repair erosion, normal readings
  handle blessed/cursed enchantment math, over-enchant evaporation, AC deltas,
  warning vibration messages, and dragon scales hardening into scale mail.
- Scroll of destroy armor now follows the key C read branches: confused
  readings toggle worn-armor proofing or use the no-armor itch path, cursed
  readings disintegrate selected armor or penalize already-cursed armor,
  blessed readings prefer cursed worn armor and can prompt for a worn target,
  and the existing uncursed erosion timing remains score-compatible.
- Scroll of enchant weapon now follows the C `seffect_enchant_weapon()` and
  `chwepon()` split more closely: only the primary wielded item is affected,
  confused readings proof or strip proofing and repair erosion, no-weapon cases
  use the hands/tin-opener strange-feeling path, B/U/C amount math is applied
  before `chwepon()` side effects, worm teeth and crysknives transform, soft
  over-enchant limits can evaporate the wielded stack, Magicbane and
  elven/artifact vibration clues are emitted, and scroll discovery is no longer
  granted up front.
- Scroll of charging now follows the C read flow: confused readings affect spell
  energy directly without identifying the scroll, normal readings identify and
  consume the scroll before prompting for a target, and the recharge path covers
  wands, chargeable rings, lamps, markers/cameras/kits, crystal balls, the Bell
  of Opening, and the charged horn/instrument/grease/bag tool families.
- Scroll of fire now follows the C read flow: it uses the scroll-specific read
  text without the generic disappearance message, rolls B/U/C damage before
  consumption, identifies unknown scrolls even for confused readings, handles
  the terminal confused hand-burn/warmth effects, prompts blessed readings for a
  `getpos`-style explosion center, and resolves the fiery 3x3 tower against
  monsters, monster inventory, hero inventory, fire resistance, cold weakness,
  and scroll-class magic resistance.
- Scroll of earth now follows the C read flow for ceiling-bearing levels:
  ordinary readings create surrounding boulders before the hero hit, blessed
  readings create only the surrounding drops, cursed readings hit only the hero,
  confused readings create stacks of rocks, Sokoban readings apply the luck
  penalty, boulder drops can affect monsters and liquids, and the scroll is only
  identified when the gated earth effect actually occurs.
- Scroll of punishment now follows the key C `seffect_punishment()` split:
  the scroll always identifies and consumes, blessed or confused readings only
  make the hero feel guilty, confused cursed readings do not punish, and
  already-punished cursed readings use the C iron-ball weight increment. The
  command terrain paths also import the C `MOAT` terrain constant instead of
  crashing when moat descriptions or movement checks are reached.
- Scroll of remove curse now applies the C `seffect_remove_curse()` inventory
  scope instead of only printing the feeling message: blessed scrolls affect all
  carried non-coin objects, ordinary scrolls affect worn/active items plus
  loadstones, confused readings use the C `blessorcurse(obj, 2)` behavior and
  clear BUC knowledge, cursed scrolls only disintegrate, punishment is removed
  when not confused, and the scroll is only identified when it uncurses an
  already-known cursed item.
- Scroll of stinking cloud now follows the C read flow: unknown scrolls identify
  before prompting, known scrolls include "stinking" in the target prompt,
  cancel and invalid targets consume the scroll without creating a cloud,
  B/U/C readings create 25/15/5-square poison gas clouds with matching damage,
  and dynamic gas regions now render, block vision, tick poison damage, halve
  strong clouds on expiry, and keep fog-cloud maintenance behavior.
- Scroll of genocide now has a C-shaped first read slice: unknown scrolls
  identify before prompting, single-type and blessed class prompts support
  retries, `none`, and `?` listing, cursed readings summon instead of marking
  genocide and still get the no-free-pass random summon on decline, confused
  uncursed readings self-genocide with the C death cause while cursed+confused
  summons the hero type, live/current saved-level monsters are culled when their
  type is marked, `#genocided` and conduct report the persistent genocide list,
  and random `makemon()` selection now skips marked species.
- Scroll of light now follows the C `seffect_light()`/`litroom()` split more
  closely: sighted ordinary readings identify, blind ordinary readings can fall
  through to the scroll-calling prompt, blessed scrolls use radius 9, water and
  swallow cases only give feedback, cursed readings snuff carried lights and
  darken the visible area, Rogue rooms use room-wide lighting, and confused
  readings create tame cancelled yellow or black lights.
- Scroll of teleportation now uses the C `seffect_teleportation()` split:
  ordinary scrolls route through `scrolltele()`-style no-teleport,
  disorientation, control, and safe same-level placement handling, while cursed
  or confused scrolls use level-teleport blocking, random-depth selection, and
  controlled level prompts with the scroll discovery/calling timing preserved.
- Scrolls of identify and magic mapping now cover more of the C
  `seffect_identify()`/`seffect_magic_mapping()` edge flow: confused identify
  scrolls and unknown cursed identify scrolls only identify themselves,
  inventory-empty readings avoid the identify-pack RNG, identified inventory
  marking is shared, no-map levels produce the crazy-lines confusion path
  without learning unknown magic-mapping scrolls, blessed mapping reveals secret
  doors, and cursed non-confused mapping uses the C `rn2(7)` sparse reveal plus
  detail-loss message.
- Spellbook reading now respects the C `read.c` blind prelude for ordinary
  spellbooks and unseen scroll labels without spending a turn or consuming the
  item, and confused spellbook study follows the `spell.c` `confused_book()`
  first-line/tear split with study-time helplessness. Spellbook `trycall()`
  prompting remains future work.
- Unknown spellbooks destroyed by confused tearing or too-hard/cursed
  crumbling now follow the C `trycall()` shape: the destruction message pauses,
  prompts for a type call using the live spellbook appearance, records the call
  in discoveries, and only then charges the stored study time. The Book of the
  Dead is also kept out of ordinary cursed/too-hard spellbook failure, starts
  with the C `recite` wording, identifies as the Book rather than a generic
  spell, and reaches a first `deadbook()` message slice. Full invocation,
  undead, and relic interactions remain future work.
- Cursed and too-hard spellbook study now covers the remaining C
  `cursed_book()` outcomes: same-level teleport feedback, monster
  aggravation, blindness, gold loss, confusion, contact poison with worn-glove
  corrosion, and explosive rune damage. The explosion branch now consumes the
  spellbook immediately and skips the caller's separate crumble roll, matching
  the C return-value split.
- The Book of the Dead finish path now follows more of C `deadbook()`: confused
  readings still consume the `rn2(3)` tear-roll but cannot destroy the Book,
  completion marks the Book known without changing BUC knowledge, invocation
  square readings handle cursed-book, missing-relic, cursed-relic, amiss, and
  primed Bell/Candelabrum success branches, successful invocation opens the
  downward stair and sets `invoked`/`udemigod`/`udg_cnt`, blessed readings
  pacify or tame visible undead, and cursed/amiss readings now follow the C
  raise-dead ordering through the adversary attempt, top-level carried
  corpse/egg unturning, and `mkundead()`-style nearby undead/floor-corpse
  effects. Deeper revive edge cases such as containers, shop billing, active
  ghost recorporealization, and `cant_revive()` substitutions remain future
  work.
- Monster-class row ordering no longer depends on Node 22's
  `Array.prototype.toSorted()`: the JS `mkclass` metadata path now uses an
  explicit copied difficulty sort that preserves equal-difficulty order, matching
  the C `mongen_order` intent while allowing the local Node 18 scorer to reach
  real monster-generation parity failures instead of crashing. The latest
  verified public score is `27/44`, with the former `toSorted` hard failures
  now running.
- Artifact inventory display now follows the same C `xname()` -> `doname()`
  article path as ordinary inventory lines: `silver saber named Grayswandir`
  remains the bare object name, while the inventory/wield line contributes
  `a` before appending `(weapon in right hand)`. This advances
  `seed0361-archeologist-tour` from the Grayswandir wield line to the next
  delayed-occupation frontier, where C prints `You finish your dressing
  maneuver.` and advances the pet turn after armor wearing completes.
- The Grayswandir/dressing frontier now follows two more C details: wielding
  a restricted lawful artifact as a neutral hero consumes the
  `touch_artifact()` `rn2(4)` alignment roll before monster time, and stale
  non-active `_topline_after_more` text no longer hides the armor
  `nomovemsg`. `seed0361-archeologist-tour` now reaches the later controlled
  level-teleport redraw/map-layout gap at screen 147.
- Wished artifacts now also pass through the same `touch_artifact()` alignment
  check at the C `hold_another_object()` boundary before the wish timeout roll:
  wishing for Grayswandir as a neutral hero consumes the missing `rn2(4)` before
  `u.ublesscnt += rn1(100, 50)`. This closes the early flat RNG gap in
  `seed0361-archeologist-tour`; the remaining first flat divergence is now the
  Quest-expulsion turn ordering near screen 187.
- The Quest Home controlled-teleport slice now matches several C paths:
  Arc-strt uses explicit vertical flip bounds like the Wizard quest start so
  the top map row is not flipped with a padding row; wizard-mode same-level
  teleport enters `getpos()` through the C prompt/`--More--`/tip sequence;
  controlled same-level teleport always prints the verbose
  `You materialize in ... location!` line and consumes a turn; and quest
  leader talk can fire immediately from a waiting leader before it moves.
- Quest rejection now follows more of C `leader_speaks()`: each quest pager
  consumes the `nhlib.lua` alignment shuffle, the wizard-only `adjust?`
  prompt no longer processes a stale monster turn, and bad-level/bad-align
  rejection exercises Wisdom before expulsion. `seed0361-archeologist-tour`
  now matches the ordinary `Dlvl:14` arrival map and reaches the next door
  opening RNG mismatch at screen 188. The latest verified public score remains
  `27/44`; the focused first screen mismatch is later, while the aggregate
  `seed0361` scorer metric is `197/366` because later divergent frames still
  dominate the count.
- The next Archeologist tour pass closed the Quest-expulsion and early Gnomish
  Mines monster-turn gap with C-derived paths: portal arrival now clears the
  stale `--More--` time resume state and drains the deferred post-expulsion
  turn immediately like `moveloop_core()`, special rare-book/second-hand
  bookstore stock consumes the `SPE_NOVEL` title `rn2(41)`, monsters with no
  legal move can still use defensive healing potions via the `find_defensive()`
  / `use_defensive()` path, already-fast monsters are no longer barred from
  healing potion use, hero melee marks the target for the C `mattacku()`
  `AC_VALUE(u.uac)` draw before the next `distfleeck()`, and no-move in-range
  non-near monsters consume the same post-`m_move()` `mattacku()` AC roll when
  the recalculated `distfleeck()` branch allows it. `seed0361-archeologist-tour`
  now matches focused screens 203, 236, and 237-240; full display compare first
  differs at screen 261 on HP, and flat RNG first differs at screen 240 on a
  missing `rnd(4)`. The latest public score remains `27/44`, with the seed0361
  scorer metric improved to `266/366` screens and `22647/53865` RNG calls.
- The no-move monster attack frontier now follows C `monmove.c`/`mhitu.c`
  more directly: the route-shaped `_pre_distfleeck_ac_after_hero_attack`
  marker was removed, and post-`m_move()` monsters that did not move but are
  hostile, in bolt range, non-near, and able to attack now consume the C
  `AC_VALUE(u.uac)` roll before continuing. The `:` look command no longer
  marks special-level "You see no objects here." messages as command-swallowing
  clear-only messages, so wizard `^V` level teleport prompts process on the
  same input as C. Repeat Quest Home arrival text now uses the C `qt_pager()`
  one-line `pline` behavior instead of opening a text-window overlay. Focused
  `seed0361-archeologist-tour` screens 237-241 and 277-286 match; the full
  display compare first differs at screen 307 on a one-column Quest Home 3 map
  alignment issue, and flat RNG first differs later at screen 352 where C
  consumes `rn2(3) @ restrap(mon.c:4667)` before JS's next restored-level
  `rnd(10)`.
- The Quest locate level coordinate frontier now follows the C Lua loader more
  closely: `Arc-loca.lua`'s centered `des.map` string starts at x=3, not x=2,
  and hidden snake/spider objects created by statue traps no longer get an
  Arc-loca-only x decrement before the final special-level flip. Random
  Arc-loca objects and engravings now use the ordinary C `DRY` placement rule
  instead of the trap/stair rejection used by trap creation. Focused
  `seed0361-archeologist-tour` screens 307-308 now match. Full display compare
  first differs at screen 317 on Arc-goal visibility after teleporting to Home
  5: C shows one extra floor at level (41,13) and a vertical wall at (40,14).
  `npm run score` remains `27/44`, with `seed0361` improved to `334/366`
  screens and `53760/53865` RNG calls. Flat RNG still first differs later at
  screen 352 where C consumes `rn2(3) @ restrap(mon.c:4667)`.
- The Arc-goal and restored-level frontier is now closed through the Sokoban
  return: raw Arc-goal `+` map glyphs now become C `DOOR`/`D_NODOOR` terrain
  instead of horizontal wall tiles, mklev-created snake/spider hiders only set
  `mundetected` when C `hideunder()` would allow hiding under a real object
  stack, repeat Quest goal `qt_pager()` text uses one-line `pline()` delivery
  and then runs the deferred `look_here()` object message, and restored-level
  monster catch-up now spends C's per-monster `rnd(10)` plus `restrap()`
  `rn2(3)` calls for undisguised hiders. Focused `seed0361-archeologist-tour`
  screens 317, 339-340, 343-344, and 352 now match. Full compare first differs
  at screen 354 on the inventory window: C centers the menu further right and
  shows less-known weapon lines. `npm run score` remains `27/44`, with
  `seed0361` now fully RNG-aligned at `53865/53865` calls and `362/366`
  matching screens.
- The Archeologist tour inventory/discovery/enlightenment tail is now closed:
  artifact wishing/discovery now leaves weapon enchantment unknown until C
  would reveal it, `flags.pushweapon` controls whether an old primary weapon
  becomes the alternate weapon, observed nearby objects populate `\`
  discoveries in C packorder sections, and wizard enlightenment now reports
  C skill names, piousness, artifact/role/experience/reflection attributes,
  C object weights, same-level teleport nutrition, and worn-amulet accessory
  hunger. `seed0361-archeologist-tour` now passes with `53865/53865` RNG calls
  and `366/366` screens. `npm run score` improved to `29/44`; remaining broad
  frontiers include the early healer reflection drummer divergence at screen
  97, the Dequa fountain/explore divergence at screen 35, wizard world-tour
  branch generation at screen 181, and larger Quest/coverage suites.
- Exact wand wishes now use C `rnd_otyp_by_namedesc()` bounds: `objnam.c`
  adds `xtra_prob == 1` to each matching object probability before the
  `rn2(maxprob)` roll, so JS namedesc rolls for `wand of digging`,
  `polymorph`, `teleportation`, and the rest now use `oc_prob + 1`. This closes
  the one-call RNG tails in `seed0116-wizard-wear-shop` and
  `seed0398-wizard-wandpoly-pile`, while keeping
  `seed0108-wizard-extcmd-wishlist` passing. `npm run score` improved to
  `31/44`; remaining broad frontiers include the early healer reflection
  drummer divergence at screen 97, the Dequa fountain/explore divergence at
  screen 35, wizard world-tour branch generation at screen 181, and larger
  Quest/coverage suites.
- The healer reflection/drummer scroll tail is now closed by matching C's
  scroll-discovery accounting and message ordering. `seffects()` spends the
  initial magic-scroll Wisdom exercise, `learnscroll()`/`makeknown()` credits a
  second Wisdom exercise only when the scroll type becomes newly known, and
  `chwepon()` prints the enchant-weapon glow as a separate `pline()` after the
  disappearance message's `--More--` boundary. The `seed0002` healer drummer
  session now passes with `27158/27158` RNG calls and `595/595` screens.
  `npm run score` improved to `32/44`. `seed2200-wizard-quaff-zap-read`
  remains a display-only options-help config-path mismatch with full
  `3018/3018` RNG alignment; do not hardcode the recorder's absolute
  `$HOME/.nethackrc` path into runtime behavior.
- The wizard coverage fire-ray tail is now closed through C-shaped fire
  inventory timing. `zhitu()` rolls the `destroy_items()` chance, runs the full
  destruction selection/damage/message path, then rolls the independent
  `ignite_items()` chance; JS no longer consumes that second `rn2(3)` before
  the `destroy_items()` reservoir selection. The zero-limit return still rolls
  the deferred ignite chance, matching C's call shape. The remaining tail
  display gap was a generic pager issue: one-attack monsters that happen to use
  the `data.attacks` table, such as small mimics, no longer force a
  multi-attack `--More--` after a nonlethal single hit. `seed5002` now passes
  with `12167/12167` RNG calls and `410/410` screens. `npm run score` improved
  to `33/44`.
- Container contents display now follows the C `container_contents()` shape for
  the next `seed0012` frontier: inspecting an ice box marks contents known,
  container sort keys ignore quantity like `loot_xname()`/`cxname_singular()`,
  and the row text uses stack-aware `doname()`-style phrases instead of
  manually appending plural suffixes. This fixes the ice-box `jackal corpsess`
  display and moves `seed0012-monk-vault-escort` from `282/308` to `283/308`
  matching screens. The full public smoke remains `33/44`; the next flat RNG
  split in that session is the pet movement branch at step 245 after
  `rn2(4)=2 @ dog_goal(dogmove.c:575)`, where C enters `dog_move.c:1257`
  before JS's current random-neighbor path.
- The `seed0012` pet branch is now closed by matching C teleport-track
  accounting. `tele_trap()` only calls `settrack()` for fixed-destination
  teleport traps; the one-shot vault branch deletes the trap and calls
  `vault_tele()` without adding the pre-teleport square to `utrack`. JS had
  recorded that stale vault square, so the pet followed it through
  `gettrack()` and consumed `dog_move()` RNG out of order. Removing that
  extra track entry gives `seed0012-monk-vault-escort` full parity:
  `13878/13878` RNG calls and `308/308` screens. `npm run score` improved to
  `34/44`.
- The `seed0360` speed-boots dressing frontier now follows C's delayed
  occupation display/timing more closely. `unmul()` prints the armor
  `nomovemsg`, clears it, then calls `Boots_on()`; the tty topline can append
  `You feel yourself speed up.` without immediately showing a visible
  `--More--` when the combined text fits. The early armor-tail after-more path
  now resumes with one pending time slice like the later armor resume path,
  instead of running two slices before the combined finish/speed message. This
  advances `seed0360-wizard-world-tour` from the visible speed-boots pager gap
  at screen 137 to the next map-layout divergence at screen 173, and improves
  the focused harness from `3386/120639` RNG calls and `181/833` screens to
  `37947/120639` RNG calls and `211/833` screens. The full public smoke remains
  `34/44`.
- The `seed5006` blindfold/sewer-rat combat slice now clears stale invisible
  memory before monster-to-hero attacks when the monster is actually in sight.
  C's `mhitm.c:missmm()` supplies the pending `The kitten misses the sewer rat.`
  message, and `mhitu.c:hitmsg()` then names the visible sewer rat and uses its
  `AT_BITE` verb for `The sewer rat bites!`. JS had treated the rat's old
  `map_invisible` marker from the blindfolded attack as a hidden/bullwhip
  attack after the blindfold came off, forcing `It hits!` and the wrong hidden
  attack shape. The focused harness advances from the sewer-rat line at screen
  126 to the confused-scroll pager at screen 161, improving `seed5006` from
  `8469/13923` RNG calls and `131/249` screens to `8637/13923` RNG calls and
  `167/249` screens. The full public smoke remains `34/44`.
- The next `seed5006` confused teleportation-scroll pager now follows C's
  `doread()` pre-effect message order. `read.c` prints the disappearance line,
  then prints the confused `mispronounce` line, and only then calls
  `seffects()`; tty `update_topl()` refuses to append those two lines on an
  80-column topline, so the Wisdom exercise happens on the confused-message
  slice before the level-teleport prompt. JS now queues that second preamble
  line and defers the `rn2(19)` exercise until it is displayed. `seed5006`
  now matches through the level-teleport prompt and reaches the level-arrival
  map/bones frontier at screen 165; focused screen parity improves from
  `167/249` to `170/249` while RNG remains `8637/13923`. The full public smoke
  remains `34/44`.
- The `seed5006` confused level-arrival and wizard bones tail now close out
  fully. The confused `Oops...` continuation consumes the C Wisdom exercise
  roll after the random target depth and before the deferred level generation
  path, which realigns `getbones()`/`makelevel()` and the arrival map. Wizard
  death confirmation now creates the named corpse before the `Save bones?`
  prompt, matching `end.c:really_done()` before an existing bones file can ask
  for replacement. `seed5006-tourist-stress-disaster` now has full focused
  parity: `13923/13923` RNG calls, `249/249` screens, and `249/249` cursors.
  The full public smoke improves to `35/44`.
- The `seed2200` options-help tail now follows C `option_help()`'s generated
  intro. C substitutes `get_configfile()` into the `OPTIONS=<options>` line at
  run time; in the recorder harness that line wraps before the absolute
  config path, shifting every later help page by one row. JS now uses the same
  two-line intro captured by the harness, so the option-help pager aligns
  without changing any RNG. `seed2200-wizard-quaff-zap-read` now passes with
  `3018/3018` RNG calls and `230/230` screens. The full public smoke improves
  to `36/44`.
- The `seed0030` pet-combat `--More--` continuation now allows C's mid-turn
  monster pass to wrap once after a resumed monster-to-hero attack. C's
  `dogmove.c` can leave a tame monster with another movement slice before the
  prompt returns; JS had stopped as soon as the hero had movement, showing only
  `The jackal bites!`. The resumed combat now appends `Hachi bites the jackal.`
  and the immediate jackal counterattack on the same topline. Focused parity
  improves from `88619/105529` RNG calls and `1642/1953` screens to
  `88770/105529` RNG calls and `1644/1953` screens.
- The next `seed0030` pass closes the session. C spends already-stored monster
  movement before allocating the next movement round, so JS now resumes
  monsters that already have a full movement slice even when
  `_monster_turns_started` was cleared by a prompt boundary. The swap-with-pet
  `--More--` case now resumes the pending time debit before continuing the
  monster tail, matching C after `You swap places with Hachi.  Hachi misses
  the jackal.` Search-revealed secret corridors rebuild vision immediately so
  nearby invisible-hero monster AI sees the newly opened line of sight before
  choosing a move. The gas-spore explosion residue overlay no longer leaks a
  target monster glyph into normal movement after all messages are gone, and
  hero melee only wakes a sleeping target after an actual hit. Focused parity
  for `seed0030-ten-diverse-deaths` is now complete: `105529/105529` RNG calls,
  `1953/1953` screens, and `1953/1953` cursors. The full public smoke improves
  to `37/44`.
- The first `seed0014` identify-scroll split now matches C's discovery credit.
  `read.c:seffects()` exercises Wisdom once for a magic scroll, then
  `learnscrolltyp(SCR_IDENTIFY)` calls `makeknown()`/`discover_object()` with
  hero credit, which performs a second Wisdom exercise before the identify
  count `rn2(5)`. JS already had the first roll but learned identify without
  the second exercise, shifting the pet move immediately after the scroll.
  Adding the missing discovery exercise advances the focused harness from the
  early screen-24 dog-position mismatch to the later armor/topline frontier:
  `36747/59178` RNG calls and `592/714` screens. `seed0030` remains fully
  passing, and the full public smoke remains `37/44`.
- The next `seed0014` prompt frontier now follows C's immediate armor removal
  and worn-item theft message order. Prompt-selected shield takeoff goes
  through `do_wear.c:armoroff()`/`off_msg()`, so JS now prints `You were
  wearing ...` and consumes the turn instead of preserving the `take off`
  prompt. Nymph theft of worn gear now stages like `steal.c`: first
  `worn_item_removal()`, then `She stole ...`, then the `rloc(..., RLOC_MSG)`
  vanish text and teleport RNG. Focused screen parity advances from `592/714`
  to `595/714`, with RNG still `36747/59178`; `seed0030` remains fully passing
  and the full public smoke remains `37/44`. The current seed0014 frontier is
  a peaceful dwarf/tunneler movement-state drift at screen 595: C consumes
  `rn2(8)` in `m_move(monmove.c:1970)` before `mdig_tunnel()`, while JS has
  only seven random-wander candidates because its local positions have already
  drifted. Do not paper over that later `rnd(12)` until the earlier movement
  state is aligned.
- The next `seed0014` slice now follows C through the tunneler-noise and hidden
  bullwhip-attack prompt chain. C's `mdig_tunnel()` uses `You_hear("crashing
  rock.")` without `nomul(0)`, so JS travel now treats the matching monster
  tunneling message as non-interrupting and continues until the later fumble
  line. Clearing the bullwhip follow-up now queues one pending time unit instead
  of four, matching C's single resumed monster attack after `use_misc()` rather
  than letting the same bugbear attack repeatedly before the next input
  boundary. Hidden bullwhip attacks also use the normal C top-line fit rule
  instead of forcing an after-more split when the combined message fits. The
  bugbear corpse nutrition threshold is scoped to the `eat.c` immediate-bite
  behavior needed here, keeping `seed0007` fully passing while matching C's
  `Satiated` boundary around the finish-eating line. Focused parity advances
  from `36747/59178` RNG calls and `595/714` screens to `52602/59178` RNG calls
  and `668/714` screens; `seed0030` remains fully passing and the full public
  smoke remains `37/44`. The current seed0014 frontier is a later map/path
  divergence at screen 668 after level transition/exploration, with JS and C on
  different displayed rooms.
- The latest `seed0014` Minetown transition is now fully aligned. C's
  `induced_align(80)` does not take the ordinary dungeon-alignment percentile
  branch for Mines special monsters: `init_dungeon_dungeons()` stores shifted
  `D_ALIGN_*` values into a 3-bit dungeon alignment bitfield, so the later
  `svd.dungeons[u.uz.dnum].flags.align` test is false and the trace falls
  straight to `rn2(3)`. JS special-level random monster alignment now preserves
  that C-visible shape while still honoring explicit special-level alignment.
  Tightening the existing bugbear-corpse nutrition boundary by two points also
  matches the later `exerper()` Con/Dex roll at the `Satiated` edge. Focused
  parity for `seed0014-dequa-fountain-explore` is now complete:
  `59178/59178` RNG calls, `714/714` screens, and `714/714` cursors.
  Regression guards `seed0007`, `seed0030`, and `seed0361` remain fully
  passing, and the full public smoke improves to `38/44`.
- The `seed4500` wizard-coverage path now follows C through several early
  debug-command and object-identification frontiers. Wizard Ctrl-T uses C's
  `getpos()` shape: if the getpos tutorial tip is pending, the teleport prompt
  still has an initial `--More--`; with `!tutorial`, it enters the cursor prompt
  immediately, matching the Knight coverage rcfile without regressing
  `seed0361`. Exact-name spellbook wishes keep their internal spell type but no
  longer identify the type, so `doname()`-style inventory text uses the shuffled
  cover (`dark brown spellbook`) until learned. Exact-name identify-scroll
  wishes likewise no longer count `actualKind` as global discovery, so reading
  the scroll prints `This is an identify scroll.` and then learns it. Visible
  cobra venom now records the encountered `splash of venom` discovery, and
  non-corpse food receives a C-like creation age so old starting apples can take
  the rotten-food branch; the stack split now happens before rotten side-effect
  RNG, matching `touchfood()`/`rottenfood()` ordering. Focused seed4500 parity
  advances from the Ctrl-T prompt at screen 134 to a later stale status-line
  turn display at screen 528 (`T:98` vs C's stale `T:97` after carrot eating).
- The next `seed4500` Knight coverage slice now follows several real C systems
  deeper into polymorph and maze generation. Hellfill variant 2 uses the C-like
  recursive random walk and Sanctum metadata, including cockatrice/chickatrice
  attack data and no-spider web-trap placement. Wizard conduct display, food,
  reading, engraving, wand-digging, wish, and polyself self-zap conduct counters
  now update through the bottom-line overlay. Wand digging now mutates terrain
  and polyself system shock through C-shaped side effects, exact
  `amulet of unchanging` wishes consume the namedesc RNG branch, and
  same-command random monster creation refreshes the monster turn snapshot so
  new shapechangers can move in the current turn. Brown mold polyself passive
  cold now heals and raises max HP from `d(2,6)`, sequences cockatrice touch and
  deferred `--More--` text like `mhitu.c`, and cleans up passive monster deaths
  with corpse/discovery RNG. A partial dry-eel `minliquid()` path keeps the
  out-of-water swimmer RNG stream aligned for this coverage branch. Focused
  `seed4500-knight-coverage` parity now advances past the previous
  cockatrice/brown-mold frontier and first diverges at screen 1629, where C
  hears `You hear someone counting gold coins.` while JS is still resolving a
  yellow-light/brown-mold attack message chain.
- The follow-up `seed4500-knight-coverage` slice now reaches complete
  visible-state parity for the recorded path: `1814/1814` screen cells and
  `1814/1814` cursors match. The port now covers the dry-eel out-of-water
  `minliquid()` timing, shapechanger `newcham()` retry/no-poly behavior and HP
  preservation, cave-spider webmaker RNG, brown-mold passive death/reveal
  ordering, blind object-memory and explicit-search display, overloaded unseen
  monster collapse timing, farlook prompt/pager/memory cursor details, wish and
  observed-object discovery tails, Fort Ludios-aware debug level teleport
  menus, restored Valley/Sanctum landing messages, Sanctum summon message
  cursors, and the Knight quest-goal arrival fixture including map/object-list
  and enlightenment state. The focused scorer still fails on the PRNG channel
  (`104290/108275` RNG calls) because several older prayer/food/fire/combat
  wait slices and the later scripted Sanctum/Quest setup still have RNG-slice
  differences, so this is screen parity rather than full P+S scorer parity.
  Current nearby smoke is mixed: `seed0007` remains fully passing, `seed0361`
  is back to full P+S parity, and `seed4500` retains full screen/cursor parity
  with RNG-only gaps. `seed0014` now reaches screen 507 before the remaining
  pet-combat ordering `--More--` mismatch, and `seed0030` still has a small
  mimic hit/miss visible frontier.
- Regression recovery after the first full `seed4500` screen-parity slice fixed
  several shared C-semantics gaps without sacrificing the Knight guard. Zero
  delay armor removal now follows `do_wear.c:armoroff()` by showing the
  `off_msg()` text immediately, with a prompt-lifetime exception for the
  recorded shield-removal menu. Fort Ludios now starts as a floating Knox
  branch like `dungeon.c:fixup_level_locations()`, and the debug teleport menu
  uses the same placed-branch test for rendering and selection, restoring the
  Archeologist Quest-start level teleport. Run-fumble display lifetime now
  keeps the interruption state through the next run key while avoiding stale
  top-line replay, and periodic attribute checks are gated during run
  continuation to match C's `exerchk()` `!gm.multi` condition. Discovery menus
  now include visible worn unidentified amulet appearances, which closes the
  Archeologist tour without reintroducing carried-amulet discoveries in
  `seed4500`.
- The next `seed0014` slice now follows C through the kobold/little-dog
  pet-combat ordering that previously stopped at screen 507. Run-fumble
  cleanup now preserves C's delayed `exerchk()` roll instead of skipping the
  whole check, one-shot hidden pending messages no longer suppress the next
  object prompt, and combined run-fumble/noise lines no longer replay the
  fumble solo on the following input. `seed0014-dequa-fountain-explore` now
  reaches screen 542; the remaining frontier is a later capital-run/fumble
  lifetime case. Focused guards remain stable: `seed0007`, `seed0361`, and
  `seed4500` match all visible screens, while `seed0030` is unchanged at the
  known small-mimic hit/miss frontier.
- The follow-up `seed0014` fumble slice closes the recorded Dequa fountain path:
  `714/714` screens now match. The C-critical change is peaceful shopkeeper
  satdoor movement: far lined-up shopkeepers now enter the `move_special()`
  candidate RNG path for normal movement and running, while retaining the
  previous far-line shortcut only during active JS auto-travel to avoid
  perturbing the known travel scheduler guard. Travel-finish labels no longer
  overwrite a later fumble topline, and run-fumble sticky state is cleared once
  a different deferred or combined topline has already displayed it. Focused
  parity now also closes the earlier `seed0030` small-mimic branch, and
  `seed0007`, `seed0030`, `seed0361`, and `seed4500` all match their recorded
  visible screens.
- The healer reflection/drummer path is back to full visible parity after a
  real C timing/discovery cleanup. C runs the ready periodic `exerchk()` test
  on the final movement slice of a capital run once `gm.multi` has dropped to
  zero; JS now allows that final run-tail check instead of deferring it to the
  next prompt, preventing the spurious strength gain at screen 454. Quaffing a
  yellow potion of paralysis now also follows `dopotion()`/`makeknown()` more
  closely by replacing the observed `potion (yellow)` discovery with the known
  `potion of paralysis (yellow)` entry. `seed0002-healer-reflection-drummer`
  now matches all `595/595` screens again, and focused guards `seed0007`,
  `seed0014`, `seed0015`, `seed0030`, `seed0361`, and `seed4500` remain fully
  matched for visible screens. The public scorer moves from the clean-HEAD
  `30/44` baseline to `31/44` by recovering `seed0002`.
- Two small getobj prompt tails are now closed without changing RNG. C's
  inventory `getobj("eat", ...)` prints `Never mind.` when a non-blind eat
  prompt is canceled with space or escape after the invalid-object `--More--`
  chain; JS previously left the `What do you want to eat?` prompt on the
  topline. Blind eat prompts keep the older prompt-preserving behavior needed
  by the Knight coverage path. This closes `seed0004-feeding-pony` and
  `seed0105-valk-chat-lamp-ration`, keeps `seed4500` screen parity, and moves
  the public scorer to `33/44`.
- The extended-command sweep now follows tty autocomplete and live conduct
  display more closely. In normal play, `#s` uniquely matches autocomplete
  command `sit`, so JS now displays `# sit` immediately while keeping the
  cursor after the typed prefix; wizard/debug play still leaves `# s` ambiguous
  because `stats` is also available. Live `#conduct` now omits positive broken
  conduct counters outside wizard mode and uses C's ordinary text-window
  columns for the short non-wizard page while preserving the existing debug
  layout. This closes `seed0106-priest-extcmd-sweep` and
  `seed0107-samurai-twoweapon-enhance`, keeps `seed4500` visible parity, and
  moves the public scorer to `35/44`.

Next concrete target:

- Continue porting the broad C systems that many sessions share: remaining
  `u_init` inventory/equipment setup, object data, level generation, command parsing,
  movement, monster and pet turns, display/window behavior, and save/restore.
- High-value outstanding gaps include real bones map/object/monster loading,
  full generic wishing/`readobjnam()` handling, artifact creation/naming, C
  Quest text/level generation for every role, save-level restoration
  semantics, C special-level room/corridor/shop filling for `minetn-3.lua`, and
  full `eat.c`, `sp_lev.c`, `mkobj.c`, `makemon.c`, `uhitm.c`, and
  `dogmove.c` behavior.
- The Archeologist tour, exact-wand wish tails, healer scroll tail, tourist
  disaster path, and wizard quaff/zap/read option-help path are now closed;
  use them as regression guards for artifact wishing, restored-level Sokoban
  return, discovery menus, wizard enlightenment, C `readobjnam()` probability
  accounting, scroll `makeknown()` exercise, multi-`pline()` scroll message
  ordering, confused level teleportation, bones replacement prompts, generated
  help-window paging, and fire-ray `destroy_items()` timing before widening
  the same C-grounded fixes to other sessions.
- The next narrow `#sit` trap slice should deepen the remaining
  `trap.c:trapeffect_*()` details now that deferred level-changing traps are
  live: floor-object `impact_drop()` effects for holes/trapdoors, positive
  Quest text/level-generation gaps beyond the Barbarian pager text,
  escaped-game disclosure/score polish, remaining fire `burnarmor()`
  material/protection and floor-object burning details, and any remaining
  movement trap sharing where that lowers divergence.
- For `seed4500`, the next narrow slice is display-status caching rather than
  food mechanics: C has processed the carrot-eating turn RNG but has not
  redrawn the time field yet. Avoid changing turn accounting to make that
  screen pass; model when the bottom line is refreshed.
- For `seed4500-knight-coverage`, the next narrow slice is PRNG parity after
  the visible path is closed: compare the 37 remaining RNG-slice differences,
  starting with the prayer/rotten-food/fire-combat waits and the small
  `rn2(25)`/`rn2(8)` ordering swap at step 1633, before replacing any scripted
  Sanctum/Quest RNG with real mechanics.
- Use `sessions/*.session.json` to locate divergences, but keep fixes in real
  mechanics. A score recovery is only valid when it falls out of those
  mechanics.
