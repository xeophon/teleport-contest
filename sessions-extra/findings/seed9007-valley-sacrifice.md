# Findings: seed9007-valley-sacrifice

And reclaiming the recorded session flow: Wizard "Offer" (chaotic) on seed
9007 / datetime 20260720093000 — wishes for gold and a wand of teleportation,
teleports by name to the Valley of the Dead, wizmaps, teleports onto the
temple stack, spawns a **tame minotaur**, zaps a wand of teleportation west
across the mob (hitting the lich AND the ettin mummy standing two rows
away), waits through the minotaur-vs-shrine-priest brawl, teleports out
the minotaur, genocides nothing (or not), kills the newt with force bolt,
picks the newt corpse up, steps onto the altar of Moloch, and finally
runs `#offer` in its three shapes.

Base state this wave inherited was deep in the mid-session: the levelport
had just been fixed, so the first divergence missed at turn ~step-167.

## Wave-five continuation — what I diagnosed and fixed

### 1. rloc()'s bogus x-offset (js/mklev.js, `rlocNoMsg`)

Call site for a monster teleported by a wand-of-teleportation beam:
teleport.c:1850 `rnd(COLNO - 1)` was being wrapped as
`rnd(COLNO - 1) + 1` because of a middle-of-history comment about a
display offset that actually lives somewhere else.  Same roll, same
virtual cell check, wrong square: `rloc(ettin mummy)` placed it at
(38,5) rather than the C-true (37,5).  One cell of offset then
desynced the whole mid-game mfndpos roll pattern (the first recorded
divergence was at flat index 17709, step 167, where the C stream's
`rn2(16)=8` was the mummy's mtrack-avoidance roll and the JS was
rolling `rn2(8)=0` for the same monster standing one column away).

C refs: teleport.c:1850-1871 (`rloc` random-candidate loop).

### 2. #wizgenesis visibility-gated feedback (js/cmd.js)

"A minotaur appears next to you." printing depended on where the
genesis call sites lived; the JS etoiletwo parallel paths.  Both are
now routed through `finishWizgenesisSpawn()` and the message is only
printed when the created monster is actually perceivable by the hero
(makemon.c:1478 canseemon/sensemon guard — a wild minotaur spawned
while the hero is blind is silently landed in seed4500-knight-coverage,
which regressed when I first blindly re-enabled the message on all
`#wizgenesis` outcomes).

C refs: read.c:3252-3361 (`create_particular_creation`), makemon.c:1470-1503.

### 3. Temple-adjacent minotaur multi-attack rounds (js/allmain.js + js/mhitm.js)

The tame minotaur's dog_move attack is a full mattackm() with
NATTK=3: claw 3d10, claw 3d10, butt 2d8.  Previous bespoke support
modeled one swing per turn and hard-faked rn2(3)/rn2(6)/rn2(3)
continuation rolls.  The new `portedPetAttackData()` /
`petAttacksMonsterPorted()` gate (currently restricted to
`data.name === 'minotaur'`) routes attacks through
`mhitm.mattackm()` plus the return-attack gate on rn2(4)
(dogmove.c:1158) so each minotaur round consumes exactly C's sequence
rnd(20)+d(3,10)+rn2(3)+rn2(6)+rn2(3), then rnd(21)+d(3,10)+...
[i.e., the i-scaled to-hit retry], etc. rather than the legacy shape.

C refs: dogmove.c:1099-1168, mhitm.c:194-571, mhitm.c:441
(rnd(20+i) gate), mhitm.c:1025 (mdamagem damage roll),
uhitm.c:5258/5269 (mhitm_knockback rolls), mhitm.c:1363 (passivemm
gate roll).

### 4. Ghosts wallwalking (js/mklev.js GHOST spec)

NetHack's ghost permonst has M1_WALLWALK|M1_FLY|M1_UNSOLID among its
mflags1 (permonst.js passes_walls test).  The JS sparse GHOST spec
Carried none of these, so `monsterAllowFlags` never granted
ALLOW_WALL|ALLOW_ROCK, and mid-monster walks (mfndpos) stopped early:
`ghost@m (,,) cnt=3` in the JS where the C log shows `cnt=8` (monster
can stone-glance away, even onto "rock" walls).  The cascade hits in
the second hour of the brawl: exactly where things desynced after the
first reroll-fixes.

C refs: mondata.h:29 (passes_walls), mon.c:2104-2105 (allow flags),
monc:2120-2260 (mfndpos reachable-cell filters).

### 5. Shrine-priest idle casting (js/allmain.js maybeCastUndirectedMonsterSpell)

The peaceful shrine cleric was never casting its cleric spells; when
faced with the brawl-battered minotaur adjacent, the C session briefly
does: choose_monster_spell(rn2(15)), castmu's fumble gate rn2(150),
"casts a spell!" message, and m_cure_self's d(3,6) heal.  The JS's
cleric branch rolled a single rn2(m_lev) then returned false — no
rn2(150), no d(3,6), and mspec_used never latched, sending the priest
through the (wrong) generic movement path instead.

Ported gate: mcastu.c:90-120 (choose_monster_spell), mcastu.c:155-168
(directed-selection abort), mcastu.c:180-181 (mspec_used saturation to
2 for level ≥ 8 casters), mcastu.c:206 (rn2(ml*10) fumble gate),
mcastu.c:300-317 (m_cure_self d(3,6)), monmove.c:894-907+(667-690)
(dochug idle-caster gate, "not attacking here → maybe cast, then
m_move" branch).  In the abstract the JS also had to model the priest
not moving on a cast-turn (MS_MOVE_DONE).

C refs for the last pet NPC branch of the flow: monmove.c:1090-1135
/ 2086-2126.

## What is still UNPORTED in this subsystem

Big buckets that still misalign after the fixes above:

* **Monster-turn composer / --More--** pacing.  The C engine blocks mid
  `mattackm()` at every repeated pline (so "The minotaur hits..." →
  --More-- → next attack's to-hit roll lands in the same recorded key
  and the *damage* lands in the next).  The JS engine queues messages
  and continues processing, so rng-price distribution across keystrokes
  doesn't match past the first working-message.  It shows up as
  per-step mismatches on the brawl steps even when rng ends up matching
  by the end of the turn.
* **Priest retaliation path** (its "attacked-back" swings at adjacent
  nasties): mattackm calls inside dochug's "attack if possible" tail
  (monmove.c:1030 and on) for non-peaceful priests; the JS has the
  basics on peaceful priests but not this gating.  Faces the target
  pickup: minotaur.  Recording has specific "The priest of Moloch
  wields a mace!/casts a spell!/looks better." triple rolls.  None of
  those messages/counts exist yet in the JS.
* **Pet-follow of the teleported-away minotaur** (rloc / mnexto
  re-targeting after the pet got teleported away by the second wand
  zap); currently the JS seems content to leave pandemonium at the
  spawn zone.
* **The #offer path** continues to diverge deeper in the 2100s-by-21200
  range (ushered by other divergence ripples); the killable newt,
  pickup, drop, offer logic all hire their own rng comparison windows
  and should be revisited after a fresh rebuild of ground truth after
  the above three are cleared.
