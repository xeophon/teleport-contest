# Porting `xeophon/teleport-contest` from NetHack C to JavaScript

_A long-form implementation guide for an LLM coding agent. The goal is a faithful, plain JavaScript port, not a transpilation._

Last inspected: 2026-05-09.

Repository under study: `https://github.com/xeophon/teleport-contest`.

Primary upstream target: NetHack 5.0, tag `NetHack-5.0.0_Release` in `https://github.com/NetHack/NetHack`.

Additional prior-art context: the Mazes of Menace project and the Teleport Contest announcement describe the same philosophy: port the game logic into simple, readable JavaScript, make the browser version bit-exact against C, and do it by using reference recordings, not by compiling C to WebAssembly or transpiling C to JS.

> Important limitation of this guide: the announcement URL `https://mazesofmenace.ai/announcement/` failed direct fetch during this analysis. Search-indexed announcement snippets and the public Mazes of Menace README were available and are incorporated. The repo files and upstream C files listed below were inspected directly.

---

## 0. What the next LLM must optimize for

The task is not to create a game that resembles NetHack. It is to create a JavaScript implementation whose externally observable behavior matches the patched C recorder:

- Same PRNG call sequence, call type, arguments, and return values.
- Same terminal grid at each input boundary, after canonicalization by the scorer.
- Same cross-segment behavior for save files, bones files, record files, and chained games.
- Same prompts, menus, cursor placement, message timing, and status line formatting.
- Same bugs, edge cases, weird historical behavior, and date-dependent behavior.

This requires a source-level porting process. The right mental model is:

1. Treat the C source as the executable specification.
2. Treat public sessions as golden integration tests.
3. Treat RNG divergence as the first structural failure.
4. Treat screen divergence as a rendering, UI, or game-state failure.
5. Treat every hardcoded replay entry in `js/fastforward.js` as technical debt.
6. Replace fast-forwarded RNG with real C-equivalent functions, one subsystem at a time.

Do not optimize for a low local public score by trace-hardcoding. The contest has held-out sessions, and the phase design explicitly rewards generalization. A solution that memorizes `sessions/*.session.json` will fail outside those sessions and will be penalized by the spirit and mechanics of the contest.

---

## 1. Source index and file roles

Use this as a map while exploring. Every path listed here should be read before making large architectural decisions.

### 1.1 Top-level repository files

| File or directory       | Why it matters                                               |
| ----------------------- | ------------------------------------------------------------ |
| `README.md`             | Main contest statement, rules, quick start, scoring summary, frozen files, public and held-out session counts, and warnings about `fastforward.js`. |
| `.gitmodules`           | Declares `nethack-c/upstream` as a submodule pointing at `https://github.com/NetHack/NetHack.git`. |
| `package.json`          | Confirms ES modules, Node >= 22, and `npm run score` as `bash frozen/score.sh`. |
| `index.html`            | Browser play entry point. Imports `GameDisplay`, `NethackGame`, `game`, and `moveloop_core`. |
| `docs/API.md`           | Exact `runSegment(input, prevGame)` contract, session shape, screen/RNG/cursor comparison, sandbox limits. |
| `docs/PHASES.md`        | Two-phase mechanics and why a repeatable porting method matters. |
| `sessions/`             | Public recorded C sessions. Each `.session.json` contains input plus recorded comparison data. The runner strips recorded answers before calling your code. |
| `frozen/`               | Scoring harness and judge-owned files overlaid before local and official scoring. |
| `nethack-c/`            | Patched deterministic C recorder and upstream C submodule.   |
| `tools/session-viewer/` | Useful for visual screen diffs. Inspect and use it when screen mismatches are confusing. |
| `scripts/`              | Contest support scripts. Useful for build and metadata operations, but do not rely on arbitrary scripts during scoring. |

### 1.2 Current JavaScript skeleton

| JS file              | Current status                                               | Porting implication                                          |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `js/jsmain.js`       | Contest entry point. Defines `NethackGame` and `runSegment`. Captures screen/RNG before `nhgetch`. | Keep the public API or replace it with an equivalent object that provides `getScreens()`, `getRngLog()`, and `getCursors()`. Fix `datetime` and multi-segment persistence. |
| `js/gstate.js`       | Global singleton `game` plus `resetGame()`.                  | This is the JS analogue of C global state. A complete port should make all C globals accessible through a stable, structured state graph. |
| `js/rng.js`          | ISAAC64 wrapper for core RNG only. Implements `rn2`, `rnd`, `rn1`, `d`, `rne`, `rnz`. | Needs exact C logging semantics, `rnl`, display RNG, Lua call-context behavior, and maybe a call-context annotation layer for debugging. Current `d()` is not C-equivalent for logging because C `d()` consumes raw `RND()` internally and logs a `d(n,x)` call. |
| `js/fastforward.js`  | Auto-generated RNG replay for `seed8000-tourist-starter`.    | Delete entries only after real C-equivalent logic consumes the same RNG naturally. Do not add new fast-forward traces. |
| `js/allmain.js`      | Partial `newgame()` and `moveloop_core()` with hardcoded Tourist state and fast-forward calls. | Must be replaced by a source-faithful port of `src/allmain.c`, plus initialization dependencies from `unixmain.c`, `role.c`, `u_init.c`, `dungeon.c`, etc. |
| `js/cmd.js`          | Minimal command dispatcher. Only vi movement keys and unknown command message. | Full port must cover `cmd.c`, command queues, repeat counts, extended commands, prompts, direction parsing, occupations, menus, and all game commands. |
| `js/mklev.js`        | Partial regular-level generator. Many object, monster, trap, engraving, Lua, and fill functions are stubs or approximate RNG consumers. | Port `mklev.c`, `mkmap.c`, `mkroom.c`, `sp_lev.c`, `rect.c`, `mkobj.c`, `makemon.c`, and special level logic. Replace approximate stubs with real state updates. |
| `js/display.js`      | Partial terrain renderer. No real glyph system for monsters, objects, traps, menus, or message window. | Port C display logic and tty window behavior. The scorer cares about visible 24x80 output, not internal style. |
| `js/vision.js`       | Partial Algorithm C shadow-casting. Missing light sources, boulders, mimics, underwater, blindness, pits, and many edge cases. | Port full `vision.c` and ensure it calls `newsym()` at the same times as C. |
| `js/game.js`         | Basic `GameMap` and `makeLocation()` analogous to part of `struct rm` and level state. | Expand to cover full `struct level`, object chains, monster chains, traps, rooms, regions, engravings, damage, timers, and migrations. |
| `js/game_display.js` | Wrapper around frozen `Terminal`, plus minimal message state. | Useful, but a full port needs a windowport abstraction closer to NetHack's `winprocs` and tty behavior. |
| `js/input.js`        | `nhgetch()` fires the capture hook, then reads from a module-level queue or the display queue. | Preserve capture timing, but implement C-like input queues and key parsing. Be careful that `runSegment()` currently queues keys on `GameDisplay`, not in `input.js`'s module queue. |
| `js/options.js`      | Small `OPTIONS=` parser.                                     | Port `options.c` and all relevant option side effects, especially role/race/gender/align, `symset`, `msg_window`, `legacy`, `tutorial`, autopickup, and display options. |
| `js/rect.js`         | Close to C `rect.c`; `rnd_rect()` calls `rn2(rect_cnt)`.     | Keep but audit exact mutation order and boundary behavior.   |
| `js/hacklib.js`      | Small utility subset.                                        | Expand with C string helpers, coordinate helpers, `depth()`, date helpers, and dungeon relationship helpers. |
| `js/const.js`        | Generated and hand-pinned constants from headers.            | Audit and regenerate. It currently has suspicious `VERSION_MAJOR = 3`, `VERSION_MINOR = 7`, `PATCHLEVEL = 0` while the target is NetHack 5.0. Header branch strings can still say NetHack-3.7, but displayed version constants must match the recorder. |
| `js/nethack.js`      | Browser bootstrap.                                           | Keep browser play simple, but do not let browser code diverge from scoring code. |
| `js/terminal.js`     | Frozen by judge.                                             | Do not modify. The scorer overlays the canonical version.    |
| `js/isaac64.js`      | Frozen by judge.                                             | Do not modify. All RNG contexts must use this implementation. |
| `js/storage.js`      | Frozen by judge.                                             | Do not modify. Use its VFS API for save, bones, and record persistence. |

### 1.3 Frozen scoring files

| File                        | What to understand                                           |
| --------------------------- | ------------------------------------------------------------ |
| `frozen/score.sh`           | Requires `.teleport/repo-metadata.json` category, overlays frozen `isaac64.js`, `terminal.js`, and `storage.js`, then runs `frozen/ps_test_runner.mjs`. |
| `frozen/ps_test_runner.mjs` | Normalizes sessions, strips recorded answers, imports your `runSegment`, gathers JS screens/RNG, compares RNG positionally, and compares screens through `screen-decode.mjs`. |
| `frozen/session_loader.mjs` | Normalizes legacy and v5 sessions into `{ seed, datetime, nethackrc, moves, steps }`. |
| `frozen/screen-decode.mjs`  | Converts screen strings into a 24x80 grid and defines visible cell equality. Study this before debugging display mismatches. |
| `frozen/storage.js`         | Provides `vfsReadFile`, `vfsWriteFile`, `vfsDeleteFile`, `vfsListFiles`, and `InMemoryStorage`. State should persist across segments within a session. |
| `frozen/terminal.js`        | Canonical terminal grid and `serialize()` behavior. The judge overlays it. |
| `frozen/isaac64.js`         | Canonical PRNG engine. The judge overlays it.                |

### 1.4 C recorder and upstream C source

| Path                                                       | Why it matters                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `nethack-c/README.md`                                      | Build instructions and recorder environment variables.       |
| `nethack-c/patches/README.md`                              | Explains the eight deterministic recorder patches.           |
| `nethack-c/patches/001-deterministic-runtime.patch`        | Pins seed and fixed datetime with env vars.                  |
| `nethack-c/patches/002-deterministic-qsort.patch`          | Replaces `qsort` with stable sort.                           |
| `nethack-c/patches/003-rng-log-core.patch`                 | Adds core RNG logging macros and function-body logs. Critical for matching composite calls. |
| `nethack-c/patches/004-rng-log-lua-context.patch`          | Adds Lua callsite context for Lua-side `rn2` and `random`.   |
| `nethack-c/patches/005-rng-display-logging.patch`          | Logs display RNG calls as `~drn2(...)` when enabled.         |
| `nethack-c/patches/006-008-nomux-*.patch`                  | Captures deterministic 24x80 terminal frames at `tty_nhgetch` boundaries. |
| `nethack-c/upstream/src/allmain.c`                         | Startup, `newgame()`, `moveloop_preamble()`, `moveloop_core()`, and once-per-turn systems. |
| `nethack-c/upstream/src/rnd.c`                             | PRNG wrappers and exact C behavior of `rn2`, `rnd`, `rnl`, `d`, `rne`, `rnz`. |
| `nethack-c/upstream/src/mklev.c`                           | Regular dungeon level generation, rooms, corridors, stairs, doors, vaults, niches, and room fill. |
| `nethack-c/upstream/src/sp_lev.c`                          | Special level and room construction helpers. Also used by themed rooms. |
| `nethack-c/upstream/src/mkmap.c`                           | Map generation and lighting helpers.                         |
| `nethack-c/upstream/src/rect.c`                            | Rectangle allocator for room placement.                      |
| `nethack-c/upstream/src/cmd.c`                             | Command queue, command parsing, extended commands, menu command behavior. |
| `nethack-c/upstream/src/hack.c`                            | Movement, running, boulder push, traps, floor effects, autopickup, movement update. |
| `nethack-c/upstream/src/display.c`                         | Glyph layering, memory, monsters, objects, traps, background, `newsym()`. |
| `nethack-c/upstream/src/vision.c`                          | Full vision system.                                          |
| `nethack-c/upstream/src/drawing.c` and `include/display.h` | Glyph to symbol/color mapping.                               |
| `nethack-c/upstream/src/botl.c`                            | Status line content and formatting.                          |
| `nethack-c/upstream/win/tty/*`                             | TTY windowport, message windows, menus, prompts, cursor behavior. |
| `nethack-c/upstream/src/u_init.c`                          | Player initialization, starting inventory, attributes, role/race/gender/align handling. |
| `nethack-c/upstream/src/role.c`                            | Role/race selection and role data.                           |
| `nethack-c/upstream/src/dungeon.c` and `dat/dungeon.*`     | Dungeon branch topology and special level placement.         |
| `nethack-c/upstream/src/objects.c`, `src/monst.c`, headers | Object and monster data tables.                              |
| `nethack-c/upstream/src/mkobj.c`, `src/makemon.c`          | Object and monster construction with heavy RNG use.          |
| `nethack-c/upstream/dat/*.lua`                             | Lua special levels and themed rooms. Some can be converted to JS data and logic. |

---

## 2. The contest API and scoring surface

The scorer calls only one exported function:

```js
// js/jsmain.js
export async function runSegment(input, prevGame = null) {
    return game;
}
```

The `input` object has exactly the fields your code is allowed to see:

```js
{
  seed: number,
  datetime: "YYYYMMDDHHMMSS",
  nethackrc: string,
  moves: string
}
```

Recorded screens and recorded RNG values are not passed to your code. The runner strips them out before calling `runSegment`. The returned object must expose:

```js
{
  getScreens(): string[],
  getRngLog(): string[],
  getCursors(): [col, row, visible][]
}
```

A session can have multiple segments. The runner does:

```js
game = null;
for (const segment of session.segments) {
  game = await runSegment(segment, game);
}
```

Therefore:

- `prevGame` is the previous returned object within the same session.
- Cross-segment C state must persist within a session.
- Cross-session state resets because each session is run in its own child process.
- Save files, bones files, and record files should use the frozen VFS in `js/storage.js`.

The public runner compares:

1. `getRngLog()`, after filtering lines that look like PRNG calls and stripping caller annotations.
2. `getScreens()`, by decoding both sides into 24x80 cells and comparing visible pixels.
3. `getCursors()`, currently as a tiebreaker or secondary channel.

The score is the number of screen frames that match. PRNG matching does not directly add points, but if PRNG diverges, game state usually diverges and screen matching collapses.

### 2.1 Input boundary timing

The C recorder captures a frame when C blocks for the next key, specifically at `tty_nhgetch` boundaries. The skeleton mirrors this by setting `game._preNhgetchHook` and calling it in `js/input.js` before reading a key.

Maintain this invariant:

- Capture the screen before consuming the next key.
- Capture the RNG slice since the prior input boundary before consuming the next key.
- Do not capture frames in the middle of turn processing unless C would ask for input there, such as `--More--`, menu selection, yes/no prompt, direction prompt, or name prompt.

A common mistake is to treat each character in `moves` as exactly one turn. In NetHack, a key can open a prompt, and the next key can answer that prompt without advancing a turn. Conversely, one key can trigger several `--More--` prompts. The capture unit is not a turn; it is a blocking input request.

---

## 3. How to explore the repository efficiently

Do not begin by asking an LLM to port all of NetHack. Start with a tight exploration and divergence loop.

### 3.1 First local commands

```bash
git submodule update --init
bash frozen/set-category.sh agentic
node frozen/ps_test_runner.mjs sessions/seed8000-tourist-starter.session.json
bash frozen/score.sh
```

Expected result before real work: the skeleton will get partial credit only on the seed8000 starter-like path, and fail broadly elsewhere.

Use Node 22 or newer. The project is ES module based. Browser play requires HTTP, not `file://`:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

### 3.2 Inspect session shape

Use this snippet to see what a public session contains:

```bash
node --input-type=module - <<'NODE' sessions/seed8000-tourist-starter.session.json
import { readFileSync } from 'node:fs';
import { normalizeSession } from './frozen/session_loader.mjs';

const path = process.argv[2];
const data = normalizeSession(JSON.parse(readFileSync(path, 'utf8')));
console.log(JSON.stringify({
  segments: data.segments.length,
  first: {
    seed: data.segments[0].seed,
    datetime: data.segments[0].datetime,
    nethackrc: data.segments[0].nethackrc,
    movesLength: data.segments[0].moves.length,
    steps: data.segments[0].steps.length,
    firstRng: data.segments[0].steps[0]?.rng?.slice(0, 20),
    firstScreen: data.segments[0].steps[0]?.screen?.slice(0, 400)
  }
}, null, 2));
NODE
```

This is for debugging only. Your `runSegment` never receives `steps`.

### 3.3 Find the first RNG divergence

Create a debugging script outside the scoring surface, for example `tools/compare-one-session.mjs`, that:

1. Loads a session with `normalizeSession`.
2. Calls `runSegment(replayInputFor(seg), game)` exactly as `ps_test_runner.mjs` does.
3. Flattens C RNG calls from `steps[].rng`.
4. Compares normalized JS and C RNG entries.
5. Prints the first mismatch with surrounding context.

Pseudo-code:

```js
function isRngCall(entry) {
  return typeof entry === 'string' && /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(entry);
}

function normalizeRng(entry) {
  return String(entry).replace(/\s*@\s.*$/, '').replace(/^\d+\s+/, '').trim();
}

for (let i = 0; i < cRng.length; i++) {
  if (normalizeRng(cRng[i]) !== normalizeRng(jsRng[i] || '')) {
    console.log({ index: i, c: cRng[i], js: jsRng[i] });
    break;
  }
}
```

Do this before looking at visual diffs. If RNG diverges at call 312, later screen mismatches are usually downstream noise.

### 3.4 Find the first screen divergence

Use `frozen/screen-decode.mjs` for visual diffs. Do not compare raw strings because equivalent ANSI/DEC encodings can render the same grid.

Pseudo-code:

```js
import { decodeScreen, diffCell, ROWS_24, COLS_80, renderCell } from './frozen/screen-decode.mjs';

function firstCellDiff(a, b) {
  const ga = decodeScreen(a || '');
  const gb = decodeScreen(b || '');
  for (let r = 0; r < ROWS_24; r++) {
    for (let c = 0; c < COLS_80; c++) {
      const kind = diffCell(ga[r][c], gb[r][c]);
      if (kind) return { row: r, col: c, kind, got: ga[r][c], want: gb[r][c] };
    }
  }
  return null;
}
```

Classify screen mismatches into:

- Message mismatch: row 0 or `--More--` behavior.
- Map glyph mismatch: glyph layer, terrain, objects, monsters, memory, visibility.
- Status mismatch: status line formatting, player state, options, highlight attributes.
- Prompt/menu mismatch: windowport behavior, input boundary timing, cursor.
- Color/attribute mismatch: glyph color or SGR mapping.
- Cursor mismatch: usually later, but fix once screen content matches.

### 3.5 Build the C recorder only when needed

The public sessions are enough for the main loop. Build the recorder if you need custom traces:

```bash
git submodule update --init nethack-c/upstream
bash nethack-c/build-recorder.sh
```

Dependencies: `clang`, `make`, `bison`, `flex`.

Use clang. The README warns that C argument evaluation order is undefined, and gcc and clang differ in practice. JS evaluates function arguments left-to-right, so the recorder is pinned to clang.

Useful recorder environment variables:

```bash
export NETHACK_SEED=8000
export NETHACK_FIXED_DATETIME=20000110090000
export NETHACK_RNGLOG=/tmp/nethack.rng
export NETHACK_RNGLOG_DISP=1
export HACKDIR="$PWD/nethack-c/recorder/install/games/lib/nethackdir"
```

The patched tty emits deterministic 24x80 frames at input boundaries. Use it to produce targeted debugging sessions with keyplans that exercise one subsystem.

---

## 4. How the C code is organized conceptually

NetHack is not a neat modern engine. It is an old, global-state-heavy, macro-heavy C program. The cleanest JS architecture is not to hide that reality. Mirror it in a controlled way.

### 4.1 Global state model

C has many global structures and namespaces. In JS, put them under one `game` object or an equivalent state root.

Common C state buckets you will encounter:

| C name or pattern                          | Meaning                                                      | JS strategy                                                  |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `u`                                        | Hero state: position, level, HP, energy, attributes, inventory state, statuses, alignment, events. | `game.u`, using field names close to C.                      |
| `gy.youmonst`                              | Hero as a monster-like struct.                               | `game.youmonst` or `game.gy.youmonst`. Keep monster-data pointer semantics by storing indices or object refs. |
| `svl.level` and `levl[x][y]`               | Current level and map cells.                                 | `game.level.locations[x][y]`, preserving x-major indexing if possible. |
| `svr.rooms`, `svn.nroom`                   | Room array and room count.                                   | `game.level.rooms`, `game.level.nroom`. Preserve order and stable sorting. |
| `svm.moves`                                | Turn counter.                                                | `game.moves` or `game.svm.moves`, but be consistent.         |
| `svc.context`                              | High-level context flags: move, run, occupation, random encode, command state. | `game.context` or `game.svc.context`. The current skeleton uses `game.context.move`. |
| `flags`                                    | Player and game options.                                     | `game.flags`.                                                |
| `iflags`                                   | Interface options and runtime UI flags.                      | `game.iflags`.                                               |
| `disp`                                     | Display invalidation flags and status needs.                 | `game.disp`.                                                 |
| `gm`, `gc`, `go`, `gh`, `gv`               | Many per-file global structs introduced by modern NetHack.   | Either mirror these names under `game` or flatten carefully. Mirroring reduces porting friction. |
| `fmon`, `fobj`, `invent`, `migrating_mons` | Linked lists.                                                | JS arrays can work, but linked-list semantics and iteration mutation order matter. Often use explicit `next` fields. |
| `program_state`                            | Startup, restore, save, gameover, window init, etc.          | `game.program_state`.                                        |

Do not over-normalize early. Porting is easier when JS identifiers and field paths resemble C. A later refactor can improve ergonomics if parity is preserved.

### 4.2 Startup call graph

`allmain.c:newgame()` is the central source for new-game startup. The current `js/allmain.js:newgame()` fakes much of this.

The C sequence, simplified but in order, is:

```text
early_init(argc, argv)
  program_state_init
  decl_globals_init
  objects_globals_init
  monst_globals_init
  sys_early_init
  runtime_info_init

main platform setup
  read options
  choose role/race/gender/align/name if needed
  init windows

newgame()
  notice_mon_off
  initialize context IDs and monster vitals
  init_objects
  role_init
  init_dungeons
  init_artifacts
  u_init_misc
  l_nhcore_init
  reset_glyphmap
  mklev
  u_on_upstairs
  vision_reset
  check_special_room(FALSE)
  makedog
  u_init_inventory_attrs
  docrt
  flush_screen(1)
  bot
  optional reroll menu
  u_init_skills_discoveries
  optional wizard kit
  optional legacy pager
  timing and save-state setup
  welcome(TRUE)
  notice_mon_on
  notice monsters or lookaround

moveloop(FALSE)
  moveloop_preamble(FALSE)
  optional tutorial
  repeat moveloop_core()
```

The skeleton currently does:

```text
fastforward_pre_mklev
l_nhcore_init
hardcoded dungeon/branch setup
mklev partial
fastforward_fill_mineralize
fastforward_post_mklev
hardcoded Tourist state
u_on_upstairs
vision setup
initial display
hardcoded welcome message
```

Porting strategy: replace that fake sequence with real C-equivalent calls in the same order. Do not merely shift the fast-forward boundaries. The goal is to make `fastforward_pre_mklev`, `fastforward_fill_mineralize`, `fastforward_post_mklev`, and `fastforward_step` become empty and then disappear.

### 4.3 Main loop call graph

`allmain.c:moveloop_core()` has three broad phases:

1. If the previous action took time, process monster movement and once-per-turn systems until the hero has movement points again.
2. Process once-per-player-input updates, display invalidation, status updates, and ongoing occupations.
3. Read and execute the next command with `rhack(0)`, then handle deferred level changes and vision updates.

A simplified outline:

```text
moveloop_core()
  get_nh_event
  maybe_shuffle_customizations
  dobjsfree
  sanity checks, wishes, bypass cleanup

  if context.move:
    u.umovement -= NORMAL_SPEED
    while u.umovement < NORMAL_SPEED:
      encumber_msg
      movemon loop
      near_capacity
      if monsters and hero out of movement:
        mcalcdistress
        give movement to monsters
        maybe_generate_rnd_mon
        u_calc_moveamt
        settrack
        moves++
        l_nhcore_call(NHCORE_MOVELOOP_TURN)
        glibr, nh_timeout, regions, prayer counters
        regen_hp, regen_pw
        teleportitis, polymorph checks
        autosearch, warning, sounds, storms, hunger
        age_spells, exercise, vault checks
        amulet, wipe engravings
        demigod intervention
        bubbles, fumaroles
        multi-turn immobilization
    hero_seq++
    encumber_msg
    clairvoyance scheduling
    lava/pool effects
    underwater/buried display
    see_nearby_monsters

  clear_splitobjs
  amulet wish
  find_ac
  hallucination or telepathy display refresh
  vision_recalc if needed
  bot/timebot and cursor
  m_everyturn_effect
  context.move = 1

  if occupation:
    run occupation and maybe return

  u.umoved = FALSE
  if multi > 0:
    continue run/repeat
  else:
    rhack(0)

  if u.utotype:
    deferred_goto
  if vision_full_recalc:
    vision_recalc
  maybe display map during run
  Lua end-turn callback
```

The current JS `moveloop_core()` only fast-forwards per-step RNG, updates bot/screen, calls `rhack`, clears a pending message, and increments moves. This is enough for a tiny starter room, but not a port.

### 4.4 Display model

C `display.c` states the key model:

- Vision decides what the hero can physically see.
- Display decides what should appear at each map coordinate.
- Drawing and the windowport decide how glyphs become terminal cells.

The display order is:

When in sight:

1. Visible or sensed monsters.
2. Visible objects.
3. Known traps.
4. Background terrain.

When out of sight:

1. Sensed monsters.
2. Warning glyphs.
3. Memory.

Important implications:

- A cell's remembered glyph is not always the same as the real terrain.
- Monsters float above objects and terrain and are generally not remembered as normal terrain memory.
- A remembered invisible monster is a special object-layer-like memory.
- Hallucination can use the display RNG context without perturbing core gameplay RNG.
- `newsym(x,y)` is the central workhorse and must be called at the same times C calls it.

The skeleton `display.js` currently bypasses most of this by directly mapping terrain to characters and putting the hero at `@`. Replace it with a glyph pipeline closer to:

```text
world state -> glyph id -> symbol index -> char/color/attr -> windowport cell
```

You do not need to reproduce raw C escape strings exactly because the scorer decodes to cells. You do need the same visible char, color, attr, DEC graphics state, and cursor.

---

## 5. JavaScript porting rules for C semantics

### 5.1 Integer arithmetic

C integer arithmetic is not JavaScript number arithmetic. NetHack uses many small ints, bit flags, signed chars, unsigned masks, and truncating division.

Use helper functions:

```js
export function truncDiv(a, b) {
  return Math.trunc(a / b);
}

export function cMod(a, b) {
  return a % b;
}

export function toInt32(x) {
  return x | 0;
}

export function toUint32(x) {
  return x >>> 0;
}

export function bool(x) {
  return !!x;
}
```

Do not use `Math.floor()` for C integer division when negative values are possible. C truncates toward zero.

### 5.2 Macro handling

C macros are everywhere. For each macro, decide whether it is:

- A constant.
- A pure function.
- A field access.
- A predicate with side effects hidden in arguments.
- A dangerous macro that depends on lvalue behavior.

Port macros as JS functions only when argument evaluation order and side effects remain equivalent. For field-like macros, a JS getter helper is often clearer.

Examples:

```js
function Role_if(pm) {
  return game.urole?.mnum === pm;
}

function MON_AT(x, y) {
  return !!m_at(x, y);
}

function IS_WALL(typ) {
  return typ >= VWALL && typ <= DBWALL; // verify exact C macro
}
```

### 5.3 Pointers, arrays, and list mutation

C often iterates linked lists while deleting or moving nodes. A JS array loop can change behavior if mutation order differs.

Prefer explicit linked nodes for hot parity-sensitive lists:

```js
// Object chain at a map square
obj.nobj      // global object list next
obj.nexthere  // next object at same location

// Monster chain
mon.nmon
```

When arrays are acceptable, be explicit about stable order and mutation semantics.

### 5.4 C truthiness and sentinel values

C uses `0`, `FALSE`, null pointers, negative sentinels, and enum values. JS `undefined`, `null`, `0`, `false`, and empty strings behave differently.

Recommendation:

- Initialize every C global field to a C-like default.
- Use `null` for null pointers.
- Use numeric `0` or `1` for C boolean fields when the exact numeric value may be stored or compared.
- Avoid leaving fields `undefined` if C would have zeroed memory.

### 5.5 Evaluation order

The recorder is built with clang because JavaScript and clang both evaluate function arguments left-to-right in the relevant cases. C itself does not guarantee this.

Still, do not write JS that changes order accidentally. For C code like:

```c
a = foo(rn2(5), bar(rn2(3)));
```

Port as:

```js
const arg0 = rn2(5);
const arg1 = bar(rn2(3));
const a = foo(arg0, arg1);
```

This makes order explicit and easier to debug.

### 5.6 Stable sorting

The recorder replaces C `qsort` with a stable sort. JS `Array.prototype.sort` is stable in modern engines, but do not rely on undocumented tie behavior in comparator functions that return only `0` or `1`. Write comparators that match C and preserve original index when ties must be stable.

Example:

```js
function stableSortBy(arr, cmp) {
  return arr
    .map((value, index) => ({ value, index }))
    .sort((a, b) => cmp(a.value, b.value) || (a.index - b.index))
    .map(({ value }) => value);
}
```

---

## 6. PRNG parity is the first milestone

### 6.1 C PRNG facts to mirror

From `src/rnd.c`:

- NetHack uses ISAAC64 when `USE_ISAAC64` is enabled.
- `init_isaac64(seed, fn)` converts `unsigned long seed` into little-endian bytes.
- Core and display RNG are separate contexts in C.
- `RND(x)` returns `isaac64_next_uint64(ctx) % x`.
- `rn2(x)` returns `RND(x)`.
- `rnd(x)` returns `RND(x) + 1`.
- `d(n,x)` starts at `tmp = n`, then adds `RND(x)` exactly `n` times, and returns `tmp`.
- `rne(x)` calls `rn2(x)` in a loop and then logs/returns the wrapper result.
- `rnz(i)` calls `rn2(1000)`, `rne(4)`, and `rn2(2)`, then returns the wrapper result.
- `rnl(x)` calls raw `RND(x)`, then may call `rn2(37 + abs(adjustment))` depending on Luck.

From `003-rng-log-core.patch`:

- The C recorder logs each function body, not just leaf `RND()` calls.
- Internal `rn2` calls from `rne`, `rnz`, and `rnl` inherit the outer caller annotation.
- The wrapper function itself also logs its result.
- `d(n,x)` logs one `d(n,x)=result` entry, not `n` `rnd(x)` entries.

This means current `js/rng.js` needs careful revision.

### 6.2 Implement RNG wrappers with explicit contexts

A robust design:

```js
const RNG_CORE = 'core';
const RNG_DISPLAY = 'display';
const RNG_LUA = 'lua'; // likely same core stream, but annotated and routed deliberately

let rngLog = [];
let rngLogEnabled = false;
let currentCaller = null; // optional debug context

function rawRND(ctxName, x) {
  const ctx = game.rng[ctxName];
  const val = isaac64_next_uint64(ctx);
  return Number(val % BigInt(x));
}

function logRng(name, args, result, opts = {}) {
  if (!rngLogEnabled) return;
  const prefix = opts.display ? '~d' : '';
  rngLog.push(`${prefix}${name}(${args})=${result}`);
}
```

Then implement:

```js
export function rn2(x) {
  const result = rawRND(RNG_CORE, x);
  logRng('rn2', `${x}`, result);
  return result;
}

export function rnd(x) {
  const result = rawRND(RNG_CORE, x) + 1;
  logRng('rnd', `${x}`, result);
  return result;
}

export function d(n, x) {
  let tmp = n;
  const origN = n;
  while (n-- > 0) tmp += rawRND(RNG_CORE, x);
  logRng('d', `${origN},${x}`, tmp);
  return tmp;
}
```

For composite functions, use ordinary `rn2` internally so the internal calls are logged, then log the wrapper result:

```js
export function rne(x) {
  const utmp = (game.u?.ulevel ?? 1) < 15 ? 5 : Math.trunc((game.u?.ulevel ?? 1) / 3);
  let tmp = 1;
  while (tmp < utmp && !rn2(x)) tmp++;
  logRng('rne', `${x}`, tmp);
  return tmp;
}
```

Implement `rnl(x)` exactly, including Luck adjustment:

```js
export function rnl(x) {
  let adjustment = game.Luck ?? game.u?.uluck ?? 0;
  if (x <= 15) {
    adjustment = Math.trunc((Math.abs(adjustment) + 1) / 3) * Math.sign(adjustment);
  }

  let i = rawRND(RNG_CORE, x);
  if (adjustment && rn2(37 + Math.abs(adjustment))) {
    i -= adjustment;
    if (i < 0) i = 0;
    else if (i >= x) i = x - 1;
  }
  logRng('rnl', `${x}`, i);
  return i;
}
```

Confirm actual C log formatting from public session data. The runner normalizes spaces around `=` and strips call numbers, but safer logs should match exactly as `rn2(N)=M`, not `rn2(N) = M`.

### 6.3 Display RNG

C has `rn2_on_display_rng(x)` and `rnd_on_display_rng(x)`. The display RNG is used for hallucination and similar rendering-only randomness. It must not perturb the core stream.

`005-rng-display-logging.patch` logs display RNG as `~drn2(x)=result` only when display logging is enabled. The public API says PRNG channel filters core-style calls only, but do not ignore display RNG: it can affect visible screens during hallucination. Implement it with a separate ISAAC64 context seeded the same way C seeds it.

Add wrappers such as:

```js
export function rn2_on_display_rng(x) {
  const result = rawRND(RNG_DISPLAY, x);
  if (game.debugLogDisplayRng) logRng('rn2', `${x}`, result, { display: true });
  return result;
}

export function rnd_on_display_rng(x) {
  return rn2_on_display_rng(x) + 1;
}
```

Then use these only in display and hallucination paths that C uses.

### 6.4 Lua RNG

NetHack 5.0 uses Lua for themed rooms and special levels. The recorder patch tags Lua callsites but the underlying random stream is part of the NetHack RNG behavior.

Do not run arbitrary Lua in the scorer. Instead, port the relevant Lua scripts into JS data and functions, or implement a tiny deterministic interpreter for the subset used by NetHack levels. For Phase 1, converting the scripts to JS modules is more practical.

Minimum Lua-related requirements:

- `dat/themerms.lua` behavior for themed rooms.
- Special level scripts under `dat/*.lua`.
- `nh.rn2(n)` and `nh.random(...)` semantics.
- Callback order from `l_nhcore_init`, level generation, start game, restore game, move loop turn, command callbacks, and end turn if relevant.

---

## 7. Porting startup and character generation

The current skeleton jumps directly into a hardcoded female human Tourist. This must be replaced.

### 7.1 Port `options.c` and `.nethackrc` parsing

Current `js/options.js` recognizes only a small subset. Expand it until all options appearing in public and held-out sessions are handled, then keep going for generality.

Important options and inputs:

- `OPTIONS=name:<name>`
- `OPTIONS=role:<role>`
- `OPTIONS=race:<race>`
- `OPTIONS=gender:<gender>`
- `OPTIONS=align:<align>`
- `OPTIONS=pettype:<...>` or equivalent pet option
- `OPTIONS=legacy` or `!legacy`
- `OPTIONS=tutorial` or `!tutorial`
- `OPTIONS=color`
- `OPTIONS=symset:<name>`
- `OPTIONS=msg_window:<mode>`
- `OPTIONS=autopickup` and pickup types
- `OPTIONS=showexp`, `time`, `verbose`, `pushweapon`
- Debug or explore mode options if sessions exercise them

A faithful parser matters because options affect:

- Startup prompts.
- Window rendering.
- Role/race/gender/align selection.
- Initial inventory.
- Pet creation.
- Autopickup.
- Legacy pager screens.
- Status line fields.
- Character symbols.
- Color and glyph mapping.

### 7.2 Port role/race/gender/align selection

Read:

- `src/role.c`
- `include/role.h`
- `src/u_init.c`
- Player selection frontend code as needed

Implement:

- Role table and constraints.
- Race table and constraints.
- Gender table and constraints.
- Alignment table and constraints.
- Random selection when unspecified.
- Prompt/menu behavior when options are incomplete.
- Exact role names, ranks, deities, pantheon handling, and starting monsters.

Do not hardcode one role. The very first public or held-out session outside Tourist will break.

### 7.3 Port player initialization

Read `u_init.c` very carefully. Starting state includes:

- Attributes and attribute maximums.
- HP, energy, AC, level, XP.
- Alignment records.
- Role-specific and race-specific starting inventory.
- Starting gold.
- Known discoveries.
- Skills.
- Conducts and achievements.
- Luck, blessing counters, hunger, movement, encumbrance.
- Tutorial, pauper, and special roleplay flags.

Many of these are invisible on the first screen but affect RNG and future output.

The skeleton's hardcoded block in `js/allmain.js` must disappear:

```js
g._goldCount = 757;
g.u.ulevel = 1;
g.u.uhp = 10;
g.u.uhpmax = 10;
...
g.urole = { name: { m: 'Tourist', f: 'Tourist' }, rank: { m: 'Rambler', f: 'Rambler' } };
g.flags.female = true;
```

Replace it with real `u_init()` and friends.

### 7.4 Fixed datetime

The input field `datetime` exists because the C recorder pins wall-clock behavior. Implement a deterministic date/time provider used by:

- Moon phase.
- Friday the 13th penalty.
- Shopkeeper greetings and time-dependent messages.
- Hire dates or other date text.
- Runtime timers that derive from play start.
- Version or clock display lines that the comparator does not fully ignore.

Current `js/jsmain.js` stores `_datetime` but does not use it. Fix this early.

---

## 8. Porting dungeon and level generation

Level generation is a major RNG consumer. It is also where many early screen mismatches originate.

### 8.1 Current state of `js/mklev.js`

The skeleton has a partial regular-level implementation:

- `getbones()` consumes some RNG and always returns false.
- `l_nhcore_init()` shuffles an alignment array.
- `mklev()` calls `makelevel()`, recounts features, finalizes topology.
- `makelevel()` clears level, performs some checks, loads simplified themed-room logic, makes rooms, sorts rooms, generates stairs, checks branches, corridors, niches, vaults, and branch placement.
- Object, monster, trap, engraving, room fill, mineralize, and corpse/statue creation are mostly stubs.
- `fastforward_fill_mineralize()` currently consumes a large hardcoded RNG block after `mklev()`.

This means the structure may align for seed8000, but it cannot generalize.

### 8.2 Port in this order

Recommended order:

1. `rect.c` exact parity. The existing `js/rect.js` is close. Audit mutation order, `remove_rect`, `add_rect`, and `split_rects` exactly.
2. `mklev.c` structural functions: `clear_level_structures`, `makelevel`, `makerooms`, `sort_rooms`, `generate_stairs`, `makecorridors`, `join`, `finddpos`, `dosdoor`, `make_niches`, `makeniche`, branch placement.
3. `sp_lev.c` room helpers: `create_room`, `check_room`, `topologize`, `wallification`, subrooms, irregular rooms.
4. `mkmap.c` helpers: lighting, map styles, maze generation, mineralization prerequisites.
5. `dungeon.c` and dungeon data: branch depths, special level placement, parent/child relationships, `depth()`, `Is_*level` predicates.
6. `mkobj.c` and object data: object construction, weights, blessings/curses, charges, erosion, quantity, corpses, containers, gold.
7. `makemon.c` and monster data: random monster choice, placement, HP, peaceful/tame state, inventory, mimics.
8. Traps and engravings: `trap.c`, `mklev.c` trap creation, random engravings, graves.
9. Room fill: `fill_ordinary_room`, special room contents, fountains, sinks, altars, graves, vaults, shops, zoos, morgues, barracks, temples.
10. Special levels and Lua conversion.

### 8.3 Room generation details

Key C functions and behaviors:

- `makerooms()` loops while `nroom < MAXNROFROOMS - 1` and `rnd_rect()` succeeds.
- After enough rooms, it may try a vault with `rn2(2)`.
- Themed-room Lua can wrap ordinary room creation.
- `create_room(-1, -1, -1, -1, -1, -1, OROOM, -1)` chooses dimensions and placement using RNG.
- `litstate_rnd(-1)` uses depth-dependent randomness.
- `check_room()` can shift coordinates and consumes RNG when colliding with non-stone cells.
- `sort_rooms()` orders rooms by `lx`. The recorder's qsort is stable.
- Map `roomno` fields must be updated after sorting.

Do not simplify failed room placement. Failed attempts consume RNG and affect later layout.

### 8.4 Corridors and doors

`mklev.c:makecorridors()` is not cosmetic. It mutates topology, room connectivity, door positions, door states, and RNG.

Important C behaviors:

- Joins room `a` to `a+1` in sequence, with a chance to break early on `!rn2(50)`.
- Joins rooms two apart if connectivity differs.
- Joins disconnected sets until all connected.
- Adds extra corridors with count `rn2(nroom) + 4`.
- `finddpos()` tries 20 random door positions, then deterministic fallback.
- `dosdoor()` chooses open, closed, locked, trapped, secret, or no-door states with nested RNG calls.
- Door placement updates room door lists and may shift door indexes.

This is a high-leverage subsystem for early PRNG alignment.

### 8.5 Objects and monsters are not optional

It is tempting to stub object and monster creation if the first screen does not show them. That fails because:

- Creation consumes RNG.
- Object piles and monsters affect display once in view.
- Monsters move and consume RNG every turn.
- Initial inventory affects status and actions.
- Autopickup may pick up generated objects at startup.
- Bones and save files serialize objects and monsters.

Port object and monster constructors early enough that `fastforward_fill_mineralize()` can be removed.

### 8.6 Lua and special levels

The prior Mazes of Menace project took the approach of converting special levels into JS modules. For this contest, that is likely the practical path.

Recommendations:

- Do not embed a full Lua engine.
- Convert Lua level files into declarative JS data plus deterministic builder calls.
- Preserve all random calls and their order.
- Preserve callback order and alignment shuffles.
- Track converted scripts in a table with source filename and checksum.
- Add focused tests for one converted level at a time.

---

## 9. Porting commands, movement, and turns

### 9.1 Replace `js/cmd.js` with a real command system

Current `rhack()`:

- Reads one key.
- If vi movement key, calls a tiny `domove(dx,dy)`.
- Otherwise prints `Unknown command`.

C `cmd.c` is vastly larger. It includes:

- Key bindings and rebinding.
- Command queues: canned, repeat, user input, directions, integers, extended commands.
- `pgetchar()` and `nhgetch()` integration.
- Count prefixes.
- Movement prefixes such as `m` and running keys.
- Extended commands after `#`.
- Menus for command lists and autocomplete.
- Direction prompts and help.
- Occupations and timed multi-turn actions.
- Wizard/debug command availability.
- Mouse and click behavior.
- Here and there command menus.

A minimal but real porting sequence:

1. Port command constants and command queue structs.
2. Port `pgetchar`, `readchar`, `parse`, `rhack` enough to dispatch common keys.
3. Port direction parsing and movement command setup.
4. Port count prefixes and repeated movement.
5. Port prompt input helpers: `yn`, `getlin`, direction prompts, `--More--`.
6. Port inventory selection and menu selection.
7. Port extended commands.
8. Add command handlers by session demand, but always from C, not ad hoc.

### 9.2 Port `hack.c:domove()` and movement state

Movement is not just coordinate update. `hack.c` covers:

- Legal movement checks.
- Out-of-bounds behavior.
- Door interactions.
- Diagonal door rules.
- Boulders, pushing, squeezing, Sokoban guilt.
- Traps and liquids.
- Pit, web, lava, pool, ice, air, water turbulence.
- Monster bump and attack.
- Pet swapping.
- Iron bars.
- Terrain messages.
- Autopickup and pickup checks.
- Engraving smudging.
- Shop boundaries and billing.
- `u.umoved`, `context.move`, `door_opened`, `nomul`, and interrupt behavior.

The skeleton's `blocksMove()` should be replaced with C-equivalent `test_move()` and `domove()` paths.

### 9.3 Turn systems

Every player action that takes time triggers turn systems. Port these incrementally, but do not fake their RNG.

High-value systems:

- Monster movement: `monmove.c`, `mon.c`, `dog.c`, `dogmove.c`.
- Random monster generation: `maybe_generate_rnd_mon()` and `makemon()`.
- Regeneration: `regen_hp`, `regen_pw`.
- Hunger: `eat.c`, `gethungry()`.
- Timers and timeouts: `timeout.c`.
- Sounds and ambient messages: `sounds.c`.
- Search and warning: `detect.c`, `trap.c`, `warnreveal`, `mkot_trap_warn`.
- Spell aging and exercises.
- Prayer counters and alignment side effects.
- Region effects and storms.
- Lua callbacks at move-loop turn and end-turn.

A public session may not exercise every system immediately, but held-out sessions will.

---

## 10. Porting display, windows, menus, and prompts

### 10.1 Screen comparison model

The scorer does not demand byte-identical escape sequences. It decodes strings into 24 rows and 80 columns, with each cell holding:

- Character.
- Foreground color.
- Attribute bits.
- DEC graphics flag.

The comparator tolerates equivalent SGR sequences, cursor-forward escapes, DEC line-drawing translations, and invisible attrs on plain spaces. It does not tolerate visible differences in glyph, color, underline, inverse video, map content, message text, status text, or cursor when cursor is evaluated.

### 10.2 Build a NetHack windowport in JS

Instead of writing the whole screen from scratch each flush, mirror NetHack's window abstraction:

- Message window.
- Status window.
- Map window.
- Inventory/menu window.
- Text window.
- Persistent inventory if needed.

Then implement high-level functions:

```js
create_nhwindow(type)
destroy_nhwindow(win)
clear_nhwindow(win)
display_nhwindow(win, blocking)
putstr(win, attr, text)
start_menu(win, behavior)
add_menu(win, glyphinfo, identifier, accelerator, groupaccel, attr, color, text, flags)
end_menu(win, prompt)
select_menu(win, how)
yn_function(prompt, choices, def)
getlin(prompt)
```

TTY behavior matters because sessions record the TTY-like output, not an abstract GUI. Study `win/tty` and the nomux patches.

### 10.3 Messages

Current `pline()` stores a single `_pending_message`. Real NetHack message behavior includes:

- Message history.
- Message wrapping.
- `--More--` prompts.
- Repeated-message suppression (`Norep`).
- Urgent messages.
- `You`, `You_cant`, `There`, `pline`, `raw_print` formatting.
- Multi-line text windows.
- Menu prompts and prompt reuse.
- Message window options from `msg_window`.

This is one of the most common causes of screen divergence after RNG is aligned.

### 10.4 Status lines

Current status lines in `display.js` are simplified. Port `botl.c` and related status code.

Status line fields include:

- Title with player name and rank.
- Six attributes with exact order and strength formatting.
- Alignment text.
- Dungeon level description.
- Gold.
- HP and Pw.
- AC.
- XP or HD.
- Time if enabled.
- Hunger and condition flags.
- Carrying capacity.
- Score, version, or other option-controlled fields.
- Highlighting and color attributes.

Be precise about spacing. The screen comparator decodes cursor-forward escapes to cells, so raw encoding can differ, but visible column positions cannot.

### 10.5 Map glyph pipeline

Port data and functions in roughly this order:

1. Terrain symbols and `cmap` indices.
2. Object glyphs and colors.
3. Monster glyphs and colors.
4. Trap and warning glyphs.
5. Explosion, beam, zap, and temporary glyphs.
6. Hallucination random glyph selection with display RNG.
7. Pet and detected monster glyph variants.
8. Swallow display.
9. Engravings and remembered invisibles.
10. DEC graphics and Unicode mapping.

The current `terrain_glyph()` in `display.js` is a temporary shortcut. Replace it with C-equivalent glyph mapping from `drawing.c`, `display.c`, and symbol data.

---

## 11. Persistent state and multi-segment sessions

The frozen `storage.js` provides:

```js
vfsReadFile(path)
vfsWriteFile(path, content)
vfsDeleteFile(path)
vfsListFiles(prefix)
setStorageForTesting(mock)
new InMemoryStorage()
```

Use this for all C-like files that need to persist across segments:

- Save files.
- Bones files.
- Topten or record files.
- Lock files, if modeled.
- Panic or hangup artifacts, if relevant.

Do not write to Node's filesystem during scoring. The sandbox denies it. Do not rely on `localStorage` in Node unless routed through the frozen VFS and `InMemoryStorage`.

The current `NethackGame.start()` calls `resetGame()` every segment. That is fine for a single segment only. For multi-segment sessions, restructure so that:

- Per-game state resets when C starts a new game.
- Persistent VFS state survives across `runSegment` calls within the same session.
- Captured screens and RNG logs remain cumulative across segments.
- Save/restore state is serialized/deserialized C-faithfully enough for sessions.
- Bones creation and loading consume RNG and affect future games.

---

## 12. Data generation without transpiling

The user explicitly wants no transpilation. That does not forbid generating data tables from C headers and C data files, but it does mean the game logic should be hand-ported or LLM-ported, not mechanically transformed C syntax into JS syntax.

Good data-generation targets:

- Constants from headers.
- Object definitions from `objects.c` and headers.
- Monster definitions from `monst.c` and headers.
- Artifact definitions.
- Role/race data.
- Dungeon topology data.
- Symbol tables.
- Special level declarative maps.
- Sound/message tables.
- Rumor, epitaph, engraving text data.

Bad data-generation targets:

- Direct automated C-to-JS translation of control flow.
- Macro-expanded code dumps.
- Opaque generated JS that cannot be read and debugged.

Follow the Mazes of Menace prior-art pattern:

- JS modules mirror C source structure.
- Functions carry `// C ref: file.c:function` comments.
- Data definitions can be generated and checked by tests.
- Logic remains readable and reviewable.

Add generator scripts under `scripts/` if useful, but the scoring output must be plain JS modules with no build step required.

---

## 13. Milestone plan

### Milestone 0: Remove infrastructure contradictions

Goals:

- Make local scoring stable and reproducible.
- Add your own debug scripts without changing frozen files.
- Audit `const.js` version constants and generated tables.
- Preserve `runSegment` API.
- Initialize and preserve VFS state correctly.
- Add a clean debug flag that does not write files or change scoring behavior.

Tests:

```bash
node frozen/ps_test_runner.mjs sessions/seed8000-tourist-starter.session.json
bash frozen/score.sh
```

### Milestone 1: Exact RNG wrappers

Goals:

- Rewrite `js/rng.js` to match `src/rnd.c` and recorder patch logging.
- Add `rnl`.
- Fix `d` logging.
- Add display RNG context.
- Initialize core and display contexts exactly as C does.
- Add tests comparing first N raw ISAAC64 values and wrapper logs against C or sessions.

Exit criterion:

- All current fast-forward calls still produce the same logs as before where they call wrappers.
- A custom RNG-only trace matches C for `rn2`, `rnd`, `d`, `rne`, `rnz`, `rnl`.

### Milestone 2: Options and character generation

Goals:

- Expand `options.js`.
- Port role/race/gender/align tables and selection.
- Port `u_init.c` enough for all public session starting roles.
- Use `input.datetime` for time-dependent startup.
- Remove hardcoded Tourist state.

Exit criterion:

- First RNG divergence moves past current `fastforward_post_mklev` boundary for multiple sessions.
- First screens show correct role/name/gender/race and status fields.

### Milestone 3: Object, monster, and dungeon data

Goals:

- Generate or port object and monster tables.
- Port dungeon topology and level placement data.
- Port `init_objects`, `init_dungeons`, `init_artifacts`, and monster vitals initialization.
- Remove corresponding entries from `fastforward_pre_mklev`.

Exit criterion:

- Startup RNG before `mklev` is naturally aligned for at least several public sessions with different roles/seeds.

### Milestone 4: Regular level generation

Goals:

- Finish `mklev`, `rect`, `mkmap`, `sp_lev`, corridors, doors, stairs, branches, vaults, niches.
- Port object/monster/trap creation enough to remove `fastforward_fill_mineralize`.
- Correct room fill and mineralization.

Exit criterion:

- Initial map geometry, stairs, doors, lit rooms, objects, monsters, and hero position align for starter sessions without fill fast-forward.

### Milestone 5: Display parity for initial game

Goals:

- Port glyph pipeline and terrain/object/monster/trap display.
- Port `vision.c` fully enough for initial map reveal.
- Port message window, welcome, status line, and cursor.

Exit criterion:

- Initial screen frames match for several public sessions with PRNG already aligned.

### Milestone 6: Movement and command basics

Goals:

- Port command queues and movement parsing.
- Port `hack.c:domove`, `test_move`, door interactions, autopickup, traps, and boulder basics.
- Remove `fastforward_step` for simple movement sessions.

Exit criterion:

- Movement-heavy public sessions stay aligned beyond dozens or hundreds of keypresses.

### Milestone 7: Inventory, objects, menus, and prompts

Goals:

- Port inventory display and selection.
- Port object names and descriptions.
- Implement eat, drink, read, zap, wear, wield, drop, throw, apply, loot, open, close, kick, search, rest.
- Implement menus and prompt windows exactly enough to pass menu-heavy sessions.

Exit criterion:

- Sessions with inventory commands and prompts match screen and RNG through full command sequences.

### Milestone 8: Monsters, pets, combat, and turn effects

Goals:

- Port monster movement and AI.
- Port pet behavior.
- Port combat, attacks, deaths, corpses, and experience.
- Port hunger, regen, sounds, timers, search, warning, spells, and regions.

Exit criterion:

- Combat and monster-interaction sessions no longer diverge at first monster turn.

### Milestone 9: Special levels, Lua, save, bones, and endings

Goals:

- Convert special levels and Lua behavior.
- Port save/restore and bones through VFS.
- Port death, quit, tombstone, topten, chained sessions.
- Port wizard/debug/explore if sessions require them.

Exit criterion:

- Multi-segment public sessions pass or fail only on rare gameplay subsystems, not persistence.

### Milestone 10: Generalization and Phase 2 readiness

Goals:

- Track implemented C functions and stubs.
- Keep C-ref comments and module structure consistent.
- Avoid large hand-tuned patches per session.
- Build a repeatable pipeline to update tables and port changed functions.
- Add coverage reports from sessions.

Exit criterion:

- Held-out score should be close to public score. Phase 2 should require a small diff, not a rewrite.

---

## 14. Testing workflow

### 14.1 Always keep public scorer green for previous wins

Use targeted tests during development and full scoring before committing.

```bash
node frozen/ps_test_runner.mjs sessions/seed8000-tourist-starter.session.json
node frozen/ps_test_runner.mjs sessions/some-other-session.session.json
bash frozen/score.sh
```

For long debug runs:

```bash
SESSION_REPLAY_TIMEOUT_MS=120000 node frozen/ps_test_runner.mjs sessions/foo.session.json
```

### 14.2 Add pure unit tests for ported functions

Use Node's built-in test runner or a lightweight harness. Examples:

- `rng.test.mjs`: wrapper logs and values.
- `rect.test.mjs`: `split_rects` cases from C.
- `vision.test.mjs`: known line-of-sight maps.
- `options.test.mjs`: `OPTIONS=` parsing.
- `botl.test.mjs`: status line formatting.
- `objnam.test.mjs`: object names.
- `monst.test.mjs`: monster predicates and flags.

Keep tests deterministic and do not require the network or filesystem writes.

### 14.3 Add golden micro-sessions

When the public sessions are too broad, record tiny C sessions:

- Start and immediately quit for each role.
- Move in a small room without monsters.
- Kick one door.
- Pick up one object.
- Open inventory.
- Eat food.
- Fight one weak monster.
- Trigger one trap.
- Save and restore.

Then compare JS to those sessions during development. Do not commit answer-key lookups into game code.

### 14.4 Divergence triage checklist

When a session fails:

1. Did JS throw? Fix exceptions first.
2. Did JS produce fewer screen frames than C? Look at input boundary timing, prompts, `--More--`, or crashes.
3. Did PRNG diverge before first screen? Startup, options, initialization, RNG wrapper.
4. Did PRNG diverge during `mklev`? Room/object/monster/trap generation.
5. Did PRNG match but screen fail? Display, status, message, cursor, options, glyphs, vision.
6. Did screens match for a while then PRNG diverge after a command? Command handler or turn effect.
7. Did only held-out fail? Overfitting, incomplete subsystem, or missing option/role/level.

### 14.5 Useful debug artifacts

Within local tooling, produce these. Do not rely on them inside `runSegment` during scoring:

- First RNG mismatch report with surrounding calls.
- Per-input RNG slices, using `NethackGame.getRngSlices()` if kept.
- First screen cell diff with row/col and decoded cells.
- Side-by-side 24x80 text render.
- Map-state hash at input boundaries.
- Player-state summary at input boundaries.
- Monster list summary at input boundaries.
- Object pile summary at visible squares.

Map-state hashes are not scored, but they help localize divergence before it reaches the screen.

---

## 15. LLM work protocol

Give the coding LLM small source-faithful tasks. Each task should include:

1. C source file and function names.
2. JS target module.
3. Required globals and helpers.
4. Expected RNG behavior.
5. Expected display or state side effects.
6. Tests to run.
7. Regression sessions to run.

### 15.1 Example task packet

```text
Task: Port rnl from NetHack C to JS.

C source:
- nethack-c/upstream/src/rnd.c:rnl
- nethack-c/patches/003-rng-log-core.patch logging behavior

JS target:
- js/rng.js

Requirements:
- Implement raw RND draw from core ISAAC64 context.
- Implement Luck adjustment exactly, including small-x adjustment using C truncation.
- Internal rn2 call must be logged before the wrapper rnl result, matching C function-body logging.
- Add tests for Luck values -13..13 and x in [2, 15, 16, 100].
- Do not modify js/isaac64.js.

Run:
- node frozen/ps_test_runner.mjs sessions/seed8000-tourist-starter.session.json
```

### 15.2 Rules for the coding LLM

- Read the C before writing JS.
- Preserve function names where possible.
- Add `// C ref: path:function` comments.
- Initialize all C-like structs to zero-equivalent defaults.
- Do not skip side-effect functions because output is not visible immediately.
- Do not insert fake RNG calls except while temporarily preserving a known fast-forward boundary, and then mark them for deletion.
- Do not hardcode a public session seed, move string, screen, or answer.
- Do not modify frozen files.
- Do not add build steps required for scoring.
- Keep browser and Node behavior identical except for input source and storage backend.
- Commit small changes and rerun targeted sessions.

### 15.3 Function coverage tracking

Create a file such as `CODEMATCH.md` or `docs/PORT_STATUS.md` with rows:

```markdown
| C file | C function | JS file | JS function | Status | Notes | Tests |
|---|---|---|---|---|---|---|
| src/rnd.c | rn2 | js/rng.js | rn2 | complete | core ctx only | rng.test.mjs |
| src/rnd.c | rnl | js/rng.js | rnl | partial | Luck source pending | rng.test.mjs |
```

Statuses:

- `complete`: behavior ported and tested against C or sessions.
- `partial`: common path works, edge cases missing.
- `stub`: placeholder, not faithful.
- `data-only`: generated table or constant.
- `not-applicable`: platform/system function with no JS equivalent.

This mirrors the prior Mazes of Menace experience and helps Phase 2: when upstream changes, you can identify affected functions.

---

## 16. File-by-file port queue

This section is a concrete queue for a long-running porting project.

### 16.1 Core runtime and global init

| C source                           | JS target                              | Notes                                                        |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `sys/unix/unixmain.c`              | `js/jsmain.js`, `js/nethack.js`        | Platform startup is not fully needed, but main sequencing, RNG init, options, and window init semantics matter. |
| `src/allmain.c`                    | `js/allmain.js`                        | Port `early_init`, `newgame`, `moveloop_preamble`, `moveloop_core`, `welcome`. |
| `src/decl.c` and global init files | `js/gstate.js`, `js/init.js`           | Zero all global state like C.                                |
| `src/rnd.c`                        | `js/rng.js`                            | Exact wrappers and logs.                                     |
| `src/options.c`                    | `js/options.js`                        | Full `.nethackrc` and option effects.                        |
| `src/files.c`                      | `js/files.js`, `js/storage.js` callers | Use frozen VFS.                                              |
| `src/save.c`, `src/restore.c`      | `js/save.js`                           | Serialize enough for save/restore sessions.                  |

### 16.2 Player setup

| C source       | JS target      | Notes                                                     |
| -------------- | -------------- | --------------------------------------------------------- |
| `src/role.c`   | `js/role.js`   | Role/race/gender/align selection and constraints.         |
| `src/u_init.c` | `js/u_init.js` | Starting stats, inventory, skills, discoveries, roleplay. |
| `src/attrib.c` | `js/attrib.js` | Attribute calculations and exercise.                      |
| `src/exper.c`  | `js/exper.js`  | Experience and level logic.                               |
| `src/skills.c` | `js/skills.js` | Skill init and advancement.                               |
| `src/align.c`  | `js/align.js`  | Alignment records and god relationships.                  |

### 16.3 Map and dungeon generation

| C source         | JS target        | Notes                                                 |
| ---------------- | ---------------- | ----------------------------------------------------- |
| `src/dungeon.c`  | `js/dungeon.js`  | Dungeon topology, branch placement, special levels.   |
| `src/rect.c`     | `js/rect.js`     | Existing partial. Audit.                              |
| `src/mklev.c`    | `js/mklev.js`    | Regular levels, corridors, doors, rooms.              |
| `src/mkmap.c`    | `js/mkmap.js`    | Map generation and lighting.                          |
| `src/mkmaze.c`   | `js/mkmaze.js`   | Mazes, special placement regions.                     |
| `src/mkroom.c`   | `js/mkroom.js`   | Special rooms and filling.                            |
| `src/sp_lev.c`   | `js/sp_lev.js`   | Special-level construction helpers and `create_room`. |
| `src/extralev.c` | `js/extralev.js` | Extra level handling if needed.                       |
| `dat/*.lua`      | `js/levels/*.js` | Convert level scripts and themed rooms.               |

### 16.4 Objects

| C source                                  | JS target                                 | Notes                                                      |
| ----------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `src/objects.c`                           | `js/objects.js`                           | Generate data table.                                       |
| `src/mkobj.c`                             | `js/mkobj.js`                             | Object creation, random classes, BUC, charges, quantities. |
| `src/objnam.c`                            | `js/objnam.js`                            | Object naming and descriptions.                            |
| `src/invent.c`                            | `js/invent.js`                            | Inventory chains, letters, selection.                      |
| `src/pickup.c`                            | `js/pickup.js`                            | Pickup, autopickup, object merging.                        |
| `src/do_wear.c`                           | `js/do_wear.js`                           | Wear/takeoff armor and accessories.                        |
| `src/wield.c`                             | `js/wield.js`                             | Weapons and quiver.                                        |
| `src/eat.c`                               | `js/eat.js`                               | Food, corpses, hunger, multi-turn eating.                  |
| `src/potion.c`, `src/read.c`, `src/zap.c` | `js/potion.js`, `js/read.js`, `js/zap.js` | Magic item effects.                                        |

### 16.5 Monsters and combat

| C source                                    | JS target                       | Notes                            |
| ------------------------------------------- | ------------------------------- | -------------------------------- |
| `src/monst.c`                               | `js/monsters.js`                | Generate monster data.           |
| `src/makemon.c`                             | `js/makemon.js`                 | Monster creation and inventory.  |
| `src/mon.c`                                 | `js/mon.js`                     | Monster lifecycle and utilities. |
| `src/monmove.c`                             | `js/monmove.js`                 | Monster AI movement.             |
| `src/dog.c`, `src/dogmove.c`                | `js/dog.js`, `js/dogmove.js`    | Pet creation and AI.             |
| `src/mhitm.c`, `src/mhitu.c`, `src/uhitm.c` | `js/combat.js` or split modules | Combat, attacks, special damage. |
| `src/mcastu.c`, `src/mthrowu.c`             | `js/mcastu.js`, `js/mthrowu.js` | Monster spells and projectiles.  |
| `src/worm.c`                                | `js/worm.js`                    | Long worms and display tails.    |

### 16.6 Commands and actions

| C source                                     | JS target                     | Notes                                               |
| -------------------------------------------- | ----------------------------- | --------------------------------------------------- |
| `src/cmd.c`, `include/func_tab.h`            | `js/cmd.js`, `js/func_tab.js` | Command binding, parser, queues, extended commands. |
| `src/hack.c`                                 | `js/hack.js`                  | Movement and run logic.                             |
| `src/do.c`, `src/do_name.c`, `src/do_wear.c` | corresponding JS modules      | Common command handlers.                            |
| `src/apply.c`                                | `js/apply.js`                 | Tool use.                                           |
| `src/dig.c`                                  | `js/dig.js`                   | Digging and chewing.                                |
| `src/lock.c`                                 | `js/lock.js`                  | Doors and containers.                               |
| `src/trap.c`                                 | `js/trap.js`                  | Traps and effects.                                  |
| `src/pray.c`, `src/altar.c`                  | `js/pray.js`, `js/altar.js`   | Prayer and sacrifice.                               |

### 16.7 Display and UI

| C source                         | JS target                             | Notes                                                |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `src/display.c`                  | `js/display.js`                       | Glyph memory, `newsym`, monster/object/trap display. |
| `src/vision.c`                   | `js/vision.js`                        | Full vision. Existing partial.                       |
| `src/drawing.c`                  | `js/drawing.js`                       | Glyph to symbol/color.                               |
| `src/botl.c`                     | `js/botl.js`                          | Status lines.                                        |
| `win/tty/*.c`                    | `js/windows.js`, `js/game_display.js` | Windowport behavior, menus, prompts, messages.       |
| `src/windows.c`                  | `js/windows.js`                       | Window abstraction.                                  |
| `src/pline.c` or message helpers | `js/pline.js`                         | Message formatting and history.                      |

### 16.8 Endgame and persistence

| C source                        | JS target      | Notes                               |
| ------------------------------- | -------------- | ----------------------------------- |
| `src/end.c`                     | `js/end.js`    | Death, quit, ascension, gameover.   |
| `src/topten.c`                  | `js/topten.js` | Record file through VFS.            |
| `src/bones.c`                   | `js/bones.js`  | Bones creation/loading through VFS. |
| `src/restore.c`, `src/save.c`   | `js/save.js`   | Save/restore sessions.              |
| `src/quest.c`, `src/questpgr.c` | `js/quest.js`  | Quest logic and text.               |

---

## 17. Known skeleton pitfalls to fix deliberately

1. `js/allmain.js` calls `fastforward_pre_mklev`, `fastforward_post_mklev`, `fastforward_step`, and `fastforward_fill_mineralize`. These are seed-specific crutches.
2. `js/rng.js` lacks `rnl`, display RNG, and Lua call-context semantics. Its `d()` logs as repeated `rnd()` calls, unlike C recorder `d()` logging.
3. `js/jsmain.js` stores `_datetime` but does not use it.
4. `NethackGame.start()` calls `resetGame()` each time, which can wipe cross-segment state unless VFS and captured arrays are preserved separately.
5. `runSegment()` reuses `prevGame`, but then calls `start()` again, which resets global game state. Multi-segment semantics need redesign.
6. `input.js` has a module-level `_inputQueue`, but `runSegment()` queues keys on `GameDisplay`. This can work via `display.readKey`, but the input architecture is split.
7. `display.js` has only one pending message string. Real NetHack message windows are more complex.
8. `display.js` handles no monster/object/trap glyph layers.
9. `vision.js` is explicitly stripped down.
10. `mklev.js` contains many approximate RNG-consuming stubs. Approximation will fail when actual state becomes visible or future RNG depends on object/monster details.
11. `const.js` contains generated and pinned constants that should be audited. Do not trust it blindly.
12. Browser play and Node scoring must share the same game engine. Avoid browser-only shortcuts.
13. Do not edit `js/isaac64.js`, `js/terminal.js`, or `js/storage.js`; the judge overlays them.

---

## 18. Practical implementation strategy

### 18.1 Use a C-ref comment pattern

Every ported function should start like:

```js
// C ref: src/mklev.c:makecorridors()
export function makecorridors() {
  ...
}
```

For split or merged functions:

```js
// C refs:
// - src/display.c:newsym()
// - src/display.c:map_location()
// - src/display.c:map_background()
```

This gives future LLMs enough anchors to audit or update behavior.

### 18.2 Keep modules near C layout

The prior successful non-transpiled port described in Mazes of Menace used many modules mirroring C source structure. That is a good idea here because it reduces context-switching:

```text
src/allmain.c  -> js/allmain.js
src/hack.c     -> js/hack.js
src/mklev.c    -> js/mklev.js
src/mkobj.c    -> js/mkobj.js
src/makemon.c  -> js/makemon.js
src/display.c  -> js/display.js
src/vision.c   -> js/vision.js
```

The current skeleton has fewer files. Add files freely under `js/`.

### 18.3 Add a local function-level dashboard

Create `docs/PORT_STATUS.md` and update it every time a function is ported. This is not busywork. It prevents the LLM from rediscovering the same missing functions and helps with Phase 2.

Fields to track:

- C file and function.
- JS file and function.
- Status.
- Last tested session.
- Known edge cases.
- RNG-sensitive or screen-sensitive.

### 18.4 Use differential instrumentation, not answer-key cheating

Local debug scripts can read session `steps` and compare. Game code cannot. Keep all answer-key access outside `js/` runtime paths or behind tooling that is never imported by `runSegment`.

Safe:

- `tools/compare-session.mjs` reads C session and JS output.
- Debug comments with first divergence indices.
- Unit tests with hand-authored expected values.

Unsafe:

- `js/` imports `sessions/*.json`.
- Code branches on seed and move count to emit expected screens.
- Code branches on public session names.
- Adding more `fastforward` arrays.

### 18.5 Keep temporary compatibility shims explicit

Sometimes a real port lands in stages. If you must keep a temporary shim, label it:

```js
// TEMP_PARITY_SHIM: consumes legacy seed8000 RNG until mkobj.c:mksobj is ported.
// Delete when fastforward_fill_mineralize block 3 is replaced.
```

Then track it in `docs/PORT_STATUS.md`. Do not let shims become invisible.

---

## 19. Suggested first concrete tasks

Start here. These tasks have high leverage and reduce later confusion.

### Task 1: Rewrite `js/rng.js`

Inputs:

- `src/rnd.c`
- `nethack-c/patches/003-rng-log-core.patch`
- `nethack-c/patches/004-rng-log-lua-context.patch`
- `nethack-c/patches/005-rng-display-logging.patch`

Deliverables:

- Core RNG context.
- Display RNG context.
- Exact `rn2`, `rnd`, `rn1`, `rnl`, `d`, `rne`, `rnz`.
- Correct logging order.
- Unit tests.

### Task 2: Fix `runSegment` state semantics

Inputs:

- `docs/API.md`
- `frozen/ps_test_runner.mjs`
- `frozen/storage.js`
- `js/jsmain.js`

Deliverables:

- `datetime` passed into deterministic time provider.
- Captured screens and RNG remain cumulative across segments.
- VFS state persists across segments.
- `resetGame()` does not wipe persistent session storage.
- Input boundary capture remains before every `nhgetch`.

### Task 3: Port role and `u_init` for starting state

Inputs:

- `src/role.c`
- `src/u_init.c`
- `include/role.h`
- `js/options.js`
- public sessions with multiple roles

Deliverables:

- Real role/race/gender/align selection.
- Real starting stats and inventory.
- Remove hardcoded Tourist block.
- Startup status lines closer to C.

### Task 4: Port `init_objects` and generated object data

Inputs:

- `src/objects.c`
- `src/objclass.h` and related headers
- `src/mkobj.c`
- `js/const.js`

Deliverables:

- `js/objects.js` data table.
- `init_objects()` shuffles/probabilities exactly.
- Object class constants audited.
- First pre-mklev fast-forward entries removed.

### Task 5: Make `mklev` structural parity real

Inputs:

- `src/rect.c`
- `src/mklev.c`
- `src/sp_lev.c`
- `src/mkmap.c`
- current `js/mklev.js`

Deliverables:

- Exact room and corridor geometry for multiple seeds.
- Exact door states and stairs.
- Exact branch placement.
- No approximate RNG stubs in structural generation.

### Task 6: Port `botl.c` and message window basics

Inputs:

- `src/botl.c`
- `win/tty` message/status handling
- `js/display.js`
- `frozen/screen-decode.mjs`

Deliverables:

- Correct two-line status layout.
- Correct welcome message for roles/options.
- Basic `--More--` behavior.
- Correct cursor placement after display.

---

## 20. Submission and maintenance checklist

Before every serious push:

- `bash frozen/score.sh` runs without category errors.
- No edits to frozen files are required for local score.
- `js/isaac64.js`, `js/terminal.js`, and `js/storage.js` can be overwritten from `frozen/` without changing behavior.
- No `js/` file imports from `sessions/` or test answer data.
- No network, filesystem writes, child processes, worker threads, or native addons in scoring paths.
- `runSegment` handles all fields: seed, datetime, nethackrc, moves.
- Cross-segment state uses VFS and `prevGame` correctly.
- Public score improvements are not tied to seed-specific replay hacks.
- `docs/PORT_STATUS.md` or equivalent is updated.
- Regression sessions from previously fixed subsystems still match.

Before Phase 2 or upstream update:

- Regenerate data tables from the new target if needed.
- Compare changed C functions against `docs/PORT_STATUS.md`.
- Update only affected JS modules.
- Keep diff small and methodical.
- Rerun function-level and session-level tests.

---

## 21. A compact mental model for the next LLM

You are porting an event-driven C program with a deterministic recorder wrapped around it. The recorder does not care how elegant the JS is internally. It cares that at every `nhgetch` boundary, the terminal grid and PRNG log match.

The fastest honest path is:

1. Make RNG wrappers exact.
2. Make initialization exact.
3. Make level generation exact.
4. Make display exact.
5. Make commands exact.
6. Make turn systems exact.
7. Use sessions to discover missing paths.
8. Use C source to implement those paths.
9. Keep a function coverage table.
10. Avoid hardcoding traces.

Whenever uncertain, ask:

- Which C function owns this behavior?
- Which globals does it read and write?
- Which RNG calls does it make, and in what order?
- Which display/window functions does it call?
- Does it ask for input, and therefore create a captured frame?
- Does it affect persistent state across segments?
- Can a hidden side effect affect a later screen?

If the answer is yes or unknown, port the side effect.

---

## Appendix A: Command cheat sheet

```bash
# Initialize upstream C submodule
git submodule update --init

# Set contest category before scoring
bash frozen/set-category.sh agentic

# Run one public session
node frozen/ps_test_runner.mjs sessions/seed8000-tourist-starter.session.json

# Run all public sessions
bash frozen/score.sh

# Increase local session timeout
SESSION_REPLAY_TIMEOUT_MS=120000 node frozen/ps_test_runner.mjs sessions/foo.session.json

# Browser play
python3 -m http.server 8000
# open http://localhost:8000/

# Build C recorder when needed
git submodule update --init nethack-c/upstream
bash nethack-c/build-recorder.sh
```

---

## Appendix B: Source-backed facts used by this guide

These are the most important inspected sources and facts to keep in mind:

- `README.md`: contest target, porting task, skeleton map, quick start, public/held-out sessions, scoring totals, frozen files, and rules.
- `docs/API.md`: exact `runSegment` contract and scoring mechanics.
- `docs/PHASES.md`: Phase 2 diff-penalty idea and the need for a repeatable method.
- `nethack-c/README.md`: recorder build, env vars, and clang requirement.
- `nethack-c/patches/README.md`: eight deterministic recorder patches.
- `nethack-c/patches/003-rng-log-core.patch`: RNG logging details, especially composite calls.
- `nethack-c/patches/004-rng-log-lua-context.patch`: Lua RNG context tagging.
- `nethack-c/patches/005-rng-display-logging.patch`: display RNG logging.
- `frozen/score.sh`: frozen overlay of `isaac64.js`, `terminal.js`, and `storage.js`.
- `frozen/ps_test_runner.mjs`: positional RNG comparison and screen comparison via decoded cells.
- `frozen/screen-decode.mjs`: exact screen cell model.
- `frozen/storage.js`: VFS API and in-memory storage.
- `js/jsmain.js`: current capture hook and `runSegment` skeleton.
- `js/allmain.js`: current fast-forward-based startup and main loop stubs.
- `js/rng.js`: current incomplete RNG wrappers.
- `js/mklev.js`: current partial level generator and stubs.
- `js/cmd.js`: current minimal movement-only command handler.
- `js/display.js`: current partial terrain/status/message renderer.
- `js/vision.js`: current partial vision port.
- `src/allmain.c`: real startup and move-loop order.
- `src/rnd.c`: real RNG wrapper semantics.
- `src/mklev.c`: real regular level generation.
- `src/cmd.c`: real command parser and command queues.
- `src/hack.c`: real movement and turn-taking behavior.
- `src/display.c`: real glyph layering and map memory rules.
- Mazes of Menace prior-art README: a non-transpiled agent-written JS port can mirror C modules, use C-comparison session tests, track function coverage, and keep readable browser JS as a first-class goal.
