# Audit 934 - mksobj_init Charge/BUC Roll Order (seed9010)

Date: 2026-07-24. Scope: `mksobj`/`mksobj_init` charge and bless-or-curse RNG
consumption for TOOL_CLASS and AMULET_CLASS, cross-checked against the recorded
C annotations in `sessions-extra/seed9010-wizard-instruments.session.json`.

## C Source

- `nethack-c/upstream/src/mkobj.c:868-1175` (`mksobj_init`): per-class init.
  Tool charge cases: candles `1 + (rn2(2) ? rn2(7) : 0)` + `blessorcurse(5)`
  (989-997), lanterns/lamps `rn1(500,1000)` + `blessorcurse(5)` (998-1004),
  magic lamp `blessorcurse(2)` (1005-1009), camera/tinning kit/marker
  `rn1(70,30)` (1023-1027), can of grease `rn1(21,5)` + `blessorcurse(10)`
  (1028-1031), crystal ball `rn1(5,3)` + `blessorcurse(2)` (1032-1035), horn of
  plenty/bag of tricks `rn1(18,3)` (1036-1039), figurine `rndmonnum_adj(5,10)`
  loop + `blessorcurse(4)` (1040-1047), bell of opening `spe=3` no rolls
  (1048-1050), flute/harp/frost+fire horn/drum `rn1(5,4)` (1051-1057).
- `nethack-c/upstream/src/mkobj.c:1060-1069` (AMULET_CLASS): `rn2(10)` always;
  non-zero curses strangulation/change/restful-sleep amulets, everything else
  falls through to `blessorcurse(otmp, 10)`.
- `nethack-c/upstream/src/mkobj.c:1841-1854` (`blessorcurse`): no rolls when
  already blessed/cursed; else `rn2(chance)`, and on zero `rn2(2)` deciding
  curse (0) vs bless (1).
- `nethack-c/upstream/src/mkobj.c:1211-1223` (`mksobj` "regardless of init"
  switch): STATUE and FIGURINE share the case that fills `corpsenm` via
  `rndmonnum()` when unset and stores gender in `spe` (`rn2(2)` only for
  no-fixed-gender monsters).
- Classes that skip blessorcurse entirely: VENOM/CHAIN/BALL (1070-1073), COIN
  (1161-1162), GEM (976-986; loadstone is cursed with no roll, rock rolls
  `rn1(6,6)`, other non-luckstones roll `rn2(6)` for quantity), ROCK
  (1150-1160), FOOD except tins (895-975; the shared tail `rn2(6)` quantity
  roll at 970-973 excludes corpse/meat ring/kelp frond).

## Recorded C Annotations (seed9010)

- step 82 (wish "horn of plenty"): `rn2(18)=17 @ mksobj_init(mkobj.c:1038)`.
- step 102 (wish "frost horn"): `rn2(5)=4 @ mksobj_init(mkobj.c:1056)`.
- step 132 (wish "amulet of reflection"): `rn2(10)=4 @ mksobj_init(mkobj.c:1063)`
  then `rn2(10)=6 @ blessorcurse(mkobj.c:1846)`.
- steps 159/165 (horn of plenty applied): `rn2(6) @ mksobj_init(mkobj.c:971)`
  (food quantity tail after `rnd(1000)` food-type pick at `mkobj.c:289`).

## Findings And Changes

Probe-driven audit (`mksobj(otyp, true, false)` per otyp with the RNG log
captured; sequences compared call-by-call against the C sources above):

- Already correct, no change needed: horn of plenty `rn2(18)`, the five
  charged instruments `rn2(5)`, camera/tinning kit/marker `rn2(70)`, can of
  grease `rn2(21)` + `blessorcurse(10)`, crystal ball `rn2(5)` +
  `blessorcurse(2)`, candle/lantern/lamp sequences, and the amulet
  `rn2(10)` + `blessorcurse(10)` branch (`js/mklev.js:4478-4484`) including the
  bad-amulet curse short-circuit (wishes route badness through
  `game._mkobj_bad_amulet`, which reproduces C's otyp check exactly:
  `rn2(10)` is always consumed, the curse path stops there).
- FIGURINE gap (fixed): `mksobj(FIGURINE, true, ...)` consumed no init rolls.
  Added the C mkobj.c:1040-1047 case to `mksobj_init` (`js/mklev.js`,
  `rndmonst_adj(5,10)` retry loop + `blessorcurse(4)`) and extended the
  post-init STATUE case in `mksobj` to cover FIGURINE as C's shared
  STATUE/FIGURINE case does (mkobj.c:1211-1223: `rndmonnum()` fallback plus
  gender `rn2(2)`). No live caller passed FIGURINE directly before (wishes and
  random tools go through the TOOL_CLASS roll branch, which already had this
  logic inline); the change is dead code for current sessions but closes the
  parity hole for any direct `mksobj(FIGURINE)` caller.
- Documented quirk, deliberately not renumbered: `BAG_OF_TRICKS` and
  `CHAIN_MAIL` share synthetic otyp 10158 in `js/mklev.js:102`/`1506`, so the
  generic `otyp === BAG_OF_TRICKS` branch is shadowed by the armor branch.
  Live paths are correct: random tools use the TOOL_CLASS roll branch and the
  "bag of tricks" wish sets `game._mkobj_force_bag_of_tricks`
  (`js/cmd.js:44296-44303`), which the init switch checks before the armor
  branch and rolls `rn1(18,3)`. Renumbering would touch wish/display/save
  tables for zero session benefit.

Out of scope (owned by the wish-path work in `js/cmd.js`, divergences 1-2 in
`sessions-extra/findings/seed9010-wizard-instruments.md`): the missing
`rn2(maxprob)` weighted-pick roll for plain base-name wishes and the missing
`bugle` wish entry. seed9010's first mismatch stays at rng[2494] (step 43)
until those land; every `mksobj_init` call after that point now matches the
recorded C annotations above.

## Verification

- `bash frozen/score.sh` = 44/44 (before and after).
- `node frozen/ps_test_runner.mjs sessions-extra/seed9001-wizard-dig-pilot.session.json`
  = PASS, RNG 3533/3533, screens 77/77.
- `node frozen/ps_test_runner.mjs sessions-extra/seed9010-wizard-instruments.session.json`
  = RNG 2504/2641 unchanged; first mismatch still the cmd.js-scope wish
  weighted-pick at step 43 (no mksobj_init divergence remains in the trace).
- `node --test test/mksobj-charges.test.mjs` = 15/15 pass. The tests pin call
  signatures and BUC/charge logic per otyp (not session fixture values):
  exact roll sequences for charged tools, conditional `rn2(2)` tails of
  `blessorcurse`, both amulet branches across seeds, the figurine
  pick/blessorcurse/gender order, the TOOL_CLASS roll routing (plain tools
  roll nothing), and BUC-free classes (gems, loadstone).
