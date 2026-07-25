# Subagent Findings 940 - seed0108 Pet dog_goal obj_resists / Polymorphed Carry Capacity

Regression: sessions/seed0108-wizard-extcmd-wishlist passed at e0cb969 and
diverged at HEAD. First RNG mismatch at call 3123 (session step 167, key 'q'):
C's annotated sequence ends the kitten's dog_goal scan with three
`obj_resists(zap.c:1469)` rolls (`rn2(100)` = 87, 94, 32) and then
`dog_move(dogmove.c:1257)` `rn2(12)`; JS made only the first two and emitted an
extra `rn2(3)=2` (the `stillHere` branch of the pet movement-choice port of
dogmove.c:1257) before its own `rn2(12)`.

## Investigation (both sides instrumented live)

- JS probes (env-gated, since reverted) showed the step-167 pet turn scanning
  four floor objects in the dog_goal equivalent (`js/allmain.js` movePet):
  magic lamp@(43,18), cloak@(42,17), orcish dagger@(42,17), "9"@(44,18); the
  fourth apport roll `rn2(8)=0` succeeded, so JS's APPORT goal became (44,18).
- The C recorder (`nethack-c/recorder`, build-tree only, since reverted) was
  rebuilt with `dogfood()`/`obj_resists()` debug prints; re-recording the
  session with `scripts/record-session.mjs` reproduced all 16958 canonical RNG
  calls and showed C's dog_goal dogfood-ing FIVE objects: the same four plus a
  freshly dropped CHEST (otyp 215, tool class) at (42,16) — the hero (a
  polymorphed red dragon standing at (42,16)) drops it at step 167, before the
  monster turns. C's fourth apport roll therefore lands on the dagger at
  (42,17), which becomes the goal; in the movement loop C dogfoods the
  (42,17) pile (cloak, dagger — the 87/94/32 obj_resists rolls), picks the
  pile square via `j < 0` (no roll), and only the next candidate consumes
  `rn2(12)`. JS, missing the chest, had its apport success land on "9"@(44,18),
  making (42,17) a `j > 0` candidate with `stillHere` true — hence the extra
  `rn2(3)` and one missing obj_resists.

## Root cause (regressed since e0cb969)

The chest never reached JS's floor object list at all. At step 165 the wish
"chest" lands; C prints `q - a chest.` with no --More--. JS printed
`q - a chest.--More--`: the wish-landing encumbrance check
(`js/cmd.js` `heroEncumbranceForWeight(heroCarriedWeight())`) computed tier 2
(weight 938 vs capacity 550) because `heroCarryCapacity()` used only the
unscaled `25*(Str+Con)+50` base. C's `weight_cap()` (hack.c:4295-4342) scales
capacity for a polymorphed hero by the new form's body weight
(hack.c:4313-4323, the Upolyd branch): a red dragon (strongmonst,
cwt = WT_DRAGON 4500 > WT_HUMAN 1450) scales by 4500/1450 and clamps to
MAX_CARR_CAP 1000, so C stays unencumbered (938 < 1000) and prints nothing.
JS's spurious --More-- swallowed the next two keys ('d' at step 166 and 'q' at
step 167), the drop never executed, the chest never entered
`game.level.objects`, and every later screen/RNG comparison derailed — the RNG
stream stayed value-aligned until the pet turn because neither C's drop nor
JS's swallowed keys consume PRNG.

## Fix (js/cmd.js)

- `heroCarryCapacity()` now ports the Upolyd branch of `weight_cap()`
  (hack.c:4313-4323): `S_NYMPH` mlet → MAX_CARR_CAP; otherwise, when the form
  is not strongmonst or its body weight exceeds WT_HUMAN, scale by
  `cwt / WT_HUMAN` before the MAX_CARR_CAP clamp (levitation/air-level
  behavior unchanged).
- New `polyselfFormBodyWeight()` helper + `POLYSELF_FORM_BODY_WEIGHTS` map:
  dragons WT_DRAGON 4500 / baby dragons WT_BABY_DRAGON 1500 (weight.h:27-29),
  golem/skeleton cwt from include/monsters.h SIZ() (flesh 1400, clay 1550,
  stone 1900, iron 2000, wood 900, leather 800, rope 450, gold 450,
  glass 1800, skeleton 300). Unlisted forms default to WT_HUMAN, which leaves
  capacity bit-identical to the old code, so non-dragon polyself sessions are
  unaffected (flesh golem: strong && 1400 <= 1450 → no scaling, matching C).
- const.js import adds MAX_CARR_CAP / WT_BABY_DRAGON / WT_DRAGON / WT_HUMAN.

## Verification

- sessions/seed0108-wizard-extcmd-wishlist: RNG 16958/16958, Screen 303/303
  (also reproduced on a pristine `git archive HEAD` tree with only this fix
  applied; pristine HEAD alone fails at rng 3123 exactly as assigned).
- bash frozen/score.sh: 44/44.
- sessions-extra/seed9001-wizard-dig-pilot: PASS (RNG 3533/3533, Screen 77/77).
- `node --test test/*.test.mjs`: all suites pass except
  test/shop-billing-helpers.test.mjs, whose 112 failures (genocide/polyself
  and oil-dipping fixtures) reproduce identically on pristine HEAD without
  this fix — pre-existing, outside this slice.
- Recorder binary rebuilt without the debug patches and verified byte-faithful
  (seed0002 re-record: 27158/27158 RNG, 0 diffs).

## Notes / follow-ups

- Concurrent work in the same region: an uncommitted change suppresses
  `encumberMsg()` while polymorphed ("leave the status as the polyself path
  set it"). That suppression does not cover the wish-landing branch, which
  computes `heroEncumbranceForWeight` directly; the capacity scaling above is
  the C-faithful fix there. Both changes are compatible.
- Not modeled (no session coverage): ACURRSTR 18/xx strength encoding in the
  base capacity while polymorphed (JS keeps base-form stats); the
  `!cwt -> msize/MZ_HUMAN` sub-branch (no msize data on JS polyself forms);
  wounded-legs capacity reduction (hack.c:4334-4336); strong-steed capacity.
