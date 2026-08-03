# Audit 994 — prayer outcomes, god_zaps_you chain, pleased tiers (2026-08-03)

Subject: `src/pray.c` `dopray()`/`prayer_done()`/`angrygods()` wizard-mode
prayer outcomes on a fresh dungeon level.  Ground truth probe:
`sessions-extra/seed9170-wiz-pray-outcomes.session.json` (recipe
`sessions-extra/recipes/seed9170-wiz-pray-outcomes.session.json`), recorded
with the C recorder (clang, patched submodule @ `16ff59115`) and replayed
by `frozen/ps_test_runner.mjs`.

## C refs (upstream NetHack-5.0.0)

- `pray.c:2288-2307` `dopray()`: paranoid query, `can_pray()` /
  `p_type` selection (too soon / too naughty / pleased), wizard
  "Force the gods to be pleased?" prompt; `nomul(-3)` at :2311,
  `afternmv = prayer_done`, invulnerable shimmer at :2222-2229.
- `pray.c:2308-2341` `prayer_done()`: p_type 0 adds `rnz(250)`
  (:2319) and `change_luck(-3)` (:2320) then `gods_upset()`
  (:2321 :1436-1443); p_type 3 -> `pleased()` (:2339).
- `pray.c:704-786` `angrygods()`: `maxanger` formula (:715-722),
  `rn2(maxanger)` switch (:725); case 0/1 "displeased" (:728-731),
  case 2/3 `godvoice(NULL)` + two verbalize()s + `adjattrib(A_WIS,-1)`
  + `losexp()` (:732-745), default `gods_angry()` + `god_zaps_you()`
  (:773-777); trailing `new_ublesscnt = rnz(300)` (:779-785).
- `pray.c:60` `godvoices[]` verb roll: `rn2(4)` inside `godvoice()`
  (:1415-1427); this is the only source of "booms/thunders/rings out/
  booms out" and its roll result must drive the rendered verb.
- `pray.c:610-704` `god_zaps_you()`/`fry_by_god()`: lightning fries an
  un-swallowed, non-reflecting, non-shock-resistant hero outright;
  "not deterred..." -> wide-angle disintegration beam; armor pieces from
  `uarms`/`uarmc`/`uarm`/`uarmu` roll `obj_resists(armor, 0, 90)`
  (`do_wear.c:3188-3197`, `rn2(100)`); `disintegrate_arm()`
  (`do_wear.c:3201-3248`).
- `end.c:704-758` `savelife()`: wizard/explore "Die?" refusal heals to
  `min(uhpmax, 50+10*floor(ACON/2))`, sets `nomovemsg = "You survived
  that attempt on your life."` (:727).
- `allmain.c:380-388` vs `allmain.c:413-416`: on the third nomul prayer
  turn, `unmul()` runs `afternmv` -> `prayer_done()` AFTER the
  once-per-turn block (`u_wipe_engr` etc.) and BEFORE the once-per-hero
  section, whose `seer_turn` re-roll `rn1(31,15)` therefore lands after
  `pleased()`'s rolls.
- `eat.c:3167`: `gethungry()` returns early while `uinvulnerable`
  (invulnerable prayers skip the per-turn `rn2(20)` hunger roll).
- `attrib.c:521-579`: `exerper()` hunger/encumbrance exercises run only
  when `moves % 10 == 0`; an invulnerable forced prayer's third turn can
  still pay this (`rn2(19)` per `exercise()` at :509).
- tty `pline`: a new topline message joins the pending line with two
  spaces while the combined width fits, otherwise a `--More--` boundary
  splits FIRST (`addToplineMessage()` mirrors this; that's why "You
  finish your prayer." stands alone before the 54-character godvoice
  quote line).

## Findings / fixes implemented (js/cmd.js, js/allmain.js, js/offer.js)

1. Declined wizard prayers now resolve in `finishPrayerDeclineOutcome()`
   (allmain.js) once the three nomul turns have ticked; message text no
   longer hardcodes a verb — the godvoice verb comes from the actual
   `rn2(4)` roll (was always "thunders"/"rings out").
2. `angrygods()` default case implemented: gods_angry voice roll, then
   the god_zaps_you chain staged over the same input boundaries C blocks
   on: finish-more, godvoice-more, "Suddenly, a bolt of lightning
   strikes you!  You fry to a crisp!", "Die? [yn]", refusal heal,
   "not deterred...", beam message + per-armor `rn2(100)` resists,
   crumble messages, "You disintegrate into a pile of dust!", second
   "Die?", refusal + survival nomovemsg, then the trailing `rnz(300)`
   timeout.  Armor destruction applies its AC/inventory effect after the
   final refusal to keep C's status-line staleness ("AC:9" across the
   chain, "AC:10" after).
3. Declined prayers always consume exactly three game turns — the old
   `nearbyTrouble ? 4 : 3` charge fabricated a fourth prayer turn that C
   never spends (its only purpose had been approximating seed4500's
   "It misses." decline, which the legibility-kept legacy path still
   covers when mid-prayer activity actually reaches the topline).
4. Forced-pleased prayers: the split/shimmy fixtures machinery is
   replaced by live processing: shimmer prints at command time, turns
   tick, a mid-prayer `--More--` pauses and resumes the nomul window
   (cobra hide during seed4500's oracle prayer), and `pleased()`'s mood
   word follows `u.ualign.record` tiers (DEVOUT 14 / STRIDENT 4):
   "satisfied" for the low-record wizard, "pleased" for the knight.
   Hider monsters whose message fires mid-prayer print the message on
   schedule but only visually drop under their object at the dismiss —
   matching the recorded map frames cell-for-cell.
5. Seer/clairvoyance `rn1(31,15)` re-roll is deferred past `pleased()`'s
   `rnz(350)` on a prayer's finishing turn (unmul ordering).

## Metrics

- New probe seed9170: RNG 6214/6214, Screen 44/44, cursors 44/44.
- Public corpus `bash frozen/score.sh`: 52/52 (unchanged).
- `frozen/ps_test_runner.mjs sessions-extra/`: 12/20 passing; the 8
  failing extras (seed9006-minetown-shops, seed9007-valley-sacrifice,
  seed9008-wizard-polyself, seed9012-castle-tune, seed9105-archlich-
  spells, seed9150-wizard-harass-intervene, seed9162-wiz-gascloud,
  seed9163-wiz-cockatrice) fail identically before this change
  (pre-existing; measured on the pre-edit tree).

## Not covered by this probe

- `angrygods()` cases 4-8 (rndcurse black glow, punish(), summon_minion()
  "Then die, mortal!") — no recorded probe yet; legacy mild-displeasure
  text stands as placeholder (parked for a future slice).
- p_type 1 ("too naughty", Luck<0 / angry god / negative record),
  p_type 2 cross-altar water prayers, p_type -1/-2 (undead form,
  Moloch altars in Gehennom), quest-artifact handing, crowning and the
  devout-knight pat-on-head boon table (pray.c:805-1070).
- Real (non-cheated) death by god_zaps_you (the probe always answers
  "Die? n"; the `y` path routes through the ordinary grave/identify
  flow but is unexercised).
