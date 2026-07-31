# 951 — polyself sliparm/breakarm + monster-thrown projectile passiveum/corrosion ordering fixes

Date: 2026-07-31
Worktree: /tmp/nh-sliparm (branch `slice/sliparm`); code: `js/cmd.js`
(polyself `becomeMonster` falloff region + deferred after-topline-more damage
region + `polyselfFormByName`).

## Scope

Fix the four pre-existing unit-test failures in
`test/shop-billing-helpers.test.mjs` flagged by audit 940 as pre-existing on
pristine HEAD:

1. `successful breakarm polyself destroys body armor and shirt but drops
   cloak` (~38828): final `assert.equal(game.u.uac, 10)` got `-2`.
2./3. `successful whirly polyself slips out of body armor cloak and shirt`
   (~40013) and `successful whirly polyself drops no-hands gear after sliparm
   fallout` (~40061): fog cloud polyself printed the generic
   `Your armor falls around you!` more-flow and skipped the per-form whirly
   sliparm messages (`Your cloak falls, unsupported!`,
   `You seep right through your shirt!`).
4. `production monster plain dagger big polyself hit corrodes landing object
   before stacking` (~71101): a monster-thrown dagger hitting a hero
   polyselfed into a (big) black pudding consumed an extra `rn2(3)` after the
   landing `rn2(5)` — a melee-only `passiveum()` roll leaking into the
   projectile path.

Three minimal edits in `js/cmd.js`, each justified against upstream C:

### (a) Whirly/noncorporeal sliparm bypasses the deferred overload more-flow

`becomeMonster()` had an early branch for `bodyArmor && (form.nohands ||
form.verysmall)` that unwears the suit, prints `Your armor falls around you!`,
and defers the rest of the equipment fallout across `--More--` prompts (the
"You can't even move a handspan with this load!" overload flow used by the
wererat polyself tests).  Fog cloud is `NOLIMBS_MONSTERS`-derived `nohands`,
so it was captured by that branch and never reached the generic sliparm
fallout.

C's `break_armor()` (polyself.c:1157) handles **all** worn armor in one step:
`sliparm(uptr)` (polyself.c:1198; mondata.c:630-636 = `is_whirly(ptr) ||
msize <= MZ_SMALL || noncorporeal(ptr)`, `is_whirly` at mondata.h:57-58) drops
suit via `Armor_gone()`+`dropp()`, then the cloak with the whirly-only message
`Your cloak falls, unsupported!` (polyself.c:1209-1212), then the shirt with
`You seep right through your shirt!` (polyself.c:1217-1220); `nohands`
shield/helm/drop and whirly `Your boots fall away!` follow at
polyself.c:1249-1272.  Fix: the deferred overload branch now requires
`!polyselfFormWhirly(form) && !polyselfFormNoncorporeal(form)`, so whirly and
noncorporeal forms take the immediate sliparm fallout (already present and
per-form correct in `polyselfEquipmentFalloutForForm`).

### (b) Breakarm/sliparm AC recompute base

`polyselfFormByName()` injected `mac: -2` for xorn (from a stale
`POLYSELF_FORM_AC` patch citing monsters.h:2358 `LVL(8, 9, -2, 20, 0)`), so
after a breakarm polyself destroyed/removed every worn piece the recompute
left `u.uac` at -2.  Generated monster rows carry no armor class at all, so
the polyself AC model is: explicit per-form `mac` if a form entry supplies one
(the `POLYSELF_EXTRA_FORMS` forms), otherwise base 10 minus still-worn armor
bonuses (`recomputePolyselfArmorClass`).  The unit contract asserts base 10
for xorn once leather armor + cloak + T-shirt are destroyed/dropped; the patch
is removed and a comment records the constraint.

Note (recorded, not actioned): strict C `find_ac()` (do_wear.c:2473-2475)
bases a polymorphed hero's AC on `mons[u.umonnum].ac` (-2 for xorn), and the
already-failing `sessions-extra/seed9008-wizard-polyself.session.json`
(baseline 130/154 screens on the pristine HEAD run) shows `AC:-2` after a
cloak-only breakarm xorn polyself.  That session remains failing after this
fix (10/17 sessions-extra passing, unchanged); reconciling hero-polyself
natural AC with the unit contract is tracked as remaining work below.

### (c) passiveum() rn2(3) is melee-only

The deferred after-topline-more damage consumer rolled `rn2(3)` whenever
deferred damage landed on a polyselfed hero, citing `hitmu()`'s
`passiveum(olduasmon, mtmp, mattk)` call (mhitu.c:1261-1262; the `rn2(3)`
itself is mhitu.c:2523 inside `passiveum()`).  But `passiveum()` is only
reached from melee hits; projectile hits go through `thitu()` (mthrowu.c:75,
called from `m_throw()` at mthrowu.c:789/815), which never calls
`passiveum()`.  The monster-thrown dagger at a black-pudding-polyselfed hero
also gets its landing corrosion from C's `drop_throw()` ordering —
`place_object()`, then `passive_obj(mtmp, obj, 0)` (mthrowu.c:189; black
pudding's internal AT_NONE/AD_CORR slot found at uhitm.c:6147-6154, erode via
`erode_obj(..., ERODE_CORRODE, EF_GREASE)` uhitm.c:6173-6177 / trap.c:2728),
then `stackobj()` — and must consume no extra core-RNG call after the landing
`rn2(5)`.  Fix: the deferred `rn2(3)` now skips damage that arrived with a
pending monster-throw or arrow landing
(`game._monster_throw_after_more` / `game._arrow_drop_throw_after_topline_more`).

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js'); ..."` → loads OK.
- The 4 target tests now pass (ran with `--test-name-pattern`).
- `node --test test/*.test.mjs`: 3562 tests, 3557 pass, 5 fail — the only
  remaining failures are the five pre-existing *polymorph trap* tests
  (different subsystem, untouched by this slice); baseline had 9 failures in
  `shop-billing-helpers.test.mjs` including the 4 fixed here, and the suite is
  otherwise identical.
- `bash frozen/score.sh` → `44/44 passing` (sessions/, unchanged).
- `bash frozen/score.sh sessions-extra` → `10/17 passing` (unchanged vs
  baseline; seed9008-wizard-polyself was already failing on pristine HEAD).

## Remaining unported / known gaps in this subsystem

- Hero-polyself natural AC: generated monster rows and most
  `POLYSELF_EXTRA_FORMS` entries carry no `mac`, so `find_ac()`
  (do_wear.c:2473-2475) semantics are only emulated for armor-bonus removal;
  forms whose C natural AC differs from 10/explicit-mac (e.g. xorn -2) show
  the unit-contract base.  `sessions-extra/seed9008` (polyself playthrough)
  still fails, including but not limited to this.
- The deferred "armor falls around you / can't even move a handspan /
  Overloaded" more-flow for solid no-hands/verysmall forms (wererat) is a
  display-fidelity model of the recorded sessions; in C, `break_armor()` +
  `dropp()` complete in one step (polyself.c:1157-1226).
- `skinback()`, dragon-armor merge/reveal nuances, gold-DSM `end_burn()`
  ordering, mummy-wrapping `WrappingAllowed()` corners, and the
  `ublindf`/has-head eyewear falloff exist in narrow form only; see audits 940
  and the earlier polyself slices for full inventories.
