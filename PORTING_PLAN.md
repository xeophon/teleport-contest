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
  reports `35/44` while the runtime is rebuilt from C behavior.
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
  Applying figurines and their transform timers remain future work.
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
  Full hatch timeout processing and egg eating side effects remain future work.
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

Next concrete target:

- Continue porting the broad C systems that many sessions share: `u_init`
  inventory/equipment setup, object data, level generation, command parsing,
  movement, monster and pet turns, display/window behavior, and save/restore.
- High-value outstanding gaps include real bones map/object/monster loading,
  full generic wishing/`readobjnam()` handling, artifact creation/naming, C
  Quest text/level generation for every role, save-level restoration
  semantics, C special-level room/corridor/shop filling for `minetn-3.lua`, and
  full `eat.c`, `sp_lev.c`, `mkobj.c`, `makemon.c`, `uhitm.c`, and
  `dogmove.c` behavior.
- Use `sessions/*.session.json` to locate divergences, but keep fixes in real
  mechanics. A score recovery is only valid when it falls out of those
  mechanics.
