# 968 — Wizard polyself (seed9008): hero polyself AC, newman(), and controlled wand-zap-self parity

Date: 2026-08-01
Scope: js/cmd.js polyself path (polyselfFormByName, becomeMonster newman
branch, zapPolymorphDirection self-zap), js/allmain.js chargen increments.
Target: sessions-extra/seed9008-wizard-polyself.session.json.
Base state: RNG 2492/2720, screens 122/154 (cursors 130/154).
End state: **RNG 2633/2720, screens 145/154 (cursors 147/154)**, all 44
public sessions (frozen/score.sh) green, all 3643 unit tests green.

## Relation to prior work

- wave-4 (slice/fix9008) had uncommitted WIP: a polyselfFormByName MONS-ac
  attachment (cmd.js) plus a speculative metallivore.js wand-material tweak.
  This wave adopted the cmd.js piece verbatim in intent; the metallivore.js
  hunk was not adopted (this session's metallivore roll stream at steps
  124-125 matches C without it; the hunk has no recorded-session backing).

## Divergences fixed (one at a time, in order)

### 1. Step 125 (global rng 2489): missing rnd(2) in monster→hero to-hit

C rolled `rnd(2)=1` at mhitu.c:709 — that's `AC_VALUE(u.uac)` for a
negative-AC hero (hacklib macro: AC_VALUE(ac) = ac < 0 ? -rnd(-ac) : ac).
The hero was a xorn (natural AC -2, monsters.h:2357-2358), but the JS polyself
form resolution (monsterByRndName/RANDOM_MONSTER_BY_NAME rows) carries no
armor class, falling back to base 10.

Fix (js/cmd.js): `polyselfFormByName()` attaches the natural AC from
js/permonst.js MONS (".ac" mirrors include/monsters.h LVL) when the resolved
row has no mac. C refs: find_ac() starts from mons[u.umonnum].ac
(do_wear.c:2473-2475); polymon() recomputes hero AC after changing form
(polyself.c:896-898 region). Curated POLYSELF_EXTRA_FORMS entries keep their
explicit mac; werecreature dual MONS rows take the beast form (first match),
matching polyself.c:782-792.

Tests loudly updated (audit-957 precedent — unit fixtures contradicted C):
- "xorn breakarm" test: expected uac 10 → now -2 (monsters.h:2358).
- "whirly fog cloud" test: expected uac 10 → now 0 (monsters.h:1054).
- "minotaur flimsy helm" test: expected uac 9 → now 5 = 6 (monsters.h:1787)
  minus 1 (elven leather helm AC bonus, objects.h:445-447).

### 2. Step 133 (global rng 2563): wand of polymorph zap at self with control ignored the typed answer

JS rolled the uncontrolled path: system-shock rn2(20), random form
rn2(SPECIAL_PM), then an rn2(5) coin flip — C does none of these with
Polymorph_control: polyself.c:481 (controllable_poly = Polymorph_control &&
!(Stunned || Unaware)); Poly_control also skips the rn2(20) system-shock
check (polyself.c:489-497) and shows getlin("Become what kind of monster?
[type the name]") (polyself.c:513).

Fix (js/cmd.js): zapPolymorphDirection '.' with `controllablePolyself()`
(heroHasPolymorphControl(): worn ring of polymorph control or the
polymorphControl intrinsic flag; !heroIsStunned && !heroIsUnaware) enters new
command mode `zapPolyselfMonster`, which reuses the polyself prompt UI. On
completion `controlledPolyselfZapResult()`:
- name "human" or the hero's race noun → becomeMonster(name) directly:
  "human" is placeholder/illegal as a monster so C forces newman() by the
  !polyok() short-circuit *without* evaluating the rn2(5)
  (polyself.c:712-714, cf. comment at polyself.c:559-562).
- other names resolve via polyselfFormByName and take the 1-in-5
  forced-newman roll first (polyself.c:712: `!forcecontrol && !rn2(5)`).
- after the effect: setKnownWandLine + first-time wand-type discovery records
  a "Wands / wand of polymorph" discovery and exercises Wisdom
  (zapyourself() learn_it=TRUE → learnwand() zap.c:123-150 →
  discover_object() with credit_hero, o_init.c:482-483 → exercise(A_WIS, TRUE)
  → rn2(19), attrib.c:499-509). Without this the trailing step-139 roll
  `rn2(19)=9 @ exercise(attrib.c:509)` was missing.

### 3. Step 139 (global rng 2563..2626): newman() reimplementation (rolls and stats)

The old 'human' branch of becomeMonster() approximated newman() with one
hp/en roll pair per form change instead of one per resulting level; C's
sequence at this step is (oldlvl 3, newlvl 5):
rn1(5,-2) level; rn2(10) sex check (polyself.c:361); rn2(160) rndexp
(exper.c:388); 4x rn2(5) redist_attr (attrib.c:749); rn1(4,8) hp scale
(polyself.c:390); 4x [rnd(8),rnd(2)] newhp (attrib.c:1101/1103, level 0 takes
the infix-only branch with no rolls); rn1(4,8) en scale (polyself.c:404);
rnd(3) newpw level-0 inrnd (exper.c:52); 4x rn2(7) newpw
(exper.c:64 = enermod(rn1(enrnd, enfix))) — then rn1(500,500) hunger.

Ported exactly: newLevel/out-of-range clamp (polyself.c:342-347), rndexp with
the LARGEST_INT factor loop (exper.c:377-395), redist_attr order and count
(Str/Dex/Con/Cha; Int/Wis skipped, attrib.c:753-755; the AMAX/ABASE drift is
not visible and not modeled), rounddiv(x,y) sign/half-up (hack.c:4551-4570),
per-level newhp with xlev cutoff (Wizard 12) and ACURR(A_CON) conplus
(attrib.c:1111-1125), per-level newpw with enermod around the whole rn1
(exper.c:25-43) and no enermod at level 0, proportional current hp/pw
(polyself.c:394-396, 409-411), display-level stat restoration unchanged.

New data tables: ROLE_HP_INIT/RACE_HP_INIT/ROLE_EN_INIT/RACE_EN_INIT (Init
columns from role.c roles[]/race.c races[] hpadv/enadv) — extracted from the C
sources programmatically and cross-checked against the existing low/high
tables.

Result verified against recording: XL 3→5, HP 39/39, Pw 36/36, Xp 5/263,
AC 10, rank "Conjurer", "You feel like a new man!" — screens 122..145 all
match.

### 4. Chargen increments uhpinc[0]/ueninc[0] (js/allmain.js)

newman() subtracts u.uhpinc[0..oldlvl-1] before rescaling
(polyself.c:385-388, 402-404); index 0 holds the initial hero's newhp()/newpw()
values (u_init.c:995-998; newhp/newpw store their own increment when
u.ulevel==0, attrib.c:1131/exper.c:71). JS left them null, inflating the
"extra" retained value by the initial 12 HP / 8 Pw. initializeHero() now seeds
both.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` — loads OK.
- `node --test test/*.test.mjs` — 3643/3643 pass.
- `bash frozen/score.sh` — 44/44 passing.
- Session: RNG 2492→2633/2720, screens 122→145/154, cursors 130→147/154.

## Remaining divergences (unsolved, for the next wave)

1. **Step 145, global rng 2614**: monster m_move anti-backtrack die size.
   C: rn2(20)=10 (monmove.c:1963, cnt-j=5); JS: rn2(12)=6 (cnt-j=3) for the
   jackal at (45,10). Trajectory evidence (temporary MOVEOUT/MONDBG probes,
   reverted): JS jackal walks (43,10)→(44,10)→(45,10)→(45,9); the C jackal
   must instead be at (44,10) at step 145 and at (45,10) at step 148 —
   i.e. its step-142 pick between (45,9)/(45,10) came out swapped relative to
   JS despite identical rolls, identical mfndpos candidate sets, and identical
   selection semantics as far as port review could establish. Suspects:
   subtle m_move/nearer/first-candidate ordering vs JS's
   `!next || dist < best` (monmove.c:1967-1983), or per-monster goal
   (mux/muy) divergence from set_apparxy (monmove.c:2198-2290) edge cases
   (the hero was wallwalking inside solid rock as a xorn at steps 123-130 —
   couldsee/accessibility edge cases there are unreviewed), or a JS↔C
   coordinate frame offset for internal positions (JS u.ux,uy=(57,15) renders
   at screen (56,16) matching C's cursor). Not polyself-specific; also worth
   reviewing heroMoveAmount=8 pin (see findings doc).
2. **Step 152 '>' zap-down**: JS prints "You feel shuddering vibrations."
   (zapwrapup, zap.c:3423-3426) where C's top line is blank after the floor
   pile poly; re-diagnose after (1) is fixed — rng streams are contaminated
   beyond 2614.
3. **Controlled-spell self-cast polyself** (`polymorphSelfZapResult` for
   SPE_POLYMORPH via spell.js deps) still takes the uncontrolled random path
   when the hero has polymorph control — C's spelleffects() runs the same
   polyself(POLY_NOFLAGS) → controllable prompt (zap.c:2804-2810 shares the
   case body with the wand in zapyourself; spell case at spelleffects
   SPE_POLYMORPH).
4. **newman details not modeled**: sex change on rn2(10)==0
   (polyself.c:361-362 change_sex, "You feel like a new woman!" message
   variant), the level-0-death path (polyself.c:343-346 "Your new form
   doesn't seem healthy enough to survive."), ulevelmax tracking
   (polyself.c:349-358), Sick/Stoned clearing (polyself.c:419-422), and the
   redist_attr AMAX/ABASE mutations themselves (attrib.c:744-772).
5. **polymorphSelfZapResult uncontrolled path** fidelity vs C's random
   branch (polyself.c:698-706 rn1(200-tries) loop, the forcecontrolled wizard
   ESC semantics, polyok retry loop polyself.c:585-611) was not touched.
