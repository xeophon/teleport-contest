# Endgame UX, tombstone, and score list — end.c / rip.c / topten.c

Audit of the JS game-over slice against `nethack-c/upstream`: `src/end.c`
(1948 lines), `src/rip.c` (167 lines), `src/topten.c` (1487 lines).

## Ported in this pass

### js/end.js (from src/end.c + helpers)

- `DIED..ASCENDED` how codes — `hack.h:481-498` (`enum game_end_types`).
- `KILLED_BY_AN/KILLED_BY/NO_KILLER_PREFIX` — `hack.h:602-604` (struct kinfo).
- `DEATHS[]` / `ENDS[]` wording tables — `end.c:44-61`.
- `DISCLOSE_PROMPTS` — disclose() question text, including the "taken"
  variant `Do you want to see what you had when you died?` (`end.c:632-641`).
- `Goodbye(role)` role farewells — `role.c:2142-2157`. The old inline
  farewell maps said `Valkyrie: 'Velkommen'`; C's Hello() says Velkommen but
  Goodbye() says "Farvel" — ported as Farvel (no fixture covers a Valkyrie
  end screen; `bash frozen/score.sh` still 44/44).
- `justAn()` / `an()` — `objnam.c:2108-2154` article selection including the
  "unicorn/uranium/eucalyptus/uke/wun" exceptions and the single-letter rule
  (`'an x'`). Used by the generic monster-kill attribution in cmd.js
  (replacing the naive vowel test) — `end.c:184-196` sets format KILLED_BY_AN
  and formatkiller() resolves the article.
- `doneInBy(mon)` — generic done_in_by() attribution (`end.c:184-343`):
  unique `the ` prefix + KILLED_BY, invisible/"hallucinogen-distorted"
  prefixes; the deep shape-change cases (mimic/vampshifter/"ghost of X"/
  gold hallucination distortion) still depend on monster data the slice does
  not carry.
- `buildEnglishList()` — `end.c:1703-1749` ("first, second, or third").
- `computeEndScore()` — really_done() score block (`end.c:1284-1310`):
  gold gain less 10% unless `how >= PANICKED`, +50*(deepest-1), deep-dungeon
  bonus (+1000 per level past 20, capped at 10000 past 30), ascension x2
  (or x1.5 when alignment was converted back) multipliers.
- `deathSummary()` / `deathSummaryRows()` / `farewellRow()` — the
  really_done() endwin text block (`end.c:1370-1708`): farewell, "You died
  in <dungeon> on dungeon level N with X points,", gold/moves coda,
  "You were level L with a maximum of M hit points when you <end>.",
  with plur() agreement (hacklib) on point/piece/move/hit point.
- `escapedSummaryRows/Lines`, `quitSummaryLines` — `end.c:1561-1628`.

### js/rip.js (from src/rip.c)

- `RIP_TXT` stone frame — `rip.c:27-41`.
- `center()` — `rip.c:67-75` (`STONE_LINE_CENT 28` math on full 38-char
  lines, `STONE_LINE_LEN 16`).
- `genlOutrip()` — `rip.c:79-158`: name truncated to 16, gold clamped to
  >= 0 and capped at 999999999, death text wrapped with the C scan (latest
  space at index <= 16, hard cut at 16 mid-word when no space), four wrap
  lines before the year slot (the pre-existing JS only used three), year via
  yyyymmdd(when)/10000 % 10000 from the session clock (`game._datetime`).
- `ripStoneOverlayRows()` — fold of the genl_outrip putstr sequence
  (`rip.c:135-158`: blank row, 15 stone rows, two blank rows) into the
  overlay [row, col, text] triplets the tty window emits.
- `deathGraveLines()` — full NHW_TEXT endwin content: stone + farewell +
  summary coda (`end.c:1547-1551, 1572-1708`).

### js/topten.js (from src/topten.c)

- `NAMSZ 10 / DTHSZ 100 / ROLESZ 3` — `topten.c:31-36`.
- sysopt defaults `PERSMAX 3`, `ENTRYMAX 100`, `POINTSMIN 1`,
  `TT_ONAME_MAXRANK 10` — `config.h:326-345`, `sys.c:81-84`.
- `KILLED_BY_PREFIX[]` and `formatKiller()` — `topten.c:88-162`: prefix per
  how code (incl. "died of " starvation, "choked on ", "petrified by "),
  an() article under KILLED_BY_AN, field-splitting munging (`,` -> `;`,
  `=` -> `_`, tab -> space), and the ", while <reason>"/", while helpless"
  suffix for helpless deaths (`topten.c:151-161`).
- Record file decision: C writes a fixed-field text `record` via
  writeentry() (`topten.c:139-168`). The JS port keeps the contest's virtual
  FS convention (frozen/storage.js): a JSON array at path `/record`, with
  field names mirroring struct toptenentry (`topten.c:38-55`). JSON parse
  failure degrades to an empty list, matching C's zero-initialized read on
  truncated/garbage entries (`topten.c:75-148` readentry sets tt->points=0).
- `deathScoreLines()` — the topten() rank/persist/display flow
  (`topten.c:755-885`): POINTSMIN floor (0-point games stay unrecorded),
  insertion before the first lower-scoring entry with older wins on ties,
  "You made the top ten list!" for ranks <= 10 and
  "You reached the N<th> place on the top 100 list." for deeper ranks
  (`topten.c:866-878`), bold own entry, blank separator when the own block
  is disjoint from the top block (`topten.c:864-868`).
- `outheader()` / `outentryLines()` — `topten.c:1416-1530`: the
  "No Points ... Hp [max]" header, the special-cased first lines
  ("starved to death", "choked on his/her food", "was poisoned",
  "was crushed to death", "turned to stone", "escaped the dungeon [max
  level N].", "ascended to demigod[dess]-hood", "quit"), the
  ;-the- -> ,-the- display un-murgling, ` [max` wrap avoidance, the hp
  column and hp<=0 -> `-`.
- `getRndToptenEntry(rng)` — `get_rnd_toptenentry()` rank walk
  (`topten.c:1408-1439`): rnd(tt_oname_maxrank), walk the list, revert to
  rank 1 when the record runs out.
- `scoreWanted()` — prscore selection predicate (`topten.c:1051-1080`).

### Wiring in cmd.js

- The old inline `deathSummary()/deathGraveLines()/escapedSummaryLines()/
  deathScoreLines()` bodies moved verbatim/algorithmically into the new
  modules; call sites now import them. The `#quit` summary overlay uses
  `quitSummaryLines()`.
- The generic melee death attribution now goes through `an()`
  (killer-article parity instead of `/^[aeiou]/`).

## Still not ported (previous state or follow-up slice)

- done()/done2() prompt state machine in C detail: the JS slice already
  drives the equivalent flow through cmd.js command modes
  (deathDieMore/deathIdentify/deathAttributes...); table/flow parity is
  documented above, but the exact C call graph (done1 interrupt, done2
  paranoid_query ordering, savelife() restore, fuzzer_savelife()) is not
  modeled.
- disclose(): order is inventory -> attributes -> vanquished -> genocided ->
  conduct -> overview (`end.c:626-708`) driven by `flags.end_disclose` (all
  six `DISCLOSE_*` modes per category). The JS slice prompts in C order and
  honors the `-i -a -v -g -c -o` suppression but does not implement the
  `+`/prompt-default toggle letters.
- really_done() object/bones interplay: `done_object_cleanup()`
  (`end.c:847-924`), `keepdogs(TRUE)` pet scoring on escape/ascension
  (`end.c:1557-1582`), artifact_score() listing and point grant
  (`end.c:927-982`), valuables (gems/amulets) listing for escape/ascension
  (`end.c:1584-1657`), grave creation with the corpse+cause headstone text
  (`end.c:1565-1590`), and ugrave_arise bookkeeping involvement with bones.
- `(in celestial disgrace)` / `(with a fake Amulet)` suffixes on escape
  (`end.c:1553-1600`).
- Trouble-light paths: panic()/NH_abort()/done_intr()/done_hangup(),
  delayed-killer chains (`end.c:1667-1760`), xlogfile writexlentry()
  (`topten.c:168-390`) and the conduct/achievement encoders.
- prscore() CLI (`topten.c:1051-1243`) — only scoreWanted()'s predicate is
  ported; the `-s` command-line reporting of the record file has no browser
  counterpart.
- tt_oname()/tt_doppel() doppelganger/statue naming from the record list
  (`topten.c:1246-1466`) — mklev.js keeps an rnd(10)-consuming parity stub
  (`get_rnd_toptenentry()`) for RNG-sequence parity; actual record-name
  attachment to corpses/statues is unwired.
- PERSMAX-per-character record trimming (`topten.c:764-816`) and
  pers_is_uid matching are not modeled (single-user browser play).

## CAD-endependence of epitaph selection

Random headstone epitaphs are not part of rip.c — `make_grave()` pulls them
from `epitaph.txt` through `get_rnd_text(EPITAPHFILE, buf, rn2,
MD_PAD_RUMORS)` (`engrave.c:1695-1702`), i.e. the mklev.js `get_rnd_line()`
random-text machinery (rn2-of-chunk-size pick + pad-length re-roll loop in
`rumors.c:67-130`). That slice is already covered in levelgen; no changes
here.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js'); ..."` loads OK.
- `node --test test/endgame.test.mjs` — 22 source-derived tests pass.
- `bash frozen/score.sh` — 44/44 passing (includes
  sessions/seed0030-ten-diverse-deaths.session.json: ten death screens in
  full text-tombstone + score-list form).
- `node frozen/ps_test_runner.mjs sessions-extra` — 10/17 passing with
  metrics identical to the pre-change baseline (no regression; the 7
  failing extras are pre-existing slice gaps outside this subsystem).
- Full unit suite (all test/*.test.mjs): no new failures vs the pre-change
  run (9 pre-existing fails in polymorph/shop-billing areas, untouched).
