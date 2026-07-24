# Misc Commands: #history, ^ showtrap, X explore mode, ^A repeat, V versionshort (#diagnose audit)

Date: 2026-07-24

## C Reference

- `nethack-c/upstream/src/cmd.c:1665` through `nethack-c/upstream/src/cmd.c:2069` (`extcmdlist[]`) contains no `diagnose` entry and there is no `dodiagnose` anywhere in the 5.0.0 tree, so a faithful port keeps `#diagnose` on the `win/tty/getline.c:322` `#%s: unknown extended command.` path; the old condition-report command did not survive into NetHack 5.0.
- `nethack-c/upstream/src/pager.c:2961` through `nethack-c/upstream/src/pager.c:2965` implement `dohistory()` as `display_file(HISTORY, TRUE)` over `nethack-c/upstream/dat/history`.
- `nethack-c/upstream/win/tty/getline.c:24` through `nethack-c/upstream/win/tty/getline.c:41` (`ext_cmd_getlin_hook`) autocompletes a unique `AUTOCOMPLETE` prefix, so `#hist` runs `dohistory` while `#redo` (no such command; `repeat` is not `AUTOCOMPLETE`) stays unknown.
- `nethack-c/upstream/src/pager.c:2336` through `nethack-c/upstream/src/pager.c:2382` implement `doidtrap()`: `getdir("^")` prompts `In what direction?`, trapped door/chest glyphs are checked first via `nethack-c/upstream/src/detect.c:139` (`trapped_chest_at`) and `nethack-c/upstream/src/detect.c:182` (`trapped_door_at`), then the `ftrap` chain requires `tseen`, `u.dz < 0` hides holes/trapdoors, `u.dz > 0` hides rock traps, and the answer is `That is %s%s%s.` with `madeby_u` wording ` set`/` dug`/` woven` + ` by you`, else `I can't see a trap there.` — all with no time elapsed.
- Trap display names come from `nethack-c/upstream/include/defsym.h:157` through `nethack-c/upstream/include/defsym.h:180` (`trapname()` via `trap_to_defsym`), e.g. `falling rock trap`, `level teleporter`, `anti-magic field`.
- `nethack-c/upstream/src/cmd.c:952` through `nethack-c/upstream/src/cmd.c:986` implement `enter_explore_mode()`: already-explore message, `Beware!  From explore mode there will be no return to %s,` (`normal game` vs `debug mode`), then `paranoid_query(ParanoidQuit, ...)`.
- `nethack-c/upstream/src/options.c:7173` sets default `paranoia_bits = PARANOID_PRAY | PARANOID_SWIM | PARANOID_TRAP`, so `ParanoidQuit` is false and the explore prompt is the plain `yn_function` form `Do you want to enter explore mode? [yn] (n)`; acceptance sets `discover = TRUE; wizard = FALSE`, prints `You are now in non-scoring explore mode.`, refusal prints `Continuing with %s.`
- `nethack-c/upstream/src/cmd.c:1638` through `nethack-c/upstream/src/cmd.c:1661` implement `do_repeat()` over the `CQ_REPEAT` queue fed by `nethack-c/upstream/src/cmd.c:3732` through `nethack-c/upstream/src/cmd.c:3759`: every executed command is queued except `do_repeat`/`doextcmd`, cancelled/failed and unknown commands clear it, and an empty queue prints `There is no command available to repeat.`
- `nethack-c/upstream/src/version.c:154` through `nethack-c/upstream/src/version.c:165` implement `doversion()` (`V`/`versionshort`) as a one-line `pline(getversionstring(...))`; `nethack-c/upstream/src/mdlib.c` `version_id_string()` yields `MacOS NetHack Version 5.0.0 - last build May  2 2026 12:00:00.` for the reference build, and the `m` prefix reroutes to `doextversion()`.

## JS Parity Slice

- `#diagnose` deliberately remains `#diagnose: unknown extended command.` with a regression test locking the 5.0 behavior.
- `#history` (and unique-prefix forms `#hi`..`#histor`) enters the existing bundled `history` data pager (`helpPager` mode); the incremental `#` prompt display shows `history`/`repeat` completions like C's getlin hook.
- `^` enters `showtrapDirection` mode: direction/self/`<`/`>` selection, trapped chest (`otrapped && tknown` box) and trapped door (`DOOR && D_TRAPPED`) wording first, then seen-trap description with C's article, madeby_u suffix, and `u.dz` visibility quirks; invalid keys show the cmdassist direction overlay; ESC cancels silently; no time elapses.
- `X` runs `exploreModeMore` (--More-- on the Beware line) then `exploreModeConfirm` ([yn] (n)); `y` sets `game.flags.explore` and clears `game.flags.debug` (C `wizard = FALSE`), which the existing `Die? [yn]` explore-death path already keys off; decline/other-mode messages match C; both generic message-more dismissal lists exclude `exploreModeMore`.
- `^A` and `#repeat` call `repeatLastCommand()`: repeats the stored movement/run/search/rest key via `rhack()` under an `_in_doagain` guard; extended commands (except `repeat` itself) and unknown commands clear the stored key, matching C's queue replacement/clearing for the cases this slice covers.
- `V` prints the short version line; `m`-prefixed `V` shows the full version overlay with the same one-time Lua init `rn2` pair as `#version`.

## Tests

- `#history opens the history file pager and pages through it`
- `#hist unique-prefix autocompletes to #history`
- `#diagnose is unknown in NetHack 5.0`
- `#redo is unknown in NetHack 5.0 (command is #repeat)`
- `^ with no trap reports none visible and prompts first`
- `^ describes a seen trap on the hero square`
- `^ describes a seen adjacent trap via direction`
- `^ uses an for vowel-initial trap names`
- `^ ignores traps the hero has not seen`
- `^ credits player-made traps with set/dug/woven wording`
- `^ up/down directions hide holes above and rock traps below`
- `^ describes a trapped door`
- `^ describes a known trapped chest`
- `^ escape cancels the direction prompt silently`
- `X enters explore mode after the beware prompt and confirmation`
- `X declined continues the normal game`
- `X in explore mode reports it is already active`
- `X from debug mode names debug mode and drops wizard on entry`
- `V shows the one-line short version string`
- `m-prefixed V shows the full version overlay`
- `^A with no previous command has nothing to repeat`
- `^A repeats the last rest command`
- `^A repeats the last search command`
- `^A repeats the last movement command`
- `unknown commands clear the repeatable command`
- `#repeat repeats the last command like ^A`

Verification:

```sh
node --test test/misc-commands.test.mjs
bash frozen/score.sh
```

Result: all 26 misc-commands tests passed; public session score stayed 44/44.

## Remaining Gaps

- `do_repeat` only replays flat movement/run/search/rest keys; C queues every executed command (including extended commands plus their queued direction/getlin answers) in `CQ_REPEAT`, so after an extended or direction-based command `^A` reports nothing to repeat instead of replaying it.
- `doidtrap`'s trapped-door branch keys off `D_TRAPPED` alone; C gates on the currently displayed trap glyph (a trapped door reverts to a normal door glyph once seen, and the JS display never renders trapped doors/chests as `^`).
- `doidtrap` does not search hero/steed/monster inventories for trapped boxes on the queried square the way `trapped_chest_at()` does.
- An invalid key at the `^` direction prompt shows the generic cmdassist direction overlay rather than C's getdir-specific `help_dir()` text.
