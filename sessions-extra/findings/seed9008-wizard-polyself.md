# seed9008-wizard-polyself — findings

## Coverage (all beats verified in the recording)

- `#levelchange` to XL 3 first — required because `newman()` can drop up to 2
  levels (`newlvl = oldlvl + rn1(5, -2)` at polyself.c:342); reverting to human
  at XL 2 can roll 0 → "Your new form doesn't seem healthy enough to survive."
- Wishes: ring of polymorph control (o), wand of polymorph (p), silver dagger (q).
- `P`ut on the control ring (right hand).
- `#polyself` → `xorn` — step 122: "You turn into a xorn!  The clasp on your
  cloak breaks open!" (break_armor, polyself.c:1189). Status line shows
  "Wizard the Xorn … HD:8".
- As xorn: `e`at the silver dagger — step 125: "This silver dagger is
  delicious!" (metallivore eat path).
- Xorn phases through the room's west wall and back — step 127 screen shows the
  `X` glyph inside the wall tile (M1_WALLWALK).
- Zap wand of polymorph at self with control ring → `human` — step 139:
  "You feel like a new man!" (`newman()`, XL 3→5, status
  "Wizard the Conjurer … Xp:5/263").
- `d`rop 3 potions (f,g,h), zap the wand down (`zp>`) — step 152 RNG shows the
  floor pile polymorphing:
  `rn2(100)=87 @ obj_resists(zap.c:1469)` | `rn2(8)=2 @ obj_shudders(zap.c:1496)`
  | `rnd(1000)=214 @ mkobj(mkobj.c:289)` … (one obj_resists/obj_shudders/mkobj
  sequence per potion).

## Why the previous recording failed (diagnosis)

Old run printed "You feel like a new man!" instead of becoming a xorn. That was
NOT a desync and NOT an unworn ring: the ring was on the right hand (old step 88)
and the "Become what kind of monster?" prompt did appear (only shown when
Polymorph_control is active, polyself.c:481/513). The failure was the 1-in-5
forced-`newman()` roll in `polyself()`: polyself.c:712
`if (!polyok(&mons[mntmp]) || (!forcecontrol && !rn2(5)) || your_race(...))`.
Wand zaps call `polyself(POLY_NOFLAGS)` (zap.c:2808), so the roll applies.
Fixed by using the wizard `#polyself` command → `polyself(POLY_CONTROLLED)`
(wizcmds.c:568) → forcecontrol skips the rn2(5). The wand+ring path is still
exercised by the revert-to-human zap (`human` always goes through `newman()`
via the `your_race()` branch, so it needs no forcecontrol).

## JS score (wave-5, base 203c9d5)

Base: RNG 2492/2720, screens 122/154 (cursors 130/154).
After wave-5 fixes: **RNG 2633/2720, screens 145/154 (cursors 147/154)**
— every roll and screen matches C up to global rng index 2614.

### Wave-5 fixes (all C-referenced, see audit 968)

1. **Polyself natural AC** (divergence: step 125, global rng 2489). C
   find_ac() bases the polymorphed hero's AC on mons[u.umonnum].ac
   (do_wear.c:2473-2475). js/cmd.js `polyselfFormByName` now attaches the
   monsters.h natural AC from js/permonst.js MONS (xorn −2 → AC:-2 status and
   the rnd(2) AC_VALUE roll at mhitu.c:706-709 against the grid bug).
2. **Controlled wand-of-polymorph self-zap** (step 133). zap.c:2804-2810 →
   polyself(POLY_NOFLAGS); with Polymorph_control && !(Stunned||Unaware)
   (polyself.c:481) the system-shock roll is skipped and C prompts
   "Become what kind of monster?". JS now prompts (new command mode
   `zapPolyselfMonster`) and honors the typed form: placeholder/own-race names
   ("human") force newman() with no rn2(5) coin-flip
   (!polyok() short-circuit, polyself.c:712-714); other names take the 1-in-5
   roll. learnwand→discover_object exercises Wisdom on first type discovery
   (rn2(19), o_init.c:482-483 / attrib.c:509).
3. **Exact newman()** (step 139, global rng 2563+). The JS `human` branch of
   becomeMonster() now mirrors polyself.c:336-466: rn1(5,-2) level, rn2(10)
   sex check, rndexp (exper.c:377-395), redist_attr's four rn2(5) (afs
   attrib.c:744-772), then rn1(4,8) scaling + per-level newhp()/newpw() loops
   (attrib.c:1080-1140, exper.c:40-84, enermod exper.c:25-43) with the
   role/race Init columns (role.c hpadv/enadv: Wizard {10,0,0,8,1,0}/
   {4,3,0,2,0,3}, human {2,0,0,2,1,0}/{1,0,2,0,2,0}) and urole.xlev, rounddiv
   (hack.c:4551), hunger rn1(500,500). Post-newman state matches the recording
   exactly: XL5, HP 39/39, Pw 36/36, Xp 5/263, AC 10.
4. **Chargen hp/en increments**: C records u.uhpinc[0]/u.ueninc[0] from the
   newhp()/newpw() call at u_init.c:995-998 (u.ulevel==0 store); newman()
   subtracts them again (polyself.c:385-388/402-404). JS now seeds both arrays
   in initializeHero().

## Remaining divergences (for the next wave)

- **Step 145+, global rng 2614**: a monster m_move candidate-count mismatch.
  C rolls rn2(20) at monmove.c:1963 (anti-backtrack rn2(4*(cnt-j))) where JS
  rolls rn2(12) — JS's jackal has cnt=3 at its position while C's jackal needs
  cnt-j=5. Reconstructed evidence: the two jackals occupy mirrored positions
  ((45,10) vs C's (45,9)-ish) despite an identical RNG history — a
  deterministic selection/ordering difference in m_move/mfndpos parity, or
  stale-state (track/goal) divergence. Note also the coordinate puzzle:
  JS game.u.(ux,uy)=(57,15) renders at screen (56,16) = C's cursor position;
  worth verifying the JS internal coordinate frame really is congruent with
  the map geometry C uses for monster pathing. NOT polyself-specific.
  Correct output state for this session still matches screens/jackal through
  step 151; the trails show the ping-pong around "(44,10)→(45,9)|(45,10)".
  Debug hooks used: MONDBG/MOVEOUT env probes (reverted), /tmp/probe*.mjs.
- **Step 152 '>' floor-pile zap**: JS prints "You feel shuddering vibrations."
  (zapwrapup obj_zapped message, zap.c:3423-3426) where the C recording's top
  line is blank; sweep after rng 2614 is fixed to re-diagnose (the RNG stream
  there is contaminated by the step-145 divergence).
- **`heroMoveAmount = 8` pin for xorn heroes** (allmain.js): kept; C-computed
  9 (mons xorn mmove, monsters.h:2357-2358) and other values regress this
  session — needs a proper turn-scheduling investigation.

## Old (wave-3) score note

`node frozen/ps_test_runner.mjs sessions-extra/seed9008-wizard-polyself.session.json`

Divergence 1 (fixed in wave 4): wish "silver dagger" unknown to JS
(WISH_BASE_OBJECTS missing weapon names) — resolved before this wave.
