# 932 — Wizard Levelport `lev_by_name` (2026-07-24)

## Implemented Slice: Name-Based Level Teleport Resolution

The JS wizard levelport (`^V`, `levelTeleportText` in `js/cmd.js`) previously
parsed only numeric answers through `cAtoiLikeLevel()`; any typed level name
fell into `retryInvalidLevelTeleportPrompt()` and, after 10 tries, into
`randomLevelTeleportFromPrompt()`.  C resolves names through `lev_by_name()`
before its `atoi()` fallback.  This slice ports that name resolution,
including the branch reachability rule, so typed names like `valley`,
`castle`, `oracle`, and `delphi` resolve exactly as C does — and cross-branch
names like `minetn` from Dlvl:1 are rejected exactly as C does.

C source:

- `nethack-c/upstream/src/teleport.c:1248`: caller — `(newlev = lev_by_name(buf)) == 0 && (newlev = atoi(buf))`; retry loop `while (!newlev && !digit(buf[0]) && (buf[0] != '-' || !digit(buf[1])) && trycnt < 10)`.
- `nethack-c/upstream/src/dungeon.c:2098`: `lev_by_name()` — mapseen annotations first, then `"the "`/`" level"` stripping, `gehennom`/`hell` -> `valley` (or `" to Vlad's tower"` when `In_V_tower`), `delphi` -> `oracle`, `find_level()` proto-name match, branch-name match, and the `dlev_in_current_branch` + `(wizard || VISITED)` gating.
- `nethack-c/upstream/src/dungeon.c:2087`: `dlev_in_current_branch` — same dnum, or main dungeon <-> gehennom via `medusa_level.dnum` / `valley_level.dnum`.
- `nethack-c/upstream/src/dungeon.c:311`: `find_branch(s, NULL)` — branch lookup by destination dungeon name, with or without the leading `"The "`.
- `nethack-c/upstream/src/dungeon.c:2652`: `find_mapseen_by_str()` — case-insensitive exact match on custom level annotations, checked before any stripping.
- `nethack-c/upstream/src/dungeon.c:299`: `find_level()` — case-insensitive exact match on special-level proto names.

JS changes (all in the levelport region of `js/cmd.js`):

- `js/cmd.js` (after `cAtoiLikeLevel`): new `levelPortInCurrentBranch()`
  (`dlev_in_current_branch`), `levelPortVisited()` (the
  `(svl.level_info[idx].flags & VISITED)` approximation — current level plus
  the saved-levels map), `levelPortBranchByName()` (`find_branch(s, NULL)`),
  and exported `levByName()` (`lev_by_name`).
- `js/cmd.js` (`levelTeleportText` Enter handling): the answer now tries
  `levByName(text)` first and falls back to `cAtoiLikeLevel(text)`
  (`atoi()`), mirroring `teleport.c:1248`; the resolved target flows through
  the unchanged numeric path (`singleLevelBranch` shudder, `In_quest`
  depth_start adjustment, `Nowhere` confirm, retry-on-unresolved), so C's
  post-resolution behavior is preserved for both numeric and named answers.
- The wizard `?` menu path (`print_dungeon`, `force_dest`) already existed
  and is unchanged.

Regression coverage:

- `test/levelport-names.test.mjs` (new, 12 tests): same-branch names,
  case-insensitivity, `"the X level"` stripping, `delphi` alias,
  `gehennom`/`hell` -> `valley`, main<->gehennom allowance, cross-branch
  rejection (`minetn`/`soko1`/`tower1` from Dlvl:1) and in-branch resolution,
  `In_V_tower` `" to Vlad's tower"`, branch names (with/without `"The "`,
  `"<branch> to Xyzzy"`, near-end selection, cross-branch rejection),
  unknown/numeric input -> 0, annotation priority over real level names,
  and the non-wizard VISITED gating for levels and branch ends.

Session verification (before -> after):

- `sessions-extra/seed9007-valley-sacrifice.session.json` (`^Vvalley`):
  RNG 2254/21276 -> 17335/21276; valley level-gen now aligns from the port
  onward.  Remaining divergence is downstream at `intemple(priest.c:443/471)`
  `d(10,500)`/`d(10,100)` temple-tithe rolls — priest subsystem, not the
  levelport.
- `sessions-extra/seed9012-castle-tune.session.json` (`^Vcastle`):
  RNG 2614/13635 -> 3824/13635; castle level-gen starts and aligns.
  Remaining divergence is `newmonhp(makemon.c:1042)` `d(13,8)` vs JS
  `d(15,8)` (monster level) — makemon subsystem, not the levelport.
- `sessions-extra/seed9004-wizard-fountain-oracle.session.json` (numeric
  `^V8` workaround): unchanged path, RNG 5286 -> 5955 (a concurrent
  magic-trap fix moved the downstream divergence to monmove at step 79).
- `sessions-extra/seed9006-minetown-shops.session.json` (wizard `?` menu
  port): unchanged, RNG 3836/7003 — remaining divergence is the
  `splevTrap`/`traptype_rnd` WEB polarity in `js/mklev.js` (see the 9006
  findings note), outside this slice.

Named-port moves-variants (local only; C ground truth untouched):

- `/tmp/seed9004-named-oracle.session.json` (`^V8` -> `^Voracle`): RNG
  matched 5955/6617 with the *identical* first mismatch (`rng[5883]`,
  step 79) as the numeric variant — the named port resolves to the same
  target byte-for-byte, matching the C finding that the two C variants are
  identical post-arrival.
- `/tmp/seed9006-named-minetn.session.json` (`^V? w` -> `^Vminetn`):
  rejected with C parity — the hero stays on Dlvl:1 and the second-try
  prompt shows `[type a number, name, or ? for a menu]`, with subsequent
  input consumed as further getlin tries, exactly as C behaves for a
  cross-branch name.

Gates: `node --test test/*.test.mjs` 3455/3455 pass;
`seed9001-wizard-dig-pilot` PASS; public `bash frozen/score.sh` 44/44.

## Fresh Follow-Up Audits

### `?` Menu `m ^V` Prefix (`iflags.menu_requested`)

C source:

- `nethack-c/upstream/src/teleport.c:1196`: wizard mode `m ^V` skips the
  getlin prompt on the first pass and jumps straight to `print_dungeon()`.

The JS handles `?` typed at the prompt but was not audited here for the
`m`-prefixed `^V` menu shortcut; no recorded session exercises it.

### Non-Wizard VISITED Tracking

C keeps a per-ledger-level `VISITED` flag in `svl.level_info[]`; the JS
approximates it as "current level or present in `game._saved_levels`".
Wizard sessions bypass the check entirely (`wizard ||`), so this only
matters for non-wizard teleport-control name ports, which no recorded
session covers yet.
