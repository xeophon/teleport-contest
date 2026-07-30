# Wizard machinery audit (wizard.c) — 2026-07-30

Scope: `js/wizard.js` (new) plus wiring in `js/mklev.js`, `js/allmain.js`,
`js/cmd.js`, `js/const.js` vs `nethack-c/upstream/src/wizard.c` (885 lines),
with wiring refs in allmain.c, mcastu.c, mon.c, makemon.c, sit.c, minion.c,
mondata.c. Driver check: `frozen/score.sh` 44/44 (RNG traces bit-exact on all
exercised paths, including sessions/seed0373 wizard appearance and the
seed0360/seed0361 world tours), plus test/wizard-machinery.test.mjs.

## C model surveyed

- **Bookkeeping**: `svc.context.no_of_wizards` (include/context.h:145) is
  bumped in makemon (makemon.c:1370-1375) and decremented by
  `wizdeadorgone()` (wizard.c:806-814) from `m_detach()` (mon.c:2762).
  The first WoY kill or the invocation makes the hero demigod
  (`u.uevent.udemigod`), starting the harassment timer `u.udg_cnt`
  (`rn1(250, 50)` on first kill; spell.c:287-297 uses `d(2, 6)` after a
  successful invocation).
- **Per-turn driver** (allmain.c:358-368): `if (u.uhave.amulet) amulet();`
  then the `rn2(40 + ACURR(A_DEX)*3)` engraving-wipe roll, then the demigod
  block (`udg_cnt--` down to 0 → `intervene()` → `udg_cnt = rn1(200, 50)`).
- **amulet()** (wizard.c:70-113): worn/wielded Amulet warmth hint
  (`!rn2(15)` + first MAGIC_PORTAL trap distance: hot <=9, very warm <=64,
  warm <=144), then sleeping-Wizard wake (`!rn2(40)`, gated on
  no_of_wizards, creepy-feeling message only when not `m_next2u`).
- **intervene()** (wizard.c:780-803): Astral `rnd(4)`, else `rn2(6)`;
  cases: vaguely nervous / black glow + rndcurse (sit.c:567) / aggravate
  (wizard.c:522-540) / nasty(NULL) / resurrect (wizard.c:733-777).
- **nasty()** (wizard.c:645-730): `rnd(max(1, ulevel/3))` outer iterations,
  inner 20-try alignment loop, `pick_nasty()` (wizard.c:578-630) with the
  44-entry table (wizard.c:43-57), Rogue-level uppercase reroll,
  genocided/difcap/hell-placement substitution via `big_to_little()`
  (mondata.c:1316 over mondata.c:1228-1291), juvenile-name filter
  ("baby ", " hatchling", " pup", " cub"), arch-lich/Archon difcap clamp,
  `rnd(4)` spell/breath delay, genocided-pick random substitute with
  demotion roll (`rn2(In_endgame ? 3 : 7)`).
- **clonewiz()** (wizard.c:543-560, "Double Trouble", mcastu.c:413-418,
  gated at mcastu.c:943 on `iswiz && no_of_wizards == 1`): makemon the WoY,
  hostile/wake, `rn2(2)`-gated fake Amulet when the hero lacks a real one,
  `ROLL_FROM(wizapp)` = `rn2(12)` shape disguise unless protection from
  shape changers (wizard.c:59-63).
- **cuss()** (wizard.c:842-860): iswiz branch rn2(5) laugh / amulet
  relinquish taunt (gates rn2(28)+rn2(28)) / panic taunt (rn2(2) gates,
  rn2(2) phrasing, rn2(28) insult) / Parthian shot / malediction+insult
  (rn2(11) then rn2(28)); tables at wizard.c:819-838 (28 insults,
  11 maledictions).

## Ported in this slice

**js/wizard.js (new module)**: `noOfWizards`, `noteWizardOfYendorCreated`
(makemon.c:1370-1375), `wizdeadorgone` (wizard.c:806-814, rn1(250,50)),
`monHasAmulet`/`monHasSpecial` (wizard.c:116-141), `whichArti`/`monHasArti`/
`otherMonHasArti`/`onGround`/`youHave`/`targetOn`/`strategy`
(wizard.c:159-343), `hasAggravatables`/`aggravate` (wizard.c:496-540
including the `!rn2(5)` unfreeze), `clonewiz` + `WIZAPP` (wizard.c:543-560,
59-63), `nasty` incl. NULL-summoner harassment + WoY-branch msummon subset
(minion.c:59-167), `amulet` (wizard.c:70-113), `resurrect` (wizard.c:733-777,
both create/migrating branches, "kill"/"elude" voice lines), `intervene`
(wizard.c:780-803, astral `rnd(4)` vs `rn2(6)`), ported `rndcurse`
(sit.c:567-617 incl. Magicbane rn2(20) deflection), `demigodTurnHook`
(allmain.c:361-368), `wizardCussMessage` + `RANDOM_INSULT` /
`RANDOM_MALEDICTION` (wizard.c:842-860, 819-838).

**js/mklev.js**: `NASTY_MONSTER_NAMES` exported (was complete already;
C order verified 20 neutral / 14 chaotic / 10 lawful); `pickNasty()`
rewritten as the full `pick_nasty` (wizard.c:578-630) — Rogue-level reroll,
genocided/difcap(>0)/hell-placement substitution, big_to_little map
(arch-lich→master lich, master mind flayer→mind flayer, vampire leader→
vampire, cockatrice→chickatrice, elf-noble→elf, elven monarch→elf-noble,
ogre tyrant→ogre leader, captain→lieutenant; dragon/naga/purple-worm
juveniles filtered per wizard.c:609-620); `WIZARD_OF_YENDOR` exported and
resolved through `monsterByRndName`; makemon flags `iswiz` and bumps
`game.context.noOfWizards` (makemon.c:1370-1375).

**js/allmain.js**: per-turn hook in moveloop order (allmain.c:358-368) —
`amulet()` when `u.uhave.amulet`, engraving roll, then demigod harassment.
Monster spell slice: `cloneWiz` gated `iswiz && noOfWizards() > 1` rejection
(mcastu.c:941-945) and, when cast, "Double Trouble..." + `clonewiz()`
(mcastu.c:413-418); `aggravation` casts print C's line and call
`aggravate()` (mcastu.c:826-830).

**js/cmd.js**: hostile-cuss wizard branch delegates to
`wizardCussMessage()` — identical RNG/message surface; the angel/demon
`com_pager` taunts remain in cmd.js (pager content owned there).
`recordVanquished()` fires `wizdeadorgone()` for `iswiz` monsters once
(mon.c:2762 via mondead/mongone).

**js/const.js**: M3_WANTS* masks (include/monflag.h:159-163).

## RNG-fidelity notes

- Order kept on every exercised path: cuss gates (rn2(5) → conditional
  rn2(28) pairs / rn2(2) ladders / rn2(11)+rn2(28)), `pickNasty` single
  rn2(44) (+optional rogue reroll), `Wizard of Yendor` makemon bookkeeping
  is count-only (no rolls), `wizdeadorgone` rn1(250,50), `amulet()` rn2(15)
  warmth then rn2(40) wake, `intervene()` single die then branch-specific
  draws (rndcurse: rnd(6/…) then rnd(nobj) per item with rn2(10) artifact
  resist; astral branch consumes rnd(4) exactly like C).
- All added per-turn rolls are guarded on state that cannot occur in the
  public sessions (`uhave.amulet`/`udemigod`/iswiz casters), so the scored
  traces are unchanged; verified 44/44 with identical RNG totals.

Regression coverage: test/wizard-machinery.test.mjs (14 tests) — table
contents/order vs wizard.c, single-rn2(44) pick shape, arch-lich→master
lich substitution, wizdeadorgone rn1(250,50) range, amulet() roll gating
(worn-vs-carried, no_of_wizards), intervene astral/non-astral die shape,
rndcurse roll order, clonewiz rn2(2)-before-rn2(12) order + counter,
resurrect voice lines, distant-wizard wake message.

## Verified session impact

- `bash frozen/score.sh` 44/44 passing, every session RNG N/N unchanged
  (seed0373-barbarian-quest-tour contains the Wizard appearance +
  "A voice booms out..." screen; seed0360/0361 tours generate wizard-tower
  levels).
- All pre-existing test files keep their baseline results
  (shop-billing-helpers retains its 9 pre-existing failures, unchanged
  before/after this slice).

## Still unported / best-effort in wizard.c subsystem

- **tactics()/choose_stairs()**: strategy()/target_on() are ported as
  library code, but the monmove loop still drives covetous monsters through
  the pre-existing covetous-teleport slice (allmain.js rn2(5/33) model);
  the full choose_stairs stairway-walk (wizard.c:352-376), stairs-hole-up
  healing, and goal-teleport tactics are not wired.
- **resurrect() migrating branch**: modeled over `game.migrating_mons`
  best-effort (JS migration lacks C's `mlstmv` catchup precision and
  `mon_arrive(..., Wiz_arrive)` placement rules).
- **msummon()** proper: only the WoY (NULL-monster) A_NONE branch is ported
  for nasty()'s in-hell 1/10 case; demon-lord/prince/angel generalities
  remain unported.
- **rndcurse() Anti-magic shieldeff/Half_spell_damage**: ported structurally;
  hero Antimagic detection is approximate (status-suffix/flag based) because
  the property system isn't fully modeled.
- **wizdeadorgone() non-kill departures**: hooked at `recordVanquished`
  (recorded kills); mongone-style removals that bypass it (level escape of a
  Wizard clone, genocide of "*", timeouts) don't decrement the counter yet.
- **cuss() angel/demon branches**: `com_pager("angel_cuss"/"demon_cuss")`
  speech stays with the existing pager tables in cmd.js; the `Deaf` early
  return (wizard.c:844) is enforced by the hostile-cuss gate, like C's
  monmove.c:985 caller.
