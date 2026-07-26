# seed9004-wizard-fountain-oracle — findings

Ground truth: `sessions-extra/seed9004-wizard-fountain-oracle.session.json`
(recipe: `sessions-extra/recipes/seed9004-wizard-fountain-oracle.session.json`)

## Coverage achieved

- Wizard levelport to the Oracle special level (Delphi, dlvl 8), arrival at a
  room whose only exit requires stepping onto a known **magic trap**
  ("Really step onto that magic trap? [yn]" → "You feel tired.").
- Melee vs a gas spore; its explosion is fatal → wizard-mode **"Die? [yn]"**
  death refusal ("OK, so you don't die.  You survived that attempt on your
  life.").
- 5 species genocides from wished uncursed scrolls (little dog, grid bug,
  newt, water moccasin, water nymph). Note: "water demon" can NOT be
  genocided ("No, mortal! That will not be done."), nor were-creatures.
- Entry into Delphi ("Hello, wizard, welcome to Delphi!") — the sub-room has
  a walkable opening in its NW wall, no digging needed.
- **10 fountain quaffs** across two Delphi fountains: tepid water,
  contaminated (poison), bad breath, cool draught, and two
  "You unleash a water demon!" summons (both removed via `#wizkill`).
- 2 wizard-mode `#wizkill` runs (cursor monster picker: tip overlay,
  autodescribe, "You kill the water demon!" + level-ups to 2 and 3).
- 3 wizard-mode **"Dry up fountain? [yn]"** prompts, all refused.
- **#dip** of the starting quarterstaff (letter `a`) into a fountain
  ("Nothing seems to happen.").

## Final JS score

**PASS (RNG 6617/6617, Screen 248/248, Cursors 248/248)**

Full write-up of every fix: `docs/c-parity-audit/943-fountain-oracle-tails-2026-07-24.md`.

## Divergences found and fixed (audit 943)

1. Phantom "You hear a door open." (step 21): monster door-open feedback was
   not gated on `flags.verbose` (C monmove.c:1583); session runs `!verbose`.
2. `#wizmap` reveal never snapshotted hero terrain memory
   (`lastseentyp/doormask/wall_info`), so out-of-sight door changes rendered
   live state (C display.c:251-257, dungeon.c:2927).
3. Fatal gas-spore explosion was deferred a step with wrong messages; C
   resolves it inside the killing blow including destroy_items
   (`zap.c:5998`), "The gas spore's explosion is fatal." (explode.c:672),
   done() -> "Die? [yn]" -> survive -> exercise(A_STR) (explode.c:678), and
   grants the kill XP only after done() returns (mon.c:3673).
4. Lone "Wiped out all X." wrongly got a --More-- (C read.c:2965 plain pline).
5. Oracle rendered white instead of HI_ZAP bright blue (monsters.h PM_ORACLE).
6. "Hello, wizard, welcome to Delphi!" missing: the Delphi chamber was not a
   real DELPHI subroom, so no roomno transition existed for
   check_special_room() (hack.c:3711; topologize mklev.c:1621-1647).
7. Water demon HP dice hardcoded 7; C uses adj_lev (makemon.c:2016) — 8 at
   dlvl 8, 7 on shallower levels.
8. `#wizkill` unimplemented: unique-prefix echo completion, first-time
   farlook tip overlay, cursor autodescribe, xkilled(XKILL_NOMSG),
   "Next monster:" loop (wizcmds.c:243-326, getpos.c:771-1169).
9. Fountain fate 29 (bad breath + monflee-all, fountain.c:367-379) missing.
10. Wizard-mode "Dry up fountain? [yn] (n)" prompt missing (fountain.c:216-219);
    refusals keep the prompt text until the next pline (cmd.c:5147).
11. Random-monster reservoir used raw G_FREQ tables on an alignment-special
    level; C adds align_shift/temperature_shift per candidate
    (makemon.c:1706-1707) — route those levels through the full reservoir.
12. Dip prompt used the full object name under `!verbose`; C uses
    `shortestname` ("it"/"them") when !verbose (potion.c:2315-2316).

## Known remaining gap (pre-existing, not blocking)

- `^V<name>` levelports are unsupported in JS: the levelport text handler
  (js/cmd.js `_command_mode === 'levelTeleportText'`) only parses numeric
  targets; C resolves names through `lev_by_name()` (dungeon.c:2098). The
  shipped recipe uses numeric `^V8`, which produces byte-identical C ground
  truth from arrival onward (verified in the earlier audit).
