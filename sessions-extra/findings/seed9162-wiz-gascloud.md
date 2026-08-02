# seed9162-wiz-gascloud — findings

## What the session covers

Stinking-cloud region machinery (read.c: do_stinking_cloud → create_gas_cloud):

1. `#levelchange 15`; `#wizgenesis shrieker` (adjacent stationary target).
2. `#wizwish scroll of stinking cloud` (o - scroll labeled VE FORBRYDERNE).
3. `r o` → "As you read the scroll, it disappears." + discovery
   "You have found a scroll of stinking cloud!" (two --More--) →
   getpos "Where do you want to center the cloud?" (+ one-time farlook tip
   window: TWO extra dismiss keys) → cursor onto the shrieker → '.'.
4. Gas cloud created AROUND the shrieker with hero at the rim:
   "You are enveloped in a cloud of noxious gas!  Your eyes sting." (blindness)
   + "Something is burning your lungs!  You cough and spit blood!" (-7 HP),
   hero still shown "in a cloud of poison gas" while blind.
5. `^T` blind controlled teleport out of the cloud (getpos without vision).
6. Blindness expiry ("You can see again."), 7 counted searches through the
   cloud's life: "You see some gas clouds dissipate." (T:9), wandering newt
   attacks mid-search (search-interruption messages).

Recorded with seed 9162. 130 steps, ends T:16; recorder exits cleanly.

## Wave-5 continuation result

→ **FAIL — RNG 3252/3254, Screen 117/130 (cursors 129/130)**.
(Wave-4 end state: RNG 3073/3254, Screen 90/130, cursors 120/130.)

## Fixed this wave

1. `#levelchange 15` tail: wizard XL15 grants Warning ("You feel
   sensitive!") via adjabil() in the same pluslvl() (exper.c:305-357), so
   the levelchange flow keeps a pending final-level ability message
   ("Welcome to experience level 15.--More--" then "You feel sensitive!")
   instead of dropping it — that missing message had shifted key
   consumption from step 29 on.
2. Scroll-of-stinking-cloud read gating (read.c:617-638, 1991-2024): each
   pline ("As you read the scroll, it disappears." / "You have found a
   scroll of stinking cloud!" / "Where do you want to center the cloud?")
   is its own tty --More-- boundary because the 38+42/38+42-char combos
   exceed 80 columns; then getpos()'s one-time farlook tip
   (getpos.c:838-841, handle_tip TIP_GETPOS → nhcore.lua
   show_getpos_tip()) consumes one key; then "Move cursor to the desired
   position:".  New command modes:
   stinkingCloudDisappearMore/stinkingCloudFoundMore/stinkingCloudWhereMore/
   stinkingCloudTip, plus exclusion from the generic ' '--More-- dismisser.
3. getpos() select keys are only `.` `,` `;` `:` (getpos.c spkeys
   NHKF_GETPOS_PICK{,_Q,_O,_V}, cmd.c:3169-3172); space/return no longer
   select a cloud center (they previously created the cloud at the hero).
4. Scroll-type discovery exercises wisdom AFTER the cloud is created:
   doread() runs learnscroll() → learnscrolltyp() → makeknown()
   (hack.h:1530) → discover_object(..., credit_hero = TRUE)
   (o_init.c:475-483) → exercise(A_WIS, TRUE) (attrib.c:499-512) only when
   seffects() returns, i.e. after do_stinking_cloud() → getpos() resolved.
   Emitted as rn2(19) immediately after the ttl roll.
5. Once-per-turn ordering: allmain.c:273-274 runs nh_timeout();
   run_regions() BEFORE regen_hp()/gethungry()/exerchk()/u_wipe_engr gate
   (allmain.c:294/354/356/360-361), so advanceRegions() moved to the top of
   finishMonsterTurnTail(); the hero gas-cloud tick now draws rnd(dam)+5
   before regen_hp's rn2(100), exactly as recorded.
6. Blindness expiry: timeout.c:744-750 nh_timeout() BLINDED case +
   make_blinded(0L, TRUE) (potion.c make_blinded) — blind timeout decrements
   and clears ("You can see again.") BEFORE the region tick per turn, so
   cloud-blindness (inside_gas_cloud sets timeout 1, region.c:1115-1117)
   lasts one full turn as in C.
7. m_poisongas_ok()/resists_poison() for region monster ticks
   (mon.c:329-355, region.c:1130-1159): shrieker is breathless
   (M1_BREATHLESS, monsters.h:1660-1667) ⇒ M_POISONGAS_OK ⇒ completely
   skipped (was taking rnd(8)+5 damage); poison-resistant monsters keep the
   cough/blind branch but take no damage roll.  Flag resolution goes through
   the canonical permonst MONS rows by name because spawned-monster `data`
   is a sparse stub without m1/mres.
8. Region teardown redraw (region.c remove_region): on cloud expiry each
   covered in-sight cell is newsym()'d after unblocking LOS, so no leftover
   '#' glyphs.
9. getpos auto-describe: bare monster name ("shrieker", pager.c
   do_screen_description → lookat → look_at_monster), not the fire-scroll
   targeting text; and self-description gains the region suffix
   "human wizard called wizard, in a cloud of poison gas" (pager.c:271-277).

## Remaining divergences

- Two jackal m_move track-avoidance draws (monmove.c:1960-1965
  `rn2(4 * (cnt - j))`): flat rng[3066] C `rn2(24)=18` vs JS `rn2(32)=26`
  and rng[3108] C `rn2(16)=13` vs JS `rn2(28)=17`.  Same call slot, same
  count of draws; only the modulus differs ⇒ the JS jackal's
  mfndpos() candidate count (or track-hit index) at those two positions
  differs from C's.  Not observable from the recording (jackal never
  appears on screen); needs a recorder-replay with mfndpos tracing —
  the recorder build tree diverges early in levelgen for this nethackrc, so
  deferred.
- Status-line `T:`/HP off by one (steps 110-118-era): C charges one more
  round for the first counted-search batch interrupted by the newt
  (allmain.c occupation/monster_nearby pacing in the pending-time loop) —
  downstream HP regen line shifts with it.  Pipeline-level turn accounting;
  touching it risks the 44/44 publics.
- Step 98 HP: C shows HP 114 at the "Your eyes sting.--More--" gate because
  the tty engine pauses inside_gas_cloud() BEFORE losehp() runs; the JS
  turn tail is atomic per key, so HP already reads 107 at that frame.
- Step 116 message ordering: "You see some gas clouds dissipate.  You stop
  searching.--More--" (C: run_regions expiry line precedes the
  monster_nearby stop-search line) — JS emits them in the reverse order
  within the same batch (again pending-loop ordering).
- Steps 116-119 newt-attack/search message batching differs ("The newt
  misses!" placement across the stop-search batches).
