# C Parity Audit: Input, Commands, Windows, Menus

Scope: command parsing, key input, direction prompts, text prompts, window/menu behavior, and option-driven key/menu binding. This audit is based on upstream C in `nethack-c/upstream` and the current JS port. It focuses on C parity risks and implementation slices that would reduce behavioral drift.

## Executive Summary

The upstream C path is table-driven. `extcmdlist`, command flags, command bindings, special key bindings, number-pad modes, command queues, and window callbacks all feed a small set of dispatch functions. The JS port is mostly a large state machine in `js/cmd.js`, with direct literal-key checks, static help text, and ad hoc overlays for menus and text prompts.

The highest-value parity work is to add a small command/window compatibility layer, not to keep expanding per-command branches. A command registry plus generic `getlin`, `yn_function`, `select_menu`, count parsing, and key binding support would make many command/menu differences disappear at once and would also make future C parity audits much easier.

## Reference Map

### Upstream C

- Command metadata and flags:
  - `nethack-c/upstream/include/func_tab.h:9` defines flags such as `AUTOCOMPLETE`, `GENERALCMD`, `CMD_M_PREFIX`, `CMD_gGF_PREFIX`, `PREFIXCMD`, `MOVEMENTCMD`, and `CMD_PARAM`.
  - `nethack-c/upstream/include/func_tab.h:33` defines `struct Cmd_bind` and `struct ext_func_tab`.
  - `nethack-c/upstream/src/cmd.c:1662` starts `extcmdlist[]`, the authoritative command table.
  - `nethack-c/upstream/src/cmd.c:2006` adds internal movement commands and `move_funcs`.

- Command binding and number-pad setup:
  - `nethack-c/upstream/src/cmd.c:2662` implements `bind_key()`, including `nothing` unbinding and `CMD_PARAM` validation.
  - `nethack-c/upstream/src/cmd.c:2750` initializes default key bindings from `extcmdlist`.
  - `nethack-c/upstream/src/cmd.c:3161` defines special key defaults such as ESC, `getdir.self`, `getdir.help`, `count`, and `getpos.*`.
  - `nethack-c/upstream/src/cmd.c:3344` implements `reset_commands()`, including vi keys, number-pad keys, QWERTZ swap, PC-Hack compatibility, phone layout, and run/rush bindings.
  - `nethack-c/upstream/src/options.c:2574` parses `OPTIONS=number_pad`.
  - `nethack-c/upstream/src/options.c:7596` parses `BINDINGS=...`, including special keys, menu commands, mouse buttons, and extended commands.

- Main command parsing and dispatch:
  - `nethack-c/upstream/src/allmain.c:513` and `nethack-c/upstream/src/allmain.c:536` call `rhack()` from the move loop.
  - `nethack-c/upstream/src/cmd.c:3627` implements `rhack()`.
  - `nethack-c/upstream/src/cmd.c:3693` validates prefixes against command flags.
  - `nethack-c/upstream/src/cmd.c:3732` manages the repeat command queue.
  - `nethack-c/upstream/src/cmd.c:3778` runs movement/rush handling and calls `domove()`.
  - `nethack-c/upstream/src/cmd.c:3833` emits C's unknown-command behavior.
  - `nethack-c/upstream/src/cmd.c:5096` implements `parse()`, which drives count parsing, command input state, `gm.multi`, and message clearing.
  - `nethack-c/upstream/src/cmd.c:5010` implements `get_count()`.

- Extended commands:
  - `nethack-c/upstream/src/cmd.c:493` implements `doextcmd()`.
  - `nethack-c/upstream/src/cmd.c:752` implements tty `extcmd_via_menu()`.
  - `nethack-c/upstream/src/cmd.c:2523` implements `extcmds_match()`.
  - `nethack-c/upstream/win/tty/getline.c:292` implements `tty_get_ext_cmd()`.

- Direction and prompt input:
  - `nethack-c/upstream/src/cmd.c:3869` maps movement keys through bindings in `movecmd()`.
  - `nethack-c/upstream/src/cmd.c:3958` implements `getdir()`, including queued directions, self direction, help, mouse direction, and redraw retry.
  - `nethack-c/upstream/src/cmd.c:5471` implements core `yn_function()`.
  - `nethack-c/upstream/win/tty/topl.c:365` implements tty `yn_function` behavior; `nethack-c/upstream/win/tty/topl.c:463` handles ESC/defaults and `nethack-c/upstream/win/tty/topl.c:478` handles `#` numeric answers.
  - `nethack-c/upstream/src/windows.c:1868` wraps `getlin()`, including command queue consumption.
  - `nethack-c/upstream/win/tty/getline.c:36` implements tty line input; `nethack-c/upstream/win/tty/getline.c:85` handles ESC clearing/cancel, `nethack-c/upstream/win/tty/getline.c:142` handles erase, and `nethack-c/upstream/win/tty/getline.c:196` handles kill/delete.

- Windows and menus:
  - `nethack-c/upstream/include/wintype.h:111` defines `PICK_NONE`, `PICK_ONE`, and `PICK_ANY`.
  - `nethack-c/upstream/include/wintype.h:148` defines menu control keys.
  - `nethack-c/upstream/src/options.c:314` defines default menu command names and mappings.
  - `nethack-c/upstream/src/options.c:8037` rejects illegal menu command keys.
  - `nethack-c/upstream/src/windows.c:1856` wraps `select_menu()`.
  - `nethack-c/upstream/win/tty/wintty.c:2559` implements `tty_add_menu()`.
  - `nethack-c/upstream/win/tty/wintty.c:2649` implements `tty_end_menu()`, including prompt insertion and selector assignment.
  - `nethack-c/upstream/win/tty/wintty.c:2775` implements `tty_select_menu()`.
  - `nethack-c/upstream/win/tty/wintty.c:1515` through `nethack-c/upstream/win/tty/wintty.c:1765` is the tty menu input loop: counts, cancel, paging, select/deselect/invert, search, group accelerators, and explicit picks.

### Current JS

- Input:
  - `js/input.js:20` implements `nhgetch()` as queue-or-browser input.
  - `js/terminal.js:99` defines `KEY_BINDINGS.VI_KEYS` and `LINE_EDIT`.
  - `js/terminal.js:279` implements `readKey()`.
  - `js/terminal.js:340` implements keydown translation. Ctrl-letter works; unmodified arrows either map through active bindings or enqueue ANSI bytes; alt/meta are not translated.

- Command dispatch:
  - `js/cmd.js:8259` maps numeric key codes to one-character JS strings.
  - `js/cmd.js:8270` maps movement by lower-casing vi direction keys.
  - `js/cmd.js:23520` starts the large `rhack()` state machine.
  - `js/cmd.js:36153` starts extended command mode when `#` is pressed.
  - `js/cmd.js:36175` implements digit count collection.
  - `js/cmd.js:38011` implements `F` prefix and `js/cmd.js:38016` implements `m` prefix.
  - `js/cmd.js:38022` through `js/cmd.js:38070` implements movement/run startup.
  - `js/cmd.js:38314` handles unknown commands.
  - `js/allmain.js:11590` calls `rhack(0)` from the move loop; `js/allmain.js:11670` converts `context.move` into pending time.

- Extended commands and help:
  - `js/cmd.js:34831` handles `extendedCommand`.
  - `js/cmd.js:34832` through `js/cmd.js:35318` manually autocompletes and executes a subset of extended commands.
  - `js/cmd.js:6626` defines a static "Full Current Key Bindings List".

- Options and bindings:
  - `js/options.js:6` parses `.nethackrc` options.
  - `js/options.js:17` parses `BIND=key:command`, but stores strings directly.
  - `js/cmd.js:36145` only applies one observed binding path, mapping a configured key to inventory.
  - `js/cmd.js:4993` through `js/cmd.js:5362` renders options pages with many fixed or partially implemented options; `number_pad` is displayed as `0=off`.

- Windows and overlays:
  - `js/cmd.js:15809` is the generic `setOverlay()` helper.
  - `js/display.js:1275` renders overlay lines, cursors, `(end)`, and `--More--`.
  - `js/cmd.js:31246` handles `helpMenu`.
  - `js/cmd.js:31720` handles the options menu.
  - `js/cmd.js:9964` and `js/cmd.js:35906` now give musical instrument manual tunes a C-shaped local prompt flow: note normalization, `Play the passtune?`, cancel behavior, Stronghold tune awareness, and tumbler/gear feedback.
  - Many object, spell, loot, pay, and prompt flows are local `_command_mode` handlers rather than generic `NHW_MENU`/`select_menu` calls.

## Concrete Parity Gaps

### 1. Command Registry and Binding Semantics

C has one command table with keys, command names, descriptions, flags, and function pointers. JS has static help text and literal-key branches. This creates drift in:

- command availability and descriptions;
- regular key vs extended command behavior;
- command flags such as `GENERALCMD`, `IFBURIED`, `CMD_M_PREFIX`, `CMD_gGF_PREFIX`, `PREFIXCMD`, `MOVEMENTCMD`, and `CMD_PARAM`;
- `#` exact matching and autocomplete rules;
- dynamic key list generation;
- repeat-command storage.

Key evidence:

- C: `extcmdlist[]` at `nethack-c/upstream/src/cmd.c:1662`, flags at `nethack-c/upstream/include/func_tab.h:9`, binding at `nethack-c/upstream/src/cmd.c:2662`, dispatch at `nethack-c/upstream/src/cmd.c:3627`.
- JS: literal dispatch at `js/cmd.js:23520`, static help at `js/cmd.js:6626`, partial binding at `js/cmd.js:36145`.

Likely impact: any behavior depending on non-default bindings, dynamic help/key lists, command aliases, wizard gating, buried command gating, exact command names, command flags, or command repeat can diverge.

### 2. Prefix and Count Handling

C treats prefixes as commands with flags. `m`, `g`, `G`, and `F` are accepted only by commands whose flags allow them, and invalid prefix use has specific feedback. Counts are parsed centrally by `parse()`/`get_count()` and affect `gm.multi`.

JS stores prefixes in fields such as `_move_nopick_prefix`, `_request_menu_prefix`, and `_force_fight`, then individual branches clear or interpret them. Counts are collected only from digit keys at top level and are consumed mostly by wait/search/movement-specific code.

Key evidence:

- C prefix validation: `nethack-c/upstream/src/cmd.c:3693`; movement prefix resolution: `nethack-c/upstream/src/cmd.c:3778`; count parse: `nethack-c/upstream/src/cmd.c:5096` and `nethack-c/upstream/src/cmd.c:5010`.
- JS prefixes: `js/cmd.js:38011` and `js/cmd.js:38016`; counts: `js/cmd.js:36175` and command-specific consumers at `js/cmd.js:38156` and `js/cmd.js:38199`.

Specific gaps:

- No equivalent of C's command flag based prefix acceptance.
- No C-style `n` count key path for number-pad mode.
- No central `gm.multi` equivalent for every counted command; counted behavior is command-specific.
- No central repeat queue equivalent for `^A`.
- C's `ESC` count cancellation and message clearing are centralized; JS prompt/message state handles this per mode.

### 3. Number Pad, Alt/Meta, and Special Keys

C supports vi movement, number-pad movement, phone keypad layout, PC-Hack compatibility, QWERTZ y/z swap, special key rebinding, and ALTMETA ESC-prefix interpretation.

JS currently uses vi movement and browser arrow-to-vi bindings. `number_pad` appears as option display/config state but does not rebuild command bindings. Browser alt/meta are ignored by `_onKeyDown()`, and queued high-bit meta characters do not map back to C `M(x)` command bindings.

Key evidence:

- C number-pad and special keys: `nethack-c/upstream/src/cmd.c:3161`, `nethack-c/upstream/src/cmd.c:3344`, `nethack-c/upstream/src/options.c:2574`.
- C ALTMETA: `nethack-c/upstream/src/cmd.c:5248`.
- JS browser bindings: `js/terminal.js:99`, `js/terminal.js:340`; movement mapping: `js/cmd.js:8270`; options display: `js/cmd.js:5335`.

Specific gaps:

- Numeric movement modes are not command-binding modes.
- Shift/control/meta movement are not represented as binding transformations.
- Special keys such as `getdir.self`, `getdir.help`, `getpos.*`, and `count` are not configurable in the JS parser.
- Meta extended command keystrokes like C's `M-c` for chat are not a first-class input path.

### 4. Extended Command Matching

C's tty extended-command input supports exact matching after line input, autocomplete display, `extmenu`, and `#?`/extended command list flows. Matching is based on `extcmds_match()` and command flags, with wizard commands filtered.

JS extended commands use a manual partial-string mapping for a subset of commands. It autocompletes by replacing display text while typing, then executes a switch-like sequence.

Key evidence:

- C: `doextcmd()` at `nethack-c/upstream/src/cmd.c:493`, `extcmds_match()` at `nethack-c/upstream/src/cmd.c:2523`, tty `get_ext_cmd()` at `nethack-c/upstream/win/tty/getline.c:292`, and `extcmd_via_menu()` at `nethack-c/upstream/src/cmd.c:752`.
- JS: `extendedCommand` at `js/cmd.js:34831`, manual partials at `js/cmd.js:35280`, unknown extended command at `js/cmd.js:35258`.

Specific gaps:

- Autocomplete is hard-coded rather than derived from command metadata.
- Some commands listed in JS help are not executable through the same general path.
- `#?` / `M-?` and `extmenu` do not share C's command filtering and menu behavior.
- Exact matching and ambiguous prefixes are not C-equivalent.

### 5. Text Prompt and Yes/No Prompt Semantics

C has generic `getlin()` and `yn_function()` semantics. Tty `getlin()` has ESC behavior that clears existing text first, then returns ESC when empty. It also supports erase, kill, previous message display, and command queue input. Tty `yn_function()` handles defaults, ESC conversion to `q`/`n`/default, quitchars, case preservation when uppercase responses are present, and `#` numeric answers via `yn_number`.

JS represents text prompts as `_command_mode` plus a per-prompt text field. Some modes implement backspace and ESC; others only accept or cancel. Yes/no prompts are usually direct branch checks against `y`, `n`, `q`, space, enter, or ESC.

Recent coverage: musical instrument manual tune prompts now normalize typed notes, map `H` to `B`, handle known-passtune `ynq`, and preserve C-style cancel/no-time behavior for that local flow.

Key evidence:

- C `getlin`: `nethack-c/upstream/src/windows.c:1868` and `nethack-c/upstream/win/tty/getline.c:36`.
- C `yn_function`: `nethack-c/upstream/src/cmd.c:5471` and tty behavior at `nethack-c/upstream/win/tty/topl.c:365`.
- JS examples: wish prompt editing at `js/cmd.js:23640`, options fruit editing at `js/cmd.js:31785`, many prompt-specific `[ynq]` branches throughout `js/cmd.js`.

Specific gaps:

- No generic prompt API preserving C's ESC/backspace/kill behavior.
- No generic `yn_number` support for prompts accepting `#`.
- Prompt defaults and ESC conversions are implemented per prompt and can drift.
- `^P` previous-message behavior during prompts is not generic.
- Command queue input into `getlin` has no obvious equivalent outside raw key queues.

### 6. Window and Menu Contract

C's window layer is a narrow contract: `create_nhwindow`, `start_menu`, `add_menu`, `end_menu`, `select_menu`, `putstr`, `getlin`, and `yn_function`. Menus have modes (`PICK_NONE`, `PICK_ONE`, `PICK_ANY`), selector assignment, group accelerators, counts, paging, all/page select/deselect/invert, search, cancel, and returned counts.

JS uses overlays and per-mode handlers. Some pages visually mimic tty menus, but there is no general menu object that returns `menu_item` selections and counts.

Key evidence:

- C: menu modes in `nethack-c/upstream/include/wintype.h:111`, menu command keys in `nethack-c/upstream/include/wintype.h:148`, `tty_add_menu()` at `nethack-c/upstream/win/tty/wintty.c:2559`, `tty_end_menu()` at `nethack-c/upstream/win/tty/wintty.c:2649`, `tty_select_menu()` at `nethack-c/upstream/win/tty/wintty.c:2775`, and the input loop at `nethack-c/upstream/win/tty/wintty.c:1515`.
- JS: `setOverlay()` at `js/cmd.js:15809`, overlay rendering at `js/display.js:1275`, help/options command modes at `js/cmd.js:31246` and `js/cmd.js:31720`.

Specific gaps:

- No generic `PICK_ONE`/`PICK_ANY`/`PICK_NONE` return contract.
- No menu counts like `10a`, except where a specific object command implements its own count.
- No generic all/page select/deselect/invert/search.
- No generic group accelerators.
- No generic preselected-item behavior.
- Menu command rebinding is parsed by C but not implemented in JS.

### 7. Help and Key Listing

C's key list is generated from current command bindings, movement bindings, menu command aliases, number-pad state, special keys, and command flags. JS has static text that can diverge from actual executable behavior.

Key evidence:

- C dynamic list: `nethack-c/upstream/src/cmd.c:2867`, plus `key2extcmddesc()` at `nethack-c/upstream/src/cmd.c:2561`.
- JS static list: `js/cmd.js:6626`.

Specific gaps:

- Custom bindings and number-pad modes cannot be reflected.
- Static `M-*` lines do not imply a working meta-key input path.
- Commands advertised through help may not be reachable through current dispatch.

## High-Value Implementation Slices

1. Add a JS command registry.

   Create a data table shaped like C's `extcmdlist`: key, command name, description, flags, and handler. Start with existing implemented commands and aliases, then route current `rhack()` branches through it incrementally. This unlocks dynamic key help, prefix validation, extended command matching, and binding support without needing full command parity at once.

2. Add a binding map and `resetCommands()`.

   Mirror C's `commands_init()` and `reset_commands()` at a JS level. Build `game.commandBindings` from default command metadata, `number_pad`, `number_pad_mode`, special keys, and config bindings. Keep the initial slice small: vi mode, `number_pad:0/1`, `m/g/G/F`, ESC, and command aliases. Then add QWERTZ, phone layout, and PC-Hack compatibility.

3. Centralize command parsing.

   Introduce a `parseCommandKey()` helper that handles count collection, ESC cancellation, command lookup, prefix state, unknown command messages, repeat queue updates, and `context.move` defaults. Use it before command-specific handling. This should replace the current scattered `_count_prefix`, `_move_nopick_prefix`, `_request_menu_prefix`, and `_force_fight` interpretation over time.

4. Implement `extcmdsMatch()` and route `#` through it.

   Use the command registry for exact and prefix matching, wizard filtering, autocomplete filtering, `#?`, and `extmenu`. Keep the current command implementations as handlers, but stop hard-coding partial strings in `extendedCommand`.

5. Implement generic `ynFunction()` and `getlin()`.

   Add prompt helpers with C-compatible default handling, ESC behavior, erase/kill, optional `#` numeric answers, case preservation, prompt echo, and command queue input. Convert high-churn prompts first: prayer/quit/save confirmations, wizard wish, naming, level change, and extended command entry.

6. Implement a small `MenuWindow` adapter.

   Add `createMenu/startMenu/addMenu/endMenu/selectMenu` in JS with `PICK_NONE`, `PICK_ONE`, and `PICK_ANY`, selector assignment, preselection, counts, ESC cancel, space paging/finish, return/enter finish, and menu control commands. Convert one contained flow first, such as options `number_pad` selection or spell selection, then inventory/object selection.

7. Generate help from runtime state.

   Once command bindings and menu aliases exist, replace `FULL_KEY_BINDINGS_LINES` with generated output from the registry and active binding map. Keep static fallback text only for commands not yet represented in the registry.

## Suggested Priority Order

1. Command registry with flags and default bindings.
2. Central count/prefix parser for movement, wait, search, and command dispatch.
3. Extended command matcher using the registry.
4. Generic `ynFunction()` and `getlin()` for prompt parity.
5. Generic `MenuWindow` with `PICK_ONE`/`PICK_ANY` basics.
6. Number-pad modes and special key binding.
7. Dynamic key/help output.

This order keeps early slices narrow while removing the largest sources of drift: literal-key dispatch, prompt-specific input rules, and static menu/help behavior.
