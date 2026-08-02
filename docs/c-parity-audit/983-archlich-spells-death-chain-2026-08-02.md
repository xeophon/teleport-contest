# Audit 983 — seed9105-wiz-archlich-spells (2026-08-02)

## Scope

Wizard-mode arch-lich session: `#wizgenesis arch-lich`, 30 counted
searches against frost touch ("You're covered in frost!", potion
shatter), castmu() mage spells via the AT_MAGC/AD_SPEL slot after
hitmu() and refused done()s ("Die?"->n), monster-curse chains
(rndcurse "malignant aura"), summon-nasties (carnivorous ape), the
ape's multi-attack chain running through multiple wizard-mode death
refusals, and the arch-lich's covetous tactics/teleport + touch chain.

## Current state after this slice (worktree slice/fin9105b)

- Baseline at session start: RNG 2338/2391, screens 68/115
  (cursors 81/115).
- Final: **RNG 2391/2391 (full positional match), screens 101/115,
  cursors 115/115.**
- All 49 public sessions still pass; no previously-passing extras regressed
  (11 extras pass before and after; seed9150 screens improved 149->156
  along the way).

## Divergences found and fixed (all C refs are nethack-c/upstream NetHack 5.0)

### 1. mspec_used (grab/release cooldown) substitution lost across --More--
  The carnivorous ape's AT_HUGS slot resolves through the deferred
  multiattack resume in js/cmd.js.  The resume object dropped `mon` and
  the per-slot sum[] history, so getmattk()'s substitution
  (mhitu.c:371-390 — mspec_used set by nasty()'s `mspec_used = rnd(4)`
  monster-summon cooldown, wizard.c:692-695) was never consulted: the
  ape rolled d(1,8) where C rolled d(1,6) for a substituted claw, and
  the AT_HUGS prev-two-hit auto-hit rule (mhitu.c:822-826) could not be
  evaluated.  Fix: thread `mon` and a `hitsSoFar` array (per-slot sum[])
  through `_deferred_multiattack_after_more` creation and re-defer
  (js/allmain.js + js/cmd.js).

### 2. heal-at-crossing: savelife() is synchronous inside mdamageu
  mdamageu() -> done() -> die() -> "Die?" -> savelife()
  (end.c:1108-1116, end.c:704-758) run *inside* the fatal hitmu() of a
  multi-attack: on refusal the hero is healed and the remaining slots'
  damage lands on the restored hp.  The port previously left uhp at 0
  across the whole "You die..."/"Die?" stretch and only healed at
  prompt resolution, so (a) late-slot damage vanished into the floor
  and (b) the turn-boundary regen_hp() (allmain.c:655-659) evaluated
  12/12 instead of C's damaged hp and skipped its `rn2(100)` roll
  (allmain.c:659), breaking the flat RNG stream at that point.
  Fix: at the zero-crossing inside the deferred multiattack resume
  (both the deferred-first apply and the slot loop), heal immediately
  via the existing restoreHeroHpForUnresolvedWizardDeath() helper
  (which also drives the HP-shows-0 display override,
  game_display.js:150-163), mark the death cycle with
  `_death_healed_at_chain_crossing`, skip the later re-zero in
  `deathDieMore` and the duplicate re-heal at `wizardDieConfirm`, and
  keep the "You die..." queueing keyed on the crossing rather than live
  uhp.  Prompt keys that don't answer ("5"/"s" arriving at "Die? [yn]")
  no longer clear the pending-death display state — C re-asks the
  prompt and keeps HP 0 on the status line.

### 3. " again" is impossible for getmattk()-substituted slots
  hitmsg()'s ` again` requires mattk == gh.hitmsg_prev + 1
  (mhitu.c:73-78); a grab/engulf slot substituted through getmattk()'s
  alt_attk_buf scratch copy can never satisfy that (for itself or its
  successor).  Fix: substituted slots in both the main multi-attack
  chain (js/allmain.js) and the deferred resume (js/cmd.js) carry an
  always-unique againKey/prevWasSubstituted marker, breaking the chain
  on both sides.  This is what makes the ape's sequence read
  "hits!  hits again!  hits!" (C) instead of three "hits again!"s.

### 4. Post-crossing chain slot messages print after the refusal line
  C parks the topline at the fatal slot's hitmsg + --More--; the
  remaining slots' hitmsg()s appear only after "OK, so you don't die."
  in the same input window (`Die?` windows sit between), and the
  survivor nomovemsg (end.c:727 `nomovemsg` -> allmain.c:381-383 unmul
  cadence) follows behind the forced --More--.  Fix: slot messages
  generated after a crossing heal are sunk into
  `game._death_chain_after_refusal_messages` and re-emitted by
  `wizardDieConfirm`'s refusal branch appended to the survival line
  with `more` forced.  (RNG rolls keep their original stream positions;
  only message windowing moves.)

### 5. Summoned nasties not newsym'd when a caster summoned them
  makemon() newsyms the placed monster unconditionally once past
  level-gen (makemon.c:1472-1473); the wizard.js nasty() port skipped
  newsym for caster-summoned monsters, so the ape's glyph appeared
  several input windows late.  Fix: unconditional newsym in
  js/wizard.js nasty() spawn and in cmd.js monsterSummonNasties()
  (mcastu.c:822-824 -> mcast_summon_mons -> nasty(), wizard.c:590-712).

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` loads OK.
- Local per-step tooling: sessions-extra/rng-diff.mjs (no positional
  mismatch across all 2391 C calls), screen diffs via
  frozen/screen-decode.mjs decode + per-step text compare.
- `bash frozen/score.sh` => 49/49 public sessions passing.

## Remaining divergences (target is FAIL on screens only)

All changes above brought RNG to a full match; the 14 remaining screen
steps [45-49, 60-62, 75-77, 93-95] are a single residual model
mismatch: the status-line turn counter (and nothing else).  C's
moveloop finishes the interrupted movemon sweep and the new-turn block
(mcalcdistress -> mcalcmove realloc -> svm.moves++, allmain.c:227-253)
*synchronously* even while cast-chain --More-- lines are parked on the
ty line; the port currently parks the whole `processMonsterTurns()`
sweep whenever a lichChain message is queued
(js/allmain.js: processMonsterTurns early return on
_queued_messages_after_more entries flagged lichChain/lichColdShatter/
lichCastRndcurse), so moves++ and the boundary rolls land one or more
input windows later than C.  Undoing that park wholesale re-runs
already-acted monsters (distfleeck double-rolls at monmove.c:538
observed), so the correct fix needs the sweep to continue from the
caster's successor without replaying it — i.e. a real movemon resume
index for queue-parked passes.  Not landed in this slice.

Everything else in the session — ape chain death/resume, refusal
heal timing, knockback pairs, summon coordinates (collect_coords,
teleport.c:700), makemon hp/inventory rolls for the ape, mspec_used
summon cooldown, regen_hp/dosounds/gethungry/u_wipe_engr boundary
rolls, frost-touch destroy_items shatter program, cursetxt/castmu
ordering — matches the recording bit-exactly.
