# Audit — seed9007-valley-sacrifice (2026-08-01)

## Scope covered this wave

Priest/temple-adjacent combat during the valley sacrifice recipe:
the tame-minotaur vs aligned-cleric brawl, cleric spell casting, pet
attacks, and the two wand-of-teleportation beams (lichee and monster
teleports), plus the #wizgenesis feedback message the player sees when
the tame minotaur appears.

## Verification method

Built the actual C recorder binary (nethack-c/recorder patches on top
of upstream NetHack 5.0 pinned at release tag `16ff59115`), with two
extra DEBUG-only instrumentation patches layered on /tmp:

- `place_monster()` writes one line per monster placement (name,
  from-xy, to-xy, hp, level).
- `monmove.c` `mfndpos()`-side counters print the monster name,
  position, candidate count, and mtrack at every "4*(cnt-j)" roll site.
- `monmove.c` `dochug()` entry prints name/position/peace/tame at every
  dochug call in a window.
- `monmove.c` `distfleeck()` prints name/position at every rn2(5) roll.
- `mcastu.c` `castmu()` entry prints caster name/position/level and the
  thinks-it-foundyou flags.

And the canonical session recipe was re-driven with `node
scripts/record-session.mjs`, confirming a byte-identical reproduction
of the recorded `sessions-extra/seed9007-valley-sacrifice.session.json`
(= upstream ground truth exists locally and regenerates).

## Fixes

1. **`js/mklev.js` `rlocNoMsg`**: removed the `+1` x-offset in the
   random-candidate loop: upstream picks `x = rnd(COLNO - 1)`,
   `y = rn2(ROWNO)` directly (teleport.c:1850-1851).  The JS comment
   on that line claimed a world-coordinate offset — there isn't one.
   Ground truth verified by the place_monster trace showing the ettin
   mummy flown from (70,10) to (37,5) by the hero's westward zap,
   matching the C log exactly (`rnd(79)=37, rn2(21)=5`).

2. **`js/cmd.js` #wizgenesis**: two parallel genesis message paths
   existed; remerged into one (`finishWizgenesisSpawn`), and the
   "A <mons> appears next to you." message now only fires when the
   created monster is actually visible or senses (C: makemon.c:1478),
   matching observed behavior on the wild-minotaur-when-blind case in
   seed4500-knight-coverage (regression there was caught by the
   contest runner and then re-verified).

3. **`js/allmain.js` pet multi-attacks**: calls into
   `mhitm.mattackm()` when the petitioning pet has a full two-plus
   attack table; currently active only for `minotaur` (the only species
   with a recorded fight in this session).  Returns to the legacy
   single-attack path for anything else, preserving behavior of all
   other pairs covered in the existing public session suite
   (triggered a test-only regression on
   `test/shop-billing-helpers.test.mjs` before the minotaur gate was
   restored; now green).

4. **`js/mklev.js` ghost specs**: `passWalls: true` + `inAir: true` +
   `unsolid: true` per monsters.h (M1_WALLWALK|M1_FLY|M1_UNSOLID).
   Symptom captured: ghost mfndpos count 8 (C) vs 3 (JS) for the same
   wall-adjacent squares.

5. **`js/allmain.js` cleric casting**: peaceful shrine priests now run
   the full castmu() undirected-selection-C-version: choose_monster_spell
   (rn2(m_lev) + optional rn2(13) rescale at the level cap 13), fumble
   gate rn2(ml*10), m_cure_self's d(3,6), latched mspec_used=2, AND the
   trailing distfleeck() recalc roll immediately after the m_move-done
   switch (monmove.c:913-917).  Tired-state cuts are not modeled for
   this wave.

## What's still known to diverge

- Monster-processing ORDER around the turn boundary between the cured
  priest and the following fast monsters (the JS's re-do of fast
  monsters' moves at the ordinary restart points doesn't line up with
  C's do-while accounting yet): C log evidence `my DF trace` shows
  distfleeck counts for specific bats (e., 41,7, 37,11, 52,8) in a
  pattern the JS reproduces one roll late.
- Priest retaliation-by-attack against the attacking minotaur (mattackm
  with priest leading from the peaceful side) is not wired yet; the C
  recipe depends on it when the priest is adjacent hit candidates.  Its
  C-side marks: monmove.c phase-four + mfndpos's ALLOW_M grant +
  mhitm.mattackm(...)/mattackm(..., true).
- Pet-side --More-- interleaving: C plines mid-mattackm plumb waits for
  each repeated message; the JS's side has queued messages instead, so
  same-key rng distribution differs once a message backlog forms
  (screen-only divergence, rng flit unaffected).
- Later beats: minotaur dismissal teleport (`#offer` of the missing
  minotaur), the newt genesis/zap/kill/pick-up path, the corpse
  sacrifice at the shrine — those haven't been re-audited under the
  corrected ground truth.

## State as of this write-up

- Contest runner: 44/44 public sessions passing (verified multiple
  times during the wave).
- Valley-sacrifice session: RNG 18342/21276 exact positional matches,
  screens 163/238.  Index of first positional mismatch is at or after
  18246 (step 179 boundary region).
