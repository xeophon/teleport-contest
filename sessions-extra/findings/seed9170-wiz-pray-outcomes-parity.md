# seed9170-wiz-pray-outcomes — parity findings

## Recipe & recording

`sessions-extra/recipes/seed9170-wiz-pray-outcomes.session.json`, recorded
via a fresh copy of the recorder install (`sudo-free` wizard mode after
setting `WIZARDS=*` in the copy's sysconf — one agent per install dir):

    NETHACK_INSTALL=$PWD/.tools/nethackdir-prayer
    NETHACK_BINARY=$NETHACK_INSTALL/nethack
    node scripts/record-session.mjs sessions-extra/recipes/<r>.session.json sessions-extra/<r>.session.json

Moves (43 keys): `jjhh#pray
y n  #pray
y n   n    n#pray
y y ` — see the
header comments in the recipe JSON.  Wizard-mode prayer exists behind the
paranoid "Are you sure you want to pray?" prompt (space = default 'n'!),
then "You begin praying to <god>.--More--", then the wizard-only
"Force the gods to be pleased? [yn] (n)" prompt; declining runs the prayer
for its natural outcome and accepting forces pleased.

## Probe coverage (three prayers, seed 9170, 2026-08-03 10:00 New York)

1. **p_type 0 "too soon"** (initial `u.ublesscnt = 300`, u_init.c:1005):
   `prayer_done()` (pray.c:2316-2323) adds `rnz(250)`, `change_luck(-3)`,
   `gods_upset()` -> ugangr 0->1 -> `angrygods()` with maxanger 6;
   `rn2(6)=2` picks case 2/3: `godvoice()` verb roll `rn2(4)=3` ->
   "booms", verbalize "Thou art arrogant, mortal." / "Thou must relearn
   thy lessons!", Wis 11->10 ("You feel foolish!"), `losexp()` no-op at
   XL1, then trailing `rnz(300)` (pray.c:780).
2. **p_type 0 again** (blesscnt 405 > 0 even with Luck -3 after the
   first): maxanger 12, `rn2(12)=11` picks the default case; full
   `god_zaps_you()` chain: godvoice (`rn2(4)=2` -> "rings out"),
   "Suddenly, a bolt of lightning strikes you!" + "You fry to a crisp!"
   -> wizard "Die? [yn]" x2 with `n` refusals (`savelive` full heal),
   "Thoth is not deterred...", disintegration beam destroys the cloak of
   magic resistance (`obj_resists` roll `rn2(100)=62`, `do_wear.c:3201`),
   "You disintegrate into a pile of dust!", second refusal ends with the
   savelife nomovemsg "You survived that attempt on your life.", then the
   `rnz(300)` timeout tail.  AC:9 -> AC:10 lands only after the final
   refusal, matching the recorded status line.
3. **Forced pleased** (`y`): blessing state overrides
   (blesscnt/luck/record/ugangr reset per pray.c:2271-2286), shimmer +
   invulnerable three-turn prayer (gethungry's `rn2(20)` skipped via
   eat.c:3167's uinvulnerable check; the T:10 boundary still pays the
   exerper `rn2(19)`, attrib.c:521-579), then `pleased()`: "You feel that
   Thoth is satisfied." with `rn1(2,1)` action roll `rn2(2)=0`
   (pray.c:1126) and the `rnz(350)` blesscnt reset (pray.c:1356).

## Initial divergences found and fixed

- godvoice verbs were hardcoded ("thunders"/"rings out") instead of
  driven by the `rn2(4)` godvoice roll (verb table pray.c:60).
- the declined-prayer turn charge was `nearbyTrouble ? 4 : 3`; C is
  always `nomul(-3)` — the extra (fourth) turn skewed the whole stream
  from prayer #2 on.
- the angrygods default case didn't exist in JS at all (old code fell
  to the mild "displeased" text and skipped the zap chain, deaths,
  armor destruction, and `rnz(300)` tail).
- forced-pleased prayers previously predicted "monster interference" at
  prompt-answer time (lookahead split machinery); replaced by live
  processing so shimmer, mid-prayer mores (seed4500's cobra hide) and
  the finish/outcome texts compose exactly where C's tty blocks.
- the once-per-hero seer/clairvoyance re-roll `rn1(31,15)` now waits
  past `prayer_done()` on a prayer's finishing turn (C: allmain.c:380-388
  unmul before allmain.c:413-416).

## Numbers

seed9170-wiz-pray-outcomes: RNG 6214/6214, Screen 44/44 (cursors 44/44).
`bash frozen/score.sh`: 52/52.  Extras dir: 12/20 — the eight remaining
extra failures predate this work (verified against the pre-edit tree)
and none lost coverage.

## Left not covered

angrygods() rn2 outcome cases 4-8 (item curses, punish(), summon_minion
shriek+minion), p_type 1/2/-1/-2 (naughty / cross-aligned altar / undead
form / Moloch-aligned altar & Gehennom prayer), crowning, artifact boons
and pat-on-head favors.  The `y` answer at the god-zap deaths routes
through the standard End-Of-Game flow but is unprobed.
