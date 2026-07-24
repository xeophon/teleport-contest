# sessions-extra — locally recorded parity probes

These sessions are recorded locally with the C recorder build
(`nethack-c/recorder/`, gitignored) and `scripts/record-session.mjs`.
They are NEW ground-truth fixtures for areas the public corpus does not
cover. Like the public corpus, they are regression tests only: never
embed their screens/RNG into runtime code.

## Layout

- `recipes/*.session.json` — moves-only recipes (version 5, segments
  with seed/datetime/nethackrc/moves, no steps).
- `*.session.json` — recorded outputs (steps filled in by the recorder).
- Score them with:
  `node frozen/ps_test_runner.mjs sessions-extra/<name>.session.json`
  (or the whole dir to run all).

## Recording (one agent at a time per install dir!)

The recorder mutates shared state under `NETHACK_INSTALL` (default
`nethack-c/recorder/install/games/lib/nethackdir`). For parallel
recording, copy the install dir and override:

```bash
cp -r nethack-c/recorder/install/games/lib/nethackdir .tools/nethackdir-<tag>
export NETHACK_INSTALL=$PWD/.tools/nethackdir-<tag>
export NETHACK_BINARY=$NETHACK_INSTALL/nethack
export PATH="$PWD/.tools/node/bin:$PATH"
node scripts/record-session.mjs sessions-extra/recipes/<name>.session.json sessions-extra/<name>.session.json
```

Wizard mode is enabled via `WIZARDS=*` in the installed sysconf and
`OPTIONS=playmode:debug` in the rc.

## Move-writing mechanics (learned the hard way)

- A recorded "step" = one input boundary. Many game turns can elapse
  inside one step (occupations, travel, multi-turn actions).
- `--More--` dismisses ONLY on space / enter / ESC. Any other key is a
  no-op there — your following commands desync. Sprinkle a space after
  every action that can print (wishes with discovery messages like
  "You learn more about your items by comparing them." always more).
- Space inside a getlin text answer is literal text (mungspaces trims
  leading/trailing); avoid spaces inside typed answers.
- `#wizwish\n<object>\n` → item into inventory; letters continue from
  the starting kit (first wish usually lands on `o` for wizard).
- `^V` (\x16) levelport: "To what level do you want to teleport?"
  accepts numbers, `?` menu, and names via lev_by_name: oracle, quest,
  sokoban, mines, minetown, minefill, valley, castle, vlad, sanctum,
  astral, earth, water, fire, air, knox, medusa, wizard tower…
- `#wizgenesis\n<monster name>\n` or `*\n` for random.
- `#wizmap\n` reveals the map (use it in arrival-only stubs, then read
  the map to plan movement keys).
- Blessed scroll of genocide asks "What class of monsters…?" (answer a
  symbol letter like `L`, or class name); uncurced asks for a species.
- Applying a musical instrument may ask "Improvise? [ynq]".
- `a`pply on an unwielded pick-axe wields it (ECMD_TIME), then a canned
  re-apply gives the dig direction prompt next turn.

## Inspect a recording

`node /tmp/inspect-session.mjs <file> [firstStep] [lastStep]`
(or write your own decode via frozen/screen-decode.mjs).
